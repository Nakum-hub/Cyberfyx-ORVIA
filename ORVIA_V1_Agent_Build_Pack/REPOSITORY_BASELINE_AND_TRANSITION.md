# ORVIA — Repository baseline and transition

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Prevent agents from rebuilding completed moves or treating prototype constraints as production design.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## 1. Inspected evidence and limits

Repository: `Nakum-hub/Cyberfyx-ORVIA`. Branch requested: `main`. Snapshot: `5a07649e5115995406e62de00b73e2c9fc560060`, fetched through the authorised GitHub connector on 19 September 2026. The current commit succeeds the earlier `6f9960c4…` review. This pack inspected the recursive tree, commit metadata, canonical contract portions, the new target-observer interface, processing implementation, backend dispatcher, scoped database transaction and agent instructions. Earlier conversation observations are not silently promoted to new runtime evidence.

No application tests, database migrations, containers, customer connections or live browser sessions were executed for this documentation task. No repository files were changed. Full checkout execution was unavailable in this authoring environment; the read-only connector supplied source evidence. This is **selected-source inspection**, not a full security/dead-code audit. `NOT_ESTABLISHED` means not established by that inspection; it does not prove absence in all branches or uncommitted laptop files.

The inspected commit message reports typecheck/lint/20 unit tests/contracts/tracking/hygiene passing and explicitly says Docker-backed integration/E2E were not run. Those are author-reported results, not independently executed here. Requalify the current candidate before building on them. The user's laptop can contain newer/uncommitted changes: every agent records actual HEAD and differences first.

## 2. Confirmed structural improvements

| Observation | Evidence path | Consequence |
|---|---|---|
| Backend handlers moved out of `apps/web/src/server/` into a public backend package | `packages/backend/src/business.ts`; commit record | Do not repeat that extraction or recreate the old server tree |
| Bounded control package exists | `packages/privacy-control/src/processing.ts` | Extend it; do not move identity/consent/evidence/database under it |
| Narrow target-observation port exists | `packages/privacy-control/src/target-observer.ts` | Preserve the useful seam; broaden only against real connector requirements |
| Backend still composes a synthetic observer | `packages/backend/src/business.ts` | The port is not a production connector catalogue |
| Consent/configuration/workflow/evidence/test-runs are separate domain concerns | Repository tree under `packages/domain/src/` | Reuse existing modules before introducing equivalent new packages |
| Database package and scoped transaction helper exist | `packages/db/src/runtime.ts` | Preserve current safety checks and migration continuity |
| Contract generator and schema source exist | `packages/contracts/src/index.ts`, `generate.ts` | Extend canonical source; no second manually maintained contract |
| AGENTS points to revision 1.4 but still describes a prototype and historical ownership | `AGENTS.md` | Update non-master task/ownership guidance through explicit handoff |

## 3. Concrete remaining gaps exposed by the inspected code

**B01 — synthetic contract restrictions.** Transport version `0.5.0`, signed command version `0.3.0`, profile `CUSTOMER_LOCAL_SYNTHETIC`; predefined fixture profiles; purpose codes restricted to promotional marketing/order-service demo; notice language `en`; only synthetic/manual connector enum; principal email restricted to fictional domains and `synthetic: true`; two synthetic operations and a one-record command budget. These are deliberately safe prototype restrictions. Replace them through separately tested production contracts, not by deleting all validators.

**B02 — incomplete target isolation.** `TargetObserver` abstracts one read path, but processing still queries `marketing_memberships` directly and branches on `ORVIA_REST_SIMULATOR`. The port is also typed around `marketing_restricted`. Move provider-specific observation and target-state interpretation into appropriate adapters while preserving local consent/policy atomicity and fail-safe admission. A generic function called `observe` is not enough if the domain still knows the provider schema.

**B03 — mixed domain HTTP routing.** The backend is physically separate, but `business.ts` dispatches configuration, consent, workflow, controls, evidence and test routes together with numerous deep imports. Split handlers by actual domain ownership as they grow; retain one common authentication/scope/validation/audit pipeline and deliberate public exports.

**B04 — persistence topology and installation.** The inspected pool binds to loopback/profile configuration and a small prototype pool. A supported product profile needs deliberate local/customer-managed connection configuration, runtime roles, secrets, migrations, workflow persistence, backup and recovery. No new hardware/pool-size guarantee is inferred.

**B05 — incomplete operational vocabulary.** Existing decisions are ALLOW/BLOCK/INDETERMINATE and narrow status dimensions. The master adds obligations and richer workflows. Preserve existing wire meanings with versioned additions and adapters; no blind enum replacement across stored rows and running Temporal histories.

**B06 — broader product scope.** Full rights/nomination/guardian flows, retention/copy plans, processor assessments/incidents, real connector onboarding/imports, vendor commerce/support/licensing and customer-ready packaging are not established by these inspected endpoints. Inspect each WP before assuming entirely absent or complete. This pack specifies their required outcomes without discarding useful code.

**B07 — frontend organisation and proof.** Earlier inspected broad feature components need current local inspection before splitting; this task did not read every current frontend file. Preserve real loading/error/failure/evidence behaviour and existing browser tests. A folder move alone is not UI completion.

## 4. Requested target ownership versus current physical layout

The user requested recognisable frontend/backend/database separation and named modules. Current snapshot uses `apps/*` and `packages/*`, including the new backend/control boundaries. A coordinated move may adopt the target below; it is not already complete and must not become duplicate trees.

| Current owner path | Proposed target owner | Rule |
|---|---|---|
| `apps/web` | `frontend/customer` | Next.js route files remain valid; thin server adapters are allowed in the web host |
| `packages/backend` | `backend/customer-api` | Preserve public package name during a physical move; split real handlers gradually |
| `packages/privacy-control` | `backend/privacy-control` | Bounded processing/enforcement module only |
| `packages/domain` | `backend/domain` | Retain concern folders; add actual rights/retention/incidents modules rather than placeholders |
| `packages/auth`, `packages/authz` | `backend/customer-auth`, `backend/customer-authz` | Customer identity semantics; vendor identities remain independently configured |
| `apps/worker`, `apps/agent` | `backend/worker`, `backend/agent` | Separate process entry points and privileges |
| `packages/connectors`, `packages/policy-sdk` | `backend/connectors`, `backend/policy-sdk` | Reviewed adapter/SDK contracts |
| `packages/db` | `database/customer-runtime` | Same ordered migration ledger; no live data stored under source |
| `packages/contracts` | `shared/contracts` | Shared schema/client code without server secrets |
| `packages/testing` | `tests/support` or an actual test-support package | Choose only after consumers/build discovery are reviewed |
| `apps/demo-targets`, synthetic adapter/HTTP code | `tests/simulators` and explicit evaluation composition | Preserve executable tests and target migrations; no production fallback |
| No confirmed vendor application in inspected files | `frontend/vendor`, `backend/vendor`, `database/vendor` | Create only alongside actual vendor requirements; separate deployment/data authority |

**One layout migration, not a new product build.** Until the structural change is assigned and verified, refer to existing paths. Afterward, update this path map once. Keep framework/package choice unchanged unless an approved decision gives a concrete reason. Required module ownership is more important than a cosmetic tree.

## 5. Safe transition acceptance

Before changing paths: record Git state, current master hash, permitted local root, protected presentation paths, links and shared ports/volumes/databases. Keep recovery for unique uncommitted source without archiving credentials. No reset/reseed of either copy.

Preserve migration names/content/order and existing contract versions during a move. Update all actual import exports, workspaces, compiler includes, lint roots, nested test discovery, Docker COPY/build context, Next.js working directories, startup scripts and source/release inventory. Re-run generated-contract checks rather than hand-editing generated files. New source files must enter the qualified inventory; historical reports are never relabelled.

Prove static checks/build and the existing withdrawal, identity, unknown-effect, evidence and regression flows on isolated resources after the move. A newly unavailable required feature is a regression, not an acceptable result of deleting dummy code. An intentionally removed fake success becomes an explicit incomplete feature tracked in the relevant WP.

## 6. Code-cleanup rule

Delete only proved redundant/orphaned source or reproducible output after checking framework discovery, dynamic imports, migrations, scheduled jobs, tests and packaging. `demo` in a filename is not a deletion criterion. `tracking/capabilities.json` is known from the earlier reviewed source to feed UI; inspect current consumers before deleting it. Do not remove source evidence, security tests or failure fixtures to simplify a tree.

No bulk scaffold, no dummy vendor endpoints, no real customer connections as a smoke test. The useful prototype is a starting fragment; production-grade admission, connectors, identity, deployment and other modules must be completed and tested explicitly.

## 7. Source references

| Key | Pinned repository evidence |
|---|---|
| R-COMMIT | `https://github.com/Nakum-hub/Cyberfyx-ORVIA/commit/5a07649e5115995406e62de00b73e2c9fc560060` |
| R-TREE | `https://api.github.com/repos/Nakum-hub/Cyberfyx-ORVIA/git/trees/7f6c9c6ffa5c949ef232fe0ea29fb84c15a751a5?recursive=1` |
| R-CONTRACT | `https://github.com/Nakum-hub/Cyberfyx-ORVIA/blob/5a07649e5115995406e62de00b73e2c9fc560060/packages/contracts/src/index.ts` |
| R-OBSERVER | `https://github.com/Nakum-hub/Cyberfyx-ORVIA/blob/5a07649e5115995406e62de00b73e2c9fc560060/packages/privacy-control/src/target-observer.ts` |
| R-CONTROL | `https://github.com/Nakum-hub/Cyberfyx-ORVIA/blob/5a07649e5115995406e62de00b73e2c9fc560060/packages/privacy-control/src/processing.ts` |
| R-BACKEND | `https://github.com/Nakum-hub/Cyberfyx-ORVIA/blob/5a07649e5115995406e62de00b73e2c9fc560060/packages/backend/src/business.ts` |
| R-DB | `https://github.com/Nakum-hub/Cyberfyx-ORVIA/blob/5a07649e5115995406e62de00b73e2c9fc560060/packages/db/src/runtime.ts` |
| R-AGENTS | `https://github.com/Nakum-hub/Cyberfyx-ORVIA/blob/5a07649e5115995406e62de00b73e2c9fc560060/AGENTS.md` |

The source files are not copied into this documentation pack. Fetch the pinned code or inspect the actual working checkout; this avoids shipping a stale duplicate implementation. Current GitHub permissions and local setup may differ from this read-only authoring session.
