<div align="center">

<br/>

<!-- BANNER SVG -->
<svg width="800" height="200" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0f11"/>
      <stop offset="100%" style="stop-color:#1a1a2e"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.1"/>
    </linearGradient>
    <filter id="blur1">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <!-- background -->
  <rect width="800" height="200" rx="16" fill="url(#bg)"/>
  <!-- grid lines -->
  <g stroke="#ffffff" stroke-width="0.5" opacity="0.04">
    <line x1="0" y1="40" x2="800" y2="40"/>
    <line x1="0" y1="80" x2="800" y2="80"/>
    <line x1="0" y1="120" x2="800" y2="120"/>
    <line x1="0" y1="160" x2="800" y2="160"/>
    <line x1="100" y1="0" x2="100" y2="200"/>
    <line x1="200" y1="0" x2="200" y2="200"/>
    <line x1="300" y1="0" x2="300" y2="200"/>
    <line x1="400" y1="0" x2="400" y2="200"/>
    <line x1="500" y1="0" x2="500" y2="200"/>
    <line x1="600" y1="0" x2="600" y2="200"/>
    <line x1="700" y1="0" x2="700" y2="200"/>
  </g>
  <!-- glow blobs -->
  <circle cx="620" cy="60" r="120" fill="#3b82f6" opacity="0.12" filter="url(#blur1)"/>
  <circle cx="160" cy="160" r="90" fill="#8b5cf6" opacity="0.08" filter="url(#blur1)"/>
  <!-- eyebrow pill -->
  <rect x="60" y="42" width="160" height="22" rx="11" fill="#1e3a5f" opacity="0.8"/>
  <text x="140" y="57" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#60a5fa" font-weight="500" letter-spacing="0.06em">MULTI-AGENT AI</text>
  <!-- title -->
  <text x="60" y="110" font-family="system-ui,sans-serif" font-size="52" fill="#ffffff" font-weight="600" letter-spacing="-0.03em">Calm<tspan fill="#3b82f6">ant</tspan></text>
  <!-- subtitle -->
  <text x="60" y="138" font-family="system-ui,sans-serif" font-size="14" fill="#94a3b8">Your autonomous AI company — managing life across WhatsApp, email &amp; the web.</text>
  <!-- dots decoration -->
  <circle cx="720" cy="100" r="4" fill="#3b82f6" opacity="0.6"/>
  <circle cx="740" cy="80" r="2.5" fill="#8b5cf6" opacity="0.5"/>
  <circle cx="755" cy="115" r="3" fill="#60a5fa" opacity="0.4"/>
  <circle cx="700" cy="130" r="2" fill="#3b82f6" opacity="0.3"/>
  <circle cx="770" cy="65" r="2" fill="#a78bfa" opacity="0.4"/>
</svg>

<br/>
<br/>

<!-- BADGES -->
[![MIT License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](pulls)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=flat-square&logo=postgresql&logoColor=white)](https://prisma.io)
[![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter-6366f1?style=flat-square)](https://openrouter.ai)

</div>

<br/>

> [!NOTE]
> **Calmant is not a chatbot.** It is a persistent multi-agent system that runs continuously in the background, syncs with your calendars, and proactively manages tasks on your behalf — no manual prompting required.

<br/>

## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🤖 Multi-agent routing</h3>
      A CEO Agent dynamically delegates to specialised sub-agents — Intel, Comms, and Scheduling — for complex task orchestration with minimal latency.
    </td>
    <td width="50%" valign="top">
      <h3>📱 WhatsApp integration</h3>
      Talk to Calmant directly from WhatsApp via the Meta Cloud API. No extra apps to download or configure.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📅 Google Calendar sync</h3>
      Full bi-directional sync. Calmant reads your schedule and autonomously creates, edits, and cancels events on your behalf.
    </td>
    <td width="50%" valign="top">
      <h3>🌐 Browser sandbox</h3>
      Spins up a headless Playwright browser to scrape web pages, read documentation, and summarise links — securely sandboxed.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🧠 Persistent memory</h3>
      Maintains a context database of your preferences, ongoing projects, and daily routines across every session.
    </td>
    <td width="50%" valign="top">
      <h3>⚡ Background workers</h3>
      Automated morning briefings and evening reviews delivered straight to your inbox via Resend.
    </td>
  </tr>
</table>

<br/>

## Architecture

| Layer | Technology |
|---|---|
| **Frontend & API** | Next.js 14 (App Router) · TailwindCSS |
| **Database** | PostgreSQL (Docker) · Prisma ORM |
| **Auth** | Better-Auth |
| **LLM orchestration** | OpenRouter — Gemini, Claude, GPT-4 |
| **Email** | Resend |
| **Browser automation** | Playwright (headless) |

<br/>

## Getting started

### Prerequisites

- [Docker](https://docker.com) and Docker Compose installed

---

### 1 · Clone and configure

```bash
git clone https://github.com/yourusername/calmant.git
cd calmant
cp .env.example .env
```

---

### 2 · Fill in your environment keys

Open `.env` and add the following:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Run `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) → API Keys |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |

---

### 3 · Start the stack

Launches the web app, browser sandbox, and database together as one unit:

```bash
docker-compose up -d --build
```

---

### 4 · Sync the schema *(first run only)*

```bash
docker-compose exec web npx prisma generate
docker-compose exec web npx prisma db push
```

Visit **<http://localhost:3000>** to begin onboarding.

<br/>

## Contributing

High-leverage contribution areas: reducing agent orchestration latency, building new tool plugins, and improving UX. All PRs are welcome.

```
Fork → branch → commit → push → open PR
```

Before opening a PR, run:

```bash
npm run lint
```

<br/>

---

<div align="center">
  <sub>MIT License · Built by the NoticedXAaryan</sub>
</div>
