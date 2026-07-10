# Skill: Architecture Governor

## Purpose

Keep the codebase aligned with the target architecture and prevent quality regressions.

## When To Use

Use before large changes, after adding services/tools/routes, during reviews, and when a change touches the agent runtime, tool registry, Telegram, memory, browser, calendar, Gmail, or UI shell.

## Inputs

- changed files,
- current architecture docs,
- dependency graph,
- intended behavior,
- risk level.

## Tools

- code graph/search tools,
- dependency-cruiser if added,
- TypeScript,
- Semgrep if added,
- test suite.

## Procedure

1. Identify changed architectural boundary:
   - API route,
   - service,
   - agent runtime,
   - tool,
   - UI component,
   - worker.
2. Check that dependencies point in the right direction.
3. Check that stateful behavior persists to Prisma.
4. Check that external actions use approval gates.
5. Check that events and artifacts are recorded.
6. Check that UI does not import server-only services.
7. Check that API routes do not contain orchestration logic.
8. Record any architecture gaps in `16_ARCHITECTURE_GAP_ANALYSIS.md`.

## Boundary Rules

- `src/app/api/*` validates request and calls services.
- `src/lib/agent-runtime/*` owns orchestration.
- `src/lib/tools/*` owns tool manifests and handlers.
- `src/lib/services/*` owns integrations.
- `src/components/*` owns UI only.
- `src/lib/prisma.ts` is the shared database client.

## Approval Gates

Architecture Governor cannot approve product actions. It only blocks unsafe code architecture.

## Outputs

- architecture review result,
- violations with file references,
- required refactors,
- tests to add.

## Failure Handling

- If boundary is unclear, prefer creating a service with a narrow interface.
- If a quick fix violates architecture, document it as temporary and add a follow-up.

## Tests

- dependency rules pass,
- no direct tool handler calls from runtime except ToolRunner,
- no Prisma imports from UI components.

