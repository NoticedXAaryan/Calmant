# Calmant

Calmant is a personal AI company. It takes a messy commitment, turns it into a goal, and keeps the next action in front of you. The assistant can plan, research, and draft work, then stops for approval before it sends a message, changes a calendar, or submits a form.

Live app: [calmant.aaaryan.space](https://calmant.aaaryan.space)

## Highlights

- **Command center.** Today’s goals, blockers, pending approvals, and the latest report in one view.
- **Goals and project cells.** A goal opens a project the assistant can ideate, research, plan, build, validate, and deliver.
- **Approvals.** External actions wait until you approve or reject them.
- **Assistant.** Chat, delegated work, and a memory of preferences and facts.
- **Channels.** Email and password or Google sign-in, Telegram, Resend email, and a Playwright browser sandbox.
- **Background work.** A database-backed job poller sends due reminders, morning briefings, evening reviews, and health probes.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Base UI |
| Data | PostgreSQL, Prisma 6 |
| Auth | Better Auth (email/password and Google) |
| Jobs | Prisma `BackgroundJob` poller. BullMQ workers are present but disabled unless Redis is running |
| Models | OpenRouter, Gemini, and Groq, selected per task |
| Channels | Telegram, Resend, Google Calendar and Gmail scopes |
| Sandbox | Separate Express + Playwright service in `sandbox/` |
| Deploy | Docker standalone image, Compose, Traefik labels for `calmant.aaaryan.space` |

## Status

The app is a working product skeleton with a real dashboard, auth, data model, and agent loop. A few paths are still stubs:

- Google Calendar sync records a timestamp and does not pull events yet (`src/lib/services/calendar-sync.ts`).
- Alert quiet hours are stored and not evaluated yet (`src/lib/alert-policy.ts`).
- BullMQ workers in `src/lib/workers.ts` are intentionally disabled so local dev does not crash without Redis. The polling worker in `src/lib/worker.ts` is the one the app starts.
- `src/worker.ts` only logs the morning and evening cron ticks. The real briefing logic lives in `src/lib/worker.ts`.
- An internal Hermes task route remains at `/api/internal/hermes/tasks`. The Hermes service itself is no longer in Compose.
- Playwright end-to-end coverage exists in `test/e2e/` and is not part of `npm test`.
- Full runs need a database and API keys. Without them, sign-in, model calls, email, and Telegram stay offline.

## Setup

Requirements: Node.js 22, a PostgreSQL database, and the keys below.

```bash
cp .env.example .env
npm ci
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Session signing secret. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Public app URL, `http://localhost:3000` locally |
| `DATABASE_URL` | PostgreSQL connection string |

### Recommended

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Primary model access |
| `GEMINI_API_KEY` | Gemini fallback and embeddings |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in, Calendar, and Gmail |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Transactional email |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `GROQ_API_KEY` | Voice transcription |
| `REDIS_URL` | Only if you turn the BullMQ workers back on |

The browser sandbox is optional. From `sandbox/`, install dependencies and run `npm start` (port 4000), or use Compose:

```bash
docker compose up --build
```

Compose expects an external Docker network named `dokploy-network`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |

CI runs lint, typecheck, and unit tests on every push and pull request.

## Project map

```
src/app/                routes, dashboard, and API handlers
src/components/         UI, including the command center and assistant
src/lib/harness/        classify, plan, execute, synthesize
src/lib/execution/      multi-phase goal loop
src/lib/services/       goals, memory, reports, calendar, email, telegram
src/lib/worker.ts       background job poller
prisma/schema.prisma    PostgreSQL schema
sandbox/                headless browser service
```

Authenticated pages live under `/dashboard`: today, goals, approvals, schedule, habits, assistant, automations, notifications, integrations, activity, memory, and settings.

## Not in this repo

Calmant is not a fork. There is no upstream to sync.

Do not commit `.env`. Copy `.env.example` and fill secrets locally or in the host’s secret store.
