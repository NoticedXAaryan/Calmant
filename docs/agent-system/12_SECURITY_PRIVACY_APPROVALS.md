# Security, Privacy, and Approval Rules

The system will act on the owner's behalf. That requires strict boundaries.

## Non-Negotiable Rules

1. Never submit external forms without approval.
2. Never send third-party email without approval.
3. Never spend money.
4. Never store passwords, OTPs, private keys, card numbers, or raw OAuth tokens in memory.
5. Never pass secrets into model prompts.
6. Never execute arbitrary shell commands from user-originated tasks.
7. Never delete user data without approval.
8. Never claim completion without evidence.
9. Never use browser automation to bypass site rules, paywalls, or access controls.
10. Never hide failures from the owner.

## Risk Classes

### Read

Examples:

- read calendar,
- read Gmail snippets,
- search web,
- extract browser page,
- search memory.

Approval:

- usually not required if integration is connected.

### Internal Write

Examples:

- create task,
- create artifact,
- create memory candidate,
- create draft.

Approval:

- policy-based.

### External Message

Examples:

- email recruiter,
- Telegram message to someone else,
- post on website.

Approval:

- always required unless recipient is the owner and message is a notification.

### External Submission

Examples:

- submit application,
- upload CV,
- register for program,
- book appointment.

Approval:

- always required.

### Destructive

Examples:

- delete event,
- delete task,
- delete memory,
- cancel booking.

Approval:

- always required.

### Credential

Examples:

- login,
- OAuth reconnect,
- OTP flow.

Approval:

- always owner-driven. Do not ask model to handle secrets.

### Financial

Examples:

- purchase,
- paid booking,
- card usage.

Approval:

- out of scope by default. Requires explicit product expansion.

## Approval Request Requirements

Every approval must show:

- action,
- target,
- data to be sent/changed,
- risk class,
- reason,
- generated content preview,
- attachments,
- expiration,
- approve/reject/edit controls.

Approval must not be vague.

Bad:

- "Approve this action?"

Good:

- "Approve sending this email to recruiter@example.com with subject 'Application for AI Research Intern' and attached CV `cv_company_x.pdf`?"

## Secret Handling

Rules:

- Store OAuth tokens encrypted.
- Do not include tokens in logs.
- Do not include tokens in `AgentEvent.metadata`.
- Do not include credentials in tool outputs.
- Do not send credentials to LLMs.
- Redact screenshots if they contain secrets.

## Browser Credential Flow

If login is required:

1. Pause run.
2. Ask owner to complete login.
3. Provide browser handoff link if supported.
4. Resume after login confirmation.
5. Do not store password.
6. Do not let LLM see OTP or password.

## Data Minimization

Email:

- store snippets and metadata by default,
- store full body only when needed and approved,
- store classification result.

Browser:

- store screenshots needed for proof,
- expire screenshots by retention policy.

Memory:

- store distilled facts, not raw conversations.

## Filesystem and Shell

The current registry includes `write_file` and `run_command`.

Policy:

- User-originated runs cannot use `run_command`.
- User-originated runs cannot write outside approved artifact directories.
- Developer-mode runs can use shell tools only when explicitly invoked by developer/admin context.

Approved artifact directories:

- `storage/artifacts/`
- temporary run-scoped workdir.

## Audit Events

Create audit events for:

- integration connected/disconnected,
- approval created,
- approval approved/rejected,
- external message sent,
- external form submitted,
- memory written/deleted,
- goal created/completed,
- browser login handoff,
- token refresh failure.

Audit event must include:

- userId,
- action,
- targetType,
- targetId,
- runId/toolCallId if available,
- non-secret details.

## Acceptance Criteria

- High-risk tools cannot run without approval.
- Approval action resumes a paused run after restart.
- Secrets are not present in prompts, logs, events, or artifacts.
- Shell tool is not available to normal user tasks.
- Owner can delete memories and artifacts.

