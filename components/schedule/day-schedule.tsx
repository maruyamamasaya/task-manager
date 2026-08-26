"use client";

import { CSSProperties, DragEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSchedule, saveSchedule } from "@/app/(app)/phase3-actions";
import { dailyTotals, formatTokyo, overlaps, scheduleMarkdown, scheduleMinutes, tokyoDateTime, varianceLabel } from "@/lib/time/phase3";
import { holidayName } from "@/lib/time/japanese-holidays";
import type { DayOff, Project, Task, TaskSchedule, WorkLog } from "@/types/database";
import { DatabaseUpdating } from "@/components/ui/database-updating";

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 76;
const MINUTES_PER_STEP = 15;
const UNCLASSIFIED_COLOR = "#94a3b8";
const statusLabel = { todo: "未着手", doing: "進行中", done: "完了済み" } as const;

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

export function DaySchedule({ date, tasks, projects, schedules, logs, dayOff }: { date: string; tasks: Task[]; projects: Project[]; schedules: TaskSchedule[]; logs: WorkLog[]; dayOff?:DayOff }) {
  const router = useRouter();
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [projectId, setProjectId] = useState("all");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState<DraggingTask>();
  const [dropPreview, setDropPreview] = useState<DropPreview>();
  const [now, setNow] = useState(() => new Date());
  const [pending, go] = useTransition();
  const totals = dailyTotals(schedules, logs);
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const projectColorMap = useMemo(() => new Map(projects.map((project) => [project.id, project.color ?? UNCLASSIFIED_COLOR])), [projects]);
  const taskColor = (task?: Task) => task?.project_id ? projectColorMap.get(task.project_id) ?? UNCLASSIFIED_COLOR : UNCLASSIFIED_COLOR;
  const visibleTasks = useMemo(() => tasks.filter((task) => projectId === "all" || (projectId === "unclassified" ? !task.project_id : task.project_id === projectId)), [tasks, projectId]);
  const copySchedule = async () => { await navigator.clipboard.writeText(scheduleMarkdown(date,schedules,new Map(tasks.map(t=>[t.id,t.title])))); setMessage("Markdown形式のスケジュールをコピーしました"); };
  const openTaskDetails = (selectedTaskId: string) => router.push(`/tasks?task=${selectedTaskId}`);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const isToday = date === new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const nowValue = timeValue(now);
  const nowOffset = minutesFromStart(nowValue);
  const showNow = isToday && nowOffset >= 0 && nowOffset <= (END_HOUR - START_HOUR) * 60;

  const act = (promise: Promise<{ error?: string }>) => go(async () => {
    const result = await promise;
    setMessage(result.error ?? "スケジュールを保存しました");
    if (!result.error) router.refresh();
  });

  const selectTask = (task: Task) => {
    if (!task.estimated_minutes) {
      setErrorMessage("このタスクには予定時間が設定されていません。タスク詳細で予定時間を設定してから配置してください。");
      return;
    }
    setTaskId(task.id);
  };
  const previewAtPointer = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = ((event.clientY - rect.top) / HOUR_HEIGHT) * 60;
    const offset = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60 - dragging.duration, Math.round(rawMinutes / MINUTES_PER_STEP) * MINUTES_PER_STEP));
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
    const offset = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60 - dragging.duration, Math.round(rawMinutes / MINUTES_PER_STEP) * MINUTES_PER_STEP));
    act(saveSchedule({ id: dragging.scheduleId, taskId: dragging.taskId, startAt: tokyoDateTime(date, valueFromMinutes(offset)), endAt: tokyoDateTime(date, valueFromMinutes(offset + dragging.duration)) }));
    finishDragging();
  };

  const leaveLabel=dayOff?({holiday:"休日",paid_leave:"有休",am_leave:"午前休",pm_leave:"午後休"} as const)[dayOff.status]:holidayName(date);
  return <><DatabaseUpdating active={pending} />{leaveLabel&&<div className="day-leave-banner"><span>休</span><div><b>{leaveLabel}</b>{dayOff?.note&&<small>{dayOff.note}</small>}</div><a href="/holidays">休日設定を開く</a></div>}<div className="schedule-workspace">
    <aside className="task-palette">
      <div className="schedule-section-heading">
        <div><span className="eyebrow">UNSCHEDULED TASKS</span><h2>タスクを選ぶ</h2></div>
        <span className="task-count">{visibleTasks.length}</span>
      </div>
      <p className="palette-help">タスクをクリック、または右の時間軸へドラッグしてください。</p>
      <label className="project-task-filter"><span>プロジェクト</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="all">すべてのプロジェクト</option><option value="unclassified">未分類</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <div className="task-block-list">
        {visibleTasks.map((task) => <button
          key={task.id}
          draggable={Boolean(task.estimated_minutes)}
          onDragStart={(event) => { if (!task.estimated_minutes) { event.preventDefault(); selectTask(task); return; } event.dataTransfer.setData("task-id", task.id); event.dataTransfer.effectAllowed = "copy"; setDragging({ taskId: task.id, duration: task.estimated_minutes, title: task.title }); }}
          onDragEnd={finishDragging}
          onClick={() => selectTask(task)}
          className={`palette-task ${taskId === task.id ? "is-selected" : ""} ${!task.estimated_minutes ? "is-unavailable" : ""}`}
          style={{ "--task": taskColor(task), "--task-bg": `color-mix(in srgb, ${taskColor(task)} 10%, white)` } as CSSProperties}
        >
          <span className="task-grip" aria-hidden="true">⠿</span>
          <span className="palette-task-body"><strong>{task.title}</strong><small>{dueLabel(task.due_at)}</small></span>
          <span className="task-estimate">{task.estimated_minutes ? `${task.estimated_minutes}分` : "未設定"}</span>
        </button>)}
        {!visibleTasks.length && <p className="schedule-empty">該当するタスクがありません</p>}
      </div>
    </aside>

    <section className="timeline-panel">
      <div className="timeline-heading">
        <div><span className="eyebrow">DAILY TIMELINE</span><h2>今日の時間割</h2></div>
        <div className="schedule-totals"><span>予定 <b>{totals.planned}分</b></span><span>実績 <b>{totals.actual}分</b></span><span>差分 <b>{varianceLabel(totals.difference)}</b></span><button onClick={copySchedule}>Markdownをコピー</button></div>
      </div>
      <div className="timeline-legend"><span><i className="legend-dot" />15分単位・ドラッグ中に開始時刻を表示</span><span>Shift＋クリック／右クリックで詳細 · ドラッグで移動</span></div>
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
          {schedules.map((schedule) => {
            const task = taskMap.get(schedule.task_id);
            const startValue = timeValue(new Date(schedule.start_at));
            const top = minutesFromStart(startValue) / 60 * HOUR_HEIGHT;
            const duration = scheduleMinutes(schedule);
            const endValue = valueFromMinutes(minutesFromStart(startValue) + duration);
            const height = Math.max(32, duration / 60 * HOUR_HEIGHT);
            const conflict = schedules.some((other) => other.id !== schedule.id && overlaps(schedule, other));
            return <button
              key={schedule.id}
              draggable
              onDragStart={(event) => { event.dataTransfer.setData("task-id", schedule.task_id); event.dataTransfer.setData("schedule-id", schedule.id); event.dataTransfer.effectAllowed = "move"; setDragging({ taskId: schedule.task_id, scheduleId: schedule.id, duration, title: task?.title ?? "削除されたタスク" }); }}
              onDragEnd={finishDragging}
              onClick={(event) => event.shiftKey ? openTaskDetails(schedule.task_id) : setTaskId(schedule.task_id)}
              onContextMenu={(event) => { event.preventDefault(); openTaskDetails(schedule.task_id); }}
              title="Shift＋クリックまたは右クリックでタスク詳細を開く"
              className={`timeline-task ${conflict ? "has-conflict" : ""}`}
              style={{ top, height, "--task": taskColor(task), "--task-bg": `color-mix(in srgb, ${taskColor(task)} 10%, white)` } as CSSProperties}
            >
              <span className="timeline-task-time">{startValue}–{endValue}</span>
              <span className={`timeline-task-status is-${task?.status ?? "todo"}`}>{statusLabel[task?.status ?? "todo"]} · {task?.progress ?? 0}%</span>
              <strong>{task?.title ?? "削除されたタスク"}</strong>
              <small>{dueLabel(task?.due_at ?? null)}{conflict ? " · 予定が重複しています" : ""}</small>
              <span className="timeline-delete" role="button" aria-label="予定を削除" onClick={(event) => { event.stopPropagation(); act(deleteSchedule(schedule.id)); }}>×</span>
            </button>;
          })}
          {showNow && <div className="timeline-now" style={{ top: nowOffset / 60 * HOUR_HEIGHT }} aria-label={`現在時刻 ${nowValue}`}><time>{nowValue}</time><span /></div>}
          {dropPreview && <div
            className="timeline-drop-preview"
            style={{ top: dropPreview.offset / 60 * HOUR_HEIGHT, height: Math.max(32, Math.min(dropPreview.duration, (END_HOUR - START_HOUR) * 60 - dropPreview.offset) / 60 * HOUR_HEIGHT) }}
            aria-hidden="true"
          >
            <span className="drop-preview-time">{valueFromMinutes(dropPreview.offset)}</span>
            <strong>{dropPreview.title}</strong>
            <small>{valueFromMinutes(dropPreview.offset)}–{valueFromMinutes(dropPreview.offset + Math.min(dropPreview.duration, (END_HOUR - START_HOUR) * 60 - dropPreview.offset))}</small>
          </div>}
          {!schedules.length && <div className="timeline-empty"><span>＋</span><strong>タスクをここにドロップ</strong><small>{START_HOUR}:00〜{END_HOUR}:00の間に予定を配置できます</small></div>}
        </div>
      </div>
    </section>
  </div>{message&&<div className="schedule-toast" role="status"><span aria-hidden="true">✓</span><p>{message}</p><button type="button" aria-label="通知を閉じる" onClick={()=>setMessage("")}>×</button></div>}{errorMessage&&<div className="schedule-error-backdrop" role="presentation" onClick={()=>setErrorMessage("")}><div className="schedule-error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="schedule-error-title" onClick={(event)=>event.stopPropagation()}><span aria-hidden="true">!</span><h2 id="schedule-error-title">予定時間が必要です</h2><p>{errorMessage}</p><button autoFocus onClick={()=>setErrorMessage("")}>閉じる</button></div></div>}</>;
}
