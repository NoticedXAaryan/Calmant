# Calmant UI/UX Redesign Implementation Plan

This document is a practical implementation plan for redesigning the Calmant user experience. It is written for an AI implementation agent that has not worked on this project before.

The app lives under `app/`. The production deployment target is Dokploy on a VPS.

## Goal

Turn Calmant from a set of disconnected utility screens into a cohesive execution cockpit where the user can:

- Land in the app and immediately know what to do next.
- Capture tasks with almost no friction.
- Understand what the AI knows, what it did, and why.
- Configure notifications, integrations, privacy, memory, and automation behavior without hunting through pages.
- See logs and background activity in a human-readable way.
- Build, inspect, pause, and debug automations confidently.

The target experience should feel closer to a polished productivity operating system than a prototype dashboard.

## Current UX diagnosis

The current app has the right product pieces, but the experience is fragmented.

Existing relevant routes:

| Area | Current route/file | Current state |
| --- | --- | --- |
| Main dashboard | `src/app/dashboard/page.tsx` | Large single-page cockpit with capture, recommended task, focus timer, rescue plan, and task table. Useful but dense and hard to scan. |
| Onboarding | `src/app/dashboard/onboarding/page.tsx` | Basic 3-step flow: about user, focus area, Telegram. Missing real setup, import, preferences, permissions, memory consent, and success state. |
| Settings | `src/app/dashboard/settings/page.tsx` | Only profile name/avatar/email. Does not cover notifications, AI, memory, automations, integrations, privacy, logs, or appearance. |
| Memory | `src/app/dashboard/assistant/memory/page.tsx` | Raw memory cards showing `fact` text and category. No grouping, explanation, source, edit, confidence control, approval, or search. |
| Automations | `src/app/dashboard/automations/page.tsx` | Shows active alert policies and recent worker job counts. It does not explain what is automated, what will happen next, or how to change behavior. |
| Activity/logging | `src/app/dashboard/activity/page.tsx` | Basic task timeline and AI activity list. Silent errors, weak filtering, no drilldown, no run/tool-call detail, no replay/debug affordances. |
| Notifications | `src/app/dashboard/notifications/page.tsx` | Table of notification deliveries. Useful data but not a full logging/observability experience. |
| Assistant | `src/app/dashboard/assistant/page.tsx` and `src/components/AssistantChat.tsx` | Chat with optional live sandbox panel. Currently affected by separate build corruption in `AssistantChat.tsx`. |
| Navigation | `src/components/Navigation.tsx` | Fixed sidebar with flat nav items. No grouping, command palette, breadcrumbs, account/workspace context, or progressive disclosure. |

Existing design-system state:

- `components.json` is configured for Shadcn with `style: "base-nova"`, Tailwind v4 CSS variables, neutral base color, and Lucide icons.
- Current local UI primitives are limited: `avatar`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `mesh-gradient`, `separator`.
- The app already uses `framer-motion`, `lucide-react`, Tailwind v4, React 19, and Next 16.
- `@base-ui/react` is already installed.
- HeroUI is not currently installed.
- TanStack Table, Recharts, React Flow, cmdk, and Sonner are not currently installed.

Important prerequisite:

- The app currently has a known build-breaking corruption in `src/components/AssistantChat.tsx` documented in `docs/HERMES_INTEGRATION_FIX_PLAYBOOK.md`. Fix that before or alongside UI work, otherwise visual work cannot be reliably verified.

## Design principle: harmony over library soup

The user asked to use Shadcn UI, Aceternity UI, HeroUI, and other popular high-quality UI libraries. Do not blindly mix components from many libraries on the same screen. That creates inconsistent spacing, focus rings, animation, color semantics, and bundle bloat.

Use this hierarchy:

1. Shadcn UI is the foundation.
   - Owns app shell, buttons, cards, dialogs, forms, sidebar, tabs, command palette, tables, charts, toasts, sheets, accordions, skeletons, tooltips, dropdowns.
   - Reason: this repo is already configured for Shadcn and Shadcn gives source ownership, making it easier for AI agents to modify consistently.

2. Radix UI / Base UI / React Aria are accessibility foundations.
   - Use them indirectly through Shadcn, HeroUI, or custom wrappers.
   - Use Base UI for advanced unstyled primitives when Shadcn does not provide enough behavior.

3. Aceternity UI and Magic UI are enhancement layers.
   - Use them for tasteful motion/backgrounds/empty states/onboarding moments.
   - Do not use heavy animated effects everywhere.
   - Good uses: onboarding hero background, empty state cards, success moments, subtle hover cards, bento feature cards.

4. HeroUI is selective, not global.
   - HeroUI v3 is built for React 19 and Tailwind v4 and has polished React Aria-based components.
   - Use it only where it materially improves accessibility or speed: DatePicker, ComboBox/Autocomplete, advanced Select/ListBox, Drawer, Progress, Kbd, or high-polish form controls.
   - Do not use HeroUI Button/Card/Tabs if Shadcn equivalents are already used on the same surface.

5. Specialized libraries should be headless or domain-specific.
   - TanStack Table for serious data grids.
   - React Flow for automation/workflow canvas.
   - Recharts through Shadcn Chart for analytics.
   - cmdk through Shadcn Command for global command/search.
   - Sonner through Shadcn Sonner for toast feedback.

## Library adoption plan

### Already present

Keep and standardize:

- Shadcn config: `components.json`
- Tailwind v4 tokens: `src/app/globals.css`
- `framer-motion`
- `lucide-react`
- `@base-ui/react`

### Add Shadcn components first

Install only the components needed for the redesign:

```bash
cd app
npx shadcn@latest add sidebar sheet tabs select switch textarea checkbox radio-group command table chart sonner skeleton tooltip accordion progress popover calendar breadcrumb alert alert-dialog scroll-area separator
```

Adjust the exact command if the installed Shadcn CLI for this repo uses different component names. Do not duplicate existing files without reviewing diffs.

### Add specialized packages

```bash
npm install @tanstack/react-table recharts cmdk sonner reactflow
```

React Flow package naming may be `@xyflow/react` in current versions. Confirm from the React Flow docs before installing. Prefer the current official package name.

### Add HeroUI only if using it

HeroUI v3 quick start currently requires:

```bash
npm install @heroui/styles @heroui/react
```

Then add to `src/app/globals.css`, after Tailwind import order is verified:

```css
@import "tailwindcss";
@import "@heroui/styles";
```

Do this only if the implementation actually uses HeroUI components. If the selected Shadcn/Base UI components cover the need, skip HeroUI to avoid bundle and style complexity.

### Aceternity/Magic UI

Most Aceternity and Magic UI components are copy/paste Tailwind + Motion components. Add selected components under:

```text
src/components/effects/
src/components/marketing/
src/components/empty-states/
```

Do not scatter copied animated components directly into route files.

## Target product experience

### New mental model

Calmant should present itself as:

```text
Today -> Plan -> Execute -> Observe -> Improve
```

The user should not need to understand internal concepts like entropy, worker jobs, alert policies, Hermes, or tool calls unless they deliberately open advanced views.

Rename and group concepts in plain language:

| Internal concept | User-facing language |
| --- | --- |
| Entropy score | Risk / urgency signal |
| AlertPolicy | Reminder rule |
| WorkerJob | Background job / automation run |
| AgentRun | Assistant conversation / AI run |
| ToolCall | Action taken by AI |
| AgentMemory | Memory |
| DepartmentRun | Specialist run / delegated work |
| NotificationDelivery | Message delivery |

### App navigation

Replace the flat sidebar with grouped navigation:

```text
Calmant
  Search or command...                         ⌘K

Work
  Today
  Plan
  Focus
  Tasks
  Calendar

AI
  Assistant
  Delegated work
  Memory
  Activity log

Automation
  Automations
  Runs
  Notifications
  Integrations

Account
  Settings
  Help
```

On mobile:

- Use bottom navigation for `Today`, `Assistant`, `Capture`, `Automations`, `Settings`.
- Use a floating capture button.
- Use a drawer/sheet for secondary navigation.

### Global command palette

Add a global command palette accessible with `Cmd/Ctrl+K`.

Actions:

- Capture task
- Ask assistant
- Create reminder rule
- Search task
- Search memory
- Open settings
- Connect Telegram
- Pause all automations
- View failed runs
- Export data

This is a major UX unlock. It lets power users move quickly while keeping the UI clean for normal users.

Use Shadcn Command/cmdk.

## Information architecture and route plan

Recommended final route structure:

```text
/dashboard                         Today cockpit
/dashboard/plan                    Full plan and schedule
/dashboard/tasks                   Task database/table
/dashboard/focus                   Current/previous focus sessions
/dashboard/assistant               Chat + live action panel
/dashboard/assistant/delegated     Delegated work
/dashboard/memory                  Memory center
/dashboard/activity                Activity and audit center
/dashboard/automations             Automation studio
/dashboard/automations/runs        Automation run history
/dashboard/notifications           Message delivery log
/dashboard/integrations            Connected services
/dashboard/settings                Settings center
/dashboard/onboarding              Guided first-run setup
```

Keep existing routes initially to avoid breaking links, but adjust navigation labels and page contents.

## Shared layout primitives to build first

Create reusable primitives before redesigning pages.

### `src/components/app/AppShell.tsx`

Responsibilities:

- Sidebar
- Mobile nav
- Top bar
- Breadcrumbs
- Command palette trigger
- User menu
- Worker/AI health indicator
- Global notification center trigger

### `src/components/app/PageHeader.tsx`

Props:

```ts
type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
};
```

Use this everywhere instead of hand-coded headers.

### `src/components/app/SectionCard.tsx`

Reusable card wrapper for dashboards:

- title
- description
- action slot
- footer slot
- loading state
- empty state

### `src/components/app/EmptyState.tsx`

Props:

```ts
type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: "plain" | "dashed" | "glow";
};
```

Use Aceternity/Magic UI effects only for `variant: "glow"` and only on important empty states.

### `src/components/app/StatusPill.tsx`

Consistent status labels:

- success
- warning
- danger
- neutral
- running
- paused

### `src/components/app/InsightCard.tsx`

For summary metrics and insight blocks:

- number
- label
- trend
- status
- sparkline optional

### `src/components/app/DetailDrawer.tsx`

Use Shadcn Sheet or HeroUI Drawer. One consistent drawer for:

- memory detail
- automation detail
- job/run detail
- notification detail
- task detail

### `src/components/app/ConfirmAction.tsx`

Use AlertDialog for destructive actions:

- delete memory
- pause automation
- revoke integration
- export/delete data

### `src/components/app/DataToolbar.tsx`

Reusable toolbar for tables:

- search
- filters
- view switcher
- date range
- export button

## Visual design direction

### Tone

Use a calm, precise, premium productivity aesthetic:

- Neutral base.
- One strong accent color.
- Soft surfaces.
- High contrast text.
- Subtle motion.
- Clear status colors.
- Minimal decorative noise inside work surfaces.

### Suggested visual themes

Keep the current neutral Shadcn base and add controlled semantic tokens:

```css
--success: ...
--success-foreground: ...
--warning: ...
--warning-foreground: ...
--danger: ...
--danger-foreground: ...
--info: ...
--info-foreground: ...
--surface-raised: ...
--surface-subtle: ...
```

Use OKLCH tokens consistently in `src/app/globals.css`.

### Motion rules

Use animation to clarify state changes, not to decorate every element.

Allowed:

- Page transitions: 120-180ms fade/slide.
- Drawer/sheet transitions.
- List item entry on first load.
- Button loading states.
- Progress and success animations.
- Subtle active automation pulse.

Avoid:

- Always-on heavy background animation in dashboards.
- Sparkles around primary work controls.
- Layout shifts that move user targets.
- Effects that compete with data readability.

Respect reduced-motion preferences.

## Specific redesign: onboarding flow

### Current problem

The onboarding flow asks for name, goal, and Telegram connection. It does not teach the product, collect core work preferences, import data, set memory/privacy expectations, or produce a meaningful first success.

### Target onboarding experience

Onboarding should feel like setting up a personal operator.

Steps:

1. Welcome and value promise
2. Work mode selection
3. Task and schedule import/capture
4. Notification preferences
5. AI memory consent and preferences
6. Integration setup
7. First plan preview

### Step 1: Welcome

Screen:

- Strong headline: "Let's build your execution cockpit."
- Short explanation: Calmant turns deadlines, reminders, and AI assistance into one daily plan.
- One primary CTA: "Set up my cockpit"
- Secondary: "Skip for now"

Use:

- Shadcn Card/Button.
- Aceternity Hero Highlight or Grid/Dot Background behind the card.
- Magic UI subtle animated beam or border only if performance is good.

### Step 2: Work mode

Ask:

- What are you mainly managing?
  - School / assignments
  - Freelance / clients
  - Startup / projects
  - Personal life
  - Mixed workload

Ask:

- How do you prefer to work?
  - Deep focus blocks
  - Short sprints
  - Flexible reminders
  - Deadline rescue mode

Save as structured preferences, not just raw memory text.

### Step 3: Add first commitments

Let the user choose:

- Type/paste tasks.
- Speak tasks.
- Connect calendar.
- Import later.

Provide a sample input area:

```text
Submit DBMS assignment Friday 9pm, estimated 2 hours.
Call client about landing page tomorrow at 11am.
Study thermodynamics chapter 4 by Sunday.
```

After parsing, show a confirmation table:

| Task | Deadline | Estimate | Confidence | Action |
| --- | --- | --- | --- | --- |

Use Shadcn Table or TanStack Table if interactions are rich.

### Step 4: Notifications

Ask:

- Where should Calmant reach you?
  - In-app
  - Email
  - Telegram
  - WhatsApp if configured

Ask:

- When should it interrupt you?
  - Critical only
  - Hot and critical
  - Daily briefing + critical
  - Fully custom

Ask:

- Quiet hours.

This should create/update `AlertPolicy` records.

### Step 5: Memory consent

Explain:

- What Calmant remembers.
- Why it remembers it.
- How the user can edit/delete it.

Options:

- Remember preferences and work patterns.
- Ask before saving personal facts.
- Do not save memory automatically.

This requires backend support. If not implemented, store a user preference field or memory settings JSON.

### Step 6: Integrations

Cards:

- Telegram
- Google Calendar
- Email
- WhatsApp
- Browser automation

Each card should show:

- status
- benefit
- setup time
- connect button
- skip button

Do not force Telegram as the only useful setup path.

### Step 7: First plan preview

Show:

- Today's recommended next action.
- Upcoming risk timeline.
- Notification rule summary.
- Memory summary.
- Integrations connected.

CTA:

- "Enter Today"

### Onboarding implementation files

Refactor:

```text
src/app/dashboard/onboarding/page.tsx
```

Into:

```text
src/app/dashboard/onboarding/page.tsx
src/components/onboarding/OnboardingShell.tsx
src/components/onboarding/StepWelcome.tsx
src/components/onboarding/StepWorkMode.tsx
src/components/onboarding/StepCommitments.tsx
src/components/onboarding/StepNotifications.tsx
src/components/onboarding/StepMemoryConsent.tsx
src/components/onboarding/StepIntegrations.tsx
src/components/onboarding/StepPlanPreview.tsx
```

Persist progress so refresh does not lose work:

```text
localStorage key: calmant_onboarding_draft
server endpoint: /api/user/onboarding-state
```

If server endpoint is too much for the first pass, use localStorage first and migrate later.

### Onboarding acceptance criteria

- User can complete onboarding without Telegram.
- User can connect Telegram if available.
- User can skip every integration without feeling blocked.
- User sees a useful first plan or a clear empty state.
- User understands memory and notification behavior.
- Refreshing mid-onboarding does not reset all answers.
- Mobile onboarding is fully usable.

## Specific redesign: logging and settings

### Current problem

Settings only covers profile basics. Logging is split between Activity and Notifications, and it does not answer the user's real questions:

- What happened?
- Why did it happen?
- Did the AI do anything?
- Did an automation run?
- Was a message sent?
- What failed?
- What should I do now?

### New Settings Center

Route:

```text
/dashboard/settings
```

Use a two-column settings layout:

```text
Settings
  Profile
  Notifications
  Integrations
  AI & Memory
  Automations
  Privacy & Data
  Appearance
  Logs & Diagnostics
```

Desktop:

- Left settings nav.
- Right content panel.
- Sticky save bar when changes are unsaved.

Mobile:

- Settings sections as cards.
- Section opens in full-screen sheet/drawer.

### Settings sections

#### Profile

Current functionality:

- avatar
- name
- email

Improve:

- account status
- timezone
- locale
- working days
- default work hours

#### Notifications

Manage:

- channel priority
- quiet hours
- escalation level
- daily briefing
- critical alerts
- test notification per channel

Use `AlertPolicy` records but show friendly controls.

#### Integrations

Move relevant controls from `/dashboard/integrations` or cross-link them.

Each integration card:

- Connected / not connected
- Last checked
- Permissions
- Test action
- Disconnect
- Troubleshooting link

#### AI & Memory

Controls:

- memory mode: automatic / ask first / off
- tool approval mode: ask before external actions / allow safe actions / manual only
- model/provider status if applicable
- assistant tone or response style
- data included in prompts

#### Automations

Controls:

- pause all
- enable/disable automation categories
- default retry behavior
- approval requirements
- notification fallback chain

#### Privacy & Data

Controls:

- export data
- delete memory
- delete account
- data retention policy
- clear AI run history

#### Appearance

Controls:

- theme: system/light/dark
- density: comfortable/compact
- animation: full/reduced
- dashboard layout: default/focus/data-heavy

#### Logs & Diagnostics

Show:

- app version/build info
- worker status
- last failed background job
- last failed AI run
- integration health checks

### Logging redesign: Activity and Audit Center

Route:

```text
/dashboard/activity
```

Replace the current two-tab page with a real observability surface.

Views:

1. Timeline
2. AI runs
3. Tool actions
4. Automations
5. Notifications
6. System

Use DataToolbar:

- search
- date range
- status filter
- actor filter: user / assistant / automation / integration
- channel filter
- export CSV/JSON

Each event row:

- icon
- timestamp
- title
- plain-language summary
- status
- actor
- affected object
- "Open details"

Detail drawer:

- summary
- raw payload toggle
- related events
- retry/replay if safe
- copy run id
- failure reason

### Backend/data requirements for better logging

Current schema has useful models:

- `AgentRun`
- `ToolCall`
- `DepartmentRun`
- `AuditEvent`
- `NotificationDelivery`
- `Artifact`

But the UI needs normalized event data. Add an API route:

```text
GET /api/activity/events
```

Query params:

```text
type=ai|tool|automation|notification|system|task
status=running|completed|failed|queued|sent
from=
to=
q=
cursor=
limit=
```

Return shape:

```ts
type ActivityEvent = {
  id: string;
  type: "ai" | "tool" | "automation" | "notification" | "system" | "task";
  title: string;
  summary: string;
  status: "queued" | "running" | "completed" | "failed" | "sent" | "delivered";
  actor: "user" | "assistant" | "automation" | "integration" | "system";
  objectType?: string;
  objectId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
  related?: Array<{ type: string; id: string; label: string }>;
};
```

This endpoint can initially combine existing tables without schema changes.

### Logging/settings acceptance criteria

- A user can find notification, integration, AI, memory, privacy, and automation settings from one place.
- A user can search settings.
- A user can answer "why did I get this notification?"
- A user can answer "what did the AI do?"
- Failed jobs/runs are visible without reading server logs.
- Destructive actions require confirmation.
- Settings changes use clear toasts and optimistic UI only when safe.

## Specific redesign: memory management

### Current problem

Memory currently stores raw text facts. The UI shows cards like a note dump. Users cannot easily understand:

- where the memory came from
- whether it is true
- whether it is still useful
- when the assistant used it
- how to correct it
- how to prevent similar future memory writes

### Target Memory Center

Route:

```text
/dashboard/memory
```

Navigation label:

```text
Memory
```

Top summary:

- Total memories
- Pending review
- High-confidence memories
- Recently used
- Categories

Primary views:

1. Review queue
2. By category
3. Timeline
4. Search
5. Privacy controls

### Memory categories

Use user-facing categories:

| Current/raw category | New category |
| --- | --- |
| preference | Preferences |
| pattern | Work patterns |
| deadline | Deadlines and commitments |
| relationship | People and relationships |
| method | Work methods |
| alert | Notification rules |
| interaction | Conversation history |
| commitment | Commitments |

### Memory card design

Each card should show:

- category badge
- memory statement in plain language
- confidence meter
- source: onboarding / chat / task / automation / imported
- created date
- last used date
- controls: edit, confirm, forget, never remember this type

Example:

```text
Preference
"You prefer short 25-minute focus blocks for study tasks."

Source: Onboarding
Confidence: High
Last used: Today at 8:32 AM

[Edit] [Confirm] [Forget]
```

### Memory detail drawer

Show:

- full memory
- evidence/source messages if available
- related tasks/runs
- usage history
- edit history
- privacy controls

### Memory data model improvements

Current `AgentMemory`:

```prisma
model AgentMemory {
  id         String
  userId     String
  fact       String
  category   String
  confidence Float
  createdAt  DateTime
  updatedAt  DateTime
}
```

Recommended additions:

```prisma
model AgentMemory {
  id           String
  userId       String
  fact         String
  category     String
  confidence   Float
  status       String   @default("active") // pending_review | active | archived | rejected
  source       String?  // onboarding | chat | task | automation | import | manual
  sourceRunId  String?
  evidence     Json?
  tags         Json?
  lastUsedAt   DateTime?
  userEditedAt DateTime?
  createdAt    DateTime
  updatedAt    DateTime
}
```

If schema migration is not desired in the first pass, use `metadata Json?` instead:

```prisma
metadata Json?
```

But long-term, explicit fields are better for filtering and UI clarity.

### Memory API improvements

Current:

- `GET /api/agent/memory`
- `POST /api/agent/memory`
- `DELETE /api/agent/memory?id=...`

Add:

```text
PATCH /api/agent/memory/:id
POST /api/agent/memory/:id/confirm
POST /api/agent/memory/:id/archive
POST /api/agent/memory/preferences
GET /api/agent/memory/stats
```

### Memory write UX

When the assistant wants to save a new memory:

- Show an inline "Save this memory?" confirmation for sensitive or personal facts.
- Auto-save harmless work preferences only if memory mode allows.
- Show a toast: "Memory saved — Review"
- Add undo.

### Memory acceptance criteria

- A user can search memory.
- A user can edit memory.
- A user can confirm or reject memory.
- A user can understand why a memory exists.
- A user can turn off memory or require review.
- Raw unintelligible fact dumps are no longer the default presentation.

## Specific redesign: automations panel

### Current problem

The current automations page shows policies and job counts. It does not make automation behavior understandable or controllable.

The user needs to know:

- What automations exist?
- Are they on or off?
- What triggers them?
- What actions will they take?
- What happened last time?
- Why did one fail?
- Can I pause or test them?

### Target Automation Studio

Route:

```text
/dashboard/automations
```

Top-level layout:

```text
Automation Studio

[Global status: Running] [Pause all] [Create automation] [View failed runs]

Overview cards:
  Active automations
  Runs today
  Failed runs
  Messages sent

Tabs:
  My automations
  Templates
  Runs
  Rules
  Health
```

### My automations

Cards/table showing:

- name
- description
- trigger
- action
- status
- last run
- next run
- owner
- controls: enable/disable, test, edit, duplicate, delete

Examples:

- "Critical deadline rescue"
  - Trigger: task risk becomes critical
  - Action: send Telegram, then email fallback
- "Morning briefing"
  - Trigger: every day at 8:00 AM
  - Action: summarize today's plan
- "Calendar conflict detector"
  - Trigger: calendar sync
  - Action: flag conflict and suggest recovery

### Templates

Use cards inspired by Zapier/Make/n8n template galleries:

- Morning briefing
- Deadline rescue
- Task created notification
- Daily review
- Weekly planning
- Calendar conflict
- Stale task cleanup
- AI research/delegation

Each template card:

- title
- benefit
- trigger
- actions
- setup time
- required integrations
- preview button
- enable button

### Runs

Use TanStack Table:

Columns:

- Status
- Automation
- Trigger
- Started
- Duration
- Result
- Actions

Filters:

- status
- automation
- date range
- channel

Detail drawer:

- timeline
- trigger payload
- decisions
- actions
- notification deliveries
- errors
- retry button if safe

### Visual workflow builder

Use React Flow only after the simpler cards/table are working.

Workflow canvas:

```text
[Trigger: Task becomes critical]
       |
[Condition: outside quiet hours?]
       |
[Action: Send Telegram]
       |
[Fallback: Send Email]
       |
[Log result]
```

Nodes:

- Trigger
- Condition
- Delay
- Action
- Fallback
- Approval
- Log

Node detail panel:

- friendly config fields
- validation
- test node
- docs/help

Use React Flow UI examples as a foundation, styled with Shadcn.

### Health tab

Show:

- worker status
- queue status
- failed job count
- integration health
- last successful run per automation
- service warnings

Use status cards and a compact table.

### Automations data/API requirements

Current API:

```text
GET /api/automations
```

Current return:

```ts
{
  jobs: Array<{ id; name; status; count }>;
  policies: AlertPolicy[];
}
```

Add or evolve endpoints:

```text
GET /api/automations/overview
GET /api/automations/rules
POST /api/automations/rules
PATCH /api/automations/rules/:id
DELETE /api/automations/rules/:id
POST /api/automations/rules/:id/test
POST /api/automations/rules/:id/pause
POST /api/automations/rules/:id/resume
GET /api/automations/runs
GET /api/automations/runs/:id
POST /api/automations/runs/:id/retry
```

If full workflow automation is too much, first map `AlertPolicy` into friendly reminder rules.

### Automations acceptance criteria

- A user can understand every automation in one sentence.
- A user can pause all automations.
- A user can test a reminder rule.
- Failed automation runs are visible and explainable.
- The UI explains required integrations before enabling a template.
- The automation builder is not exposed until the simpler rule/template flow is stable.

## Today cockpit redesign

Route:

```text
/dashboard
```

The current dashboard has useful data, but it is dense. Redesign around a single question:

```text
What should I do next?
```

Layout:

```text
Good morning, Aryan
Today is Wednesday, July 1

[Next best action card]
  Title
  Why this matters
  Time estimate
  Start focus
  Break down
  Snooze

[Quick capture composer]
  Type or speak a task...

[Today timeline]
  Now -> later schedule blocks

[Signals]
  Critical tasks
  Focus time planned
  Automations running
  Messages pending

[Task queue]
  Filterable table/list
```

Keep advanced data available, but put it below or behind details.

### Dashboard implementation guidance

Split `src/app/dashboard/page.tsx` into components:

```text
src/components/dashboard/TodayHeader.tsx
src/components/dashboard/NextActionCard.tsx
src/components/dashboard/QuickCapture.tsx
src/components/dashboard/CaptureReview.tsx
src/components/dashboard/SignalGrid.tsx
src/components/dashboard/FocusSessionCard.tsx
src/components/dashboard/RescuePlanTimeline.tsx
src/components/dashboard/TaskQueueTable.tsx
```

This will reduce the current 600+ line route component and make future UI iteration safer.

## Assistant redesign

The assistant should feel like an operator, not just a chatbox.

### Assistant layout

Desktop:

```text
Assistant
  Left: conversation
  Right: action panel
    - current plan
    - tool/activity stream
    - live browser when active
    - artifacts/results
```

Mobile:

- Chat full screen.
- Action panel opens as a sheet.

### Assistant capabilities UI

Add starter cards:

- "Plan my day"
- "Capture these tasks"
- "Show risky deadlines"
- "Create a reminder rule"
- "What do you remember about me?"
- "Open browser and research..."

### Tool transparency

When Hermes/tools are working, show:

```text
Assistant is checking your tasks...
Assistant created task "..."
Assistant opened browser session...
Assistant sent Telegram reminder...
```

Use a timeline in the side panel. This helps trust.

### Assistant acceptance criteria

- Empty chat has useful suggested actions.
- Streaming/status states are clear.
- Tool actions are visible.
- Errors are human-readable.
- Live browser panel does not dominate the chat unless active.

## Data visualization plan

Use Shadcn Chart/Recharts for:

- task risk over time
- completed focus minutes
- automation success/failure rate
- notification delivery breakdown
- memory category distribution

Use charts sparingly. Prefer tables and cards when exact values matter.

## Accessibility and UX quality rules

Every new surface must meet these standards:

- Keyboard navigable.
- Visible focus rings.
- Proper labels for inputs.
- No icon-only buttons without `aria-label` or `title`.
- Dialogs and drawers trap focus.
- Toasts are not the only place critical information appears.
- Empty states include next action.
- Loading states use skeletons where layout is known.
- Destructive actions require confirmation.
- Reduced motion is respected.
- Color is not the only status indicator.

## Responsive behavior

Breakpoints:

- Mobile: primary actions first, bottom nav, sheets.
- Tablet: collapsible sidebar, two-column cards.
- Desktop: full sidebar, right detail panels, multi-column dashboard.

Important mobile flows:

- capture task
- start focus
- ask assistant
- approve/forget memory
- pause automation
- view failed run
- settings notification preferences

Do not design only for desktop.

## Implementation phases

### Phase 0: Stabilize build and design base

Tasks:

1. Fix `src/components/AssistantChat.tsx` build corruption.
2. Run `npm run build`.
3. Add missing Shadcn primitives.
4. Add Sonner and global toaster.
5. Add command palette shell.
6. Add shared layout primitives.

Acceptance:

- App builds.
- Existing pages still route.
- No visual redesign yet breaks core flows.

### Phase 1: App shell and navigation

Tasks:

1. Replace `Navigation.tsx` with grouped Shadcn Sidebar.
2. Add top bar with command palette, breadcrumbs, notification/status indicators.
3. Add mobile bottom nav and sheet nav.
4. Add `PageHeader` and use it on at least Dashboard, Settings, Memory, Automations, Activity.

Acceptance:

- Navigation is grouped and understandable.
- Mobile navigation works.
- Command palette opens with keyboard.

### Phase 2: Onboarding

Tasks:

1. Refactor onboarding into step components.
2. Add progress persistence.
3. Add work mode, commitments, notification preferences, memory consent, integrations, first plan preview.
4. Allow completion without Telegram.

Acceptance:

- New user can complete setup in under 3 minutes.
- User sees a useful Today screen after onboarding.

### Phase 3: Settings Center

Tasks:

1. Replace current settings page with sectioned settings center.
2. Keep profile editing.
3. Add notification, integrations, AI/memory, automations, privacy/data, appearance, diagnostics sections.
4. Wire real APIs where available; show "coming soon" only if unavoidable.

Acceptance:

- User can find every major preference from Settings.
- Existing profile update still works.

### Phase 4: Memory Center

Tasks:

1. Move memory route to `/dashboard/memory` or keep old route with redirect/link.
2. Add search/filter/category grouping.
3. Add memory detail drawer.
4. Add edit/confirm/archive/forget flows.
5. Add memory settings.
6. Add backend fields/API if approved.

Acceptance:

- Memory is understandable and controllable.
- Raw memory text is no longer the only view.

### Phase 5: Activity/logging center

Tasks:

1. Create `GET /api/activity/events`.
2. Unify agent runs, department runs, notification deliveries, automation jobs, and audit events.
3. Build table/timeline views.
4. Add detail drawer.
5. Add failed-only view.

Acceptance:

- User can answer what happened and why.
- Failed runs are debuggable from UI.

### Phase 6: Automation Studio

Tasks:

1. Redesign `/dashboard/automations` into overview + automations + templates + runs + health.
2. Add pause/test controls for existing alert policies.
3. Add runs table and detail drawer.
4. Add React Flow builder only after rules/templates are stable.

Acceptance:

- User understands automations without reading code.
- User can pause and test automations.

### Phase 7: Today cockpit

Tasks:

1. Split dashboard page into components.
2. Redesign around next best action and quick capture.
3. Move dense task table lower.
4. Add chart/signal cards only where useful.
5. Improve focus session UI.

Acceptance:

- User knows what to do within 5 seconds of landing.
- Capture task is obvious.

### Phase 8: Assistant polish

Tasks:

1. Fix SSE parser and build issue if not already fixed.
2. Add starter prompts.
3. Add action/tool timeline.
4. Improve live browser panel behavior.
5. Improve error/status states.

Acceptance:

- Assistant feels useful even before the user types.
- Long-running work is transparent.

## Suggested component/file structure

```text
src/components/app/
  AppShell.tsx
  AppSidebar.tsx
  AppTopbar.tsx
  MobileNav.tsx
  CommandPalette.tsx
  PageHeader.tsx
  SectionCard.tsx
  EmptyState.tsx
  StatusPill.tsx
  DetailDrawer.tsx
  DataToolbar.tsx

src/components/onboarding/
  OnboardingShell.tsx
  StepWelcome.tsx
  StepWorkMode.tsx
  StepCommitments.tsx
  StepNotifications.tsx
  StepMemoryConsent.tsx
  StepIntegrations.tsx
  StepPlanPreview.tsx

src/components/dashboard/
  TodayHeader.tsx
  NextActionCard.tsx
  QuickCapture.tsx
  CaptureReview.tsx
  SignalGrid.tsx
  FocusSessionCard.tsx
  RescuePlanTimeline.tsx
  TaskQueueTable.tsx

src/components/settings/
  SettingsShell.tsx
  SettingsNav.tsx
  ProfileSettings.tsx
  NotificationSettings.tsx
  IntegrationSettings.tsx
  AIMemorySettings.tsx
  AutomationSettings.tsx
  PrivacyDataSettings.tsx
  AppearanceSettings.tsx
  DiagnosticsSettings.tsx

src/components/memory/
  MemoryOverview.tsx
  MemoryCard.tsx
  MemoryFilters.tsx
  MemoryDetailDrawer.tsx
  MemoryReviewQueue.tsx
  MemorySettingsPanel.tsx

src/components/automations/
  AutomationOverview.tsx
  AutomationCard.tsx
  AutomationTemplateCard.tsx
  AutomationRunsTable.tsx
  AutomationRunDrawer.tsx
  AutomationHealth.tsx
  AutomationFlowBuilder.tsx

src/components/activity/
  ActivityTimeline.tsx
  ActivityEventsTable.tsx
  ActivityEventDrawer.tsx
  ActivityFilters.tsx

src/components/effects/
  GridBackground.tsx
  GlowCard.tsx
  Spotlight.tsx
```

## API work likely required

### User preferences

Add a structured place for UI/product preferences. Options:

1. Add fields to `User`.
2. Add `UserPreference` model.
3. Store JSON on `User`.

Recommended:

```prisma
model UserPreference {
  id                    String   @id @default(cuid())
  userId                String   @unique
  workMode              String?
  focusStyle            String?
  timezone              String?
  quietHours            Json?
  memoryMode            String   @default("ask_first")
  toolApprovalMode      String   @default("safe_only")
  dashboardDensity      String   @default("comfortable")
  animationPreference   String   @default("system")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

If migrations are too risky for the first UI pass, simulate with localStorage and clearly mark backend work as pending. Do not fake server persistence silently.

### Activity events

Add:

```text
GET /api/activity/events
```

This can aggregate existing tables before changing schema.

### Automation controls

Add:

```text
PATCH /api/automations/policies/:id
POST /api/automations/policies/:id/test
POST /api/automations/pause-all
POST /api/automations/resume-all
GET /api/automations/runs
```

### Memory controls

Add:

```text
PATCH /api/agent/memory/:id
POST /api/agent/memory/:id/confirm
POST /api/agent/memory/:id/archive
GET /api/agent/memory/stats
```

## UX copy guidelines

Use plain language:

- "Risk" instead of "entropy".
- "Reminder rule" instead of "alert policy".
- "Background run" instead of "worker job".
- "AI action" instead of "tool call".
- "Memory" instead of "agent memory".

Good button labels:

- Start focus
- Capture task
- Review memory
- Pause automation
- Test reminder
- Open details
- Fix issue

Avoid:

- Submit
- Execute
- Process
- Dispatch
- Run agent
- Entropy

## Inspiration mapping

Use these products as UX references, without copying brand identity:

| Product/pattern | What to adopt |
| --- | --- |
| Linear | Fast command menu, dense but calm issue/task lists, keyboard-first actions, precise status language. |
| Notion | Editable structured knowledge/memory, friendly empty states, progressive disclosure. |
| Raycast | Command-first navigation, quick actions, predictable keyboard flow. |
| Superhuman | Fast inbox-like triage, shortcuts, clear status and next action. |
| Notion Calendar / Cron | Clean schedule blocks and calendar-first planning. |
| Zapier / Make / n8n | Automation templates, trigger-action mental model, run history, visual flow builder. |
| GitHub Actions | Run logs, status timelines, retry/debug affordances. |
| Stripe Dashboard | Settings organization, searchable admin surfaces, clear destructive action handling. |

## QA checklist

Run these after each phase:

```bash
npm run build
npm run lint
```

Manual checks:

- Desktop Chrome
- Mobile viewport
- Dark mode
- Reduced motion
- Keyboard-only navigation
- Empty account with no tasks
- Account with many tasks/memories/logs
- Slow network/loading states
- Failed API responses

Critical flows:

- Signup/login to onboarding.
- Complete onboarding without Telegram.
- Capture task from Today.
- Start and stop focus.
- Ask assistant.
- View and delete/edit memory.
- Change notification preference.
- Pause automation.
- Open failed run details.
- Search via command palette.

## Performance constraints

- Do not import every icon from a library.
- Do not add heavy animated backgrounds to all dashboard pages.
- Lazy-load React Flow builder.
- Lazy-load charts below the fold if needed.
- Keep table pagination/virtualization for large logs.
- Use server pagination for activity and notification logs.
- Avoid client-side fetching all history forever.

## Security/privacy constraints

- Memory UI must make deletion obvious.
- Privacy/data settings must not be hidden.
- Logs must not expose secrets, API keys, auth tokens, or full private prompts unless intentionally shown to the owning user.
- Automation detail drawers must redact sensitive payloads.
- Browser automation artifacts/screenshots must be access-controlled by user.

## What not to do

- Do not redesign only the landing page. The logged-in app is the core issue.
- Do not add animations before information architecture is fixed.
- Do not use HeroUI and Shadcn versions of the same primitive on the same page.
- Do not create "coming soon" sections for core requested areas: onboarding, settings, memory, automations.
- Do not bury automation pause controls.
- Do not store more opaque raw memory text without review/edit affordances.
- Do not require Telegram to complete onboarding.
- Do not implement React Flow first. Start with understandable automation cards and run logs.

## Final acceptance criteria

The redesign is successful when:

- A new user completes onboarding and understands what Calmant will do.
- The Today page answers "what should I do next?" immediately.
- Settings exposes every major preference in one searchable place.
- Memory is editable, explainable, searchable, and deletable.
- Automations are understandable, pausable, testable, and debuggable.
- Activity/logging explains AI actions, notification deliveries, and failed background work.
- The UI is coherent across Shadcn, Aceternity/Magic UI, HeroUI, and specialized libraries.
- Mobile usage is not an afterthought.
- The app builds and core flows work after every phase.

## Reference links

Primary UI libraries:

- Shadcn UI introduction: https://ui.shadcn.com/docs
- Shadcn Sidebar: https://ui.shadcn.com/docs/components/radix/sidebar
- Shadcn Data Table: https://ui.shadcn.com/docs/components/radix/data-table
- Shadcn Chart: https://ui.shadcn.com/docs/components/radix/chart
- Shadcn Theming: https://ui.shadcn.com/docs/theming
- Aceternity UI components: https://ui.aceternity.com/components
- Magic UI: https://magicui.design/
- HeroUI getting started: https://www.heroui.com/docs/react/getting-started
- HeroUI quick start: https://heroui.com/en/docs/react/getting-started/quick-start
- HeroUI components: https://www.heroui.com/docs/react/components

Accessibility and primitives:

- Radix Primitives: https://www.radix-ui.com/primitives
- Base UI: https://base-ui.com/
- React Aria Components: https://react-aria.adobe.com/

Specialized UI:

- TanStack Table: https://tanstack.com/table/latest/docs/introduction
- React Flow: https://reactflow.dev/
- React Flow workflow editor template: https://reactflow.dev/ui/templates/workflow-editor
- Recharts: https://recharts.org/
- cmdk: https://github.com/dip/cmdk
- Sonner: https://github.com/emilkowalski/sonner
- Motion for React: https://motion.dev/docs/react
- Tremor dashboards/charts: https://tremor.so/
