"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { archiveProject, createProject, deleteProject, renameProject, setProjectColor } from "@/app/(app)/projects/actions";
import { DatabaseUpdating } from "@/components/ui/database-updating";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { projectProgress } from "@/lib/tasks/phase4";
import type { Project, Task } from "@/types/database";

const colors = ["#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316", "#f43f5e", "#a855f7"];
const DEFAULT_COLOR = "#94a3b8";
const PROJECTS_PER_PAGE = 20;

export function ProjectList({ projects, tasks }: { projects: Project[]; tasks: Pick<Task, "project_id" | "progress" | "status">[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [page, setPage] = useState(1);
  const tab = searchParams.get("tab") === "archived" ? "archived" : "active";
  const shownProjects = projects.filter(project => tab === "archived" ? project.archived : !project.archived);
  const totalPages = Math.max(1, Math.ceil(shownProjects.length / PROJECTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleProjects = shownProjects.slice((currentPage - 1) * PROJECTS_PER_PAGE, currentPage * PROJECTS_PER_PAGE);
  const run = (promise: Promise<{ error?: string }>, onSuccess?: () => void) => start(async () => {
    const result = await promise;
    if (result.error) alert(result.error);
    else {
      onSuccess?.();
      location.reload();
    }
  });

  const changeTab = (nextTab: "active" | "archived") => {
    setPage(1);
    router.push(nextTab === "archived" ? "/projects?tab=archived" : "/projects", { scroll: false });
  };

  return <div className="space-y-4">
    <DatabaseUpdating active={pending} />
    <form onSubmit={event => {
      event.preventDefault();
      if (name.trim()) run(createProject(name), () => setName(""));
    }} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-2">
        <input value={name} onChange={event => setName(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2" placeholder="新しいプロジェクト名" />
        <button disabled={pending} className="rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white">作成</button>
      </div>
    </form>

    <div className="border-b border-slate-200" role="tablist" aria-label="プロジェクトの表示切り替え">
      <button type="button" role="tab" aria-selected={tab === "active"} onClick={() => changeTab("active")} className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-medium ${tab === "active" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>プロジェクト</button>
      <button type="button" role="tab" aria-selected={tab === "archived"} onClick={() => changeTab("archived")} className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-medium ${tab === "archived" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>アーカイブ</button>
    </div>

    <section className="overflow-visible rounded-xl border border-slate-200 bg-white">
      {shownProjects.length ? <>
        <div className="divide-y divide-slate-100">{visibleProjects.map(project => {
          const progress = projectProgress(tasks.filter(task => task.project_id === project.id));
          const projectColor = project.color ?? DEFAULT_COLOR;
          return <article key={project.id} className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <ProjectColorPicker project={project} color={projectColor} pending={pending} onSelect={next => run(setProjectColor(project.id, next))} />
              <div className="min-w-48 flex-1">
                <p className="truncate font-medium">{project.name}</p>
                <p className="text-xs text-slate-400">進捗 {progress.progress}% ／ {progress.done} / {progress.total} Tasks</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full" style={{ width: `${progress.progress}%`, backgroundColor: projectColor }} /></div>
              </div>
              <button type="button" onClick={() => { const value = prompt("新しいプロジェクト名", project.name); if (value?.trim()) run(renameProject(project.id, value)); }} className="rounded-lg border px-3 py-1.5 text-sm">名前変更</button>
              <button type="button" onClick={() => run(archiveProject(project.id, !project.archived))} className="rounded-lg border px-3 py-1.5 text-sm">{project.archived ? "復元" : "アーカイブ"}</button>
              <button type="button" onClick={() => { if (confirm(`「${project.name}」を削除しますか？\nタスクは削除されず、プロジェクト未設定になります。`)) run(deleteProject(project.id)); }} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600">削除</button>
            </div>
          </article>;
        })}</div>
        <Pagination page={currentPage} totalItems={shownProjects.length} pageSize={PROJECTS_PER_PAGE} onPageChange={setPage} />
      </> : <div className="p-12 text-center">
        <p className="font-semibold">{tab === "archived" ? "アーカイブは空です" : "プロジェクトはまだありません"}</p>
        <p className="mt-2 text-sm text-slate-500">{tab === "archived" ? "アーカイブしたプロジェクトがここに表示されます。" : "上のフォームから最初のプロジェクトを作成しましょう。"}</p>
      </div>}
    </section>
  </div>;
}

function ProjectColorPicker({ project, color, pending, onSelect }: { project: Project; color: string; pending: boolean; onSelect: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div ref={containerRef} className="relative shrink-0">
    <button type="button" aria-label={`${project.name}の色を変更`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)} className="grid size-10 place-items-center rounded-lg text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" style={{ backgroundColor: color }}>
      <Icon name="projects" className="size-5" />
    </button>
    {open && <div role="dialog" aria-label={`${project.name}の色を選択`} className="absolute left-0 top-12 z-20 w-36 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-slate-500">色を選択</p>
      <div className="grid grid-cols-4 gap-2">{colors.map(option => <button key={option} type="button" disabled={pending} aria-label={`${project.name}の色 ${option}`} aria-pressed={project.color === option} onClick={() => { setOpen(false); onSelect(option); }} className={`size-6 rounded-full border-2 border-white shadow-sm ring-offset-1 ${project.color === option ? "ring-2 ring-slate-600" : "ring-1 ring-slate-200"}`} style={{ backgroundColor: option }} />)}</div>
    </div>}
  </div>;
}
