export type WbsProjectRole = "owner" | "editor" | "viewer";
export type WbsItemStatus = "not_started" | "in_progress" | "completed" | "on_hold";
export type WbsJoinMode = "disabled" | "approval" | "viewer" | "editor";
export interface WbsProject { id:string; owner_user_id:string; name:string; description:string|null; status:"active"|"completed"|"archived"; share_code:string; join_mode:WbsJoinMode; created_at:string; updated_at:string; }
export interface WbsItem { id:string; project_id:string; parent_id:string|null; wbs_code:string|null; name:string; description:string|null; start_date:string|null; end_date:string|null; owner_name:string|null; status:WbsItemStatus; progress:number; estimate_hours:number|null; actual_hours:number|null; sort_order:number; note:string|null; created_by:string|null; created_at:string; updated_at:string; }
export interface WbsProjectSummary extends WbsProject { role:WbsProjectRole; itemCount:number; progress:number; overdueCount:number; inProgressCount:number; onHoldCount:number; startDate:string|null; endDate:string|null; estimateHours:number; actualHours:number; }
