# Handoff — A00 / M03 discovery slice — Codex — uncommitted

**Base commit:** `487a77f573fa1afd8a8b250c5303c58f6942cc29`  
**New commit:** none; shared checkout had substantial existing uncommitted work, preserved.  
**Source master / hash verified:** revision 1.4, `C51102A7CDA5FE15C1346E8C34167C406E186C691E9BA86576A3D8FD03BB550B`; not edited.  
**Contract version:** 0.25.0 proposed, generated artifacts; accepted baseline remains 0.2.1 pending consolidated review.  
**Scope and profile:** protected local synthetic `codex-a00`. The user authorised its machine setup and Codex's single-writer use of the graph, contract and coverage paths. No DPDP extension pack files were edited.

## Delivered

**Exact implementation paths for this slice:** `backend/api/src/business.ts`, `backend/api/src/governance-routes.ts`, `backend/domain/src/discovery/catalog.ts`, `backend/domain/src/graph/graph.ts`, `backend/domain/src/coverage/coverage.ts`, `connectors/src/discovery/postgres-catalog.ts`, `services/worker/src/catalog-discovery.ts`, `services/worker/src/ai-governance-monitor.ts`, `services/worker/src/main.ts`, `services/worker/src/withdrawal-worker.ts`, `database/customer/migrations/0043_catalog_discovery.sql`, `0044_graph_observation_binding.sql`, `0045_graph_document_consistency.sql`, `0046_catalog_discovery_gaps.sql`, `0047_catalog_gap_least_privilege.sql`, `0048_processing_map_gap.sql`, `shared/contracts/src/index.ts`, `shared/contracts/src/examples.ts`, `shared/contracts/generated/` (eight generated artifacts), `tracking/contract_seed.json`, `frontend/src/app/workspace/catalog-discovery/page.tsx`, `frontend/src/components/screens/governance/catalog-discovery.tsx`, `frontend/src/components/screens/governance/coverage.tsx`, `frontend/src/components/screens/governance/inventory.tsx`, `frontend/src/components/shared/shell.tsx`, `tests/integration/discovery/postgres-catalog.test.ts`, `tests/integration/discovery/catalog-flow.test.ts`, `tests/integration/graph/graph.test.ts`, `tests/integration/coverage/coverage.test.ts`, `tests/security/graph-source-binding.ts`, `tests/e2e/catalog-discovery-local.ts`. The paths span the initial discovery/provenance work and the later drift/mapping follow-up; other dirty checkout paths predated or belong to separate work.

- `connectors/src/discovery/postgres-catalog.ts`: bounded, read-only, exact-allowlist PostgreSQL catalog adapter. It reads column metadata only, checks the observer role and target permissions, and emits explicit missing/truncated states.
- `database/customer/migrations/0043_catalog_discovery.sql` through `0048_processing_map_gap.sql`: reviewed target approval, durable jobs, append-only observations, graph source binding and document consistency, durable catalog gaps, worker least privilege and a missing processing map gap.
- `backend/domain/src/discovery/catalog.ts`, `backend/domain/src/graph/graph.ts`, `backend/domain/src/coverage/coverage.ts`, `services/worker/src/catalog-discovery.ts`, `services/worker/src/ai-governance-monitor.ts`, API and generated contracts: separate approval and disable; source-bound observed dataset; coverage excludes unbound or stale observations; drift and exhausted read retries open scoped gaps; unmapped observed datasets raise a review gap through set-based derivation; AI monitor only claims independently observed *input metadata*.
- `frontend/src/components/screens/governance/catalog-discovery.tsx`, `frontend/src/components/screens/governance/coverage.tsx`, catalog page and navigation: actual readback, freshness, history, materialisation, scoped target deep link and reviewer gap link.
- `tests/integration/discovery/*`, `tests/integration/graph/graph.test.ts`, `tests/integration/coverage/coverage.test.ts`, `tests/security/graph-source-binding.ts`, `tests/e2e/catalog-discovery-local.ts`: synthetic normal, adverse, cross-tenant, direct database and browser checks. The drift test changes a synthetic target column and restores it in `finally`.
- `tracking/capabilities.json`, `docs/engineering/2026-09-25-dossier-gap-checklist.md`, `docs/leadership/2026-09-25-section-2-evidence-update.md`: qualified discovery subset and remaining competitor gap. No canonical acceptance status was promoted.

## Commands actually executed

| Command | Exit | Result | Evidence |
|---|---:|---|---|
| `tsx scripts/migrate.ts` | 0 | Applied 0043–0048 in forward-only runs | `handoffs/codex/artifacts/A00-migration-1790332155654-adde0ba8-08cd-4beb-a2c3-f96f30073ee1.json` (last run) |
| `tsx scripts/machine-init.ts confirm:codex-a00` | 0 | Renewed authorised isolated synthetic identities | protected local profile; no credentials printed |
| `tsx shared/contracts/src/generate.ts` and `--check` | 0 each | 174 route examples, 7 error examples, contract 0.25.0 | terminal results |
| `tsx tests/integration/discovery/catalog-flow.test.ts` | 0 | 58/58 on 0.25.0; includes schema drift, cross-tenant gap denial, revocation | `handoffs/codex/artifacts/A00-catalog-discovery-flow-1790333446631-2e4b4859-528d-4453-a1c1-1beddb542cff.json` |
| `tsx tests/integration/discovery/postgres-catalog.test.ts` | 0 | 13/13 adapter checks | `handoffs/codex/artifacts/A00-postgres-catalog-discovery-1790328884150-46b1eb77-01d7-4c6d-8c39-0e170a5f3ef0.json` |
| `tsx tests/integration/graph/graph.test.ts` | 0 | 46/46 graph checks | `handoffs/codex/artifacts/A00-graph-integration-1790328342955-7d8918ba-f4ed-4a23-844e-a0d2b76a2dc4.json` |
| `tsx tests/integration/coverage/coverage.test.ts` | 0 | 56/56 coverage checks on rebuilt 0.25.0 candidate | `handoffs/codex/artifacts/A00-coverage-integration-1790332847171-c97594b8-044b-4303-899d-67663db39d54.json` |
| `tsx tests/security/graph-source-binding.ts` | 0 | 2/2 direct SQL bypass denials | `handoffs/codex/artifacts/A00-graph-source-binding-1790328360859-a33960c7-2c00-4517-835b-5f9a191f91ee.json` |
| `tsx tests/e2e/catalog-discovery-local.ts` | 0 | MFA, scoped target read, inventory creation, zero external requests or console errors on 0.25.0 | `handoffs/codex/artifacts/A00-catalog-discovery-browser-1790333302159-6fb4c55f-caa2-470e-97f1-f8c1ec5f05ba.json`; `output/playwright/catalog-discovery-codex-a00.png` |
| `tsx --test tests/unit/*.test.ts` | 0 | 242/242 on the latest tree | terminal result |
| `tsx scripts/web.ts build` | 0 | optimized build and TypeScript | terminal result; after set-based mapping-gap edit |
| `tsc --noEmit` | 0 | exact-tree TypeScript after reviewer link edit | terminal result |
| `eslint frontend backend database connectors shared services scripts tests --max-warnings 0` | 0 | full lint on the latest tree | terminal result |
| `tsx scripts/validate-tracking.ts` | 0 | 23 tasks, 34 acceptance definitions, 33 modules; none promoted | terminal result |

Failed runs were preserved: initial unprivileged catalog test hit protected identity `EPERM`; a drift test pointed at the control database and got `42P01`; a later assertion expected coverage before re-materialising the latest observation; a browser locator assumed a new target would appear on page one; one browser fixture setup attempt failed before the succeeding rerun. The first mapping test used a stale build, and the next exposed a derivation timeout on accumulated synthetic fixtures; set-based derivation then passed. Their JSON artifacts remain under `handoffs/codex/artifacts/`.

## Acceptance and limits

This is a working **synthetic PostgreSQL metadata subset**, not enterprise discovery, classification, a production connector or a claim of parity with OneTrust, BigID, Securiti or the GRC suites. A customer-controlled read-only sandbox has not been supplied. No row values or personal-data classification were read. The AI governance monitor observes input metadata, not model behavior. The separate DPDP lane retains its ownership. T01–T34 remain **NOT_RUN** on an identified full application candidate; no release readiness or competitor superiority is claimed.

## Next integration action

No customer-controlled sandbox is available now. When one is provided through a protected credential channel, approve exact read-only relations and run connector conformance and failure testing there. Broaden discovery adapters, classification and data-flow correlation, then complete the remaining checklist and full application acceptance evidence. Re-run tests on the integration candidate before any status promotion.
