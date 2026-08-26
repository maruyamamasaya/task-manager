# Supabase development rules

- スキーマ、テーブル、カラム、制約、index、trigger、RLS policy、DB function / RPC を変更する場合は、既存 migration を編集せず `supabase/migrations/` に新しい SQL migration を追加すること。
- migration 名は `YYYYMMDDHHMMSS_description.sql` とし、既存環境へ `npx supabase db push` で順番に適用できるようにすること。
- アプリケーションコードだけで DB の変更を前提にしないこと。必要な SQL と、既存データを安全に移行する処理を同じ変更に含めること。
