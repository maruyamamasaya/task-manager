# Project Context Guard v1

## Request

別プロジェクト向けプロンプトによる誤変更を防ぐ変更前 Guard を、アプリ本体へ影響させず AI 開発ガイドへ追加する。

## Investigation

- Git root が Taskflow のリポジトリであることを確認した。
- `AGENTS.md`、`CURRENT.md`、`README.md`、`CODEMAP.md`、`ARCHITECTURE.md` の構成、`package.json`、主要ディレクトリを確認した。
- リポジトリ内に既存の Project Context Guard はなかった。

## Changes

- `AGENTS.md` に Project Context と、`MATCH` / `UNCERTAIN` / `MISMATCH` の変更前判定を追加した。
- `UNCERTAIN` は read-only 追加調査、`MISMATCH` は複数の具体的矛盾を必須とし、一般技術名や単一キーワードによる誤拒否を禁止した。
- `MISMATCH` 時の禁止操作と報告形式、Git root とリポジトリ境界の確認を明記した。

## Validation

- `git diff --check`: 合格。
- 個別テスト: 36/36 合格。
- `npm run verify`: Windows で `rm -rf` を実行できず、テスト開始前に失敗。PowerShell 互換の同等手順でテストを実行した。
- `npm run lint`: 既存の `.next` 生成物も検査対象となり、生成コードの lint error で失敗。今回の Markdown 変更に起因する error はない。
- `npm run build`: 合格。
- 机上確認:
  1. 「Task にタグと絞り込みを追加する」→ Taskflow の Main Domains に直接該当するため `MATCH`。
  2. 「Task の共同編集に新しい同期ライブラリを検討する」→ 新技術自体は矛盾ではなく関連性もあるが、既存境界との接続点を read-only 調査して再判定するため初期判定は `UNCERTAIN`。
  3. 「ShopSphere の Shopify checkout route と inventory schema を Unity client 向けに変更する」→ 別 Project Name、Taskflow にない製品固有 route / schema、無関係な技術構成という複数の矛盾があるため `MISMATCH`。

## Result

AI 開発ガードのみを追加し、アプリ本体の機能・挙動は変更していない。

## Remaining Issues

- なし。
- 現在の製品状態は変わらないため `CURRENT.md` の更新は不要。
