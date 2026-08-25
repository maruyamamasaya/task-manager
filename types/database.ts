export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string; user_id: string; project_id: string | null; parent_id: string | null;
  title: string; description: string | null; status: TaskStatus; progress: number;
  priority: TaskPriority; estimated_minutes: number | null; due_at: string | null;
  sort_order: number; completed_at: string | null; created_at: string; updated_at: string;
}

export interface Project {
  id: string; user_id: string; name: string; description: string | null; color: string | null;
  archived: boolean; created_at: string; updated_at: string;
}
