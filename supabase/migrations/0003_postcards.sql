-- urpostcard :: 0003 postcard service
--
-- Everything a client is allowed to do with a postcard goes through the
-- functions in this file. The client never INSERTs or UPDATEs the table
-- (see 0004_rls.sql: there are no write policies at all).
--
-- Two rules this file exists to enforce:
--   1. sender_id, distance, duration and every timestamp are derived here,
--      from auth.uid() and from the two stored pins. Nothing is trusted.
--   2. A recipient cannot read the message before the postcard arrives.
--      That is why the SELECT policy on postcards covers the sender only,
--      and recipients read exclusively through these functions, which
--      withhold `message` until status is 'arrived' or 'opened'.

drop type if exists public.postcard_view cascade;

create type public.postcard_view as (
  id                        uuid,
  direction                 text,
  status                    public.postcard_status,
  message                   text,
  message_available         boolean,
  template_id               uuid,
  template_slug             text,
  template_name             text,
  template_design_config    jsonb,
  counterpart_id            uuid,
  counterpart_username      text,
  counterpart_display_name  text,
  counterpart_avatar_url    text,
  origin_location_name      text,
  destination_location_name text,
  origin_latitude           double precision,
  origin_longitude          double precision,
  destination_latitude      double precision,
  destination_longitude     double precision,
  distance_km               double precision,
  travel_duration_seconds   integer,
  sent_at                   timestamptz,
  estimated_delivery_at     timestamptz,
  delivered_at              timestamptz,
  opened_at                 timestamptz,
  created_at                timestamptz
);

-- ---------------------------------------------------------------- projection
-- Internal. Not callable by clients (execute is revoked in 0004) because it
-- takes the viewer as an argument.

create or replace function public.postcard_views(
  p_viewer uuid,
  p_box    text default null,   -- 'sent' | 'received' | null (both)
  p_id     uuid default null,
  p_limit  integer default 50
) returns setof public.postcard_view
language sql stable security definer
set search_path = public, pg_temp
as $fn$
  select
    p.id,
    case when p.sender_id = p_viewer then 'sent' else 'received' end,
    p.status,
    -- The message is withheld from the recipient until the journey ends.
    case
      when p.sender_id = p_viewer then p.message
      when p.status in ('arrived', 'opened') then p.message
      else null
    end,
    (p.sender_id = p_viewer or p.status in ('arrived', 'opened')),
    t.id, t.slug, t.name, t.design_config,
    other.id, other.username, other.display_name, other.avatar_url,
    p.origin_location_name, p.destination_location_name,
    p.origin_latitude, p.origin_longitude,
    p.destination_latitude, p.destination_longitude,
    p.distance_km, p.travel_duration_seconds,
    p.sent_at, p.estimated_delivery_at, p.delivered_at, p.opened_at, p.created_at
  from public.postcards p
  join public.postcard_templates t on t.id = p.template_id
  join public.profiles other
    on other.id = case when p.sender_id = p_viewer then p.recipient_id else p.sender_id end
  -- A recipient learns nothing about a postcard until it lands: not the
  -- message, not the sender, not that it exists. The sender watches their own
  -- the whole way. Enforced here rather than in the interface, so an
  -- incoming postcard is never on the wire in the first place.
  where (
      p.sender_id = p_viewer
      or (p.recipient_id = p_viewer and p.status in ('arrived', 'opened'))
    )
    and p.status <> 'draft'
    and (p_id is null or p.id = p_id)
    and (
      p_box is null
      or (p_box = 'sent'     and p.sender_id    = p_viewer)
      or (p_box = 'received' and p.recipient_id = p_viewer)
    )
  order by coalesce(p.sent_at, p.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$fn$;

-- ---------------------------------------------------------------- delivery sweep
-- The single place a postcard becomes 'arrived'. Driven by a scheduled job
-- and, defensively, by every read path below - so state is correct whether or
-- not any browser was ever open. Idempotent.

create or replace function public.settle_due_postcards()
returns integer
language plpgsql security definer
set search_path = public, pg_temp
as $fn$
declare
  settled integer;
begin
  with due as (
    update public.postcards p
       set status       = 'arrived',
           delivered_at = p.estimated_delivery_at,
           updated_at   = now()
     where p.status = 'in_transit'
       and p.estimated_delivery_at is not null
       and p.estimated_delivery_at <= now()
    returning p.id, p.recipient_id, p.distance_km, p.origin_location_name
  ),
  -- Data-modifying CTEs always execute, referenced or not.
  announced as (
    insert into public.notifications (user_id, type, postcard_id, title, body)
    select d.recipient_id,
           'postcard_arrived',
           d.id,
           'A postcard has arrived for you.',
           case
             when d.origin_location_name is not null
               then 'It travelled ' || to_char(round(d.distance_km::numeric), 'FM999,999,999')
                    || ' km to reach you.'
             else 'It travelled ' || to_char(round(d.distance_km::numeric), 'FM999,999,999') || ' km.'
           end
    from due d
    on conflict do nothing
    returning 1
  )
  select count(*) into settled from due;

  return settled;
end;
$fn$;

-- ---------------------------------------------------------------- send

create or replace function public.send_postcard(
  p_recipient_username text,
  p_template_id        uuid,
  p_message            text
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $fn$
declare
  v_viewer    uuid := auth.uid();
  v_sender    public.profiles%rowtype;
  v_recipient public.profiles%rowtype;
  v_message   text := trim(coalesce(p_message, ''));
  v_id        uuid := gen_random_uuid();
  v_distance  double precision;
  v_duration  integer;
  v_sent_at   timestamptz := now();
  v_recent    integer;
begin
  if v_viewer is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  select * into v_sender from public.profiles where id = v_viewer;
  if v_sender.username is null then
    raise exception 'SENDER_PROFILE_INCOMPLETE' using errcode = 'check_violation';
  end if;
  if v_sender.latitude is null then
    raise exception 'SENDER_LOCATION_MISSING' using errcode = 'check_violation';
  end if;

  select * into v_recipient
  from public.profiles
  where username = lower(trim(ltrim(coalesce(p_recipient_username, ''), '@')));

  if not found then
    raise exception 'RECIPIENT_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_recipient.latitude is null then
    raise exception 'RECIPIENT_LOCATION_MISSING' using errcode = 'check_violation';
  end if;

  if char_length(v_message) < 1 or char_length(v_message) > 500 then
    raise exception 'MESSAGE_INVALID' using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.postcard_templates
    where id = p_template_id and is_active
  ) then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  -- Cheap abuse ceiling; the postal service is not a firehose.
  select count(*) into v_recent
  from public.postcards
  where sender_id = v_viewer and created_at > now() - interval '1 hour';
  if v_recent >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'check_violation';
  end if;

  v_distance := public.haversine_km(
    v_sender.latitude, v_sender.longitude,
    v_recipient.latitude, v_recipient.longitude
  );
  v_duration := public.travel_duration_seconds(v_distance, v_id);

  insert into public.postcards (
    id, sender_id, recipient_id, template_id, message,
    origin_latitude, origin_longitude, destination_latitude, destination_longitude,
    origin_location_name, destination_location_name,
    distance_km, travel_duration_seconds,
    sent_at, estimated_delivery_at, status
  ) values (
    v_id, v_viewer, v_recipient.id, p_template_id, v_message,
    v_sender.latitude, v_sender.longitude, v_recipient.latitude, v_recipient.longitude,
    v_sender.location_name, v_recipient.location_name,
    v_distance, v_duration,
    v_sent_at, v_sent_at + make_interval(secs => v_duration), 'in_transit'
  );

  return v_id;
end;
$fn$;

-- ---------------------------------------------------------------- read paths

-- Both read paths settle first, so a page never renders a postcard as still
-- travelling when its arrival time has passed. Deliberately VOLATILE: a STABLE
-- function cannot write, and settling is a write.

create or replace function public.list_postcards(
  p_box   text default null,
  p_limit integer default 50
) returns setof public.postcard_view
language plpgsql security definer
set search_path = public, pg_temp
as $fn$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  perform public.settle_due_postcards();

  return query select * from public.postcard_views(v_viewer, p_box, null, p_limit);
end;
$fn$;

create or replace function public.get_postcard(p_id uuid)
returns public.postcard_view
language plpgsql security definer
set search_path = public, pg_temp
as $fn$
declare
  v_viewer uuid := auth.uid();
  v_row    public.postcard_view;
begin
  if v_viewer is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  perform public.settle_due_postcards();

  select * into v_row from public.postcard_views(v_viewer, null, p_id, 1);
  if v_row.id is null then
    raise exception 'POSTCARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  return v_row;
end;
$fn$;

-- Settles overdue postcards, then reports. Called on app entry so state is
-- correct even if the scheduled sweep has not run yet.
create or replace function public.sync_and_summarize()
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $fn$
declare
  v_viewer uuid := auth.uid();
  v_result jsonb;
begin
  if v_viewer is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  perform public.settle_due_postcards();

  -- Only what the viewer is allowed to know. Nothing here counts, times or
  -- hints at a postcard still on its way to them — that would give away the
  -- surprise just as effectively as showing it.
  select jsonb_build_object(
    'traveling', count(*) filter (
      where p.sender_id = v_viewer and p.status = 'in_transit'),
    'delivered', count(*) filter (
      where p.sender_id = v_viewer and p.status in ('arrived', 'opened')),
    'unopened', count(*) filter (
      where p.recipient_id = v_viewer and p.status = 'arrived')
  )
  into v_result
  from public.postcards p
  where p.sender_id = v_viewer or p.recipient_id = v_viewer;

  return coalesce(v_result, '{}'::jsonb);
end;
$fn$;

-- ---------------------------------------------------------------- open

create or replace function public.open_postcard(p_id uuid)
returns public.postcard_view
language plpgsql security definer
set search_path = public, pg_temp
as $fn$
declare
  v_viewer uuid := auth.uid();
  v_card   public.postcards%rowtype;
begin
  if v_viewer is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  perform public.settle_due_postcards();

  select * into v_card from public.postcards where id = p_id;
  if not found or v_card.recipient_id <> v_viewer then
    raise exception 'POSTCARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if v_card.status = 'in_transit' then
    raise exception 'POSTCARD_IN_TRANSIT' using errcode = 'check_violation';
  end if;

  if v_card.status = 'arrived' then
    update public.postcards
       set status = 'opened', opened_at = now(), updated_at = now()
     where id = p_id;

    update public.notifications
       set read_at = now()
     where postcard_id = p_id and user_id = v_viewer and read_at is null;
  end if;

  return public.get_postcard(p_id);
end;
$fn$;

-- ---------------------------------------------------------------- notifications

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql security definer
set search_path = public, pg_temp
as $fn$
declare
  v_viewer uuid := auth.uid();
  n integer;
begin
  if v_viewer is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  with touched as (
    update public.notifications
       set read_at = now()
     where user_id = v_viewer
       and read_at is null
       and (p_ids is null or id = any (p_ids))
    returning 1
  )
  select count(*) into n from touched;

  return n;
end;
$fn$;

-- ---------------------------------------------------------------- preview
-- How far away someone is, and roughly how long a postcard would take, without
-- handing the sender the recipient's coordinates. Distance is a scalar; the
-- pins stay on the server.

create or replace function public.preview_journey(p_recipient_username text)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $fn$
declare
  v_viewer    uuid := auth.uid();
  v_sender    public.profiles%rowtype;
  v_recipient public.profiles%rowtype;
  v_distance  double precision;
  s           public.app_settings%rowtype;
  v_seconds   double precision;
begin
  if v_viewer is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;

  select * into v_sender from public.profiles where id = v_viewer;
  if v_sender.latitude is null then
    raise exception 'SENDER_LOCATION_MISSING' using errcode = 'check_violation';
  end if;

  select * into v_recipient
  from public.profiles
  where username = lower(trim(ltrim(coalesce(p_recipient_username, ''), '@')));

  if not found then
    raise exception 'RECIPIENT_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_recipient.latitude is null then
    raise exception 'RECIPIENT_LOCATION_MISSING' using errcode = 'check_violation';
  end if;

  v_distance := public.haversine_km(
    v_sender.latitude, v_sender.longitude,
    v_recipient.latitude, v_recipient.longitude
  );

  select * into s from public.app_settings where id;
  -- No variation: the seed is the postcard id, which does not exist yet.
  v_seconds := greatest(
    s.min_travel_seconds,
    least(s.max_travel_seconds, ceil((v_distance / s.virtual_speed_kmh) * 3600))
  );

  return jsonb_build_object(
    'distance_km', round(v_distance::numeric, 1),
    'travel_duration_seconds', v_seconds::integer,
    'destination_location_name', v_recipient.location_name,
    'recipient_username', v_recipient.username,
    'recipient_display_name', v_recipient.display_name
  );
end;
$fn$;
