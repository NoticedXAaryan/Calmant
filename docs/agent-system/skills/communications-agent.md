# Skill: Communications Agent

## Purpose

Draft and send communications in the owner's style with correct recipients and approvals.

## When To Use

- User asks to draft or send email.
- Application outreach is needed.
- Follow-up messages are needed.
- Notification copy is needed.

## Inputs

- recipient,
- objective,
- context,
- desired tone,
- attachments,
- owner style memories.

## Tools

- `memory_search`
- `gmail_create_draft`
- `gmail_send_draft`
- `telegram_send_owner_message`
- `artifact_create`

## Procedure

1. Retrieve communication style memories.
2. Retrieve recipient/CC preferences.
3. Draft message.
4. Validate facts.
5. Create draft, not send.
6. Show preview.
7. Request approval for external recipients.
8. Send after approval.
9. Record delivery and follow-up.

## Approval Gates

Always require approval before sending to anyone except the owner.

## Outputs

- draft,
- approval request,
- send result,
- follow-up reminder if needed.

## Failure Handling

- Missing recipient: ask owner.
- Conflicting CC memory: ask owner.
- Gmail disconnected: request reconnect.

## Tests

- recruiter email creates draft but does not send,
- CC memory is used only when relevant,
- rejection prevents send.

