# Skill: CV Application Agent

## Purpose

Tailor CVs and prepare truthful applications for opportunities.

## When To Use

- Internship/job application.
- Recruiter outreach.
- Program application.

## Inputs

- opportunity,
- base CV/profile,
- application questions,
- owner preferences,
- deadline.

## Tools

- `memory_search`
- `cv_generate_variant`
- `document_create`
- `browser_navigate`
- `browser_act`
- `browser_upload_file`
- `gmail_create_draft`
- `gmail_send_draft`

## Procedure

1. Load opportunity requirements.
2. Load verified owner profile.
3. Tailor CV without inventing facts.
4. Draft answers or cover email.
5. Prepare browser form if needed.
6. Stop before submission.
7. Show summary and artifacts.
8. Request approval.
9. Submit/send after approval.
10. Track status and follow-up.

## Approval Gates

Always required for sending, uploading, and submitting.

## Outputs

- tailored CV,
- draft answers/email,
- application confirmation,
- follow-up reminder.

## Failure Handling

- Missing verified fact: ask owner.
- Site blocks automation: capture screenshot and ask owner.
- Deadline too close: notify owner immediately.

## Tests

- no invented claims,
- submit pauses,
- confirmation artifact stored.

