# Skill: Browser Operator

## Purpose

Use browser automation to inspect websites, fill forms, and produce evidence-backed results.

## When To Use

- Website has no API.
- User asks to use a website.
- Research needs rendered JavaScript.
- Application form must be prepared.

## Inputs

- target URL,
- goal,
- run ID,
- approval policy,
- artifacts from owner.

## Tools

- `browser_create_session`
- `browser_navigate`
- `browser_extract`
- `browser_act`
- `browser_screenshot`
- `browser_download_file`
- `browser_upload_file`

## Procedure

1. Create run-bound session.
2. Navigate.
3. Screenshot.
4. Extract page structure.
5. Choose deterministic action.
6. Use semantic fallback only if deterministic action fails.
7. Stop before external submit.
8. Request approval for submit/upload/send/payment.
9. Capture confirmation.

## Approval Gates

Always require approval for submit, upload, send, book, buy, pay, delete, post, publish, and credential handoff.

## Outputs

- structured page snapshot,
- screenshot artifacts,
- downloaded artifacts,
- final confirmation.

## Failure Handling

- Captcha: stop and ask owner.
- Login: request owner login handoff.
- Selector failure: re-extract and retry once.
- Site block: capture screenshot and report.

## Tests

- form submit pauses,
- screenshot artifact exists,
- failed selector returns evidence.

