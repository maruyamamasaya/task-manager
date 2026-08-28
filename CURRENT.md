---
status: active
updated: 2026-08-28
---

# 現在の状態

## プロダクト

Taskflow は、認証ユーザーが仕事を Project、実行 Task、独立した共同編集 WBS に整理し、予定・実績・進捗・振り返りを管理する Web アプリです。UI と日付集計は日本語 / `Asia/Tokyo` を前提とします。

### 実装済み

- Email/Password ログインと保護ルート。
- Project の作成、名称・色変更、アーカイブ、削除。
- 最大3階層の Task、Markdown import/export、期限・優先度・予定工数・進捗。子を持つ親 Task は操作対象ではなくフォルダになる。
- Today、日/週/月スケジュール、会議、休日、勤務時間設定。過去の予定・会議は変更を制限する。
- 実績時間の手入力、Work Log、進捗履歴、完了後の Reflection（不要としてスキップも可能）。タイマーのコードとDB機構は残るが、現行マニュアル上の運用は手入力で、タイマー機能は停止扱い。
- Dashboard と期間/Project別 Analytics。
- 通常の Project / Task とはリンクしない WBS Project。最大3階層、共有コード、owner/editor/viewer、参加申請、並べ替え、CSV、ガント表示、親項目の工数・進捗・状態の自動集約を備える。
- Tasks 画面の IndexedDB キャッシュと stale-while-revalidate。Realtime subscription は現時点で使用していない。
- Docsify で配信する利用者マニュアル（`public/manual/`）。

## 既知の制約・未解決事項

- サインアップ画面、パスワード再設定、管理画面はない。利用者は Supabase 側で準備する。
- WBS Project と通常 Project、WBS Item と Task は意図的に別データで、自動連携しない。
- Tasks の差分同期は削除検出のため15分ごとの全件同期を安全網にしており、大規模データ向けの最終形ではない。移行候補は [`docs/data-loading.md`](docs/data-loading.md) に記録されている。
- Realtime、外部カレンダー、Slack、AI分析、課金は未実装。
- CI/CD workflow はリポジトリ内にない。Vercel/Supabase の実環境、デプロイ先、運用責任者はリポジトリから確認できない。
- `types/database.ts` は手書きのアプリ型であり、Supabase CLI による生成手順は確認できない。

## 現在の優先事項

明示された製品ロードマップはありません。次の変更では、上の既知の制約と依頼内容を照合して優先順位を決め、推測で機能計画を作らないでください。

## 次のアクション

1. 変更対象に応じて [`ARCHITECTURE.md`](ARCHITECTURE.md) と関連 ADR を読む。
2. データ同期を拡張する場合は、tombstone / カーソル / pagination を先に設計する。
3. DB 変更は追加 migration とRLSをセットで行う。
4. 実環境に関わる作業では、未確認のデプロイ・Supabase構成を担当者に確認する。
