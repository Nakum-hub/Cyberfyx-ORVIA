# Handoff — WP04 (M03 Privacy Control Graph) — Claude Code — not committed

**Base commit:** `5a07649` (`refactor: extract backend package and bounded privacy-control module`), working tree also carried a pre-existing uncommitted edit to `apps/web/src/components/shared/shell.tsx`.
**New commit:** not committed. All changes are in the working tree for review.
**Source master / hash verified:** `ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md` SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`, before and after. Byte-identical to the build pack's `master_sha256`. No idea/master document was read-modified, moved or reformatted.
**Contract version:** 0.5.0 → **0.6.0** (additive only; no existing route, schema or wire meaning changed).
**Scope and profile:** `codex-a00` engineering profile only. `CUSTOMER_LOCAL_SYNTHETIC`. The frozen `rehearsal` profile, its database and its volumes were **not** started, migrated or modified.

## Delivered

Requirements implemented: **FR-M03-01, FR-M03-02, FR-M03-03, FR-M03-04** (module M03, work package WP04).

| Path | Change |
|---|---|
| `packages/contracts/src/index.ts` | M03 schemas (assets, categories, activities, typed relationships, search, traversal, impact, tombstone); `graph.read`/`graph.write` capabilities; 11 routes; new `query` field on `RouteDefinition` with `queryKeys()` |
| `packages/contracts/src/examples.ts` | Explicit relationship examples — the generic sampler cannot build a type-consistent edge |
| `packages/contracts/src/generate.ts` | Emits declared query parameters into OpenAPI; tags the new routes |
| `packages/contracts/src/client.ts` | Browser client validates and sends declared query parameters |
| `packages/contracts/generated/*`, `tracking/contract_seed.json` | Regenerated (52 route examples, 8 artifacts) |
| `packages/db/migrations/0015_privacy_graph.sql` | New: 4 tables, typed FK endpoints, CHECK constraints, RLS, grants, 2 append-only triggers |
| `packages/domain/src/graph/graph.ts` | New bounded domain module owning M03 |
| `packages/domain/src/configuration/configuration.ts` | Exports `configurationKinds`; replaces the dispatcher's route-id prefix matching |
| `packages/backend/src/business.ts` | Dispatches the 11 routes; `pagination()` replaced by allowlisting `queryString()` |
| `packages/authz/src/index.ts`, `policy/admin/authorization.rego` | Graph capabilities granted to admin/auditor roles |
| `apps/web/src/components/screens/inventory.tsx`, `apps/web/src/app/workspace/inventory/**`, `shell.tsx` | New operator screens: inventory, asset detail with traversal and impact, keyword search |
| `apps/web/src/components/shared/api.ts` | `useQuery` threads declared query parameters through the source key, effect deps and binding check |
| `tests/integration/graph/graph.test.ts`, `tests/unit/graph.test.ts` | New suites (46 + 10 assertions) |
| `tracking/capabilities.json` | M03 re-described truthfully with resolving evidence; `LIGHT` → `CORE` |
| `package.json` | Adds `test:graph` |

Behaviour, not scaffolding: assets carry parent/child structure and explicitly reviewed category assignments; `ASSERTED` and `OBSERVED` provenance are separated by the contract, by a database CHECK and in the UI, and only an observation carries a reading time and freshness bound; relationships are typed rows whose endpoint columns are scope-composite foreign keys, so an edge cannot reference a node outside the caller's scope or a node that does not exist; search and traversal are bounded and report truncation; change impact reports affected policy versions, workflows, test runs, assets and owners, and names assessments, processor relationships and retention plans as **unavailable** rather than returning them empty; a tombstone erases the personal payload while the asset, its identity and every relationship survive so older evidence still resolves.

## Commands actually executed

All on `codex-a00`, Node 24.7.0, Docker 29.8.0, 2026-09-19.

| Command | Exit code | Result | Artifact / environment |
|---|---|---|---|
| `tsc --noEmit` | 0 | PASS | baseline and after every change |
| `eslint packages apps scripts tests --max-warnings 0` | 0 | PASS | — |
| `contracts:generate --check` | 0 | PASS | 8 artifacts, canonical seed, 52 route + 7 error examples, contract 0.6.0 |
| `tsx --test tests/unit/*.test.ts` | 0 | PASS | **30/30** (20 pre-existing + 10 new) |
| `tracking:check` | 0 | PASS | 23 tasks, 34 acceptance definitions, 33 capability modules |
| `hygiene:check` | 0 | PASS | 0 findings |
| `db:migrate` | 0 | PASS | `A00-migration-1789820758384…json`, applied `0015_privacy_graph` |
| `web build` | 0 | PASS | includes `/workspace/inventory`, `/workspace/inventory/[id]`, `/workspace/inventory/search` |
| `test:graph` | 0 | **PASS 46/46** | `A00-graph-integration-1789822582917-71cd0b60…json` |
| `test:consent` | 0 | PASS | `A00-consent-integration-1789821517844…json` |
| `test:workflows` | 0 | PASS | `A00-workflow-integration-1789821786916…json` |
| `test:evidence` | 0 | PASS | `A00-evidence-integration-1789822001124…json` |
| `test:auth` | 0 | **PASS 87/87** | `A00-auth-security-1789821680130-8fc61e77…json` (isolated run) |
| `test:enforcement` | 1 | **FAIL 45/46** | see below — reproduced identically at the clean baseline |

**Tests not run:** `test:expiry`, `test:regression`, `test:lifecycle`, `test:tls`, `services:smoke`, `test:network`, `test:isolation`, `dependencies:check`, Playwright browser suites, and canonical acceptance T01–T34. Not executed in this session; they remain **NOT_RUN**, not passing.

### Retained failures, not overwritten

1. **`test:auth` first run FAILED** (`A00-auth-security-1789821437454-cc2a4497…json`, 47/48) — `admin: real password sign-in` returned **429**. Cause: the shared authentication rate-limit budget, consumed by the graph suite's logins immediately before. The suite passed **87/87** unchanged in isolation after the idle window. Test-environment interaction, not a product failure. No limit was raised and nothing was retried inside the suite.

2. **`test:enforcement` FAILED 45/46, twice** (`…1789822085649…`, `…1789822193426…`) — `recovered policy still blocks withdrawal` expected `BLOCK`, observed `INDETERMINATE`. The recorded decision row gives reason code **`POLICY_UNAVAILABLE`**: the application's HTTP call to OPA fails in the window after the suite restarts the OPA container, so the decision is correctly indeterminate rather than wrongly permissive. **Attribution is established, not assumed:** the working tree was stashed to the clean baseline, rebuilt, and the suite run again — it failed with the identical single assertion (`A00-send-enforcement-1789822379144-8e4a8d59…json`). This is therefore **pre-existing or environmental on this host**, not a WP04 regression. It is left failing and is not masked.

## Acceptance

`test:graph` covers all four M03 requirements against the real HTTP boundary, the real scoped transaction and the real PostgreSQL constraints, including negative cases: an edge whose endpoints contradict its type (400), an edge to a node that does not exist in scope (404), a duplicate live edge (409), a child asset claiming a parent in another system (400), an activity claiming a condition its purpose does not support (400), an undeclared query parameter (400), a traversal depth outside the bound (400), a repeated tombstone (409), an auditor attempting a write (403), and a member without the capability (403).

Two database triggers are proved against the path that can actually reach them: `orvia_migrator` is a superuser with `BYPASSRLS`, so row-level security does not constrain it, and the suite asserts that first before asserting that the triggers still refuse to rewrite a tombstone or delete graph history.

## Contract / dependency / ownership changes

- Contract **0.6.0**, additive. `packages/contracts/package.json` version bumped to match. Needs Work review before integration, consistent with the existing `PENDING_WORK_REVIEW` status.
- `RouteDefinition.query` is a new canonical concept. The dispatcher **allowlists** query parameters from the route definition, so an undeclared or repeated parameter is rejected rather than ignored. This tightens, and does not relax, the previous behaviour.
- The dispatcher no longer routes by `list_`/`create_` route-id prefix; it matches `configurationKinds` exactly. This removes the `!=='list_mappings'` / `!=='create_mapping'` special cases.
- **No dependency was added.** `pnpm-lock.yaml` shows an unrelated `@pnpm/exe` `packageManagerDependencies` entry that appeared during the session and was **not** introduced by this work; it is left untouched rather than reverted, and needs the lockfile owner's decision.
- Migration `0015` was amended once, before any commit and while applied only to this engineering profile, to add the `DELETE` grant and policy that the tombstone path needs. The local objects were dropped and the corrected migration reapplied cleanly. No released migration name, content, order or checksum was rewritten.

## Remaining limitations and blockers

- **Operational note:** OPA loads `policy/**` from disk at container start. Editing a `.rego` file has no effect until `docker restart <project>-opa-1`. This cost two misdiagnosed runs and should be in the runbook.
- Impact does not cover assessments, processor relationships or retention plans. These are reported as explicitly `unavailable_dimensions`, because those modules (M15, M16) are not implemented.
- Connector-driven ingestion of `OBSERVED` assets is not wired to a real connector: provenance, freshness and the review state are modelled and enforced, but an operator currently supplies the record. Real discovery ingestion belongs with WP09–WP11.
- Observation freshness uses a fixed 24-hour window. The real window is an owner-reviewed policy decision, not a guessed default, and is left as a single named constant.
- `DataAsset.name` is bounded to 120 characters and search uses the `simple` configuration (no stemming), appropriate for identifiers rather than prose.
- Canonical acceptance T01–T34 remain **NOT_RUN**. This work is engineering evidence at one profile; it is not application acceptance and does not advance the C00 human-acceptance gate.

## Next integration action

Work reviews contract 0.6.0 and this handoff. Recommended reruns on integration: `test:graph`, `test:consent`, `test:workflows`, `test:evidence`, `test:auth` (spaced for the authentication window) and the browser suites, plus `test:enforcement` on a host where the pre-existing OPA-restart failure can be diagnosed separately. Next dependency-ready package is **WP05/WP07** (rights and policy) or **WP13/WP18** (coverage now that a real inventory denominator exists). Commit, merge, deployment and release remain with the human owner; nothing was committed, pushed or deployed.
