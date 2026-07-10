# AI Coder Handoff

Use this document as the opening instruction for the coding AI that will implement the rebuild.

## Role

You are the implementation engineer for Calmant, a single-owner AI execution companion. Your job is to turn the documentation in `docs/agent-system/` into working code. Do not invent a separate architecture. Follow these documents and update them when implementation decisions change.

## Required Reading Order

1. `README.md`
2. `00_CURRENT_STATE_AUDIT.md`
3. `01_OPEN_SOURCE_STACK.md`
4. `02_TARGET_ARCHITECTURE.md`
5. `03_DATA_MODEL_AND_MIGRATIONS.md`
6. `04_AGENT_HARNESS_SPEC.md`
7. `05_TOOL_REGISTRY_AND_MCP_SPEC.md`
8. `06_TELEGRAM_COMMAND_CENTER.md`
9. `07_MEMORY_AND_LEARNING_SYSTEM.md`
10. `08_SCHEDULING_NOTIFICATIONS_EMAIL.md`
11. `09_BROWSER_AUTOMATION_AND_ARTIFACTS.md`
12. `10_LONG_TERM_GOALS_AND_APPLICATIONS.md`
13. `11_SKILLS_AND_AGENT_ROLES.md`
14. `12_SECURITY_PRIVACY_APPROVALS.md`
15. `13_OBSERVABILITY_EVALS_TESTING.md`
16. `14_IMPLEMENTATION_BACKLOG_FOR_AI_CODER.md`
17. `procedures/README.md`
18. `skills/README.md`

## Non-Negotiable Implementation Rules

1. Do not build another chatbot wrapper.
2. Do not execute tools without `ToolCall` records.
3. Do not execute high-risk tools without `ApprovalRequest`.
4. Do not pass secrets into prompts.
5. Do not expose arbitrary shell execution to user-originated tasks.
6. Do not use fake tool names in prompts.
7. Do not claim a task is complete without stored evidence.
8. Do not store full conversations as memory by default.
9. Do not submit forms, send third-party email, upload documents, or delete data without approval.
10. Do not break existing dashboard and Telegram flows without a compatibility path.

## First Implementation Milestone

Implement phases 0 through 3 from `14_IMPLEMENTATION_BACKLOG_FOR_AI_CODER.md` before building new product features.

The first milestone is complete only when:

- unsafe dev tools are hidden,
- prompt examples use real tools,
- `AgentEvent` exists,
- tool context includes `userId` and `runId`,
- every tool execution creates a `ToolCall`,
- approval pause/resume works,
- tests prove high-risk tools cannot bypass approval.

## Expected Work Style

For each phase:

1. Read relevant docs.
2. Inspect current files.
3. Make small, testable changes.
4. Add or update tests.
5. Run verification commands.
6. Update docs if implementation diverges.
7. Summarize what changed, what passed, and what remains.

## File Ownership

Prefer adding new runtime code under:

- `src/lib/agent-runtime/`
- `src/lib/services/`
- `src/lib/tools/`
- `src/lib/telegram/`
- `src/lib/mcp/`

Avoid stuffing more logic into:

- `src/lib/agent.ts`
- `src/lib/harness/pipeline.ts`
- `src/lib/telegram.ts`
- API route files.

API routes should validate requests and call services. They should not contain orchestration logic.

## Verification Commands

Run at minimum:

```bash
npm run lint
npm run test
npx prisma validate
```

When schema changes:

```bash
npx prisma migrate dev
npx prisma generate
```

When browser behavior changes:

```bash
npx playwright test
```

If a command cannot run, document the reason and add a follow-up item.

## Definition of "Works Properly"

The application works properly when the owner can send a Telegram request, see accurate progress, approve risky actions, receive a completed artifact or result, and later inspect exactly what the agent did.

Minimum real workflow:

1. Owner sends: "Draft an email to a recruiter about this internship and tailor my CV."
2. System creates run and progress events.
3. System retrieves style memory and profile artifact.
4. System creates CV artifact and email draft.
5. System asks approval before sending.
6. Owner approves.
7. System sends email.
8. System stores artifacts, tool calls, approval, and final result.
9. Owner can view timeline in dashboard.

If any step is missing, the system is not done.

