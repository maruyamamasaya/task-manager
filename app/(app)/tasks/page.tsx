import { PageHeader } from "@/components/ui/page-header";
import { TaskManager } from "@/components/tasks/task-manager";
import { createClient } from "@/lib/supabase/server";
export default async function Page() { const db=await createClient(); const [{data:tasks,error},{data:projects}]=await Promise.all([db.from("tasks").select("*").order("sort_order").order("created_at"),db.from("projects").select("*").eq("archived",false).order("name")]); if(error) throw error; return <><PageHeader title="Tasks" description="タスクを整理し、日々の進捗を管理します。" /><TaskManager initialTasks={tasks??[]} projects={projects??[]}/></>; }
