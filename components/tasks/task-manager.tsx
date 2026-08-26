"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createTask,
  createTasks,
  deleteTask,
  importTasks,
  updateTask,
  updateTaskOrder,
  type TaskInput,
} from "@/app/(app)/tasks/actions";
import {
  buildTaskTree,
  filterTaskHierarchy,
  type TaskNode,
} from "@/lib/tasks/tree";
import { parseMarkdown, toMarkdown } from "@/lib/tasks/markdown";
import type {
  Project,
  Task,
  TaskSchedule,
  TaskStatus,
  WorkLog,
  Reflection,
} from "@/types/database";
import { PlanActualPanel } from "./plan-actual-panel";
import { totalWorkMinutes } from "@/lib/time/phase3";
import { ProgressReflectionPanel } from "./progress-reflection-panel";
import { DatabaseUpdating } from "@/components/ui/database-updating";
import { addWorkLog } from "@/app/(app)/phase3-actions";
import { Pagination } from "@/components/ui/pagination";

const TASKS_PER_PAGE = 40;
const FILTER_STORAGE_KEY = "taskflow:tasks-view";

const statusLabel = { todo: "未着手", doing: "進行中", done: "完了" };
const priorityLabel = { low: "低", medium: "中", high: "高" };
const priorityClass = {
  low: "border-sky-200 bg-sky-50 text-sky-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 outline-none";
function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TaskManager({
  initialTasks,
  projects,
  schedules,
  workLogs,
  reflections,
  initialTaskId,
}: {
  initialTasks: Task[];
  projects: Project[];
  schedules: TaskSchedule[];
  workLogs: WorkLog[];
  reflections: Reflection[];
  initialTaskId?: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<"open" | "all" | TaskStatus>("open");
  const [dateFilter, setDateFilter] = useState("all");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Task | null>(
    initialTasks.find((t) => t.id === initialTaskId) ?? null,
  );
  const [quick, setQuick] = useState("");
  const [notice, setNotice] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    edge: "before" | "after";
  } | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) ?? "null");
      if (!saved) return;
      if (["open", "all", "todo", "doing", "done"].includes(saved.filter)) setFilter(saved.filter);
      if (["all", "today", "overdue", "no-due"].includes(saved.dateFilter)) setDateFilter(saved.dateFilter);
      if (typeof saved.project === "string") setProject(saved.project);
      if (["", "low", "medium", "high"].includes(saved.priority)) setPriority(saved.priority);
      if (["created", "manual", "title", "due", "priority"].includes(saved.sort)) setSort(saved.sort);
      if (["asc", "desc"].includes(saved.sortDirection)) setSortDirection(saved.sortDirection);
    } catch { localStorage.removeItem(FILTER_STORAGE_KEY); }
  }, []);
  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ filter, dateFilter, project, priority, sort, sortDirection }));
  }, [filter, dateFilter, project, priority, sort, sortDirection]);
  const today = localDate(new Date().toISOString());
  const shown = useMemo(
    () =>
      filterTaskHierarchy(tasks, (t) => {
          const due = localDate(t.due_at);
          const matchesDate =
            dateFilter === "all" ||
            (dateFilter === "today" && due === today) ||
            (dateFilter === "overdue" &&
              !!due &&
              due < today &&
              t.status !== "done") ||
            (dateFilter === "no-due" && !due);
          return (
            (filter === "all" ||
              (filter === "open"
                ? t.status !== "done"
                : t.status === filter)) &&
            matchesDate &&
            (!project || t.project_id === project) &&
            (!priority || t.priority === priority)
          );
        })
        .sort((a, b) => {
          const result = sort === "title"
            ? a.title.localeCompare(b.title, "ja")
            : sort === "due"
            ? (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999")
            : sort === "priority"
              ? { high: 0, medium: 1, low: 2 }[a.priority] -
                { high: 0, medium: 1, low: 2 }[b.priority]
              : sort === "manual"
                ? a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
                : a.created_at.localeCompare(b.created_at);
          return sortDirection === "asc" ? result : -result;
        }),
    [tasks, filter, dateFilter, project, priority, sort, sortDirection, today],
  );
  const totalPages = Math.max(1, Math.ceil(shown.length / TASKS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedTasks = useMemo(() => shown.slice((currentPage - 1) * TASKS_PER_PAGE, currentPage * TASKS_PER_PAGE), [shown, currentPage]);
  const tree = useMemo(() => buildTaskTree(pagedTasks), [pagedTasks]);
  const folderTaskIds = useMemo(
    () => new Set(tasks.flatMap((task) => task.parent_id ? [task.parent_id] : [])),
    [tasks],
  );
  const scheduledTaskIds = useMemo(
    () => new Set(schedules.map((schedule) => schedule.task_id)),
    [schedules],
  );
  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (task.parent_id) counts.set(task.parent_id, (counts.get(task.parent_id) ?? 0) + 1);
    }
    return counts;
  }, [tasks]);
  const runningTaskIds = useMemo(
    () =>
      new Set(
        workLogs.filter((log) => !log.ended_at).map((log) => log.task_id),
      ),
    [workLogs],
  );
  const run = (
    action: Promise<{ error?: string; ok?: boolean }>,
    optimistic?: () => void,
  ) =>
    startTransition(async () => {
      const previous = tasks;
      optimistic?.();
      const result = await action;
      if (result.error) {
        setTasks(previous);
        setNotice(`エラー: ${result.error}`);
      } else {
        setNotice("保存しました");
        location.reload();
      }
    });
  const add = (parent_id: string | null = null) => {
    const title = prompt(parent_id ? "子タスクのタイトル" : "タスクのタイトル");
    if (title)
      run(createTask({ title, parent_id, project_id: project || null }));
  };
  const exportText = async () => {
    const text = toMarkdown(tree);
    await navigator.clipboard.writeText(text);
    setNotice(
      `${tree.length ? "表示中のタスクを" : "空の内容を"}コピーしました`,
    );
  };
  const submitQuick = () => {
    const titles = quick
      .split(/\r?\n/)
      .map((title) => title.trim())
      .filter(Boolean);
    if (!titles.length) return;
    run(
      createTasks(
        titles.map((title) => ({ title, project_id: project || null })),
      ),
    );
  };
  const moveTask = (draggedId: string, targetId: string, edge: "before" | "after") => {
    if (draggedId === targetId) return;
    const dragged = tasks.find((task) => task.id === draggedId);
    const target = tasks.find((task) => task.id === targetId);
    if (!dragged || !target || dragged.parent_id !== target.parent_id) {
      setNotice("同じ階層のタスク同士で並び替えてください");
      return;
    }
    const siblings = tasks
      .filter((task) => task.parent_id === dragged.parent_id)
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.created_at.localeCompare(b.created_at),
      );
    const reordered = siblings.filter((task) => task.id !== draggedId);
    const targetIndex = reordered.findIndex((task) => task.id === targetId);
    reordered.splice(targetIndex + (edge === "after" ? 1 : 0), 0, dragged);
    const order = new Map(reordered.map((task, index) => [task.id, index]));
    setSort("manual");
    run(updateTaskOrder(reordered.map((task) => task.id)), () =>
      setTasks((current) =>
        current.map((task) =>
          order.has(task.id)
            ? { ...task, sort_order: order.get(task.id)! }
            : task,
        ),
      ),
    );
  };
  return (
    <div className="space-y-4">
      <DatabaseUpdating active={pending} />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={(e) => e.preventDefault()}>
          <label
            htmlFor="quick-task"
            className="text-sm font-semibold text-slate-700"
          >
            タスクの名前を入力する
          </label>
          <textarea
            id="quick-task"
            rows={1}
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                e.shiftKey &&
                !e.nativeEvent.isComposing &&
                !pending
              ) {
                e.preventDefault();
                submitQuick();
              }
            }}
            className={`${inputClass} mt-2 min-h-10 resize-y`}
            placeholder="例：企画書を作成する"
            aria-describedby="quick-task-help"
          />
          <p id="quick-task-help" className="mt-2 text-xs text-slate-500">
            <b>Enter</b> で改行します。<b>Shift + Enter</b>{" "}
            で追加すると、1行につき1件のタスクをまとめて登録できます。
          </p>
        </form>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setToolsOpen((open) => !open)}
              aria-expanded={toolsOpen}
              aria-controls="task-tools"
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-700"
            >
              <span aria-hidden="true">{toolsOpen ? "▾" : "▸"}</span>
              絞り込み・並び替え・入出力
            </button>
            {(filter !== "open" ||
              dateFilter !== "all" ||
              project ||
              priority) && (
              <button
                type="button"
                onClick={() => {
                  setFilter("open");
                  setDateFilter("all");
                  setProject("");
                  setPriority("");
                  setPage(1);
                }}
                className="text-xs font-semibold text-indigo-600"
              >
                フィルターをクリア
              </button>
            )}
          </div>
          {toolsOpen && (
            <div id="task-tools" className="mt-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <select
              aria-label="ステータスで絞り込み"
              value={filter}
              onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(1); }}
              className={inputClass}
            >
              <option value="open">状態：未完了</option>
              <option value="all">状態：すべて</option>
              <option value="todo">状態：未着手</option>
              <option value="doing">状態：進行中</option>
              <option value="done">状態：完了</option>
            </select>
            <select
              aria-label="期限で絞り込み"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="all">期限：すべて</option>
              <option value="today">期限：本日</option>
              <option value="overdue">期限：期限切れ</option>
              <option value="no-due">期限：設定なし</option>
            </select>
            <select
              value={project}
              onChange={(e) => { setProject(e.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="">全プロジェクト</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="">全優先度</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            <select
              aria-label="並び替え"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="created">並び順：作成順</option>
              <option value="manual">並び順：自由</option>
              <option value="title">並び順：タイトル順</option>
              <option value="due">並び順：期限順</option>
              <option value="priority">並び順：優先度順</option>
            </select>
            <select aria-label="昇順または降順" value={sortDirection} onChange={(e) => { setSortDirection(e.target.value as "asc" | "desc"); setPage(1); }} className={inputClass}>
              <option value="asc">順序：昇順</option>
              <option value="desc">順序：降順</option>
            </select>
              </div>
              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              onClick={() => setImportOpen(true)}
              type="button"
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              Import
            </button>
            <button
              onClick={exportText}
              type="button"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Export
            </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {runningTaskIds.size > 0 && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-bold text-indigo-700">● 作業開始中</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tasks
              .filter((task) => runningTaskIds.has(task.id))
              .map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelected(task)}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {task.title}
                </button>
              ))}
          </div>
        </section>
      )}
      {notice && (
        <div
          role="status"
          className={`rounded-lg px-4 py-2 text-sm ${notice.startsWith("エラー") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {notice}
          <button onClick={() => setNotice("")} className="float-right">
            ×
          </button>
        </div>
      )}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {tree.length ? (
          <div>
            {tree.map((n) => (
              <TaskRow
                key={n.id}
                node={n}
                folderTaskIds={folderTaskIds}
                scheduledTaskIds={scheduledTaskIds}
                childCounts={childCounts}
                workLogs={workLogs}
                runningTaskIds={runningTaskIds}
                actual={totalWorkMinutes(
                  workLogs.filter((l) => l.task_id === n.id),
                )}
                projects={projects}
                onSelect={setSelected}
                onStatusChange={(node, status) =>
                  run(updateTask(node.id, { ...node, status }), () =>
                    setTasks((current) =>
                      current.map((t) =>
                        t.id === node.id
                          ? { ...t, status }
                          : t,
                      ),
                    ),
                  )
                }
                onPriorityChange={(node, priority) =>
                  run(updateTask(node.id, { ...node, priority }), () =>
                    setTasks((current) =>
                      current.map((task) =>
                        task.id === node.id ? { ...task, priority } : task,
                      ),
                    ),
                  )
                }
                draggedTaskId={draggedTaskId}
                dropTarget={dropTarget}
                onDragStart={setDraggedTaskId}
                onDragTarget={setDropTarget}
                onDrop={(targetId, edge) => {
                  if (draggedTaskId) moveTask(draggedTaskId, targetId, edge);
                  setDraggedTaskId(null);
                  setDropTarget(null);
                }}
                onAdd={add}
                onDueChange={(node, due_at) =>
                  run(updateTask(node.id, { ...node, due_at }))
                }
                onDelete={(node) => run(deleteTask(node.id))}
              />
            ))}
            <Pagination page={currentPage} totalItems={shown.length} pageSize={TASKS_PER_PAGE} onPageChange={setPage} />
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <p className="font-semibold">タスクがありません</p>
              <p className="mt-2 text-sm text-slate-500">
                最初のタスクを追加しましょう。
              </p>
              <button
                onClick={() => add()}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
              >
                ＋ タスクを追加
              </button>
            </div>
          </div>
        )}
      </section>
      {selected && (
        <TaskDrawer
          isFolder={tasks.some((t) => t.parent_id === selected.id)}
          task={selected}
          projects={projects}
          schedules={schedules.filter((s) => s.task_id === selected.id)}
          logs={workLogs.filter((l) => l.task_id === selected.id)}
          onClose={() => setSelected(null)}
          onSave={(input, actualMinutes) =>
            run(
              Promise.all([
                updateTask(selected.id, input),
                ...actualMinutes.map((minutes) => addWorkLog(selected.id, minutes)),
              ]).then((results) =>
                results.find((result) => result.error) ?? { ok: true },
              ),
            )
          }
          reflection={
            reflections.find((r) => r.task_id === selected.id) ?? null
          }
        />
      )}
      {importOpen && (
        <ImportDialog
          markdown={markdown}
          setMarkdown={setMarkdown}
          onClose={() => setImportOpen(false)}
          onImport={() => run(importTasks(markdown, project || undefined))}
        />
      )}
    </div>
  );
}

function TaskRow({
  node,
  folderTaskIds,
  scheduledTaskIds,
  childCounts,
  projects,
  actual,
  workLogs,
  runningTaskIds,
  onSelect,
  onStatusChange,
  onPriorityChange,
  draggedTaskId,
  dropTarget,
  onDragStart,
  onDragTarget,
  onDrop,
  onAdd,
  onDueChange,
  onDelete,
}: {
  node: TaskNode;
  folderTaskIds: Set<string>;
  scheduledTaskIds: Set<string>;
  childCounts: Map<string, number>;
  projects: Project[];
  actual: number;
  workLogs: WorkLog[];
  runningTaskIds: Set<string>;
  onSelect: (t: Task) => void;
  onStatusChange: (t: TaskNode, status: TaskStatus) => void;
  onPriorityChange: (t: TaskNode, priority: Task["priority"]) => void;
  draggedTaskId: string | null;
  dropTarget: { id: string; edge: "before" | "after" } | null;
  onDragStart: (id: string | null) => void;
  onDragTarget: (target: { id: string; edge: "before" | "after" } | null) => void;
  onDrop: (id: string, edge: "before" | "after") => void;
  onAdd: (id: string) => void;
  onDueChange: (t: TaskNode, dueAt: string | null) => void;
  onDelete: (t: TaskNode) => void;
}) {
  const isFolder = folderTaskIds.has(node.id);
  const isScheduled = scheduledTaskIds.has(node.id);
  const statusClass = {
    todo: "bg-slate-100 text-slate-600",
    doing: "bg-amber-100 text-amber-700",
    done: "bg-emerald-100 text-emerald-700",
  }[node.status];
  return (
    <>
      <article
        draggable
        onDragStart={() => onDragStart(node.id)}
        onDragEnd={() => { onDragStart(null); onDragTarget(null); }}
        onDragOver={(event) => {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          onDragTarget({ id: node.id, edge: event.clientY < rect.top + rect.height / 2 ? "before" : "after" });
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDragTarget(null);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          onDrop(node.id, event.clientY < rect.top + rect.height / 2 ? "before" : "after");
        }}
        className={`task-sort-row group relative border-b border-slate-100 px-3 py-3 hover:bg-slate-50 ${node.status === "done" ? "opacity-60" : ""} ${draggedTaskId === node.id ? "bg-indigo-50 opacity-50" : ""} ${dropTarget?.id === node.id && draggedTaskId !== node.id ? `is-drop-${dropTarget.edge}` : ""}`}
        style={{ paddingLeft: `${12 + node.depth * 24}px` }}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 cursor-grab text-lg text-slate-400" aria-label={isFolder ? "フォルダ。ドラッグして並び替え" : "ドラッグして並び替え"}>
            {isFolder ? "📁" : "⠿"}
          </span>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => onSelect(node)}
              className="block w-full min-w-0 text-left"
            >
              <span
                className={`block truncate text-sm font-medium ${node.status === "done" ? "line-through" : ""}`}
                title={node.title}
              >
                {node.title}
              </span>
            </button>
            {isFolder ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-bold text-indigo-700">
                  フォルダ
                </span>
                <span>{childCounts.get(node.id) ?? 0}件の子タスク</span>
              </div>
            ) : (
              <>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <select
                    value={node.status}
                    onChange={(event) => onStatusChange(node, event.target.value as TaskStatus)}
                    aria-label={`${node.title}のステータスを変更`}
                    className={`cursor-pointer rounded-full border-0 py-1 pl-2.5 pr-2 font-bold ${statusClass}`}
                  >
                    {(Object.keys(statusLabel) as TaskStatus[]).map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
                  </select>
                  {runningTaskIds.has(node.id) && (
                    <span className="font-bold text-indigo-600">● 作業中</span>
                  )}
                  <select
                    value={node.priority}
                    onChange={(event) => onPriorityChange(node, event.target.value as Task["priority"])}
                    aria-label={`${node.title}の優先度を変更`}
                    className={`cursor-pointer rounded-full border py-1 pl-2.5 pr-2 font-bold ${priorityClass[node.priority]}`}
                  >
                    {(Object.keys(priorityLabel) as Task["priority"][]).map((value) => <option key={value} value={value}>優先度 {priorityLabel[value]}</option>)}
                  </select>
                  {node.project_id && (
                    <span className="max-w-36 truncate">
                      {projects.find((p) => p.id === node.project_id)?.name}
                    </span>
                  )}
                  <label className="flex items-center gap-1.5">
                    期限
                    <input
                      aria-label={`${node.title}の期限`}
                      type="date"
                      value={localDate(node.due_at)}
                      onChange={(e) =>
                        onDueChange(
                          node,
                          e.target.value
                            ? new Date(
                                `${e.target.value}T23:59:59`,
                              ).toISOString()
                            : null,
                        )
                      }
                      className="min-h-8 min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-label={`${node.title}の進捗`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={node.progress}
                  >
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${node.progress}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs font-bold text-emerald-700">
                    {node.progress}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  予定 {node.estimated_minutes ?? 0}分 / 実績 {actual}分
                </p>
              </>
            )}{" "}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <button
              onClick={() => onSelect(node)}
              title="編集"
              className="rounded p-1.5 text-slate-400 hover:bg-slate-200"
            >
              ✎
            </button>
            {node.depth < 2 && (
              <button
                onClick={() => onAdd(node.id)}
                disabled={isScheduled}
                title={isScheduled ? "スケジュールに配置済みのため、子タスクを追加できません" : "子タスクを追加"}
                aria-label={`${node.title}に子タスクを追加`}
                className="grid h-8 w-8 place-items-center rounded border border-indigo-100 bg-indigo-50 text-lg font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <span aria-hidden="true">↳＋</span>
              </button>
            )}
            <button
              onClick={() => onDelete(node)}
              title="削除"
              aria-label={`${node.title}を削除`}
              className="rounded bg-red-50 px-2 py-1 text-lg font-bold leading-none text-red-600 hover:bg-red-100 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      </article>
      {node.children.map((c) => (
        <TaskRow
          key={c.id}
          node={c}
          folderTaskIds={folderTaskIds}
          scheduledTaskIds={scheduledTaskIds}
          childCounts={childCounts}
          workLogs={workLogs}
          runningTaskIds={runningTaskIds}
          actual={totalWorkMinutes(workLogs.filter((l) => l.task_id === c.id))}
          projects={projects}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          draggedTaskId={draggedTaskId}
          dropTarget={dropTarget}
          onDragStart={onDragStart}
          onDragTarget={onDragTarget}
          onDrop={onDrop}
          onAdd={onAdd}
          onDueChange={onDueChange}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

function TaskDrawer({
  task,
  isFolder,
  projects,
  schedules,
  logs,
  reflection,
  onClose,
  onSave,
}: {
  task: Task;
  isFolder: boolean;
  projects: Project[];
  schedules: TaskSchedule[];
  logs: WorkLog[];
  reflection: Reflection | null;
  onClose: () => void;
  onSave: (
    i: TaskInput,
    actualMinutes: number[],
  ) => void;
}) {
  const [form, setForm] = useState({ ...task, due_at: localDate(task.due_at) });
  const [actualMinutes, setActualMinutes] = useState<number[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const initialForm = useMemo(() => ({ ...task, due_at: localDate(task.due_at) }), [task]);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm) || actualMinutes.length > 0;
  const requestClose = () => isDirty ? setConfirmClose(true) : onClose();
  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);
  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4"
      onMouseDown={requestClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="task-detail-title" className="text-xl font-bold">
            {isFolder ? "フォルダ詳細" : "タスク詳細"}
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={requestClose}
            className="text-2xl text-slate-400"
          >
            ×
          </button>
        </div>
        <form
          id="task-detail-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(
              {
                ...form,
                due_at: form.due_at
                  ? new Date(`${form.due_at}T23:59:59`).toISOString()
                  : null,
              },
              actualMinutes,
            );
            onClose();
          }}
          className="mt-6 space-y-4"
        >
          <Field label="タイトル">
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="説明">
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className={`${inputClass} min-h-24`}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project">
              <select
                value={form.project_id ?? ""}
                onChange={(e) => set("project_id", e.target.value || null)}
                className={inputClass}
              >
                <option value="">なし</option>
                {projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            {!isFolder && (
              <>
                <Field label="優先度">
                  <select
                    value={form.priority}
                    onChange={(e) => set("priority", e.target.value)}
                    className={inputClass}
                  >
                    {Object.entries(priorityLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ステータス">
                  <select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    className={inputClass}
                  >
                    {Object.entries(statusLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="予定時間 (分)">
                  <input
                    type="number"
                    min="0"
                    value={form.estimated_minutes ?? ""}
                    onChange={(e) =>
                      set(
                        "estimated_minutes",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className={inputClass}
                  />
                  <span className="mt-1 flex flex-wrap gap-1">
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => set("estimated_minutes", m)}
                        className="rounded border px-1.5 py-1 text-xs"
                      >
                        {m}分
                      </button>
                    ))}
                  </span>
                </Field>
                <div className="sm:col-span-2">
                  <ProgressReflectionPanel task={task} reflection={reflection} section="progress" />
                </div>
                <div className="sm:col-span-2">
                <Field label="期限">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                    <input type="date" value={form.due_at} onChange={(e) => set("due_at", e.target.value)} className={`${inputClass} font-semibold text-slate-700`} />
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {([['今日', 0], ['明日', 1], ['1週間後', 7]] as const).map(([label, days]) => <button key={label} type="button" onClick={() => { const date = new Date(); date.setDate(date.getDate() + days); set("due_at", localDate(date.toISOString())); }} className="rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-100">{label}</button>)}
                      <button type="button" onClick={() => set("due_at", "")} className="rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100">クリア</button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">日付欄のカレンダーアイコンから月表示で選択できます。</p>
                  </div>
                </Field>
                </div>
              </>
            )}
          </div>
          {!isFolder && <PlanActualPanel task={task} schedules={schedules} logs={logs} actualMinutes={actualMinutes} onActualMinutesChange={setActualMinutes} />}
          <button className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white">保存</button>
        </form>
        {!isFolder && (
          <>
            <ProgressReflectionPanel
              task={task}
              reflection={reflection}
              section="reflection"
            />
          </>
        )}
      </section>
      {confirmClose && <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => event.stopPropagation()}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-amber-100 text-xl font-bold text-amber-700">!</span>
          <h3 id="unsaved-title" className="mt-3 text-lg font-bold text-slate-900">変更が保存されていません</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">入力した内容を破棄してタスク詳細を閉じますか？</p>
          <div className="mt-5 flex gap-2"><button autoFocus type="button" onClick={() => setConfirmClose(false)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">編集を続ける</button><button type="button" onClick={onClose} className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">破棄して閉じる</button></div>
        </section>
      </div>}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-600">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
function ImportDialog({
  markdown,
  setMarkdown,
  onClose,
  onImport,
}: {
  markdown: string;
  setMarkdown: (v: string) => void;
  onClose: () => void;
  onImport: () => void;
}) {
  const preview = parseMarkdown(markdown);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
      <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Markdown Import</h2>
        <p className="mt-1 text-sm text-slate-500">
          2スペースのインデントで最大3階層、予・実の時間も読み込みます。
        </p>
        <textarea
          autoFocus
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          className={`${inputClass} mt-4 min-h-48 font-mono`}
          placeholder={
            "- [ ] テスト （予：40分 / 実：100分）\n- [ ] テスト２ （予：40分 / 実：60分）"
          }
        />
        <p className="mt-2 text-sm">
          プレビュー: {preview.length}件（完了{" "}
          {preview.filter((t) => t.done).length}件 / 予定{" "}
          {preview.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0)}分 / 実績{" "}
          {preview.reduce((n, t) => n + (t.actualMinutes ?? 0), 0)}分）
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            キャンセル
          </button>
          <button
            disabled={!preview.length}
            onClick={() => {
              onImport();
              onClose();
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            読み込む
          </button>
        </div>
      </section>
    </div>
  );
}
