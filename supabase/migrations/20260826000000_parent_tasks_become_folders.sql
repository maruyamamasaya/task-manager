-- A task with children is a structural folder, not executable work. Keep this
-- invariant in PostgreSQL so non-UI clients cannot accidentally work a folder.
create or replace function public.convert_parent_task_to_folder() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  update public.tasks
     set status = 'todo', progress = 0, completed_at = null,
         estimated_minutes = null, due_at = null
   where id = new.parent_id;
  return new;
end; $$;

create trigger task_parent_becomes_folder
after insert or update of parent_id on public.tasks
for each row when (new.parent_id is not null)
execute function public.convert_parent_task_to_folder();

-- Normalize parents that existed before this migration. Historical logs and
-- schedules are retained, but the application no longer permits new ones.
update public.tasks p
set status = 'todo', progress = 0, completed_at = null,
    estimated_minutes = null, due_at = null
where exists (select 1 from public.tasks c where c.parent_id = p.id);

create or replace function public.reject_folder_task_reference() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if exists (select 1 from public.tasks c where c.parent_id = new.task_id) then
    raise exception 'A task with children is a folder and cannot be used as a task';
  end if;
  return new;
end; $$;

create trigger task_schedules_reject_folders before insert or update of task_id on public.task_schedules
for each row execute function public.reject_folder_task_reference();
create trigger work_logs_reject_folders before insert or update of task_id on public.work_logs
for each row execute function public.reject_folder_task_reference();
create trigger progress_logs_reject_folders before insert or update of task_id on public.progress_logs
for each row execute function public.reject_folder_task_reference();
create trigger reflections_reject_folders before insert or update of task_id on public.reflections
for each row execute function public.reject_folder_task_reference();

create or replace function public.update_task_progress(target_id uuid, next_progress integer, progress_note text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_progress integer; safe_progress integer := greatest(0, least(100, next_progress));
begin
  if exists (select 1 from public.tasks where parent_id=target_id) then
    raise exception 'A task with children is a folder and has no progress';
  end if;
  select progress into current_progress from public.tasks where id=target_id and user_id=(select auth.uid()) for update;
  if current_progress is null then raise exception 'Task not found'; end if;
  if current_progress = safe_progress then return; end if;
  update public.tasks set progress=safe_progress,
    status=case when safe_progress=100 then 'done'::public.task_status when safe_progress=0 then 'todo'::public.task_status else 'doing'::public.task_status end,
    completed_at=case when safe_progress=100 then coalesce(completed_at,now()) else null end where id=target_id;
  insert into public.progress_logs(task_id,user_id,progress,note) values(target_id,(select auth.uid()),safe_progress,nullif(btrim(progress_note),''));
end; $$;

create or replace function public.set_task_completion(target_id uuid, is_done boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.tasks where id=target_id and user_id=(select auth.uid())) then raise exception 'Task not found'; end if;
  if exists(select 1 from public.tasks where parent_id=target_id) then
    raise exception 'A task with children is a folder and cannot be completed';
  end if;
  update public.tasks set status=case when is_done then 'done'::public.task_status else 'todo'::public.task_status end,
    progress=case when is_done then 100 else 0 end,
    completed_at=case when is_done then now() else null end
  where id=target_id and user_id=(select auth.uid());
end; $$;

revoke all on function public.update_task_progress(uuid,integer,text) from public;
grant execute on function public.update_task_progress(uuid,integer,text) to authenticated;
revoke all on function public.set_task_completion(uuid,boolean) from public;
grant execute on function public.set_task_completion(uuid,boolean) to authenticated;
