import Link from "next/link";
import { tokyoDateKey } from "@/lib/time/phase3";
import type { Task, TaskSchedule } from "@/types/database";

const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
const addDays = (date:string, days:number) => { const d=new Date(`${date}T00:00:00+09:00`); d.setUTCDate(d.getUTCDate()+days); return tokyoDateKey(d); };
const monday = (date:string) => { const d=new Date(`${date}T00:00:00+09:00`); return addDays(date,-((d.getUTCDay()+6)%7)); };

export function ScheduleCalendar({view,date,tasks,schedules}:{view:"month"|"week";date:string;tasks:Task[];schedules:TaskSchedule[]}) {
  const titles=new Map(tasks.map(task=>[task.id,task.title]));
  const grouped=new Map<string,TaskSchedule[]>();
  schedules.forEach(item=>{const key=tokyoDateKey(item.start_at); grouped.set(key,[...(grouped.get(key)??[]),item]);});
  const start=view==="week"?monday(date):(()=>{const first=`${date.slice(0,7)}-01`;return addDays(first,-((new Date(`${first}T00:00:00+09:00`).getUTCDay()+6)%7));})();
  const days=Array.from({length:view==="week"?7:42},(_,i)=>addDays(start,i));
  return <section className={`schedule-calendar schedule-calendar--${view}`}>
    <div className="calendar-weekdays">{weekdays.map(day=><b key={day}>{day}</b>)}</div>
    <div className="calendar-grid">{days.map(day=>{const items=grouped.get(day)??[];const outside=view==="month"&&!day.startsWith(date.slice(0,7));return <Link key={day} href={`/schedule?view=day&date=${day}`} className={outside?"is-outside":""}>
      <time>{Number(day.slice(-2))}</time>
      {view==="month" ? <span className={items.length?"has-items":""}>{items.length ? `${items.length}件` : "予定なし"}</span> : <div>{items.sort((a,b)=>a.start_at.localeCompare(b.start_at)).map(item=><p key={item.id}>{titles.get(item.task_id)??"削除されたタスク"}</p>)}</div>}
    </Link>})}</div>
  </section>;
}
