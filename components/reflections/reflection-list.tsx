"use client";

import { useState } from "react";
import type { Reflection, Task } from "@/types/database";
import { Pagination } from "@/components/ui/pagination";
import { ReflectionCard } from "./reflection-card";

const REFLECTIONS_PER_PAGE = 20;

type Item = {
  reflection: Reflection;
  task: Task;
  projectName: string;
  metrics: { planned: number; actual: number; difference: number };
};

export function ReflectionList({ items, detail = false }: { items: Item[]; detail?: boolean }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / REFLECTIONS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = items.slice((currentPage - 1) * REFLECTIONS_PER_PAGE, currentPage * REFLECTIONS_PER_PAGE);

  if (!items.length) return <p className="rounded-2xl border bg-white p-12 text-center text-slate-400">{detail ? "振り返りが見つかりません" : "振り返りはまだありません"}</p>;

  return <div className="space-y-4">
    {visible.map(item => <ReflectionCard key={item.reflection.id} {...item} initiallyOpen={detail} />)}
    <div className="overflow-hidden rounded-2xl border bg-white">
      <Pagination page={currentPage} totalItems={items.length} pageSize={REFLECTIONS_PER_PAGE} onPageChange={setPage} />
    </div>
  </div>;
}
