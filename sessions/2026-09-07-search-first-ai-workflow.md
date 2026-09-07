# Search-first AI workflow

## Request

大規模化しても少ないコンテキストで対象コードへ到達できるよう、検索性、階層型 `AGENTS.md`、文書の責務分離、標準検証、semantic / exact / references search の使い分けを強化する。

## Investigation

- 既存の root / Supabase 向け指示、CURRENT、ARCHITECTURE、README、ADR、session、コード配置、exports、テスト、環境変数、migration、直近 Git 履歴を確認した。
- `CODEMAP.md`、`TESTING.md`、`OPERATIONS.md` と CI/E2E は未整備だった。既存文書は小さく概ね現行コードと一致していたが、README / AGENTS / ARCHITECTURE に検証・運用手順が重複していた。
- 初回 Fast verify で、`npm test` の生成物 `.test-dist` を後続 ESLint が検査する問題を検出した。

## Changes

- root AGENTS を検索優先・段階的コンテキスト取得・文書更新条件の入口に絞り、Next.js app と Supabase の強い責務境界にだけ子 AGENTS を配置した。
- 機能ごとの primary paths、検索語、entry point、テストを示す CODEMAP を作成した。
- TESTING と OPERATIONS を正本として分離し、README / ARCHITECTURE の重複手順をリンクへ置き換えた。
- `npm run verify:fast` と `npm run verify` を追加し、ESLint が test build artifact を無視するようにした。

## Validation

- `npm run verify`: 36 tests、ESLint、Next.js production build 成功。既存 PostCSS config の warning は残る。
- `git diff --check` と Markdown のローカルリンク検査を実行した。

## Result

AI は root rules / current state から code map、semantic search、exact / references、対象・依存・テストへ段階的に進み、実装中と完了前の検証を1コマンドで開始できる。

## Remaining Issues

- Repository semantic index / Language Server、CI、E2E、実環境 migration validation はリポジトリ内では提供されていない。
- `phase3-actions.ts` など履歴由来の抽象的な名前や、一部の圧縮された実装は検索・可読性を下げるが、検索性だけを目的とした大規模 rename / formatting は行っていない。
- `types/database.ts` の自動生成手順と実環境の運用情報は引き続き未確認。
