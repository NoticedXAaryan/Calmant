# Data Model and Migrations

The current Prisma schema already contains the right early concepts. The rebuild should strengthen these models rather than invent unrelated tables.

## Migration Policy

1. Every schema change must have a migration.
2. Every model that stores externally visible behavior must include timestamps.
3. Every long-running record must include a status enum or constrained string.
4. Every external callback must be idempotent.
5. Every external action must be traceable to `userId`, `AgentRun`, and optionally `ToolCall`.
6. Do not store raw access tokens in plaintext long term. Move to encrypted storage before production.

## Existing Models to Keep

Keep and expand:

- `AgentRun`
- `ToolCall`
- `ApprovalRequest`
- `Artifact`
- `Watcher`
- `WatcherEvent`
- `BackgroundJob`
- `NotificationDelivery`
- `AuditEvent`
- `IntegrationConnection`
- `AgentMemory`
- `DelegatedTask`
- `DepartmentRun`

## New Models Required

### AgentEvent

Purpose: canonical progress/event stream for Telegram, dashboard, audit, and replay.

Fields:

```prisma
model AgentEvent {
  id        String   @id @default(cuid())
  runId     String
  userId    String
  seq       Int
  type      String   // run.created | context.loaded | classified | planned | tool.started | tool.completed | approval.required | approval.resolved | artifact.created | run.completed | run.failed
  level     String   @default("info") // debug | info | warn | error
  message   String
  metadata  Json?
  createdAt DateTime @default(now())

  run  AgentRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  user User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([runId, seq])
  @@index([userId, createdAt])
  @@index([runId, createdAt])
}
```

Implementation notes:

- `seq` must be allocated transactionally per run.
- Use `AgentEvent` for all progress updates. Do not rely on console logs.
- `ActivityEvent` API should read from `AgentEvent` instead of reassembling events from multiple models.

### InboundMessage

Purpose: idempotent intake for Telegram, dashboard, email webhooks, and future app messages.

```prisma
model InboundMessage {
  id          String   @id @default(cuid())
  userId      String?
  channel     String   // telegram | dashboard | gmail | calendar | webhook
  externalId  String   // Telegram update_id, dashboard UUID, Gmail history id, etc.
  senderId    String?
  text        String?
  payload     Json?
  status      String   @default("received") // received | linked | ignored | run_created | failed
  runId       String?
  receivedAt  DateTime @default(now())
  processedAt DateTime?
  error       String?

  @@unique([channel, externalId])
  @@index([userId, receivedAt])
}
```

Implementation notes:

- Telegram webhook must insert this before doing any work.
- If duplicate insert fails, return HTTP 200 and do not process again.

### Skill

Purpose: reusable workflow instructions learned or manually authored.

```prisma
model Skill {
  id          String   @id @default(cuid())
  userId      String
  slug        String
  name        String
  version     Int      @default(1)
  status      String   @default("draft") // draft | active | disabled | archived
  description String
  triggers    Json
  instructions String
  toolPolicy  Json?
  examples    Json?
  evals        Json?
  sourceRunId  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, slug, version])
  @@index([userId, status])
}
```

Implementation notes:

- Skills are not code. They are controlled procedure documents that the planner can retrieve.
- A skill becomes `active` only after a dry-run eval passes or the owner approves it.

### Goal

Purpose: long-running objective such as "land internship at X".

```prisma
model Goal {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  status      String   @default("active") // active | paused | completed | abandoned
  targetDate  DateTime?
  successCriteria Json?
  strategy    Json?
  nextReviewAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, status])
  @@index([nextReviewAt])
}
```

### Opportunity

Purpose: opportunities found for a goal.

```prisma
model Opportunity {
  id          String   @id @default(cuid())
  userId      String
  goalId      String?
  source      String
  sourceUrl   String?
  title       String
  organization String?
  location    String?
  deadline    DateTime?
  fitScore    Float?
  status      String   @default("found") // found | shortlisted | applied | rejected | interview | won | ignored
  evidence    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, status])
  @@index([goalId])
  @@unique([userId, sourceUrl])
}
```

### GmailSyncState

Purpose: reliable Gmail scanning without full inbox polling.

```prisma
model GmailSyncState {
  id            String   @id @default(cuid())
  userId        String   @unique
  historyId     String?
  watchTopic    String?
  watchExpiresAt DateTime?
  lastSyncedAt  DateTime?
  status        String   @default("not_configured")
  lastError     String?
  updatedAt     DateTime @updatedAt
}
```

### CalendarSyncState

Purpose: Google Calendar push channel and sync token storage.

```prisma
model CalendarSyncState {
  id             String   @id @default(cuid())
  userId         String   @unique
  calendarId     String   @default("primary")
  syncToken      String?
  channelId      String?
  resourceId     String?
  channelExpiresAt DateTime?
  lastSyncedAt   DateTime?
  status         String   @default("not_configured")
  lastError      String?
  updatedAt      DateTime @updatedAt
}
```

### BrowserSession

Purpose: bind browser automation state to a run.

```prisma
model BrowserSession {
  id          String   @id @default(cuid())
  userId      String
  runId       String?
  externalId  String
  status      String   @default("active") // active | closed | crashed | expired
  currentUrl  String?
  title       String?
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  expiresAt   DateTime?

  @@index([userId, status])
  @@index([runId])
}
```

## Existing Model Changes

### AgentRun

Add fields:

```prisma
channel       String?  // telegram | dashboard | watcher | gmail | calendar
objective     String?
classification Json?
plan          Json?
contextSnapshot Json?
currentPhase  String?
parentRunId   String?
idempotencyKey String?
traceId       String?
startedAt     DateTime?
completedAt   DateTime?
failedAt      DateTime?
lastError     String?
```

Change status vocabulary:

- `queued`
- `running`
- `waiting_approval`
- `waiting_user`
- `blocked`
- `completed`
- `failed`
- `cancelled`

Rules:

- `prompt` is the raw user request.
- `objective` is the normalized goal.
- `response` is the final owner-facing answer.
- `plan` is the current executable plan.
- `contextSnapshot` must not store secrets.

### ToolCall

Add fields:

```prisma
stepId          String?
description     String?
riskLevel       String? // read | write | external_message | external_submission | destructive | financial
approvalRequired Boolean @default(false)
approvalId      String?
inputHash       String?
outputSchema    Json?
error           String?
startedAt       DateTime?
durationMs      Int?
artifactIds     Json?
```

Change status vocabulary:

- `planned`
- `waiting_approval`
- `approved`
- `running`
- `completed`
- `failed`
- `rejected`
- `skipped`
- `cancelled`

Rules:

- Every tool execution creates a `ToolCall` before running.
- Never call `registry.execute` without `ToolCall`.

### ApprovalRequest

Add fields:

```prisma
runId       String?
toolCallId  String?
riskLevel   String?
expiresAt   DateTime?
reviewedBy  String?
decisionReason String?
result      Json?
error       String?
```

Change status vocabulary:

- `pending`
- `approved`
- `rejected`
- `expired`
- `executing`
- `executed`
- `failed`

Rules:

- Approval payload must include exactly the action to be performed.
- Approval execution must call a tool runner, not a generic handler.

### Artifact

Add fields:

```prisma
toolCallId  String?
mimeType    String?
sizeBytes   Int?
sha256      String?
url         String?
visibility  String @default("private")
```

Rules:

- Screenshot artifacts must include browser session ID, URL, and timestamp in metadata.
- Generated documents must include source prompt/run/tool IDs.

### IntegrationConnection

Add fields:

```prisma
scopes       Json?
tokenType    String?
encrypted    Boolean @default(false)
```

Rules:

- Before production, tokens must be encrypted at rest.
- Store provider-specific metadata in `metadata`, but do not store raw email bodies or full browser cookies there.

## Migration Order

1. Add `AgentEvent`.
2. Expand `AgentRun`, `ToolCall`, `ApprovalRequest`, and `Artifact`.
3. Add `InboundMessage`.
4. Add `Skill`, `Goal`, `Opportunity`.
5. Add `GmailSyncState`, `CalendarSyncState`, and `BrowserSession`.
6. Update API code to write both old and new fields.
7. Backfill minimal `AgentEvent` rows for recent `AgentRun` records if needed.
8. Switch dashboard activity API to `AgentEvent`.
9. Remove stale assumptions only after tests pass.

## Data Retention Defaults

- Agent events: keep forever until user deletes account.
- Browser screenshots: keep 30 days by default unless attached to a goal/application.
- Email snippets: keep 90 days by default unless user pins.
- Full email bodies: do not store by default.
- Generated CVs/presentations: keep until user deletes.
- Memory records: keep until user edits/deletes or disables memory.

