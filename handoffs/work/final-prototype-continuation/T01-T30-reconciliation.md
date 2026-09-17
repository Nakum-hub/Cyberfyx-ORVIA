# T01–T30 reconciliation against the frozen final candidate

**Candidate:** `81431d64afb8dd613c96d942402d8c0d8cc07ac0` · tree
`e949d8c43c0dfffcea2e332eb7baa7eb2a052f0524709e6d533dcd566304e437` · manifest SHA-256
`95f5acbe94eecc1ef8296779b6ce3c1116c067753fd2e5bd199d6e340d24e026` · contract 0.5.0 / signed command 0.3.0
· profile `rehearsal` · fixture `aster-birch-v1` · host build `mtRrfhGjl22jabwoImHIf` · container build
`aMloAQd7rLFKm0GE_Sge1` · runtime image `sha256:48c3b41e…` · Playwright 1.63.0.

## How status was decided

`scripts/tracking.ts` only allows a canonical test to be promoted to `PASS` when at least one evidence file
is an **`APPLICATION_ACCEPTANCE` record with `coverage: "FULL_SCENARIO"`**, `result: PASS`, `exit_code: 0`,
the matching `test_ids`, a 40-hex `source_commit`, contract/fixture/profile, ordered UTC start/end, a
non-empty all-PASS assertion list, existing `artifact_paths` and a `limitations` array.
`docs/reviews/work/FINAL_GATE_REPORT.md` line 102 states that label may be used "only when the entire
canonical expected behavior actually ran".

**No such record was produced in this session, and none is hand-authored here.** Every suite executed
below is component-scoped, and each artifact says so in its own `limitations` field — for example
`A07-service-integration-…` records *"T01/T28 bootstrap subset only"*, `A07-consent-integration-…` records
*"Browser acceptance remains Claude Code owned"*, and `A07-workflow-integration-…` records *"No browser
acceptance claim"*. Transcribing a component artifact into a `FULL_SCENARIO` record would manufacture the
exact claim the validator and the brief forbid.

Therefore **T01–T30 remain `NOT_RUN` in `tracking/acceptance.json`**, with their `evidence` arrays updated
to point at the actual candidate evidence. The column below states what each test has and what it still
needs. The two human-run/supervised rehearsals are the designed producer of the missing full-scenario
records.

Legend: **COMPONENT_PASS** = every component suite that covers this scenario passed at this exact
candidate; **PARTIAL** = some named element of the canonical expectation was not exercised at this
candidate; **NOT_RUN** = no candidate evidence.

## Evidence sources at this candidate

| # | Suite / command | Recorder evidence | Artifact | Result |
|---|---|---|---|---|
| E1 | `tsx tests/integration/bootstrap.test.ts` | `handoffs/codex/browser/B06-exec-2026-09-17T12-49-54.324Z` | `A07-service-integration-1789649409037-…` | PASS, exit 0, 4 assertions |
| E2 | `tsx tests/security/auth.test.ts` | `B06-exec-2026-09-17T11-48-52.399Z` | `A07-auth-security-1789645754389-…` | PASS, exit 0, 87 assertions |
| E3 | `tsx tests/integration/consent/consent.test.ts` | `B06-exec-2026-09-17T11-50-49.858Z` | `A07-consent-integration-1789645869949-…` | PASS, exit 0, 50 assertions |
| E4 | `tsx tests/integration/consent/expiry.test.ts` | `B06-exec-2026-09-17T11-52-38.674Z` | `A07-expiry-integration-1789646017958-…` | PASS, exit 0, 87 assertions (15 real lock-wait expiry controls) |
| E5 | `tsx tests/integration/workflows/workflow.test.ts` | `B06-exec-2026-09-17T11-55-06.951Z` | `A07-workflow-integration-1789646136254-…` | PASS, exit 0, 32 assertions |
| E6 | `tsx tests/integration/enforcement/send.test.ts` | `B06-exec-2026-09-17T11-57-02.765Z` | `A07-send-enforcement-1789646240320-…` | PASS, exit 0, 46 assertions |
| E7 | `tsx tests/integration/evidence/evidence.test.ts` | `B06-exec-2026-09-17T11-45-47.355Z` | `A07-evidence-integration-1789645594362-…` | PASS, exit 0, 69 assertions |
| E8 | `tsx tests/integration/regression/regression.test.ts` | `B06-exec-2026-09-17T11-58-46.926Z` | `A07-regression-integration-1789646604777-…` | PASS, exit 0, 70 assertions |
| E9 | `tsx tests/integration/lifecycle.test.ts` | `B06-exec-2026-09-17T12-05-05.401Z` | `A07-lifecycle-integration-1789646736637-…` | PASS, exit 0, 17 assertions |
| E10 | `tsx tests/security/tls.test.ts` | `B06-exec-2026-09-17T12-06-43.711Z` | `A07-tls-integration-1789646809053-…` | PASS, exit 0, 12 assertions |
| E11 | `tsx scripts/network-qualification.ts confirm:rehearsal` | `B06-exec-2026-09-17T12-50-28.741Z` | `A07-network-qualification-1789649464712-…` | PASS, exit 0, 13 assertions |
| E12 | `playwright test --config tests/e2e/playwright.config.ts` | `B06-exec-2026-09-17T12-36-13.063Z` | `handoffs/codex/browser/B06-playwright-2026-09-17T12-36-17.847Z/results.json` | PASS, exit 0, **16/16**, at candidate commit and tree |
| E13 | `node scripts/local-hygiene.mjs` | `B06-hygiene-check-2026-09-17T12-31-16.527Z` | — | PASS, exit 0, 1659 files, 33 bundle files, 81 credential values, 0 findings |
| E14 | `tsx tests/e2e/package.ts confirm:rehearsal` | `B06-exec-2026-09-17T12-52-22.742Z` | `artifacts/release-manifest.json` | PASS, browser gate `PASS_ENGINEERING` |
| E15 | `python handoffs/work/final-prototype-continuation/verify-candidate.py` | — | `candidate-verification.json` | PASS, **242 checks, 0 failed** |

E1–E11 executed at source tree `ae48b3249891…` as recorded by `tests/e2e/record.mjs`, which is the
**identical file content** later committed as candidate `81431d64`; the post-commit build at 12:32 records
the same tree hash. The recorded commit label on those runs is the parent `b909be89`. E12, E14 and E15 were
executed after the commit and record candidate commit `81431d64` directly. This distinction is stated
rather than smoothed over.

## Per-scenario reconciliation

| T | Title | Candidate evidence | Determination | Exactly what is still missing |
|---|---|---|---|---|
| T01 | Clean local start | E1 (`drizzle-write-postgres-read`, `real-temporal-worker-execution`, `persisted-after-service-restart`), E9 (two full supervised start/stop cycles, healthy HTTPS, business state retained) | **PARTIAL** | A start from a **fresh isolated profile** with the documented prerequisites. E1/E9 ran against the existing retained rehearsal installation, and E1's own limitation says "T01/T28 bootstrap subset only". R1/R2 start-from-documented-state covers this. |
| T02 | Protected bootstrap and authentication | E2 (real password sign-in, MFA challenge, wrong password/unknown identity denial, enumeration resistance, revocation, logout), E10, E12 `auth.spec.ts` 3/3 | **PARTIAL** | Creation of the organisation and unique local owner was **not re-executed** at this candidate; the existing installation was reused. Everything else in the canonical expectation ran. |
| T03 | Tenant and environment isolation | E2 (`unscoped SQL cannot cross tenant`, `unscoped SQL cannot cross sibling environment`, `principal RLS exposes only own reference`, `protected tables force RLS and are not app-owned`, `tenant-aware foreign key rejects sibling parent`, `application role has no privileged bypass`) | **COMPONENT_PASS** | Canonical `APPLICATION_ACCEPTANCE` record. Background-job scope is covered by E5/E7 rather than by one scenario run. |
| T04 | Principal and staff separation | E2 (`staff cookie cannot authenticate principal mount`, `ambiguous dual-domain session denied`, `staff denied by own-principal authority guard`, `staff auth cannot read principal store`), E10 (`principal cannot read staff overview`, `staff cannot read principal consent`), E12 `consent.spec.ts` + `auth.spec.ts` in separate browser contexts | **COMPONENT_PASS** | Canonical record. |
| T05 | Least privilege and approval | E2, E10, E12 `configuration.spec.ts` (distinct reviewer publication persists), E4 (`publication: fresh proof consumed before expiry with one approval and idempotency`) | **COMPONENT_PASS** | Canonical record. |
| T06 | Persisted configuration and relationships | E3 (`restart preserves exact published configuration`, `restart preserves exact notice content`, `database rejects published version rewriting`), E12 `configuration.spec.ts` | **COMPONENT_PASS** | Canonical record. |
| T07 | Grant and own receipt | E3, E12 `consent.spec.ts` (`principal consent, immutable receipt, withdrawal, history and refresh`) | **COMPONENT_PASS** | Canonical record. |
| T08 | Atomic withdrawal acceptance | E3, E4 (all four wait modes leave aggregate/interaction/event/receipt/workflow/outbox/idempotency unchanged), E12 `consent.spec.ts` | **COMPONENT_PASS** | Canonical record. |
| T09 | Idempotency and concurrent epochs | E3, E4 (87 assertions, 15 lock-wait controls), E7 (`concurrent current-version attestations accept exactly one`) | **COMPONENT_PASS** | Canonical record. **Historical finding W01-A02-F01 is closed here** — see `W01-consolidated-review.md`. |
| T10 | Replay and fresh re-consent safety | E3 (`fresh reconsent requires fresh authorized interaction`, `old receipt remains unchanged after new consent`), E4, E5 (`stale withdrawal cannot act after fresh consent`, `fresh grant does not silently reactivate target`), E7 (`old manual attestation is not current after fresh consent`), E12 `consent.spec.ts` lost-response and stale-interaction cases | **COMPONENT_PASS** | Canonical record. |
| T11 | Outbox and worker recovery | E5, E9 (supervised restart preserves business state), E8 (`interrupted run remains durable`, `interrupted run becomes explicit ERROR`, `interruption creates no success fallback`) | **COMPONENT_PASS** | Canonical record. Host-crash recovery is explicitly **not** claimed (E9 limitation). |
| T12 | Restricted signed commands | E5 (`agent rejects tampered scope before effect`, `same command ID with changed signed body rejected`, `expired new command rejected`, `nonce replay with another command ID rolls back`, `all rejected commands preserve last target mutation`) | **COMPONENT_PASS** | Canonical record. |
| T13 | Actual CRM mutation and readback | E5, E7, E12 `workflow.spec.ts` (`B03 real target effect, independent read, workflow persistence and evidence export`) | **COMPONENT_PASS** | Canonical record. |
| T14 | Current send-admission enforcement | E6, E8 (`current_boundary_blocks_withdrawal`, `no_post_withdrawal_send`) | **COMPONENT_PASS** | Canonical record. |
| T15 | Independent service purpose | E6 | **COMPONENT_PASS** | Canonical record. |
| T16 | Degraded policy safety | E6 (missing / malformed / outage OPA all INDETERMINATE with no send; recovery still blocks withdrawal) | **COMPONENT_PASS** | Canonical record. |
| T17 | Applied but response lost | E7, E12 `workflow.spec.ts` (`B03 applied response lost, read reconciliation and visible manual obligation`), E12 `consent.spec.ts` (`lost committed response retains exact request across read and replays one event`) | **COMPONENT_PASS** | Canonical record. |
| T18 | Acknowledgement without effect | E7 (`reconciliation never invents recovered ACK`), E12 `workflow.spec.ts` (`B03 acknowledgement without effect remains unresolved and never verified`) | **COMPONENT_PASS** | Canonical record. |
| T19 | Known failure and bounded retry | E7, E12 `candidate.spec.ts` (`B06 real dependency outage, malformed ID, denied scope and responsive navigation`) | **COMPONENT_PASS** | Canonical record. |
| T20 | Manual and missing capability | E7 (14 manual-attestation assertions incl. authoritative stored version, exactly-one concurrent accept, identical/conflicting replay, stale denial, single revision increment, attribution, no automated observation, cannot satisfy independent-read), E12 `workflow.spec.ts` (`B03 manual task uses its read version, preserves replay and rejects a stale tab`) | **COMPONENT_PASS** | Canonical record. **FINAL-B06-F02 closed here.** |
| T21 | Truthful evidence and dashboard | E7 (`overview workflow counts come from scoped persisted rows`, `overview exposes unknown and manual axes`, `failure projection includes unmet observation`, `filtered failure pagination does not duplicate obligations`) | **COMPONENT_PASS** | Canonical record. |
| T22 | Local export protection | E7 (`auditor local export allowed`, `export is attachment with no-store`, `export integrity digest matches actual document`, `export retains unresolved coverage`, `foreign tenant cannot export`, `principal cannot export`, `member has no export capability`, `export action persisted in audit`) | **COMPONENT_PASS** | Canonical record. |
| T23 | Healthy regression run | E8 (runs `cb9e07b8…`, `4840d1fe…` → PASS), E12 `test-lab.spec.ts` | **COMPONENT_PASS** | Canonical record. |
| T24 | Broken fixture detection and repair | E8 (run `7f48cebe…` stored **FAIL** with `expected_fault_detection: true`, synthetic send count 1, `expected fault flag does not turn FAIL into PASS`, `terminal outcome cannot be rewritten`), E12 `test-lab.spec.ts` | **COMPONENT_PASS** | Canonical record. The FAIL is preserved as a FAIL; it is the detection that passes. |
| T25 | Quarantined target restore | E8 (run `59335f6a…` → PASS with quarantine-first, premature-activation denial, stale-generation denial, reconciled activation, unchanged consent ledger, recovery journal), E12 `test-lab.spec.ts` | **COMPONENT_PASS** | Canonical record. Target-only recovery; no control-plane disaster recovery is claimed. |
| T26 | No runtime vendor/model egress | E11 at this exact candidate: image label matches candidate source tree, internal-only network, no published host ports, blocked-egress backend core succeeds, canary never reached, deny-all DNS observed only the controlled query | **COMPONENT_PASS** | Canonical record. Host-wide and browser egress remain explicitly unqualified. |
| T27 | Input/session and secret hygiene | E2 (`role field cannot grant authority`, `machine bearer cannot become human`, `HttpOnly and strict SameSite cookies`, `application cannot read auth credentials`, `revoked cookie rejected`), E13 (0 findings over 1659 files / 81 generated credential values) | **COMPONENT_PASS** | Canonical record. E13 is pattern and exact-value scope only, not a comprehensive security scan. |
| T28 | Reset and fault isolation | E1 (`invalid-reset-denied-probe-preserved`: wrong confirmation and unknown profile both rejected, marker preserved), E9 (business-schema reset refused, state retained across supervised restarts) | **PARTIAL** | The `codex-a00`-scoped `tests/security/fixture-isolation.ts` is **NOT_RUN** here: it is pinned to a different profile (`Only the named Codex fixture profile is permitted`, retained FAIL `B06-exec-2026-09-17T12-07-55.927Z`). Cross-profile isolation at this candidate is therefore not re-established. |
| T29 | Integrated browser flow and error states | E12 — **16/16 PASS at the exact candidate commit and tree**, all seven mandatory suites, Chromium over normal trusted HTTPS with no bypass; per-context network records assert no request leaves the application origin | **COMPONENT_PASS** | Canonical record. This is the strongest single piece of candidate evidence. |
| T30 | Frozen-candidate repeatability and claims | E14 (candidate frozen, browser gate `PASS_ENGINEERING`), E15 (242/242 independent integrity checks) | **PARTIAL** | Repeatability across **two independent human rehearsals** (R1, R2) and the C02 claim alignment plus W03 recommendation. By definition this test cannot close before those. |

## Summary

- **25 of 30** scenarios have every covering component suite passing at this exact candidate
  (COMPONENT_PASS).
- **5** are PARTIAL with a named, specific gap: **T01** (fresh-profile start), **T02** (organisation/owner
  creation not re-executed), **T28** (cross-profile isolation suite is `codex-a00`-pinned), **T30**
  (rehearsals + W03 + C02).
- **0** are FAIL or ERROR.
- **0** are `PASS` in `tracking/acceptance.json`, because no `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO`
  record exists. Producing those records is what Rehearsal 1 and Rehearsal 2 are for, and the human runs or
  supervises them.

## Optional scenarios

T31–T34 (P1, A08/B05) remain **NOT_RUN and unpromoted**. A08 and B05 are not implemented in this
prototype and no promotion has been requested.
