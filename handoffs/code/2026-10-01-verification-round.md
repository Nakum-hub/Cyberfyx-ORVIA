# Handoff — V1-VERIFY-2026-10-01 — Claude Code — `57f0f53` (plus this handoff commit)

**Base commit:** `a29436c`, the head when battery 19 started.
**New commits:** on `claude/upbeat-newton-w4h53x`, through `57f0f53` and this handoff. The merge of the feature worktree, including Codex round 7 (`4738d9a`), is `aeb1c75`.
**Source master / hash verified:** revision 1.4. SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`. Addenda 1.5–1.9 apply.
**Contract version:** 0.55.0 (customer), 0.6.0 (vendor).
**Scope and profile:** synthetic data only.
- `codex-a00` is the long-lived development profile.
- The real-principal test also uses a scratch copy of the schema, seeded as a customer (`rehearsal`) installation.
- No main merge, no deployment, no database reset, no real data.

## Delivered

### Features (new or completed this round)

**Real-people admission (revision 1.9).**
- Migration `0082`.
- `scripts/real-principals.ts` (`principals:admit-real`).
- Contract 0.54.0: `Principal.synthetic` is set by the database.
- Admin principal route; Principals screen labels.
- Addendum `docs/engineering/V1_BASELINE_REV_1_9_REAL_PRINCIPALS.md`, which also records the email-only identifier decision.

**Security fix: server-only functions stay server-only.**
- The cause: `scripts/machine-init.ts` and `scripts/auth-init.ts` granted EXECUTE on every app function, which re-granted `owner_recovery_issue` and `admit_real_principals` to the web application role.
- Both scripts now call `revokeServerOnly` (`database/customer/src/server-only.ts`).
- Migration `0084` corrects installations enrolled before the fix.

**Forced row security on `app.owner_recovery_codes`.**
- Migration `0083`.
- The battery found it through the GRC forced-row-security control test, the backup drill and `security/auth`.

**Withdrawal canaries.**
- Migration `0079`; `backend/domain/src/consent/canaries.ts`; screen; suite.

**Custom-model version governance.**
- Migration `0080`; `backend/domain/src/ai-governance/model-versions.ts`; screen; suite.

**Operations runner woken on withdrawal.**
- Migration `0081` (NOTIFY); `services/worker/src/operations-runner.ts`.
- Measured in `withdrawal-timing`.

**Postgres memory settings for the 512 MB container (`infrastructure/compose.yaml`).**
- Battery 20 hit a kernel memory-cgroup kill of a Postgres backend during `migration-upgrade`; Postgres then restarted every connection.
- The cause: the container limit was 384 MB with default Postgres memory settings.
- The fix: `mem_limit: 512m`, `shared_buffers=64MB`, `work_mem=2MB`, `hash_mem_multiplier=1`, `maintenance_work_mem=32MB`, `autovacuum_max_workers=2`, `max_connections=60`. The same file is used by real installations.
- Verified: the container was recreated with its data kept; `migration-upgrade` passed 10/10 and the rest of the battery ran with no further kill.

**Catalog discovery: first read before freshness re-reads.**
- `services/worker/src/catalog-discovery.ts`.

**NoticeContextDrift CI guard.**
- `tests/unit/notice-context-drift.test.ts`: nine scenarios, plus five deliberately broken rule variants that must each fail.
- `docs/engineering/NOTICE_LANGUAGE_DRIFT.md` records that translation equivalence is a reviewed human attestation.

**Canary receipt route renamed `record_canary_receipt`.**
- A unit invariant requires every route whose id names a report to be a read.

### Tests corrected (test faults, not product faults; each verified by rerun)

**Long-lived-profile paging and backlog.**
- New helper: `shared/testing/src/all-pages.ts`.
- Suites changed: `rights/portal`, `expansion/delivery`, `expansion/audit-mandate`, `consent/canaries`, `discovery/schema-drift`, `discovery/catalog-flow` and `expansion/grc-lifecycle`.
- These make their own record the next one processed instead of queueing it behind other runs' records.

**`tests/integration/web.test.ts`.**
- It now starts Next.js with `ORVIA_WORKSPACE_ROOT`, as every real start path does.
- It asserts a request with no session gets 401 UNAUTHENTICATED. The old 503 came from a dependency-less start.

**`tests/integration/grc/http.test.ts`.**
- Its isolated database now includes the Privacy Centre setting table and reader from `0073`, which sign-in reads.

**`tests/integration/enforcement/withdrawal-timing.test.ts`.**
- Each cycle uses its own granted purpose.
- A re-grant during unresolved suppression is asserted to stay BLOCK. This is product behaviour by design: no re-grant silently restarts marketing before the downstream suppression is verified.

**`tests/e2e/ai-governance-local.ts` and `catalog-discovery-local.ts`.**
- They find Chromium on Linux as well as the bundled Windows shell.

**Added coverage.**
- `audit-mandate`: four continuous-assurance mandate checks (revision 1.6, §3).
- `real-principals`: refusal over the admin API.

### Documents

- `docs/engineering/V1_VERIFICATION_MATRIX.md`. It is generated from executed results only and covers:
  - the seven presentation claims, the canary trap, NoticeContextDrift and real people, scenario by scenario with measured timings and stated limits;
  - the 22 important functions;
  - the 26 V1 modules;
  - the 19 families.
- `docs/GO_LIVE.md`: new section D (D1–D7, owner and Codex inputs); C3 detailed.
- Tracking:
  - 2026-10-01 notes on EX01, EX02, EX04, EX07, EX12, EX14 and EX18.
  - No acceptance status was promoted.
  - M26 Billing stays `NOT_IMPLEMENTED` by design: billing, metering and invoicing belong to the ORVIA Account on the vendor website (master §658, §3796). `tests/unit/deployment-boundary.test.ts` enforces it. An attempt in this round to mark it partial was reverted; vendor commerce is tracked as EX13.

## Commands actually executed

All on `codex-a00`. Runner: `scripts/run-signed-suite.sh`, one suite at a time. Logs are in the session scratchpad; the summaries are reproduced in the matrix.

| Command | Exit | Result |
|---|---|---|
| Battery 19: every integration, security (`*.test.ts`) and browser suite, serially | — | 90 passed, 14 failed. Each failure was triaged below. |
| `pnpm run -s contracts:check` | 0 | Contract 0.54.0; 490 route examples validated |
| `npx tsc --noEmit` | 0 | PASS |
| `pnpm run -s lint` | 0 | PASS |
| `pnpm test` | 0 | 352 passed, 0 failed (after the route rename and NoticeContextDrift) |
| `pnpm run -s tracking:check`, `qualification-inventory --check`, `v1-source-inventory --check` | 0 | PASS |
| `pnpm run -s db:migrate` (0079–0084) and `build` | 0 | PASS |
| Pass 1: 26 suites (the battery's failures, new suites, neighbours) | — | 18 passed, 8 failed; 6 were test faults, fixed |
| Pass 2: 8 suites | — | catalog-flow, grc-lifecycle, backup-drill, grc-http and web passed |
| Pass 3: schema-drift, withdrawal-timing, canaries | 0 each | 10/10, 11/11, 24/24 |
| Pass 4: audit-mandate with continuous assurance | 0 | 102/102 |
| Pass 5: `security/fixture-isolation.ts`, `security/graph-source-binding.ts`, `scripts/policy-gate.sh` | 0 each | PASS. The policy gate catches all 8 deliberate defects. |
| Operations attention timing, 8 calls | — | 233–346 ms |
| Battery 20: the full regression battery after every fix above, serially, including `tests/security/*.ts` | — | 107 passed, 0 failed, NOT_RUN for TLS and network-core only (reasons below) |

**Tests not run:**
- `tests/security/tls.test.ts`. It runs only on `rehearsal`. That profile is the clean customer install with one first-run owner, and seeding fixture users would add owners, breaking the revision 1.8 invariant.
- `tests/security/network-core.ts`. It needs the packaged image `orvia-local:prototype` from the Windows packaging path.
- `tests/integration/lifecycle.test.ts`. It is excluded from the battery.

## Acceptance

Every executed result is in the matrix. These are local synthetic results: not candidate acceptance, not release qualification, not production qualification. All 19 families keep `NOT_RUN` family acceptance.

## Contract / dependency / ownership changes

- Contract 0.54.0:
  - `PrincipalCreate.email` accepts any email;
  - `Principal.synthetic` is a boolean set by the database;
  - the canary receipt route id is now `record_canary_receipt`.
- Customer migrations 0079–0084.
- Codex round 8 was briefed to review this work. It may add migration 0085+ for the seven list queries that still need insertion timestamps.

## Remaining limitations and blockers

- **Owner and Cyberfyx inputs:** `docs/GO_LIVE.md` section D (D1–D7), plus C1 (installation qualification), C3 (live payments), C4 (penetration test), C5 (Codex Phase B) and C6 (release approval).
- **Seven list queries need insertion timestamps (0085+).** Blocked on Codex round 8 to avoid duplicate numbering.
- **Downstream suppression takes about 14 s.** That is on the synthetic loopback target with one immediate runner cycle. A named production connector needs its own measurement.


## Round 2 (2026-10-01 evening): Codex round 8 merged, owner decisions revision 1.10

**Merged:** `codex/round8` through `d7a10d6`, in merges `f64c98d` and `1f44259`. It brings 0085 (staff list chronology, which was P3), 0086 (pending canary retirement) and 0087 (recorded independent verification recovery), plus its auth, runner and frontend fixes. Conflicts in the test login helper, the regulatory impacts read and the qualification inventory took Codex's side; the inventory was regenerated.

**Codex review findings acted on** (`handoffs/codex/round8-feature-review.md`, `round8-proposed-feature-decisions.md`):
- Finding 1: pending canary retirement. Codex's 0086 was verified before and after. Before it, the suite failed on the database check (23514) after 7 assertions with 2 failures; after it, 14/14.
- Findings 2 and 3 (canary after a grant; real-person decoys) and finding 4 (criteria evidence before approval) went to the owner. The decisions are recorded in `docs/engineering/V1_BASELINE_REV_1_10_CANARY_AND_CRITERIA_REVIEW.md` and built:
  - **A:** migration 0088. An active decoy is never admitted for marketing.
  - **Real decoys:** migration 0089. A message to a real-person decoy is WITHHELD and the database refuses any delivery attempt.
  - **C:** vendor migration 0017 and vendor contract 0.6.0. Evidence is shown, and approval names the digest reviewed, a review reference and the open items acknowledged. Recorded criteria content is now immutable.
- Finding 5: restore after ledger purge. Migration 0090. Treated as a defect: an older restore is recorded INCOMPLETE and stays in attention until a manual review is recorded.

**Defects found by battery 21 and fixed:**
- Regulatory impact analysis listed at most 50 records per kind, unordered. With 80 open breaches, the run's breach was silently missing. It now itemises up to 1000 in a stable order; beyond that, one UNRESOLVED item.
- The restore coverage review read the restore `FOR UPDATE`. Forced row security hides that row from a role with no UPDATE policy, so every review returned 404. Found by pass 6 and fixed.
- Operations attention listed systems needing re-erasure in system-id order under a 50-item limit. They are now listed newest restore first.

| Command | Exit | Result |
|---|---|---|
| Battery 21 (every integration, security and browser suite after the round 8 merge, serially; resumed once after the 2-hour limit) | — | 110 passed, 1 failed (regulatory, fixed below); TLS and network-core NOT_RUN |
| `pnpm run -s contracts:check`, `npx tsc --noEmit`, `lint`, `tracking:check`, `qualification-inventory --check`, `v1-source-inventory --check` | 0 | PASS (contract 0.55.0, 492 route examples) |
| `pnpm test` | 0 | 392 passed, 0 failed |
| `pnpm run -s db:migrate` (0088–0090) and `vendor:init confirm:vendor-a00` (vendor 0017) | 0 | applied |
| Pass 6: 20 targeted suites after the merge (canary ×3, real-principals, backup-obligations, regulatory, delivery, send, withdrawal-timing, audit-practice, notifications, vendor-audit, audit-mandate, dpdpa-audit, runner; browser: vendor production criteria, backups and recovery, audit mandate, expansion screens) | 0 each, after fixes | canary-grant-admission 36/0, real-principals 33/0, backup-obligations 39/0, regulatory 32/0, audit-practice 128/128, production-criteria browser 15/0 |
| Rerun after the attention ordering change: backups-and-recovery and operations-screens browser journeys | 0 | 12/0, 30/0 |

The first pass-6 run had five failures. Three were test faults: the canary lock probe omitted `retired_at`; the backup suite double-counted marks; the vendor recorder is refused at authorisation (403), not 409. The two vendor browser journeys failed because the long-lived vendor database lacked 0017, which `vendor:init` applies. One was the product defect above (the restore review 404).

**Not run in this round:** the full battery on the final head after pass 6. Pass 6 covers every suite the changes touch.

**Open owner choice:** how long the erasure ledger is kept (today 30 days after a system's backups age out).

## Round 3 (2026-10-02): Codex round 8 publication and its review of revision 1.10

**Merged:** `codex/round8` through `7edd2b4`, in merge `38e99ef`. It adds bounded relay shutdown (`infrastructure/loopback.mjs`), vendor policy failure diagnostics, a vendor browser readiness wait, and review evidence. Codex's own round 8 freeze excludes revision 1.10 by the owner's choice; its reviews of 1.10 are in `handoffs/codex/round8-upstream-rev110-*.md`.

**Codex review findings fixed (`3ada889`):**
- **Real-decoy designation between claim and transmission.** The runner now re-checks just before transmitting (`withholdBeforeSend`). The guarantee is stated precisely in the addendum.
- **0090 upgrade boundary.** Migration 0091 records a conservative BEFORE_UPGRADE boundary for systems whose backup treatment predates the upgrade by more than 30 days. The recording function is server-only.

| Command | Exit | Result |
|---|---|---|
| contracts, lint, tracking, inventory | 0 | PASS |
| `pnpm test` | 0 | 395 passed, 0 failed |
| Pass 7 (11 suites: real-principals, backup-obligations, delivery, notifications, runner, canaries, canary-grant-admission, migration-upgrade, audit-practice; browser: vendor production criteria, backups and recovery) | 0 each | real-principals 37/0 (claim then designate: withheld), backup-obligations 44/0 (upgrade boundary), migration-upgrade 10/0, audit-practice 128/128 |

The first backup-obligations run in pass 7 timed out because the Docker daemon died mid-run. After restarting it, the suite passed 44/0. Pass 7's summary lists source `38e99ef` because the run started before the fix commit; the files it tested are those committed in `3ada889`.

Migration numbers now taken: customer up to **0091**, vendor up to 0017. Codex's next numbers are 0092, vendor 0018 and contract 0.56.0.

## Next integration action

1. Review and merge Codex round 8 (`codex/round8`) when it is pushed.
2. Do whatever it left of the timestamp work.
3. Run the full regression battery again on the final candidate (battery 20 already passed on `9979c75`). Collect `tests/security/*.ts`, not only `*.test.ts`.
4. Regenerate the matrix.
5. Update PR #37.
6. Ask the owner to approve the merge into main. Nobody merges without that approval.
