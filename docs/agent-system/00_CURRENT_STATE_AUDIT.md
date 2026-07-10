# Current State Audit

This audit is based on the current `app/` repository. It names exact files and functions so an implementation AI can change the right code without guessing.

## Existing Core System

### App and API

- Framework: Next.js app router.
- Prisma schema: `prisma/schema.prisma`.
- Agent chat endpoint: `src/app/api/agent/chat/route.ts`.
- Agent entry point: `src/lib/agent.ts`.
- Harness directory: `src/lib/harness/`.
- Tool registry: `src/lib/tools/registry.ts`.
- Telegram integration: `src/lib/telegram.ts`.
- Memory integration: `src/lib/memory.ts`.
- User context builder: `src/lib/agent-context.ts`.
- Worker loop: `src/lib/worker.ts`.
- Queue model helpers: `src/lib/queue.ts`.
- Approval APIs:
  - `src/app/api/approvals/route.ts`
  - `src/app/api/approvals/[id]/route.ts`
- Activity feed API: `src/app/api/activity/events/route.ts`.
- Browser sandbox wrapper: `src/lib/tools/browser.ts`.
- Browser sandbox server: `sandbox/server.js`.

### Important Prisma Models

Existing models that should be kept and strengthened:

- `User`
- `Task`
- `Subtask`
- `Habit`
- `AgentMemory`
- `IntegrationConnection`
- `NotificationDelivery`
- `AlertPolicy`
- `BackgroundJob`
- `AgentRun`
- `ToolCall`
- `DelegatedTask`
- `ApprovalRequest`
- `InAppNotification`
- `AuditEvent`
- `Artifact`
- `DepartmentRun`
- `Watcher`
- `WatcherEvent`

The schema already points in the right direction. The code does not yet use the models with enough discipline.

## Existing Agent Flow

`src/app/api/agent/chat/route.ts`:

- `POST(request)` authenticates with `getUserId()`.
- Validates `message`.
- Applies rate limit using `rateLimit`.
- Streams server-sent events from `agentReplyStream(message, userId, timeZone)`.
- Emits chunks as `data: { ... }\n\n`.

`src/lib/agent.ts`:

- `normalizeMessage(message)` trims and caps input at `MAX_AGENT_MESSAGE_CHARS = 8000`.
- `agentReply(message, userId, timeZone?)` creates an `AgentRun`, runs `pipeline.run`, updates the run, then calls `addMemory`.
- `agentReplyStream(message, userId, timeZone?)` creates an `AgentRun`, yields one thinking event, runs `pipeline.run`, updates the run, stores memory, and yields final content.

Current issue:

- `agentReply` and `agentReplyStream` pass tool context as `{ cwd, env }` only. They do not include `userId`, so tools like `google_calendar_events` that require `context.userId` fail.
- `AgentRun` records final response and status only. It does not persist classification, plan, steps, tool calls, approvals, event stream, or artifacts.
- The stream is not truly incremental. It yields one thinking event and one final response.

## Existing Harness

`src/lib/harness/pipeline.ts`:

- `AgentPipeline.run(userInput, toolContext, options)` performs:
  1. classification via `TaskClassifier.classify`
  2. planning via `TaskPlanner.createPlan`
  3. execution via `TaskExecutor.executePlan`
  4. synthesis via `TaskSynthesizer.synthesize`

Current issue:

- This is an in-memory synchronous chain. It cannot resume after restart.
- It has callback placeholders but does not persist or stream step progress.
- It does not attach execution to the `AgentRun` created in `agent.ts`.

`src/lib/harness/types.ts`:

- `TaskTypeSchema`: `question | task | watch`.
- `TaskComplexitySchema`: `low | medium | high`.
- `ClassificationResultSchema`: `type`, `complexity`, `requiredTools`, `estimatedSteps`, `reasoning`.
- `PlanStepSchema`: `id`, `description`, `tool`, `argumentsTemplate`, `fallbackStrategy`.
- `PlanSchema`: `goal`, `steps`.
- `StepResult`: `stepId`, `tool`, `status`, optional `output`, optional `error`.
- `SynthesisResultSchema`: `response`, optional `learnings`, optional `proposeSkill`.

Current issue:

- Plan steps do not include risk level, approval requirements, timeout, retry policy, expected output schema, artifact policy, or rollback instructions.

`src/lib/harness/classifier.ts`:

- Uses `@google/generative-ai`.
- Defaults to `gemini-2.5-flash`.
- Injects `registry.getAll()` into `CLASSIFY_SYSTEM_PROMPT`.
- On failure returns a high-complexity fallback task.

Current issue:

- The fallback can trigger high-risk planning without enough context.
- Classifier does not receive a user budget, tool policy, or approval policy.

`src/lib/harness/planner.ts`:

- Uses `@google/generative-ai`.
- Defaults to `gemini-2.5-pro`.
- Injects `registry.getAll()` and the classification into `PLAN_SYSTEM_PROMPT`.
- Parses the model JSON through `PlanSchema`.

Current issue:

- It trusts the model to pick valid tools but does not verify required auth, risk class, or plan feasibility before execution.
- The prompt examples reference tools that do not exist in the registry, including `get_memory`, `send_email`, and `browser_act`.

`src/lib/harness/executor.ts`:

- `TaskExecutor.executePlan(plan, context)` loops through `plan.steps`.
- Resolves `argumentsTemplate` with previous outputs.
- Calls `registry.execute(step.tool, resolvedArgs, context)`.
- Handles fallback strategies `skip` and `ask_user_for_help`.

Current issue:

- No `ToolCall` records are created.
- No approval pause exists.
- No durable checkpoint exists.
- No timeout wrapper exists.
- No output validation exists.
- No artifact capture exists.
- `ask_user_for_help` throws instead of creating an approval or clarification request.

`src/lib/harness/synthesizer.ts`:

- Uses `@google/generative-ai`.
- Defaults to `gemini-2.5-pro`.
- Summarizes user request, plan, and step results.
- Can return `learnings` and `proposeSkill`.

Current issue:

- The returned `learnings` are not used. `agent.ts` independently calls `addMemory` on the full conversation.
- There is no memory confidence, consent, dedupe, or review policy.

`src/lib/harness/model-router.ts`:

- Tiers: `fast`, `standard`, `deep`.
- Defaults all non-fast tiers to Gemini 2.5 Pro.
- `route(classification, stage, options?)` chooses model by stage and complexity.

Current issue:

- It does not route through a provider gateway.
- It cannot discover current model availability.
- It has no budget, latency, quality, or fallback telemetry.

`src/lib/harness/watcher.ts`:

- Uses `node-cron` and an in-process `Map` of scheduled jobs.
- `initialize()` loads enabled watchers and schedules those with `type === "schedule"`.
- `executeWatcher(watcherId)` can `spawn_agent` or `run_mcp`.

Current issue:

- In-process cron is not enough for production. It loses schedule state on restart.
- Condition evaluation is a mock.
- It uses a separate `PrismaClient` instead of shared `prisma`.
- Watcher events are not tied to `AgentRun`.
- There is no idempotency key, lock, retry policy, or missed-run recovery.

## Existing Tool Registry

`src/lib/tools/registry.ts` registers:

- `google_workspace_cli`
- `browser_navigate`
- `browser_action`
- `read_file`
- `write_file`
- `list_dir`
- `run_command`
- `mcp_tool`
- `tavily_search`
- `firecrawl_scrape`
- `google_calendar_events`

Current issue:

- High-risk tools are callable without approval (`write_file`, `run_command`, `google_workspace_cli`, browser actions).
- Tool definitions do not include risk level, side-effect class, output schema, scopes, secrets needed, idempotency, or approval policy.
- The prompts and registry can drift because prompts contain hard-coded tool examples.

`src/lib/tools/filesystem.ts`:

- `executeReadFile`
- `executeWriteFile`
- `executeListDir`
- `executeRunCommand`

Current issue:

- `executeRunCommand` executes arbitrary shell strings.
- `executeWriteFile` writes arbitrary paths relative to `cwd`.
- These tools must be disabled for end-user automation unless guarded by an explicit developer/admin mode and approval.

`src/lib/tools/browser.ts`:

- Global `activeSessionId`.
- `ensureSession()` checks `/sessions/active` and creates `/session`.
- `executeBrowserNavigate()` calls sandbox navigate.
- `executeBrowserAction()` handles `extract`, `screenshot`, `click`, `type`, `scroll`.

Current issue:

- Single global session is not keyed by user or run.
- Browser actions are selector-based only; no semantic fallback or screenshot validation.
- There is no artifact record for screenshots.
- There is no credential handling policy for login flows.

`src/lib/tools/mcp.ts`:

- `MCPClient.registerServer(config)`.
- `MCPClient.executeTool(args, context)` shells out with `--mcp-tool-request`.
- `executeMCPTool()` calls that client.

Current issue:

- This is not a real MCP JSON-RPC client.
- The command string is unsafe.
- There is no dynamic tool discovery.
- There is no server trust policy.

`src/lib/tools/google-calendar.ts`:

- `getAccessToken(userId)` reads `IntegrationConnection` for `google_calendar`.
- Refreshes tokens if expired.
- `executeGetCalendarEvents(args, context)` requires `context.userId`.

Current issue:

- The agent context currently omits `userId`.
- It only reads events. It does not create/update/delete events, query free/busy, or schedule "five minutes left" reminders.

`src/lib/tools/google-workspace.ts`:

- Shells out to `npx -y @googleworkspace/cli`.

Current issue:

- Do not rely on an unverified CLI shell wrapper for Gmail/Docs/Slides automation. Implement first-class API clients or proper MCP servers.

`src/lib/tools/research.ts`:

- `executeTavilySearch`.
- `executeFirecrawl`.

Current issue:

- These are paid external APIs, not open-source resources. They can stay as optional adapters, but core search/research should also support open-source/self-hostable paths.

## Existing Telegram

`src/lib/telegram.ts`:

- Uses `node-telegram-bot-api` polling.
- `/connect CODE` links Telegram chat ID to `IntegrationConnection`.
- `/start`, `/help`, `/status` commands.
- Voice notes go through `transcribeAudio`.
- Natural messages call `agentReply(text, userId)`.
- `sendTelegramMessage(userId, text)` sends outbound messages.
- `probeTelegramHealth(userId)` sends chat action.

Current issue:

- Polling is acceptable for local development, but production should use webhooks.
- There is no inbound message dedupe.
- Telegram progress updates are simulated by editing one placeholder message every four seconds, not tied to actual agent events.
- No inline approval buttons exist yet.

## Existing Memory

`src/lib/memory.ts`:

- Uses `mem0ai/oss`.
- Vector store: pgvector on `DATABASE_URL`, collection `mem0_memories`.
- Embedder: Gemini `text-embedding-004`.
- `getMemory()`.
- `addMemory(text, userId)`.
- `searchMemory(query, userId, limit)`.
- `getAllMemories(userId)`.

`src/lib/agent-context.ts`:

- `buildUserContext(userId, currentMessage?)` loads active tasks, habits, and relevant memories.
- `formatContextForPrompt(ctx, timeZone?)` formats system time, active tasks, memories, and habits.

Current issue:

- Prisma has an `AgentMemory` model, but runtime memory writes go to Mem0.
- There is no unified memory review/edit/delete path across Mem0 and Prisma.
- Memory write policy is too broad: the full conversation is sent to memory after every response.

## Existing Worker and Notifications

`src/lib/queue.ts`:

- `enqueueJob(name, payload, runAt)`.
- `registerRepeatingJobs()` creates repeating `BackgroundJob` records for due notifications, entropy refresh, briefings, health probes, smart start reminders, calendar sync, and overdue escalation.

`src/lib/worker.ts`:

- `forEachUser(fn)`.
- `processDueNotifications()`.
- `processEntropyRefresh()`.
- `processProviderHealthProbe()`.
- `processSandboxHealthProbe()`.
- `processMorningBriefing()`.
- `processEveningReview()`.
- `processSmartStartReminders()`.
- `processCalendarSync()`.
- `processOverdueEscalation()`.
- `processScheduledReminder(job)`.
- `handleJob(job)`.
- `pollJobs()`.
- `startWorker()`.
- `stopWorker()`.

Current issue:

- Worker polling locks one job at a time with `updateMany`, which is acceptable for a prototype but not a full durable workflow engine.
- The "five minutes left in meeting" notification is not implemented.
- Gmail scanning for selected/disqualified outcomes is not implemented.
- `processCalendarSync()` logs event text but does not persist schedule state.

`src/lib/notifications.ts`:

- In-app notifications.
- Critical task notifications.
- Telegram first, email fallback.
- Durable `NotificationDelivery` records for some paths.

Current issue:

- Delivery status is not reconciled from provider webhooks.
- Telegram delivery is treated as sent when API call succeeds.
- Markdown/HTML conversion is basic.

## Existing Approvals

`src/app/api/approvals/route.ts`:

- Lists pending approval requests for the signed-in user.

`src/app/api/approvals/[id]/route.ts`:

- Accepts `approve` or `reject`.
- On approval:
  - if `type === "email"`, imports `sendEmail` and sends immediately.
  - if `type === "task"`, creates a task.
  - otherwise logs "Executed payload generic handler".

Current issue:

- Approvals are not created by `TaskExecutor`.
- Approval execution is not routed through the same tool registry.
- Generic execution is a mock and must be removed.
- Approval state should support `pending`, `approved`, `rejected`, `expired`, `executing`, `executed`, `failed`.

## Existing Documentation

Current docs:

- `docs/HERMES_INTEGRATION_FIX_PLAYBOOK.md`
- `docs/UI_UX_REDESIGN_IMPLEMENTATION_PLAN.md`

Missing docs added by this package:

- operating doctrine,
- durable harness spec,
- tool registry spec,
- Telegram procedures,
- memory policy,
- security/approval rules,
- evals and test procedures,
- implementation backlog,
- agent skill documents.

## Immediate Hard Failures to Fix

These are blockers for "works properly":

1. Pass `userId` and `runId` into every tool context.
2. Stop executing tool calls without creating `ToolCall` records.
3. Add real approval pause/resume before high-risk actions.
4. Replace non-standard MCP shell wrapper with SDK/JSON-RPC client.
5. Disable arbitrary `run_command` and unrestricted `write_file` for user-originated tasks.
6. Generate prompt tool lists from the registry only; remove fake tool names from examples.
7. Key browser sessions by `runId` and persist screenshots/artifacts.
8. Convert Telegram production mode from polling to webhook with update dedupe.
9. Implement Gmail scan state, Calendar watch state, and meeting-end reminders.
10. Add replay tests for recorded runs.

