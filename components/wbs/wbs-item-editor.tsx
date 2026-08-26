"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WbsItem } from "@/lib/wbs/types";
import { saveWbsItem } from "@/app/(app)/wbs/actions";
import { Button } from "@/components/ui/button";

const control = "mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500";
export function WbsItemEditor({ projectId, item, parentId, onClose }: { projectId: string; item: WbsItem | null; parentId: string | null; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <div className="fixed inset-0 z-50 bg-slate-950/40" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form action={async (form) => { setPending(true); setError(""); const result = await saveWbsItem(projectId, item?.id ?? null, parentId, form); setPending(false); if (result?.error) setError(result.error); else { onClose(); router.refresh(); } }} role="dialog" aria-modal="true" aria-labelledby="editor-title" className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="editor-title" className="text-lg font-semibold text-slate-950">{item ? "WBS項目を編集" : "WBS項目を追加"}</h2><p className="mt-1 text-xs text-slate-500">工程の内容と進捗を設定します。</p></div><button type="button" aria-label="閉じる" onClick={onClose} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">✕</button></header>
      <div className="flex-1 overflow-y-auto p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="タスク名" name="name" value={item?.name} required className="sm:col-span-2" /><Area label="説明" name="description" value={item?.description} className="sm:col-span-2" /><Field label="開始日" name="start_date" type="date" value={item?.start_date} /><Field label="終了日" name="end_date" type="date" value={item?.end_date} /><Field label="担当" name="owner_name" value={item?.owner_name} className="sm:col-span-2" />
        <label className="text-sm font-medium text-slate-700">状態<select name="status" defaultValue={item?.status ?? "not_started"} className={control}><option value="not_started">未着手</option><option value="in_progress">進行中</option><option value="completed">完了</option><option value="on_hold">保留</option></select></label>
        <Field label="進捗（%）" name="progress" type="number" value={item?.progress ?? 0} min="0" max="100" /><Field label="予定工数" name="estimate_hours" type="number" value={item?.estimate_hours} step="0.01" min="0" /><Field label="実績工数" name="actual_hours" type="number" value={item?.actual_hours} step="0.01" min="0" /><Area label="備考" name="note" value={item?.note} className="sm:col-span-2" /></div>{error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}</div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><Button type="button" variant="secondary" onClick={onClose}>キャンセル</Button><Button disabled={pending}>{pending ? "保存中…" : "保存"}</Button></footer>
    </form>
  </div>;
}
function Field({ label, value, className = "", ...props }: { label: string; name: string; value?: string | number | null; type?: string; required?: boolean; min?: string; max?: string; step?: string; className?: string }) { return <label className={`text-sm font-medium text-slate-700 ${className}`}>{label}{props.required && <span className="text-red-600"> *</span>}<input {...props} defaultValue={value ?? ""} className={control} /></label>; }
function Area({ label, name, value, className = "" }: { label: string; name: string; value?: string | null; className?: string }) { return <label className={`text-sm font-medium text-slate-700 ${className}`}>{label}<textarea name={name} defaultValue={value ?? ""} rows={3} className={control} /></label>; }
