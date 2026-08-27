export const TOKYO_TIME_ZONE = "Asia/Tokyo";

export type TimedRange = { start_at: string; end_at: string | null };
export type MinuteLog = { minutes: number | null; start_at?: string; end_at?: string | null; started_at?: string; ended_at?: string | null };

export function minutesBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
export function logMinutes(log: MinuteLog, now = new Date()) {
  const start = log.start_at ?? log.started_at;
  return log.minutes ?? (start ? minutesBetween(start, log.end_at ?? log.ended_at ?? now.toISOString()) : 0);
}
export function totalWorkMinutes(logs: MinuteLog[]) { return logs.reduce((sum, log) => sum + logMinutes(log), 0); }
export function variance(actual: number, estimated: number | null) { return actual - (estimated ?? 0); }
export function varianceLabel(value: number) { return value === 0 ? "±0分" : `${value > 0 ? "+" : ""}${value}分`; }
export function actualRate(actual: number, estimated: number | null) { return estimated && estimated > 0 ? Math.round(actual / estimated * 100) : null; }
export function scheduleMinutes(range: { start_at: string; end_at: string }) { return minutesBetween(range.start_at, range.end_at); }
export function overlaps(a: { start_at: string; end_at: string }, b: { start_at: string; end_at: string }) { return new Date(a.start_at) < new Date(b.end_at) && new Date(b.start_at) < new Date(a.end_at); }
export function tokyoDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TOKYO_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  return `${parts.find(p=>p.type==="year")!.value}-${parts.find(p=>p.type==="month")!.value}-${parts.find(p=>p.type==="day")!.value}`;
}
export function tokyoDayBounds(dateKey: string) { const start = new Date(`${dateKey}T00:00:00+09:00`); return { start: start.toISOString(), end: new Date(start.getTime()+86400000).toISOString() }; }
export function dailyTotals(schedules: {start_at:string;end_at:string}[], logs: MinuteLog[], meetings: {start_at:string;end_at:string}[] = []) { const planned=[...schedules,...meetings].reduce((n,s)=>n+scheduleMinutes(s),0), actual=totalWorkMinutes(logs); return {planned,actual,difference:actual-planned}; }
export function tokyoDateTime(date: string, time: string) { return new Date(`${date}T${time}:00+09:00`).toISOString(); }
export function formatTokyo(value: string, options: Intl.DateTimeFormatOptions = {}) { return new Intl.DateTimeFormat("ja-JP", {timeZone:TOKYO_TIME_ZONE,...options}).format(new Date(value)); }
export function scheduleMarkdown(date: string, schedules: {start_at:string;end_at:string;task_id:string}[], titles: Map<string,string>) {
  const blocks = [...schedules].sort((a,b)=>a.start_at.localeCompare(b.start_at)).map(item => `${formatTokyo(item.start_at,{hour:"2-digit",minute:"2-digit",hourCycle:"h23"})} - ${formatTokyo(item.end_at,{hour:"2-digit",minute:"2-digit",hourCycle:"h23"})}\n${titles.get(item.task_id) ?? "削除されたタスク"}`);
  return `## ${date.replaceAll("-", "/")} スケジュール\n\n${blocks.join("\n\n")}`.trimEnd();
}

type ReportTask = { id: string; title: string; due_at: string | null };
type ReportSchedule = { task_id: string; start_at: string; end_at: string };

export function taskStatusMarkdown(overdue: ReportTask[], done: ReportTask[], schedules: ReportSchedule[]) {
  const scheduleMap = schedules.reduce((map, schedule) => {
    map.set(schedule.task_id, [...(map.get(schedule.task_id) ?? []), schedule]);
    return map;
  }, new Map<string, ReportSchedule[]>());
  const section = (title: string, tasks: ReportTask[]) => {
    const rows = tasks.map(task => {
      const due = task.due_at ? formatTokyo(task.due_at, { year: "numeric", month: "numeric", day: "numeric" }) : "期限なし";
      const planned = (scheduleMap.get(task.id) ?? [])
        .sort((a, b) => a.start_at.localeCompare(b.start_at))
        .map(item => `${formatTokyo(item.start_at, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} - ${formatTokyo(item.end_at, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`)
        .join("、");
      return `- ${task.title}（期限: ${due}${planned ? ` / 予定: ${planned}` : ""}）`;
    });
    return `## ${title}\n\n${rows.length ? rows.join("\n") : "なし"}`;
  };
  return `${section("期限切れ", overdue)}\n\n${section("完了", done)}`;
}
