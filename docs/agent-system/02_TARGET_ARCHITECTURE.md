# Target Architecture

Calmant should be a single-owner AI execution companion. The owner communicates primarily through Telegram. The system plans, executes, asks for approval, sends progress updates, learns preferences, and records evidence.

## Product Scope for This Rebuild

In scope:

- One owner account.
- Telegram primary interface.
- Dashboard as observability and settings surface.
- Calendar management.
- Notifications and meeting reminders.
- Email scanning and drafting.
- Browser automation.
- Research across models and sources.
- Presentation/document/CV creation.
- Long-term goals such as internship applications.
- Preference learning and reusable skills.
- Approval gates for risky actions.

Out of scope for now:

- Staff roles.
- Multi-tenant team administration.
- Public marketplace.
- Autonomous financial transactions.
- Unapproved external submissions.

## Architecture Layers

### 1. Intake Layer

Owns inbound messages and user-facing progress.

Components:

- Telegram webhook endpoint.
- Dashboard chat endpoint.
- Email/calendar/webhook receivers.
- Inbound event dedupe.
- User/channel resolution.

Required records:

- `InboundMessage`
- `AgentRun`
- `AgentEvent`

Rules:

- Every inbound Telegram update becomes an idempotent `InboundMessage`.
- Every actionable request creates or resumes an `AgentRun`.
- Every progress update is emitted as an `AgentEvent` and mirrored to Telegram/dashboard.

### 2. Agent Runtime Layer

Owns reasoning and control flow.

Components:

- `RunService`
- `ContextService`
- `ModelRouter`
- `Planner`
- `RiskAssessor`
- `RunExecutor`
- `ApprovalService`
- `SynthesisService`
- `LearningService`

Rules:

- The runtime is not allowed to call tools directly without recording a `ToolCall`.
- The runtime must be restart-safe.
- The runtime must pause on approval and resume by run ID.
- The runtime must be able to replay from recorded state in dry-run mode.

### 3. Tool Layer

Owns real-world capabilities.

Components:

- Product-owned tool registry.
- MCP client and MCP server adapters.
- Browser session service.
- Google Calendar service.
- Gmail service.
- Telegram service.
- Resend service.
- Document/presentation generation service.
- Memory service.

Rules:

- Each tool has a manifest.
- Each tool declares risk, side effects, required secrets, auth scopes, timeout, retry policy, and output schema.
- High-risk tools require approval.
- Tool outputs are structured JSON, not only natural language strings.

### 4. Memory and Knowledge Layer

Owns personalization and retrieval.

Components:

- `MemoryService`
- Mem0 adapter.
- Prisma `AgentMemory` or replacement memory metadata.
- Document/opportunity vector store.
- Skill library.

Rules:

- Memory writes require source, category, confidence, and review state.
- The owner can view, edit, disable, and delete memories.
- Reusable skills are versioned documents with examples and tests.

### 5. Workflow and Schedule Layer

Owns recurring and long-running work.

Components:

- `BackgroundJob` for short phase-1 jobs.
- `Watcher` for schedule/event triggers.
- Temporal workflows for phase-2 durable long-running jobs.
- Calendar/Gmail push webhook processors.

Rules:

- A watcher only triggers work. It does not contain the work.
- Every triggered workflow creates an `AgentRun` or `WorkflowRun`.
- Missed schedules must be detected and reconciled.

### 6. Observability and Audit Layer

Owns proof.

Components:

- `AgentEvent`
- `AuditEvent`
- `NotificationDelivery`
- `Artifact`
- OpenTelemetry traces.
- Run replay fixtures.

Rules:

- If the system acts, it records what it saw, what it decided, what it did, and why.
- Screenshots, files, generated documents, and email drafts are artifacts.
- Approval decisions are immutable audit events.

## Core Runtime Sequence

1. Receive request.
2. Create `InboundMessage`.
3. Create `AgentRun`.
4. Emit `run.created`.
5. Hydrate context from tasks, calendar, recent messages, memory, active goals, and channel metadata.
6. Classify request.
7. Create plan.
8. Validate plan against tool registry.
9. Risk-assess each step.
10. For each step:
    - create `ToolCall`,
    - if approval required, create `ApprovalRequest` and pause,
    - execute tool,
    - validate output,
    - store artifacts,
    - emit progress.
11. Synthesize final answer.
12. Extract candidate memories and skills.
13. Send final answer.
14. Mark run completed or failed.
15. Schedule follow-up if needed.

## Required Services and Files

Create these services:

- `src/lib/agent-runtime/run-service.ts`
- `src/lib/agent-runtime/context-service.ts`
- `src/lib/agent-runtime/model-router.ts`
- `src/lib/agent-runtime/planner.ts`
- `src/lib/agent-runtime/risk-assessor.ts`
- `src/lib/agent-runtime/executor.ts`
- `src/lib/agent-runtime/approval-service.ts`
- `src/lib/agent-runtime/event-service.ts`
- `src/lib/agent-runtime/learning-service.ts`
- `src/lib/tools/tool-manifest.ts`
- `src/lib/tools/tool-runner.ts`
- `src/lib/tools/policies.ts`
- `src/lib/services/telegram-service.ts`
- `src/lib/services/calendar-service.ts`
- `src/lib/services/gmail-service.ts`
- `src/lib/services/browser-session-service.ts`
- `src/lib/services/memory-service.ts`
- `src/lib/services/artifact-service.ts`
- `src/lib/services/notification-service.ts`

Deprecate or wrap these existing files:

- `src/lib/harness/pipeline.ts`
- `src/lib/harness/executor.ts`
- `src/lib/tools/mcp.ts`
- `src/lib/tools/google-workspace.ts`

Do not delete them immediately. Keep compatibility wrappers until tests pass.

## Communication Contract

Telegram progress messages must use this structure:

- `Received`: request acknowledged.
- `Planning`: context loaded and plan being created.
- `Needs approval`: explicit action summary and buttons.
- `Working`: current step and evidence.
- `Blocked`: exact missing input or failing dependency.
- `Done`: final deliverable and artifact links.
- `Follow-up scheduled`: if the run continues later.

Dashboard progress must consume the same `AgentEvent` stream. Do not implement separate progress logic for Telegram and dashboard.

## Principle

The agent is allowed to be ambitious, but the harness must be boring. Durable state, explicit contracts, approval gates, and artifacts are more important than clever prompts.

