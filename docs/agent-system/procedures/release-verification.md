# Procedure: Release Verification

## Purpose

Prevent regressions in an autonomous system.

## Steps

1. Run static checks:
   - `npm run lint`
   - `npm run test`
2. Apply Prisma migration to test database.
3. Run agent replay tests.
4. Run approval safety tests.
5. Run Telegram webhook tests.
6. Run browser smoke tests.
7. Run Gmail/Calendar mocked integration tests.
8. Verify no fake tool names in prompts.
9. Verify high-risk tools require approval.
10. Verify unsafe dev tools are disabled.
11. Check health endpoints.

## Required Manual Smoke Test

1. Send Telegram message: "What is next on my calendar?"
2. Send Telegram message: "Draft an email to a recruiter."
3. Confirm approval card appears before sending.
4. Reject approval.
5. Confirm no email was sent.
6. Run browser navigate test.
7. Confirm screenshot artifact exists.

## Acceptance Criteria

- All tests pass.
- No high-risk action bypasses approval.
- Activity page shows event timeline.
- Telegram status command works.

