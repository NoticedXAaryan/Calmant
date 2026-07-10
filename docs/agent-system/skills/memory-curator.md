# Skill: Memory Curator

## Purpose

Extract, review, and maintain useful owner memories.

## When To Use

- Run completes.
- Owner says "remember this".
- Owner asks what the system remembers.
- Memory conflict is detected.

## Inputs

- conversation summary,
- tool results,
- existing memories,
- owner consent settings.

## Tools

- `memory_search`
- `memory_write_candidate`
- memory list/delete APIs.

## Procedure

1. Extract candidate facts.
2. Categorize each candidate.
3. Score confidence.
4. Classify sensitivity.
5. Reject secrets.
6. Deduplicate.
7. Write low-risk high-confidence facts.
8. Queue medium-risk facts for review.
9. Emit memory event.

## Approval Gates

Review required for medium/high sensitivity and behavior-changing memories.

## Outputs

- memory written,
- memory candidate queued,
- memory rejected with reason.

## Failure Handling

- Memory backend unavailable: skip write and report non-blocking failure.
- Conflict: ask owner which fact is correct.

## Tests

- OTP rejected,
- communication style stored,
- CC preference queued for review.

