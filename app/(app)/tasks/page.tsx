import { EmptyState } from "@/components/ui/empty-state"; import { PageHeader } from "@/components/ui/page-header";
export default function Page() { return <><PageHeader title="Tasks" description="すべてのタスクをひとつの場所で管理します。" /><EmptyState title="タスクはまだありません" description="タスク作成・階層化は次のフェーズで利用できるようになります。" /></>; }
