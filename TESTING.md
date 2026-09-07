---
status: active
updated: 2026-09-07
---

# Testing and validation

## Standard entry points

During implementation, run the fast suite:

```bash
npm run verify:fast
```

Before completion, run the full suite:

```bash
npm run verify
git diff --check
```

`verify:fast` runs test compilation/tests and ESLint. `verify` additionally runs the production Next.js build, which performs application TypeScript checking. `npm test` itself compiles test-targeted TypeScript with `tsc -p tsconfig.test.json` before Node's test runner. There is no separate E2E suite or standalone application `typecheck` script.

When iterating on one test, the generated `.test-dist` is an implementation detail of `npm test`; prefer the standard scripts before completion rather than relying only on a direct generated test invocation.

## Validation map

| Change type | Required validation |
| --- | --- |
| Documentation only | relevant link/path review, `git diff --check`; run full verify when commands/configuration changed |
| Pure logic in `lib/` | relevant unit test, then `npm run verify` |
| UI / Client Component | `npm run verify:fast`, focused browser check when runnable, then `npm run verify` |
| Route / Server Component | query and auth-path review, relevant tests, `npm run verify` |
| Server Action / data access | input, ownership/RLS, callers and revalidation paths review; relevant tests and `npm run verify` |
| Authentication / environment | cookie/env tests, protected-route review, `npm run verify`; never expose a secret key |
| Database migration / RPC / RLS | follow `supabase/AGENTS.md`, inspect application references/types, run repository verify and migration validation below |
| Architecture or shared configuration | `npm run verify`, `git diff --check`, and update the corresponding canonical document |

## Focused tests

Tests use the Node test runner and live in `tests/*.test.ts`. Find the closest suite by feature through [`CODEMAP.md`](CODEMAP.md) or:

```bash
rg -n "test\(" tests
rg -n "<symbol-or-table>" tests app components lib supabase/migrations
```

Add or adjust a focused regression test when behavior changes. Test names should state the behavior so a feature or failure message can be found with exact search.

## Database validation

For a linked disposable/development Supabase project, validate additive migrations with:

```bash
npx supabase db push
```

This requires the Supabase CLI, authentication, and a correctly linked non-production project. Never infer a target project or run destructive commands against an unidentified environment. If unavailable, report the limitation and still inspect SQL ordering, policies, references, and `git diff --check`.
