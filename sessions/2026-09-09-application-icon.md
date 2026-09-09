# Application icon

## Request

既存の紫色の「T」マークを少し洗練し、アプリケーションアイコンとして利用できるようにする。

## Investigation

- 公開中のログイン画面では、紫の角丸背景に白い「T」を置いた簡易マークを使用していた。
- favicon、Apple touch icon、Web App Manifest は未設定だった。
- サイドバーにも同じ簡易マークがあった。

## Changes

- 紫のグラデーションに「T」とチェックマークを組み合わせた共通 `AppMark` を追加した。
- ログイン画面とサイドバーの簡易マークを `AppMark` に置き換えた。
- SVG favicon、Apple向けPNG画像ルート、Web App Manifest、テーマカラーを追加した。

## Validation

- テスト: 36件成功。
- ESLint: エラー0件。既存の `postcss.config.mjs` に警告1件。
- `npm run build`: 成功。`/icon.svg`、`/apple-icon`、`/manifest.webmanifest` の生成を確認。
- ブラウザ確認: ログイン画面に新しいマークが表示され、エラーオーバーレイと console warning/error はなかった。
- `git diff --check`: 成功（改行コードに関するGit警告のみ）。

## Result

ブラウザタブ、Apple端末、インストール可能なWebアプリ、およびアプリ内で一貫したアイコンを使用できるようになった。

## Remaining Issues

- `npm run verify:fast` 内の `rm -rf` は Windows では実行できないため、同等のテスト・lint・buildを個別に実行した。
- `npm ci` は既存依存に4件（moderate 1、high 3）の監査警告を報告した。今回の変更範囲では依存更新を行っていない。
- 現在状態・責務境界・データフローは変わらないため、`CURRENT.md` と `ARCHITECTURE.md` の更新は不要と判断した。
