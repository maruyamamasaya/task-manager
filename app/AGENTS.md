# Next.js application rules

このファイルは `app/` 配下に適用します。共通ルールはルート [`AGENTS.md`](../AGENTS.md) を先に参照してください。

- 読み取りは既存どおり Server Component、書き込みは機能ディレクトリの Server Action を基本とし、必要なく client 境界を広げない。
- 保護画面は `(app)/layout.tsx` の `getUser()` による認証を迂回しない。入力検証、所有権条件、RLS のいずれも弱めない。
- 書き込み後は、そのデータを表示する既存 path を追跡して必要な `revalidatePath` を行う。
- DB query を追加する前に呼び出し頻度と取得範囲を確認し、一覧内の N+1 query を避ける。
- route / action の変更では、関連する `components/`、`lib/`、DB migration、テストを references / exact search で確認する。
- 検証は [`TESTING.md`](../TESTING.md) の「Route / Server Action / data access」に従う。
