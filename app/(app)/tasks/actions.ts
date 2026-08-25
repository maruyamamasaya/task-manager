"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clampProgress, normalizeState } from "@/lib/tasks/tree";
import { parseMarkdown } from "@/lib/tasks/markdown";
import type { TaskPriority, TaskStatus } from "@/types/database";

async function context() { const db = await createClient(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error("認証が必要です。"); return { db, user }; }
const refresh = () => { revalidatePath("/tasks"); revalidatePath("/today"); revalidatePath("/projects"); revalidatePath("/reflections"); };
export type TaskInput = { title: string; description?: string | null; project_id?: string | null; parent_id?: string | null; priority?: TaskPriority; estimated_minutes?: number | null; due_at?: string | null; status?: TaskStatus; progress?: number };

export async function createTask(input: TaskInput) {
  const title = input.title.trim(); if (!title) return { error: "タイトルを入力してください。" };
  const { db, user } = await context(); const state = normalizeState(input.status ?? "todo", input.progress ?? 0);
  const { error } = await db.from("tasks").insert({ ...input, title, project_id: input.project_id || null, parent_id: input.parent_id || null, due_at: input.due_at || null, estimated_minutes: input.estimated_minutes ?? null, user_id: user.id, ...state });
  if (error) return { error: error.message }; refresh(); return { ok: true };
}
export async function createTasks(inputs: TaskInput[]) {
  const tasks = inputs.map(input => ({ ...input, title: input.title.trim() })).filter(input => input.title);
  if (!tasks.length) return { error: "タスク名を入力してください。" };
  const { db, user } = await context();
  const rows = tasks.map(input => ({
    ...input,
    project_id: input.project_id || null,
    parent_id: input.parent_id || null,
    due_at: input.due_at || null,
    estimated_minutes: input.estimated_minutes ?? null,
    user_id: user.id,
    ...normalizeState(input.status ?? "todo", input.progress ?? 0),
  }));
  const { error } = await db.from("tasks").insert(rows);
  if (error) return { error: error.message };
  refresh();
  return { ok: true, count: rows.length };
}
export async function updateTask(id: string, input: TaskInput) {
  const { db } = await context(); const state = normalizeState(input.status ?? "todo", clampProgress(input.progress ?? 0));
  const { error } = await db.from("tasks").update({ title: input.title.trim(), description: input.description || null, project_id: input.project_id || null, priority: input.priority, estimated_minutes: input.estimated_minutes ?? null, due_at: input.due_at || null, ...state, completed_at: state.status === "done" ? new Date().toISOString() : null }).eq("id", id);
  if (error) return { error: error.message }; refresh(); return { ok: true };
}
export async function toggleTask(id: string, done: boolean) { const { db } = await context(); const { error } = await db.rpc("set_task_completion", { target_id: id, is_done: done }); if (error) return { error: error.message }; refresh(); return { ok: true }; }
export async function saveProgress(id:string, progress:number, note:string) { const {db}=await context(); const {error}=await db.rpc("update_task_progress",{target_id:id,next_progress:clampProgress(progress),progress_note:note}); if(error)return{error:error.message};refresh();return{ok:true}; }
export async function deleteTask(id: string) { const { db } = await context(); const { error } = await db.from("tasks").delete().eq("id", id); if (error) return { error: error.message }; refresh(); return { ok: true }; }
export async function importTasks(markdown: string, projectId?: string) {
  const parsed = parseMarkdown(markdown); if (!parsed.length) return { error: "読み込めるチェックリストがありません。" };
  const { db, user } = await context(); const ids: string[] = [];
  for (const [index, task] of parsed.entries()) { const { data, error } = await db.from("tasks").insert({ user_id: user.id, title: task.title, parent_id: task.parentIndex === null ? null : ids[task.parentIndex], project_id: projectId || null, status: task.done ? "done" : "todo", progress: task.done ? 100 : 0, estimated_minutes: task.estimatedMinutes, completed_at: task.done ? new Date().toISOString() : null, sort_order: index }).select("id").single(); if (error) return { error: `${index + 1}行目: ${error.message}` }; ids.push(data.id); if (task.actualMinutes !== null) { const now = new Date().toISOString(); const { error: logError } = await db.from("work_logs").insert({ user_id:user.id, task_id:data.id, started_at:now, ended_at:now, minutes:task.actualMinutes, note:"Markdown Import" }); if (logError) return { error: `${index + 1}行目の実績: ${logError.message}` }; } }
  refresh(); return { ok: true, count: ids.length };
}
