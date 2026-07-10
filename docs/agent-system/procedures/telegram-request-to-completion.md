# Procedure: Telegram Request to Completion

## Purpose

Turn a Telegram message into a durable agent run with progress updates, approvals, artifacts, and a final answer.

## Steps

1. Receive Telegram webhook update.
2. Verify webhook secret.
3. Insert `InboundMessage` with unique key `telegram:update_id`.
4. If duplicate, return HTTP 200 and stop.
5. Resolve Telegram chat ID to `IntegrationConnection`.
6. If not connected, send `/connect CODE` instructions.
7. If message is a command, route command.
8. If message is text/voice/attachment:
   - transcribe voice if needed,
   - save attachments as artifacts,
   - create `AgentRun`.
9. Emit `run.created`.
10. Send acknowledgment to Telegram.
11. Runtime loads context.
12. Runtime plans and validates.
13. Runtime executes tools through `ToolRunner`.
14. If approval required:
   - create `ApprovalRequest`,
   - send Telegram approval card,
   - set run `waiting_approval`,
   - stop execution.
15. On approval callback:
   - verify chat ID,
   - update approval,
   - resume run.
16. On completion:
   - synthesize final response,
   - send final Telegram message,
   - attach artifacts,
   - mark run `completed`.
17. On failure:
   - send exact failure summary,
   - include next action,
   - mark run `failed`.

## Required Events

- `run.created`
- `context.loaded`
- `planning.completed`
- `tool.started`
- `tool.completed` or `tool.failed`
- `approval.created` if needed
- `run.completed` or `run.failed`

## Acceptance Criteria

- Owner can see progress.
- Duplicate update does not duplicate work.
- Approval survives restart.
- Final answer matches actual run status.

