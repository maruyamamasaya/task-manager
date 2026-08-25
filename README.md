# Task Manager

予定・実績・進捗・スケジュール・振り返りを、中心となる `Task` に関連付けて管理する Web アプリです。Phase 1 では、安全に機能を拡張するための認証、データベース、共通 UI を整備しています。

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

または `supabase/migrations/20260825000000_initial_schema.sql` を SQL Editor で実行できます。migration は7テーブル、外部キー、検査制約、インデックス、更新日時トリガー、および全テーブルの RLS を作成します。RLS は認証ユーザーの `auth.uid()` と `user_id`（profile は `id`）を照合し、関連する project/task も同一ユーザー所有か検証します。

ローカル起動:

```bash
npm run dev
```

`http://localhost:3000/login` からログインします。品質チェックは `npm run lint` と `npm run build` で実行できます。

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
