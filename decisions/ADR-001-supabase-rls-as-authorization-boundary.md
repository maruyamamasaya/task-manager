---
status: active
date: 2026-08-25
---

# ADR-001: Supabase RLS をデータ認可境界にする

## Context

アプリはブラウザ/サーバー双方からログインユーザーの Supabase client でデータへアクセスします。初期schemaとその後のmigrationは、全個人データでユーザー所有権を、Task関連データで関連Taskの所有権も検証しています。WBS追加時もrole判定関数とRLSが導入されました。

## Decision

- アプリでは publishable（旧環境では anon）key と利用者sessionを使い、`service_role` key を使わない。
- UIやServer Actionで検証しても、最終認可はPostgreSQL RLSで強制する。
- 複数行の整合性や権限付き操作は、`auth.uid()`、RLS、固定した `search_path` を保つDB RPC/triggerに置く。
- schema変更は既存migrationを改変せず、追加migrationとして適用する。

## Consequences

直接PostgRESTへアクセスされても所有権境界を維持できます。一方、機能追加時はアプリコードだけでなくRLS、関連所有権、RPC権限を同時にレビューする必要があります。

## Evidence

`20260825000000_initial_schema.sql`、`20260826040000_wbs_module.sql`、READMEのSupabase準備/セキュリティ記述、およびそれらを導入したGit履歴を根拠とします。
