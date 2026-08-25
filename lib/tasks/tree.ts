import type { Task, TaskStatus } from "@/types/database";

export type TaskNode = Task & { children: TaskNode[]; depth: number };

export function clampProgress(value: number) { return Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0))); }

export function normalizeState(status: TaskStatus, progress: number): { status: TaskStatus; progress: number } {
  const safe = clampProgress(progress);
  if (status === "done" || safe === 100) return { status: "done", progress: 100 };
  return { status: safe > 0 && status === "todo" ? "doing" : status, progress: safe };
}

export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const nodes = new Map(tasks.map(task => [task.id, { ...task, children: [], depth: 0 } as TaskNode]));
  const roots: TaskNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent && parent.id !== node.id) { node.depth = parent.depth + 1; parent.children.push(node); } else roots.push(node);
  }
  const sort = (items: TaskNode[], depth = 0) => items.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)).forEach(item => { item.depth = depth; sort(item.children, depth + 1); });
  sort(roots); return roots;
}

export function descendantCount(tasks: Task[], id: string) {
  const children = new Map<string, string[]>();
  tasks.forEach(t => { if (t.parent_id) children.set(t.parent_id, [...(children.get(t.parent_id) ?? []), t.id]); });
  let count = 0; const visit = (parent: string) => (children.get(parent) ?? []).forEach(child => { count++; visit(child); });
  visit(id); return count;
}

export function taskCheckState(node: TaskNode): "checked" | "unchecked" | "indeterminate" {
  if (!node.children.length) return node.status === "done" ? "checked" : "unchecked";
  const states = node.children.map(taskCheckState);
  if (states.every(s => s === "checked")) return "checked";
  if (states.every(s => s === "unchecked") && node.status !== "done") return "unchecked";
  return "indeterminate";
}
