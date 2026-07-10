# Long-Term Goals and Application Workflows

The system must handle long-running objectives, not just one-off chat requests. A target internship or role is the main example.

## Goal Model

A goal is a durable objective with strategy, review schedule, evidence, and next actions.

Examples:

- "Land a research internship in AI by September."
- "Get selected for the XYZ accelerator."
- "Build and submit a hackathon project."
- "Prepare and deliver a presentation for Monday."

Required data:

- title,
- success criteria,
- target date,
- constraints,
- preferred locations/companies,
- materials available,
- active strategy,
- next review date,
- current status.

## Goal Lifecycle

Statuses:

- `active`
- `paused`
- `completed`
- `abandoned`

Transitions:

- owner creates goal -> `active`
- owner pauses -> `paused`
- success criteria met -> `completed`
- owner abandons -> `abandoned`

Every status change creates an `AuditEvent`.

## Daily Opportunity Search

Procedure:

1. Load active goals.
2. For each goal, create a `GoalReviewRun`.
3. Search sources:
   - company career pages,
   - university portals,
   - LinkedIn/Wellfound/YC/Google Summer of Code-style pages where allowed,
   - forums and communities,
   - newsletters,
   - GitHub issues/discussions for open-source roles,
   - saved sources from memory.
4. For each opportunity:
   - normalize title,
   - extract organization,
   - source URL,
   - deadline,
   - requirements,
   - eligibility,
   - evidence snippets,
   - application URL.
5. Deduplicate by URL and organization/title/deadline.
6. Score fit.
7. Store `Opportunity`.
8. Notify owner with shortlist.

Fit scoring criteria:

- eligibility match,
- skill match,
- deadline urgency,
- prestige/priority,
- probability of interview,
- effort required,
- alignment with owner preferences.

## Custom CV Generation

Procedure:

1. Load base profile artifact or structured profile.
2. Load opportunity requirements.
3. Retrieve relevant memories:
   - writing style,
   - preferred achievements,
   - default contact details,
   - formatting preference.
4. Generate tailored CV draft.
5. Validate:
   - no invented experience,
   - dates consistent,
   - skills relevant,
   - one page if configured,
   - ATS-friendly.
6. Store artifact:
   - DOCX or PDF,
   - metadata includes opportunity ID.
7. Send Telegram preview.
8. Ask approval before using it in an application.

Rules:

- Never invent credentials, roles, grades, publications, or awards.
- If information is missing, ask owner.
- Use exact evidence from profile artifacts.

## Outreach Strategy

Procedure:

1. Identify best contact:
   - recruiter,
   - hiring manager,
   - professor,
   - alumni,
   - project maintainer.
2. Gather public context.
3. Draft message in owner style.
4. Apply CC preferences from memory only if high confidence.
5. Create draft.
6. Ask owner approval.
7. Send after approval.
8. Schedule follow-up.

Follow-up policy:

- First follow-up after 4-7 days unless deadline is sooner.
- Stop after 2 follow-ups unless owner says otherwise.
- Do not nag contacts.

## Application Submission

Procedure:

1. Open application URL with browser or API.
2. Fill known fields.
3. Stop before final submission.
4. Capture screenshot and form data artifact.
5. Show owner summary:
   - role,
   - organization,
   - answers,
   - attached CV,
   - additional documents,
   - declarations.
6. Require explicit approval.
7. Submit.
8. Capture confirmation.
9. Store application status as `Opportunity.status = "applied"`.
10. Schedule follow-up and email monitoring.

## Forums and Community Reading

Use cases:

- understand application process,
- find hidden opportunities,
- identify recruiter preferences,
- learn interview patterns.

Procedure:

1. Search web/forums.
2. Prefer primary sources.
3. Summarize community sources with caveat.
4. Store useful findings in opportunity evidence, not permanent memory unless owner approves.

Rules:

- Do not treat forum rumors as facts.
- Cite source URLs in the run artifact.

## Goal Review Briefing

Daily or configured cadence:

- new opportunities found,
- applications needing action,
- upcoming deadlines,
- responses received,
- recommended next action,
- blockers needing owner input.

Telegram format:

```text
Goal update: AI research internship

Found: 6 new opportunities
Shortlisted: 2
Needs you: 1 missing transcript
Next action: approve tailored CV for Company X
```

## Acceptance Criteria

- Owner can create a goal from Telegram.
- System searches daily.
- Opportunities are stored and deduplicated.
- CV variants are generated from real evidence.
- Applications never submit without approval.
- Follow-ups are scheduled and tracked.
- Outcome emails update opportunity status.

