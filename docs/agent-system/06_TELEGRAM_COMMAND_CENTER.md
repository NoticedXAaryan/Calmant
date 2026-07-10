# Telegram Command Center

Telegram is the primary communication channel. The owner should be able to dictate ideas, approve actions, receive progress, and get completed deliverables without opening the web app.

## Current State

Current file:

- `src/lib/telegram.ts`

Current commands:

- `/start`
- `/connect CODE`
- `/help`
- `/status`

Current behavior:

- Uses polling via `node-telegram-bot-api`.
- Links chat ID through `IntegrationConnection`.
- Sends natural messages to `agentReply`.
- Sends voice notes through `transcribeAudio`.
- Sends outbound notifications through `sendTelegramMessage`.

Problems:

- Polling is not production-grade.
- No inbound dedupe.
- No true progress event stream.
- No inline approval buttons.
- No run cancellation or status commands.
- No attachment/document workflow.

## Production Telegram Architecture

Create:

- `src/app/api/telegram/webhook/route.ts`
- `src/lib/services/telegram-service.ts`
- `src/lib/telegram/update-router.ts`
- `src/lib/telegram/renderers.ts`
- `src/lib/telegram/approval-buttons.ts`

Keep `src/lib/telegram.ts` as a compatibility wrapper until migration is complete.

## Webhook Flow

1. Telegram sends update to `POST /api/telegram/webhook`.
2. Verify request path secret or webhook secret token.
3. Insert `InboundMessage` with:
   - `channel = "telegram"`
   - `externalId = update.update_id`
   - full payload in `payload`
4. If duplicate update ID, return 200 immediately.
5. Route update:
   - command,
   - text,
   - voice,
   - document,
   - callback query,
   - photo/screenshot.
6. Resolve `IntegrationConnection` by Telegram chat ID.
7. Create or resume `AgentRun`.
8. Send immediate acknowledgment.
9. Runtime emits `AgentEvent`.
10. Telegram bridge renders selected events into message edits or new messages.

## Required Commands

### `/start`

Purpose: introduce bot and connection flow.

Response:

- If not linked: tell owner to generate connect code in dashboard.
- If linked: show available commands and current status.

### `/connect CODE`

Purpose: link Telegram chat to owner account.

Procedure:

1. Find `Verification` with identifier `telegram_connect_${code}`.
2. Check expiration.
3. Upsert `IntegrationConnection`:
   - provider `telegram`
   - externalId chat ID
   - status `live_verified`
4. Delete verification row.
5. Send confirmation.
6. Create `AuditEvent` `telegram_connected`.

### `/status`

Purpose: show current agent/worker/integration status.

Must include:

- linked account,
- worker health,
- Telegram health,
- Calendar connected yes/no,
- Gmail connected yes/no,
- pending approvals count,
- active runs count.

### `/runs`

Purpose: list active and recent runs.

Output:

- active runs with short ID,
- status,
- current phase,
- age,
- command to inspect: `/run RUN_ID`.

### `/run RUN_ID`

Purpose: show run detail.

Output:

- prompt,
- status,
- plan summary,
- current step,
- pending approval if any,
- artifacts.

### `/cancel RUN_ID`

Purpose: cancel a running or waiting run.

Procedure:

1. Verify run belongs to owner.
2. Set status `cancelled`.
3. Cancel pending tool calls where possible.
4. Close browser session if run-bound.
5. Emit `run.cancelled`.

### `/approvals`

Purpose: list pending approvals.

Output:

- approval title,
- risk,
- target,
- approve/reject buttons.

### `/memory`

Purpose: inspect and manage memories.

Subcommands:

- `/memory search QUERY`
- `/memory recent`
- `/memory disable`
- `/memory enable`

### `/goals`

Purpose: list active long-term goals.

Subcommands:

- `/goals`
- `/goal GOAL_ID`
- `/pause_goal GOAL_ID`
- `/resume_goal GOAL_ID`

## Natural Language Input

Natural input examples:

- "Make me a presentation about X."
- "Scan my email for results from Y."
- "Apply to internships in AI research every day."
- "Remind me when there are five minutes left in meetings."
- "Draft an email to Priya in my usual style and CC Arjun."

Routing:

- Do not try to parse everything in Telegram code.
- Telegram creates `AgentRun`.
- Runtime classifies and plans.

## Progress Rendering

Use `AgentEvent` as source of truth.

Event rendering:

- `run.created`: send new message "Got it. I am setting this up."
- `context.loaded`: edit message "I loaded your tasks, calendar, memory, and active goals."
- `planning.completed`: show plan summary if plan is non-trivial.
- `tool.started`: edit or append "Working on: STEP_DESCRIPTION".
- `tool.completed`: append short evidence only when useful.
- `approval.created`: send approval card with inline buttons.
- `artifact.created`: send file/link if user-facing.
- `run.completed`: send final answer.
- `run.failed`: send failure reason and next action.

Do not spam every internal event. Aggregate low-level events.

## Approval Buttons

Use Telegram inline keyboard:

- `Approve`
- `Reject`
- `Edit`
- `Show details`

Callback data format:

`approval:{approvalId}:{action}:{nonce}`

Rules:

- Nonce expires.
- Verify the callback chat ID maps to same user.
- On approve/reject, update `ApprovalRequest`.
- Emit `approval.approved` or `approval.rejected`.
- Resume run.

## Voice Notes

Current flow already calls `transcribeAudio`.

Required improvements:

- Save voice file as `Artifact` if owner enables it.
- Store transcript in `InboundMessage.text`.
- Ask for confirmation if transcript confidence is low.
- For commands that can cause external action, include transcript in approval context.

## Attachments

Supported attachment types:

- PDF,
- DOCX,
- PPTX,
- XLSX,
- images,
- screenshots,
- CV/resume files.

Procedure:

1. Download file from Telegram.
2. Store as private `Artifact`.
3. Extract text/metadata if supported.
4. Attach artifact ID to run context.
5. Confirm receipt to owner.

## Telegram Message Style

Keep messages direct and concise.

Use:

- "I need approval before sending this."
- "I found 8 matching internships. I shortlisted 3."
- "The site blocked automation at login. I captured a screenshot."
- "Draft ready. Approve to send."

Avoid:

- fake certainty,
- long chain-of-thought,
- excessive internal tool narration,
- claiming a task is done before final verification.

## Local Development

Polling can remain for local development:

- `TELEGRAM_MODE=polling`

Production:

- `TELEGRAM_MODE=webhook`
- `TELEGRAM_WEBHOOK_SECRET=...`
- set webhook on deploy.

## Acceptance Criteria

- Duplicate Telegram updates do not create duplicate runs.
- Owner can approve/reject in Telegram.
- Owner can cancel a run.
- Progress mirrors actual `AgentEvent` records.
- Voice note creates transcript and run.
- Attachments become artifacts.
- If the app restarts during a pending approval, approval still works.

