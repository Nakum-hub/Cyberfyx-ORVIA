# Round 8 command evidence review

Source/artifact review only. Reviewer performed no runtime/test execution. Snapshot ledger ends with auth-diagnostics-before-control at 2026-10-01T13:39:40.929Z: 124 recorded commands, 92 exit0, 29 exit1, two exit2, one Windows exit4294967295. Those historical commands span multiple HEADs/builds and cannot be summed into current acceptance. Agent proposals/source reviews marked NOT_RUN are not executed evidence; root's actual command log is separate. HEAD alone also does not identify uncommitted source changes; current post-freeze diagnostics/fixes require a new reviewed frozen source/build.

Frozen-alpha full40 actual execution is complete at HEAD261af33271aec3635b9415e38e7104be5281da71 / build fNbDrvmLMhoCFiUKQTohf: 34 exit0, six exit1; enclosing command exit1. Failed exact suites are catalog-flow, withdrawal-timing, evidence, grc/http, applicability and regression, as linked in round8-integration-review.md. No full final browser matrix acceptance is established: the newly patched fresh15-suite matrix remains NOT_RUN in this snapshot. Older individual browser attempts/continuations are not a substitute.

## Outer success versus inner evidence

- runtime-custody-factory-differential exit0: before refused custody with zero children; three after innocuous marker children exit0 through extracted actual factory. Actual worker_started false. This establishes wiring/key-stripping control, not real worker/database/runtime acceptance.
- progress-baseline-differential exit0 is deliberately successful observation of the old bug: manual-only and unchanged UNKNOWN cases each ran50 calls/transactions. Its exit0 is not a healthy executor result. Proposal exit0 shows1/1 for those seams,2/2 for verification progress and legitimate multi-batch work; connector/SQL/RLS remain untested by this fixture.
- auth-diagnostics-before-control exit1 is expected regression detection: actual Drizzle wrapper under old observer lacks bounded causes; expected Error/UNCLASSIFIED then error/57014, actual undefined. Root's after controls exit0 establish diagnostic/redaction/handler-stage synthetic controls, not the original applicability cause.
- real-worker-channel-timing-after outer exit0 contains inner child exit0 following requested stop, two passes, qualification_result false; timing observation is diagnostic and does not replace withdrawal-timing suite assertions.
- passive metadata/catalog diagnostics exit0 prove their own bounded reads, not product acceptance. The first postgres sampler exit1 is retained and later resolved sampler exit0 does not erase it.
- progress-fix-typecheck exit2 is ordinary unresolved failure at this snapshot: tests/integration/consent/canary-grant-admission.test.ts:7 cannot resolve zod. The earlier final-candidate typecheck0 does not cover this later source. Fix and rerun pending.

## Additional affected integrations beyond failed-six

Direct operationsRunner consumers require requalification after execution-progress semantics changed, without duplicating the six failed suites:

- tests/integration/operations/backup-obligations.test.ts
- tests/integration/expansion/grc-lifecycle.test.ts
- tests/integration/expansion/delivery.test.ts
- tests/integration/operations/withdrawal-single-pass.test.ts
- tests/integration/operations/consent-withdrawal.test.ts
- tests/integration/operations/runner.test.ts
- tests/integration/operations/organisation-intake.test.ts

Runtime environment/custody source consumers also require tests/integration/workflows/workflow.test.ts (owned real worker/agent children) and tests/integration/lifecycle.test.ts (scripts/app-run.ts supervised child). The lifecycle suite uses rehearsal profile and needs separately verified ownership/dependencies; do not run it against codex-a00 by silently rewriting its profile. Worker/workflow needs Temporal/target prerequisites. Other HTTP suites transitively use customerEnvironment via HttpFixture; full40 rerun on the new frozen candidate is the conservative coverage option for this shared auth/runtime change. Vendor signing fixtures must still reach test harnesses and be stripped from customer children. Newly added canary-grant-admission.test.ts also requires its own qualification, separately from fixed typing.

All commands below were recorded by root, not executed by this reviewer. Actual per-command exit and source/build provenance remain available in the authoritative JSONL; table is a compact exact inventory of its snapshot, not reclassification into PASS.

## Command inventory

| Log basename | Exit | HEAD prefix | BUILD_ID at end |
|---|---:|---|---|
| R8-readiness-fix-typecheck.log | 0 | 0432f3a4 | rP9raJGJJUAutoRZqUBZz |
| R8-readiness-candidate-typecheck.log | 0 | 0432f3a4 | rP9raJGJJUAutoRZqUBZz |
| R8-readiness-candidate-lint.log | 0 | 0432f3a4 | rP9raJGJJUAutoRZqUBZz |
| R8-readiness-candidate-unit.log | 0 | 0432f3a4 | rP9raJGJJUAutoRZqUBZz |
| R8-readiness-inventory-generate.log | 0 | 0432f3a4 | rP9raJGJJUAutoRZqUBZz |
| R8-readiness-inventory-check.log | 0 | 0432f3a4 | rP9raJGJJUAutoRZqUBZz |
| R8-readiness-candidate-build.log | 0 | d532fbff | cU4wqE8KbqItRh07BF3p7 |
| R8-readiness-fix-webkit-operations.log | 1 | 04565765 | cU4wqE8KbqItRh07BF3p7 |
| R8-readiness-runtime-database.log | 0 | 04565765 | cU4wqE8KbqItRh07BF3p7 |
| R8-ready-runtime-webkit-operations.log | 1 | 04565765 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-idle-probe.log | 0 | 04565765 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-runtime-readiness.log | 0 | 04565765 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-baseline-chromium.log | 1 | 04565765 | cU4wqE8KbqItRh07BF3p7 |
| R8-worker-fixture-renewal.log | 0 | 04565765 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-renewed-runtime-readiness.log | 0 | 164cab81 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-renewed-chromium.log | 1 | 164cab81 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-scoped-assertion-typecheck.log | 1 | 164cab81 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-assertion-inventory-generate.log | 0 | 164cab81 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-assertion-inventory-check.log | 0 | 164cab81 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-scoped-assertion-typecheck-pinned.log | 0 | 164cab81 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-scoped-runtime-readiness.log | 0 | c063f7f4 | cU4wqE8KbqItRh07BF3p7 |
| R8-audit-scoped-chromium.log | 0 | c063f7f4 | cU4wqE8KbqItRh07BF3p7 |
| R8-operations-measured-runtime-readiness.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-operations-measured-webkit.log | 1 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-crawl-webkit-runtime-readiness.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-crawl-measured-webkit.log | 4294967295 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-minimal-control-runtime-readiness.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-minimal-control-webkit-operations.log | 1 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-detail-readiness-typecheck.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-detail-readiness-inventory-check.log | 1 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-detail-readiness-inventory-generate.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-detail-readiness-inventory-recheck.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-gate-real-control.log | 1 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-gate-execution-fault-before.log | 1 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-gate-real-control-ready.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-gate-execution-fault-before-ready.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-gate-real-after.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-gate-execution-fault-after.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-fix-lint.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-fix-unit.log | 1 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-fix-inventory-generate.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-fix-inventory-check.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-policy-fix-unit-pinned.log | 0 | 8cf9c5f6 | cU4wqE8KbqItRh07BF3p7 |
| R8-merge-contract-fiftyfour-inventory-generate.log | 0 | e8cf1cdd | cU4wqE8KbqItRh07BF3p7 |
| R8-merge-contract-fiftyfour-inventory-check.log | 0 | e8cf1cdd | cU4wqE8KbqItRh07BF3p7 |
| R8-merged-fiftyfour-contract-check.log | 0 | b24b3fb2 | cU4wqE8KbqItRh07BF3p7 |
| R8-merged-fiftyfour-typecheck.log | 0 | b24b3fb2 | cU4wqE8KbqItRh07BF3p7 |
| R8-merged-fiftyfour-build.log | 1 | b24b3fb2 | cU4wqE8KbqItRh07BF3p7 |
| R8-merged-fiftyfour-migrations.log | 0 | b24b3fb2 |  |
| R8-merged-fiftyfour-build-pinned.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-merged-auth-init.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-merged-machine-init.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-merged-owner-recovery.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-audit-collection-typecheck.log | 2 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-database-security-after-init.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-merged-real-principals.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-audit-collection-typecheck-corrected.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-collection-pages-unit.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-staff-chronology-migration.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-pagination-before.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-pagination-before-complete.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-pagination-after.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-composite-pagination-before.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-composite-pagination-after.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-staff-chronology-typecheck.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-timestamp-guard-checks.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-allpages-typecheck.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-allpages-lint.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-allpages-unit.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-before.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-after.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-unit.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-unit-diagnostic.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-unit-dacl.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-unit-preserved-owner.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-unit-access-control.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-after-final.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-inventory-generate.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-inventory-exact-check.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-source-typecheck.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-source-lint.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-source-lint-cause.log | 1 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-targeted-lint.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-key-custody-unit-final.log | 0 | b24b3fb2 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-merged-latest-inventory-generate.log | 0 | f4c3dcd5 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-merged-latest-inventory-check.log | 0 | f4c3dcd5 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-latest-merge-format-inventory.log | 0 | f4c3dcd5 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-queue-cancellation-before.log | 1 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-queue-cancellation-after.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-delayed-read-cancellation-before.log | 1 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-delayed-read-cancellation-after.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-canary-retirement-before.log | 1 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-pending-canary-retirement-migration.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-chronology-filtered-anchor-checks.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-composite-adverse-before-v2.log | 1 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-composite-adverse-after-v2.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-canary-retirement-after.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-candidate-inventory-generate.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-candidate-lint.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-candidate-unit.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-candidate-contracts.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-candidate-inventory-check.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-candidate-typecheck.log | 0 | 16f45ef7 | c_cHc9tCyxMg9yROlxqQ7 |
| R8-final-frozen-build.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-final-policy-gate-control.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-final-migration-rerun.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-final-auth-init-rerun.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-final-machine-init-rerun.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-final-database-security-after-reruns.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-delivery-passive-postgres-metadata.log | 1 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-delivery-passive-postgres-metadata-resolved.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-passive-audit-channel-metadata.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-passive-catalog-metadata.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-frozen-integrations-alpha.log | 1 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-real-worker-channel-timing-before.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-runtime-custody-factory-differential.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-run-progress-readonly-before.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-progress-baseline-differential.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-progress-proposal-differential.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-auth-diagnostics-controls.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-progress-fix-lint.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-real-worker-channel-timing-after.log | 0 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-progress-fix-typecheck.log | 2 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
| R8-auth-diagnostics-before-control.log | 1 | 261af332 | fNbDrvmLMhoCFiUKQTohf |
