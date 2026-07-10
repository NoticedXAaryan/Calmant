# Agent System Documentation Manifest

This directory is the handoff package for rebuilding Calmant into a reliable single-owner AI execution companion. It is written for an implementation AI that will write code from these instructions while the human owner directs product intent.

The current product has useful pieces: Next.js APIs, Prisma models for agent runs, tool calls, approvals, artifacts, watchers, Telegram, notifications, Mem0 memory, Google Calendar integration, and a browser sandbox. The missing part is a strict, durable, observable harness that turns those pieces into dependable execution.

## Document Index

Read these files in order before implementing changes:

1. `00_CURRENT_STATE_AUDIT.md`
   - Exact current files, functions, data models, and failure points.
2. `01_OPEN_SOURCE_STACK.md`
   - Open-source and API resources to incorporate, with official links and adoption rules.
3. `02_TARGET_ARCHITECTURE.md`
   - Target system architecture and ownership boundaries.
4. `03_DATA_MODEL_AND_MIGRATIONS.md`
   - Required Prisma model changes and migration policy.
5. `04_AGENT_HARNESS_SPEC.md`
   - Durable run lifecycle, plan schema, risk assessment, approvals, retries, and eventing.
6. `05_TOOL_REGISTRY_AND_MCP_SPEC.md`
   - Tool manifest, MCP requirements, tool safety classes, and exact tools to implement.
7. `06_TELEGRAM_COMMAND_CENTER.md`
   - Telegram as the primary user interface, webhook flow, commands, and progress updates.
8. `07_MEMORY_AND_LEARNING_SYSTEM.md`
   - Memory write/read policy, preference learning, skill learning, and deletion rules.
9. `08_SCHEDULING_NOTIFICATIONS_EMAIL.md`
   - Calendar sync, "five minutes left" reminders, Gmail scanning, and notification escalation.
10. `09_BROWSER_AUTOMATION_AND_ARTIFACTS.md`
    - Browser task procedure, screenshots, selector strategy, downloads, uploads, and validation.
11. `10_LONG_TERM_GOALS_AND_APPLICATIONS.md`
    - Internship/job goal loops, daily opportunity search, custom CVs, outreach, and follow-through.
12. `11_SKILLS_AND_AGENT_ROLES.md`
    - Required agent skill documents and reusable skill format.
13. `12_SECURITY_PRIVACY_APPROVALS.md`
    - Non-negotiable safety rules, data protection, consent, tool permissions, and approval gates.
14. `13_OBSERVABILITY_EVALS_TESTING.md`
    - Logs, traces, evals, replay tests, browser tests, and release gates.
15. `14_IMPLEMENTATION_BACKLOG_FOR_AI_CODER.md`
    - Ordered implementation phases with files and functions to change.
16. `15_AI_CODER_HANDOFF.md`
    - Exact prompt and execution contract for a coding AI such as Gemini, Claude, or Codex.
17. `16_ARCHITECTURE_GAP_ANALYSIS.md`
    - Current architecture shortcomings and exact improvements needed to match the product expectations.
18. `17_OPEN_SOURCE_ADOPTION_RADAR.md`
    - Open-source projects worth adding, deferring, or avoiding, with adoption rules.
19. `18_PREMIUM_UI_REMODEL_SPEC.md`
    - UI remodel direction, local design language, UX priorities, and implementation plan.
20. `procedures/`
    - Step-by-step procedures for common workflows.
21. `skills/`
    - Agent skill documents that can be loaded into an AI agent or converted into product skills.

## Implementation Rule

Do not add another chatbot layer. Replace the existing linear `AgentPipeline` with a durable run engine that:

- stores every phase and tool call,
- streams progress to Telegram and the dashboard,
- pauses for approval before irreversible external actions,
- validates every tool input and output,
- resumes after process restarts,
- captures artifacts and evidence,
- learns only approved or high-confidence preferences,
- is testable by replaying recorded runs.

## Current Working Root

All file references assume this repository root:

`C:\Users\notic\OneDrive\Desktop\Hackathon\Vibe2ship\app`
