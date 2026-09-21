-- urpostcard :: 0001 schema
-- Core tables, enums, indexes. No policies here (see 0003_rls.sql).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums

do $$ begin
  create type public.postcard_status as enum (
    'draft', 'preparing', 'in_transit', 'arrived', 'opened', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.location_precision as enum ('exact', 'city', 'region');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- settings
-- Single-row server configuration for the delivery model. Kept in the
-- database so travel speed can be tuned without a redeploy, and so the
-- client can never influence it.

create table if not exists public.app_settings (
  id                  boolean primary key default true check (id),
  virtual_speed_kmh   double precision not null default 1200 check (virtual_speed_kmh > 0),
  min_travel_seconds  integer not null default 300    check (min_travel_seconds >= 0),
  max_travel_seconds  integer not null default 172800 check (max_travel_seconds > 0),
  variation_pct       double precision not null default 0.07 check (variation_pct >= 0 and variation_pct < 1),
  updated_at          timestamptz not null default now(),
  constraint app_settings_bounds check (max_travel_seconds >= min_travel_seconds)
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  username           text,
  display_name       text not null default '',
  avatar_url         text,
  latitude           double precision check (latitude between -90 and 90),
  longitude          double precision check (longitude between -180 and 180),
  location_name      text,
  location_precision public.location_precision not null default 'city',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_location_complete
    check (num_nonnulls(latitude, longitude) in (0, 2))
);

create unique index if not exists profiles_username_key on public.profiles (username);
create index if not exists profiles_username_prefix_idx
  on public.profiles (username text_pattern_ops);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

-- ---------------------------------------------------------------- templates

create table if not exists public.postcard_templates (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null default '',
  image_url     text,
  design_config jsonb not null default '{}'::jsonb,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists postcard_templates_active_idx
  on public.postcard_templates (is_active, sort_order);

-- ---------------------------------------------------------------- postcards

create table if not exists public.postcards (
  id                       uuid primary key default gen_random_uuid(),
  sender_id                uuid not null references public.profiles (id) on delete cascade,
  recipient_id             uuid not null references public.profiles (id) on delete cascade,
  template_id              uuid not null references public.postcard_templates (id),
  message                  text not null,
  origin_latitude          double precision not null,
  origin_longitude         double precision not null,
  destination_latitude     double precision not null,
  destination_longitude    double precision not null,
  origin_location_name     text,
  destination_location_name text,
  distance_km              double precision not null check (distance_km >= 0),
  travel_duration_seconds  integer not null check (travel_duration_seconds >= 0),
  sent_at                  timestamptz,
  estimated_delivery_at    timestamptz,
  delivered_at             timestamptz,
  opened_at                timestamptz,
  status                   public.postcard_status not null default 'draft',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint postcards_message_length check (char_length(message) between 1 and 500)
);

create index if not exists postcards_sender_idx    on public.postcards (sender_id, created_at desc);
create index if not exists postcards_recipient_idx on public.postcards (recipient_id, created_at desc);
create index if not exists postcards_status_idx    on public.postcards (status);
create index if not exists postcards_created_at_idx on public.postcards (created_at desc);
-- Partial index keeps the delivery sweep cheap: only rows still in flight.
create index if not exists postcards_due_idx
  on public.postcards (estimated_delivery_at)
  where status = 'in_transit';

-- ---------------------------------------------------------------- notifications

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in ('postcard_arrived', 'postcard_opened')),
  postcard_id uuid references public.postcards (id) on delete cascade,
  title       text not null,
  body        text not null default '',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;
create unique index if not exists notifications_unique_event
  on public.notifications (user_id, postcard_id, type)
  where postcard_id is not null;
