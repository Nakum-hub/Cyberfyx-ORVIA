# Handoff — V1-RESUMPTION-REVIEW-01 — Codex

**Base commit:** 60f527d91779c654fbf66cf559ae02b65b3f7cb2.
**New commit:** not committed.
**Source master/hash verified:** revision 1.4, `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`.
**Contract:** source 0.40.0; committed generated artifacts 0.39.0 at the inspected base.
**Scope:** user-requested review of Claude Code's merged work and continuation of V1. Existing PDF/presentation edits are preserved. Approved master and DPDP extension pack remain read-only.

## Start and bounded plan

Allowed paths: generated contracts and seed; account deletion implementation and tests; an additive scope-predicate migration and isolated tests; review/status/tracking documents and task-specific evidence. Review the expanded baseline, inspect takeover code, execute static checks, repair confirmed defects, then run isolated database/browser checks where available. No database reset, public deployment, release acceptance, merge, or live provider activation.

Initial runtime probe found no daemon at the sandbox's default pipe. The real `desktop-linux` context was subsequently accessible under normal tool approval. Its four existing codex-a00 service containers were started; one migration attempt failed with 42P07. The runner's transaction failure path rolls back. All four containers were stopped after the user clarified the lane. No database reset, volume removal, trust installation, role provisioning or external provider call was performed. Static checks used existing installed dependencies and repository-local Node 24.21.0; the first direct diagnostic commands used global Node 24.7.0. The global pnpm launcher failed registry signature verification because registry fetch failed; no verification bypass was used.

## User steering and final lane

The user stated Claude is testing the latest changes in its own cloud environment and instructed Codex to leave that testing to Claude. Codex parked its overlapping changes and restored only its own application edits. No application contract, credential, staff or migration edit remains applied from this lane. The authoritative current findings/backlog are in `docs/engineering/2026-09-28-project-review.md`.

Independent allowed paths then became: `scripts/package-candidate.ts`, new `scripts/release-baseline.ts`, new `tests/unit/release-baseline.test.ts`, new `.github/workflows/source-validation.yml`, new `docs/engineering/source-validation.md`, new `docs/engineering/2026-09-28-project-review.md`, the current-state checkpoint and this task's handoff/evidence. No Claude-owned feature implementation was changed after clarification.

## Delivered

- `scripts/release-baseline.ts`: verifies the immutable revision 1.4 source and records E1 plus its register hashes; refuses missing/mismatched scope provenance.
- `scripts/package-candidate.ts`: replaces obsolete revision 1.3 authority with that verified baseline before package creation. Existing release/human/profile gates remain.
- `tests/unit/release-baseline.test.ts`: four tests covering exact-byte provenance, altered master, historical/mismatched expansion and missing source.
- `.github/workflows/source-validation.yml`: static PR/main/manual workflow, read-only token, no persisted checkout credentials, pinned Actions, frozen dependencies, contracts/types/lint/units/tracking/master checks. Not pushed or executed on GitHub.
- `docs/engineering/source-validation.md`: workflow boundaries and unexecuted hosted/branch-protection state.
- `docs/engineering/2026-09-28-project-review.md`: nine prioritized findings, preference-clock reproduction, present/missing boundaries for all 14 families, delivery order and unresolved decisions.
- `CURRENT_STATE.md`: current review banner; previous checkpoint and acceptance history retained.

Parked proposals (not applied): `handoffs/codex/artifacts/V1-RESUMPTION-01-proposed-fixes.patch` contains regenerated 0.40.0 outputs plus the Windows credential-path correction and its proposed test. `V1-RESUMPTION-01-proposed-typed-scope.sql` contains a proposed 0063 migration. The credential correction/test and SQL are NOT_RUN; do not apply blindly after Claude's next update.

## Commands actually executed

Commands below ran at the workspace root. `N` abbreviates the executed `.local/tools/node-v24.21.0-win-x64/node.exe` path only; it was not a shell alias.

| Command | Exit | Result / artifact |
|---|---|---|
| `pnpm run contracts:check`; `pnpm run typecheck` | 1 each | Launcher registry fetch/signature verification failure; project checks did not run through this launcher. |
| `node --import tsx shared/contracts/src/generate.ts --check` | 1 | Reproduced generated OpenAPI drift using global Node 24.7.0. |
| `node node_modules/typescript/bin/tsc --noEmit` | 1 | Four deletion-screen type errors against stale generated EndpointMap; global Node 24.7.0. |
| `N --import tsx shared/contracts/src/generate.ts` | 0 | 8 artifacts + seed, 410 route examples, 7 errors, contract 0.40.0. Outputs subsequently parked per lane clarification. |
| `N --import tsx --test tests/unit/*.test.ts` | 0 | 271/271; `artifacts/V1-RESUMPTION-01-unit-initial.log` relative to this handoff directory. Locally regenerated outputs were present; not full candidate acceptance. |
| `N node_modules/eslint/bin/eslint.js frontend backend database connectors shared services scripts tests --max-warnings 0` | 0 | `artifacts/V1-RESUMPTION-01-lint-initial.log` (empty successful output). |
| `N --import tsx scripts/services.ts up` with `DOCKER_CONTEXT=desktop-linux`, `ORVIA_PROFILE=codex-a00` | 0 | Started the four existing synthetic containers. |
| `N --import tsx scripts/migrate.ts` with `ORVIA_PROFILE=codex-a00` | 1 | PostgreSQL 42P07, duplicate relation; transaction rollback path; conflict not diagnosed before lane handoff. |
| `git apply --reverse --check` on first PowerShell-written proposal patch | 1 | Encoding/line-ending mismatch; no reverse applied. Recreated the patch using `git diff --binary --output=...`; reverse check and reverse apply both exited 0, preserving only our proposals. |
| `docker --context desktop-linux stop orvia-codex-a00-postgres-1 orvia-codex-a00-opa-1 orvia-codex-a00-temporal-1 orvia-codex-a00-loopback-1` | 0 | All four owned starts stopped; volumes retained. |
| `N --import tsx --test tests/unit/release-baseline.test.ts` | 0 | 4/4; `artifacts/V1-RESUMPTION-01-release-baseline.log`. |
| `N node_modules/eslint/bin/eslint.js scripts/package-candidate.ts scripts/release-baseline.ts tests/unit/release-baseline.test.ts --max-warnings 0` | 0 | `artifacts/V1-RESUMPTION-01-release-lint.log` (empty successful output). |
| Python/PyYAML parse of `.github/workflows/source-validation.yml` with assertions on read-only permissions and ten steps | 0 | Parsed and assertions passed. Hosted Actions execution remains NOT_RUN. |
| PowerShell read-only tracking/status/hash inventory | 0 | `artifacts/V1-RESUMPTION-01-status-inventory.json`; all referenced expansion evidence paths exist. |
| `git diff --check` | 0 | No whitespace errors in tracked diff at check time. |

The web lookup verified pinned Actions release commits against their official GitHub repositories; links are in `docs/engineering/source-validation.md`. No GitHub mutation, PR, push, workflow dispatch, branch-protection change or paid operation occurred.

## Acceptance

No acceptance promoted. Historical test evidence does not qualify this build.

## Remaining limitations and next dependency

Claude's latest verification/update is pending. R01's future-dated preference ordering is source-confirmed and has an exact proposed HTTP reproduction, not a newly executed HTTP result. R02/R04 overlap its lane. Local upgrade failure and capacity need separate diagnosis/qualification. The current merged source still has contract drift after the proposals were parked, so the added CI correctly cannot be claimed green for it. Independent packaging tests/lint passed; full packaging/rehearsal is NOT_RUN.

Read the review's 14-family backlog before continuing. Obtain the already-made pilot connector/payment decisions if any, then coordinate named implementation paths. Review Claude's subsequent GitHub changes before combining proposals. No release completion percentage, production integration or legal/security qualification is claimed. Existing PDF/presentation files were never edited by this task.
