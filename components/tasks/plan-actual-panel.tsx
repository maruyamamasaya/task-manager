"use client";

import { useState } from "react";
import {
  actualRate,
  scheduleMinutes,
  totalWorkMinutes,
  variance,
  varianceLabel,
} from "@/lib/time/phase3";
import type { Task, TaskSchedule, WorkLog } from "@/types/database";

const button =
  "rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50";
export function PlanActualPanel({
  task,
  schedules,
  logs,
  actualMinutes,
  onActualMinutesChange,
}: {
  task: Task;
  schedules: TaskSchedule[];
  logs: WorkLog[];
  actualMinutes: number[];
  onActualMinutesChange: (minutes: number[]) => void;
}) {
  const [custom, setCustom] = useState(25);
  const existingActual = totalWorkMinutes(logs);
  const stagedActual = actualMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const actual = existingActual + stagedActual;
  const diff = variance(actual, task.estimated_minutes);
  const rate = actualRate(actual, task.estimated_minutes);
  const scheduled = schedules.reduce(
    (sum, schedule) => sum + scheduleMinutes({
      start_at: schedule.start_at,
      end_at: schedule.end_at,
    }),
    0,
  );

  const addActual = (minutes: number) => {
    if (Number.isInteger(minutes) && minutes > 0) {
      onActualMinutesChange([...actualMinutes, minutes]);
    }
  };
  return (
    <section className="mt-6 border-t pt-5">
      <h3 className="font-bold">予定・実績</h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="予定" value={`${task.estimated_minutes ?? 0}分`} />
        <Metric label="実績" value={`${actual}分`} note={stagedActual ? `保存待ち +${stagedActual}分` : undefined} />
        <Metric label="差分" value={varianceLabel(diff)} note={diff > 0 ? "超過" : diff < 0 ? "短縮" : "一致"} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        予定比 {rate === null ? "—" : `${rate}%`} ・ スケジュール済み {scheduled}分 ・ 未配置 {Math.max(0, (task.estimated_minutes ?? 0) - scheduled)}分
      </p>

      <div className="mt-4">
        <p className="text-sm font-semibold">実績を追加</p>
        <p className="mt-1 text-xs text-slate-500">追加内容は「保存」を押すまで反映されません。</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[15, 30, 60].map((minutes) => (
            <button type="button" className={button} key={minutes} onClick={() => addActual(minutes)}>+{minutes}分</button>
          ))}
          <input aria-label="任意の分数" type="number" min="1" value={custom} onChange={(event) => setCustom(Number(event.target.value))} className="w-20 rounded-lg border px-2 text-sm" />
          <button type="button" className={button} onClick={() => addActual(custom)}>追加</button>
          {actualMinutes.length > 0 && <button type="button" className="px-2 text-sm text-slate-500" onClick={() => onActualMinutesChange([])}>取り消す</button>}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p>{note && <p className="text-xs text-indigo-600">{note}</p>}</div>;
}
