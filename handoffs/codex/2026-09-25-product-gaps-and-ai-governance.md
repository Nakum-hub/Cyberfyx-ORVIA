# Handoff — PRODUCT-GAPS-2026-09-25 — base V1 lane — not committed

**Base commit:** `487a77f573fa1afd8a8b250c5303c58f6942cc29`  
**New commit:** none; the checkout was dirty before this task and remains uncommitted.  
**Source master / hash verified:** revision 1.4, SHA-256 `C51102A7CDA5FE15C1346E8C34167C406E186C691E9BA86576A3D8FD03BB550B`  
**Contract version:** `0.20.0`  
**Scope and profile:** base V1, `codex-a00` synthetic customer-local profile. No real customer data or target used.

## Delivered

- `docs/engineering/2026-09-25-dossier-gap-checklist.md`: traceable gap inventory and dependency order for each function in the dossier.
- `database/customer/migrations/0041_ai_governance.sql`, `0042_ai_monitor_jobs.sql`: scoped immutable AI inventory and review history, durable check jobs, RLS and worker grants.
- `backend/domain/src/ai-governance/ai-governance.ts`: registration with scoped graph references, append-only review records, separate approval, report and finding logic.
- `services/worker/src/ai-governance-monitor.ts`, `services/worker/src/main.ts`: scheduled, bounded check and retry. A staff-entered `OBSERVED` label is always insufficient to close the independent-read finding.
- `backend/api/src/governance-routes.ts`, `backend/api/src/business.ts`, `backend/authorization/src/index.ts`, `backend/policy/admin/authorization.rego`, `shared/contracts/src/index.ts`: typed routes, capabilities and server-side authorization.
- `frontend/src/app/workspace/ai-governance/page.tsx`, `frontend/src/components/screens/governance/ai-governance.tsx`, `frontend/src/components/shared/shell.tsx`, `frontend/src/app/globals.css`: customer-local inventory, report, registration and review UI.
- `tests/integration/ai-governance/ai-governance.test.ts`, `tests/integration/ai-governance/monitor.test.ts`, `tests/unit/ai-governance-monitor.test.ts`, `tests/e2e/ai-governance-local.ts`: new synthetic and adverse tests, including an actual machine-identity worker run.
- `tracking/capabilities.json`, `scripts/tracking.ts`: separately tracked V1 non-model extension without changing M19–M25 or T01–T34 status. `tracking/contract_seed.json` and `shared/contracts/generated/{client-types.d.ts,contract-seed.proposed.json,endpoint-types.ts,examples.json,interfaces.json,manifest.json,openapi.json}` were regenerated.
- `docs/leadership/2026-09-25-section-2-evidence-update.md`: function-level official-source comparison with bounded claims and concrete next proofs.
- `output/pdf/ORVIA_Section_2_Evidence_Update_2026-09-25.pdf`: two-page rendered companion to the original dossier; both pages inspected after rendering.

## Commands actually executed

| Command | Exit | Result / artifact |
|---|---:|---|
| `./node_modules/.bin/tsx shared/contracts/src/generate.ts` | 0 | 8 artifacts, 168 routes, contract 0.20.0 |
| `./node_modules/.bin/tsx shared/contracts/src/generate.ts --check` | 0 | 8 artifacts and canonical seed checked |
| `./node_modules/.bin/tsx scripts/migrate.ts` | 0 | 0041 and 0042 on codex-a00; `A00-migration-1790317637933-be45ca56-02ae-4922-94b6-977122158fb2.json`, `A00-migration-1790319601854-15605f56-f196-4429-ae34-0f52ef8115c7.json` |
| `./node_modules/.bin/tsc --noEmit` | 0 | Exact-tree TypeScript check |
| `./node_modules/.bin/eslint frontend backend database connectors shared services scripts tests --max-warnings 0` | 0 | Exact-tree lint |
| `./node_modules/.bin/tsx --test tests/unit/*.test.ts` | 0 | 211/211 unit tests passed, including five AI monitor/retry cases on the final tree |
| `./node_modules/.bin/tsx scripts/web.ts build` | 0 | 51 routes, AI governance page included |
| `./node_modules/.bin/tsx tests/integration/ai-governance/ai-governance.test.ts` | 0 | 32/32, `A00-ai-governance-integration-1790321964631-e06e37d8-0a65-4e6a-9be2-5b1dbe100815.json` |
| `./node_modules/.bin/tsx scripts/machine-init.ts confirm:codex-a00` | 0 | User-authorized protected enrollment and synthetic target provisioning; existing target restrictions preserved |
| `./node_modules/.bin/tsx tests/integration/ai-governance/monitor.test.ts` | 0 | 9/9 actual durable-job worker assertions after the retry refactor, `A00-ai-governance-monitor-1790323509876-7555507f-1bd7-4168-9b4d-46a6b385ff7e.json` |
| `./node_modules/.bin/tsx tests/e2e/ai-governance-local.ts` | 0 | MFA, create via form, inventory/detail readback; `A00-ai-governance-browser-1790323919635-8b577e5a-8a01-413f-ba89-a36514e26dbf.json`, `output/playwright/ai-governance-codex-a00.png` |
| `./node_modules/.bin/tsx tests/security/fixture-isolation.ts` | 0 | 13 isolation assertions, `A00-fixture-isolation-1790321999025-85c8ca07-511e-4a93-ab66-c96d780a7f01.json` |
| `./node_modules/.bin/tsx tests/security/auth.test.ts` | 1 | Authentication/isolation assertions passed until its Docker/OPA fault-injection step was denied; `A00-auth-security-1790322913393-d8361b48-9557-4c63-a9e4-f662f8f92d91.json` remains FAIL |
| `./node_modules/.bin/tsx scripts/validate-tracking.ts` | 0 | 23 tasks, 34 definitions, 33 master modules; no status promotion |
| `node scripts/local-hygiene.mjs` | 0 with authorized protected-profile access | 3,741 files and 72 browser bundles examined, 79 generated credentials compared, zero findings; pattern/exact-value check only. The normal sandbox attempt exited 1 on the protected worker ACL. |
| `python tmp/render-section2.py`; `./node_modules/.bin/tsx tmp/print-section2.ts` | 0; 0 | Two-page comparison PDF; both pages rendered and visually inspected with PyMuPDF |
| `./node_modules/.bin/tsx tests/integration/consent/consent.test.ts` | 0 | Existing consent journey and restart, `A00-consent-integration-1790321494922-34304e68-7fb9-454c-8a0f-9d315e247d6e.json` |
| `./node_modules/.bin/tsx scripts/verify-suites.ts` | 1, interrupted | Initial consent suite passed 46 assertions then failed at restart while a web build ran concurrently; later Docker-dependent suites failed before assertions. Failure records preserved. The consent suite passed alone after build. No full battery claim. |
| `./node_modules/.bin/tsx tests/integration/enforcement/send.test.ts` | 1 | Docker/OPA restart denied before assertions; `A00-send-enforcement-1790322017417-4bbe4bf3-ad24-4f16-b98e-e1e4c6e48718.json` |
| `./node_modules/.bin/tsx tests/integration/evidence/evidence.test.ts` | 1 | Docker pipe denied at setup; `A00-evidence-integration-1790322034590-c2c9826e-1747-4280-b871-9e767a6a33f9.json` |
| `git diff --check` | 1 | CRLF lines in already-modified tracked files were reported as trailing whitespace; no wholesale line-ending rewrite performed. |

Earlier failed AI integration and browser attempts remain in `handoffs/codex/artifacts/`; they were not overwritten by the successful reruns. The 503 during one integration attempt was not reproduced on a later identical run; its cause remains unproven. One late browser attempt asserted that a due job must still be visible after the worker had processed the queue; it failed on that timing assumption, and the stable create/read journey was rerun successfully.

## Acceptance and limitations

No T01–T34 full application acceptance result was produced on an identified candidate. API isolation and adverse cases covered cross-tenant references and event writes, missing permissions, owner self-approval, missing prerequisites, append-only history and findings that cannot be cleared by a later assertion. The browser used synthetic fixtures and made no external requests.

The monitor worker's successful job transaction and immediate deduplication were tested. Actual failure/retry/exhaustion under a database fault remains unverified; its bounded retry plan has a unit test. The first `machine:init confirm:codex-a00` escalation was **rejected by automatic approval review** because it would persist machine credentials, database grants, target provisioning and ACL changes under the AGENTS.md permission boundary. The user then explicitly authorized that exact synthetic setup; the protected command succeeded. Docker-dependent enforcement/evidence/auth fault-injection checks did not finish under the current sandbox. The synthetic connector is not a real vendor connector. No enterprise discovery breadth, real notification transport, legal content, certification, price or release readiness is claimed.

## Contract, ownership and next dependency

Contract 0.20.0 adds AI governance schemas and routes. M19–M25 custom-model modules remain deferred V2; the non-model V1 record layer is separately identified. The approved master was not edited. The separate DPDP extension pack and shared paths owned by its writer were not edited for this change. A real allowlisted read-only source, connector-backed observation provenance and a safe controllable target are the next technical dependency. Before release qualification, coordinate the DPDP shared-path boundary, test monitor retry/exhaustion fault cases, rerun Docker-dependent suites in an authorized environment, freeze a candidate, and complete full application acceptance and rehearsals.
