"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TaskDataLoader } from "@/components/tasks/task-data-loader";

export default function Page() {
  const params = useSearchParams();
  return <><PageHeader title="タスク" description="タスクを整理し、日々の進捗を管理します。" /><TaskDataLoader initialTaskId={params.get("task") ?? undefined} /></>;
}
