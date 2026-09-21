-- urpostcard :: 0004 row level security
--
-- Posture: the client may read its own profile and its own notifications, and
-- may read the directory and its postcards only through SECURITY DEFINER
-- functions. It has no write access to postcards whatsoever.

alter table public.profiles           enable row level security;
alter table public.postcard_templates enable row level security;
alter table public.postcards          enable row level security;
alter table public.notifications      enable row level security;
alter table public.app_settings       enable row level security;

-- ---------------------------------------------------------------- profiles

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

-- Column-level validation, coarsening of coordinates and rejection of
-- identity changes all happen in the profiles_before_write trigger.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: accounts are removed through auth, which cascades.

-- ---------------------------------------------------------------- templates

drop policy if exists templates_select_active on public.postcard_templates;
create policy templates_select_active on public.postcard_templates
  for select to authenticated
  using (is_active);

-- ---------------------------------------------------------------- postcards
--
-- Sender only, deliberately. A recipient reading this table directly could
-- read the message while the postcard is still in transit, which would defeat
-- the entire product. Recipients read through list_postcards() / get_postcard(),
-- which withhold the message until the postcard has arrived.

drop policy if exists postcards_select_sender on public.postcards;
create policy postcards_select_sender on public.postcards
  for select to authenticated
  using (sender_id = (select auth.uid()));

-- No insert / update / delete policies. send_postcard() and open_postcard()
-- are the only write paths, and they run as definer.

-- ---------------------------------------------------------------- notifications

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Only read_at can actually change; notifications_before_update pins the rest.
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- app_settings
--
-- RLS enabled with no policies: unreachable from the client. Read it through
-- get_delivery_settings().

-- ---------------------------------------------------------------- function grants

revoke all on function public.postcard_views(uuid, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.settle_due_postcards() from public, anon;
revoke all on function public.coarsen_coordinate(double precision, public.location_precision) from public, anon;

grant execute on function public.haversine_km(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.get_delivery_settings() to authenticated;
grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.search_profiles(text, integer) to authenticated;
grant execute on function public.get_public_profile(text) to authenticated;
grant execute on function public.send_postcard(text, uuid, text) to authenticated;
grant execute on function public.list_postcards(text, integer) to authenticated;
grant execute on function public.get_postcard(uuid) to authenticated;
grant execute on function public.open_postcard(uuid) to authenticated;
grant execute on function public.sync_and_summarize() to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.settle_due_postcards() to service_role;

-- Realtime: recipients learn about arrivals through their own notifications.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

grant execute on function public.preview_journey(text) to authenticated;
