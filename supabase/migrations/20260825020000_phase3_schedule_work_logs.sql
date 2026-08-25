-- Phase 3: durable single-user timer and query indexes. Existing ownership RLS remains authoritative.
create unique index work_logs_one_running_per_user on public.work_logs(user_id) where ended_at is null;
create index task_schedules_user_start_idx on public.task_schedules(user_id,start_at);
create index work_logs_user_started_idx on public.work_logs(user_id,started_at);

create or replace function public.start_task_timer(target_task uuid) returns public.work_logs
language plpgsql set search_path='' as $$
declare result public.work_logs;
begin
  if not exists(select 1 from public.tasks where id=target_task and user_id=(select auth.uid())) then raise exception 'Task not found'; end if;
  if exists(select 1 from public.work_logs where user_id=(select auth.uid()) and ended_at is null) then raise exception 'Timer already running'; end if;
  insert into public.work_logs(task_id,user_id,started_at) values(target_task,(select auth.uid()),now()) returning * into result;
  return result;
end; $$;
revoke all on function public.start_task_timer(uuid) from public;
grant execute on function public.start_task_timer(uuid) to authenticated;
