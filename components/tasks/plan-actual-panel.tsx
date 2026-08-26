"use client";

import { useState } from "react";
import {
  actualRate,
  formatTokyo,
  overlaps,
  scheduleMinutes,
  tokyoDateTime,
  totalWorkMinutes,
  variance,
  varianceLabel,
} from "@/lib/time/phase3";
import type { Task, TaskSchedule, WorkLog } from "@/types/database";

const button =
  "rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50";
type NewSchedule = { startAt: string; endAt: string };

function todayInTokyo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function scheduleFields(schedule: Pick<TaskSchedule, "start_at" | "end_at">) {
  const parts = (value: string) => Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  const start = parts(schedule.start_at);
  const end = parts(schedule.end_at);
  return {
    date: `${start.year}-${start.month}-${start.day}`,
    start: `${start.hour}:${start.minute}`,
    end: `${end.hour}:${end.minute}`,
  };
}

export function PlanActualPanel({
  task,
  schedules,
  allSchedules,
  logs,
  actualMinutes,
  onActualMinutesChange,
  newSchedules,
  onSchedulesChange,
}: {
  task: Task;
  schedules: TaskSchedule[];
  allSchedules: TaskSchedule[];
  logs: WorkLog[];
  actualMinutes: number[];
  onActualMinutesChange: (minutes: number[]) => void;
  newSchedules: NewSchedule[];
  onSchedulesChange: (schedules: NewSchedule[]) => void;
}) {
  const initialSchedule = schedules[0] ? scheduleFields(schedules[0]) : null;
  const [custom, setCustom] = useState(25);
  const [date, setDate] = useState(initialSchedule?.date ?? todayInTokyo);
  const [start, setStart] = useState(initialSchedule?.start ?? "09:00");
  const [end, setEnd] = useState(initialSchedule?.end ?? "10:00");
  const existingActual = totalWorkMinutes(logs);
  const stagedActual = actualMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const actual = existingActual + stagedActual;
  const diff = variance(actual, task.estimated_minutes);
  const rate = actualRate(actual, task.estimated_minutes);
  const scheduled = [...schedules, ...newSchedules].reduce(
    (sum, schedule) => sum + scheduleMinutes({
      start_at: "start_at" in schedule ? schedule.start_at : schedule.startAt,
      end_at: "end_at" in schedule ? schedule.end_at : schedule.endAt,
    }),
    0,
  );

  const addActual = (minutes: number) => {
    if (Number.isInteger(minutes) && minutes > 0) {
      onActualMinutesChange([...actualMinutes, minutes]);
    }
  };
  const candidate = date && start && end
    ? { startAt: tokyoDateTime(date, start), endAt: tokyoDateTime(date, end) }
    : null;
  const invalidSchedule = candidate
    ? new Date(candidate.startAt) >= new Date(candidate.endAt)
    : false;
  const candidateMatchesSaved = candidate
    ? schedules.some((schedule) => schedule.start_at === candidate.startAt && schedule.end_at === candidate.endAt)
    : false;
  const candidateConflict = candidate
    ? [...allSchedules, ...newSchedules.map((item, index) => ({
        id: `new-${index}`,
        task_id: task.id,
        user_id: task.user_id,
        start_at: item.startAt,
        end_at: item.endAt,
        created_at: item.startAt,
      }))].some((schedule) => !(
        schedule.task_id === task.id &&
        schedule.start_at === candidate.startAt &&
        schedule.end_at === candidate.endAt
      ) && overlaps(
        { start_at: candidate.startAt, end_at: candidate.endAt },
        schedule,
      ))
    : false;

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

      <div className="mt-5">
        <p className="text-sm font-semibold">スケジュール予定</p>
        <p className="mt-1 text-xs text-slate-500">設定済みの予定がある場合は、その日時を入力欄に反映します。別の日時を指定して予定を追加することもできます。</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <input aria-label="予定日" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
          <input aria-label="開始時刻" type="time" value={start} onChange={(event) => setStart(event.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
          <input aria-label="終了時刻" type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        {invalidSchedule && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">終了時刻は開始時刻より後にしてください。</p>}
        {!invalidSchedule && candidateConflict && <p role="alert" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">⚠ この時間帯は別のスケジュールと重複しています。</p>}
        <button
          type="button"
          disabled={!candidate || invalidSchedule || candidateMatchesSaved}
          onClick={() => candidate && onSchedulesChange([...newSchedules, candidate])}
          className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-50"
        >
          {candidateMatchesSaved ? "設定済みの予定です" : "＋ 保存待ちの予定に追加"}
        </button>
        {[...schedules.map((schedule) => ({ startAt: schedule.start_at, endAt: schedule.end_at, saved: true })), ...newSchedules.map((schedule) => ({ ...schedule, saved: false }))].map((schedule, index, items) => {
          const conflict = items.some((other, otherIndex) => otherIndex !== index && overlaps({ start_at: schedule.startAt, end_at: schedule.endAt }, { start_at: other.startAt, end_at: other.endAt })) || allSchedules.some((other) => other.task_id !== task.id && overlaps({ start_at: schedule.startAt, end_at: schedule.endAt }, other));
          return <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${conflict ? "bg-amber-50 text-amber-800" : "bg-slate-50"}`} key={`${schedule.startAt}-${index}`}>
            <span className="flex-1">{formatTokyo(schedule.startAt, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}〜{formatTokyo(schedule.endAt, { hour: "2-digit", minute: "2-digit" })}（{scheduleMinutes({ start_at: schedule.startAt, end_at: schedule.endAt })}分）{conflict ? " · 重複あり" : ""}{!schedule.saved ? " · 保存待ち" : ""}</span>
            {schedule.saved && <button type="button" className="shrink-0 text-indigo-700" onClick={() => { const fields = scheduleFields({ start_at: schedule.startAt, end_at: schedule.endAt }); setDate(fields.date); setStart(fields.start); setEnd(fields.end); }}>日時を反映</button>}
            {!schedule.saved && <button type="button" className="text-red-600" onClick={() => onSchedulesChange(newSchedules.filter((_, newIndex) => newIndex !== index - schedules.length))}>削除</button>}
          </div>;
        })}
        {!schedules.length && !newSchedules.length && <p className="mt-2 text-sm text-slate-400">予定はまだ配置されていません</p>}
      </div>
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p>{note && <p className="text-xs text-indigo-600">{note}</p>}</div>;
}
