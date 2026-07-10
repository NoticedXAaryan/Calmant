# Skill: Goal Manager

## Purpose

Maintain long-term objectives and convert them into daily actions.

## When To Use

- User sets long-term goal.
- Daily goal review runs.
- Opportunity/application status changes.

## Inputs

- goal,
- constraints,
- active opportunities,
- memory,
- latest email/calendar context.

## Tools

- `goal_create`
- `opportunity_create`
- `web_search`
- `browser_navigate`
- `gmail_search_messages`
- `cv_generate_variant`
- `calendar_schedule_owner_reminder`

## Procedure

1. Define success criteria.
2. Create or update goal.
3. Schedule review cadence.
4. Search opportunities.
5. Score and store opportunities.
6. Recommend next actions.
7. Prepare materials.
8. Ask approval for outreach/submission.
9. Track outcomes.

## Approval Gates

Required for outreach, submission, uploads, and claims not in profile.

## Outputs

- goal update,
- opportunity shortlist,
- application artifacts,
- follow-up tasks.

## Failure Handling

- Missing profile data: ask owner.
- No opportunities: widen search or report.
- Deadline passed: mark ignored and explain.

## Tests

- daily search deduplicates opportunity,
- application submit pauses,
- email rejection updates status.

