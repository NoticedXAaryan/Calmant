# Open-Source Stack and External API Decisions

This document lists the open-source projects and official APIs the rebuild should incorporate. Do not add a dependency just because it is popular. Each dependency must own a clear boundary.

## Durable Orchestration

### LangGraph

Use when implementing graph-shaped agent control flow, interruptible plans, human-in-the-loop pauses, and checkpointed agent state.

Official links:

- https://docs.langchain.com/oss/python/langgraph/overview
- https://docs.langchain.com/oss/python/langchain/frontend/human-in-the-loop

Adoption rule:

- Use LangGraph concepts even if the first implementation is TypeScript/Postgres-native.
- If adding Python agent workers, LangGraph is the preferred orchestrator for planner/executor/synthesizer graphs.
- Human-in-the-loop approval must map to durable interrupts/checkpoints, not an in-memory promise.

### Temporal

Use for long-running, failure-tolerant workflows such as daily job search, recurring Gmail scans, browser form submissions, and multi-day application follow-up.

Official links:

- https://docs.temporal.io/
- https://docs.temporal.io/temporal
- https://temporal.io/how-it-works

Adoption rule:

- Phase 1 may use the existing Prisma `BackgroundJob` and new `AgentEvent` tables.
- Move to Temporal when workflows need to survive deployments, sleep for days, retry activities, or wait for approvals over long periods.
- Do not put nondeterministic LLM calls directly in Temporal workflow code. Put them in Temporal activities.

## Tool Protocol

### Model Context Protocol

Use MCP as the standard boundary for tools that may be used by multiple agents or external clients.

Official links:

- https://modelcontextprotocol.io/docs/getting-started/intro
- https://modelcontextprotocol.io/specification/2025-06-18
- https://modelcontextprotocol.io/specification/2025-06-18/server/tools

Adoption rule:

- Replace `src/lib/tools/mcp.ts` shell execution with a real MCP client.
- MCP servers must expose tools with JSON schemas.
- Tools must be allowlisted per server.
- STDIO MCP servers must be configured by code, not by user text.
- User text must never be interpolated into a shell command that starts an MCP server.

## Browser Automation

### Playwright

Use as the base browser automation library and test runner.

Official links:

- https://playwright.dev/
- https://github.com/microsoft/playwright

Adoption rule:

- Keep Playwright as the deterministic browser layer.
- Every browser action must be reproducible as a Playwright trace or screenshot-backed artifact.
- Use Playwright tests for UI regression and browser workflow smoke tests.

### Stagehand

Use for mixed natural-language and code browser automation where plain selectors are brittle.

Official link:

- https://github.com/browserbase/stagehand

Adoption rule:

- Stagehand can be added as an adapter behind `browser_action`.
- Use it only after the deterministic selector path fails or when a site has dynamic layout.
- Its actions must still emit screenshots, extracted DOM/text, and structured results.

### browser-use

Use as a reference or optional Python worker for browser agent workflows.

Official link:

- https://github.com/browser-use/browser-use

Adoption rule:

- Good for self-hosted AI browser tasks and benchmark-driven exploration.
- Do not replace the product harness with browser-use. Wrap it as one tool or worker.

### Skyvern

Use as an optional workflow automation service for complex form-filling and browser tasks.

Official links:

- https://github.com/skyvern-ai/skyvern
- https://www.skyvern.com/

Adoption rule:

- Useful for application forms and repetitive browser workflows.
- Treat Skyvern as a tool behind approvals. It can fill forms but must not submit applications without explicit approval.

## Model Gateway and Routing

### LiteLLM

Use as the model gateway for routing, spend controls, fallbacks, provider abstraction, and model availability.

Official links:

- https://docs.litellm.ai/
- https://github.com/BerriAI/litellm

Adoption rule:

- Replace hard-coded Gemini-only construction in `TaskClassifier`, `TaskPlanner`, and `TaskSynthesizer`.
- The app should call one OpenAI-compatible LiteLLM endpoint.
- Store model routing decisions on `AgentRun`.
- Use policy:
  - fast model for classification and low-risk extraction,
  - standard model for planning and synthesis,
  - deep model for high-risk multi-step reasoning,
  - fallback model when a provider is down.

## Memory and Retrieval

### Mem0

The repo already uses `mem0ai/oss`. Keep it as the first memory layer for personal preference and behavior memories.

Official link:

- https://github.com/mem0ai/mem0

Adoption rule:

- Wrap Mem0 behind a product-owned `MemoryService`.
- Do not call Mem0 directly from random files.
- Store memory source, confidence, category, and review state in Prisma.

### Qdrant

Use if pgvector becomes limiting or if a dedicated vector store is needed for documents, emails, CVs, opportunity archives, and semantic search.

Official links:

- https://qdrant.tech/documentation/
- https://github.com/qdrant/qdrant

Adoption rule:

- Do not migrate immediately unless pgvector performance or metadata filtering becomes a problem.
- If adopted, Qdrant owns long-form document retrieval while Prisma owns canonical state.

### Letta

Use as a reference for stateful long-horizon agents and memory architecture.

Official link:

- https://github.com/letta-ai/letta

Adoption rule:

- Do not adopt Letta wholesale in phase 1.
- Borrow concepts: core memory, archival memory, self-editing memory with governance, agent identity.

## Observability

### OpenTelemetry

Use for traces, metrics, and logs across Next.js API routes, workers, browser tools, LLM calls, and tool calls.

Official links:

- https://opentelemetry.io/docs/
- https://opentelemetry.io/docs/what-is-opentelemetry/

Adoption rule:

- Every `AgentRun` should have a trace ID.
- Every tool call should be a span.
- Include provider, model, latency, token counts, retries, approval wait time, and artifact IDs.

## Communication APIs

### Telegram Bot API

Telegram is the primary owner interface.

Official link:

- https://core.telegram.org/bots/api

Adoption rule:

- Use webhooks in production.
- Use polling only in local development.
- Use inline keyboards for approvals.
- Store inbound Telegram update IDs for dedupe.

### Google Calendar API

Use for events, free/busy, push notifications, and scheduled reminders.

Official links:

- https://developers.google.com/workspace/calendar/api/guides/push
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/events/watch

Adoption rule:

- Use push notifications for sync where possible.
- Persist channel IDs, resource IDs, expiration times, and sync tokens.
- Never schedule over existing events without user permission.

### Gmail API

Use for email scanning, outcome detection, draft creation, and reply tracking.

Official links:

- https://developers.google.com/workspace/gmail/api/guides/push
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch

Adoption rule:

- Use `users.watch` and history IDs rather than polling entire inboxes.
- Classify email importance but do not send external replies without approval.
- Store only needed snippets and metadata by default.

### Resend

Use for outbound product email and fallback notifications.

Official links:

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/send-with-nodejs

Adoption rule:

- Keep Resend for app-generated transactional messages.
- Use Gmail API for acting as the user from their mailbox.
- Do not confuse product email with personal email delegation.

## Rejected or Deferred

- Full multi-user staff roles: deferred. Keep `userId` for data boundaries, but build single-owner behavior first.
- WhatsApp: deferred unless Telegram is stable. The current product should not split attention across channels.
- Arbitrary shell agents: rejected for end-user tasks. Shell access can exist only in developer mode.
- Pure browser-only automation: rejected. Prefer APIs when official APIs exist; use browser only when no API is available.

