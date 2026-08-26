"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createWbsCsv } from "@/lib/wbs/csv";
import { flattenWbs } from "@/lib/wbs/hierarchy";
import { canEditWbs, roleLabel } from "@/lib/wbs/permissions";
import type { WbsItem, WbsProject, WbsProjectRole } from "@/lib/wbs/types";
import { WbsItemEditor } from "./wbs-item-editor";
import { deleteWbsItem, deleteWbsProject } from "@/app/(app)/wbs/actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const labels = { not_started: "未着手", in_progress: "進行中", completed: "完了", on_hold: "保留" };
const statusStyle = { not_started: "bg-slate-100 text-slate-600", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700", on_hold: "bg-amber-100 text-amber-700" };
const projectStatusLabel = { active: "進行中", completed: "完了", archived: "アーカイブ" } as const;

function WbsProgress({ value, className = "" }: { value: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className={`flex items-center gap-2 ${className}`}><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><div className="h-full rounded-full bg-emerald-500" style={{ width: `${safe}%` }} /></div><span className="w-9 text-right text-xs font-bold text-emerald-700">{safe}%</span></div>;
}

function HierarchyChevron({ collapsed }: { collapsed: boolean }) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`size-4 transition-transform ${collapsed ? "-rotate-90" : ""}`} aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>;
}
export function WbsWorkspace({ project, initialItems, role }: { project: WbsProject; initialItems: WbsItem[]; role: WbsProjectRole }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [editor, setEditor] = useState<{ item: WbsItem | null; parent: string | null } | null>(null);
  const [tab, setTab] = useState<"wbs" | "share">("wbs");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => flattenWbs(initialItems), [initialItems]);
  const hidden = (item: WbsItem) => { let parent = item.parent_id; while (parent) { if (collapsed.has(parent)) return true; parent = initialItems.find((candidate) => candidate.id === parent)?.parent_id ?? null; } return false; };
  const visibleRows = rows.filter(({ item }) => !hidden(item) && (!query || item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) || item.owner_name?.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  const csv = () => { const blob = new Blob([createWbsCsv(initialItems)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${project.name}.csv`; anchor.click(); URL.revokeObjectURL(url); };
  return <div className="mt-4">
    <PageHeader title={project.name} description={`${roleLabel(role)} ・ ${projectStatusLabel[project.status]}`} action={role === "owner" ? <Button variant="secondary" onClick={() => setTab("share")}>共有</Button> : undefined} />
    <nav className="flex border-b border-slate-200" aria-label="WBS表示"><button onClick={() => setTab("wbs")} className={`min-h-11 border-b-2 px-4 text-sm font-medium ${tab === "wbs" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}>WBS</button><button disabled className="min-h-11 border-b-2 border-transparent px-4 text-sm font-medium text-slate-400">ガント（準備中）</button>{role === "owner" && <button onClick={() => setTab("share")} className={`min-h-11 border-b-2 px-4 text-sm font-medium ${tab === "share" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}>共有</button>}</nav>
    {tab === "wbs" ? <>
      <div className="flex flex-wrap items-center gap-2 py-4">{canEditWbs(role) && <Button onClick={() => setEditor({ item: null, parent: null })}>＋ 項目追加</Button>}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="項目を検索" aria-label="WBS項目を検索" className="min-h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500" /><div className="ml-auto"><Button variant="secondary" onClick={csv}>CSV</Button></div></div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[1050px] table-fixed text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="w-24 px-3 py-2.5">WBS</th><th className="w-64 px-3 py-2.5">タスク名</th><th className="w-28 px-3 py-2.5">担当</th><th className="w-28 px-3 py-2.5">開始</th><th className="w-28 px-3 py-2.5">終了</th><th className="w-24 px-3 py-2.5">状態</th><th className="w-32 px-3 py-2.5">進捗</th><th className="w-20 px-3 py-2.5">予定</th><th className="w-20 px-3 py-2.5">実績</th><th className="w-36 px-3 py-2.5"><span className="sr-only">操作</span></th></tr></thead><tbody>
        {visibleRows.map(({ item, depth, code, hasChildren }) => <tr key={item.id} className="group h-11 border-t border-slate-100 hover:bg-slate-50"><td className="px-3 font-mono text-xs font-medium text-slate-700">{hasChildren && <button aria-label={collapsed.has(item.id) ? "展開" : "折りたたむ"} onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} className="mr-1 inline-grid size-6 place-items-center rounded text-slate-500 hover:bg-slate-200"><HierarchyChevron collapsed={collapsed.has(item.id)} /></button>}{code}</td><td className={`truncate px-3 text-slate-900 ${hasChildren ? "font-semibold" : "font-medium"}`} style={{ paddingLeft: 12 + depth * 24 }}>{item.name}</td><td className="truncate px-3 text-xs text-slate-500">{item.owner_name || "—"}</td><td className="px-3 text-xs text-slate-500">{item.start_date || "—"}</td><td className="px-3 text-xs text-slate-500">{item.end_date || "—"}</td><td className="px-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[item.status]}`}>{labels[item.status]}</span></td><td className="px-3"><WbsProgress value={item.progress} /></td><td className="px-3 text-xs text-slate-500">{item.estimate_hours ?? "—"}</td><td className="px-3 text-xs text-slate-500">{item.actual_hours ?? "—"}</td><td className="px-3"><div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{canEditWbs(role) && <><button className="text-xs font-medium text-indigo-700" onClick={() => setEditor({ item, parent: item.parent_id })}>編集</button><button className="text-xs font-medium text-indigo-700" onClick={() => setEditor({ item: null, parent: item.id })}>＋子</button><button className="text-xs font-medium text-red-600" onClick={async () => { if (confirm("この項目と配下の子項目を削除しますか？")) { await deleteWbsItem(project.id, item.id); router.refresh(); } }}>削除</button></>}</div></td></tr>)}
      </tbody></table>{!visibleRows.length && <p className="p-10 text-center text-sm text-slate-500">{query ? "一致する項目がありません。" : "項目がありません。「項目追加」から始めてください。"}</p>}</div>
    </> : <ShareSettings project={project} onDelete={() => deleteWbsProject(project.id)} />}
    {editor && <WbsItemEditor projectId={project.id} item={editor.item} parentId={editor.parent} onClose={() => setEditor(null)} />}
  </div>;
}

function ShareSettings({ project, onDelete }: { project: WbsProject; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);
  return <div className="max-w-2xl py-6"><h2 className="text-base font-semibold text-slate-950">共有設定</h2><div className="mt-5 space-y-5"><div><label className="text-sm font-medium text-slate-700">共有コード</label><div className="mt-1.5 flex gap-2"><code className="flex min-h-10 flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">{project.share_code}</code><Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(project.share_code); setCopied(true); }}>{copied ? "コピー済み" : "コピー"}</Button></div></div><div className="border-t border-slate-200 pt-5"><p className="text-sm font-medium text-slate-700">参加方式</p><p className="mt-1 text-sm text-slate-500">{project.join_mode === "approval" ? "承認制" : project.join_mode}</p></div><div className="border-t border-slate-200 pt-5"><h3 className="text-sm font-semibold text-slate-900">危険な操作</h3><p className="mt-1 text-sm text-slate-500">プロジェクトと、その配下のWBS項目を削除します。</p><Button variant="danger" className="mt-3" onClick={() => { if (confirm(`「${project.name}」と、その配下のWBS項目を削除します。この操作は元に戻せません。`)) onDelete(); }}>WBSを削除</Button></div></div></div>;
}
