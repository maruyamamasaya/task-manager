import { EmptyState } from "@/components/ui/empty-state"; import { PageHeader } from "@/components/ui/page-header";
export default function Page() { return <><PageHeader title="Analytics" description="予定・実績・進捗の傾向を確認します。" /><EmptyState title="分析データを準備中です" description="データが蓄積された後、Phase 5 でグラフや指標を表示します。" /></>; }
