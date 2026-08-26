"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { joinWbsProject } from "@/app/(app)/wbs/actions";
import type { WbsProjectSummary } from "@/lib/wbs/types";
import { roleLabel } from "@/lib/wbs/permissions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WbsProgress } from "./wbs-indicators";

const projectStatusLabel = { active: "進行中", completed: "完了", archived: "アーカイブ" } as const;
const projectStatusStyle = { active: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700", archived: "bg-slate-100 text-slate-600" } as const;

export function WbsProjectList({ projects }: { projects: WbsProjectSummary[] }) {
  const [filter, setFilter] = useState<"all" | "owner" | "shared">("all");
  const [joinOpen, setJoinOpen] = useState(false);
  const [state, action, pending] = useActionState(joinWbsProject, {} as { error?: string; ok?: string });
  const shown = projects.filter((project) => filter === "all" || (filter === "owner" ? project.role === "owner" : project.role !== "owner"));

  return <div>
    <div className="mb-5 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex border-b border-slate-200" role="tablist" aria-label="WBSの絞り込み">
        {([['all', 'すべて'], ['owner', '自分が作成'], ['shared', '共有されたWBS']] as const).map(([key, label]) =>
          <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`-mb-px min-h-10 border-b-2 px-3 text-sm font-medium transition-colors ${filter === key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>
        )}
      </div>
      <Button variant="secondary" onClick={() => setJoinOpen(true)}>プロジェクトに参加</Button>
    </div>

    {shown.length === 0 ? <EmptyState title="WBSはまだありません" description="作業を階層化して、プロジェクト全体の進捗を管理できます。" action={<div className="flex flex-col items-center gap-3"><Link href="/wbs/new" className="inline-flex min-h-9 items-center rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white hover:bg-indigo-700">新規WBS</Link><button className="text-sm font-medium text-slate-600 hover:text-indigo-700" onClick={() => setJoinOpen(true)}>共有プロジェクトに参加</button></div>} /> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((project) => <Link href={`/wbs/${project.id}`} key={project.id} className="group rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-300 hover:bg-slate-50/50 focus-visible:ring-2 focus-visible:ring-indigo-500">
          <h2 className="truncate text-base font-semibold text-slate-950 group-hover:text-indigo-700">{project.name}</h2>
          <div className="mt-5 flex items-center justify-between text-xs"><span className="font-medium text-slate-700">進捗</span><strong className="text-lg tabular-nums text-slate-900">{project.progress}%</strong></div>
          <WbsProgress value={project.progress} className="mt-2" />
          <div className="mt-4 flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${projectStatusStyle[project.status]}`}>{projectStatusLabel[project.status]}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{roleLabel(project.role)}</span></div>
          <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{project.itemCount}項目</span><time dateTime={project.updated_at}>更新 {new Date(project.updated_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}</time></div>
        </Link>)}
      </div>}

    {joinOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setJoinOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="join-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="join-title" className="text-lg font-semibold text-slate-950">プロジェクトに参加</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">共有されたプロジェクトコードを入力してください。</p>
        <form action={action} className="mt-5">
          <label className="text-sm font-medium text-slate-700">共有コード<input name="shareCode" placeholder="WBSP-____-____" autoFocus required className="mt-1.5 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm uppercase outline-none focus:border-indigo-500" /></label>
          {state.error && <p className="mt-2 text-sm text-red-600" role="alert">{state.error}</p>}{state.ok && <p className="mt-2 text-sm text-emerald-700" role="status">{state.ok}</p>}
          <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setJoinOpen(false)}>キャンセル</Button><Button disabled={pending}>{pending ? "処理中…" : "参加"}</Button></div>
        </form>
      </section>
    </div>}
  </div>;
}
