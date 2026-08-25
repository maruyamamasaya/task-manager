-- Phase 1 schema. Run with `supabase db push` after linking the project.
create extension if not exists pgcrypto;

create type public.task_status as enum ('todo', 'doing', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120), description text, color text,
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null, parent_id uuid references public.tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500), description text,
  status public.task_status not null default 'todo', progress integer not null default 0 check (progress between 0 and 100),
  priority public.task_priority not null default 'medium', estimated_minutes integer check (estimated_minutes >= 0), due_at timestamptz,
  sort_order integer not null default 0, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create table public.task_schedules (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, start_at timestamptz not null, end_at timestamptz not null,
  created_at timestamptz not null default now(), check (end_at > start_at)
);
create table public.work_logs (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, started_at timestamptz not null, ended_at timestamptz,
  minutes integer check (minutes >= 0), note text, created_at timestamptz not null default now(), check (ended_at is null or ended_at >= started_at)
);
create table public.progress_logs (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, progress integer not null check (progress between 0 and 100),
  note text, created_at timestamptz not null default now()
);
create table public.reflections (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, result text, good_points text, problems text,
  improvements text, next_action text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects(user_id);
create index tasks_user_id_idx on public.tasks(user_id); create index tasks_project_id_idx on public.tasks(project_id); create index tasks_parent_id_idx on public.tasks(parent_id);
create index task_schedules_user_task_idx on public.task_schedules(user_id, task_id);
create index work_logs_user_task_idx on public.work_logs(user_id, task_id);
create index progress_logs_user_task_idx on public.progress_logs(user_id, task_id);
create index reflections_user_task_idx on public.reflections(user_id, task_id);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger reflections_updated_at before update on public.reflections for each row execute function public.set_updated_at();

alter table public.profiles enable row level security; alter table public.projects enable row level security;
alter table public.tasks enable row level security; alter table public.task_schedules enable row level security;
alter table public.work_logs enable row level security; alter table public.progress_logs enable row level security; alter table public.reflections enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

do $$ declare table_name text; begin
  foreach table_name in array array['projects','tasks','task_schedules','work_logs','progress_logs','reflections'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;

-- Child rows must point to resources owned by the same authenticated user.
create function public.owns_task(target_task uuid) returns boolean language sql stable security definer set search_path = '' as
  $$ select exists(select 1 from public.tasks where id = target_task and user_id = (select auth.uid())) $$;
create policy "tasks_project_owner" on public.tasks as restrictive for all to authenticated
  using (project_id is null or exists(select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  with check (project_id is null or exists(select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())));
create policy "tasks_parent_owner" on public.tasks as restrictive for all to authenticated
  using (parent_id is null or public.owns_task(parent_id)) with check (parent_id is null or public.owns_task(parent_id));
do $$ declare table_name text; begin foreach table_name in array array['task_schedules','work_logs','progress_logs','reflections'] loop
  execute format('create policy %I on public.%I as restrictive for all to authenticated using (public.owns_task(task_id)) with check (public.owns_task(task_id))', table_name || '_task_owner', table_name);
end loop; end $$;

revoke all on function public.owns_task(uuid) from public; grant execute on function public.owns_task(uuid) to authenticated;
