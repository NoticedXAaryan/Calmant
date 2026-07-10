# Procedure: Approval Gates

## Purpose

Ensure the owner explicitly authorizes risky real-world actions.

## When To Create Approval

Create approval for:

- third-party email send,
- calendar event with attendees,
- application submission,
- browser final submit,
- file upload to external site,
- destructive action,
- credential/login handoff,
- any action involving money.

## Steps

1. Executor identifies approval-required step.
2. Create `ToolCall` with status `waiting_approval`.
3. Create `ApprovalRequest`.
4. Emit `approval.created`.
5. Send Telegram approval card.
6. Set `AgentRun.status = waiting_approval`.
7. Stop execution.
8. On approval:
   - verify owner,
   - set approval `approved`,
   - set tool call `approved`,
   - resume run.
9. On rejection:
   - set approval `rejected`,
   - set tool call `rejected`,
   - synthesize alternative or stop.
10. On expiration:
   - set approval `expired`,
   - mark run `waiting_user` or `blocked`.

## Approval Card Must Include

- action,
- recipient/target,
- exact payload preview,
- attachments,
- risk,
- reason,
- expiration.

## Acceptance Criteria

- No high-risk tool can run without approved `ApprovalRequest`.
- Approval route cannot execute generic payloads.
- Approval is audited.

