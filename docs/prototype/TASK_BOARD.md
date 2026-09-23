# Task board — generated from tracking/tasks.json

Status counts: BLOCKED: 4; COMPLETED: 9; IN_REVIEW: 1; NOT_STARTED: 9.

| ID | Owner | Priority | Status | Task | Start after | Accept after | Tests |
|---|---|---|---|---|---|---|---|
| W00 | work | P0 | COMPLETED | Adopt scope and review bootstrap proposal | Immediately | Own evidence | Review deliverable |
| A00 | codex | P0 | COMPLETED | Inspect repository and create shared executable scaffold | Immediately | W00 | T01, T28 |
| C00 | work | P0 | IN_REVIEW | Prepare UX and leadership scenario | Immediately | Own evidence | Review deliverable |
| B00 | codex | P0 | NOT_STARTED | Build UI shell from shared scaffold | A00 | C00 | Review deliverable |
| A01 | codex | P0 | COMPLETED | Auth, bootstrap, scoped relational persistence | A00 | Own evidence | T02, T03, T04, T05, T27 |
| B01 | codex | P0 | NOT_STARTED | Real login and configuration screens | B00 | A01, A02 | T02, T05, T06, T29 |
| A02 | codex | P0 | COMPLETED | Versioned configuration and transactional consent | A01 | Own evidence | T06, T07, T08, T09, T10 |
| B02 | codex | P0 | NOT_STARTED | Principal consent journey | B00 | A02 | T04, T07, T08, T29 |
| W01 | work | P0 | COMPLETED | Review authority and consent contracts | A00 | A01, A02 | T03, T04, T05, T08, T09 |
| A03 | codex | P0 | COMPLETED | Durable workflow and restricted CRM execution | A02 | Own evidence | T10, T11, T12, T13 |
| A04 | codex | P0 | COMPLETED | Policy enforcement and synthetic send admission | A03 | Own evidence | T14, T15, T16 |
| A05 | codex | P0 | COMPLETED | Uncertain effects, observations and local evidence | A03 | Own evidence | T13, T17, T18, T19, T20, T21, T22 |
| B03 | codex | P0 | NOT_STARTED | Live workflow, failures, dashboard and evidence | B01, B02 | A03, A05 | T13, T17, T19, T20, T21, T22, T29 |
| C01 | work | P0 | BLOCKED | Capability truthfulness and operator runbook | C00 | A00, B00 | Review deliverable |
| A06 | codex | P0 | COMPLETED | Regression runner, recovery and security checks | A04, A05 | Own evidence | T03, T08, T09, T10, T11, T12, T14, T15, T16, T17, T18, T19, T20, T22, T23, T24, T25, T26, T27, T28 |
| B04 | codex | P0 | NOT_STARTED | Test Lab and integrated browser acceptance | B03 | A04, A05, A06 | T14, T23, T24, T26, T27, T29 |
| W02 | work | P0 | BLOCKED | Cross-system correctness and security review | W01, A03 | A04, A05, A06, B04 | T11, T12, T14, T17, T18, T20, T24, T25, T26 |
| A08 | codex | P1 | NOT_STARTED | One explicitly promoted optional backend slice | A06 | W02 | T31, T32, T33, T34 |
| B05 | codex | P1 | NOT_STARTED | UI for the selected optional slice | B04 | A08 | T31, T32, T33, T34 |
| A07 | codex | P0 | NOT_STARTED | Package and rerun frozen candidate | A06 | W02 | T01, T28, T30 |
| B06 | codex | P0 | NOT_STARTED | Final UI fixes and candidate browser regression | B04 | A07 | T29, T30 |
| C02 | work | P0 | BLOCKED | Prepare evidence-backed presentation handover | C01 | A07, B06 | T30 |
| W03 | work | P0 | BLOCKED | Final acceptance decision and state consolidation | W02 | A07, B06, C02 | T30 |

## W00 — Adopt scope and review bootstrap proposal

**Owner:** work · **Status:** COMPLETED · **Accepted commit:** 425f079bc74e897d8ee97fa56faeea50e42ac46f

Confirm current source/deadline/access facts; review one selected architecture and contract; record what remains unknown.

**Planned files:** `docs/decisions/ADR-001-prototype-profile.md`; `docs/reviews/work/W00_SCOPE_AND_CONTRACT.md`; `docs/reviews/work/W00_EVIDENCE.json`; `docs/prototype/SOURCE_ALIGNMENT.md`; `tracking/tasks.json`; `tracking/acceptance.json`; `docs/prototype/TASK_BOARD.md`; `CURRENT_STATE.md`; `handoffs/work/W00-96b8bd7.md`; `docs/reviews/work/W00_A00_ACCEPTANCE.md`; `docs/reviews/work/artifacts/W00-A00-58ceddc/**`; `docs/reviews/work/repro/W00-A00-source-audit.py`; `docs/prototype/CONTRACT.md`; `docs/prototype/FILE_OWNERSHIP.md`; `docs/prototype/ACCEPTANCE.md`; `handoffs/TEMPLATE.md`; `handoffs/work/W00-58ceddc.md`

**Evidence:** `docs/decisions/ADR-001-prototype-profile.md`; `docs/reviews/work/W00_SCOPE_AND_CONTRACT.md`; `docs/reviews/work/W00_EVIDENCE.json`; `handoffs/work/W00-96b8bd7.md`; `docs/reviews/work/W00_A00_ACCEPTANCE.md`; `docs/reviews/work/artifacts/W00-A00-58ceddc/F07-retest.json`; `docs/reviews/work/artifacts/W00-A00-58ceddc/source-audit.json`; `handoffs/work/W00-58ceddc.md`

## A00 — Inspect repository and create shared executable scaffold

**Owner:** codex · **Status:** COMPLETED · **Accepted commit:** 58ceddcd73b9b9f0717553bbd1e2fff3f7389abe

Preserve existing code; pin versions; start actual services; freeze exact schemas, auth/private interfaces and client generation; hand off base commit and UI file transfer.

**Planned files:** `package.json`; `pnpm-lock.yaml`; `shared/contracts/**`; `infrastructure/**`; `scripts/**`; `docs/engineering/REPOSITORY_INVENTORY.md`

**Evidence:** `handoffs/codex/A00-e5cdef3.md`; `handoffs/codex/A00-publication.json`; `handoffs/codex/A00-command-index.json`; `docs/engineering/REPOSITORY_INVENTORY.md`; `docs/engineering/executable-contract-proposal.md`; `handoffs/codex/A00-F07-e839b1a.md`; `handoffs/codex/A00-F07-results.json`; `docs/reviews/work/W00_A00_ACCEPTANCE.md`; `docs/reviews/work/artifacts/W00-A00-58ceddc/F07-retest.json`; `docs/reviews/work/artifacts/W00-A00-58ceddc/unit.json`; `docs/reviews/work/artifacts/W00-A00-58ceddc/source-audit.json`

## C00 — Prepare UX and leadership scenario

**Owner:** work · **Status:** IN_REVIEW · **Accepted commit:** None recorded

Define readable screens, state copy and synthetic scenario without waiting for backend; do not redesign shared contracts.

**Planned files:** `docs/prototype/UX_BRIEF.md`; `docs/prototype/DEMO_SCRIPT.md`; `docs/ux/ACCEPTANCE_JOURNEYS.md`

**Evidence:** `handoffs/work/C00-C02-r4-delivery.md`

## B00 — Build UI shell from shared scaffold

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

One reusable shell, status primitives, accessible loading/error/empty states; no second backend.

**Planned files:** `frontend/src/app/layout.tsx`; `frontend/src/app/workspace/**`; `frontend/src/app/privacy/**`; `packages/ui/**`

**Evidence:** None recorded

## A01 — Auth, bootstrap, scoped relational persistence

**Owner:** codex · **Status:** COMPLETED · **Accepted commit:** 50cb4daeded9253c4f7cca4f742cb212c10aa5b7

Protected organisation bootstrap; staff/principal sessions, MFA and capabilities; tenant DB context and negative tests.

**Planned files:** `backend/auth/**`; `backend/authorization/**`; `database/customer/**`; `frontend/src/app/api/**`; `policy/admin/**`; `tests/security/**`

**Evidence:** `handoffs/codex/A01-publication.json`; `docs/reviews/work/AUTH_AND_CONSENT.md`; `docs/reviews/work/W01_A01_EVIDENCE.json`; `handoffs/work/W01-A01-50cb4da.md`

## B01 — Real login and configuration screens

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Bind login/configuration forms and current identity to generated client; published states and permission denials real.

**Planned files:** `frontend/src/app/workspace/**`; `tests/e2e/auth.spec.ts`; `tests/e2e/configuration.spec.ts`

**Evidence:** None recorded

## A02 — Versioned configuration and transactional consent

**Owner:** codex · **Status:** COMPLETED · **Accepted commit:** 3242521e59966885d8053747a82d96cb92ea55d5

Purpose/notice/policy approval, principal/system mapping, consent aggregate/events/idempotency/outbox and receipts.

**Planned files:** `backend/domain/**`; `database/customer/migrations/**`; `frontend/src/app/api/**`; `policy/processing/**`; `tests/integration/consent/**`

**Evidence:** `handoffs/codex/A02-publication.json`; `docs/reviews/work/W01_A02_REVIEW.md`; `docs/reviews/work/W01_A02_EVIDENCE.json`; `handoffs/work/W01-A02-a5b6ff7.md`; `handoffs/codex/artifacts/A07-consent-integration-1789645869949-967a9fd6-3087-45da-9b39-0c8e54ae981d.json`; `handoffs/codex/artifacts/A07-expiry-integration-1789646017958-1f369060-4bc5-4689-8500-3fcf40b1045b.json`; `handoffs/work/final-prototype-continuation/W01-consolidated-review.md`

## B02 — Principal consent journey

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Own choices/notice/history and grant/withdraw receipt with real persisted status and safe duplicate handling.

**Planned files:** `frontend/src/app/privacy/**`; `tests/e2e/consent.spec.ts`

**Evidence:** None recorded

## W01 — Review authority and consent contracts

**Owner:** work · **Status:** COMPLETED · **Accepted commit:** 81431d64afb8dd613c96d942402d8c0d8cc07ac0

Review server scope, transaction/replay guarantees, role checks and API/UI compatibility; return bounded findings, no code takeover.

**Planned files:** `docs/reviews/work/AUTH_AND_CONSENT.md`; `CURRENT_STATE.md`; `docs/reviews/work/W01_A01_CODEX_NEXT.md`; `docs/reviews/work/W01_A01_EVIDENCE.json`; `docs/reviews/work/artifacts/W01-A01-50cb4da/**`; `docs/reviews/work/repro/W01-A01-source-audit.py`; `handoffs/work/W01-A01-50cb4da.md`; `tracking/tasks.json`; `tracking/acceptance.json`; `docs/prototype/TASK_BOARD.md`; `docs/prototype/ACCEPTANCE.md`; `docs/prototype/CONTRACT.md`; `docs/reviews/work/W01_A02_REVIEW.md`; `docs/reviews/work/W01_A02_CODEX_FIX.md`; `docs/reviews/work/W01_A02_EVIDENCE.json`; `docs/reviews/work/artifacts/W01-A02-a5b6ff7/**`; `docs/reviews/work/repro/W01-A02-source-audit.py`; `docs/reviews/work/repro/W01-A02-F01-expiry.sql`; `handoffs/work/W01-A02-a5b6ff7.md`; `handoffs/work/W01-preparation-a5b6ff7.md`; `docs/reviews/work/W01_W03_PREPARATION.json`; `docs/reviews/work/WORK_REVIEW_QUEUE.md`; `docs/reviews/work/repro/W01-W03-document-check.py`; `docs/reviews/work/artifacts/W01-W03-preparation-a5b6ff7/**`

**Evidence:** `docs/reviews/work/AUTH_AND_CONSENT.md`; `docs/reviews/work/W01_A01_EVIDENCE.json`; `handoffs/work/W01-A01-50cb4da.md`; `docs/reviews/work/W01_A02_REVIEW.md`; `docs/reviews/work/W01_A02_EVIDENCE.json`; `handoffs/work/W01-A02-a5b6ff7.md`; `handoffs/work/W01-preparation-a5b6ff7.md`; `docs/reviews/work/W01_W03_PREPARATION.json`; `handoffs/work/final-prototype-continuation/W01-consolidated-review.md`; `handoffs/work/final-prototype-continuation/T01-T30-reconciliation.md`; `handoffs/codex/artifacts/A07-auth-security-1789645754389-e1e3e132-9c26-4b6d-b878-c4e5b976e732.json`; `handoffs/codex/artifacts/A07-tls-integration-1789646809053-59dbc67f-e9e8-4344-bf56-442cf000284a.json`

## A03 — Durable workflow and restricted CRM execution

**Owner:** codex · **Status:** COMPLETED · **Accepted commit:** 034100943f2c2f2b8e8934921501093746962b9b

Stable workflow and command identities; signed scopes; real CRM remove/read adapter; restart-safe outbox delivery.

**Planned files:** `services/worker/**`; `services/agent/**`; `connectors/**`; `database/customer/**`; `tests/integration/workflows/**`

**Evidence:** `handoffs/codex/A02-A07-continuation.md`; `docs/reviews/work/W01_A02_EVIDENCE.json`; `handoffs/codex/artifacts/A07-workflow-integration-1789646136254-11016705-c854-42a4-8acb-b58c356f1873.json`; `handoffs/work/final-prototype-continuation/W02-consolidated-review.md`

## A04 — Policy enforcement and synthetic send admission

**Owner:** codex · **Status:** COMPLETED · **Accepted commit:** 94d3e72298bd8b3571d95425c3288ae4781ae418

Current-epoch send boundary, independent service fixture and fail-closed/queue degraded processing with tested ordering.

**Planned files:** `backend/policy-sdk/**`; `backend/authorization/**`; `policy/processing/**`; `services/synthetic-target/**`; `tests/integration/enforcement/**`

**Evidence:** `handoffs/codex/artifacts/A07-send-enforcement-1789646240320-8a3a2988-2905-4e96-9af7-dcebdfdc3c09.json`; `handoffs/work/final-prototype-continuation/W02-consolidated-review.md`

## A05 — Uncertain effects, observations and local evidence

**Owner:** codex · **Status:** COMPLETED · **Accepted commit:** d94f525e19d6eaab0999b838a3ac9debef9860a9

REST fault/reconciliation, known failure/manual task, truthful aggregate status, separate observations and audited JSON export.

**Planned files:** `backend/domain/**`; `connectors/**`; `services/synthetic-target/**`; `frontend/src/app/api/**`; `tests/integration/evidence/**`

**Evidence:** `handoffs/codex/artifacts/A07-evidence-integration-1789645594362-18028a06-424b-43bf-8363-b2358bb7f8f4.json`; `handoffs/work/final-prototype-continuation/W02-consolidated-review.md`

## B03 — Live workflow, failures, dashboard and evidence

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Stateful timeline/table/details, real outcome counts, unresolved obligations and local export.

**Planned files:** `frontend/src/app/workspace/**`; `packages/ui/**`; `tests/e2e/workflow.spec.ts`

**Evidence:** None recorded

## C01 — Capability truthfulness and operator runbook

**Owner:** work · **Status:** BLOCKED · **Accepted commit:** None recorded

Map full module vision to actual tested depth; record real setup commands only from engineering handoffs; prepare truthful question/answer notes.

**Planned files:** `tracking/capabilities.json`; `docs/runbooks/OPERATOR.md`; `docs/demo/CLAIMS_REGISTER.md`

**Evidence:** `handoffs/work/C00-C02-r4-delivery.md`

## A06 — Regression runner, recovery and security checks

**Owner:** codex · **Status:** COMPLETED · **Accepted commit:** 3c2ee18f568cebb3c4add734c6c94a3f68e2c692

Allowlisted real assertions, broken-fixture detection, worker recovery, target quarantine restore, network/secret/input/command tests; fix failures.

**Planned files:** `shared/testing/**`; `tests/fault-fixtures/**`; `tests/integration/**`; `tests/security/**`; `tests/recovery/**`; `frontend/src/app/api/**`

**Evidence:** `handoffs/codex/artifacts/A07-regression-integration-1789646604777-caac7f33-7580-4dc2-ac9c-171ab199070e.json`; `handoffs/codex/artifacts/A07-network-qualification-1789649464712-61fc22c5-8651-4fd8-9679-cf7e0b0aef05.json`; `handoffs/work/final-prototype-continuation/W02-consolidated-review.md`

## B04 — Test Lab and integrated browser acceptance

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Run actual allowed scenarios and display assertions; exercise complete UI and negative states; browser traffic evidence and regressions.

**Planned files:** `frontend/src/app/workspace/**`; `tests/e2e/**`

**Evidence:** None recorded

## W02 — Cross-system correctness and security review

**Owner:** work · **Status:** BLOCKED · **Accepted commit:** None recorded

Read exact commit/results, challenge unknown/verified/recovery/egress claims, triage blockers and route fixes to owners.

**Planned files:** `docs/reviews/work/INTEGRATION_AND_SECURITY.md`; `CURRENT_STATE.md`; `handoffs/work/W02-preparation-a5b6ff7.md`; `docs/reviews/work/W01_W03_PREPARATION.json`; `docs/reviews/work/WORK_REVIEW_QUEUE.md`; `docs/reviews/work/repro/W01-W03-document-check.py`; `docs/reviews/work/artifacts/W01-W03-preparation-a5b6ff7/**`; `tracking/tasks.json`; `tracking/acceptance.json`; `docs/prototype/TASK_BOARD.md`; `docs/prototype/ACCEPTANCE.md`

**Evidence:** `docs/reviews/work/INTEGRATION_AND_SECURITY.md`; `handoffs/work/W02-preparation-a5b6ff7.md`; `docs/reviews/work/W01_W03_PREPARATION.json`; `handoffs/work/final-prototype-continuation/W02-consolidated-review.md`; `handoffs/work/final-prototype-continuation/T01-T30-reconciliation.md`

## A08 — One explicitly promoted optional backend slice

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Only after core-green human promotion: choose one rights/retention/licence/help slice. Otherwise leave NOT_STARTED/OUT_OF_SPRINT.

**Planned files:** `backend/domain/**`; `frontend/src/app/api/**`; `tests/integration/optional/**`

**Evidence:** None recorded

## B05 — UI for the selected optional slice

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Bind only the promoted tested slice; do not create empty fake modules. Only its matching P1 test is required.

**Planned files:** `frontend/src/app/workspace/**`; `frontend/src/app/privacy/**`; `tests/e2e/optional.spec.ts`

**Evidence:** None recorded

## A07 — Package and rerun frozen candidate

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Record locked build/profile, real clean-start/bootstrap/seed/reset commands, package and raw test artifacts; no production signing claim.

**Planned files:** `scripts/**`; `infrastructure/**`; `artifacts/release-manifest.json`

**Evidence:** None recorded

## B06 — Final UI fixes and candidate browser regression

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Fix only accepted issues after freeze; rerun candidate browser tests, capture actual screenshots and rehearsal artifacts.

**Planned files:** `frontend/src/app/workspace/**`; `frontend/src/app/privacy/**`; `packages/ui/**`; `tests/e2e/**`

**Evidence:** None recorded

## C02 — Prepare evidence-backed presentation handover

**Owner:** work · **Status:** BLOCKED · **Accepted commit:** None recorded

Assemble actual test/result links, limitations and recording index; optional website explanatory copy last; no automatic publishing.

**Planned files:** `docs/prototype/DEMO_SCRIPT.md`; `docs/prototype/RELEASE_CHECKLIST.md`; `docs/demo/LEADERSHIP_HANDOVER.md`

**Evidence:** `handoffs/work/C00-C02-r4-delivery.md`

## W03 — Final acceptance decision and state consolidation

**Owner:** work · **Status:** BLOCKED · **Accepted commit:** None recorded

Confirm exact candidate, all mandatory evidence, source/contract versions and limitations; recommend READY/PARTIAL/NOT_READY; human signs.

**Planned files:** `docs/reviews/work/FINAL_GATE_REPORT.md`; `CURRENT_STATE.md`; `handoffs/work/W03-preparation-a5b6ff7.md`; `docs/reviews/work/W01_W03_PREPARATION.json`; `docs/reviews/work/WORK_REVIEW_QUEUE.md`; `docs/reviews/work/repro/W01-W03-document-check.py`; `docs/reviews/work/artifacts/W01-W03-preparation-a5b6ff7/**`; `tracking/tasks.json`; `tracking/acceptance.json`; `docs/prototype/TASK_BOARD.md`; `docs/prototype/ACCEPTANCE.md`

**Evidence:** `docs/reviews/work/FINAL_GATE_REPORT.md`; `handoffs/work/W03-preparation-a5b6ff7.md`; `docs/reviews/work/W01_W03_PREPARATION.json`
