# Frozen-zeta 44 integration review

Root candidate 73604a82cd4c5232195a8abb413d10a109a2888b is frozen for qualification; reviewer execution/runtime NOT_RUN. Fresh R8-final-zeta-build.log completed with exit 0 at 16:39:50.483Z, BUILD_ID vzgLu-rqkbBIo0_ydAkCF, not old rk9. Source/master unchanged during qualification per root custody; no final acceptance inferred. Root began postinit then full 44; completed-row review awaits meaningful checkpoint.

Latest precommit zeta static gates exited 0 include typecheck/lint/contracts/exactinventory and 371 unit tests PASS/0 FAIL/0 skipped/0 cancelled. Their ledger HEAD fd987 represents then-working-tree source subsequently committed 73604. Current checkpoint: 44 completed suites: 43 PASS with exit 0 and one FAIL with exit 1; all signals null. Artifacts contain 1,597 passing outer assertions and no recorded failing assertion row, plus one ordinary timeout exception in suite 44. Every completed row records source 73604a82cd4c5232195a8abb413d10a109a2888b and build vzgLu-rqkbBIo0_ydAkCF. Workflow suite 44 failed at its command-row wait after nine passing assertions. Parent aggregate exit and final cleanup remain unestablished at this review checkpoint. Fresh read-only HEAD/build inspection agrees and tracked application/test/inventory diff is empty. Required full 15 and feature 6 product browser qualification remains separate; source-review push does not assert acceptance. Root postinit/server-only/RLS/ACL/schema checks retain independent artifacts.

Do not import epsilon acceptance: epsilon 44 was 41 PASS / 3 FAIL, outer exit 1. Historical failures organisation-intake MFA 429, processors primary 429 and vendor member undefined remain retained independently even after source fixes. Separate canonical 0087 recovery AFTER 31/31 and isolated 25 guards are bounded executed controls, not final 44 results. See round8-frozen-epsilon-integration-review.md and round8-zeta-stage-and-handoff-draft.md for exact history/provenance.

Update at meaningful root-notified checkpoints, reading completed ledger rows and linked artifacts once. Preserve per-suite status/exit, actual business assertions, setup/custody diagnostics and nested expected-defect controls separately. No ordinary failure may be relabelled PASS because a proposal/static/diagnostic control succeeded.

## Completed per-suite actual assertions

| Order | Suite | PASS / FAIL | Exit |
|---:|---|---:|---:|
| 1 | tests/integration/operations/backup-obligations.test.ts | 22 / 0 | 0 |
| 2 | tests/integration/expansion/policy-discovery.test.ts | 30 / 0 | 0 |
| 3 | tests/integration/operations/notice-language-drift.test.ts | 20 / 0 | 0 |
| 4 | tests/integration/consent/canaries.test.ts | 24 / 0 | 0 |
| 5 | tests/integration/consent/canary-retirement.test.ts | 14 / 0 | 0 |
| 6 | tests/integration/onboarding/owner-recovery.test.ts | 26 / 0 | 0 |
| 7 | tests/integration/onboarding/real-principals.test.ts | 25 / 0 | 0 |
| 8 | tests/integration/ai-governance/model-versions.test.ts | 21 / 0 | 0 |
| 9 | tests/integration/consent/canary-grant-admission.test.ts | 28 / 0 | 0 |
| 10 | tests/integration/consent/consent.test.ts | 50 / 0 | 0 |
| 11 | tests/integration/consent/expiry.test.ts | 87 / 0 | 0 |
| 12 | tests/integration/discovery/catalog-flow.test.ts | 58 / 0 | 0 |
| 13 | tests/integration/discovery/schema-drift.test.ts | 10 / 0 | 0 |
| 14 | tests/integration/enforcement/withdrawal-timing.test.ts | 12 / 0 | 0 |
| 15 | tests/integration/evidence/evidence.test.ts | 69 / 0 | 0 |
| 16 | tests/integration/expansion/audit-mandate.test.ts | 102 / 0 | 0 |
| 17 | tests/integration/expansion/classification.test.ts | 29 / 0 | 0 |
| 18 | tests/integration/expansion/cmp.test.ts | 45 / 0 | 0 |
| 19 | tests/integration/expansion/delivery.test.ts | 41 / 0 | 0 |
| 20 | tests/integration/expansion/grc-lifecycle.test.ts | 75 / 0 | 0 |
| 21 | tests/integration/expansion/impact.test.ts | 41 / 0 | 0 |
| 22 | tests/integration/expansion/preferences.test.ts | 45 / 0 | 0 |
| 23 | tests/integration/expansion/ropa-exports.test.ts | 58 / 0 | 0 |
| 24 | tests/integration/expansion/third-party.test.ts | 43 / 0 | 0 |
| 25 | tests/integration/grc/http.test.ts | 57 / 0 | 0 |
| 26 | tests/integration/monitoring/restore.test.ts | 33 / 0 | 0 |
| 27 | tests/integration/notices/languages.test.ts | 19 / 0 | 0 |
| 28 | tests/integration/onboarding/imports.test.ts | 31 / 0 | 0 |
| 29 | tests/integration/operations/applicability.test.ts | 18 / 0 | 0 |
| 30 | tests/integration/operations/consent-withdrawal.test.ts | 38 / 0 | 0 |
| 31 | tests/integration/operations/correction.test.ts | 12 / 0 | 0 |
| 32 | tests/integration/operations/notices.test.ts | 15 / 0 | 0 |
| 33 | tests/integration/operations/organisation-intake.test.ts | 44 / 0 | 0 |
| 34 | tests/integration/operations/processors.test.ts | 14 / 0 | 0 |
| 35 | tests/integration/operations/regulatory.test.ts | 32 / 0 | 0 |
| 36 | tests/integration/operations/rights.test.ts | 26 / 0 | 0 |
| 37 | tests/integration/operations/runner-progress.test.ts | 31 / 0 | 0 |
| 38 | tests/integration/operations/runner.test.ts | 10 / 0 | 0 |
| 39 | tests/integration/operations/withdrawal-single-pass.test.ts | 9 / 0 | 0 |
| 40 | tests/integration/regression/regression.test.ts | 90 / 0 | 0 |
| 41 | tests/integration/rights/portal.test.ts | 19 / 0 | 0 |
| 42 | tests/integration/vendor/audit-practice.test.ts | 112 / 0 | 0 |
| 43 | tests/integration/web.test.ts | 3 / 0 | 0 |

The [completed-suite ledger](artifacts/R8-frozen-zeta-integrations.jsonl) is authoritative for child exits, timestamps, source and build. Its 43rd row ended at 17:46:20.091Z. GRC uses its artifact `results` array; the HTTP bootstrap smoke uses three assertion strings and overall PASS. Vendor practice reports 112/112 in its actual suite log. These counts exclude setup/custody diagnostics and unit tests.

The regression suite additionally ran 34 nested protected-runner assertions: 33 PASS and one deliberately broken marketing-withdrawal control detected the expected failure (`expected_fault_detection: true`). That expected defect is separate from the 90 passing outer regression assertions and from ordinary suite failures; it does not change the ordinary completed-suite FAIL count of zero. Historical epsilon failures remain retained rather than reclassified by these passing zeta results.

Web suite 43 is HTTP bootstrap smoke, explicitly without authenticated API or browser acceptance. The full 15-case and feature 6-case browser matrices remain independently pending. No full 44-suite acceptance, final publication acceptance, or production qualification is asserted by this checkpoint.


| 44 | tests/integration/workflows/workflow.test.ts | 9 / 0 recorded; timeout exception | 1 |

Suite 44 ended at 17:49:07.964Z with the same frozen source/build. Its timeout is an ordinary suite failure even though its artifact contains only nine PASS rows. The earlier 43-suite checkpoint above is historical; final completed child status is 43 PASS / 1 FAIL. See [workflow failure source review](round8-zeta-workflow-failure-review.md). Full qualification has not passed.
