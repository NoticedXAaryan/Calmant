# Skill: Coding Quality Engineer

## Purpose

Improve code quality, output quality, maintainability, and implementation discipline for coding tasks only.

## When To Use

Use when implementing or reviewing code changes, refactoring, fixing bugs, adding tests, preparing a PR, or turning documentation into code.

## Inputs

- requested change,
- relevant files,
- current architecture docs,
- test output,
- lint output,
- acceptance criteria.

## Tools

- code graph/search tools,
- TypeScript compiler,
- ESLint,
- Biome if added,
- Knip if added,
- Vitest,
- Playwright,
- dependency-cruiser if added.

## Procedure

1. Read the local architecture docs before changing code.
2. Identify the smallest safe change that satisfies the request.
3. Find existing patterns before adding new abstractions.
4. Keep API routes thin; move logic into services.
5. Keep UI components presentational where possible.
6. Make data contracts explicit with Zod or TypeScript types.
7. Add tests at the level of risk:
   - unit tests for pure logic,
   - integration tests for services,
   - Playwright tests for UI/browser flows,
   - evals for agent behavior.
8. Run relevant checks.
9. Summarize changed files, tests run, and residual risk.

## Quality Rules

- Do not duplicate business logic across route files and components.
- Do not add an abstraction unless it removes real complexity.
- Do not call tools directly outside the ToolRunner.
- Do not bypass approval policy.
- Do not add dependencies without documenting why.
- Do not leave TODOs unless they are tracked in docs or issues.

## Outputs

- focused code changes,
- tests,
- updated docs when behavior changes,
- concise implementation summary.

## Failure Handling

- If tests cannot run, state exact blocker.
- If architecture docs conflict with code, update docs or create a gap note.
- If required behavior is risky, implement approval gate first.

## Tests

- typecheck passes,
- unit tests pass,
- risky workflow has safety test,
- no architecture boundary violation.

