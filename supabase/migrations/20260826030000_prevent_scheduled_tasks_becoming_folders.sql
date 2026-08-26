-- A scheduled task must remain executable work. Reject adding or moving a
-- child below it before task_parent_becomes_folder can clear its task fields.
create or replace function public.reject_scheduled_task_parent() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if exists (
    select 1
      from public.task_schedules
     where task_id = new.parent_id
  ) then
    raise exception 'A scheduled task cannot become a folder';
  end if;
  return new;
end; $$;

create trigger task_parent_rejects_scheduled_task
before insert or update of parent_id on public.tasks
for each row
when (new.parent_id is not null)
execute function public.reject_scheduled_task_parent();
