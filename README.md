# Calmant — Your Personal AI Company

An autonomous AI company that lives on your phone. Built with **Next.js 15**, **Prisma**, **Mastra**, and **OpenRouter**.

## Architecture

```
User → CEO Agent → 7 Departments → Knowledge Graph → User
```

| Department | Role |
|---|---|
| 📥 Capture | Parse inputs, create tasks, extract from URLs |
| ⏰ Deadline | Plan, schedule, calendar, decompose work |
| 📬 Comms | Telegram, email, reminders |
| 🛟 Recovery | Overdue triage, rescue plans |
| 🔍 Intel | Memory, research, learnings |
| 🎨 Creator | Documents, summaries, reports |
| 🌐 Browser | Web navigation, forms, screenshots |

## Quick Start

```bash
# 1. Clone and install
cd app
cp .env.example .env   # Fill in your keys
npm install

# 2. Set up database
npx prisma db push

# 3. Run dev server
npm run dev
```

## Docker

```bash
# Build and run everything (app + browser sandbox)
docker compose up --build
```

## Environment Variables

See [.env.example](app/.env.example) for all required and optional variables.

**Required:**
- `DATABASE_URL` — Neon PostgreSQL
- `BETTER_AUTH_SECRET` — Auth secret key
- `OPENROUTER_API_KEY` — AI model access
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth

**Recommended:**
- `TELEGRAM_BOT_TOKEN` — Telegram integration
- `RESEND_API_KEY` — Email notifications
- `GROQ_API_KEY` — Voice transcription

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, Framer Motion
- **Backend:** Next.js API Routes, Prisma ORM, Neon PostgreSQL
- **AI:** OpenRouter (free models), Gemini Flash fallback
- **Orchestration:** Mastra agents
- **Browser:** Playwright in Docker
- **Notifications:** Telegram, Email (Resend), In-app

## License

MIT
