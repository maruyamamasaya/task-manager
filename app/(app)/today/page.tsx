import Link from "next/link";
import { CopyDailyReport } from "@/components/today/copy-daily-report";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { dailyTotals, formatTokyo, scheduleMarkdown, scheduleMinutes, taskStatusMarkdown, tokyoDateKey, tokyoDayBounds, totalWorkMinutes, varianceLabel } from "@/lib/time/phase3";
import { DEFAULT_WORK_END, DEFAULT_WORK_START, workingMinutes } from "@/lib/time/work-settings";
import type { Project, Task, TaskSchedule, WorkLog } from "@/types/database";

function TaskSection({ title, tasks, kind, schedulesByTask }: { title: string; tasks: Task[]; kind: "overdue" | "today" | "done"; schedulesByTask: Map<string, TaskSchedule[]> }) {
  const tones = { overdue: "text-red-600", today: "text-indigo-600", done: "text-emerald-600" };
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">{title}</h2><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{tasks.length}</span></header>
      <div className="divide-y divide-slate-100">{tasks.length ? tasks.map(task => {
        const planned = schedulesByTask.get(task.id) ?? [];
        return <Link href={`/tasks?task=${task.id}`} key={task.id} className="block px-4 py-3 transition-colors hover:bg-slate-50"><div className="flex items-start gap-2.5"><Icon name="empty" className={`mt-0.5 size-4 shrink-0 ${tones[kind]}`}/><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className={`truncate text-sm font-medium ${kind === "done" ? "text-slate-500 line-through" : "text-slate-800"}`}>{task.title}</p><span className="text-xs font-medium text-slate-500">{kind === "done" ? "完了" : `${task.progress}%`}</span></div>{kind !== "done" && <Progress value={task.progress} className="mt-2"/>}<div className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs ${kind === "overdue" ? "text-red-600" : "text-slate-400"}`}><span>期限 {task.due_at ? formatTokyo(task.due_at, { month: "numeric", day: "numeric" }) : "なし"}</span>{planned.map(item => <span key={item.id}>予定 {formatTokyo(item.start_at, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} - {formatTokyo(item.end_at, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>)}</div></div></div></Link>;
      }) : <div className="px-4 py-8 text-center"><Icon name="empty" className="mx-auto size-6 text-slate-300"/><p className="mt-2 text-sm font-medium text-slate-600">タスクはありません</p><p className="mt-1 text-xs text-slate-400">該当するタスクがここに表示されます。</p></div>}</div>
    </section>
  );
}

export default async function Page() {
  const db = await createClient();
  const date = tokyoDateKey(new Date());
  const bounds = tokyoDayBounds(date);
  const [{ data: all, error }, { data: schedules }, { data: logs }, { data: projects }, { data: workSettings }] = await Promise.all([
    db.from("tasks").select("*").order("due_at", { nullsFirst: false }),
    db.from("task_schedules").select("*").gte("start_at", bounds.start).lt("start_at", bounds.end).order("start_at"),
    db.from("work_logs").select("*").gte("started_at", bounds.start).lt("started_at", bounds.end),
    db.from("projects").select("*").eq("archived", false),
    db.from("work_settings").select("work_start,work_end").maybeSingle(),
  ]);
  if (error) throw error;
  const tasks = all ?? [];
  const overdue = tasks.filter(task => task.status !== "done" && task.due_at && task.due_at < bounds.start);
  const today = tasks.filter(task => task.status !== "done" && task.due_at && task.due_at >= bounds.start && task.due_at < bounds.end);
  const done = tasks.filter(task => task.status === "done" && task.completed_at && task.completed_at >= bounds.start && task.completed_at < bounds.end);
  const ids = [...new Set((schedules ?? []).map(schedule => schedule.task_id))];
  const { data: scheduledTasks } = ids.length ? await db.from("tasks").select("*").in("id", ids) : { data: [] as Task[] };
  const taskMap = new Map((scheduledTasks ?? []).map(task => [task.id, task]));
  const projectMap = new Map(((projects as Project[]) ?? []).map(project => [project.id, project]));
  const logsByTask = (logs ?? []).reduce((map, log) => map.set(log.task_id, [...(map.get(log.task_id) ?? []), log]), new Map<string, WorkLog[]>());
  const schedulesByTask = (schedules ?? []).reduce((map, schedule) => map.set(schedule.task_id, [...(map.get(schedule.task_id) ?? []), schedule]), new Map<string, TaskSchedule[]>());
  const totals = dailyTotals(schedules ?? [], logs ?? []);
  const plannedWorkMinutes = workingMinutes(workSettings?.work_start ?? DEFAULT_WORK_START, workSettings?.work_end ?? DEFAULT_WORK_END) ?? 450;
  const workDifference = totals.actual - plannedWorkMinutes;
  const reportMarkdown = `# 今日の予定報告\n\n予定 ${plannedWorkMinutes}分 / 実績 ${totals.actual}分 / 差分 ${varianceLabel(workDifference)}\n\n${scheduleMarkdown(date, schedules ?? [], new Map((scheduledTasks ?? []).map(task => [task.id, task.title])))}\n\n${taskStatusMarkdown(overdue, done, schedules ?? [])}`;
  const dateLabel = formatTokyo(bounds.start, { month: "long", day: "numeric", weekday: "long" });

  const summaryCards = [
    { label: "予定", value: `${totals.planned}分 / ${plannedWorkMinutes}分`, detail: "スケジュール / 勤務時間", tone: "text-slate-900" },
    { label: "実績", value: `${totals.actual}分`, tone: "text-emerald-700" },
    { label: "差分", value: varianceLabel(workDifference), tone: workDifference > 0 ? "text-amber-700" : "text-slate-900" },
  ];

  return <><PageHeader title="Today" eyebrow={dateLabel} description="今日取り組むタスクと予定を確認します。" action={<Link href="/schedule" className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">スケジュールを見る</Link>}/><section className="mb-5 overflow-hidden rounded-xl border border-slate-200/80 bg-white"><div className="grid grid-cols-3 divide-x divide-slate-100">{summaryCards.map(({ label, value, detail, tone }) => <div key={label} className="px-4 py-3 sm:px-5"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>{detail && <p className="mt-0.5 text-[10px] text-slate-400">{detail}</p>}</div>)}</div></section><section className="mb-5 rounded-xl border border-slate-200/80 bg-white"><header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3"><h2 className="mr-auto text-sm font-semibold text-slate-900">今日の予定</h2><CopyDailyReport markdown={reportMarkdown}/></header>{schedules?.length ? <div className="divide-y divide-slate-100">{schedules.map(schedule => { const task = taskMap.get(schedule.task_id); const project = task?.project_id ? projectMap.get(task.project_id) : null; const actual = totalWorkMinutes(logsByTask.get(schedule.task_id) ?? []); return <Link href={`/tasks?task=${schedule.task_id}`} key={schedule.id} className="grid gap-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center"><time className="font-mono text-sm font-semibold text-indigo-700">{formatTokyo(schedule.start_at, { hour: "2-digit", minute: "2-digit" })}</time><div className="min-w-0 border-l-2 border-indigo-500 pl-3"><p className="truncate text-sm font-medium text-slate-900">{task?.title ?? "削除されたタスク"}</p><p className="mt-0.5 text-xs text-slate-500">{project?.name ?? "未分類"} ・ {scheduleMinutes(schedule)}分</p></div><p className="text-xs text-slate-500">実績 {actual}分</p></Link>; })}</div> : <div className="px-4 py-8 text-center text-sm text-slate-500">今日の予定はありません。スケジュールから追加できます。</div>}</section><div className="grid gap-4 xl:grid-cols-3"><TaskSection title="期限切れ" tasks={overdue} kind="overdue" schedulesByTask={schedulesByTask}/><TaskSection title="今日" tasks={today} kind="today" schedulesByTask={schedulesByTask}/><TaskSection title="完了" tasks={done} kind="done" schedulesByTask={schedulesByTask}/></div></>;
}
