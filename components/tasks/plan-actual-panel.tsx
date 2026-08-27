"use client";

import {
  actualRate,
  scheduleMinutes,
  totalWorkMinutes,
  variance,
  varianceLabel,
} from "@/lib/time/phase3";
import type { Task, TaskSchedule, WorkLog } from "@/types/database";

export function PlanActualPanel({
  task,
  schedules,
  logs,
  actualMinutes,
  onActualMinutesChange,
  correctedActual,
  onCorrectedActualChange,
}: {
  task: Task;
  schedules: TaskSchedule[];
  logs: WorkLog[];
  actualMinutes: number[];
  onActualMinutesChange: (minutes: number[]) => void;
  correctedActual: number | null;
  onCorrectedActualChange: (minutes: number | null) => void;
}) {
  const existingActual = totalWorkMinutes(logs);
  const stagedActual = actualMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const actual = (correctedActual ?? existingActual) + stagedActual;
  const diff = variance(actual, task.estimated_minutes);
  const rate = actualRate(actual, task.estimated_minutes);
  const scheduled = schedules.reduce(
    (sum, schedule) => sum + scheduleMinutes({
      start_at: schedule.start_at,
      end_at: schedule.end_at,
    }),
    0,
  );

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

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="text-sm font-semibold" htmlFor="correct-actual">実績（分）</label>
        <p className="mt-1 text-xs text-slate-500">保存後の実績合計を数値で入力します。</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
            <label className="flex items-center gap-1.5 px-3 py-2" htmlFor="correct-actual">
              <input id="correct-actual" aria-label="修正後の実績（分）" type="number" inputMode="numeric" min="0" step="5" value={correctedActual ?? existingActual} onChange={(event) => { onActualMinutesChange([]); onCorrectedActualChange(Math.max(0, Number(event.target.value))); }} onBlur={(event) => onCorrectedActualChange(Math.max(0, Math.round(Number(event.target.value) / 5) * 5))} className="number-input-no-spin w-20 bg-transparent text-right text-sm font-bold text-emerald-700 outline-none" />
              <span className="text-sm text-slate-500">分</span>
            </label>
            <div className="grid w-10 grid-rows-2 border-l border-slate-200" aria-label="実績時間の増減">
              <button type="button" aria-label="実績時間を5分増やす" onMouseDown={(event) => event.preventDefault()} onClick={() => { onActualMinutesChange([]); onCorrectedActualChange((correctedActual ?? existingActual) + 5); }} className="grid place-items-center border-b border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100">▲</button>
              <button type="button" aria-label="実績時間を5分減らす" disabled={(correctedActual ?? existingActual) <= 0} onMouseDown={(event) => event.preventDefault()} onClick={() => { onActualMinutesChange([]); onCorrectedActualChange(Math.max(0, (correctedActual ?? existingActual) - 5)); }} className="grid place-items-center text-[10px] text-slate-600 hover:bg-slate-100 disabled:text-slate-300">▼</button>
            </div>
          </div>
          {correctedActual !== null && <button type="button" className="px-2 text-sm text-slate-500" onClick={() => onCorrectedActualChange(null)}>元に戻す</button>}
        </div>
      </div>

    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p>{note && <p className="text-xs text-indigo-600">{note}</p>}</div>;
}
