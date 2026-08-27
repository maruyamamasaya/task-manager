-- Per-user standard working hours. Break time is currently fixed at 60 minutes in the application.
create table public.work_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  work_start time not null default '09:00', work_end time not null default '17:30',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint work_settings_valid_range check (work_end > work_start),
  constraint work_settings_minimum_duration check (work_end - work_start > interval '1 hour')
);
create trigger work_settings_updated_at before update on public.work_settings for each row execute function public.set_updated_at();
alter table public.work_settings enable row level security;
create policy "work_settings_select_own" on public.work_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "work_settings_insert_own" on public.work_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "work_settings_update_own" on public.work_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
