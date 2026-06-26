# Calmant App

This is the active Next.js application for Calmant, a prototype personal execution assistant.

For product and architecture context, start with the root documentation:

- [docs/README.md](../docs/README.md)
- [docs/06-RELIABILITY-EXECUTION-PLAN.md](../docs/06-RELIABILITY-EXECUTION-PLAN.md)

## Current Status

Audit date: 2026-06-26.

| Check | Result |
|---|---|
| Build | Passes with `npm run build`. |
| Prisma schema | Passes with `npx prisma validate`. |
| Lint | Currently fails and must be fixed before production. |
| Background jobs | Installed dependencies exist, but repeating jobs are disabled. |
| Agent storage | Mastra currently warns about in-memory storage during build. |
| Multi-user readiness | Partial. Core data has `userId`, but several routes/integrations still need hardening. |

## Setup

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma validate
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verification

```bash
npx prisma validate
npm run lint
npm run build
```

At the time of this README update, `npm run lint` fails. See the execution plan for the ordered fix list.

## Important Implementation Notes

- Do not use `demo-user` behavior in production.
- Do not route webhooks to the first user in the database.
- Do not rely on global `USER_EMAIL` for user notifications long term.
- Do not rely on in-memory queues or agent state for product-critical behavior.
- Every external side effect should create an auditable record.
- Every background job should include `userId` and an idempotency key.

## Primary Directories

| Path | Purpose |
|---|---|
| `src/app` | App Router pages and API routes. |
| `src/components` | UI components. |
| `src/lib` | Shared application logic, auth, integrations, agent, notifications. |
| `src/services` | Service-layer task and habit logic. |
| `prisma` | Prisma schema and database migrations. |

## Next Engineering Priority

Follow the root execution plan:

1. Fix lint and encoding corruption.
2. Remove production unsafe fallbacks.
3. Make notifications persistent.
4. Add worker and scheduler.
5. Harden integrations.
6. Add durable agent runs and delegated task workflows.
