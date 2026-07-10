# Implementation Backlog for AI Coder

This is the ordered coding plan. Follow it exactly unless the owner changes priority.

## Phase 0: Stabilize Documentation and Safety Flags

Goal: prevent dangerous tools from being used while rebuilding.

Tasks:

1. Add environment flag:
   - `AGENT_ENABLE_UNSAFE_DEV_TOOLS=false`
2. In `src/lib/tools/registry.ts`, hide `run_command`, unrestricted `write_file`, and `google_workspace_cli` unless the flag is true and request is developer-mode.
3. Remove fake tool names from prompt examples:
   - `src/lib/harness/prompts/classify.ts`
   - `src/lib/harness/prompts/plan.ts`
4. Add tests that planner prompt contains only registered tools.

Done when:

- `run_command` cannot be selected by normal user runs.
- No prompt example references a missing tool.

## Phase 1: Add Durable Event and Context Plumbing

Goal: every run has events and tools receive `userId` and `runId`.

Tasks:

1. Add Prisma models/fields from `03_DATA_MODEL_AND_MIGRATIONS.md`:
   - `AgentEvent`
   - `InboundMessage`
   - expanded `AgentRun`
   - expanded `ToolCall`
2. Run Prisma migration.
3. Create `src/lib/agent-runtime/event-service.ts`.
4. Update `src/lib/agent.ts`:
   - create run through new `RunService` or pass run ID into pipeline temporarily,
   - include `userId`, `runId`, `timeZone` in `ToolContext`.
5. Update `src/lib/tools/registry.ts` context type.
6. Fix `executeGetCalendarEvents` by receiving `context.userId`.

Done when:

- A chat run creates `AgentEvent` rows.
- Calendar tool works from agent path.
- Activity API can show events.

## Phase 2: ToolCall Recording and ToolRunner

Goal: no tool executes invisibly.

Tasks:

1. Create `src/lib/tools/tool-manifest.ts`.
2. Create `src/lib/tools/tool-runner.ts`.
3. Convert registry entries to manifests.
4. Update `TaskExecutor.executePlan` or new executor to call `ToolRunner`.
5. `ToolRunner` must:
   - create `ToolCall`,
   - validate input,
   - enforce timeout,
   - execute handler,
   - validate output,
   - update `ToolCall`,
   - emit events.
6. Add tests with a fake tool.

Done when:

- Every tool use creates `ToolCall`.
- Failed tools have error records.

## Phase 3: Approval Pause and Resume

Goal: high-risk actions stop and wait for owner approval.

Tasks:

1. Create `src/lib/agent-runtime/approval-service.ts`.
2. Expand `ApprovalRequest`.
3. Update executor:
   - if approval needed, create approval and set run `waiting_approval`.
   - do not execute tool.
4. Update `src/app/api/approvals/[id]/route.ts`:
   - remove generic mock handler,
   - call `ApprovalService.resolveApproval`.
5. Add Telegram inline approval buttons.
6. Add resume logic.

Done when:

- Email send/browser submit/calendar delete cannot execute without approval.
- Approving after restart resumes run.

## Phase 4: Telegram Webhook and Progress

Goal: Telegram becomes a real command center.

Tasks:

1. Add `src/app/api/telegram/webhook/route.ts`.
2. Create `src/lib/services/telegram-service.ts`.
3. Create `src/lib/telegram/update-router.ts`.
4. Add `InboundMessage` dedupe.
5. Implement commands:
   - `/status`
   - `/runs`
   - `/run`
   - `/cancel`
   - `/approvals`
6. Render `AgentEvent` progress to Telegram.
7. Keep polling mode only for local dev.

Done when:

- Duplicate Telegram update does not duplicate run.
- Approval buttons work.
- `/cancel` cancels a run.

## Phase 5: Memory Service and Learning Policy

Goal: useful learning without unsafe memory writes.

Tasks:

1. Create `src/lib/services/memory-service.ts`.
2. Replace direct `addMemory(fullConversation)` in `agent.ts`.
3. Create `LearningService`.
4. Add memory candidates after synthesis.
5. Implement review queue for medium-risk candidates.
6. Update memory dashboard/API to reflect unified records.
7. Add Telegram memory commands.

Done when:

- Full conversations are not blindly stored.
- Owner can inspect/delete memories.
- Secrets are rejected.

## Phase 6: Browser Session Service and Artifacts

Goal: browser actions are run-bound and evidence-backed.

Tasks:

1. Add `BrowserSession` model.
2. Create `src/lib/services/browser-session-service.ts`.
3. Update `src/lib/tools/browser.ts` to return structured outputs.
4. Store screenshots as `Artifact`.
5. Add approval gate for submit/upload/send/payment actions.
6. Add Playwright smoke tests.

Done when:

- Browser screenshots appear in artifacts.
- Browser submit pauses for approval.

## Phase 7: Calendar and Gmail Services

Goal: schedule and email flow become useful.

Tasks:

1. Create `CalendarService`.
2. Create `GmailService`.
3. Add `CalendarSyncState` and `GmailSyncState`.
4. Implement meeting-end reminder scheduling.
5. Implement Gmail outcome scan.
6. Add tools:
   - `calendar_list_events`
   - `calendar_create_event`
   - `calendar_freebusy`
   - `gmail_search_messages`
   - `gmail_create_draft`
   - `gmail_send_draft`
7. Replace `google_workspace_cli`.

Done when:

- Owner gets five-minute-left notifications.
- Gmail scan detects selected/rejected/disqualified.
- Third-party email send requires approval.

## Phase 8: Long-Term Goals

Goal: daily goal pursuit works.

Tasks:

1. Add `Goal` and `Opportunity`.
2. Create `GoalService`.
3. Create opportunity search workflow.
4. Create CV generation workflow.
5. Create application submission workflow with browser approval boundary.
6. Add Telegram goal commands.

Done when:

- Owner can create internship goal.
- Daily search creates opportunities.
- CV variant artifact is generated.
- Application submit requires approval.

## Phase 9: Model Gateway

Goal: routing across models is explicit and observable.

Tasks:

1. Add LiteLLM configuration.
2. Create new `ModelRouter`.
3. Replace direct Google SDK calls in:
   - classifier,
   - planner,
   - synthesizer.
4. Store model metadata on run/events.
5. Add fallback tests.

Done when:

- Model calls go through one router.
- Deep model can be selected by policy.

## Phase 10: Observability and Evals

Goal: confidence before autonomy.

Tasks:

1. Add OpenTelemetry.
2. Add eval dataset.
3. Add replay tests.
4. Add browser e2e tests.
5. Add health endpoints.
6. Update dashboard activity page to use `AgentEvent`.

Done when:

- Regressions in approval behavior fail tests.
- Activity timeline shows exact run state.

