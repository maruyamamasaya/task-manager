import type { Reflection, Task, TaskStatus, WorkLog } from "@/types/database";
import { clampProgress } from "./tree";

export function stateFromProgress(progress: number): { progress: number; status: TaskStatus } {
  const value = clampProgress(progress);
  return { progress: value, status: value === 100 ? "done" : value === 0 ? "todo" : "doing" };
}
export function averageProgress(values: number[]) { return values.length ? Math.round(values.reduce((sum, value) => sum + clampProgress(value), 0) / values.length) : 0; }
export function parentProgress(children: Pick<Task,"progress">[]) { return averageProgress(children.map(child => child.progress)); }
export function shouldCreateProgressLog(current: number, next: number) { return clampProgress(current) !== clampProgress(next); }
export function projectProgress(tasks: Pick<Task,"progress"|"status">[]) { return { total: tasks.length, done: tasks.filter(t => t.status === "done").length, progress: averageProgress(tasks.map(t => t.progress)) }; }
export function needsReflection(task: Pick<Task,"status">, reflection?: Reflection | null) { return task.status === "done" && !reflection; }
export function actualMinutes(logs: Pick<WorkLog,"minutes"|"started_at"|"ended_at">[]) { return logs.reduce((sum, log) => sum + (log.minutes ?? (log.ended_at ? Math.max(0,Math.round((new Date(log.ended_at).getTime()-new Date(log.started_at).getTime())/60000)) : 0)),0); }
export function planActual(estimated: number | null, actual: number) { const planned=estimated??0; return { planned, actual, difference: actual-planned, ratio: planned ? Math.round(actual/planned*100) : null }; }
