-- User-managed holidays and paid-leave plans.
create type public.day_off_status as enum ('holiday', 'paid_leave', 'am_leave', 'pm_leave');

create table public.day_offs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  off_date date not null,
  status public.day_off_status not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, off_date)
);

create index day_offs_user_date_idx on public.day_offs(user_id, off_date);
create trigger day_offs_updated_at before update on public.day_offs for each row execute function public.set_updated_at();
alter table public.day_offs enable row level security;
create policy "day_offs_select_own" on public.day_offs for select to authenticated using ((select auth.uid()) = user_id);
create policy "day_offs_insert_own" on public.day_offs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "day_offs_update_own" on public.day_offs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "day_offs_delete_own" on public.day_offs for delete to authenticated using ((select auth.uid()) = user_id);
