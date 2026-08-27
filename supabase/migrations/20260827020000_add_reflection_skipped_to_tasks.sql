-- Allow completed tasks to be explicitly excluded from the reflection queue.
alter table public.tasks
  add column reflection_skipped boolean not null default false;

create index tasks_user_reflection_waiting_idx
  on public.tasks (user_id, completed_at desc)
  where status = 'done' and reflection_skipped = false;
