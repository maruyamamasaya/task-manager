"use client";

import Link from "next/link";
import { useState } from "react";
import { reflectionReportMarkdown } from "@/lib/tasks/reflection-report";
import type { Reflection, Task } from "@/types/database";

export function ReflectionCard({ task, reflection, projectName, metrics, initiallyOpen = false }: { task: Task; reflection: Reflection; projectName: string; metrics: { planned: number; actual: number; difference: number }; initiallyOpen?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(initiallyOpen);
  const copy = async () => { await navigator.clipboard.writeText(reflectionReportMarkdown(task, reflection, projectName, metrics)); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <article className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
    <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><span className="text-xs font-bold text-indigo-600">REPORT</span><h2 className="mt-1 font-bold">{task.title}</h2><p className="text-sm text-slate-400">Project: {projectName} ／ 完了: {task.completed_at ? new Date(task.completed_at).toLocaleDateString("ja-JP") : "—"}</p></div><button type="button" aria-expanded={open} aria-controls={`reflection-${reflection.id}`} onClick={() => setOpen(value => !value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">{open ? "詳細を閉じる" : "詳細を開く"}</button><button onClick={copy} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">{copied ? "コピーしました" : "Markdownでコピー"}</button></div>
    {open && <div id={`reflection-${reflection.id}`} className="mt-4 rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap gap-4 text-sm font-medium"><span>予定 {metrics.planned}分</span><span>実績 {metrics.actual}分</span><span>差分 {metrics.difference >= 0 ? "+" : ""}{metrics.difference}分</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><ReportSection label="結果" text={reflection.result}/><ReportSection label="学び・改善" text={reflection.improvements}/><ReportSection label="良かった点" text={reflection.good_points}/><ReportSection label="課題" text={reflection.problems}/><div className="sm:col-span-2"><ReportSection label="次のアクション" text={reflection.next_action}/></div></div><div className="mt-4 flex items-center justify-between"><Link href={`/reflections?reflection=${reflection.id}`} className="text-xs font-semibold text-indigo-600">この振り返りだけを表示 →</Link><button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500">詳細を閉じる</button></div></div>}
  </article>;
}

function ReportSection({ label, text }: { label: string; text: string | null }) { return <div><small className="font-bold text-slate-400">{label}</small><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{text || "—"}</p></div>; }
