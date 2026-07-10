# Skill: Repo Cleaner Before Run

## Purpose

Clean unnecessary files and clutter before running the application so stale artifacts, one-off test files, and generated outputs do not block or confuse development.

## When To Use

Use before starting the project, before release verification, after experimental test runs, or when the repository contains root-level generated outputs and stale debug artifacts.

## Inputs

- repository root,
- current git status,
- cleanup allowlist,
- cleanup denylist,
- owner approval if deletion is not obviously generated.

## Tools

- git status,
- file listing,
- Knip if added,
- Gitleaks before sharing reports,
- package scripts,
- safe filesystem delete after manifest review.

## Procedure

1. Run `git status --short`.
2. List root files and suspicious generated outputs.
3. Build a cleanup manifest with:
   - path,
   - size,
   - reason,
   - safe action: delete, move to `docs/archive`, keep.
4. Never delete source, config, migrations, docs, `.env*`, package lockfiles, or user-created files without explicit approval.
5. Remove only files that are:
   - zero-byte outputs,
   - generated result JSON,
   - old debug outputs,
   - temporary test logs,
   - build artifacts outside ignored folders.
6. Keep `.next`, `node_modules`, and `tsconfig.tsbuildinfo` policy-controlled:
   - delete only for a clean rebuild,
   - never during normal quick run unless requested.
7. After cleanup, run:
   - `npm run lint` if available,
   - `npm run test` if cleanup touched test fixtures,
   - `npx prisma validate` if schema/config touched.
8. Report deleted/moved/kept files.

## Current Known Cleanup Candidates

Root-level files that appear generated or experimental and should be reviewed before cleanup:

- `eval_result.json`
- `eval_result_2.json`
- `final_test.json`
- `help_output.json`
- `results.txt`
- `results2.txt`
- `results3.txt`
- `server_code.json`
- `test_chat.json`
- `test_config_direct.json`
- `test_direct.json`
- `test_direct2.json`
- `test_forced.json`
- `test_output.json`
- `test_output2.json`
- `test_output_auto.json`
- `test_results.txt`
- `debug_500.py`
- `extensive_test.py`
- `test-e2e.js`
- `test-openrouter.mjs`

Do not delete these without checking whether any current docs or scripts reference them.

## Denylist

Never delete automatically:

- `src/`
- `prisma/`
- `public/`
- `docs/`
- `sandbox/` source files,
- `package.json`
- `package-lock.json`
- `.env`
- `.env.local`
- `.env.example`
- Docker files,
- TypeScript/Next config files,
- migrations,
- any file modified by user in current git status.

## Approval Gates

Ask owner before:

- deleting non-generated files,
- deleting anything with nonzero size that is not clearly output,
- deleting files outside repo root,
- deleting `.next` or `node_modules`,
- rewriting package files.

## Outputs

- cleanup manifest,
- deletion/move summary,
- verification commands run,
- remaining clutter list.

## Failure Handling

- If a file might be useful, move to `docs/archive/cleanup-YYYY-MM-DD/` instead of deleting.
- If tests fail after cleanup, restore from git or archive and report.

## Tests

- App starts after cleanup.
- Git status only shows intended changes.
- No required config or source file removed.

