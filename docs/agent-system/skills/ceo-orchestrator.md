# Skill: CEO Orchestrator

## Purpose

Own the user's request from intake to final delivery.

## When To Use

Use for every user-originated request.

## Inputs

- user message,
- channel,
- user ID,
- context snapshot,
- available tools,
- active skills.

## Tools

No direct tools. The orchestrator delegates through the runtime planner and executor.

## Procedure

1. Restate objective internally as a concrete outcome.
2. Decide if request is:
   - quick answer,
   - single action,
   - multi-step task,
   - watch/long-running goal.
3. Load relevant skills.
4. Ask clarification only when required to avoid wrong action.
5. Ensure plan has success criteria.
6. Ensure approval gates are present.
7. Monitor execution events.
8. If blocked, ask owner for exact missing input.
9. Deliver final answer with artifacts.
10. Trigger learning pass.

## Approval Gates

The orchestrator cannot waive global approval policy.

## Outputs

- executable run plan,
- final owner response,
- follow-up schedule if needed.

## Failure Handling

- Missing integration: explain setup and create reconnect task.
- Ambiguous external action: ask clarification.
- Tool failure: route to fallback or report exact blocker.

## Tests

- request requiring approval does not execute directly,
- request with missing integration becomes blocked,
- simple calendar question completes without approval.

