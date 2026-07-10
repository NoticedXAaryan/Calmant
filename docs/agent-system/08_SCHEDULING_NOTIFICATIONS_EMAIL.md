# Scheduling, Notifications, and Email

The system must manage time and communication flow. It should warn the owner at useful moments, scan important email outcomes, and draft communications in the owner's style.

## Current State

Files:

- `src/lib/calendar.ts`
- `src/lib/tools/google-calendar.ts`
- `src/lib/worker.ts`
- `src/lib/queue.ts`
- `src/lib/notifications.ts`
- `src/lib/email.ts`

Current capabilities:

- Google Calendar OAuth connection.
- Read upcoming calendar events through `executeGetCalendarEvents`.
- Schedule tasks on calendar via `scheduleTaskOnCalendar`.
- Background jobs for due notifications, entropy refresh, briefings, smart-start reminders, calendar sync, overdue escalation.
- Telegram-first notification fallback to email.

Missing:

- Meeting "five minutes left" reminders.
- Gmail scanning for important outcomes.
- Gmail drafts and sends.
- Calendar push sync state.
- Free/busy-aware scheduling.
- Notification delivery reconciliation.

## Calendar Service

Create `src/lib/services/calendar-service.ts`.

API:

```ts
class CalendarService {
  listEvents(userId: string, range: { start: Date; end: Date }): Promise<CalendarEvent[]>;
  getEvent(userId: string, eventId: string): Promise<CalendarEvent>;
  createEvent(userId: string, input: CreateEventInput): Promise<CalendarEvent>;
  updateEvent(userId: string, eventId: string, input: UpdateEventInput): Promise<CalendarEvent>;
  deleteEvent(userId: string, eventId: string): Promise<void>;
  freeBusy(userId: string, range: { start: Date; end: Date }): Promise<BusyBlock[]>;
  startWatch(userId: string): Promise<CalendarSyncState>;
  syncChanges(userId: string): Promise<void>;
  scheduleMeetingEndReminder(userId: string, event: CalendarEvent, minutesBeforeEnd: number): Promise<void>;
}
```

## Meeting "Five Minutes Left" Procedure

Trigger sources:

- calendar sync,
- user command,
- daily schedule scan,
- calendar push notification.

Procedure:

1. Fetch upcoming events for the next 24 hours.
2. Ignore all-day events.
3. Ignore events shorter than 10 minutes unless owner configured otherwise.
4. For each event, calculate reminder time:
   - `event.end - 5 minutes`
5. If reminder time is in the future, enqueue `scheduled-reminder`.
6. Use idempotency key:
   - `meeting_end:${userId}:${eventId}:${event.updated}:${minutesBeforeEnd}`
7. At reminder time, send Telegram:
   - "Five minutes left in [Meeting Title]. Next: [next event if any]."
8. If no Telegram, fallback to email only if owner enabled email fallback for meeting reminders.
9. Record `AuditEvent` and `NotificationDelivery`.

Implementation location:

- Add to `CalendarService.scheduleMeetingEndReminder`.
- Call from `processCalendarSync` and calendar webhook processor.

## Calendar Push Notifications

Use Google Calendar push notifications.

Required state:

- `CalendarSyncState.channelId`
- `CalendarSyncState.resourceId`
- `CalendarSyncState.channelExpiresAt`
- `CalendarSyncState.syncToken`

Procedure:

1. On connect, call Calendar events watch.
2. Store channel info.
3. Webhook receives change notification.
4. Use sync token to fetch changed events.
5. Update internal reminders.
6. Renew watch before expiration.

## Gmail Service

Create `src/lib/services/gmail-service.ts`.

API:

```ts
class GmailService {
  startWatch(userId: string): Promise<GmailSyncState>;
  syncHistory(userId: string): Promise<GmailChange[]>;
  searchMessages(userId: string, query: string, maxResults: number): Promise<GmailMessageSummary[]>;
  getMessage(userId: string, messageId: string): Promise<GmailMessage>;
  createDraft(userId: string, draft: EmailDraftInput): Promise<EmailDraft>;
  sendDraft(userId: string, draftId: string): Promise<EmailSendResult>;
}
```

## Email Outcome Scanning

Goal: detect important outcomes such as selected, shortlisted, rejected, disqualified, interview invite, deadline change, required document, or action needed.

Trigger sources:

- Gmail push notification,
- daily scan job,
- user command: "Scan my email for X."

Procedure:

1. Sync Gmail history from stored `historyId`.
2. For new messages, extract metadata:
   - from,
   - subject,
   - date,
   - labels,
   - snippet,
   - message ID,
   - thread ID.
3. If subject/sender matches active goals or tracked applications, fetch sanitized body.
4. Classify outcome using model:
   - `selected`
   - `shortlisted`
   - `interview`
   - `rejected`
   - `disqualified`
   - `action_required`
   - `deadline`
   - `noise`
5. Store classification in `AuditEvent` or an `EmailInsight` model if added.
6. Notify owner only for important outcomes.
7. If action required, create a task or approval request.

Rules:

- Do not store full raw email body unless owner pins or approves.
- Do not auto-reply.
- Do not mark email read unless owner approves that behavior.

## Email Drafting

Draft procedure:

1. Retrieve relevant memories:
   - communication style,
   - recipient preferences,
   - CC preferences,
   - signature preference.
2. Generate draft.
3. Create Gmail draft or product draft artifact.
4. Send Telegram preview:
   - to,
   - cc,
   - subject,
   - body,
   - attachments.
5. Ask for approval.
6. On approve, send via Gmail API.
7. Record `ToolCall`, `ApprovalRequest`, `AuditEvent`, and `NotificationDelivery`.

Approval is always required for third-party email sends.

## Notification Service

Create `src/lib/services/notification-service.ts`.

Responsibilities:

- send owner notifications,
- choose channel,
- record delivery,
- fallback to email,
- render Telegram-safe text,
- render email HTML,
- respect quiet hours and alert policies.

Channel order:

1. Telegram if linked and enabled.
2. In-app notification.
3. Email fallback if enabled.

Critical alerts:

- can bypass quiet hours only if owner enabled critical bypass.

## Worker Changes

Modify `src/lib/worker.ts`:

- Keep `processDueNotifications`.
- Keep `processEntropyRefresh`.
- Replace `processCalendarSync` body with `CalendarService.syncChanges` and `scheduleMeetingEndReminder`.
- Add `processGmailSync`.
- Add `processWatchRenewals`.
- Use idempotent job names and payload keys.

Add repeating jobs:

- `gmail-sync` every 5 minutes if Gmail push unavailable.
- `watch-renewal` every 6 hours.
- `meeting-end-reminder-reconcile` every 30 minutes.

## Acceptance Criteria

- Owner receives Telegram notification five minutes before meetings end.
- Notification is not duplicated after worker restart.
- Gmail selected/rejected/disqualified messages are detected and summarized.
- Third-party email is never sent without approval.
- Calendar event creation is conflict-aware.
- Delivery attempts are recorded in `NotificationDelivery`.

