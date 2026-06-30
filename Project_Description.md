# Calmant: Your Personal AI Company 
**Hackathon Submission: The Last-Minute Life Saver**

---

## 1. Problem Statement Selected
**The Last-Minute Life Saver**

*Background:* Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, bill payments, interviews, and important commitments. Existing productivity tools often rely on passive reminders that are easy to ignore and do little to help users actually complete their tasks.

*Challenge:* Build an AI-powered productivity companion that proactively assists users in planning, prioritizing, and completing tasks before deadlines are missed. The solution should move beyond traditional reminders and focus on helping users take meaningful action.

---

## 2. Executive Summary & Solution Overview
**Calmant is not a chatbot; it is an autonomous, multi-agent orchestration layer that acts as your digital Chief Executive Officer.** 

To solve the "Last-Minute Life Saver" challenge, we realized that passive push notifications and to-do lists are fundamentally broken. When users are overwhelmed, another notification is just cognitive noise. Calmant solves this by bridging the gap between passive AI chat and active workflow execution. 

Instead of waiting for you to open a productivity app, Calmant integrates natively into the communication channels you already use: **WhatsApp and Email**. It continuously runs background workers that read your schedule, anticipate your upcoming deadlines, and proactively reach out to you with personalized Morning Briefings and Evening Reviews. When a deadline is approaching, Calmant doesn't just remind you—its nested sub-agents (Intel, Communications, and Scheduling) will autonomously scrape the web for required research, block out prep time on your Google Calendar, and draft the email you need to send. 

---

## 3. Key Features (Mapped to Evaluation Criteria)

*   **Intelligent Task Prioritization:** Calmant utilizes a "CEO Agent" router. When you submit a massive brain-dump of tasks, the CEO agent uses Google Gemini to parse the intent, prioritize the tasks based on impending deadlines, and delegate them to the appropriate sub-agents.
*   **Autonomous Task Planning and Execution:** Unlike standard LLMs that just return text, Calmant executes tools. If you ask it to "Prepare me for my investor meeting tomorrow," the Intel Agent spins up a headless Chromium browser, scrapes the investor's recent news, and stores the summary in your persistent Postgres memory database.
*   **AI-Powered Scheduling Assistance:** Calmant features deep, bi-directional syncing with the Google Calendar API. It doesn't just read your calendar; it actively inserts "Focus Blocks" before major deadlines to ensure you have time to work, preventing last-minute panic.
*   **Context-Aware Reminders (Persistent Memory):** Calmant maintains a long-term memory loop. It remembers what you struggled with yesterday, what your long-term goals are, and factors this context into every interaction, ensuring reminders are highly personalized rather than generic alerts.
*   **Voice-Enabled & Omnichannel Assistance:** By integrating the Meta WhatsApp Cloud API via webhooks, Calmant is available in your pocket 24/7. You can send voice notes or text messages directly to Calmant on WhatsApp, completely removing the friction of downloading or opening a dedicated productivity app.
*   **Proactive Background Workers:** You do not need to prompt Calmant for it to work. Built-in Next.js background workers poll your database daily, compiling comprehensive Morning Briefings (what you need to survive today) and Evening Reviews (what you accomplished), delivered via Resend.

---

## 4. System Architecture & Deep Dive

Calmant is built on a highly scalable, serverless nested-agent architecture. 

### The Multi-Agent Routing Engine
1.  **The CEO Agent (Orchestrator):** The entry point for all user requests. It analyzes the prompt and decides whether to handle it directly or route it to a specialist.
2.  **The Intel Agent:** Equipped with a Playwright headless browser sandbox, this agent bypasses standard search API limits by securely rendering and scraping JavaScript-heavy webpages to gather real-time research for the user.
3.  **The Scheduling Agent:** Interfaces exclusively with OAuth 2.0 tokens to manage Google Calendar events, calculate free/busy overlaps, and handle timezone math.
4.  **The Communications Agent:** Formats and dispatches external communications (Drafting emails, formatting WhatsApp payloads).

### Data Flow Lifecycle
1.  **Ingestion:** User sends a WhatsApp message (Meta Cloud API Webhook) or types in the Web UI.
2.  **Context Hydration:** The backend queries the Neon PostgreSQL database (via Prisma) to retrieve the user's past 20 interactions and extracted long-term memory profile.
3.  **Inference:** The hydrated prompt is sent to the Google Gemini model (via OpenRouter) to determine the action plan.
4.  **Execution & Delivery:** External APIs (Calendar, Resend, Playwright) are triggered. The result is saved back to the database and streamed to the user's UI or WhatsApp.

---

## 5. Technologies Used

*   **Core Framework:** Next.js 14 (App Router), React, TypeScript
*   **UI/UX:** Tailwind CSS, Lucide Icons, Markdown rendering
*   **Database & ORM:** PostgreSQL (Dockerized/Neon Serverless), Prisma ORM
*   **Authentication & Security:** Better-Auth (handling secure session tokens and OAuth handshakes)
*   **AI & LLM Orchestration:** OpenRouter Gateway, LangChain prompt engineering paradigms
*   **External Integrations:** 
    *   Meta WhatsApp Cloud API (Omnichannel UX)
    *   Resend (Transactional Email API for Briefings)
*   **Automation:** Playwright (Headless Chromium Browser Sandbox)
*   **Infrastructure:** Docker Compose (Containerization for Web, Sandbox, and DB)

---

## 6. Google Technologies Utilized

1.  **Google Gemini (Reasoning Engine):** Selected as the core brain of the CEO Orchestrator. We utilized Gemini's massive context window and state-of-the-art tool-calling (function calling) capabilities to allow the agent to reliably output structured JSON commands that trigger our backend APIs.
2.  **Google Calendar API (OAuth 2.0):** Deeply integrated to solve the "Scheduling Assistance" requirement. We implemented bi-directional syncing so the AI can read real-time availability and autonomously create events to block out time for last-minute tasks.
3.  **Google Chromium Engine:** Powers our Playwright browser sandbox. To ensure the Intel Agent could actually gather useful context for the user (instead of hallucinating), we use headless Chromium to render modern, dynamic web apps and scrape accurate data.

---

## 7. Technical Challenges Overcome (Why this is hard)

Building a truly autonomous agent is significantly harder than building a standard RAG chatbot. During development, we overcame severe technical hurdles:

*   **The Latency Bottleneck (Nested LLMs):** Having a CEO agent talk to an Intel agent requires multiple sequential LLM network calls. We initially experienced 35+ second response times. We solved this by aggressively flattening the execution graph and utilizing stream responses where possible to keep the UX responsive.
*   **Database Connection Starvation:** Our background workers (processing Morning Briefings for all users) were exhausting the Prisma serverless connection pool and crashing the Node process. We implemented cursor-based pagination and expanded our connection limits to ensure background tasks scale safely.
*   **WhatsApp State Management:** We migrated from a brittle, state-heavy scraping library (Baileys) to the official Meta Cloud API webhooks. This required a complete rewrite of our database schema to ensure asynchronous webhook payloads could be matched to the correct user memory context without race conditions.

---

## 8. Conclusion
Calmant directly answers the challenge of the "Last-Minute Life Saver" by replacing passive guilt-inducing reminders with a proactive, omni-channel AI employee. By leveraging Google Gemini, Google Calendar, and WhatsApp, Calmant ensures that tasks are not just remembered, but aggressively planned for and executed.
