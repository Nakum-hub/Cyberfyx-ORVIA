# Frozen-iota final integration review

Final original battery has 44 recorded outcomes: 40 PASS / 4 FAIL. All rows bind source 3caf3b7cba1703e42018e6ba43af80ab4206287e and build O3vGd-z4HGBxaLp-Fdqh3. Actual wrapper exit 1 at04:10:53.140Z; post-battery metadata exit 0 at04:10:58.288Z. Final owned runtime shutdown is pending at this review checkpoint. Reviewer runtime execution NOT_RUN.

Four failures are distinct: GRC prerequisite refusal before child dispatch (null exit, business assertions NOT_RUN); runner38 synthetic login503 with correlated AUTH_LIBRARY_HANDLER/three UNCLASSIFIED cause entries (child1); regression40 child0/business90PASS but relay cleanup failure (status FAIL, separate later stopped-owned relay rm0 retained); vendor42 team-create503 before business checks (child1,0PASS/1FAIL). No underlying auth/vendor cause is established by these bounded diagnostics. Workflow44 genuinely completes32 assertions PASS, child0; earlier zeta startup failure remains historical.

Original failure outcomes are immutable. Strict sole-GRC supplementation/publication gate refuses because runner/vendor/cleanup failures are additional; planned GRC completion remains NOT_RUN. Main theta15PASS is original d7 evidence retained under exact two-file correspondence; fresh feature-iota6PASS binds3caf/O3. Neither makes this integration battery accepted. Historical alpha/delta/epsilon/zeta/eta results and cleanup/interruption artifacts remain separate.

## Actual per-suite assertions

| Order | Suite | Recorded assertions PASS / FAIL | Child exit / qualification status |
|---:|---|---:|---|
| 1 | tests/integration/operations/backup-obligations.test.ts | 22 / 0 | 0 / PASS |
| 2 | tests/integration/expansion/policy-discovery.test.ts | 30 / 0 | 0 / PASS |
| 3 | tests/integration/operations/notice-language-drift.test.ts | 20 / 0 | 0 / PASS |
| 4 | tests/integration/consent/canaries.test.ts | 24 / 0 | 0 / PASS |
| 5 | tests/integration/consent/canary-retirement.test.ts | 14 / 0 | 0 / PASS |
| 6 | tests/integration/onboarding/owner-recovery.test.ts | 26 / 0 | 0 / PASS |
| 7 | tests/integration/onboarding/real-principals.test.ts | 25 / 0 | 0 / PASS |
| 8 | tests/integration/ai-governance/model-versions.test.ts | 21 / 0 | 0 / PASS |
| 9 | tests/integration/consent/canary-grant-admission.test.ts | 28 / 0 | 0 / PASS |
| 10 | tests/integration/consent/consent.test.ts | 50 / 0 | 0 / PASS |
| 11 | tests/integration/consent/expiry.test.ts | 87 / 0 | 0 / PASS |
| 12 | tests/integration/discovery/catalog-flow.test.ts | 58 / 0 | 0 / PASS |
| 13 | tests/integration/discovery/schema-drift.test.ts | 10 / 0 | 0 / PASS |
| 14 | tests/integration/enforcement/withdrawal-timing.test.ts | 12 / 0 | 0 / PASS |
| 15 | tests/integration/evidence/evidence.test.ts | 69 / 0 | 0 / PASS |
| 16 | tests/integration/expansion/audit-mandate.test.ts | 102 / 0 | 0 / PASS |
| 17 | tests/integration/expansion/classification.test.ts | 29 / 0 | 0 / PASS |
| 18 | tests/integration/expansion/cmp.test.ts | 45 / 0 | 0 / PASS |
| 19 | tests/integration/expansion/delivery.test.ts | 41 / 0 | 0 / PASS |
| 20 | tests/integration/expansion/grc-lifecycle.test.ts | 75 / 0 | 0 / PASS |
| 21 | tests/integration/expansion/impact.test.ts | 41 / 0 | 0 / PASS |
| 22 | tests/integration/expansion/preferences.test.ts | 45 / 0 | 0 / PASS |
| 23 | tests/integration/expansion/ropa-exports.test.ts | 58 / 0 | 0 / PASS |
| 24 | tests/integration/expansion/third-party.test.ts | 43 / 0 | 0 / PASS |
| 25 | tests/integration/grc/http.test.ts | NOT_RUN | null / prerequisite FAIL |
| 26 | tests/integration/monitoring/restore.test.ts | 33 / 0 | 0 / PASS |
| 27 | tests/integration/notices/languages.test.ts | 19 / 0 | 0 / PASS |
| 28 | tests/integration/onboarding/imports.test.ts | 31 / 0 | 0 / PASS |
| 29 | tests/integration/operations/applicability.test.ts | 18 / 0 | 0 / PASS |
| 30 | tests/integration/operations/consent-withdrawal.test.ts | 38 / 0 | 0 / PASS |
| 31 | tests/integration/operations/correction.test.ts | 12 / 0 | 0 / PASS |
| 32 | tests/integration/operations/notices.test.ts | 15 / 0 | 0 / PASS |
| 33 | tests/integration/operations/organisation-intake.test.ts | 44 / 0 | 0 / PASS |
| 34 | tests/integration/operations/processors.test.ts | 14 / 0 | 0 / PASS |
| 35 | tests/integration/operations/regulatory.test.ts | 32 / 0 | 0 / PASS |
| 36 | tests/integration/operations/rights.test.ts | 26 / 0 | 0 / PASS |
| 37 | tests/integration/operations/runner-progress.test.ts | 31 / 0 | 0 / PASS |
| 38 | tests/integration/operations/runner.test.ts | 0 / 1 | 1 / FAIL |
| 39 | tests/integration/operations/withdrawal-single-pass.test.ts | 9 / 0 | 0 / PASS |
| 40 | tests/integration/regression/regression.test.ts | 90 / 0 | 0 / cleanup FAIL |
| 41 | tests/integration/rights/portal.test.ts | 19 / 0 | 0 / PASS |
| 42 | tests/integration/vendor/audit-practice.test.ts | 0 / 1 | 1 / FAIL |
| 43 | tests/integration/web.test.ts | 3 / 0 | 0 / PASS |
| 44 | tests/integration/workflows/workflow.test.ts | 32 / 0 | 0 / PASS |

Actual outer recorded assertions: 1441 PASS / 2 FAIL. Prerequisite GRC is NOT_RUN, not a fabricated failing business assertion. Nested protected regression fault-detection controls are counted separately.

Nested protected regression actual results are34 assertions:30 PASS/4 FAIL. All four FAIL rows belong to the one run recorded state FAIL and expected_fault_detection true: durable_workflow_completed, independent_read_restriction, independent_observation_method and no_post_withdrawal_send (actual synthetic send1 vs expected0). These are retained failing assertions inside the declared broken-control run; do not reuse older33PASS/1FAIL nested totals or describe four separately designed mutants. The outer regression artifact still records90PASS/0FAIL, while its suite cleanup status remains FAIL. Nested fault-control assertions are separate from1441PASS/2FAIL outer business totals.
