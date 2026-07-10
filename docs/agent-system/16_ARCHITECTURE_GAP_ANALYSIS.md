# Architecture Gap Analysis

This document lists the gaps between the current repository and the expected product: a premium, reliable, Telegram-first AI execution companion that can reason, act, learn, and prove what it did.

## Executive Assessment

The current architecture has strong raw ingredients but weak control boundaries. It has Prisma models for runs, tools, approvals, artifacts, watchers, notifications, and memory, but the runtime does not consistently use them. The UI has many useful components, but pages are inconsistent and connection flows feel like admin utilities rather than a premium personal command center.

The highest-impact improvement is not adding more models or more UI cards. It is making every action durable, visible, approval-safe, and pleasant to use.

## Critical Gaps

### 1. Agent Harness Is Not Durable Enough

Current files:

- `src/lib/agent.ts`
- `src/lib/harness/pipeline.ts`
- `src/lib/harness/executor.ts`
- `src/lib/tools/registry.ts`

Current problem:

- `AgentPipeline.run` executes classify -> plan -> execute -> synthesize in memory.
- `TaskExecutor.executePlan` calls `registry.execute` directly.
- `ToolCall` rows are not created for every step.
- `ApprovalRequest` is not part of normal execution.
- A server restart can lose step state.

Expected:

- Every run has persisted events, plans, steps, tool calls, approvals, and artifacts.
- Runtime can resume by `runId`.
- Owner can inspect exactly what happened.

Required fix:

- Implement `src/lib/agent-runtime/` from `04_AGENT_HARNESS_SPEC.md`.
- Make `ToolRunner` the only execution path.
- Make `ApprovalService` pause/resume runs.

### 2. Tool Registry Is Unsafe and Under-Specified

Current files:

- `src/lib/tools/registry.ts`
- `src/lib/tools/filesystem.ts`
- `src/lib/tools/mcp.ts`
- `src/lib/tools/google-workspace.ts`

Current problem:

- `run_command` can execute arbitrary shell strings.
- `write_file` can write arbitrary paths.
- MCP wrapper is not a real MCP client.
- Tool definitions lack risk level, side effects, output schemas, and approval behavior.

Expected:

- Tool manifest is the source of truth.
- High-risk tools cannot run without approval.
- User-originated tasks cannot execute shell commands.

Required fix:

- Implement `ToolManifest`.
- Disable unsafe dev tools unless explicit developer mode.
- Replace `mcp.ts` with a real MCP client using `tools/list` and `tools/call`.

### 3. Prompts and Tool Registry Can Drift

Current files:

- `src/lib/harness/prompts/classify.ts`
- `src/lib/harness/prompts/plan.ts`

Current problem:

- Prompt examples reference fake tools: `get_memory`, `send_email`, `browser_act`.
- Planner can learn the wrong tool names.

Expected:

- Prompt tool descriptions and examples are generated from the registry or verified against it.

Required fix:

- Add a test that fails if prompts reference unknown tool names.
- Generate `registry.toPlannerPrompt()`.

### 4. Telegram Is Not a Complete Command Center

Current file:

- `src/lib/telegram.ts`

Current problem:

- Polling is local-dev oriented.
- No webhook dedupe.
- No run commands.
- No inline approval buttons.
- Progress updates are simulated, not tied to real events.

Expected:

- Telegram is the primary UX.
- Owner can approve, reject, cancel, inspect runs, and receive artifacts from Telegram.

Required fix:

- Add webhook route.
- Add `InboundMessage`.
- Render `AgentEvent` to Telegram.
- Add `/runs`, `/run`, `/cancel`, `/approvals`, `/memory`, `/goals`.

### 5. Memory Is Too Broad and Not Governed

Current files:

- `src/lib/memory.ts`
- `src/lib/agent.ts`
- `src/lib/agent-context.ts`

Current problem:

- Full conversations are sent to memory after responses.
- Mem0 storage and Prisma `AgentMemory` are disconnected.
- Owner cannot reliably review/delete all memory.

Expected:

- Memory candidates are extracted, scored, categorized, reviewed, and visible.

Required fix:

- Add `MemoryService`.
- Add `LearningService`.
- Stop blind full-conversation writes.

### 6. Browser Automation Lacks Evidence Discipline

Current files:

- `src/lib/tools/browser.ts`
- `sandbox/server.js`

Current problem:

- One global browser session.
- Not scoped by user/run.
- Screenshot outputs are not stored as `Artifact` records.
- Submit boundary is not enforced.

Expected:

- Browser work is run-bound, screenshot-backed, approval-safe, and replayable.

Required fix:

- Add `BrowserSessionService`.
- Store screenshots and downloads as artifacts.
- Require approval for submit/upload/send/book/pay/delete.

### 7. Scheduling and Email Are Not Yet the Expected Companion

Current files:

- `src/lib/worker.ts`
- `src/lib/calendar.ts`
- `src/lib/tools/google-calendar.ts`
- `src/lib/email.ts`

Current problem:

- Calendar sync logs event text but does not persist sync state.
- No "five minutes left" meeting notification.
- No Gmail outcome scanning.
- No Gmail drafts/sends through approval.

Expected:

- Calendar and Gmail are first-class services.
- Meeting reminders and application-result email monitoring work.

Required fix:

- Add `CalendarService`, `GmailService`, `CalendarSyncState`, `GmailSyncState`.
- Add meeting-end reminders and Gmail outcome classifier.

### 8. UI Feels Like Separate Admin Screens, Not One Product

Current files:

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/integrations/page.tsx`
- `src/app/dashboard/assistant/page.tsx`
- `src/app/dashboard/automations/page.tsx`
- `src/components/app/*`
- `src/components/ui/*`

Current problem:

- Some route files are very large and own too much logic.
- Integration flows look like status cards rather than guided connection flows.
- Visual hierarchy is restrained but not premium or engaging.
- User value is buried behind internal concepts like "worker", "entropy", "delegated work", and "health check".

Expected:

- The app feels like a premium personal operations center.
- Connections feel trustworthy, guided, and alive.
- User can understand what is connected, what the AI can do, what needs attention, and what was completed.

Required fix:

- Implement `18_PREMIUM_UI_REMODEL_SPEC.md`.
- Create a local design language.
- Make integrations outcome-led:
  - "Telegram command center"
  - "Calendar intelligence"
  - "Email outcomes"
  - "Browser operator"
- Replace technical health wording with user-facing trust states.

## Architecture Quality Bar

Every new feature must satisfy:

- durable state,
- typed boundary,
- approval policy,
- event stream,
- artifact/evidence when acting externally,
- tests,
- UI state for loading/empty/error/success,
- clear owner-facing language.

## Immediate Architecture Priorities

1. Tool safety and ToolCall recording.
2. AgentEvent timeline.
3. Approval pause/resume.
4. Telegram webhook and approvals.
5. Cleanup skill and repo hygiene.
6. UI remodel foundation.
7. Calendar/Gmail services.
8. Browser artifacts.
9. Long-term goals.

