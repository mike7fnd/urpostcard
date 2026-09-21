-- urpostcard :: 0002 functions
-- Geography, the delivery model, and profile plumbing.
-- Postcards are never inserted or updated by the client directly:
-- send_postcard() and open_postcard() (0003) are the only doors, and both
-- derive the acting user from auth.uid() rather than trusting client input.

-- ---------------------------------------------------------------- geography

create or replace function public.haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns double precision
language sql immutable parallel safe
as $fn$
  -- Mean Earth radius (IUGG), great-circle distance.
  select 6371.0088 * 2 * asin(least(1, sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2))
    * power(sin(radians(lon2 - lon1) / 2), 2)
  )));
$fn$;

-- Coarsen a coordinate so a pinned location never identifies an address.
create or replace function public.coarsen_coordinate(
  value double precision, precision_level public.location_precision
) returns double precision
language sql immutable parallel safe
as $fn$
  select case precision_level
    when 'exact'  then value
    when 'city'   then round(value::numeric, 2)::double precision  -- ~1.1 km
    when 'region' then round(value::numeric, 1)::double precision  -- ~11 km
  end;
$fn$;

-- ---------------------------------------------------------------- delivery model

create or replace function public.travel_duration_seconds(
  p_distance_km double precision, p_seed uuid
) returns integer
language plpgsql stable parallel safe
set search_path = public, pg_temp
as $fn$
declare
  s        public.app_settings%rowtype;
  hashed   integer;
  variance double precision;
  seconds  double precision;
begin
  select * into s from public.app_settings where id;

  -- Deterministic "atmospheric variation": the same postcard always yields
  -- the same duration, so the calculation stays reproducible and testable.
  hashed   := ('x' || substr(md5(p_seed::text), 1, 6))::bit(24)::integer;
  variance := 1 + s.variation_pct * ((hashed::double precision / 16777215.0) * 2 - 1);

  seconds := (p_distance_km / s.virtual_speed_kmh) * 3600 * variance;

  return greatest(
    s.min_travel_seconds,
    least(s.max_travel_seconds, ceil(seconds))
  )::integer;
end;
$fn$;

create or replace function public.get_delivery_settings()
returns public.app_settings
language sql stable security definer
set search_path = public, pg_temp
as $fn$
  select * from public.app_settings where id;
$fn$;

-- ---------------------------------------------------------------- profile plumbing

create or replace function public.is_reserved_username(p_username text)
returns boolean
language sql immutable parallel safe
as $fn$
  select lower(p_username) = any (array[
    'admin','administrator','root','system','support','help','about','api',
    'auth','login','logout','signin','signup','register','settings','profile',
    'postcard','postcards','urpostcard','send','sent','received','inbox',
    'me','you','user','users','null','undefined','anonymous','moderator',
    'staff','team','official','security','billing','privacy','terms','contact',
    'home','onboarding','notifications','mail','postmaster','www'
  ]);
$fn$;

create or replace function public.profiles_before_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  if new.username is not null then
    new.username := lower(trim(new.username));
    if new.username = '' then
      new.username := null;
    elsif public.is_reserved_username(new.username) then
      raise exception 'USERNAME_RESERVED' using errcode = 'check_violation';
    end if;
  end if;

  new.display_name := trim(coalesce(new.display_name, ''));

  -- Privacy is enforced at the point of storage, not at the point of display.
  if new.latitude is not null and new.longitude is not null then
    new.latitude  := public.coarsen_coordinate(new.latitude,  new.location_precision);
    new.longitude := public.coarsen_coordinate(new.longitude, new.location_precision);
    new.location_name := nullif(trim(coalesce(new.location_name, '')), '');
  else
    new.location_name := null;
  end if;

  if tg_op = 'UPDATE' then
    new.id         := old.id;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists profiles_before_write on public.profiles;
create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $fn$
begin
  -- The password flow writes display_name; Google sends full_name / name and
  -- a picture. Take whichever is there so nobody lands in onboarding nameless.
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.notifications_before_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  -- The only field a recipient may move is read_at.
  new.id          := old.id;
  new.user_id     := old.user_id;
  new.type        := old.type;
  new.postcard_id := old.postcard_id;
  new.title       := old.title;
  new.body        := old.body;
  new.created_at  := old.created_at;
  return new;
end;
$fn$;

drop trigger if exists notifications_before_update on public.notifications;
create trigger notifications_before_update
  before update on public.notifications
  for each row execute function public.notifications_before_update();

-- ---------------------------------------------------------------- directory

create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql stable security definer
set search_path = public, pg_temp
as $fn$
declare
  candidate text := lower(trim(coalesce(p_username, '')));
begin
  if candidate !~ '^[a-z0-9_]{3,20}$' or public.is_reserved_username(candidate) then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles
    where username = candidate
      and id is distinct from auth.uid()
  );
end;
$fn$;

-- Public view of another person: username, name, avatar, coarse place label.
-- Never coordinates.
create or replace function public.search_profiles(p_query text, p_limit integer default 8)
returns table (
  id uuid, username text, display_name text, avatar_url text,
  location_name text, has_location boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $fn$
  select p.id, p.username, p.display_name, p.avatar_url, p.location_name,
         (p.latitude is not null) as has_location
  from public.profiles p
  where auth.uid() is not null
    and p.username is not null
    and length(trim(coalesce(p_query, ''))) > 0
    -- Escape LIKE wildcards: '%' must not list the directory, and '_' is a
    -- legal username character that should match itself.
    and p.username like
        replace(replace(replace(
          lower(trim(ltrim(coalesce(p_query, ''), '@'))),
          '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
  order by p.username
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$fn$;

create or replace function public.get_public_profile(p_username text)
returns table (
  id uuid, username text, display_name text, avatar_url text,
  location_name text, has_location boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $fn$
  select p.id, p.username, p.display_name, p.avatar_url, p.location_name,
         (p.latitude is not null) as has_location
  from public.profiles p
  where auth.uid() is not null
    and p.username = lower(trim(ltrim(coalesce(p_username, ''), '@')));
$fn$;
