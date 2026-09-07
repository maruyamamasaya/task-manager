# Supabase development rules

- この領域ではルート [`AGENTS.md`](../AGENTS.md) に加えて以下を適用する。DB構造と認可境界は [`ARCHITECTURE.md`](../ARCHITECTURE.md)、検証方法は [`TESTING.md`](../TESTING.md) を正本とする。
- スキーマ、テーブル、カラム、制約、index、trigger、RLS policy、DB function / RPC を変更する場合は、既存 migration を編集せず `supabase/migrations/` に新しい SQL migration を追加すること。
- migration 名は `YYYYMMDDHHMMSS_description.sql` とし、既存環境へ `npx supabase db push` で順番に適用できるようにすること。
- アプリケーションコードだけで DB の変更を前提にしないこと。必要な SQL と、既存データを安全に移行する処理を同じ変更に含めること。
- table / RPC の参照元、`types/database.ts`、RLS、trigger、関連テストを exact search で確認する。RLS、所有権検証、入力制約を緩めず、`service_role` key をアプリへ追加しないこと。
