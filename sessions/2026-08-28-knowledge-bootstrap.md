# AI 継続開発ドキュメント基盤の導入

## 調査範囲

- ルートREADME、`docs/`、利用者マニュアル、既存の `supabase/AGENTS.md`、全Markdown。
- `app/`、`components/`、`lib/`、`types/`、`tests/` の構成と主要処理。
- 全Supabase migrationのtable、RLS、constraint、trigger、RPC。
- `package.json`、TypeScript/ESLint/Next.js設定、環境変数例、middleware、Gitignore。
- `.github/` / `documentation/` / TODO / ROADMAP / API定義の有無。
- Git履歴（初期構築、各Phase、フォルダTask、cache、Realtime監査、独立WBS、最近のWBS集約変更）。

## 作成・統合

- AIの開始手順、実装原則、Definition of Doneをルート `AGENTS.md` に作成した。既存のSupabase固有規則は移動せず参照した。
- READMEや利用者マニュアル、コード、migrationの現在情報を `CURRENT.md` と `ARCHITECTURE.md` に分類した。
- コード、文書、Git履歴の3点から確認できた認可境界、親Task、独立WBSの判断だけをADR化した。
- 古いPhase説明を含んでいたルートREADMEは、入口・セットアップ・現行資料へのリンクへ整理した。

## 維持した資料

- `public/manual/`: 開発者用外部記憶ではなく、現行UIの利用者向け操作資料として独立価値がある。
- `docs/data-loading.md`: cache同期方式と将来の移行条件の詳細資料であり、ARCHITECTUREから参照する方が重複を抑えられる。
- `supabase/AGENTS.md`: migration配下に限定して適用すべき具体的な開発規則である。
- `ツールソースデータ/`: 文書ではなく履歴的な静的ツール資産。今回の文書整理だけを理由に削除しない。

## 廃止候補

現時点で削除対象はない。ルートREADMEの古い記述は残置せず、確認できる現在情報へ置き換えた。

## 不明・確認不能

- 本番/PreviewのVercel URL、Supabase project、migration適用状況。
- CI/CDがリポジトリ外に存在するか、運用責任者、明文化された製品ロードマップ。
- `types/database.ts` の生成元・更新手順。
- タイマーコードを残しつつ利用者マニュアルで停止としている運用上の理由と、再開予定。

## 検証

ドキュメント追加後に `npm test`、`npm run lint`、`npm run build`、`git diff --check` を実行する。

## 次回への注意

まず `AGENTS.md` → `CURRENT.md` → `ARCHITECTURE.md` の順に読み、変更対象に関係するADRと詳細資料だけを選ぶ。上記の不明事項を推測で埋めない。
