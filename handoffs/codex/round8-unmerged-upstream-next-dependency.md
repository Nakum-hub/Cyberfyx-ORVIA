# Unmerged upstream discovery — next dependency

User explicitly chose to finish current Round 8 handoff and not merge revision 1.10. Current qualified source remains 3caf3b7cba1703e42018e6ba43af80ab4206287e / build O3vGd-z4HGBxaLp-Fdqh3. Current initial Claude merge through a1215aca remains valid historical scope.

Read-only Git discovery: remote Claude advanced to 3d84e74cd8ba99ace877a0c6761462989ffc4893; merge base with current candidate is d7a10d6a1e707f0e1d57378e5d0f58c9b3c02503. It incorporates d7 worker source but not current3caf readiness commit. This includes revision 1.10, contract 0.55, customer migrations 0088–0090, vendor 0017 and changed canary/real-principal/restore/criteria behavior. It is UNMERGED UPSTREAM, not current-source acceptance and not an additional runtime gate for this handoff.

Exact diff versus d7 contains 515 paths total; excluding handoffs/output leaves 44, including AGENTS.md. The 43 remaining source/document paths are listed below. No merge, runtime, application, HEAD or acceptance change by reviewer. Any new feature/security preview is source-only and does not qualify upstream. This is Claude's next dependency after the current handoff, under the user's explicit choice.

- backend/api/src/operations-routes.ts
- backend/api/src/vendor/routes.ts
- backend/domain/src/delivery/delivery.ts
- backend/domain/src/operations/attention.ts
- backend/domain/src/registry/backups.ts
- backend/domain/src/regulatory/packages.ts
- backend/privacy-control/src/processing.ts
- backend/vendor/audit/practice.ts
- database/customer/migrations/0088_canary_marketing_hold.sql
- database/customer/migrations/0089_real_decoy_withheld.sql
- database/customer/migrations/0090_restore_ledger_coverage.sql
- database/customer/src/server-only.ts
- database/vendor/migrations/0017_criteria_evidence_review.sql
- docs/engineering/V1_BASELINE_REV_1_10_CANARY_AND_CRITERIA_REVIEW.md
- docs/engineering/V1_VERIFICATION_MATRIX.md
- frontend/src/app/vendor/practice/page.tsx
- frontend/src/components/screens/expansion/delivery.tsx
- frontend/src/components/screens/privacy-operations/backup-obligations.tsx
- infrastructure/compose.yaml
- shared/contracts/generated/client-types.d.ts
- shared/contracts/generated/contract-seed.proposed.json
- shared/contracts/generated/endpoint-types.ts
- shared/contracts/generated/examples.json
- shared/contracts/generated/interfaces.json
- shared/contracts/generated/manifest.json
- shared/contracts/generated/openapi.json
- shared/contracts/src/expansion.ts
- shared/contracts/src/index.ts
- shared/contracts/src/operations-routes.ts
- shared/contracts/src/operations.ts
- shared/contracts/src/registry.ts
- shared/contracts/src/vendor-audit.ts
- shared/contracts/src/vendor-practice.ts
- tests/e2e/vendor-production-criteria-local.ts
- tests/integration/consent/canaries.test.ts
- tests/integration/consent/canary-grant-admission.test.ts
- tests/integration/onboarding/real-principals.test.ts
- tests/integration/operations/backup-obligations.test.ts
- tests/integration/vendor/audit-practice.test.ts
- tests/integration/vendor/practice-flow.ts
- tests/unit/retention.test.ts
- tracking/contract_seed.json
- tracking/qualification-inventory.json
