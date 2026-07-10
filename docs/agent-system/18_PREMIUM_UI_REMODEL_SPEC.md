# Premium UI Remodel Spec

The current UI should be remodeled into a premium, fun, trustworthy command center. The app should feel like the owner has a capable operator working for them, not like a collection of disconnected admin screens.

## Current UI Diagnosis

Observed local surfaces:

- `src/components/app/AppShell.tsx`
- `src/components/app/AppSidebar.tsx`
- `src/components/app/AppTopbar.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/integrations/page.tsx`
- `src/app/dashboard/assistant/page.tsx`
- `src/app/dashboard/activity/page.tsx`
- `src/app/dashboard/automations/page.tsx`
- `src/components/ui/*`

Problems:

- Large route files contain business and interaction logic.
- Integration page is a stack of technical status cards.
- "Worker", "health check", "configured", and "listener" language leaks implementation details.
- The app lacks a distinctive local design language.
- Existing black/white theme is restrained but not memorable.
- Connection flows do not feel guided or rewarding.
- AI progress, approvals, artifacts, and trust state are not visually central enough.

## Product Feel

Target adjectives:

- premium,
- alive,
- focused,
- trustworthy,
- playful in controlled moments,
- high-contrast,
- polished,
- fast.

Avoid:

- generic admin dashboard,
- giant marketing hero inside the app,
- washed-out gray-only interface,
- random gradients,
- decorative clutter,
- overly cute copy,
- inconsistent card sizes,
- nested cards everywhere.

## Local Design Language

Name: Calmant Command

Base:

- dark and light modes,
- black/white/neutral foundation,
- vivid accent system for state and energy.

Accent palette:

- electric blue: primary command/action,
- citrus green: connected/success,
- coral: urgency/approval needed,
- violet: AI/reasoning/memory,
- amber: waiting/warning,
- cyan: browser/research.

Do not let one hue dominate the whole app.

Surfaces:

- app background: calm neutral,
- panels: subtle elevation with clear borders,
- critical cards: color-coded left rail or top rail,
- buttons: icon-first where possible,
- status pills: compact and semantic,
- progress: timeline and steps, not spinners only.

## Component Strategy

Use:

- shadcn/ui as local component base: https://ui.shadcn.com/docs
- Base UI for custom accessible primitives: https://base-ui.com/
- Radix primitives through shadcn where already present: https://www.radix-ui.com/primitives
- Motion for microinteractions: https://motion.dev/docs
- Storybook for component workshop: https://storybook.js.org/
- MSW for UI API mocking: https://mswjs.io/docs/
- Playwright accessibility tests: https://playwright.dev/docs/accessibility-testing

Do not add a heavy themed library that fights the local visual language.

## Information Architecture

Primary nav should be outcome-based:

- Command Center
- Assistant
- Approvals
- Connections
- Activity
- Memory
- Goals
- Settings

Secondary pages:

- Schedule
- Automations
- Artifacts
- Diagnostics

Rename technical concepts:

- "Integrations" -> "Connections"
- "Worker Status" -> "Background engine"
- "Delegated work" -> "Active missions"
- "Activity log" -> "Timeline"
- "Automations" -> "Rules and routines"
- "Health check" -> "Verify connection"

## Core Screens

### Command Center

Purpose:

- show what needs attention now.

Must include:

- next action,
- active runs,
- pending approvals,
- today's schedule,
- important notifications,
- recent artifacts,
- quick capture.

Visual:

- one strong command strip at top,
- timeline column,
- compact signal cards,
- no clutter.

### Connections

Purpose:

- make setup feel guided and trustworthy.

Connection cards:

- Telegram Command Center
- Calendar Intelligence
- Email Outcomes
- Browser Operator
- Documents and Drive
- Notifications

Each card shows:

- what this unlocks,
- current trust state,
- last verified time,
- action button,
- setup steps,
- known blocker.

Replace "not configured" with concrete next action:

- "Add bot token"
- "Connect Google"
- "Send /connect code"
- "Reconnect expired access"

### Assistant

Purpose:

- show collaboration and execution progress.

Must include:

- chat,
- run timeline,
- active tools,
- pending approvals,
- artifacts,
- selected memory/skills used.

### Approvals

Purpose:

- make risky action review easy.

Approval card must show:

- action,
- target,
- preview,
- attachments,
- risk,
- reason,
- approve/reject/edit.

### Activity Timeline

Purpose:

- show proof.

Must use `AgentEvent`.

Timeline event types:

- received,
- planned,
- tool started,
- approval needed,
- artifact created,
- completed,
- failed.

### Memory

Purpose:

- show learned preferences.

Must include:

- search,
- categories,
- confidence,
- source,
- edit/delete,
- queued review.

## UX Rules

1. Every async action has loading, success, error, and empty state.
2. Every connection card explains user benefit before technical status.
3. Every risky action has an approval preview.
4. Every completed external action has evidence.
5. Every page has one primary task.
6. No page should require understanding internal architecture.
7. Mobile Telegram-first users should still understand dashboard state.
8. Keyboard command palette should expose common actions.
9. UI text must be short and decisive.
10. Animations must clarify state, not decorate randomly.

## Implementation Plan

### Phase UI-0: Design Tokens

Create:

- `src/styles/tokens.css`
- `src/lib/design/status.ts`
- `src/lib/design/navigation.ts`
- `src/components/app/premium/*`

Define:

- colors,
- radius,
- elevation,
- typography scale,
- state colors,
- motion durations.

### Phase UI-1: Component Workshop

Add Storybook or Ladle.

Create stories for:

- connection card,
- approval card,
- run timeline,
- artifact tile,
- memory card,
- command strip,
- empty state,
- error state.

### Phase UI-2: Connections Remodel

Refactor `src/app/dashboard/integrations/page.tsx`.

Extract:

- `ConnectionCard`
- `ConnectionSetupSteps`
- `ConnectionTrustState`
- `TelegramConnectPanel`
- `GoogleConnectPanel`

### Phase UI-3: Command Center Remodel

Refactor `src/app/dashboard/page.tsx`.

Extract:

- `CommandHeader`
- `ActiveMissionRail`
- `PendingApprovalPanel`
- `TodayScheduleStrip`
- `RecentArtifacts`

### Phase UI-4: Assistant and Timeline

Make the assistant page consume `AgentEvent`.

### Phase UI-5: Accessibility and Visual QA

Use Playwright:

- desktop screenshot,
- mobile screenshot,
- contrast check,
- keyboard tab path,
- no text overlap.

## Acceptance Criteria

- Connections page feels premium and clear.
- User can understand setup state in five seconds.
- Approval cards are impossible to confuse.
- Dashboard shows actual action state, not placeholder metrics.
- UI has color and personality without becoming noisy.
- Components have stories.
- Playwright screenshots pass on mobile and desktop.

