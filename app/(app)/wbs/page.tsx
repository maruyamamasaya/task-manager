import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { isWbsItemOverdue, leafEffortTotals, leafProgress, projectDateRange } from "@/lib/wbs/hierarchy";
import type { WbsItem, WbsProject, WbsProjectRole } from "@/lib/wbs/types";
import { WbsProjectList } from "@/components/wbs/wbs-project-list";

export default async function WbsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const [{ data: projects, error }, { data: members }, { data: items }] = await Promise.all([
    db.from("wbs_projects").select("*").order("updated_at", { ascending: false }),
    db.from("wbs_project_members").select("project_id,role").eq("user_id", user!.id),
    db.from("wbs_items").select("*"),
  ]);
  const memberRoles = new Map((members ?? []).map((member) => [member.project_id, member.role as WbsProjectRole]));
  const summaries = ((projects ?? []) as WbsProject[]).map((project) => {
    const projectItems = (items ?? [] as WbsItem[]).filter((item) => item.project_id === project.id);
    const today = new Date().toISOString().slice(0, 10);
    const effort = leafEffortTotals(projectItems);
    const range = projectDateRange(projectItems);
    return { ...project, role: project.owner_user_id === user!.id ? "owner" as const : memberRoles.get(project.id) ?? "viewer", itemCount: projectItems.length, progress: leafProgress(projectItems), overdueCount: projectItems.filter(item => isWbsItemOverdue(item,today)).length, inProgressCount: projectItems.filter(item => item.status === "in_progress").length, onHoldCount: projectItems.filter(item => item.status === "on_hold").length, ...range, estimateHours: effort.estimate, actualHours: effort.actual };
  });
  return <><PageHeader title="WBS" description="プロジェクトの工程を階層的に管理します。" action={<Link href="/wbs/new" className="inline-flex min-h-9 items-center rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white hover:bg-indigo-700">＋ 新規WBS</Link>} />{error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5"><p className="text-sm text-red-700">WBSを読み込めませんでした。</p><Link href="/wbs" className="mt-3 inline-block text-sm font-medium text-red-700 underline">再読み込み</Link></div> : <WbsProjectList projects={summaries} />}</>;
}
