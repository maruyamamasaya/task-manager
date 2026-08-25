"use client";

import { DragEvent, useMemo, useState, useTransition } from "react";
import { deleteSchedule, saveSchedule } from "@/app/(app)/phase3-actions";
import { dailyTotals, formatTokyo, overlaps, scheduleMarkdown, scheduleMinutes, tokyoDateTime, varianceLabel } from "@/lib/time/phase3";
import type { Task, TaskSchedule, WorkLog } from "@/types/database";

const START_HOUR = 9;
const END_HOUR = 20;
const HOUR_HEIGHT = 76;
const MINUTES_PER_STEP = 15;
const COLORS = ["violet", "sky", "amber", "emerald", "rose"] as const;

type DraggingTask = { taskId: string; scheduleId?: string; duration: number; title: string };
type DropPreview = DraggingTask & { offset: number };

function timeValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function minutesFromStart(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (hour - START_HOUR) * 60 + minute;
}

function valueFromMinutes(value: number) {
  const total = START_HOUR * 60 + value;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function dueLabel(dueAt: string | null) {
  if (!dueAt) return "期限なし";
  return `期限 ${formatTokyo(dueAt, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

export function DaySchedule({ date, tasks, schedules, logs }: { date: string; tasks: Task[]; schedules: TaskSchedule[]; logs: WorkLog[] }) {
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [editing, setEditing] = useState<string>();
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState<DraggingTask>();
  const [dropPreview, setDropPreview] = useState<DropPreview>();
  const [pending, go] = useTransition();
  const totals = dailyTotals(schedules, logs);
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const copySchedule = async () => { await navigator.clipboard.writeText(scheduleMarkdown(date,schedules,new Map(tasks.map(t=>[t.id,t.title])))); setMessage("Markdown形式のスケジュールをコピーしました"); };

  const act = (promise: Promise<{ error?: string }>) => go(async () => {
    const result = await promise;
    setMessage(result.error ?? "スケジュールを保存しました");
    if (!result.error) location.reload();
  });

  const submit = () => act(saveSchedule({ id: editing, taskId, startAt: tokyoDateTime(date, start), endAt: tokyoDateTime(date, end) }));
  const choose = (schedule: TaskSchedule) => {
    setEditing(schedule.id);
    setTaskId(schedule.task_id);
    setStart(timeValue(new Date(schedule.start_at)));
    setEnd(timeValue(new Date(schedule.end_at)));
  };
  const selectTask = (task: Task) => {
    setTaskId(task.id);
    setEditing(undefined);
    const duration = Math.max(MINUTES_PER_STEP, task.estimated_minutes ?? 60);
    setEnd(valueFromMinutes(Math.min((END_HOUR - START_HOUR) * 60, minutesFromStart(start) + duration)));
  };
  const previewAtPointer = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = ((event.clientY - rect.top) / HOUR_HEIGHT) * 60;
    const offset = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60 - MINUTES_PER_STEP, Math.round(rawMinutes / MINUTES_PER_STEP) * MINUTES_PER_STEP));
    setDragOver(true);
    setDropPreview({ ...dragging, offset });
    event.dataTransfer.dropEffect = dragging.scheduleId ? "move" : "copy";
  };
  const finishDragging = () => {
    setDragging(undefined);
    setDropPreview(undefined);
    setDragOver(false);
  };
  const dropOnTimeline = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragging) return finishDragging();
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = ((event.clientY - rect.top) / HOUR_HEIGHT) * 60;
    const offset = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60 - MINUTES_PER_STEP, Math.round(rawMinutes / MINUTES_PER_STEP) * MINUTES_PER_STEP));
    const boundedDuration = Math.min(dragging.duration, (END_HOUR - START_HOUR) * 60 - offset);
    act(saveSchedule({ id: dragging.scheduleId, taskId: dragging.taskId, startAt: tokyoDateTime(date, valueFromMinutes(offset)), endAt: tokyoDateTime(date, valueFromMinutes(offset + boundedDuration)) }));
    finishDragging();
  };

  return <div className="schedule-workspace">
    <aside className="task-palette">
      <div className="schedule-section-heading">
        <div><span className="eyebrow">UNSCHEDULED TASKS</span><h2>タスクを選ぶ</h2></div>
        <span className="task-count">{tasks.length}</span>
      </div>
      <p className="palette-help">タスクをクリック、または右の時間軸へドラッグしてください。</p>
      <div className="task-block-list">
        {tasks.map((task, index) => <button
          key={task.id}
          draggable
          onDragStart={(event) => { event.dataTransfer.setData("task-id", task.id); event.dataTransfer.effectAllowed = "copy"; setDragging({ taskId: task.id, duration: Math.max(MINUTES_PER_STEP, task.estimated_minutes ?? 60), title: task.title }); }}
          onDragEnd={finishDragging}
          onClick={() => selectTask(task)}
          className={`palette-task palette-task--${COLORS[index % COLORS.length]} ${taskId === task.id ? "is-selected" : ""}`}
        >
          <span className="task-grip" aria-hidden="true">⠿</span>
          <span className="palette-task-body"><strong>{task.title}</strong><small>{dueLabel(task.due_at)}</small></span>
          <span className="task-estimate">{task.estimated_minutes ? `${task.estimated_minutes}分` : "60分"}</span>
        </button>)}
        {!tasks.length && <p className="schedule-empty">配置できるタスクがありません</p>}
      </div>
      <div className="schedule-editor">
        <div className="editor-title"><strong>{editing ? "予定を編集" : "選択中の予定"}</strong>{editing && <button onClick={() => setEditing(undefined)}>解除</button>}</div>
        <p>{taskMap.get(taskId)?.title ?? "タスクを選択してください"}</p>
        <div className="time-inputs">
          <label>開始<input type="time" min="09:00" max="20:00" step="900" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <span>→</span>
          <label>終了<input type="time" min="09:00" max="20:00" step="900" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        </div>
        <button disabled={pending || !taskId || start >= end} onClick={submit} className="schedule-save">{pending ? "保存中…" : editing ? "変更を保存" : "時間軸に追加"}</button>
        {message && <p className="schedule-message" role="status">{message}</p>}
      </div>
    </aside>

    <section className="timeline-panel">
      <div className="timeline-heading">
        <div><span className="eyebrow">DAILY TIMELINE</span><h2>今日の時間割</h2></div>
        <div className="schedule-totals"><span>予定 <b>{totals.planned}分</b></span><span>実績 <b>{totals.actual}分</b></span><span>差分 <b>{varianceLabel(totals.difference)}</b></span><button onClick={copySchedule}>Markdownをコピー</button></div>
      </div>
      <div className="timeline-legend"><span><i className="legend-dot" />15分単位・ドラッグ中に開始時刻を表示</span><span>ブロックをドラッグして移動</span></div>
      <div className="timeline-scroll-area">
        <div
          className={`day-timeline ${dragOver ? "is-drag-over" : ""}`}
          style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
          onDragEnter={previewAtPointer}
          onDragOver={previewAtPointer}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setDragOver(false); setDropPreview(undefined); } }}
          onDrop={dropOnTimeline}
        >
          {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => <div key={index} className="timeline-hour" style={{ top: index * HOUR_HEIGHT }}><time>{String(START_HOUR + index).padStart(2, "0")}:00</time><span /></div>)}
          {schedules.map((schedule, index) => {
            const task = taskMap.get(schedule.task_id);
            const startValue = timeValue(new Date(schedule.start_at));
            const top = minutesFromStart(startValue) / 60 * HOUR_HEIGHT;
            const height = Math.max(32, scheduleMinutes(schedule) / 60 * HOUR_HEIGHT);
            const conflict = schedules.some((other) => other.id !== schedule.id && overlaps(schedule, other));
            return <button
              key={schedule.id}
              draggable
              onDragStart={(event) => { event.dataTransfer.setData("task-id", schedule.task_id); event.dataTransfer.setData("schedule-id", schedule.id); event.dataTransfer.effectAllowed = "move"; setDragging({ taskId: schedule.task_id, scheduleId: schedule.id, duration: scheduleMinutes(schedule), title: task?.title ?? "削除されたタスク" }); }}
              onDragEnd={finishDragging}
              onClick={() => choose(schedule)}
              className={`timeline-task timeline-task--${COLORS[index % COLORS.length]} ${conflict ? "has-conflict" : ""}`}
              style={{ top, height }}
            >
              <span className="timeline-task-time">{startValue}–{timeValue(new Date(schedule.end_at))}</span>
              <strong>{task?.title ?? "削除されたタスク"}</strong>
              <small>{dueLabel(task?.due_at ?? null)}{conflict ? " · 予定が重複しています" : ""}</small>
              <span className="timeline-delete" role="button" aria-label="予定を削除" onClick={(event) => { event.stopPropagation(); if (confirm("この予定を削除しますか？")) act(deleteSchedule(schedule.id)); }}>×</span>
            </button>;
          })}
          {dropPreview && <div
            className="timeline-drop-preview"
            style={{ top: dropPreview.offset / 60 * HOUR_HEIGHT, height: Math.max(32, Math.min(dropPreview.duration, (END_HOUR - START_HOUR) * 60 - dropPreview.offset) / 60 * HOUR_HEIGHT) }}
            aria-hidden="true"
          >
            <span className="drop-preview-time">{valueFromMinutes(dropPreview.offset)}</span>
            <strong>{dropPreview.title}</strong>
            <small>{valueFromMinutes(dropPreview.offset)}–{valueFromMinutes(dropPreview.offset + Math.min(dropPreview.duration, (END_HOUR - START_HOUR) * 60 - dropPreview.offset))}</small>
          </div>}
          {!schedules.length && <div className="timeline-empty"><span>＋</span><strong>タスクをここにドロップ</strong><small>9:00〜20:00の間に予定を配置できます</small></div>}
        </div>
      </div>
    </section>
  </div>;
}
