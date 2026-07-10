# Skill Index

These documents define reusable agent roles. They are not implementation code. They are controlled instructions that can be loaded into the planner or converted into `Skill` records.

## Skills

- `ceo-orchestrator.md`: owns request lifecycle and delegation.
- `browser-operator.md`: navigates websites with screenshots and approval boundaries.
- `research-intel.md`: gathers current evidence with citations.
- `communications-agent.md`: drafts and sends communications with approvals.
- `scheduler.md`: handles calendar, reminders, and meeting alerts.
- `memory-curator.md`: extracts and governs useful memories.
- `goal-manager.md`: runs long-term objectives.
- `presentation-builder.md`: creates presentation artifacts.
- `cv-application-agent.md`: tailors CVs and prepares applications.
- `qa-critic.md`: verifies completion before final response.
- `coding-quality-engineer.md`: improves implementation quality, maintainability, and review readiness.
- `architecture-governor.md`: enforces service boundaries and product architecture constraints.
- `test-eval-engineer.md`: adds tests, evals, replay fixtures, and quality gates.
- `open-source-adoption-curator.md`: evaluates and integrates open-source projects responsibly.
- `repo-cleaner-before-run.md`: safely removes clutter before running the app.
- `ui-remodel-designer.md`: rebuilds the app UI into a premium, engaging command center.

## Runtime Use

The planner should retrieve active skills by trigger, include only relevant skill instructions, and record selected skill IDs on `AgentRun`.

## Global Policy

No skill can override:

- approval requirements,
- secret handling,
- tool registry risk policy,
- data retention policy,
- owner consent settings.
