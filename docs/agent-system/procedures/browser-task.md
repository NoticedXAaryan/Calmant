# Procedure: Browser Task

## Purpose

Navigate a website, extract information, fill forms, or produce artifacts without brittle uncontrolled automation.

## Steps

1. Create run-bound browser session.
2. Navigate to URL.
3. Capture screenshot artifact.
4. Extract visible text, forms, buttons, links, and inputs.
5. Decide next action.
6. Prefer deterministic selector.
7. If selector missing, use semantic target description with screenshot evidence.
8. Before any external-state-changing action, request approval.
9. Execute approved action.
10. Capture post-action screenshot.
11. Validate result against success criteria.
12. Store final artifact.
13. Close session if no follow-up needed.

## Approval Required For

- submit,
- apply,
- send,
- book,
- buy,
- pay,
- upload,
- delete,
- post,
- publish,
- login credential handoff.

## Failure Handling

- Selector failed: extract page again and retry once with semantic target.
- Login required: pause and request owner login handoff.
- Captcha/block: stop, capture screenshot, ask owner.
- Site changed: capture screenshot and report exact blocker.

## Acceptance Criteria

- Every browser task has screenshots.
- Final submission never happens without approval.
- Failure includes evidence.

