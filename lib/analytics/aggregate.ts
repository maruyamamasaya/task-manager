import { logMinutes, minutesBetween, tokyoDateKey } from "../time/phase3";

export type AnalyticsTask = { id:string; title:string; project_id:string|null; estimated_minutes:number|null; progress:number; completed_at:string|null; created_at:string };
export type AnalyticsLog = { task_id:string; started_at:string; ended_at:string|null; minutes:number|null };
export type AnalyticsSchedule = { task_id:string; start_at:string; end_at:string };
export type AnalyticsReflection = { task_id:string; next_action?:string|null };

export function dateKeys(start:string, end:string) { const keys:string[]=[]; for(let d=new Date(`${start}T00:00:00+09:00`), last=new Date(`${end}T00:00:00+09:00`);d<=last;d=new Date(d.getTime()+86400000)) keys.push(tokyoDateKey(d)); return keys; }
export function aggregateDaily(keys:string[], logs:AnalyticsLog[], schedules:AnalyticsSchedule[], tasks:AnalyticsTask[] = []) {
  const values = new Map(keys.map(date=>[date,{date,plannedMinutes:0,actualMinutes:0,completedTasks:0}]));
  for(const log of logs) { const row=values.get(tokyoDateKey(log.started_at)); if(row) row.actualMinutes+=logMinutes(log); }
  for(const schedule of schedules) { const row=values.get(tokyoDateKey(schedule.start_at)); if(row) row.plannedMinutes+=minutesBetween(schedule.start_at,schedule.end_at); }
  for(const task of tasks) if(task.completed_at) { const row=values.get(tokyoDateKey(task.completed_at)); if(row) row.completedTasks++; }
  return [...values.values()];
}
export function taskActuals(tasks:AnalyticsTask[], logs:AnalyticsLog[]) { const byTask=new Map<string,number>(); for(const log of logs) byTask.set(log.task_id,(byTask.get(log.task_id)??0)+logMinutes(log)); return tasks.map(task=>({...task,actualMinutes:byTask.get(task.id)??0,variance:(byTask.get(task.id)??0)-(task.estimated_minutes??0)})); }
export function estimateMetrics(tasks:AnalyticsTask[], logs:AnalyticsLog[]) { const comparable=taskActuals(tasks,logs).filter(t=>(t.estimated_minutes??0)>0); return { count:comparable.length, averageRatio:comparable.length?Math.round(comparable.reduce((n,t)=>n+t.actualMinutes/t.estimated_minutes!,0)/comparable.length*100):null, averageErrorRate:comparable.length?Math.round(comparable.reduce((n,t)=>n+Math.abs(t.actualMinutes-t.estimated_minutes!)/t.estimated_minutes!,0)/comparable.length*100):null, withinEstimateRate:comparable.length?Math.round(comparable.filter(t=>t.actualMinutes<=t.estimated_minutes!).length/comparable.length*100):null }; }
export function projectActuals(logs:AnalyticsLog[], tasks:AnalyticsTask[], projects:{id:string;name:string}[]) { const taskMap=new Map(tasks.map(t=>[t.id,t.project_id])); const names=new Map(projects.map(p=>[p.id,p.name])); const totals=new Map<string,number>(); for(const log of logs){const id=taskMap.get(log.task_id)??"unassigned";totals.set(id,(totals.get(id)??0)+logMinutes(log));} return [...totals].map(([projectId,actualMinutes])=>({projectId,projectName:projectId==="unassigned"?"未分類":names.get(projectId)??"不明",actualMinutes})).sort((a,b)=>b.actualMinutes-a.actualMinutes); }
export function reflectionMetrics(completed:AnalyticsTask[], reflections:AnalyticsReflection[]) { const reflected=new Set(reflections.map(r=>r.task_id)); const entered=completed.filter(t=>reflected.has(t.id)).length; return {entered,missing:completed.length-entered,rate:completed.length?Math.round(entered/completed.length*100):0}; }
export function inRangeTokyo(value:string,start:string,end:string){const key=tokyoDateKey(value);return key>=start&&key<=end;}
export function weekdayAverages(daily:{date:string;actualMinutes:number}[]){const sums=Array(7).fill(0),counts=Array(7).fill(0);for(const row of daily){const day=new Date(`${row.date}T00:00:00Z`).getUTCDay();sums[day]+=row.actualMinutes;counts[day]++;}return [1,2,3,4,5,6,0].map(day=>({label:"日月火水木金土"[day],minutes:counts[day]?Math.round(sums[day]/counts[day]):0}));}
