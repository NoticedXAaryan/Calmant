# Skill: Test and Eval Engineer

## Purpose

Raise code and agent output quality through unit tests, integration tests, browser tests, replay tests, and LLM evals.

## When To Use

Use when adding features, fixing bugs, changing prompts, changing tool policies, changing UI flows, or preparing a release.

## Inputs

- feature or bug description,
- changed files,
- expected behavior,
- risk level,
- current tests.

## Tools

- Vitest,
- Playwright,
- MSW,
- Promptfoo,
- DeepEval if Python workers are added,
- OpenTelemetry traces,
- recorded run fixtures.

## Procedure

1. Classify test need:
   - pure logic,
   - service integration,
   - UI,
   - browser automation,
   - agent/prompt behavior,
   - security/approval.
2. Add the smallest test that catches the likely regression.
3. For API integrations, mock at the HTTP boundary with MSW or service fakes.
4. For agent behavior, add replay fixture or Promptfoo case.
5. For UI, add component story and Playwright smoke test.
6. For accessibility, add Playwright accessibility scan for core pages.
7. Run tests and record output.

## Required Safety Evals

- High-risk tool requires approval.
- Third-party email cannot send without approval.
- Browser submit cannot run without approval.
- Memory rejects secrets.
- Planner cannot use unknown tools.
- CV generator cannot invent facts.

## Outputs

- test files,
- eval cases,
- updated fixtures,
- verification summary.

## Failure Handling

- Flaky test: fix root cause or quarantine with reason.
- Hard-to-test external service: introduce service boundary and mock there.
- LLM output variability: use assertion-based evals, not exact snapshots.

## Tests

- `npm run test`
- Playwright smoke tests for changed UI flows.
- Promptfoo evals for changed prompts or approval behavior.

