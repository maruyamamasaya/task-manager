import Link from "next/link";
import { ReflectionList } from "@/components/reflections/reflection-list";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { actualMinutes, planActual } from "@/lib/tasks/phase4";
import { ReflectionWaitingList } from "@/components/reflections/reflection-waiting-list";

export default async function Page({ searchParams }: { searchParams: Promise<{ reflection?: string }> }) {
  const query = await searchParams;
  const db = await createClient();
  const [{ data: tasks, error }, { data: projects }, { data: logs }, { data: reflections }] = await Promise.all([db.from("tasks").select("*").eq("status", "done").order("completed_at", { ascending: false }), db.from("projects").select("id,name"), db.from("work_logs").select("task_id,minutes,started_at,ended_at"), db.from("reflections").select("*").order("updated_at", { ascending: false })]);
  if (error) throw error;
  const reflectionByTask = new Map((reflections ?? []).map(reflection => [reflection.task_id, reflection]));
  const projectById = new Map((projects ?? []).map(project => [project.id, project.name]));
  const logByTask = new Map<string, NonNullable<typeof logs>>();
  for (const log of logs ?? []) logByTask.set(log.task_id, [...(logByTask.get(log.task_id) ?? []), log]);
  const waiting = (tasks ?? []).filter(task => !task.reflection_skipped && !reflectionByTask.has(task.id));
  const visibleReflections = query.reflection ? (reflections ?? []).filter(reflection => reflection.id === query.reflection) : (reflections ?? []);
  const items = visibleReflections.flatMap(reflection => { const task = (tasks ?? []).find(task => task.id === reflection.task_id); if (!task) return []; return [{ reflection, task, projectName: task.project_id ? projectById.get(task.project_id) ?? "—" : "—", metrics: planActual(task.estimated_minutes, actualMinutes(logByTask.get(task.id) ?? [])) }]; });

  return <><PageHeader title="Reflections" description="結果と学びを記録し、次の行動につなげます。"/>{query.reflection ? <Link href="/reflections" className="mb-4 inline-flex rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-600">← 振り返り一覧へ</Link> : <ReflectionWaitingList tasks={waiting} />}<ReflectionList items={items} detail={Boolean(query.reflection)} /></>;
}
