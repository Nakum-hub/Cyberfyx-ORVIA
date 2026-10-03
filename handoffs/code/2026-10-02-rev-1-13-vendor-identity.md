# Handoff — Rev 1.13 V1–V5 — Claude Code lane — branch `claude/upbeat-newton-w4h53x`

**Base commit:** `7784cd4` (after the rev 1.11/1.12 work)
**New commits:** `8cf0f35` (V2), `15edf57` (V3), `ddd34ff` (V4), `49a794b` (V1 addendum), `61c2b52` (V5 start smoke), plus the ComplianceReport completeness fix committed with this handoff
**Source master:** revision 1.4, read with addenda 1.5–1.13; master unchanged
**Contract version:** customer 0.58.0 (ComplianceReport gains `completeness`), vendor 0.8.0
**Scope and profile:** codex-a00 (customer), vendor-a00 (vendor service), throwaway vendor databases for the vendor suites; synthetic data only

## Delivered

- **V1:** `docs/engineering/V1_BASELINE_REV_1_13_VENDOR_IDENTITY_AND_DELIVERY.md` covers owner decisions, central vendor service architecture, code and installer delivery, hosting options (deferred) and four open owner questions. AGENTS.md references it.
- **V2, member onboarding:** vendor migration 0101. An administrator either sets the first password or issues a one-time setup code (single use, 72 h, digest only, locks after 5 wrong attempts). Public `/vendor/account-setup` page and `POST /api/v1/vendor/account-setup`. Reinstalling only asks for email and password.
- **V3, website provisioning:** vendor migration 0102. HMAC-SHA256 signed requests (product `ORVIA`, method, path, timestamp within 300 s, single-use nonce, body digest). Clients are scoped, and their secrets are sealed under the vault key. A super administrator can be created only while none exists. A client bound to another product is refused. Client tool: `pnpm run vendor:provisioning-client`.
- **V4, vendor service licence:** vendor migration 0103. The licence uses its own audience `ORVIA_VENDOR_SERVICE`, its own key kind and its own table. A database trigger enforces member seats on every path, and administrators are not counted. Only the super administrator can import a licence. A customer licence is never accepted as a vendor licence, and the reverse is also refused.
- **V5, start verification:** `tests/e2e/start-smoke-local.ts` starts both installations from the build and opens 19 main screens signed in, checking for page errors, failed reads and external requests. A full integration battery was also run.
- **Defect found by the battery and fixed:** `complianceReport` (`backend/domain/src/grc/lifecycle.ts`) read only 100 controls and 100 frameworks, ordered by random id. Controls were silently dropped from the auditor report, and requirement coverage was understated. Changes:
  - limit raised to 1000;
  - coverage is now computed from every control;
  - a new `completeness` block reports totals against what was listed;
  - a limits line appears when the report is partial;
  - the Continuous compliance screen shows "Listed X of Y" when the report is incomplete.

## Commands actually executed

| Command | Exit code | Result | Artifact / environment |
|---|---|---|---|
| `npx tsx tests/integration/vendor/member-onboarding.test.ts` | 0 | PASS 21/21 | throwaway vendor DB |
| `npx tsx tests/integration/vendor/provisioning.test.ts` | 0 | PASS 25/25 | throwaway vendor DB |
| `npx tsx tests/integration/vendor/service-licence.test.ts` | 0 | PASS 17/17 | throwaway vendor DB |
| `npx tsx tests/e2e/start-smoke-local.ts` | 0 | PASS: readyz 200/200, 19/19 screens, 0 external requests | `handoffs/code/artifacts/start-smoke/` |
| Integration battery (98 suites, `machine-init` before each) on the `61c2b52` build | — | 95 PASS, 3 FAIL (below) | `handoffs/codex/artifacts/` and `handoffs/code/artifacts/` (2026-10-02) |
| `npx tsx tests/integration/expansion/grc-lifecycle.test.ts` after the fix | 0 | PASS 76/76 (includes a new completeness assertion) | `handoffs/codex/artifacts/A00-operations-grc-lifecycle-*.json` |
| `pnpm test` | 0 | PASS | unit |
| `pnpm run -s lint` | 0 | PASS | — |
| `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` | 0 | PASS | — |
| `pnpm run -s contracts:generate` | 0 | 498 route examples validated, contract 0.58.0 | `shared/contracts/generated/` |

Battery failures:
- `expansion/grc-lifecycle`: **real defect** (the truncated report). Fixed and re-run: PASS.
- `grc/http`: environmental. The suite requires its own independently owned OPA port, and the shared codex-a00 OPA port is refused by design. NOT_RUN for this candidate.
- `lifecycle`: environmental. The suite runs only on the named rehearsal profile. NOT_RUN for this candidate.

Tests not run: the 11 rehearsal-profile suites (as before), `grc/http` and `lifecycle` (reasons above). The report's truncation path (more than 1000 controls) is not exercised by a test; only the complete path is asserted.

## Remaining limitations and blockers

- These owner questions remain open (addendum section E):
  - which member tool to use on devices (recommendation: browser);
  - who emails setup codes;
  - vendor super-administrator recovery command (not built);
  - hosting of the central vendor service.
- Owner inputs still pending from rev 1.11:
  - quota numbers (discovery, control tests, response packages);
  - prices and plan names;
  - the CUSTOM tier.
- Ready for main as completed V1: **NO**. Reasons: the rehearsal suites are NOT_RUN, the OPA delay finding is open, and the owner questions above are unanswered.

## Next integration action

Review and merge Codex `codex/round10` when the owner reports it is complete, then re-run the affected suites. No merge to main and no deployment performed.
