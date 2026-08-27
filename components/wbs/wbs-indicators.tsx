import type { WbsItemStatus } from "@/lib/wbs/types";

export const wbsStatusLabel: Record<WbsItemStatus, string> = { not_started: "未着手", in_progress: "進行中", completed: "完了", on_hold: "保留" };
export const wbsStatusClass: Record<WbsItemStatus, string> = { not_started: "bg-slate-100 text-slate-600", in_progress: "bg-indigo-100 text-indigo-700", completed: "bg-emerald-100 text-emerald-700", on_hold: "bg-amber-100 text-amber-700" };

export function WbsStatus({ status }: { status: WbsItemStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${wbsStatusClass[status]}`}>{wbsStatusLabel[status]}</span>;
}

export function WbsProgress({ value, compact = false, className = "" }: { value: number; compact?: boolean; className?: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return <div className={`flex items-center gap-2 ${className}`}><div className={`${compact ? "h-1.5" : "h-2"} flex-1 overflow-hidden rounded-full bg-slate-200`} role="progressbar" aria-label={`進捗 ${safe}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><div className="h-full rounded-full bg-indigo-500" style={{ width: `${safe}%` }} /></div><span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-600">{safe}%</span></div>;
}
