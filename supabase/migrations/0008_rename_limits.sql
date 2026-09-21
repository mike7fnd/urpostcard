-- urpostcard :: 0008 rename limits
--
-- A username is an address. People write it on postcards, and anything already
-- in flight was addressed to whoever held it at the time — so it should not be
-- a thing you can swap on a whim. Thirty days between changes for the
-- username, seven for the display name.
--
-- Enforced in the trigger rather than the interface, because a rule the client
-- checks is a rule anyone with a fetch call can ignore.

alter table public.profiles
  add column if not exists username_changed_at timestamptz,
  add column if not exists display_name_changed_at timestamptz;

comment on column public.profiles.username_changed_at is
  'When the username was last changed from one value to another. Null means it has never been changed, only set.';

create or replace function public.profiles_before_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  username_cooldown constant interval := interval '30 days';
  name_cooldown     constant interval := interval '7 days';
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

    -- Choosing a username for the first time is not a change, so onboarding is
    -- never blocked and a typo there can still be fixed once.
    if old.username is not null and new.username is distinct from old.username then
      if old.username_changed_at is not null
         and now() < old.username_changed_at + username_cooldown then
        raise exception 'USERNAME_TOO_SOON' using errcode = 'check_violation';
      end if;
      new.username_changed_at := now();
    else
      new.username_changed_at := old.username_changed_at;
    end if;

    -- Same shape: the empty name a new account starts with is not a value
    -- anyone chose, so filling it in costs nothing.
    if old.display_name <> '' and new.display_name is distinct from old.display_name then
      if old.display_name_changed_at is not null
         and now() < old.display_name_changed_at + name_cooldown then
        raise exception 'DISPLAY_NAME_TOO_SOON' using errcode = 'check_violation';
      end if;
      new.display_name_changed_at := now();
    else
      new.display_name_changed_at := old.display_name_changed_at;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$fn$;
