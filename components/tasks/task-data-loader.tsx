"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readCache, writeCache, type CacheEnvelope } from "@/lib/cache/indexed-db";
import type { Project, Reflection, Task, TaskSchedule, WorkLog } from "@/types/database";
import { TaskManager } from "./task-manager";

type Snapshot = { tasks: Task[]; projects: Project[]; schedules: TaskSchedule[]; workLogs: WorkLog[]; reflections: Reflection[] };
const FULL_SYNC_INTERVAL = 15 * 60 * 1000;
const LOG_WINDOW_DAYS = 90;

function mergeUpdated<T extends { id: string }>(current: T[], changed: T[]) {
  const rows = new Map(current.map(row => [row.id, row]));
  changed.forEach(row => rows.set(row.id, row));
  return [...rows.values()];
}

export function TaskDataLoader({ initialTaskId }: { initialTaskId?: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const db = createClient();
      const { data: { session } } = await db.auth.getSession();
      if (!session || !active) return;
      const key = `tasks:${session.user.id}`;
      const cached = await readCache<Snapshot>(key).catch(() => null);
      if (cached && active) setSnapshot(cached.value);

      const now = new Date();
      const full = !cached || now.getTime() - new Date(cached.fullSyncAt).getTime() > FULL_SYNC_INTERVAL;
      const since = cached?.syncedAt;
      const logStart = new Date(now.getTime() - LOG_WINDOW_DAYS * 86400000).toISOString();
      let tasksQuery = db.from("tasks").select("*").order("sort_order").order("created_at");
      let projectsQuery = db.from("projects").select("*").eq("archived", false).order("name");
      let reflectionsQuery = db.from("reflections").select("*");
      if (!full && since) {
        tasksQuery = tasksQuery.gt("updated_at", since);
        projectsQuery = projectsQuery.gt("updated_at", since);
        reflectionsQuery = reflectionsQuery.gt("updated_at", since);
      }
      const [tasksResult, projectsResult, schedulesResult, logsResult, reflectionsResult] = await Promise.all([
        tasksQuery, projectsQuery,
        db.from("task_schedules").select("*").order("start_at"),
        db.from("work_logs").select("*").or(`started_at.gte.${logStart},ended_at.is.null`).order("started_at", { ascending: false }),
        reflectionsQuery,
      ]);
      const failure = [tasksResult, projectsResult, schedulesResult, logsResult, reflectionsResult].find(result => result.error)?.error;
      if (failure) throw failure;
      const value: Snapshot = {
        tasks: full ? tasksResult.data ?? [] : mergeUpdated(cached!.value.tasks, tasksResult.data ?? []),
        projects: full ? projectsResult.data ?? [] : mergeUpdated(cached!.value.projects, projectsResult.data ?? []),
        reflections: full ? reflectionsResult.data ?? [] : mergeUpdated(cached!.value.reflections, reflectionsResult.data ?? []),
        schedules: schedulesResult.data ?? [],
        workLogs: logsResult.data ?? [],
      };
      const envelope: CacheEnvelope<Snapshot> = { value, syncedAt: now.toISOString(), fullSyncAt: full ? now.toISOString() : cached!.fullSyncAt };
      await writeCache(key, envelope);
      if (active) setSnapshot(value);
    })().catch(reason => active && setError(reason instanceof Error ? reason.message : "同期に失敗しました")).finally(() => active && setSyncing(false));
    return () => { active = false; };
  }, []);

  if (!snapshot) return <div role="status" className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">タスクを読み込んでいます…</div>;
  return <><div className="mb-2 text-right text-xs text-slate-400" aria-live="polite">{syncing ? "最新データを同期中…" : error ? `同期エラー: ${error}` : "最新データに同期済み"}</div><TaskManager key={snapshot.tasks.map(task => task.updated_at).join("|")} initialTasks={snapshot.tasks} projects={snapshot.projects} schedules={snapshot.schedules} workLogs={snapshot.workLogs} reflections={snapshot.reflections} initialTaskId={initialTaskId} /></>;
}
