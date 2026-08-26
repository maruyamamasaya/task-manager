import { PageHeader } from "@/components/ui/page-header";

export default function WbsPage() {
  return (
    <>
      <PageHeader
        title="WBS"
        description="プロジェクトの作業を構造化して管理します。"
      />
      <section
        aria-label="WBSワークスペース"
        className="min-h-[28rem] rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="grid min-h-[28rem] place-items-center p-8 text-center">
          <div>
            <p className="font-semibold text-slate-700">WBSページは準備中です</p>
            <p className="mt-2 text-sm text-slate-500">
              ここにプロジェクトのWBSを表示します。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
