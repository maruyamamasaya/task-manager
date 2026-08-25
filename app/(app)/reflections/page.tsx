import { EmptyState } from "@/components/ui/empty-state"; import { PageHeader } from "@/components/ui/page-header";
export default function Page() { return <><PageHeader title="Reflections" description="結果と学びを記録し、次の行動につなげます。" /><EmptyState title="振り返りはまだありません" description="完了したタスクの振り返りがここに蓄積されます。" /></>; }
