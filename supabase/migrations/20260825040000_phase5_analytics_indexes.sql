-- Phase 5: authenticated PostgREST queries remain protected by the existing RLS.
-- Composite indexes match user-scoped range/filter predicates used by Dashboard and Analytics.
create index if not exists tasks_user_completed_idx on public.tasks(user_id, completed_at) where completed_at is not null;
create index if not exists tasks_user_project_idx on public.tasks(user_id, project_id);
create index if not exists progress_logs_user_created_idx on public.progress_logs(user_id, created_at);
create index if not exists reflections_user_created_idx on public.reflections(user_id, created_at);
