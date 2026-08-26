"use client";

import { useState, useTransition } from "react";
import { archiveProject, createProject, deleteProject, renameProject, setProjectColor } from "@/app/(app)/projects/actions";
import { projectProgress } from "@/lib/tasks/phase4";
import type { Project, Task } from "@/types/database";
import { DatabaseUpdating } from "@/components/ui/database-updating";
import { Pagination } from "@/components/ui/pagination";
import { Icon } from "@/components/ui/icon";

const colors = ["#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316", "#f43f5e", "#a855f7"];
const PROJECTS_PER_PAGE = 20;

export function ProjectList({ projects, tasks }: { projects: Project[]; tasks: Pick<Task, "project_id" | "progress" | "status">[] }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [pending, start] = useTransition();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(projects.length / PROJECTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleProjects = projects.slice((currentPage - 1) * PROJECTS_PER_PAGE, currentPage * PROJECTS_PER_PAGE);
  const run = (promise: Promise<{ error?: string }>) => start(async () => { const result = await promise; if (result.error) alert(result.error); else location.reload(); });

  return <div className="space-y-4">
    <DatabaseUpdating active={pending} />
    <form onSubmit={event => { event.preventDefault(); if (name.trim()) run(createProject(name, color)); }} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-2"><input value={name} onChange={event => setName(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2" placeholder="新しいプロジェクト名"/><button disabled={pending} className="rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white">作成</button></div>
      <ColorPicker value={color} onChange={setColor} label="プロジェクトの色" />
    </form>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">{projects.length ? <>{visibleProjects.map(project => {
      const progress = projectProgress(tasks.filter(task => task.project_id === project.id));
      const projectColor = project.color ?? colors[0];
      return <article key={project.id} className={`border-b p-4 last:border-0 ${project.archived ? "opacity-50" : ""}`}>
        <div className="flex flex-wrap items-center gap-3"><span className="grid size-9 place-items-center rounded-lg text-white" style={{ backgroundColor: projectColor }}><Icon name="projects" className="size-4"/></span><div className="min-w-48 flex-1"><p className="truncate font-medium">{project.name}</p><p className="text-xs text-slate-400">{project.archived ? "アーカイブ済み" : "利用中"} ／ 進捗 {progress.progress}% ／ {progress.done} / {progress.total} Tasks</p><div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full" style={{ width: `${progress.progress}%`, backgroundColor: projectColor }}/></div></div><button onClick={() => { const value = prompt("新しいプロジェクト名", project.name); if (value?.trim()) run(renameProject(project.id, value)); }} className="rounded-lg border px-3 py-1.5 text-sm">名前変更</button><button onClick={() => run(archiveProject(project.id, !project.archived))} className="rounded-lg border px-3 py-1.5 text-sm">{project.archived ? "復元" : "アーカイブ"}</button><button onClick={() => { if (confirm(`「${project.name}」を削除しますか？\nタスクは削除されず、プロジェクト未設定になります。`)) run(deleteProject(project.id)); }} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600">削除</button></div>
        <ColorPicker value={projectColor} onChange={next => run(setProjectColor(project.id, next))} label={`${project.name}の色`} />
      </article>;
    })}<Pagination page={currentPage} totalItems={projects.length} pageSize={PROJECTS_PER_PAGE} onPageChange={setPage} /></> : <div className="p-12 text-center"><p className="font-semibold">プロジェクトはまだありません</p><p className="mt-2 text-sm text-slate-500">上のフォームから最初のProjectを作成しましょう。</p></div>}</section>
  </div>;
}

function ColorPicker({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
  return <fieldset className="mt-3 flex flex-wrap items-center gap-2"><legend className="sr-only">{label}</legend><span className="mr-1 text-xs font-semibold text-slate-500">色</span>{colors.map(color => <button key={color} type="button" aria-label={`${label} ${color}`} aria-pressed={value === color} onClick={() => onChange(color)} className={`size-7 rounded-full border-2 border-white shadow-sm ring-offset-2 ${value === color ? "ring-2 ring-slate-500" : "ring-1 ring-slate-200"}`} style={{ backgroundColor: color }}/>)}</fieldset>;
}
