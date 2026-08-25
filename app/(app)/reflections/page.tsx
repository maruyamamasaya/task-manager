import Link from "next/link";
import { ReflectionCard } from "@/components/reflections/reflection-card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { actualMinutes, planActual } from "@/lib/tasks/phase4";

export default async function Page({ searchParams }: { searchParams: Promise<{ reflection?: string }> }) {
  const query = await searchParams;
  const db = await createClient();
  const [{ data: tasks, error }, { data: projects }, { data: logs }, { data: reflections }] = await Promise.all([db.from("tasks").select("*").eq("status", "done").order("completed_at", { ascending: false }), db.from("projects").select("id,name"), db.from("work_logs").select("task_id,minutes,started_at,ended_at"), db.from("reflections").select("*").order("updated_at", { ascending: false })]);
  if (error) throw error;
  const reflectionByTask = new Map((reflections ?? []).map(reflection => [reflection.task_id, reflection]));
  const projectById = new Map((projects ?? []).map(project => [project.id, project.name]));
  const logByTask = new Map<string, NonNullable<typeof logs>>();
  for (const log of logs ?? []) logByTask.set(log.task_id, [...(logByTask.get(log.task_id) ?? []), log]);
  const waiting = (tasks ?? []).filter(task => !reflectionByTask.has(task.id));
  const visibleReflections = query.reflection ? (reflections ?? []).filter(reflection => reflection.id === query.reflection) : (reflections ?? []);

  return <><PageHeader title="Reflections" description="結果と学びを記録し、次の行動につなげます。"/>{query.reflection ? <Link href="/reflections" className="mb-4 inline-flex rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-600">← 振り返り一覧へ</Link> : <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><b>振り返り待ち {waiting.length}件</b>{waiting.length ? <div className="mt-2 flex flex-wrap gap-2">{waiting.map(task => <Link className="rounded-lg bg-white px-3 py-2 text-sm" href={`/tasks?task=${task.id}`} key={task.id}>{task.title} を振り返る</Link>)}</div> : <p className="mt-1 text-sm text-slate-500">振り返り待ちのTaskはありません</p>}</section>}<div className="space-y-4">{visibleReflections.map(reflection => { const task = (tasks ?? []).find(task => task.id === reflection.task_id); if (!task) return null; const metrics = planActual(task.estimated_minutes, actualMinutes(logByTask.get(task.id) ?? [])); return <ReflectionCard key={reflection.id} task={task} reflection={reflection} projectName={task.project_id ? projectById.get(task.project_id) ?? "—" : "—"} metrics={metrics}/>; })}{!visibleReflections.length && <p className="rounded-2xl border bg-white p-12 text-center text-slate-400">{query.reflection ? "振り返りが見つかりません" : "振り返りはまだありません"}</p>}</div></>;
}
