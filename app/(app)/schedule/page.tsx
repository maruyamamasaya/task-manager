import { EmptyState } from "@/components/ui/empty-state"; import { PageHeader } from "@/components/ui/page-header";
export default function Page() { return <><PageHeader title="Schedule" description="タスクを時間軸に配置します。" /><EmptyState title="スケジュールはまだありません" description="カレンダーとスケジュール配置は後続フェーズで実装します。" /></>; }
