# Browser Automation and Artifacts

Browser automation is necessary when no official API exists. It must be evidence-driven because websites change.

## Current State

Files:

- `src/lib/tools/browser.ts`
- `sandbox/server.js`
- `src/lib/harness/executor.ts`
- Prisma model `Artifact`

Current behavior:

- One global `activeSessionId`.
- Navigate, action, extract, and screenshot through sandbox server.
- Returns text strings to the model.

Problems:

- Browser session is not bound to user or run.
- No screenshot artifact records.
- No login/credential policy.
- No semantic retry layer.
- No safe submit boundary.

## Browser Service

Create `src/lib/services/browser-session-service.ts`.

API:

```ts
class BrowserSessionService {
  createSession(input: { userId: string; runId: string }): Promise<BrowserSessionRecord>;
  getSession(input: { userId: string; runId: string }): Promise<BrowserSessionRecord>;
  navigate(input: { userId: string; runId: string; url: string }): Promise<BrowserPageSnapshot>;
  extract(input: { userId: string; runId: string }): Promise<BrowserPageSnapshot>;
  act(input: BrowserActInput): Promise<BrowserActionResult>;
  screenshot(input: { userId: string; runId: string; label?: string }): Promise<ArtifactRecord>;
  closeSession(input: { userId: string; runId: string }): Promise<void>;
}
```

## Browser Action Input

```ts
interface BrowserActInput {
  userId: string;
  runId: string;
  action: "click" | "type" | "scroll" | "select" | "upload" | "download" | "submit";
  selector?: string;
  targetDescription?: string;
  value?: string;
  requiresApproval?: boolean;
}
```

Rules:

- Use `selector` for deterministic actions.
- Use `targetDescription` for semantic fallback.
- `submit`, `upload`, and actions on payment/application/send buttons require approval.

## Browser Task Procedure

1. Create or resume run-bound browser session.
2. Navigate to target URL.
3. Capture screenshot artifact.
4. Extract page:
   - URL,
   - title,
   - visible text,
   - forms,
   - buttons,
   - links,
   - inputs,
   - accessibility tree if available.
5. Plan next action.
6. If action can change external state, create approval request.
7. Execute action.
8. Capture post-action screenshot.
9. Validate expected result.
10. Repeat until success criteria met.
11. Store final artifacts.

## Submit Boundary

The agent may fill forms before approval if the owner asked for it and no sensitive data is exposed beyond the page. The agent may not click final submit without approval.

Final submit indicators:

- button text includes submit, apply, send, book, buy, pay, confirm, post, publish, register,
- URL path includes checkout, payment, submit,
- form has payment fields,
- action sends message to third party,
- action uploads owner documents.

## Login Procedure

1. If already logged in through browser profile, continue.
2. If login page appears:
   - ask owner to log in manually through secure browser handoff,
   - or use OAuth/API integration if available.
3. Never ask the LLM to read or store passwords.
4. Never send OTP to model context.
5. After owner completes login, continue from session state.

## Artifact Rules

Every significant browser step creates an artifact:

- initial page screenshot,
- form filled screenshot before submit,
- confirmation page screenshot,
- downloaded files,
- generated PDFs,
- extracted data JSON.

Artifact metadata must include:

- run ID,
- tool call ID,
- browser session ID,
- URL,
- title,
- timestamp,
- action label,
- redaction status.

## Open-Source Browser Resources

Use in this order:

1. Playwright for deterministic execution.
2. Stagehand for semantic action/extraction fallback.
3. browser-use or Skyvern for complex external workflows if wrapping them is faster than building custom logic.

Do not let a browser framework bypass the product approval layer.

## Presentation Creation Through Browser

Preferred order:

1. Use Google Slides API or local PPTX generation.
2. Use browser automation only when the owner specifically wants a website-based builder.
3. If using browser:
   - open site,
   - login handoff if needed,
   - create draft,
   - screenshot preview,
   - export/download,
   - attach artifact.

## Validation

For a browser workflow to be considered complete:

- final page confirms action or artifact exists,
- screenshot captured,
- output file exists if expected,
- no pending approval remains,
- user-facing response includes what was completed and artifact link.

## Tests

Add Playwright tests:

- sandbox health,
- create session,
- navigate to example page,
- extract text,
- click deterministic button,
- screenshot artifact creation,
- failed selector recovery,
- approval before submit.

## Acceptance Criteria

- Browser session is scoped to run.
- Screenshots are stored as artifacts.
- Form submit requires approval.
- Login never exposes credentials to model.
- Browser failures produce evidence, not vague errors.
- Owner can watch progress from Telegram/dashboard.

