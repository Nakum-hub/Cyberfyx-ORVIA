# Handoff — V1-VERIFY-2026-10-01 — Claude Code — `57f0f53` (plus this handoff commit)

**Base commit:** `a29436c`, the head when battery 19 started.
**New commits:** on `claude/upbeat-newton-w4h53x`, through `57f0f53` and this handoff. The merge of the feature worktree, including Codex round 7 (`4738d9a`), is `aeb1c75`.
**Source master / hash verified:** revision 1.4. SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`. Addenda 1.5–1.9 apply.
**Contract version:** 0.54.0.
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

## Next integration action

1. Review and merge Codex round 8 (`codex/round8`) when it is pushed.
2. Do whatever it left of the timestamp work.
3. Run the full regression battery on the final candidate. Collect `tests/security/*.ts`, not only `*.test.ts`.
4. Regenerate the matrix.
5. Update PR #37.
6. Ask the owner to approve the merge into main. Nobody merges without that approval.
