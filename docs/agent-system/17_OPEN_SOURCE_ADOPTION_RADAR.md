# Open-Source Adoption Radar

This radar lists open-source projects worth adding or studying. It is based on current primary-source project documentation and repositories reviewed on July 9, 2026.

## Adopt Now

### Biome

Use for fast formatting/linting and repo consistency.

Source:

- https://biomejs.dev/
- https://biomejs.dev/linter/

Why:

- Fast formatter and linter for JS/TS/JSON/CSS/GraphQL.
- Good for cleanup and consistent output.

Adoption:

- Add `biome.json`.
- Add scripts:
  - `quality:format`
  - `quality:lint`
  - `quality:check`

### Knip

Use to find unused files, exports, and dependencies.

Source:

- https://knip.dev/
- https://knip.dev/typescript/unused-dependencies

Why:

- Directly matches the requested cleanup-before-run workflow.

Adoption:

- Add `knip.json`.
- Run in report mode first.
- Never auto-delete without a generated cleanup manifest.

### Gitleaks

Use to detect secrets before commits and before cleanup operations.

Source:

- https://github.com/gitleaks/gitleaks
- https://gitleaks.org/

Why:

- This repo has `.env` files. Secret scanning must be a standard gate.

Adoption:

- Add `quality:secrets`.
- Run before sharing logs, docs, or artifacts.

### MSW

Use for API mocking in UI and integration tests.

Source:

- https://mswjs.io/docs/
- https://github.com/mswjs/msw

Why:

- UI can be developed without live Telegram/Gmail/Calendar services.
- Tests remain closer to real network behavior than hand stubs.

Adoption:

- Add mocks for integrations status, approvals, activity events, agent events.

### Playwright Accessibility Tests

Use existing Playwright plus axe-style accessibility checks.

Source:

- https://playwright.dev/docs/accessibility-testing

Why:

- Premium UX must not regress on labels, contrast, and keyboard paths.

Adoption:

- Add accessibility smoke tests for dashboard, integrations, assistant, onboarding.

### Promptfoo

Use for LLM prompt and agent safety evals.

Source:

- https://www.promptfoo.dev/docs/intro/
- https://github.com/promptfoo/promptfoo

Why:

- The product depends on prompt behavior and approval safety.

Adoption:

- Add evals for:
  - no fake tool names,
  - high-risk approval,
  - no secret memory,
  - no fabricated CV claims.

## Strong Candidates

### Oxlint

Use as a high-speed lint supplement if ESLint becomes slow.

Source:

- https://oxc.rs/docs/guide/usage/linter

Why:

- High-performance JS/TS linting.

Adoption:

- Run alongside ESLint/Biome in CI after evaluating rule overlap.

### dependency-cruiser

Use to enforce architectural import boundaries.

Source:

- https://github.com/sverweij/dependency-cruiser

Why:

- The repo needs clean boundaries:
  - API routes call services.
  - Runtime calls tools through ToolRunner.
  - UI does not import server services.

Adoption:

- Add rules:
  - `src/app/api` may import `src/lib/services`, not UI.
  - `src/lib/tools` must not import React.
  - `src/components` must not import Prisma.
  - `agent-runtime` must not call tool handlers directly.

### Storybook or Ladle

Use for component development and UI QA.

Sources:

- https://storybook.js.org/
- https://ladle.dev/docs/

Recommendation:

- Use Storybook if documentation, visual regression, and design-system maturity are priorities.
- Use Ladle if speed and low setup are priorities.

Adoption:

- Start with Storybook for premium UI work because documentation and visual testing matter.
- Create stories for connection cards, approval cards, activity events, assistant states, onboarding steps.

### shadcn/ui

Use as the local component distribution base.

Source:

- https://ui.shadcn.com/docs
- https://github.com/shadcn-ui/ui

Why:

- Already aligned with the repo's local `src/components/ui` approach.
- Good for custom design language because components are copied into the codebase.

Adoption:

- Keep shadcn style, but build a custom Calmant design language on top.

### Base UI

Use for accessible unstyled components where the app needs deeper custom design.

Source:

- https://base-ui.com/
- https://base-ui.com/react/overview/quick-start

Why:

- Already in dependencies.
- Better fit for distinctive premium controls than pre-themed libraries.

Adoption:

- Use for menus, dialogs, comboboxes, tooltips, nested interaction surfaces.

### Radix UI

Use where shadcn/Radix primitives already exist.

Source:

- https://www.radix-ui.com/primitives
- https://www.radix-ui.com/

Why:

- Accessible primitives and themes are stable design-system building blocks.

Adoption:

- Continue using Radix-backed components via shadcn where practical.

### Motion

Use for tasteful microinteractions.

Source:

- https://motion.dev/
- https://motion.dev/docs

Why:

- The user explicitly wants fun and engaging, not sterile.

Adoption:

- Use motion for:
  - connection success transitions,
  - approval cards,
  - assistant progress,
  - dashboard signal changes.
- Do not animate core layout in ways that slow repeated work.

## Agent and AI Framework Candidates

### Mastra

Use as a TypeScript agent framework reference or possible replacement for custom harness pieces.

Source:

- https://mastra.ai/
- https://github.com/mastra-ai/mastra

Why:

- TypeScript-native, includes agents, workflows, memory, MCP, and observability concepts.

Adoption:

- Study before building phase 9.
- Do not replace the product harness until approval/resume/tool policy requirements are mapped.

### Pydantic AI

Use if adding Python workers for high-reliability structured agent workflows.

Source:

- https://pydantic.dev/docs/ai/overview/
- https://github.com/pydantic/pydantic-ai

Why:

- Strong structured output and validation story.

Adoption:

- Consider for browser/research workers only if the TypeScript runtime becomes limiting.

### Microsoft Agent Framework

Use as a reference for production multi-agent workflow patterns.

Source:

- https://github.com/microsoft/agent-framework
- https://learn.microsoft.com/en-us/agent-framework/overview/

Why:

- Production-grade concepts: state, type safety, middleware, telemetry, graph workflows.

Adoption:

- Study, but do not add unless the repo introduces .NET/Python worker services.

### CopilotKit / AG-UI

Use as a reference or adoption candidate for agentic UI events and human-in-the-loop frontend behavior.

Source:

- https://github.com/copilotkit/copilotkit
- https://www.copilotkit.ai/

Why:

- Focuses on frontend agent UX, shared state, and human-in-the-loop.

Adoption:

- Consider after `AgentEvent` exists.
- Do not add before runtime event contract is stable.

## Security and Dependency Candidates

### Semgrep

Use for security/static analysis rules.

Source:

- https://docs.semgrep.dev/
- https://github.com/semgrep/semgrep

Adoption:

- Add rules for:
  - no direct `registry.execute` outside ToolRunner,
  - no `exec` in user tools,
  - no env secrets in prompts.

### Trivy

Use for dependency/container/IaC vulnerability scanning.

Source:

- https://trivy.dev/
- https://github.com/aquasecurity/trivy

Adoption:

- Add to CI once Docker deployment stabilizes.
- Pin action versions carefully.

### Renovate

Use for dependency update automation.

Source:

- https://docs.renovatebot.com/
- https://github.com/renovatebot/renovate

Adoption:

- Configure grouped PRs:
  - Next/React,
  - Prisma,
  - AI SDKs,
  - UI libraries,
  - test tooling.

## Defer

### DeepEval

Source:

- https://deepeval.com/docs/introduction
- https://github.com/confident-ai/deepeval

Reason to defer:

- Python-oriented. Use Promptfoo first for TS app evals. Consider DeepEval if Python workers are added.

### AutoGen

Source:

- https://github.com/microsoft/autogen

Reason to defer:

- Repository indicates maintenance mode. Prefer Microsoft Agent Framework for new work.

## Avoid for Now

- Any UI kit that forces a generic SaaS look and fights local design language.
- Any agent framework that hides tool calls from product state.
- Any "autonomous browser" package that submits forms without a product-level approval layer.
- Any cleanup tool run with automatic deletion before a reviewed manifest exists.

