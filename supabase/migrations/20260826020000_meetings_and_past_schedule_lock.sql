-- Standalone meeting blocks and immutable historical schedules.
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index meetings_user_start_idx on public.meetings(user_id, start_at);
alter table public.meetings enable row level security;
create policy "meetings_select_own" on public.meetings for select to authenticated using ((select auth.uid()) = user_id);
create policy "meetings_insert_own" on public.meetings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "meetings_update_own" on public.meetings for update to authenticated
  using ((select auth.uid()) = user_id and (start_at at time zone 'Asia/Tokyo')::date >= (now() at time zone 'Asia/Tokyo')::date)
  with check ((select auth.uid()) = user_id and (start_at at time zone 'Asia/Tokyo')::date >= (now() at time zone 'Asia/Tokyo')::date);
create policy "meetings_delete_own" on public.meetings for delete to authenticated
  using ((select auth.uid()) = user_id and (start_at at time zone 'Asia/Tokyo')::date >= (now() at time zone 'Asia/Tokyo')::date);

-- These restrictive policies apply in addition to the existing ownership policies.
create policy "task_schedules_update_not_past" on public.task_schedules as restrictive for update to authenticated
  using ((start_at at time zone 'Asia/Tokyo')::date >= (now() at time zone 'Asia/Tokyo')::date)
  with check ((start_at at time zone 'Asia/Tokyo')::date >= (now() at time zone 'Asia/Tokyo')::date);
create policy "task_schedules_delete_not_past" on public.task_schedules as restrictive for delete to authenticated
  using ((start_at at time zone 'Asia/Tokyo')::date >= (now() at time zone 'Asia/Tokyo')::date);
