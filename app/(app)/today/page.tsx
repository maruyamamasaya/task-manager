import { EmptyState } from "@/components/ui/empty-state"; import { PageHeader } from "@/components/ui/page-header";
export default function Page() { return <><PageHeader title="Today" description="今日取り組むタスクを確認します。" /><EmptyState title="今日のタスクはありません" description="タスクの期限やスケジュールが設定されると、ここに表示されます。" /></>; }
