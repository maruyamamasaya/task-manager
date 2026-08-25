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
export interface TaskSchedule { id:string;task_id:string;user_id:string;start_at:string;end_at:string;created_at:string; }
export interface WorkLog { id:string;task_id:string;user_id:string;started_at:string;ended_at:string|null;minutes:number|null;note:string|null;created_at:string; }
export interface ProgressLog { id:string;task_id:string;user_id:string;progress:number;note:string|null;created_at:string; }
export interface Reflection { id:string;task_id:string;user_id:string;result:string|null;good_points:string|null;problems:string|null;improvements:string|null;next_action:string|null;created_at:string;updated_at:string; }
