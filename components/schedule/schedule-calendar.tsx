import Link from "next/link";
import { addCalendarDays, calendarWeekday, calendarWeekStart } from "@/lib/time/calendar";
import { tokyoDateKey } from "@/lib/time/phase3";
import { holidayName } from "@/lib/time/japanese-holidays";
import type { DayOff, Task, TaskSchedule } from "@/types/database";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const leaveLabels={holiday:"休日",paid_leave:"有休",am_leave:"午前休",pm_leave:"午後休"} as const;

export function ScheduleCalendar({view,date,tasks,schedules,dayOffs}:{view:"month"|"week";date:string;tasks:Task[];schedules:TaskSchedule[];dayOffs:DayOff[]}) {
  const titles=new Map(tasks.map(task=>[task.id,task.title]));
  const grouped=new Map<string,TaskSchedule[]>();
  schedules.forEach(item=>{const key=tokyoDateKey(item.start_at); grouped.set(key,[...(grouped.get(key)??[]),item]);});
  const offMap=new Map(dayOffs.map(item=>[item.off_date,item]));
  const start=view==="week"?calendarWeekStart(date):calendarWeekStart(`${date.slice(0,7)}-01`);
  const days=Array.from({length:view==="week"?7:42},(_,i)=>addCalendarDays(start,i));
  return <section className={`schedule-calendar schedule-calendar--${view}`}>
    <div className="calendar-weekdays">{weekdays.map((day,index)=><b className={index===0?"is-sunday":index===6?"is-saturday":""} key={day}>{day}</b>)}</div>
    <div className="calendar-grid">{days.map(day=>{const items=grouped.get(day)??[],off=offMap.get(day),national=holidayName(day),weekday=calendarWeekday(day);const outside=view==="month"&&!day.startsWith(date.slice(0,7));return <Link key={day} href={`/schedule?view=day&date=${day}`} className={[outside?"is-outside":"",weekday===0||national||off?.status==="holiday"||off?.status==="paid_leave"?"is-holiday":"",weekday===6?"is-saturday":""].filter(Boolean).join(" ")}>
      <time>{Number(day.slice(-2))}</time>
      {(national||off)&&<small className="day-off-label">{off?leaveLabels[off.status]:national}</small>}
      {view==="month" ? <span className={items.length?"has-items":""}>{items.length ? `${items.length}件` : "予定なし"}</span> : <div>{(national||off)&&<p className="week-leave">{off?leaveLabels[off.status]:national}{off?.note?` · ${off.note}`:""}</p>}{items.sort((a,b)=>a.start_at.localeCompare(b.start_at)).map(item=><p key={item.id}>{titles.get(item.task_id)??"削除されたタスク"}</p>)}</div>}
    </Link>})}</div>
  </section>;
}
