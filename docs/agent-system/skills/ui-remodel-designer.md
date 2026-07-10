# Skill: UI Remodel Designer

## Purpose

Remodel the app UI into a premium, engaging, user-first command center using open-source UI libraries and a custom local design language.

## When To Use

Use when changing dashboard, onboarding, integrations/connections, assistant, approvals, activity timeline, settings, visual design tokens, or shared UI components.

## Inputs

- target screen,
- user workflow,
- existing components,
- `18_PREMIUM_UI_REMODEL_SPEC.md`,
- screenshots if available,
- accessibility and responsive requirements.

## Tools

- shadcn/ui,
- Base UI,
- Radix UI,
- Motion,
- Storybook or Ladle,
- MSW,
- Playwright,
- lucide-react.

## Procedure

1. Start from user outcome, not internal data model.
2. Identify primary action for the screen.
3. Use existing `src/components/ui` primitives where they fit.
4. Build or refine local app components in `src/components/app`.
5. Use color deliberately:
   - blue for command,
   - green for connected/success,
   - coral for approval/urgent,
   - violet for AI/memory,
   - amber for waiting,
   - cyan for research/browser.
6. Keep black/white/neutral as the base, but add accent rails, status glow, icon color, and motion moments.
7. Add loading, empty, error, success, and disconnected states.
8. Use icons for actions and tool states.
9. Add motion only to clarify state transitions.
10. Check mobile layout.
11. Add Storybook/Ladle story for reusable components.
12. Verify with Playwright screenshot and accessibility checks.

## UX Rules

- Do not expose internal terms unless they help the owner.
- Do not use nested cards.
- Do not create marketing hero layouts inside the app.
- Do not make a monochrome-only dashboard.
- Do not add decorative blobs/orbs.
- Do not let text overflow buttons or cards.
- Do not bury connection setup behind vague labels.
- Do not show "health check" when the user needs "Verify connection".

## Screen Remodel Priorities

1. Connections page.
2. Command Center dashboard.
3. Approval review surface.
4. Assistant run timeline.
5. Onboarding.
6. Activity timeline.
7. Memory center.

## Approval Gates

Owner approval required for:

- adding a major UI dependency,
- replacing navigation model,
- removing an existing feature surface,
- shipping a redesign without responsive verification.

## Outputs

- updated components/pages,
- local design tokens,
- stories,
- screenshots,
- accessibility test results,
- short UX rationale.

## Failure Handling

- If layout breaks on mobile, simplify density before adding more CSS.
- If UI feels generic, add local visual language through state colors, motion, and product-specific labels.
- If component library fights design, drop to Base UI or custom component.

## Tests

- desktop screenshot,
- mobile screenshot,
- keyboard navigation,
- accessibility scan,
- no text overlap,
- connection card states render correctly.

