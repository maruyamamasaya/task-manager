---
status: active
updated: 2026-09-07
---

# Operations

## Local setup and startup

Prerequisites are Node.js 20.9 or newer, npm, and Supabase CLI only when applying migrations.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/login`. The application has no sign-up screen, so users must be provisioned in Supabase Auth.

## Environment variables

The canonical names and placeholders are in [`.env.example`](.env.example):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Both are intentionally browser-publishable. Do not add or expose a Supabase `service_role` key. Environment lookup is centralized in `lib/supabase/env.ts`; search that symbol before changing configuration.

## Database migrations

Follow [`supabase/AGENTS.md`](supabase/AGENTS.md). For a confirmed development target:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Repository migrations are additive and must be deployed before application code that depends on them.

## Deployment

The intended topology is Supabase for Auth/PostgreSQL and Vercel for Next.js. Configure the two public variables in Vercel and align Supabase Auth Site URL / Redirect URLs with the environment. Apply migrations first, then deploy the application.

No CI/CD workflow, production/preview project identifiers, deployment URL, rollback runbook, monitoring setup, or named operator is committed in this repository. Confirm these externally before operating an environment; do not infer them from placeholders.

## Health and validation

Build and test commands are centralized in [`TESTING.md`](TESTING.md). There is no repository-defined runtime health endpoint or automated migration/security check beyond the documented review and Supabase CLI flow.
