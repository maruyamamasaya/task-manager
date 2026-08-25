import { EmptyState } from "@/components/ui/empty-state"; import { PageHeader } from "@/components/ui/page-header";
export default function Page() { return <><PageHeader title="Projects" description="関連するタスクをプロジェクトにまとめます。" /><EmptyState title="プロジェクトはまだありません" description="プロジェクト管理は後続フェーズで利用できるようになります。" /></>; }
