-- urpostcard :: 0007 map style
--
-- Which world a person wants to look at. Stored on the profile rather than in
-- browser storage so the choice follows them between devices, and so the
-- server can render the first globe correctly instead of flashing the wrong
-- one while a preference loads.
--
-- Text with a check rather than an enum: changing the set of styles is then a
-- line here instead of an ALTER TYPE.

alter table public.profiles
  add column if not exists map_style text not null default 'streets';

-- A 'dark' style existed briefly. Anyone left on it comes back to the default,
-- otherwise the constraint below would refuse to apply to their row.
update public.profiles
   set map_style = 'streets'
 where map_style not in ('streets', 'satellite');

-- Dropped and recreated rather than added conditionally, so re-running this
-- file after the allowed set changes actually updates the constraint.
alter table public.profiles
  drop constraint if exists profiles_map_style_valid;

alter table public.profiles
  add constraint profiles_map_style_valid
  check (map_style in ('streets', 'satellite'));

comment on column public.profiles.map_style is
  'streets = OpenStreetMap, satellite = aerial imagery';
