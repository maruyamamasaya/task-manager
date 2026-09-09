# AI 開発ガイド

このファイルは、このリポジトリで作業する AI エージェントの入口です。より深い階層の `AGENTS.md` は、その配下では本ファイルより優先されます。

## Project Context Guard v1

この Guard は、別プロジェクト向けの要求による誤変更を防ぎつつ、Taskflow に正当に関係する新機能や新技術の採用を妨げないための変更前ゲートです。

### Project Context

- **Project Name:** Taskflow（package 名は `task-manager`）
- **Purpose:** 認証ユーザーが仕事を Project、実行 Task、独立した共同編集 WBS に整理し、予定・実績時間・進捗・振り返り・分析を管理する、日本語 / `Asia/Tokyo` 前提の Web アプリ。
- **Primary Stack:** Next.js App Router、React、TypeScript、Tailwind CSS、Supabase Auth / PostgreSQL / Row Level Security、Vercel。
- **Main Domains:** 認証と所有権、Project / 階層 Task、Today / Schedule、会議・休日・勤務時間、Work Log、進捗・Reflection・Analytics、共有 WBS、IndexedDB cache、利用者マニュアル。
- **Expected Work:** 上記ドメインの機能追加・修正・テスト・UI・アクセシビリティ・性能・セキュリティ・データ migration・文書・運用改善。目的や既存機能に接続できるなら、新しいライブラリ、外部連携、基盤技術、未実装機能の提案・導入も対象になり得る。
- **Clearly Unrelated Examples:** 別名の製品を対象と明記した EC 在庫・注文決済システム、動画配信サービスのエンコード基盤、モバイルゲーム固有の Unity scene、組み込み機器 firmware、またはこのリポジトリに存在しない別製品固有の package / route / schema を前提とした変更。例に含まれる一般技術を使うこと自体は無関係の根拠にしない。

### 変更前の判定

すべてのファイル変更、新規作成、依存追加、DB 変更、commit、push、破壊的コマンドの前に、次の順で実施する。

1. `git rev-parse --show-toplevel` などの read-only コマンドで Git root を確認し、この `AGENTS.md` が属するリポジトリと一致することを確認する。明示的な許可なしに現在のリポジトリ外を変更しない。
2. ユーザー要求全体を Project Context、`CURRENT.md`、関連する `CODEMAP.md` / `ARCHITECTURE.md`、実コードと照合し、次のいずれかに判定する。
   - **MATCH:** Taskflow の目的、ドメイン、保守、開発基盤のいずれかに明確に関係する。通常どおり既存の調査手順へ進む。
   - **UNCERTAIN:** 関連性を合理的に説明できる可能性はあるが、対象や接続点がまだ確認できない。即拒否・即変更せず、`rg`、ファイル閲覧、Git 情報などリポジトリ内の read-only 調査を追加して再判定する。調査後も重要な解釈が複数残り、安全に対象を特定できなければユーザーへ確認する。
   - **MISMATCH:** 要求が別プロジェクト向けであることを示す、複数の独立した具体的矛盾がある。たとえば、別の Project Name に加え、Taskflow に存在せず目的にも接続しない製品固有のファイル、機能、データモデル、技術構成を同時に前提としている場合。
3. 一般的な技術名、未知のライブラリ、単一のファイル名や単一キーワードだけでは `MISMATCH` にしない。Taskflow への合理的な接続可能性があれば `MATCH` または `UNCERTAIN` とし、正当な新機能を拒否しない。

`MISMATCH` と判定した場合は、ファイル変更、新規作成、依存追加、DB 変更、commit、push、破壊的コマンドを一切行わない。回答は次の項目だけを簡潔に報告する。

- `Current Project: Taskflow`
- `Reason:` 複数の矛盾から別プロジェクト向けと判断した理由
- `Conflicting Prompt Elements:` 確認できた具体的な矛盾
- `No files were modified.`

## 作業開始時

1. 本ファイルを読む。
2. [`CURRENT.md`](CURRENT.md) で現在の機能、制約、優先事項を確認する。
3. [`CODEMAP.md`](CODEMAP.md) から機能の入口と検索語を選び、必要な節だけ [`ARCHITECTURE.md`](ARCHITECTURE.md) で確認する。
4. symbol 名が不明なら利用可能な semantic / repository search、判明後は symbol・exact・references search（Language Server、IDE、`rg`、`git grep` など）で対象を絞る。
5. definition、呼び出し元・呼び出し先、関連テスト、設定、データ依存を確認してから変更する。対象に近い `AGENTS.md` と関連 ADR も読む。

「検索 → 対象特定 → 必要な部分だけ読む」を基本とし、全ドキュメント、全コード、全 session を無条件に読みません。取得するコンテキストは (1) `AGENTS.md` + `CURRENT.md`、(2) 関連する code map / architecture、(3) 検索結果、(4) 対象、(5) 依存とテストの順です。コードと文書が食い違う場合はコードを現在状態の一次情報として確認しますが、意図は推測せず記録します。

## 実装ルール

- 推測だけで変更せず、既存実装とテストを調査する。
- 既存アーキテクチャ、型、命名、Server Component / Server Action の境界に合わせる。
- タスクに無関係な整形、リファクタリング、依存更新を混ぜない。
- RLS、認証、所有権検証、入力検証を安易に弱めない。`service_role` key をアプリに追加しない。
- エラーを隠すだけの回避策を恒久対応にしない。暫定対応なら制約と撤去条件を記録する。
- DB を変更するときは [`supabase/AGENTS.md`](supabase/AGENTS.md) に従い、既存 migration を編集せず新規 migration を追加する。
- `app/` の route、Server Component、Server Action を変更するときは [`app/AGENTS.md`](app/AGENTS.md) に従う。
- `CURRENT.md` と `ARCHITECTURE.md` には現在有効な事実だけを置く。理由は ADR、作業経緯は session に分離する。

## 検証コマンド

標準検証と変更種別ごとの追加検証は [`TESTING.md`](TESTING.md) を正本とします。

```bash
npm run verify:fast  # 実装中
npm run verify       # 完了前
git diff --check
```

起動、環境変数、migration、デプロイは [`OPERATIONS.md`](OPERATIONS.md) を参照します。

## ドキュメントの更新条件

- `CURRENT.md`: 現在状態・制約・優先事項が変わったとき。
- `ARCHITECTURE.md`: 責務境界、構成、データフローが変わったとき。
- `CODEMAP.md`: 主要な入口、配置、検索語が変わったとき。
- `TESTING.md`: 検証コマンドや必須検証が変わったとき。
- `OPERATIONS.md`: セットアップ、環境変数、運用、デプロイ方法が変わったとき。
- `decisions/`: 将来の変更で理由の理解が必要な重要判断が発生したとき。
- `sessions/`: AI 作業終了時。Request / Investigation / Changes / Validation / Result / Remaining Issues だけを簡潔に残す。

詳細は正本へリンクし、同じ説明を複数文書へコピーしません。

## Definition of Done

完了前に原則として以下を確認します。

1. 変更に必要なテストを追加・実行した。
2. lint を実行した。
3. 完了前に原則 `npm run verify`（test、lint、build / 型検査）を実行した。
4. DB など標準 verify 外の対象別検証を実行した。
5. `git diff` と `git diff --check` を確認した。
6. ドキュメント更新要否を判定した。
7. `CURRENT.md` を更新した（現在状態に影響しない場合は不要と判断した旨を session に残す）。
8. 構成やデータフローが変われば `ARCHITECTURE.md` を更新した。
9. 長期的に重要で、根拠を確認できる設計判断があれば ADR を追加した。
10. `sessions/YYYY-MM-DD-<topic>.md` に調査、変更、検証、未解決事項を簡潔に記録した。
11. 未解決事項を `CURRENT.md` または session の適切な方に記録した。

小さな一時作業を ADR 化したり、session の全文を `CURRENT.md` に複製したりしません。
