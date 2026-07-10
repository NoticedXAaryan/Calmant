# Agent Harness Specification

The harness is the most important part of the product. It decides whether the AI is a toy or a dependable operator.

## Replace the Current Linear Pipeline

Current:

- `src/lib/harness/pipeline.ts`
- `src/lib/harness/executor.ts`
- synchronous classify -> plan -> execute -> synthesize chain

Target:

- durable run service,
- persisted plan,
- persisted tool calls,
- approval pauses,
- event stream,
- artifacts,
- replayable execution.

## Required Runtime Interfaces

Create `src/lib/agent-runtime/types.ts`:

```ts
export type RunStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "waiting_user"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled";

export type RiskLevel =
  | "read"
  | "write_internal"
  | "external_message"
  | "external_submission"
  | "destructive"
  | "credential"
  | "financial";

export interface RunInput {
  userId: string;
  channel: "telegram" | "dashboard" | "watcher" | "gmail" | "calendar";
  message: string;
  externalMessageId?: string;
  timeZone?: string;
  parentRunId?: string;
  idempotencyKey?: string;
}

export interface ExecutablePlan {
  goal: string;
  assumptions: string[];
  steps: ExecutableStep[];
  successCriteria: string[];
  userVisibleSummary: string;
}

export interface ExecutableStep {
  id: string;
  description: string;
  tool: string;
  args: unknown;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  expectedOutputSchema?: unknown;
  timeoutMs: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
  };
  fallback?: {
    strategy: "skip" | "ask_user" | "alternate_tool" | "fail_run";
    alternateTool?: string;
    message?: string;
  };
  artifactPolicy?: {
    captureScreenshot?: boolean;
    persistOutput?: boolean;
    redactPaths?: string[];
  };
}
```

## Required Services

### RunService

File: `src/lib/agent-runtime/run-service.ts`

Responsibilities:

- `startRun(input: RunInput): Promise<AgentRun>`
- `resumeRun(runId: string): Promise<void>`
- `cancelRun(runId: string, reason: string): Promise<void>`
- `failRun(runId: string, error: Error): Promise<void>`
- `completeRun(runId: string, response: string): Promise<void>`

Rules:

- `startRun` creates `AgentRun` and first `AgentEvent`.
- If `idempotencyKey` already exists, return existing run.
- `resumeRun` must load persisted plan and next incomplete tool call.

### EventService

File: `src/lib/agent-runtime/event-service.ts`

Responsibilities:

- `emit(runId, userId, type, message, metadata?)`
- allocate per-run sequence numbers transactionally,
- publish events to dashboard stream,
- trigger Telegram progress updates.

Rules:

- No direct Telegram progress update from runtime code. Emit events and let the notification bridge send.

### ContextService

File: `src/lib/agent-runtime/context-service.ts`

Responsibilities:

- load current time and timezone,
- active tasks,
- current calendar window,
- recent relevant messages,
- relevant memories,
- active goals,
- available skills,
- connected integrations,
- tool policy.

Rules:

- Context must be structured JSON first.
- Prompt text is derived from structured context.
- Do not inject secrets into prompts.

### Planner

File: `src/lib/agent-runtime/planner.ts`

Responsibilities:

- classify the request,
- select relevant skills,
- produce `ExecutablePlan`,
- validate plan against registry,
- reject unknown tools,
- include assumptions and success criteria.

Rules:

- Prompt tool list must be generated from `ToolManifest[]`.
- Prompt examples must use real registered tools only.
- Planner cannot mark a risky step as no-approval unless the tool policy allows it.

### RiskAssessor

File: `src/lib/agent-runtime/risk-assessor.ts`

Responsibilities:

- classify each step risk,
- decide approval requirements,
- check tool scopes and user consent,
- detect dangerous combinations.

Risk mapping:

- read-only calendar/email/search -> `read`
- creating internal task/memory/artifact -> `write_internal`
- sending Telegram/email to the owner -> `external_message` but may be auto-allowed for owner notifications
- sending email to third parties -> `external_message` and approval required
- submitting forms/applications -> `external_submission` and approval required
- deleting files/events/tasks -> `destructive` and approval required
- login, credential, token, payment, saved card -> `credential` or `financial` and approval required

### Executor

File: `src/lib/agent-runtime/executor.ts`

Responsibilities:

- create `ToolCall`,
- resolve arguments,
- request approval if needed,
- execute tool through `ToolRunner`,
- validate output schema,
- store artifacts,
- persist result,
- continue or pause.

Rules:

- Never call tools directly from planner, Telegram, watcher, or approval routes.
- All execution goes through `Executor`.
- Every step has a timeout.
- Retries are only for idempotent tools unless explicitly approved.

### ApprovalService

File: `src/lib/agent-runtime/approval-service.ts`

Responsibilities:

- create approval requests,
- render approval summary,
- send Telegram inline buttons,
- handle approval/rejection,
- resume run.

Approval summary must include:

- exact action,
- target site/person/system,
- exact data to send or change,
- risk level,
- reason the agent wants to do it,
- expiration time,
- buttons: approve, reject, edit/request changes.

### SynthesisService

File: `src/lib/agent-runtime/synthesis-service.ts`

Responsibilities:

- summarize completed results,
- mention unresolved blockers,
- attach artifacts,
- avoid fake claims,
- produce final response for Telegram/dashboard.

Rules:

- If a tool failed, final response must say what failed and what was done.
- Do not say "completed" if an approval is pending.

### LearningService

File: `src/lib/agent-runtime/learning-service.ts`

Responsibilities:

- extract candidate memories,
- extract candidate skills,
- score confidence,
- apply memory policy,
- write approved memories,
- create draft skills for repeated workflows.

Rules:

- Do not write sensitive details as memory without a reason.
- Never store card numbers, passwords, OTPs, raw tokens, or private keys.

## Plan Validation

Before execution, validate:

1. Every step ID is unique.
2. Every tool exists.
3. Every tool input passes schema validation.
4. Every required integration is connected.
5. Every high-risk step has `requiresApproval = true`.
6. Every step timeout is within allowed range.
7. Browser steps have artifact policy.
8. External submission steps have approval summary.
9. The plan has success criteria.

If validation fails:

- emit `plan.invalid`,
- synthesize a short owner-facing explanation,
- ask for clarification or fail the run.

## Tool Execution State Machine

Statuses:

1. `planned`
2. `waiting_approval`
3. `approved`
4. `running`
5. `completed`
6. `failed`
7. `rejected`
8. `skipped`
9. `cancelled`

Transitions:

- `planned -> waiting_approval` if approval required.
- `waiting_approval -> approved` on owner approval.
- `waiting_approval -> rejected` on owner rejection.
- `planned -> running` if no approval required.
- `approved -> running`.
- `running -> completed`.
- `running -> failed`.
- `failed -> planned` only if retrying and retries remain.
- `failed -> skipped` only if fallback is `skip`.

## Run State Machine

Statuses:

1. `queued`
2. `running`
3. `waiting_approval`
4. `waiting_user`
5. `blocked`
6. `completed`
7. `failed`
8. `cancelled`

Rules:

- A run with pending approval is `waiting_approval`.
- A run needing clarification is `waiting_user`.
- A run blocked by missing integration is `blocked`.
- A failed tool does not automatically fail the run if the fallback produces a useful final answer.

## Required Events

Emit these event types:

- `run.created`
- `context.loading`
- `context.loaded`
- `classification.started`
- `classification.completed`
- `planning.started`
- `planning.completed`
- `plan.invalid`
- `tool.planned`
- `tool.approval_required`
- `tool.started`
- `tool.completed`
- `tool.failed`
- `artifact.created`
- `approval.created`
- `approval.approved`
- `approval.rejected`
- `run.waiting_user`
- `run.blocked`
- `run.completed`
- `run.failed`

## Model Routing

Replace direct `new GoogleGenerativeAI(apiKey)` calls with `ModelRouter`.

Minimum `ModelRouter` API:

```ts
interface ModelRouter {
  completeJson<T>(request: JsonModelRequest<T>): Promise<ModelResult<T>>;
  completeText(request: TextModelRequest): Promise<ModelResult<string>>;
}
```

Required metadata:

- provider,
- model,
- latency,
- input tokens,
- output tokens,
- cost estimate,
- fallback count,
- finish reason.

Use LiteLLM as the preferred gateway.

## Failure Handling

Failure classes:

- `UserInputMissing`
- `IntegrationMissing`
- `AuthExpired`
- `ToolUnavailable`
- `ToolValidationFailed`
- `ModelUnavailable`
- `ApprovalRejected`
- `ExternalSiteChanged`
- `RateLimited`
- `Unexpected`

Rules:

- `IntegrationMissing` should produce setup instructions.
- `AuthExpired` should create a reconnect prompt.
- `ExternalSiteChanged` should capture screenshot and ask for help or retry with semantic browser tool.
- `ApprovalRejected` should stop that action and synthesize alternatives.

## Replay

Every completed or failed run must be replayable in dry-run mode.

Replay uses:

- stored `contextSnapshot`,
- stored `plan`,
- stored `ToolCall.args`,
- stored mocked tool outputs,
- stored artifacts.

Add:

- `npm run test -- agent-runtime`
- fixture directory: `src/lib/agent-runtime/__fixtures__/`

Minimum replay tests:

- simple question,
- calendar read,
- Telegram notification,
- browser research,
- email draft approval,
- rejected approval,
- failed tool with fallback.

