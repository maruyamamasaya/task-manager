# Taskflow

Taskflow は、Project、実行 Task、独立した共同編集 WBS に仕事を整理し、予定・実績・進捗・振り返りを管理する Web アプリです。

## ドキュメント

- 開発を始める AI / 開発者: [`AGENTS.md`](AGENTS.md) → [`CURRENT.md`](CURRENT.md) → [`ARCHITECTURE.md`](ARCHITECTURE.md)
- 設計判断: [`decisions/`](decisions/)
- 作業記録: [`sessions/`](sessions/)
- データ読み込みとcacheの詳細: [`docs/data-loading.md`](docs/data-loading.md)
- 利用者向け操作マニュアル: [`public/manual/README.md`](public/manual/README.md)

現在の実装範囲、既知の制約、未実装事項は、古いPhase説明ではなく [`CURRENT.md`](CURRENT.md) を正本とします。

## 技術構成

- Next.js（App Router）/ React / TypeScript / Tailwind CSS
- Supabase Auth / PostgreSQL / Row Level Security
- Vercel

詳細なコンポーネント、データモデル、認証、データフローは [`ARCHITECTURE.md`](ARCHITECTURE.md) を参照してください。

## セットアップ

前提は Node.js 20.9 以上、npm、および必要に応じて Supabase CLI です。

```bash
npm install
cp .env.example .env.local
```

Supabase Dashboard の **Project Settings > API** にある公開用の値を設定します。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

`service_role` key はアプリの環境変数に設定せず、コミットしないでください。Supabase側ではEmail/Passwordを有効化して利用者を作成し、projectをlinkしてmigrationを適用します（本アプリにサインアップ画面はありません）。

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
npm run dev
```

`http://localhost:3000/login` からログインします。DBを変更するときは既存migrationを書き換えず、[`supabase/AGENTS.md`](supabase/AGENTS.md) に従って追加migrationを作成してください。

## 品質チェック

```bash
npm test
npm run lint
npm run build
```

独立した `typecheck` script はありません。`npm test` がテスト対象を `tsc` でcompileし、`npm run build` がアプリの型検査を含みます。

## デプロイ

想定構成はSupabase migrationを先に適用し、その後VercelへNext.jsをデプロイする順序です。Vercelには上記2環境変数を設定し、Supabase AuthのSite URL / Redirect URLsを環境に合わせます。リポジトリ内にCI/CD workflowや実環境識別子はないため、デプロイ前に運用環境を確認してください。
