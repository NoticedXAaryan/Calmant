# Skill: Open-Source Adoption Curator

## Purpose

Evaluate open-source projects and integrate only those that improve reliability, speed, UX, security, or maintainability.

## When To Use

Use before adding a dependency, replacing an internal subsystem, selecting a UI library, adding an agent framework, or adopting a testing/security tool.

## Inputs

- problem to solve,
- candidate projects,
- repo constraints,
- license requirements,
- maintenance risk,
- integration surface.

## Tools

- official project docs,
- project GitHub repository,
- package manager metadata,
- security scanners,
- small proof-of-concept branch.

## Procedure

1. Define the capability gap.
2. Search primary sources only:
   - official docs,
   - official GitHub repo,
   - package registry.
3. Check:
   - license,
   - maintenance activity,
   - ecosystem fit,
   - bundle/runtime cost,
   - security posture,
   - testability,
   - whether it respects approval/tool boundaries.
4. Classify candidate:
   - adopt now,
   - strong candidate,
   - defer,
   - avoid.
5. Document recommendation in `17_OPEN_SOURCE_ADOPTION_RADAR.md`.
6. If adopting, add a minimal proof of concept before broad refactor.

## Approval Gates

Owner approval required for:

- adding large framework,
- replacing core harness,
- adding paid service dependency,
- adding dependency with unclear license.

## Outputs

- adoption recommendation,
- risks,
- integration plan,
- rollback plan.

## Failure Handling

- If project is unmaintained, avoid unless tiny and replaceable.
- If project hides state/tool calls, do not use for core runtime.
- If project duplicates existing dependency, justify migration or skip.

## Tests

- dependency installs cleanly,
- license acceptable,
- proof of concept passes,
- no new high/critical vulnerabilities.

