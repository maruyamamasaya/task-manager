# AI 開発ガイド

このファイルは、このリポジトリで作業する AI エージェントの入口です。より深い階層の `AGENTS.md` は、その配下では本ファイルより優先されます。

## 作業開始時

1. 本ファイルを読む。
2. [`CURRENT.md`](CURRENT.md) で現在の機能、制約、優先事項を確認する。
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) で変更対象の責務とデータフローを確認する。
4. タスクに関係する [`decisions/`](decisions/) の ADR と、必要ならリンク先の詳細資料だけを読む。
5. 関連コード、migration、テスト、Git 履歴を調査してから変更する。

全ドキュメントや全 session を無条件に読みません。session は調査経緯が必要な場合だけ参照します。コードと文書が食い違う場合はコードを現在状態の一次情報として確認しますが、意図は推測せず、不明点として記録します。

## 実装ルール

- 推測だけで変更せず、既存実装とテストを調査する。
- 既存アーキテクチャ、型、命名、Server Component / Server Action の境界に合わせる。
- タスクに無関係な整形、リファクタリング、依存更新を混ぜない。
- RLS、認証、所有権検証、入力検証を安易に弱めない。`service_role` key をアプリに追加しない。
- エラーを隠すだけの回避策を恒久対応にしない。暫定対応なら制約と撤去条件を記録する。
- DB を変更するときは [`supabase/AGENTS.md`](supabase/AGENTS.md) に従い、既存 migration を編集せず新規 migration を追加する。
- `CURRENT.md` と `ARCHITECTURE.md` には現在有効な事実だけを置く。理由は ADR、作業経緯は session に分離する。

## 検証コマンド

構成に応じて次を実行します（存在しないコマンドを無理に実行しません）。

```bash
npm test
npm run lint
npm run build
git diff --check
git diff
```

`package.json` に独立した `typecheck` script はありません。通常のアプリ型検査は `next build`、テスト対象の型検査は `npm test` 内の `tsc -p tsconfig.test.json` が担います。DB 変更時は利用可能な環境で `npx supabase db push` も確認します。

## Definition of Done

完了前に原則として以下を確認します。

1. 変更に必要なテストを追加・実行した。
2. lint を実行した。
3. 利用可能な typecheck を実行した。
4. build を実行した。
5. `git diff` と `git diff --check` を確認した。
6. ドキュメント更新要否を判定した。
7. `CURRENT.md` を更新した（現在状態に影響しない場合は不要と判断した旨を session に残す）。
8. 構成やデータフローが変われば `ARCHITECTURE.md` を更新した。
9. 長期的に重要で、根拠を確認できる設計判断があれば ADR を追加した。
10. `sessions/YYYY-MM-DD-<topic>.md` に調査、変更、検証、未解決事項を簡潔に記録した。
11. 未解決事項を `CURRENT.md` または session の適切な方に記録した。

小さな一時作業を ADR 化したり、session の全文を `CURRENT.md` に複製したりしません。
