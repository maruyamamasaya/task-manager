---
status: active
updated: 2026-09-07
---

# Code Map

全ファイル一覧ではなく、検索開始点です。概念検索で候補を得たら、記載の語を exact / symbol search し、references とテストへ進んでください。構造とデータフローは [`ARCHITECTURE.md`](ARCHITECTURE.md) を参照します。

## Authentication and Supabase access

- **Primary paths:** `app/(auth)/`, `app/(app)/layout.tsx`, `lib/supabase/`, `middleware.ts`
- **Search keywords:** `login`, `logout`, `getUser`, `createClient`, `hasSupabaseSessionCookie`, `NEXT_PUBLIC_SUPABASE`
- **Key entry points:** `login`, `AppLayout`, `updateSession`, `getSupabaseEnv`
- **Related tests:** `tests/session-cookie.test.ts`

## Projects and Tasks

- **Primary paths:** `app/(app)/projects/`, `app/(app)/tasks/`, `components/projects/`, `components/tasks/`, `lib/tasks/`
- **Search keywords:** `createProject`, `createTask`, `parent_id`, `buildTaskTree`, `reflection_skipped`, `revalidatePath`
- **Key entry points:** project/task `page.tsx` and `actions.ts`, `TaskDataLoader`, `TaskManager`
- **Related tests:** `tests/task-logic.test.ts`, `tests/phase4.test.ts`, `tests/realtime-subscriptions.test.ts`

## Schedule, Today, and work records

- **Primary paths:** `app/(app)/today/`, `app/(app)/schedule/`, `app/(app)/phase3-actions.ts`, `components/schedule/`, `lib/time/`
- **Search keywords:** `task_schedules`, `work_logs`, `meetings`, `day_offs`, `tokyoDateKey`, `addWorkLog`
- **Key entry points:** Today/Schedule `page.tsx`, `ScheduleCalendar`, `DaySchedule`, phase 3 actions
- **Related tests:** `tests/phase3.test.ts`, `tests/holidays.test.ts`

## Progress, Reflections, and Analytics

- **Primary paths:** `app/(app)/reflections/`, `app/(app)/analytics/`, `components/reflections/`, `components/analytics/`, `lib/tasks/phase4.ts`, `lib/analytics/`
- **Search keywords:** `saveProgress`, `saveReflection`, `progress_logs`, `reflections`, `aggregateDaily`, `estimateMetrics`
- **Key entry points:** reflections/analytics `page.tsx`, reflection `actions.ts`, analytics aggregate functions
- **Related tests:** `tests/phase4.test.ts`, `tests/phase5.test.ts`

## Collaborative WBS

- **Primary paths:** `app/(app)/wbs/`, `components/wbs/`, `lib/wbs/`, WBS-named files in `supabase/migrations/`
- **Search keywords:** `wbs_projects`, `wbs_items`, `wbs_project_members`, `join_wbs_project`, `swap_wbs_siblings`, `flattenWbs`
- **Key entry points:** WBS `page.tsx` / `actions.ts`, `WbsWorkspace`, `lib/wbs/hierarchy.ts`
- **Related tests:** `tests/wbs-hierarchy.test.ts`; DB behavior is defined in migrations

## Database schema and application types

- **Primary paths:** `supabase/migrations/`, `types/database.ts`, `lib/supabase/`
- **Search keywords:** exact table/column/RPC name, `create policy`, `security definer`, `enable row level security`, `Database`
- **Key entry points:** latest additive migration for the concept, `Database` types, Supabase clients
- **Related tests:** search `tests/` by domain name; migration validation is documented in [`TESTING.md`](TESTING.md)

## Shared UI and user documentation

- **Primary paths:** `components/ui/`, `components/layout/`, `app/globals.css`, `public/manual/`
- **Search keywords:** visible label/error text, component export name, route path, `_sidebar`
- **Key entry points:** `app/layout.tsx`, `components/layout/sidebar.tsx`, feature page/component
- **Related tests:** no browser E2E suite; use build plus focused manual verification
