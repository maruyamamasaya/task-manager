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
