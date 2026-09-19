# ORVIA repository cleanup — 2026-09-19

**Writer:** Claude Code · **Scope:** Workspace hygiene and domain-module boundary reorganization (two passes, same day). No business logic was rewritten, no contract/migration/policy semantics changed, no master document touched.

## Pass 2 — domain and connector module boundaries

The prototype implements one real, tested module (identity → consent → policy → durable
workflow → signed connector command → independent verification → evidence → regression).
The rest of ORVIA's ~218-section master is still to be built as sibling modules (Privacy
Control Graph, DSR, retention, processors/incidents, vendor/billing, ...). Before that
work starts, `packages/domain/src` and `packages/connectors/src` — the two places actual
business logic accumulates — were flat single-file-per-concern directories, which would
have mixed new modules' files in with this one's as they were added. Reorganized into
per-concern subfolders, with cross-cutting primitives kept separate from domain-specific
logic, using `git mv` (history preserved) and updating every import site:

| Old path | New path |
|---|---|
| `packages/domain/src/transaction.ts` | `packages/domain/src/shared/transaction.ts` |
| `packages/domain/src/completion.ts` | `packages/domain/src/shared/completion.ts` |
| `packages/domain/src/consent.ts` | `packages/domain/src/consent/consent.ts` |
| `packages/domain/src/configuration.ts` | `packages/domain/src/configuration/configuration.ts` |
| `packages/domain/src/workflow.ts` | `packages/domain/src/workflow/workflow.ts` |
| `packages/domain/src/processing.ts` | `packages/domain/src/processing/processing.ts` |
| `packages/domain/src/evidence.ts` | `packages/domain/src/evidence/evidence.ts` |
| `packages/domain/src/test-runs.ts` | `packages/domain/src/test-runs/test-runs.ts` |
| `packages/connectors/src/target-db.ts` | `packages/connectors/src/shared/target-db.ts` |
| `packages/connectors/src/simulator.ts` | `packages/connectors/src/crm-synthetic/simulator.ts` |

`transaction.ts` and `completion.ts` have zero internal-domain dependencies and are
imported by nearly every other domain file, so they stay in `shared/` rather than any one
concern's folder. `target-db.ts` (`targetTransaction`, a generic scoped-transaction
helper) is genuinely reusable by future connectors, so it moved to `connectors/shared/`;
`simulator.ts` is specific to the one synthetic demo-CRM target, so it moved to
`connectors/crm-synthetic/`. A future real connector gets its own sibling folder under
`connectors/src/`; a future domain module gets its own sibling folder under
`domain/src/` — neither touches this module's files. `packages/domain/package.json`'s
`exports` field and `README.md` §17 were updated to match (`README.md` now documents the
sub-module layout explicitly, as the pattern future modules should follow).

No other package was restructured: `auth`, `authz`, `policy-sdk`, `testing`, `contracts`
and `db` are already correctly single-purpose, cross-cutting infrastructure shared by
every future module, not something that needs per-domain splitting. `apps/*` (deployable
processes) and `apps/web/src/app/workspace/*` (already one folder per screen) were left
as-is for the same reason — they already match the target shape.

Every import site across `apps/`, `packages/`, `scripts/` and `tests/` referencing the
ten moved files (30 import lines across 15 consumer files, enumerated by grep before any
file was touched) was updated to the new path. A follow-up grep for the old bare
filenames after the edits found zero remaining references. Historical evidence documents
under `docs/reviews/` and `docs/demo/` that cite the old paths (dated reports, claims
registers) were deliberately **not** edited — they are frozen point-in-time records, not
live references, and rewriting them would falsify the audit trail they exist to provide.

Re-validated after the move: typecheck, lint, unit tests (20/20), `contracts:check`
(identical output: 8 artifacts, 41 route examples, 7 error examples — confirming no
generated-contract drift) and `tracking:check` all still pass.

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
