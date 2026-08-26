# Task Manager

予定・実績・進捗・スケジュール・振り返りを、中心となる `Task` に関連付けて管理する Web アプリです。Phase 2 では Supabase に永続化する階層タスク、Project、Today、Markdown Import / Export を提供します。

## 技術構成

- Next.js（App Router）/ React / TypeScript
- Tailwind CSS
- Supabase Auth / PostgreSQL / Row Level Security
- Vercel

## セットアップ

前提: Node.js 20.9 以上、npm、必要に応じて [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)。

```bash
npm install
cp .env.example .env.local
```

Supabase Dashboard の **Project Settings > API** で表示される値を `.env.local` に設定します。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Publishable key（旧プロジェクトでは anon key）はブラウザ公開用です。`service_role` key はアプリの環境変数に設定せず、コミットしないでください。

## Supabase の準備

1. Supabase プロジェクトを作成します。
2. **Authentication > Providers > Email** で Email/Password を有効にします。
3. Dashboard からテストユーザーを作成します（本フェーズにはサインアップ画面を含みません）。
4. CLI でプロジェクトをリンクし、migration を適用します。

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

DB のテーブル、カラム、制約、index、trigger、RLS、RPC を変更する開発では、既存 migration を書き換えず、必ず `supabase/migrations/` に新しい SQL を追加します。これにより既存の Supabase 環境にも `npx supabase db push` で同じ変更を適用できます。

## 親タスク（フォルダ）の扱い

子タスクが1件でも追加された親は、自動的に整理用の**フォルダ**になります。フォルダでは完了、進捗、優先度、期限、予定工数、タイマー、実績、スケジュール、振り返りを操作できません。子タスクを追加した時点で親のタスク状態・進捗・期限・予定工数はクリアされます。既存の実績やスケジュールは履歴保全のため削除しませんが、新規追加はDB triggerでも拒否します。このルールは `20260826000000_parent_tasks_become_folders.sql` で既存環境にも適用されます。

既存環境にも `npx supabase db push` で Phase 2 migration を適用してください。初期 migration は7テーブル、外部キー、検査制約、インデックス、更新日時トリガー、および全テーブルの RLS を作成します。RLS は認証ユーザーの `auth.uid()` と `user_id`（profile は `id`）を照合し、関連する project/task も同一ユーザー所有か検証します。Phase 2 migration は3階層制約と、RLSを維持した原子的な完了連動RPCを追加します。

ローカル起動:

```bash
npm run dev
```

`http://localhost:3000/login` からログインします。品質チェックは `npm run lint`、`npm test`、`npm run build` で実行できます。

## ルートと構成

- `/login`: Email/Password ログイン
- `/dashboard`: Phase 1 ダッシュボード
- `/today`, `/tasks`, `/schedule`, `/projects`, `/reflections`, `/analytics`: 今後の機能用ページ
- `app/`: route、layout、Server Action
- `components/`: 認証、共通レイアウト、UI
- `lib/supabase/`: browser/server/middleware 用 Supabase client
- `types/`: ドメイン型
- `supabase/migrations/`: PostgreSQL schema と RLS

保護ルートは middleware で未認証アクセスを `/login` に戻し、サーバーレイアウトでも `getUser()` により再検証します。

## Vercel へのデプロイ

1. GitHub リポジトリを Vercel に Import します。Framework Preset は Next.js、Build Command は `npm run build` の既定値を使います。
2. Production / Preview / Development の必要な範囲に以下を登録します。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Supabase Auth の **URL Configuration** で Site URL を本番 Vercel URL に設定し、必要な Preview URL を Redirect URLs に追加します。
4. migration 適用後にデプロイします。

## Phase 1 の範囲

タスク CRUD、ドラッグ＆ドロップ、タイマー、カレンダー、分析グラフ、振り返り入力などは意図的に未実装です。次フェーズでは Task を中心に project、階層、ステータス、期限を扱う CRUD と、その操作に対する統合テストを追加します。

## Phase 3: Schedule / Work Log / Timer

- **予定工数**は `tasks.estimated_minutes`（分）、時間帯への配置は `task_schedules.start_at/end_at` であり、互いに独立しています。`/schedule` で日付、Task、開始・終了を指定し、重複は許可しつつ警告します。
- **実績**は `work_logs.minutes` の合計です。Task Drawer から任意分数または +15 / +30 / +60分を追加でき、履歴の note、分数を編集・削除できます。`actual - estimated` を差分、`actual / estimated * 100` を予定比として表示します（予定なしでは比率を表示しません）。
- **タイマー**は開始時に `started_at` をDBへ保存し、画面はその値と現在時刻との差を表示します。更新・画面移動・再ログイン後も復元され、停止時に `ended_at` と分数を確定します。Phase 3 migration の partial unique index とRPCにより、ユーザーごとの作業中ログは1件だけです。
- 一覧は Task ごとの問い合わせを行わず、Work Log / Scheduleを一括取得して集計します。日次実績は **started_at の Asia/Tokyo 上の日付**に全量を帰属させ、深夜をまたぐログも分割しません。日次予定は `start_at` の日付に帰属します。
- DBは `timestamptz`（UTC ISO文字列）で保存し、入力・表示・日付境界は `Asia/Tokyo` とします。追加の外部サービスや環境変数はありません。

既存プロジェクトではデプロイより先に `npx supabase db push` を実行し、`20260825020000_phase3_schedule_work_logs.sql` を適用してください。既存RLSは `user_id = auth.uid()` に加えて関連Taskの所有権も restrictive policy で検証し続けます。

Reflection入力、Progress履歴、Analyticsグラフ、AI分析、通知、外部カレンダー連携は後続Phaseの範囲です。

## Phase 4: 進捗管理・振り返り

- `tasks.progress`（0〜100 の整数）を現在進捗の正本とします。保存操作時だけ `update_task_progress` RPC を呼び、Task 更新と `progress_logs` 追加を同一トランザクションで実行します。同率の再保存は no-op なので履歴を増やしません。
- 進捗 0 / 1〜99 / 100 はそれぞれ `todo` / `doing` / `done`。100 到達時に `completed_at` を初回設定し、100 から下げると解除します。
- 子Taskを持つ親の進捗は、直属の子Task（親自身の手動作業は含めない）の単純平均を四捨五入し、祖先まで再計算します。Tasks のサマリーは現在のフィルターに含まれる全Taskの単純平均です。
- Reflection は Task ごとに1件です。`UNIQUE(task_id)` と upsert により再保存は編集になります。将来、複数回の振り返りが必要になった場合は履歴テーブルへの分離を Phase 5 以降で検討します。
- `/reflections` は完了Task・Project・Work Log・Reflectionを4本の一括クエリで読み、メモリ上のMapで結合します（TaskごとのN+1なし）。振り返り済み一覧と未入力件数、予定・実績・差分を表示します。
- Projects の進捗は、そのProjectに属する全Taskの `progress` 単純平均です。完了数 / 全Task数も併記します。
- `20260825030000_phase4_progress_reflections.sql` はRPC、Reflection一意制約、履歴用indexを追加します。既存のrestrictive RLSにより、`user_id` に加えて関連Taskがログインユーザー所有であることを検証します。RPCも `auth.uid()` とRLSの両方を維持します。
- Task Drawerでは明示的な保存を採用し、slider操作ごとのDB書き込みを避けます。Reflectionも明示保存のため、エラー時は入力を画面に保持して再試行できます。
- Phase 5ではAnalytics、長期進捗トレンド、複数Reflection履歴、通知・AI支援を扱います。

## Phase 5: Dashboard / Analytics

### 画面の役割

- `/dashboard` は「今日何をするか・今どうなっているか」の概要です。Tokyo日付、今日のSchedule件数と時間、実績、日次差分、完了、振り返り待ち、稼働中タイマー、時系列Schedule、完了Task、Project進捗を表示し、操作画面へリンクします。Todayは引き続き今日のTaskを操作する画面です。
- `/analytics` は「過去の結果・傾向・見積り・改善」を見る画面です。7 / 30 / 90日 / 全期間とProjectで絞り込み、KPI、日別予定/実績/完了、Project集計、曜日別平均、進捗更新、Reflection、予定超過上位を表示します。グラフの下には同じ値のテキスト表を置き、色だけに依存しません。

### 指標定義

- **Task予定工数**: 期間内に `completed_at` があるTaskの `tasks.estimated_minutes` 合計。**Schedule予定**とは別の値です。
- **Schedule予定**: `task_schedules.start_at` のTokyo日付に、`end_at - start_at` の全分数を帰属させた値です。日をまたぐ予定も開始日に帰属します。
- **実績工数**: 期間内に `started_at` がある `work_logs.minutes` の合計。稼働中は `started_at` から表示時刻までを算出します。日をまたぐログも開始日に帰属します。
- **Task予実差分**: 期間実績 − 期間内完了Taskの予定工数。日次グラフの差分は実績 − Schedule予定です。
- **平均予定比**: 予定が1分以上の比較対象Taskごとに `actual / estimated × 100` を求めた単純平均です。
- **平均見積り誤差**: 同じ比較対象について `abs(actual - estimated) / estimated × 100` の単純平均です。予定0 / 未設定は両指標から除外します。「予定内」は `actual <= estimated` の割合です。
- **1稼働日平均**: 実績が1分以上ある日の実績合計 ÷ 稼働日数。**平均Task完了時間**は期間内完了Taskの `created_at` から `completed_at` までの経過時間です。
- **Reflection入力率**: 期間内完了TaskのうちTask単位のReflectionが存在する割合です。完了数は常に `completed_at` 基準で、`status=done` のみの異常行は数えません。
- **Project集計**: Projectに直接属する全Taskを同じ重みで数え、平均進捗・完了/総数を表示します。Projectなしは「未分類」です。親子Taskもそれぞれ直接保存された予定・Work Logだけを1回ずつ集計し、親へ子の工数を暗黙加算しないため二重加算しません。

### Query・セキュリティ・性能

AnalyticsはServer ComponentでTaskを一括取得し、Work Log / Schedule / Progress Logは選択期間を `gte` / `lt` で**DB Query時に制限**します。Project選択時は取得済みTask IDを各一括Queryの `in` 条件へ渡します。ReflectionとProjectも一括取得し、Taskごとの問い合わせは行わず、純粋関数で集計済みの小さな配列だけをChartへ渡します。この方式は少〜中規模の個人利用でRPCの保守コストを増やさずN+1を避けられるため採用しました。ポーリングはなく、画面遷移とServer Action後のrevalidateだけで更新します。

すべて通常のSSR Supabase clientとログインユーザーのセッションを利用し、service role keyは使用しません。既存の `user_id = auth.uid()` とTask所有権のrestrictive RLSがDashboard / Analyticsにも適用されます。Phase 5 migration `20260825040000_phase5_analytics_indexes.sql` は `tasks(user_id, completed_at)`（完了行のみ）、`tasks(user_id, project_id)`、`progress_logs(user_id, created_at)`、`reflections(user_id, created_at)` を追加します。Work LogとScheduleのユーザー+日時indexはPhase 3ですでに存在します。既存環境ではデプロイ前に `npx supabase db push` を実行してください。

タイムゾーンは全画面で **Asia/Tokyo**、DB保存は `timestamptz` です。今後のPhase 6候補はCustom Range、CSV、時間帯分析、複数Reflection履歴、AI分析、通知、チーム共有、Calendar / Slack連携です。本Phaseではこれら外部連携、課金、管理画面を実装しません。
