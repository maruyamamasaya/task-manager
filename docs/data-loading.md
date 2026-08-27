# データ読み込み調査とキャッシュ方針

## 現状の読み込み

各ページは従来、Server Component の描画時に Supabase を待っていた。主な参照は以下の通り。

| 画面 | テーブル | タイミング・範囲 |
|---|---|---|
| Dashboard | `task_schedules`, `work_logs`, `tasks`, `projects`, `reflections` | 初期描画。ログ・予定・完了タスクは当日中心 |
| Tasks | `tasks`, `projects`, `task_schedules`, `work_logs`, `reflections` | 初期描画（従来は全件） |
| Today | `tasks`, `task_schedules`, `work_logs`, `projects` | 初期描画。予定・ログは当日 |
| Schedule | `tasks`, `projects`, `task_schedules`, `meetings`, `work_logs`, `day_offs` | 初期描画。表示期間、ログは日のみ |
| Projects | `projects`, `tasks` | 初期描画 |
| WBS 一覧 | `wbs_projects`, `wbs_project_members`, `wbs_items` | 初期描画 |
| WBS 詳細 | `wbs_projects`, `wbs_project_members`, `wbs_items` | 初期描画、選択プロジェクトのみ |
| Reflections | `tasks`, `projects`, `work_logs`, `reflections` | 初期描画（完了タスク、それ以外は全件） |
| Analytics | `tasks`, `work_logs`, `task_schedules`, `reflections`, `projects` | 初期描画。ログ・予定は指定期間 |
| Holidays | `day_offs` | 初期描画 |

書き込みは Server Actions 経由で行い、成功後に対象パスを再検証する。

## 今回の段階的な実装

最も参照件数の多い Tasks を第1段階とした。ユーザー単位のスナップショットを IndexedDB に保存し、再訪時はそれを即時表示してからブラウザの Supabase client で同期する。`updated_at` がある `tasks`、`projects`、`reflections` は通常は前回同期以降だけを取得する。削除やアーカイブも確実に反映するため15分ごとに全件同期する。`task_schedules` は更新日時がないため全件を同期する。

大量化する `work_logs` はキャッシュ・取得とも直近90日と実行中ログに限定した。他画面は既に日・表示期間で絞る箇所が多いため、次段階で Projects、WBS、Schedule の順に同じ方式を適用する。

## Tasks の操作と将来のデータ量

Tasks 再訪時は、認証セッションを確認した直後に IndexedDB のスナップショットを描画し、同期は画面を維持したままバックグラウンドで行う。作成・編集・状態・進捗・期限・優先度・並び順・削除は、UI と同じスナップショットを IndexedDB に書いてから Server Action を実行する。保存失敗時は UI と IndexedDB の両方を操作前へ戻す。

15分ごとの全件同期は、削除を検出できる現在のスキーマで整合性を回復するための安全網であり、タスク件数に比例して転送量と IndexedDB 書き込み量が増える。そのため大規模データ向けの最終設計ではない。件数増加時は、RLS を維持したまま次の順で移行する。

1. 削除を示す tombstone（`deleted_at` または変更履歴テーブル）を追加し、削除も `updated_at` カーソルによる差分取得に含める。
2. 同一時刻の更新を取りこぼさないよう `(updated_at, id)` をカーソルにし、複合インデックスを追加してページ単位で同期する。
3. `task_schedules` にも `updated_at` と削除検出を追加し、現在の全件取得を差分取得へ変更する。
4. Realtime は即時反映の補助として利用し、切断後はカーソル同期で必ず回復する。

上記の削除情報なしに15分全件同期だけを停止すると、別端末で削除されたデータがキャッシュに残るため、現段階では同期間隔とキャッシュ構造を維持する。

## Realtime 購読監査（2026-08-27）

アプリケーションコード全体（`app`、`components`、`lib`、`middleware.ts`）について、Supabase Realtime の channel 作成、`subscribe`、`postgres_changes`、channel の解除処理を調査した。

| 画面・処理 | Realtime channel 数（1ユーザー・1画面） | 備考 |
|---|---:|---|
| Tasks | 0 | IndexedDB を先に表示し、REST/PostgREST の5クエリで再検証する |
| Dashboard / Today / Schedule / Projects / Reflections / Analytics / Holidays / WBS | 0 | Server Component または Server Action から REST/PostgREST を利用する |
| アプリ全体 | **0** | `.channel()`、`.subscribe()`、`postgres_changes` の呼び出しは存在しない |

したがって、同一 channel の重複購読、再レンダリングや `useEffect` の依存配列による再購読、cleanup 時の `removeChannel` / `unsubscribe` 漏れは現行コードにはない。解除対象となる channel 自体が作られていないためである。Tasks のデータローダーの同期 effect は空の依存配列で、unmount 時には `active = false` として完了後の state 更新を止める。React Strict Mode が開発時に effect を再実行してもブラウザ用 Supabase client が増えないよう、`lib/supabase/client.ts` でも明示的に単一インスタンスを再利用する。

### レスポンス増加との切り分け

IndexedDB / stale-while-revalidate 導入後の Tasks 画面は、キャッシュの有無にかかわらずバックグラウンドで `tasks`、`projects`、`task_schedules`、`work_logs`、`reflections` の **5本の REST/PostgREST クエリ**と認証セッション確認を実行する。これらは Realtime の subscribe や Realtime response ではない。画面遷移・再マウントのたびに再検証されるため、Supabase の集計画面で API レスポンス全体を見ている場合は増加要因になり得るが、Realtime channel 数を増やす実装ではない。

Realtime を将来導入する場合は、テーブルごとに channel を作らず、画面単位で安定した名前の1 channelへ必要な `postgres_changes` handlerをまとめ、空の依存配列を持つ effect から一度だけ subscribe すること。cleanup は同じ client と channel を閉じる `removeChannel(channel)` を必須とする。
