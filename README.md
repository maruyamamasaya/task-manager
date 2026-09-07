# Taskflow

Taskflow は、Project、実行 Task、独立した共同編集 WBS に仕事を整理し、予定・実績・進捗・振り返りを管理する Web アプリです。

## ドキュメント

- 開発を始める AI / 開発者: [`AGENTS.md`](AGENTS.md) → [`CURRENT.md`](CURRENT.md) → [`ARCHITECTURE.md`](ARCHITECTURE.md)
- コード探索の入口: [`CODEMAP.md`](CODEMAP.md)
- テストと標準 verify: [`TESTING.md`](TESTING.md)
- セットアップ・環境変数・デプロイ: [`OPERATIONS.md`](OPERATIONS.md)
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

ローカル起動、環境変数、Supabase migration の手順は [`OPERATIONS.md`](OPERATIONS.md) を正本とします。利用者の操作方法は [`public/manual/README.md`](public/manual/README.md) を参照してください。

## 品質チェック

```bash
npm run verify
```

Fast / Full の使い分け、変更種別ごとの必須検証、DB検証は [`TESTING.md`](TESTING.md) を参照してください。

## デプロイ

デプロイ順序と、リポジトリから確認できない運用情報は [`OPERATIONS.md`](OPERATIONS.md) に集約しています。
