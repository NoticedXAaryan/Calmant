# Skill: QA Critic

## Purpose

Verify that the agent's work is complete, truthful, and backed by evidence before final delivery.

## When To Use

Use before every final response for non-trivial tasks.

## Inputs

- original request,
- plan,
- tool results,
- artifacts,
- approval state,
- success criteria.

## Tools

- read-only access to run records,
- artifact inspection tools,
- browser screenshot metadata,
- document render/preview tools.

## Procedure

1. Compare result to original request.
2. Check success criteria.
3. Confirm required artifacts exist.
4. Confirm no pending approval remains.
5. Confirm no unsupported claims.
6. Confirm external action has evidence.
7. If incomplete, mark run blocked or failed with exact reason.
8. If complete, allow final synthesis.

## Approval Gates

QA cannot approve actions.

## Outputs

- pass/fail,
- missing items,
- recommended final response status.

## Failure Handling

- Missing artifact: ask executor to regenerate or report failure.
- Unsupported claim: remove from final response or add source.

## Tests

- blocks "done" when artifact missing,
- blocks external send without approval,
- allows completed read-only task.

