# Task Manager

予定・実績・進捗・スケジュール・振り返りを、中心となる `Task` に関連付けて管理する Web アプリです。Phase 2 では Supabase に永続化する階層タスク、Project、Today、Markdown Import / Export を提供します。

## 技術構成

- Next.js（App Router）/ React / TypeScript
- Tailwind CSS
- Supabase Auth / PostgreSQL / Row Level Security
- Vercel

## セットアップ

前提: Node.js 20.9 以上、npm、必要に応じて [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)。

```bash
npm install
cp .env.example .env.local
```

Supabase Dashboard の **Project Settings > API** で表示される値を `.env.local` に設定します。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Publishable key（旧プロジェクトでは anon key）はブラウザ公開用です。`service_role` key はアプリの環境変数に設定せず、コミットしないでください。

## Supabase の準備

1. Supabase プロジェクトを作成します。
2. **Authentication > Providers > Email** で Email/Password を有効にします。
3. Dashboard からテストユーザーを作成します（本フェーズにはサインアップ画面を含みません）。
4. CLI でプロジェクトをリンクし、migration を適用します。

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

既存環境にも `npx supabase db push` で Phase 2 migration を適用してください。初期 migration は7テーブル、外部キー、検査制約、インデックス、更新日時トリガー、および全テーブルの RLS を作成します。RLS は認証ユーザーの `auth.uid()` と `user_id`（profile は `id`）を照合し、関連する project/task も同一ユーザー所有か検証します。Phase 2 migration は3階層制約と、RLSを維持した原子的な完了連動RPCを追加します。

ローカル起動:

```bash
npm run dev
```

`http://localhost:3000/login` からログインします。品質チェックは `npm run lint`、`npm test`、`npm run build` で実行できます。

## ルートと構成

- `/login`: Email/Password ログイン
- `/dashboard`: Phase 1 ダッシュボード
- `/today`, `/tasks`, `/schedule`, `/projects`, `/reflections`, `/analytics`: 今後の機能用ページ
- `app/`: route、layout、Server Action
- `components/`: 認証、共通レイアウト、UI
- `lib/supabase/`: browser/server/middleware 用 Supabase client
- `types/`: ドメイン型
- `supabase/migrations/`: PostgreSQL schema と RLS

保護ルートは middleware で未認証アクセスを `/login` に戻し、サーバーレイアウトでも `getUser()` により再検証します。

## Vercel へのデプロイ

1. GitHub リポジトリを Vercel に Import します。Framework Preset は Next.js、Build Command は `npm run build` の既定値を使います。
2. Production / Preview / Development の必要な範囲に以下を登録します。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Supabase Auth の **URL Configuration** で Site URL を本番 Vercel URL に設定し、必要な Preview URL を Redirect URLs に追加します。
4. migration 適用後にデプロイします。

## Phase 1 の範囲

タスク CRUD、ドラッグ＆ドロップ、タイマー、カレンダー、分析グラフ、振り返り入力などは意図的に未実装です。次フェーズでは Task を中心に project、階層、ステータス、期限を扱う CRUD と、その操作に対する統合テストを追加します。

## Phase 3: Schedule / Work Log / Timer

- **予定工数**は `tasks.estimated_minutes`（分）、時間帯への配置は `task_schedules.start_at/end_at` であり、互いに独立しています。`/schedule` で日付、Task、開始・終了を指定し、重複は許可しつつ警告します。
- **実績**は `work_logs.minutes` の合計です。Task Drawer から任意分数または +15 / +30 / +60分を追加でき、履歴の note、分数を編集・削除できます。`actual - estimated` を差分、`actual / estimated * 100` を予定比として表示します（予定なしでは比率を表示しません）。
- **タイマー**は開始時に `started_at` をDBへ保存し、画面はその値と現在時刻との差を表示します。更新・画面移動・再ログイン後も復元され、停止時に `ended_at` と分数を確定します。Phase 3 migration の partial unique index とRPCにより、ユーザーごとの作業中ログは1件だけです。
- 一覧は Task ごとの問い合わせを行わず、Work Log / Scheduleを一括取得して集計します。日次実績は **started_at の Asia/Tokyo 上の日付**に全量を帰属させ、深夜をまたぐログも分割しません。日次予定は `start_at` の日付に帰属します。
- DBは `timestamptz`（UTC ISO文字列）で保存し、入力・表示・日付境界は `Asia/Tokyo` とします。追加の外部サービスや環境変数はありません。

既存プロジェクトではデプロイより先に `npx supabase db push` を実行し、`20260825020000_phase3_schedule_work_logs.sql` を適用してください。既存RLSは `user_id = auth.uid()` に加えて関連Taskの所有権も restrictive policy で検証し続けます。

Reflection入力、Progress履歴、Analyticsグラフ、AI分析、通知、外部カレンダー連携は後続Phaseの範囲です。
