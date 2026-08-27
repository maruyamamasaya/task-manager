import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { DayOff } from "@/types/database";
import type { WbsItem, WbsProject, WbsProjectRole } from "@/lib/wbs/types";
import { WbsWorkspace } from "@/components/wbs/wbs-workspace";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const [{ data: project }, { data: member }, { data: items }, { data: dayOffs }] = await Promise.all([
    db.from("wbs_projects").select("*").eq("id", projectId).maybeSingle(),
    db.from("wbs_project_members").select("role").eq("project_id", projectId).eq("user_id", user!.id).maybeSingle(),
    db.from("wbs_items").select("*").eq("project_id", projectId).order("sort_order"),
    db.from("day_offs").select("off_date,status,note").order("off_date"),
  ]);
  if (!project) notFound();
  const role: WbsProjectRole = project.owner_user_id === user!.id ? "owner" : member?.role as WbsProjectRole;
  return <><Link href="/wbs" className="text-sm text-indigo-700">← WBS一覧</Link><WbsWorkspace project={project as WbsProject} initialItems={(items ?? []) as WbsItem[]} dayOffs={(dayOffs ?? []) as Pick<DayOff, "off_date" | "status" | "note">[]} role={role} /></>;
}
