-- Allow a progress memo to be recorded even when the percentage is unchanged.
create or replace function public.update_task_progress(target_id uuid, next_progress integer, progress_note text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_progress integer; safe_progress integer := greatest(0, least(100, next_progress)); parent uuid;
begin
  select progress into current_progress from public.tasks where id=target_id and user_id=(select auth.uid()) for update;
  if current_progress is null then raise exception 'Task not found'; end if;
  if current_progress = safe_progress then
    if nullif(btrim(progress_note), '') is not null then
      insert into public.progress_logs(task_id,user_id,progress,note) values(target_id,(select auth.uid()),safe_progress,btrim(progress_note));
    end if;
    return;
  end if;
  update public.tasks set progress=safe_progress,
    status=case when safe_progress=100 then 'done'::public.task_status when safe_progress=0 then 'todo'::public.task_status else 'doing'::public.task_status end,
    completed_at=case when safe_progress=100 then coalesce(completed_at,now()) else null end where id=target_id;
  insert into public.progress_logs(task_id,user_id,progress,note) values(target_id,(select auth.uid()),safe_progress,nullif(btrim(progress_note),''));
  select parent_id into parent from public.tasks where id=target_id;
  while parent is not null loop
    update public.tasks p set progress=x.value,
      status=case when x.value=100 then 'done'::public.task_status when x.value=0 then 'todo'::public.task_status else 'doing'::public.task_status end,
      completed_at=case when x.value=100 then coalesce(p.completed_at,now()) else null end
    from (select round(avg(progress))::integer value from public.tasks where parent_id=parent) x where p.id=parent and p.user_id=(select auth.uid());
    select parent_id into parent from public.tasks where id=parent;
  end loop;
end; $$;

revoke all on function public.update_task_progress(uuid,integer,text) from public;
grant execute on function public.update_task_progress(uuid,integer,text) to authenticated;
