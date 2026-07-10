# Skills and Agent Roles

This product should not rely on one giant prompt. It needs clear skills: reusable, testable procedures that agents can load for specific work.

## Skill Document Format

Every skill document must use this structure:

```md
# Skill: NAME

## Purpose

One sentence describing what the skill does.

## When To Use

Concrete triggers.

## Inputs

Required and optional inputs.

## Tools

Allowed tools by name.

## Procedure

Numbered steps.

## Approval Gates

Actions requiring owner approval.

## Outputs

Expected artifacts or response.

## Failure Handling

Known failure modes and exact recovery.

## Tests

Dry-run examples and acceptance criteria.
```

## Required Agent Roles

### CEO Orchestrator

Purpose:

- Own the run.
- Decide whether to answer, plan, delegate, ask approval, or schedule follow-up.

Responsibilities:

- normalize user intent,
- choose skills,
- coordinate specialist agents,
- ensure final result meets success criteria.

Must not:

- call tools directly,
- bypass approval,
- write memory directly.

### Planner

Purpose:

- Convert request and context into executable plan.

Responsibilities:

- use real tools only,
- include assumptions,
- define success criteria,
- define risk and approval needs.

### Tool Executor

Purpose:

- Execute one step at a time with durable state.

Responsibilities:

- create `ToolCall`,
- validate input,
- run tool,
- validate output,
- emit events,
- persist artifacts.

### Browser Operator

Purpose:

- Navigate websites and produce evidence.

Responsibilities:

- use deterministic selectors first,
- capture screenshots,
- stop before submit,
- report site changes.

### Research Intel

Purpose:

- Gather current information from sources.

Responsibilities:

- prefer primary sources,
- cite source URLs,
- separate facts from inference,
- summarize forum/community data as lower-confidence.

### Communications Agent

Purpose:

- Draft messages in the owner's style.

Responsibilities:

- retrieve style memory,
- retrieve recipient/CC memory,
- draft email/Telegram messages,
- request approval before external send.

### Scheduler

Purpose:

- Manage calendar, reminders, focus blocks, and meeting alerts.

Responsibilities:

- use free/busy,
- respect quiet hours,
- schedule meeting-end reminders,
- avoid conflicts.

### Memory Curator

Purpose:

- Learn useful preferences without storing junk.

Responsibilities:

- propose memory candidates,
- apply write policy,
- queue review when needed,
- support deletion.

### Goal Manager

Purpose:

- Run long-term objectives.

Responsibilities:

- schedule daily reviews,
- search opportunities,
- track applications,
- generate next actions,
- update status.

### QA Critic

Purpose:

- Verify the output before telling the owner it is done.

Responsibilities:

- compare result against success criteria,
- check artifacts exist,
- detect unsupported claims,
- require browser screenshot or API confirmation where appropriate.

## Skill Storage

Store skills in:

- filesystem docs: `docs/agent-system/skills/*.md`
- Prisma `Skill` records for runtime retrieval.

Runtime retrieval:

1. Planner embeds/searches active skills.
2. Selects relevant skills.
3. Includes skill instructions in planning prompt.
4. Records selected skill IDs on `AgentRun`.

## Skill Creation Procedure

1. Run completes successfully.
2. LearningService detects reusable workflow.
3. Draft skill is created with source run.
4. QA Critic checks skill:
   - tools exist,
   - approval gates included,
   - no secrets,
   - tests included.
5. Owner approves activation.
6. Skill becomes `active`.

## Required Skill Documents

Create and maintain:

- `skills/ceo-orchestrator.md`
- `skills/browser-operator.md`
- `skills/research-intel.md`
- `skills/communications-agent.md`
- `skills/scheduler.md`
- `skills/memory-curator.md`
- `skills/goal-manager.md`
- `skills/presentation-builder.md`
- `skills/cv-application-agent.md`
- `skills/qa-critic.md`

These are included in this documentation package as starting points.

## Acceptance Criteria

- Planner can retrieve a skill by trigger.
- Skill instructions include exact tools and approval gates.
- Generated skills are draft until approved.
- No skill can override global security policy.

