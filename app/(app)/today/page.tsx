import Link from "next/link";
import { CopyDailyReport } from "@/components/today/copy-daily-report";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { dailyTotals, formatTokyo, scheduleMarkdown, scheduleMinutes, tokyoDateKey, tokyoDayBounds, totalWorkMinutes, varianceLabel } from "@/lib/time/phase3";
import type { Project, Task, WorkLog } from "@/types/database";

function Section({ title, tasks, tone }: { title: string; tasks: Task[]; tone: string }) {
  return <section className="rounded-2xl border bg-white p-5"><h2 className={`font-bold ${tone}`}>{title}<span className="ml-2 text-sm font-normal text-slate-400">{tasks.length}件</span></h2><div className="mt-3 divide-y">{tasks.length ? tasks.map((task) => <Link href={`/tasks?task=${task.id}`} key={task.id} className="flex py-3 text-sm"><span className="flex-1">{task.title}</span><span>{task.status === "done" ? "振り返る" : `${task.progress}%`}</span></Link>) : <p className="py-6 text-center text-sm text-slate-400">該当するタスクはありません</p>}</div></section>;
}

export default async function Page() {
  const db = await createClient(), date = tokyoDateKey(new Date()), bounds = tokyoDayBounds(date);
  const [{ data: all, error }, { data: schedules }, { data: logs }, { data: projects }] = await Promise.all([
    db.from("tasks").select("*").not("due_at", "is", null).order("due_at"),
    db.from("task_schedules").select("*").gte("start_at", bounds.start).lt("start_at", bounds.end).order("start_at"),
    db.from("work_logs").select("*").gte("started_at", bounds.start).lt("started_at", bounds.end),
    db.from("projects").select("*").eq("archived", false),
  ]);
  if (error) throw error;
  const tasks = all ?? [], overdue = tasks.filter((task) => task.status !== "done" && task.due_at! < bounds.start), today = tasks.filter((task) => task.status !== "done" && task.due_at! >= bounds.start && task.due_at! < bounds.end), done = tasks.filter((task) => task.status === "done" && task.completed_at && task.completed_at >= bounds.start && task.completed_at < bounds.end);
  const ids = [...new Set((schedules ?? []).map((schedule) => schedule.task_id))];
  const { data: scheduledTasks } = ids.length ? await db.from("tasks").select("*").in("id", ids) : { data: [] as Task[] };
  const taskMap = new Map((scheduledTasks ?? []).map((task) => [task.id, task]));
  const projectMap = new Map((projects as Project[] ?? []).map((project) => [project.id, project]));
  const logsByTask = (logs ?? []).reduce((map, log) => map.set(log.task_id, [...(map.get(log.task_id) ?? []), log]), new Map<string, WorkLog[]>());
  const totals = dailyTotals(schedules ?? [], logs ?? []);
  const reportMarkdown = `# 今日の予定報告\n\n予定 ${totals.planned}分 / 実績 ${totals.actual}分 / 差分 ${varianceLabel(totals.difference)}\n\n${scheduleMarkdown(date, schedules ?? [], new Map((scheduledTasks ?? []).map((task) => [task.id, task.title])))}`;
  return <><PageHeader title="Today" description="今日取り組むタスクと予定を確認します。"/><section className="mb-4 rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto font-bold">今日の予定</h2><span className="text-sm">予定 {totals.planned}分 / 実績 {totals.actual}分 / 差分 {varianceLabel(totals.difference)}</span><CopyDailyReport markdown={reportMarkdown}/></div>
    {schedules?.length ? <div className="mt-3 grid gap-2">{schedules.map((schedule) => { const task = taskMap.get(schedule.task_id); const project = task?.project_id ? projectMap.get(task.project_id) : null; const actual = totalWorkMinutes(logsByTask.get(schedule.task_id) ?? []); return <Link href={`/tasks?task=${schedule.task_id}`} key={schedule.id} className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 transition hover:border-indigo-300 hover:shadow-sm"><div className="flex items-center gap-3"><time className="w-20 font-mono font-semibold">{formatTokyo(schedule.start_at, { hour: "2-digit", minute: "2-digit" })}</time><b className="min-w-0 flex-1 truncate">{task?.title ?? "削除されたタスク"}</b><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-indigo-700">{task?.status === "done" ? "完了済み" : task?.status === "doing" ? "進行中" : "未着手"}</span></div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-0 text-xs text-slate-600 sm:pl-[5.75rem]"><span>{project?.name ?? "未分類"}</span><span>進捗 <b className="text-indigo-700">{task?.progress ?? 0}%</b></span><span>予定 {scheduleMinutes(schedule)}分 / 実績 {actual}分</span></div></Link>; })}</div> : <p className="py-6 text-center text-sm text-slate-400">今日の予定がありません。「Schedule」へ追加すると表示されます。</p>}
  </section><div className="grid gap-4 xl:grid-cols-3"><Section title="期限切れ" tasks={overdue} tone="text-red-600"/><Section title="今日" tasks={today} tone="text-indigo-700"/><Section title="完了" tasks={done} tone="text-emerald-600"/></div></>;
}
