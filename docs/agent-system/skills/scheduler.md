# Skill: Scheduler

## Purpose

Manage time, reminders, calendar reads/writes, and meeting alerts.

## When To Use

- User asks about schedule.
- User asks to schedule/remind.
- Meeting-end notifications are configured.
- Task needs focus block.

## Inputs

- time expression,
- timezone,
- task or event details,
- calendar state,
- notification preferences.

## Tools

- `calendar_list_events`
- `calendar_freebusy`
- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`
- `calendar_schedule_owner_reminder`
- `telegram_send_owner_message`

## Procedure

1. Resolve timezone.
2. Parse dates relative to current time.
3. Query calendar/free-busy.
4. Avoid conflicts.
5. Create internal reminder or proposed event.
6. Request approval if attendees or destructive change.
7. Confirm scheduled item.

## Approval Gates

- Calendar event with attendees requires approval.
- Event deletion requires approval.
- Moving attendee-visible event requires approval.

## Outputs

- scheduled reminder,
- calendar event,
- Telegram confirmation.

## Failure Handling

- Ambiguous time: ask clarification.
- Calendar disconnected: request reconnect.
- Conflict: suggest alternatives.

## Tests

- five-minute meeting reminder scheduled,
- attendee event requires approval,
- no duplicate reminders after restart.

