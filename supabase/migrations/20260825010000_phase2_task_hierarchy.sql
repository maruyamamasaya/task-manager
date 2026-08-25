-- Phase 2: enforce the three-level UI contract at the database boundary and
-- update a hierarchy atomically. These functions run as the caller, so RLS
-- remains in force for every selected and updated task.
create or replace function public.enforce_task_hierarchy() returns trigger
language plpgsql set search_path = '' as $$
declare parent_owner uuid; parent_depth integer;
begin
  if new.parent_id is null then return new; end if;
  select user_id into parent_owner from public.tasks where id = new.parent_id;
  with recursive ancestors as (
    select id, parent_id, 1 as depth from public.tasks where id = new.parent_id
    union all select t.id, t.parent_id, a.depth + 1 from public.tasks t join ancestors a on t.id = a.parent_id
  ) select max(depth) into parent_depth from ancestors;
  if parent_owner is null or parent_owner <> new.user_id then raise exception 'Parent task must belong to the same user'; end if;
  if parent_depth >= 3 then raise exception 'Tasks are limited to three levels'; end if;
  return new;
end; $$;
create trigger tasks_hierarchy_guard before insert or update of parent_id, user_id on public.tasks
for each row execute function public.enforce_task_hierarchy();

create or replace function public.set_task_completion(target_id uuid, is_done boolean)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from public.tasks where id = target_id and user_id = (select auth.uid())) then raise exception 'Task not found'; end if;
  with recursive branch as (
    select id from public.tasks where id = target_id
    union all select t.id from public.tasks t join branch b on t.parent_id = b.id
  ) update public.tasks set status = case when is_done then 'done'::public.task_status else 'todo'::public.task_status end,
      progress = case when is_done then 100 else 0 end, completed_at = case when is_done then now() else null end
    where id in (select id from branch) and user_id = (select auth.uid());

  if is_done then
    -- Repeatedly complete ancestors whose direct children are all complete.
    loop
      update public.tasks p set status='done', progress=100, completed_at=now()
      where p.user_id=(select auth.uid()) and p.status<>'done' and exists(select 1 from public.tasks c where c.parent_id=p.id)
        and not exists(select 1 from public.tasks c where c.parent_id=p.id and c.status<>'done');
      exit when not found;
    end loop;
  else
    with recursive ancestors as (
      select parent_id as id from public.tasks where id=target_id
      union all select t.parent_id from public.tasks t join ancestors a on t.id=a.id where a.id is not null
    ) update public.tasks set status='doing', progress=least(progress,99), completed_at=null
      where id in (select id from ancestors where id is not null) and user_id=(select auth.uid());
  end if;
end; $$;
revoke all on function public.set_task_completion(uuid, boolean) from public;
grant execute on function public.set_task_completion(uuid, boolean) to authenticated;
