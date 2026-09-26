# Handoff — DPDP lane continuation — Claude Code — branch `claude/upbeat-newton-w4h53x`

**Base commit:** `ff0106f` (main, PR 17 merge)
**New commits:** on `claude/upbeat-newton-w4h53x` (see `git log ff0106f..`)
**Source master / hash verified:** not re-hashed in this session; no master content changed.
**Contract version:** 0.28.0 → **0.29.0** (additive)
**Scope and profile:** DPDP operational extension (Claude Code lane, `handoffs/codex/2026-09-24-dpdp-lane-boundary.md`). Fresh isolated `codex-a00` profile in a disposable Linux cloud container, with its own Docker PostgreSQL/OPA/Temporal, database, ports and synthetic fixture keys (`.local/`, not committed). No shared runtime or database was touched.

This addresses items 1 and 2 of "Claude-specific unfinished items" in `handoffs/codex/2026-09-25-overall-completion-and-resume.md`. Items 3–6 remain open (see below).

## Delivered

### 1. Defect found and fixed: withdrawals dated before any package in force were never propagated

- **Found by** the first recorded execution of the 13 DPDP suites: `consent-withdrawal` failed with `withdrawal_run_ids.length` 0, expected 1.
- **Cause:** `appendConsentEvent` (`backend/domain/src/registry/consent.ts`) created the `CONSENT_WITHDRAWAL` run only if a regulatory package was in force *at the withdrawal's own time*. On a fresh database the suite's withdrawal (dated 6 minutes earlier) predated the first package by about a minute. In production the same thing happens to any backdated operator entry, or V1 portal withdrawal, made before the organisation's first package takes effect. The withdrawal was recorded but never reached downstream systems, and nothing reported it.
- **Fix:**
  - The run is created under the package in force **now**, which `createWithdrawalRun` already used. The event itself stays pinned to the package of its own time, which may be none.
  - New `propagatePendingWithdrawals` / `pendingWithdrawalCount` in the same module. A pending withdrawal is one where the latest non-MODIFIED event is a non-import WITHDRAWN with no run. A withdrawal superseded by a later grant is excluded. Each record is locked and re-checked, with `one_run_per_consent_event` as the backstop against duplicates.
  - `services/worker/src/operations-runner.ts` calls it first in every cycle and reports `withdrawals_propagated`. This also repairs rows left behind by installations that ran the earlier code.
  - `backend/domain/src/operations/attention.ts` adds `WITHDRAWAL_NOT_PROPAGATED`, so a waiting withdrawal (for example, no package in force) is never silent.
- **Regression test:** new phase `backdated and legacy withdrawals` in `tests/integration/operations/consent-withdrawal.test.ts`. It covers a withdrawal dated 2020, legacy rows inserted exactly as the old code left them, runner repair with independent read-back verification, and the re-grant exclusion.

### 2. Registry creation screens (previously API-only)

- `frontend/src/components/screens/privacy-operations/registry-forms.tsx`: a shared `WriteForm`. It posts one canonical operation, validates against the contract schema before sending, refuses cross-field violations locally with the same rules the contract enforces, handles idempotent replay through `MutationFeedback`, and is hidden without `registry.write` (presentation only; the server enforces). Hints are linked with `aria-describedby`, so each control's accessible name is its label alone.
- New `/workspace/registry-setup` (`registry-setup.tsx`): principal and data categories; purposes (create, revise, retire); processing conditions offered from the vocabulary of the package in force, or explicitly unresolved with a reason.
- New `/workspace/registry-notices`: notices per audience, per-locale draft versions (with withdrawal, rights, grievance and Board channels), publication.
- `/workspace/processing-activities`: register an activity; link categories, systems, engagements, retention rules, safeguards or channels.
- `/workspace/registry-retention`: create rules (a period always cites its source) and place holds (a hold always names what it covers).
- `/workspace/processor-engagements`: record an engagement with its data, principal and system links.
- Two nav entries in `frontend/src/components/shared/shell.tsx`; Attention links for notice records.
- `docs/engineering/dpdp-operations.md` updated (withdrawal semantics, runner, screens); the "API-first" note is replaced.

## Commands actually executed

| Command | Exit | Result | Artifact / environment |
|---|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | PASS | Linux x64, Node 22.22.2 (package.json pins 24.21.0; see limitations) |
| `pnpm run typecheck` (base, then after every change) | 0 | PASS | root tsconfig covers the frontend (verified with a deliberate error probe) |
| `pnpm run contracts:check` (base) | 0 | PASS | 0.28.0, 300 routes |
| `pnpm run contracts:generate` then `contracts:check` | 0 | PASS | 0.29.0, 300 routes, 7 error examples |
| `pnpm run test` (base and after changes) | 0 | 252/252 PASS | unit |
| `pnpm run lint` | 0 | PASS, 0 warnings | |
| `profile:init`, `services up`, `roles:init`, `db:migrate`, `preflight`, `auth:init`, `auth:bootstrap`, `seed:auth`, `machine:init` (codex-a00) | 0 each | PASS | A00-migration-1790404697122, A00-preflight-services-1790404698841 |
| `pnpm run build` | 0 | PASS | Next production build |
| `pnpm run test:operations` **run 1, base code** | 1 | 12 PASS, **consent-withdrawal FAIL** (3 pass, 2 fail: one assertion plus its phase record) | `A00-operations-*-17904048…–17904054…` |
| consent-withdrawal with the new test and **the fix deliberately reverted** (control) | 1 | **Expected regression detection:** FAIL on "a withdrawal made before any package took effect is still propagated, exactly once" (actual 0 runs), 31 assertions / 2 failures | `A00-operations-consent-withdrawal-1790405529596` |
| `pnpm run test:operations` **run 2, with the fix** | 0 | **13/13 PASS, 287 assertions, 0 failures** | `A00-operations-*-1790405632842 … 1790406227603` |
| `tsx tests/e2e/registry-forms-local.ts` attempt 1 | 1 | FAIL: test locator ambiguity (`^Notice` matched "Notice text"); led to the aria-describedby change | `…registry-forms-browser-1790406309581` |
| attempt 2 (after rebuild) | 1 | FAIL: exact-label locator did not allow the visual ` *` marker (test-only) | `…registry-forms-browser-1790406404689` |
| attempt 3 | 0 | **16/16 PASS** | `…registry-forms-browser-1790406472039`, screenshots in `output/playwright/` |

Run-2 per suite: regulatory 32 · applicability 18 · registry 47 · estate-import 18 · notices 15 · consent-withdrawal 38 · rights 26 · correction 12 · processors 14 · breach 19 · sdf 22 · runner 10 · retention-scale 16 (2,000 subjects: import 20.9 s, evaluation 7.1 s, execution 7.9 s in run 1).

Tests not run: the V1 base integration battery (`verify:suites`), GRC/audit HTTP and browser suites, `test:lifecycle`/`test:tls` (rehearsal only), and the rehearsal-profile Playwright suite. The run-2 DPDP suites executed before the final aria-describedby UI change; that change touches only presentation in the new forms, and the journey that exercises it was run afterwards (attempt 3).

## Acceptance

Component evidence only. It is not T01–T34 or full-scenario acceptance, and not a qualified candidate. All connector effects use `SYNTHETIC_RECORDS_TEST_ADAPTER`; all packages are `TEST_FIXTURE`.

## Contract / dependency / ownership changes

- Contract 0.29.0: `AttentionKind` gains `WITHDRAWAL_NOT_PROPAGATED`. Generated artifacts and `tracking/contract_seed.json` were regenerated. No route or schema shape changed.
- Shared-file edits outside the DPDP pack: `shared/contracts/src/index.ts` (version), `shell.tsx` (nav), `package.json` (`test:e2e:registry-forms`). Recorded at the top of `handoffs/codex/2026-09-25-active-lane.md`.
- `RunnerReport` gains `withdrawals_propagated`.

## Remaining limitations and blockers

- **Lockfile:** on Linux, `pnpm install`/`pnpm run` remove the Windows-only `@pnpm/exe` entries from `pnpm-lock.yaml`. Reverted every time and not committed. The toolchain owner should decide whether the committed lockfile should carry them (historically they were described as an artefact and reverted).
- **Node version:** executed on Node 22.22.2, not the pinned 24.21.0.
- Set-up screens load full collections for their tables and dropdowns. That is fine at realistic registry sizes (tens of categories and purposes) but not paginated; a large registry needs paged tables.
- Still created only through the API or estate import: Data Principals, relationship contexts, representatives, safeguards, data-sharing links, consent records.
- Open from the resume record: official source artifacts and legal review (item 3); a signed production regulatory package (item 4); named real connectors (item 5); runner deployment/supervision alongside the Temporal worker (item 6).

## Next integration action

Review and merge this branch (human). Re-run `test:operations` and `test:e2e:registry-forms` on the integration result, plus the V1 battery, because the contract version changed.

---

## Round 2 (same day): screens for every remaining operation, supervision, Stage Gate C

### Delivered
- **Every DPDP contract operation now has a screen: 102 of 102** (was 58).
  - Breaches: registration and fact correction.
  - Organisation profile: SDF status with designation reference.
  - Consent records: operator events (a withdrawal opens its run) and Privacy Centre sync.
  - Data Principals: registration with keyed references, relationship contexts, merge/unmerge.
  - Representatives: guardians, nominees and representatives, verified by a different person, with nomination activation.
  - Child status.
  - Engagements: termination, and return/deletion evidence (a processor statement is never "verified").
  - Data sharing, safeguards, and connector bindings (the synthetic test adapter is labelled).
  - Revisions: activity and retention-rule revision, and link closure.
  - Rights: execution and case profiles.
  - Estate import from a JSON/JSONL file, validated row by row before anything is sent.
  - Notices: history lookup and delivery evidence.
  - Regulatory: signed package import and applicability exemptions.
  - Evidence and event lists.
- Forms mirror the server's input rules before sending. Set-up tables page on the server, and activities can be filtered by system.
- `scripts/app-run.ts` supervises the operations runner. The runner now honours the supervisor's IPC stop and interrupts its idle wait (measured: 15 ms to exit, code 0). A loop no longer ends with a sticky failure code for item errors.
- Migration apply logic moved to `database/customer/src/migrations.ts` (optional stop point). `scripts/migrate.ts` is unchanged in behaviour and was re-run on a fresh `ui-b00` install.
- New `tests/integration/migration/upgrade.test.ts` (`test:migration-upgrade`), plus two browser journeys (`test:e2e:registry-forms`, `test:e2e:operations-screens`).

### Commands actually executed (codex-a00 unless stated; machine enrollment refreshed before each step)
| Step | Result |
|---|---|
| build, typecheck, lint, contracts:check (0.29.0), unit 252/252 | PASS |
| e2e registry-forms | PASS (after adding the activity filter; the first chain run failed on locating the activity in a long list) |
| e2e operations-screens | PASS 30/30. Earlier attempts failed on test mechanics and on correctly enforced server rules: recorder cannot verify their own representative, and a known child status needs evidence. The forms now state those rules |
| 13 DPDP suites | 13/13 PASS. The first chain run had consent-withdrawal and runner fail with "Expired authority": the one-hour synthetic machine enrollment had lapsed |
| 27 V1 suites | 27/27 PASS after one test fix (below) |
| test:auth | Failed on codex-a00 because the suite requires `reviewer` never to have enrolled MFA (the DPDP suites enrol it). **PASS 90/90 on a freshly bootstrapped `ui-b00` profile** |
| test:isolation | PASS on codex-a00 (the suite refuses other profiles by design) |
| services:smoke | PASS |
| web:smoke | PASS after a test fix (below) |
| GRC grc 40, audits 41, http 57; AI governance ×2; discovery ×2; commerce 45 | PASS. grc-http needs a dedicated OPA; started `orvia-grc-http-opa` on 127.0.0.1:4494 from the pinned image, then removed it |
| migration upgrade | PASS 10/10: 22,412 V1 rows across 109 tables upgraded through 14 migrations with every V1 value unchanged; schema equals a fresh install (columns, constraints, indexes, RLS policies, triggers); a re-run applies nothing. 312 rows that only later releases can hold (3 coverage gaps, 309 notification tasks) were skipped and recorded. The throwaway database was dropped |

### Test fixes to files outside the DPDP pack (review requested)
- `tests/integration/audit/retention.test.ts`: the deletion check targeted events older than a day, which matches nothing on an installation under a day old, so an empty DELETE reported "accepted". It now targets the oldest event in scope. The trigger was separately confirmed to refuse a real delete with 23514.
- `tests/integration/web.test.ts`: the landing-page label changed to "Synthetic test environment" in `e2c8ee3`, and the test still expected "Synthetic demonstration". This failure predates this branch.

### Still not done (unchanged by this round)
- No real customer connector. Everything automated runs on `SYNTHETIC_RECORDS_TEST_ADAPTER`.
- No official, legally reviewed regulatory package. All packages are `TEST_FIXTURE`.
- The one-hour synthetic machine enrollment stops the worker, runner and agent after an hour under `app:run` (existing V1 behaviour, now also affecting the runner).
- The rehearsal-profile suites (`test:lifecycle`, `test:tls`, the Playwright rehearsal suite) were not run.
- Capacity at 1M was not tested. T01–T34 and the DPDP full-scenario acceptance remain NOT_RUN; they need a frozen candidate and human rehearsals.
