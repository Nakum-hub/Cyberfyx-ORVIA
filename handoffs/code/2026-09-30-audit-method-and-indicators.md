# Handoff — AUDIT-PRACTICE-02 (gates, indicators, methodology) — DPDP lane — 12ed918

**Base commit:** 639d905
**New commits:** e0234c0, e26b933, 9875d98, 12ed918 (plus artifact-only commits)
**Contract version:** customer 0.46.0 (unchanged); vendor-internal vendor-audit 0.3.0 → **0.4.0**
**Scope and profile:** codex-a00 (customer), vendor-a00 (vendor), Chromium only.

## Delivered

1. **Activation gates: management approval, not legal review** (owner decision 2026-09-30).
   - `database/vendor/migrations/0014_practice_gates_management_approval.sql`:
     - gates `ENGAGEMENT_LETTER_TEMPLATE_APPROVED` and `PROCESSING_AGREEMENT_TEMPLATE_APPROVED`;
     - legacy legal-review rows stay readable and still satisfy the new gate;
     - new rows under a legacy name are refused (`legacy_gate_name`).
   - `shared/contracts/src/vendor-practice.ts`: `PracticeGate` and the view-only `RecordedPracticeGate`.
   - `backend/vendor/audit/practice.ts`: readable labels in the statement.
   - `frontend/src/app/vendor/practice/page.tsx`: labels, the legacy row shown "(as a legal review)", and a hint pointing to the template digest.
2. **Audit indicators for 30 of 33 baseline requirements** (`backend/domain/src/dpdpa-audit/indicators.ts`; there were 12). All are counts or dates under row-level security, with no identifiers.
   - Tested by auditor procedure only, with no invented indicator: DPDP-CONSENT-MANAGER, DPDP-ERASURE-ADVANCE-NOTICE, DPDP-BOARD-COMPLAINT-CHANNEL.
3. **`docs/audit-practice/`:** `METHODOLOGY.md` v1.0 and eight templates, all drafts for management approval.
4. **Docs:** `docs/regulatory/DPDP_CONFORMANCE.md` and `docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md` updated.
5. **Tests:**
   - gate checks in `tests/integration/vendor/audit-practice.test.ts`;
   - coverage checks in `tests/integration/expansion/dpdpa-audit.test.ts`;
   - new `tests/unit/audit-indicators.test.ts`;
   - `tracking/qualification-inventory.json` regenerated.

## Commands actually executed

| Command | Exit | Result | Artifact |
|---|---|---|---|
| `pnpm run build` (codex-a00) | 0 | PASS; 0 client chunks with crypto-browserify or eval | scratchpad battery10 |
| `pnpm run vendor:init confirm:vendor-a00` | 0 | Applied 0014 | — |
| `tests/integration/vendor/vendor-audit.test.ts` | 0 | 74/74 | handoffs/code/artifacts |
| `tests/integration/vendor/audit-practice.test.ts` (after the label fix) | 0 | 102/102 | — |
| `tests/integration/vendor/schema-equivalence.test.ts` | 0 | 7/7 (first run 4/7: vendor-a00 not yet migrated to 0014; passed after `vendor:init`) | — |
| `run-signed-suite.sh tests/integration/expansion/audit-mandate.test.ts` | 0 | 98 assertions, 0 failures | handoffs/codex/artifacts |
| `run-signed-suite.sh tests/integration/expansion/dpdpa-audit.test.ts` (after the test fix) | 0 | 56 assertions, 0 failures (first run failed on my own 33-row assumption; the fixture package has 32) | handoffs/codex/artifacts |
| `tests/e2e/dpdpa-audit-local.ts` | 0 | 20/0 | — |
| `tests/e2e/audit-mandate-local.ts` | 0 | 19/0 | — |
| `tests/e2e/expansion-screens-local.ts` | 0 | 69/0 | — |
| `tests/e2e/interface-crawl-local.ts` (after the label fix) | 0 | 450 visits, 0 with issues (first run: 1 issue, a 3px overflow on /vendor/practice at phone width, fixed in 12ed918) | output/playwright/crawl |
| contracts:check, typecheck, lint, `pnpm test`, tracking:check, v1-source-inventory --check, qualification-inventory --check | 0 each | PASS | CI on 12ed918: success |

Tests not run: commerce (not touched), Firefox and WebKit (not installed here: NOT_RUN).

## Contract / dependency / ownership changes

- Vendor contract 0.4.0 changes one enum (`PracticeGate`) and adds `RecordedPracticeGate`.
- Customer contract unchanged: indicators use the existing generic `Indicator` shape, at most 10 per requirement.
- Needs Codex review: vendor migration 0014 and the indicator SQL.

## Remaining limitations and blockers

1. **BLOCKED_EXTERNAL: official sources.**
   - meity.gov.in, egazette.gov.in and indiacode.nic.in are refused by the egress proxy (HTTP 403 on CONNECT, 2026-09-30).
   - Real engagements stay refused until the PRODUCTION criteria are built from the hashed official PDFs.
2. **Owner inputs:**
   - template placeholders;
   - director approval of each template version;
   - audit key custodian;
   - hosting provider.
3. **Retention sweep** is manual (a monthly routine, committed to in the templates). It has no scheduler.
4. **Consent Manager support** (in force 13 Nov 2026) and **R8(2) 48-hour intimation** are not built.
5. **Indicator semantics** are counts over what the client records in ORVIA. Completeness depends on the client scope statement (METHODOLOGY section 5).

## Next integration action

1. The user merges PR #33 once satisfied. CI is green on 12ed918.
2. Codex reviews 0014 and the indicator SQL.
3. Next build candidates: Consent Manager, scheduled retention sweep.
