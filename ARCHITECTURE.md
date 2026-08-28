---
status: active
updated: 2026-08-28
---

# アーキテクチャ

## 全体像

```text
Browser
  ├─ Next.js App Router UI (React Server / Client Components)
  ├─ Server Actions ───────────────┐
  └─ Tasks のみ Supabase browser client + IndexedDB cache
                                    │ user session / publishable key
Next.js on Vercel                  ▼
  ├─ Routing Middleware       Supabase Auth + PostgREST + PostgreSQL
  └─ Server Components              ├─ RLS / ownership policies
                                    ├─ triggers / constraints
                                    └─ atomic RPCs
```

技術スタックは Next.js 15 App Router、React 19、TypeScript、Tailwind CSS 4、Supabase Auth/PostgreSQL、Vercel です。環境変数は公開可能な Supabase URL と publishable（または anon）key の2つだけで、`service_role` は使用しません。

## アプリケーション境界

- `app/(auth)/`: ログインと認証 action。
- `app/(app)/`: 認証後の route、Server Component、機能別 Server Action。`layout.tsx` が `getUser()` で利用者を再検証する。
- `components/`: Client Component と表示部品。機能別ディレクトリと共通 `ui/` に分かれる。
- `lib/supabase/`: browser/server client、環境変数、middleware、session cookie 判定。
- `lib/tasks/`, `lib/time/`, `lib/analytics/`, `lib/wbs/`: UIから分離した純粋なドメイン処理。
- `types/database.ts`: DB row を表すアプリ側 TypeScript 型。
- `supabase/migrations/`: schema、RLS、constraint、trigger、RPC の唯一の変更履歴。
- `tests/`: Node test runner で純粋関数、認証cookie、購読不使用などを検証。
- `public/manual/`: Docsify でブラウザ表示する利用者向け資料。
- `ツールソースデータ/`: 初期検討用の独立した静的ツール群。Next.js build/lintの対象外で、現行アプリとは接続されていない。

## 認証と認可

Routing Middleware は保護パスの session cookie 有無を高速判定し、外部通信をしません。最終的な認証はサーバーレイアウトの Supabase `getUser()` が行います。データアクセスはログインユーザーの clientを使い、PostgreSQL RLS が通常データの `user_id` と関連 Task/Project の所有権を検証します。

WBS は共同利用できるため別モデルです。Project owner と membership role（owner/editor/viewer）をDB関数とRLSで評価し、参加申請の承認も権限付きRPCで処理します。認可をUIだけに依存させません。

## データモデル

### 個人タスク領域

- `profiles`
- `projects` → `tasks`（Task は自己参照 `parent_id`、最大3階層）
- `tasks` → `task_schedules`, `work_logs`, `progress_logs`, `reflections`
- `meetings`, `day_offs`, `work_settings`

親 Task は子を持つとDB triggerでフォルダ化され、予定・実績・進捗・振り返りの新規関連付けをDBでも拒否します。進捗/完了と履歴の整合、ユーザーごとに1件だけの稼働中 Work Log など、競合し得る不変条件はconstraint、trigger、RPCに置きます。

### WBS 領域

- `wbs_projects` → `wbs_items`, `wbs_dependencies`
- `wbs_projects` → `wbs_project_members`, `wbs_join_requests`

WBS は通常 Project / Task と外部キーを持ちません。Item は最大3階層で、Project内で一意な階層コードを持ちます。末端の工数・進捗・状態の変更はtriggerで祖先へ集約され、同階層の入れ替えは権限検証を含むRPCで原子的に行います。

## 読み書きとキャッシュ

通常の画面は Server Component が必要範囲を一括取得し、書き込みは Server Action 後に関連 path を revalidate します。Analytics は期間条件をDB queryへ渡し、取得後に `lib/analytics/` の純粋関数で集計します。N+1 query は避けます。

Tasks 画面だけは IndexedDB のユーザー別snapshotを先に表示し、browser Supabase clientで再検証します。`updated_at` を持つデータは差分取得し、削除検出のため定期的に全件同期します。詳細と拡張条件は [`docs/data-loading.md`](docs/data-loading.md) を参照してください。Realtime channel はありません。

## 時刻・集計

DBは日時を `timestamptz` で保存し、入力、日境界、表示は `Asia/Tokyo` です。日をまたぐ予定と実績は分割せず開始日の全量として集計します。予定工数（Taskの見積り）、Schedule予定（時間枠）、実績（Work Log）は別概念です。

## デプロイと品質管理

想定デプロイ先は Vercel、DB/Auth は Supabase です。migration を先に `npx supabase db push` で適用し、その後 Next.js をデプロイします。ただし自動化workflowと実環境設定はリポジトリにありません。

- `npm test`: test用 TypeScript compile + Node test runner
- `npm run lint`: ESLint（Next.js / TypeScript）
- `npm run build`: production build とアプリ型検査

設計判断の根拠は [`decisions/`](decisions/) に、現在の制約は [`CURRENT.md`](CURRENT.md) に分離します。
