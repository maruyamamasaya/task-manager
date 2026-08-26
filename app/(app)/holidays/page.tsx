import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PendingDatabaseUpdate } from "@/components/ui/database-updating";
import { createClient } from "@/lib/supabase/server";
import { deleteDayOff, saveDayOff, updateDayOff } from "./actions";

const labels = {
  holiday: "休日",
  paid_leave: "有休",
  am_leave: "午前休",
  pm_leave: "午後休",
} as const;

type PageProps = { searchParams: Promise<{ edit?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const db = await createClient();
  const { data, error } = await db.from("day_offs").select("*").order("off_date", { ascending: false });
  if (error) throw error;

  const { edit } = await searchParams;
  const editingDayOff = data?.find((item) => item.id === edit);

  return <>
    <PageHeader title="休日設定" description="独自の休日、有休、午前休・午後休の予定を登録できます。" />
    <section className="holiday-settings">
      <form action={editingDayOff ? updateDayOff : saveDayOff} className="holiday-form">
        <PendingDatabaseUpdate />
        {editingDayOff && <input type="hidden" name="id" value={editingDayOff.id} />}
        <label>日付<input required name="off_date" type="date" defaultValue={editingDayOff?.off_date} /></label>
        <label>休みの種類<select name="status" defaultValue={editingDayOff?.status ?? "holiday"}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="holiday-note">メモ<input name="note" maxLength={500} placeholder="例：夏季休暇" defaultValue={editingDayOff?.note ?? ""} /></label>
        <button>{editingDayOff ? "更新する" : "登録する"}</button>
        {editingDayOff && <Link className="holiday-edit-cancel" href="/holidays">キャンセル</Link>}
      </form>
      <div className="holiday-list">
        <div className="holiday-list-head"><b>登録済みの休み</b><span>{data?.length ?? 0}件</span></div>
        {data?.map((item) => <article key={item.id}>
          <time>{item.off_date.replaceAll("-", "/")}</time>
          <span className={`leave-badge leave-badge--${item.status}`}>{labels[item.status as keyof typeof labels]}</span>
          <p>{item.note || "メモなし"}</p>
          <div className="holiday-item-actions">
            <Link href={`/holidays?edit=${encodeURIComponent(item.id)}`} aria-label={`${item.off_date}の設定を編集`}>編集</Link>
            <form action={deleteDayOff}>
              <PendingDatabaseUpdate />
              <input type="hidden" name="id" value={item.id} />
              <button aria-label={`${item.off_date}の設定を削除`}>削除</button>
            </form>
          </div>
        </article>)}
        {!data?.length && <p className="holiday-empty">登録された休みはありません。</p>}
      </div>
    </section>
  </>;
}
