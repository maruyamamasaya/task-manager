"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setReflectionSkipped } from "@/app/(app)/reflections/actions";
import type { Task } from "@/types/database";

export function ReflectionWaitingList({ tasks }: { tasks: Task[] }) {
  const [items, setItems] = useState(tasks);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const skip = (task: Task) => startTransition(async () => {
    setError("");
    const result = await setReflectionSkipped(task.id, true);
    if (result.error) setError(`スキップできませんでした: ${result.error}`);
    else setItems(current => current.filter(item => item.id !== task.id));
  });

  return <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
    <b>振り返り待ち {items.length}件</b>
    {items.length ? <div className="mt-3 space-y-2">{items.map(task => <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2" key={task.id}>
      <Link className="min-w-0 flex-1 px-1 text-sm font-medium text-slate-700 hover:text-indigo-700" href={`/tasks?task=${task.id}`}>{task.title} を振り返る</Link>
      <button type="button" disabled={pending} onClick={() => skip(task)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50">振り返りをスキップ</button>
    </div>)}</div> : <p className="mt-1 text-sm text-slate-500">振り返り待ちのTaskはありません</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </section>;
}
