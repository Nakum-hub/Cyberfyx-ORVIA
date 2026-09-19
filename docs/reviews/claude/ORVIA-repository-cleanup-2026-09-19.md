# ORVIA repository cleanup — 2026-09-19

**Writer:** Claude Code · **Scope:** Workspace hygiene only. No product code, contract, migration, policy or master-document content was changed.

## What was inspected

Full working-tree inventory of `C:\Cyberfyx-projects\Cyberfyx_ORVIA` (git root), branch
`prototype/claude/readme-one-command-start`. Compared against the protected presentation
copy at `C:\Cyberfyx-projects\ORVIA-Prototype` (a separate, untouched directory and git
repository — confirmed by directory listing before and after this session).

The existing repository structure (`apps/`, `packages/`, `policy/`, `scripts/`, `tests/`,
`docs/`, `tracking/`, `infrastructure/`) already matches sound module-ownership
separation and was left in place; no renaming or restructuring was performed. A targeted
grep of `packages/**/src` and `apps/**/src` for fake-production markers (`TODO`,
`hardcoded`, `placeholder`, `dummy`, `not implemented`) found no fabricated-success paths
outside the two expected, explicitly-labelled UI states in `apps/web/src/components/ui.tsx`.
`handoffs/` and `docs/reviews/` (2,182 tracked files, 8.2 MB) are the project's deliberate
multi-agent evidence archive, actively cross-referenced by `CURRENT_STATE.md` — these were
left untouched; they are not scratch material.

## Removed

- **`orvia-ui-b00/`** (nested, untracked git worktree). This was a stray copy of the
  `prototype/code/B00-B04` UI scaffold worktree. Its checked-out commit `397cb37` is
  already an ancestor of `HEAD` (fully merged), and the worktree's own uncommitted edits
  (`shell.tsx`, `layout.tsx`, `page.tsx`) were an earlier, smaller draft strictly
  superseded by the current `apps/web/src` (e.g. `shell.tsx` 129 lines in the worktree vs.
  198 in the maintained tree; `app/workspace/` had only `layout.tsx` in the worktree vs.
  eleven built routes in the maintained tree). Git already reported the worktree
  registration as `prunable` — its `gitdir` pointed at a sibling path,
  `C:\Cyberfyx-projects\orvia-ui-b00`, that no longer exists. Removed via
  `git worktree remove --force` (with the user's explicit confirmation) followed by
  deleting the released directory. A full recovery archive (uncommitted diff, untracked
  source files, HEAD/status snapshot) was written first to `.local/cleanup-recovery/`
  (git-ignored, local-only) before deletion.

## Repaired

- **`node_modules/typescript`** (and related packages) were present as empty directories
  — a broken local install pre-dating this session (`node_modules/typescript` dated
  2026-09-16, i.e. an old partial install), which made `npm run typecheck` and
  `npm run lint` fail with `MODULE_NOT_FOUND`. Repaired with
  `pnpm install --force` using the pinned toolchain (`.local/tools/node-v24.21.0-win-x64`,
  pnpm 12.4.2) against the existing, unmodified `pnpm-lock.yaml` — no dependency was
  added, removed or upgraded.

## Left alone (uncertain / not this session's call)

- `apps/web/src/components/shell.tsx` has a pre-existing uncommitted edit (removing the
  "About this build" nav group). This looks like active WIP belonging to whoever last
  touched this branch; it was not discarded or completed.
- Several untracked evidence artifacts from the most recent local test/preflight runs
  (`handoffs/codex/artifacts/A00-*.json`, `handoffs/codex/browser/B06-*/`) were left as
  they are — they match this project's established evidence-recording pattern and are
  pending the normal commit workflow, not cleanup debris.
- The local branch `prototype/code/B00-B04` (fully merged, now worktree-less) was left in
  place; deleting a git ref is a separate, low-value action outside this session's scope.

## Validation run (pinned toolchain, no Docker services required)

| Check | Result |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `npm run lint` | PASS (`--max-warnings 0`) |
| `npm test` (unit) | PASS, 20/20 |
| `npm run contracts:check` | PASS — 8 artifacts, canonical seed, 41 route examples, 7 error examples |
| `npm run tracking:check` | PASS — 23 tasks, 34 acceptance definitions, 33 capability modules |
| `npm run hygiene:check` | PASS — 2,702 files examined, 0 findings |

Docker-backed integration/e2e/security suites (`test:auth`, `test:consent`, `test:workflows`,
`preflight`, `tests/e2e/*`) were **not run** in this session — they require the live
PostgreSQL/Temporal/OPA stack (`npm start`), which was out of scope for a workspace-hygiene
pass and was not started.

## Protection check

- `ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md`,
  `ORVIA_V1_Master_with_Engineering_Breakdown(full idea).md`, `README.md`,
  `README_START_HERE.md`, `CURRENT_STATE.md` and `AGENTS.md` were SHA-256 hashed before
  and after this session: **all six hashes are identical**, confirming no protected
  document was modified.
- `C:\Cyberfyx-projects\ORVIA-Prototype` (presentation copy, separate git repository) was
  not entered, run or modified.
