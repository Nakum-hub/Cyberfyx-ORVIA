# DPDP operational extension

This document describes the DPDP operational extension as it is implemented on
branch `prototype/claude/dpdp-operations`. It follows the ORVIA V1 DPDP
Operational Extension Pack (`ORVIA_V1_DPDP_Operations_Implementation/`) and
records where the code lives, how it reuses V1, and what it does not do.

## 1. How the extension sits on V1

The extension adds tables, routes, screens and a background runner. It does not
replace a V1 entity; where V1 already owns a concept the extension links to it.

| V1 entity (unchanged owner) | Extension use |
| --- | --- |
| `app.systems` | Registry systems; each may carry one current `connector_bindings` row. |
| `app.purposes` | `registry_purposes.v1_purpose_id` links a registry purpose to the V1 purpose. |
| `app.rights_requests` (+ plan items, outcomes) | A rights run is created from a V1 request that has passed intake, identity review and scoping; settled actions write back one V1 outcome per system (`syncRightsOutcomes`). V1 closure rules are unchanged. |
| `app.representation_mandates` | A guardian or nominee for a person with a portal identity must cite the V1 mandate. |
| `app.incidents` | A personal-data breach is a V1 incident that has been registered as a breach. |
| `app.processors` | A processor engagement references the V1 processor. |
| `app.notification_templates` / `notification_tasks` | Deadline and failure alerts are V1 notification tasks with `DPDP_*` sources. |
| Portal consent (`consent_events`) | `sync_portal_consent` mirrors V1 portal consent into registry consent records and opens withdrawal runs. |
| Audit (`audit_events`) | Every extension write calls the V1 `audit()` helper. |

## 2. Code map

| Responsibility | Location |
| --- | --- |
| Migrations | `database/customer/migrations/0037_regulatory_core.sql`, `0038_data_processing_registry.sql`, `0039_workflow_execution_and_evidence.sql`; synthetic target `services/synthetic-target/migrations/0004_subject_records.sql` |
| Contracts | `shared/contracts/src/regulatory.ts`, `registry.ts`, `operations.ts`, `operations-routes.ts`, `operations-examples.ts` (merged by `index.ts`, contract 0.18.0) |
| Regulatory core | `backend/domain/src/regulatory/packages.ts`, `applicability.ts`; baseline `scripts/regulatory/dpdp-baseline.ts`; tooling `scripts/regulatory-package.ts` |
| Registry | `backend/domain/src/registry/` (`principals`, `processing`, `notices`, `consent`, `processors`, `retention`, `connectors`, `organisation`) |
| Workflows and evidence | `backend/domain/src/operations/` (`runs`, `executor`, `evidence`, `bulk-import`, `breach`, `cases`, `attention`, `shared`) |
| API dispatch | `backend/api/src/operations-routes.ts`, wired from `backend/api/src/business.ts` |
| Connectors | `connectors/src/shared/connector-adapters.ts` (capability contract, manual adapter), `connectors/src/records-synthetic/records-adapter.ts` (TEST ADAPTER) |
| Background runner | `services/worker/src/operations-runner.ts` (`pnpm run operations:runner`, `--once` for a single pass) |
| Internal UI | `frontend/src/components/screens/privacy-operations/`, pages under `frontend/src/app/workspace/` (see §8) |
| Privacy Centre | `frontend/src/app/privacy/notices/`, request history on `frontend/src/app/privacy/rights/` |
| Tests | `tests/integration/operations/*.test.ts` (13 suites), `tests/unit/operations.test.ts`; fixtures `shared/testing/src/operations-fixture.ts`, `regulatory-fixture.ts`, `records-target.ts` |

## 3. Regulatory core

* A package is a signed claims document (Ed25519, verified with the installation's
  trusted release keys, the same trust used for V1 updates). Import requires
  `regulatory.manage`; approval requires a *different* super admin.
* A package governs time T when it is the latest APPROVED package whose
  `effective_from` ≤ T (ties broken by numeric version). Records are pinned to
  the package in force at their triggering time (breach awareness, rights
  request receipt, run creation) and keep that pin when a later package takes
  effect.
* `PRODUCTION` packages must cite only official Government of India hosts
  (`meity.gov.in`, `egazette.gov.in`, `indiacode.nic.in`, `dpdp.gov.in`) with
  every artifact retrieved and hashed. `TEST_FIXTURE` packages carry only
  fixture sources and are labelled as fixtures in the API, the evidence and the UI.
* Importing a package after another computes a requirement diff and creates an
  impact item per affected registry record; where the facts to decide are
  missing an `UNRESOLVED` impact item is created instead.
* Applicability is three-valued. `evaluateExpression` returns TRUE, FALSE or
  UNKNOWN; any unrecorded fact gives `UNRESOLVED`. Decisions are persisted with
  their inputs and trace, are append-only, and exemptions are new decisions that
  reference the original.

The baseline in `scripts/regulatory/dpdp-baseline.ts` encodes the DPDP Act 2023,
the DPDP Rules 2025 and the two commencement notifications (G.S.R. 843(E) and
844(E)) with phased commencement (2025-11-13, 2026-11-13, 2027-05-13). Its
`openVerificationItems` lists what could not be confirmed without the official
text (see §9).

## 4. Registry

People (`data_principals`) have references per system (`target_reference`, and a
keyed HMAC digest of any source identifier — the raw identifier is never
stored), and one or more relationship contexts (`data_principal_relationships`)
whose status and dates may be `UNKNOWN`. Activities are versioned; links
(principal/data categories, systems, notices, processors, retention rules) are
closed rather than deleted. History tables are append-only by trigger;
representatives and child status need `registry.sensitive.write` to record and
`registry.sensitive.read` to read, and a representative is verified by a
different person from the recorder.

## 5. Workflows, execution and verification

Every run has a kind, a status and counts that add up. Destructive runs
(erasure, anonymisation) stop at `DRY_RUN_READY` with a preview and a
`scope_hash`; approval needs `operations.approve`, a different person from the
creator, and the same `scope_hash`. Execution is batched; each action has an
idempotency key `digest({run_id, ordinal})`, and the target keeps a ledger so a
replay returns the recorded outcome instead of re-applying. Retries cover
`TARGET_UNAVAILABLE` and `TARGET_TIMEOUT` up to three attempts; a timeout is
resolved only by verification.

Action states (`pending`, `awaiting_approval`, `blocked`, `executing`,
`succeeded_unverified`, `verified`, `failed`, `inconclusive`, `cancelled`,
`not_supported`) are stored; the shared vocabulary (`requested` … `verified`) is
derived. `verified` is set only by a passing independent verification, enforced
in the contract.

Evidence records are append-only and carry a content digest where ORVIA controls
the bytes. A run's evidence package bundles run, package pin, applicability,
approvals, actions with verifications, holds, communications and evidence, with
an integrity digest.

## 6. Connectors

The capability contract declares what an adapter can do from its own code.
`MANUAL_ONLY` reports every action `NOT_SUPPORTED`. The only automated adapter
is `SYNTHETIC_RECORDS_TEST_ADAPTER`: it executes as `orvia_target_agent` and
verifies as `orvia_target_observer` by independent read-back against the
isolated synthetic records database. **It is a test adapter; no live customer
system connector exists in this repository.**

## 7. Background runner

`services/worker/src/operations-runner.ts` runs as each enrolled WORKER identity
(capabilities `workflow.execute`, `operations.execute`). Each pass: resumes
`PROCESSING` estate imports, `EVALUATING` runs, and `APPROVED`/`RUNNING` runs not
tied to a V1 rights request, each batch in its own transaction; then raises
due `DPDP_*` notifications. It never approves. Its database access to V1
notification tables is limited by policy to the `DPDP_OPERATIONS_ALERT` template,
`DPDP_*` tasks and their deliveries, and the state columns of rights requests.
Rights runs are executed by staff because settling them writes V1 outcomes.

## 8. Screens

| Page | Component |
| --- | --- |
| `/workspace/operations-attention` | Attention items, coverage ratios, notification sweep |
| `/workspace/operations-runs`, `/[id]` | Runs; dry-run preview, approval, batches, actions, evidence export, cancel |
| `/workspace/personal-data-breaches`, `/[id]` | Breaches, pinned package, tasks and deadlines, completion with evidence |
| `/workspace/data-principals` | People, references, contexts, per-context processing |
| `/workspace/processing-activities` | Activities with current version and factual gaps |
| `/workspace/registry-retention` | Retention rules (evaluate → run) and active holds (release) |
| `/workspace/processor-engagements` | Engagements, disposition state, sharing register |
| `/workspace/estate-imports` | Import jobs, checkpoint, errors, apply/replay |
| `/workspace/organisation-profile` | Profile; SDF obligations shown only when designated |
| `/workspace/regulatory`, `/applicability`, `/impacts` | Packages and approval, applicability, impact review |
| `/privacy/notices` | Published notices for the Data Principal |
| `/privacy/rights` | Adds each request's status history (no internal notes) |

Registry creation forms (purposes, activities, notices, rules, holds,
engagements) are API-first in this release: the screens read and act on
records, and records are created through the API or an estate import.

## 9. Limitations

* No official artifact has been downloaded or hashed in this environment, so no
  `PRODUCTION` package has been built. Every test uses `TEST_FIXTURE` packages.
  Building one is `scripts/regulatory-package.ts retrieve confirm:official-download`
  followed by `build`, and must be done with permission to download.
* Open verification items in the baseline: the commencement date (13 vs 14
  November 2025) against the Gazette text, corrigendum G.S.R. 892(E) not
  retrieved, and the Schedules not encoded as requirements.
* Only the synthetic TEST ADAPTER performs automated actions.
* Operations jobs use the database-checkpointed runner, not Temporal.
