# Task board — generated from tracking/tasks.json

**W00 repository checkpoint; human integration pending.** Status counts: BLOCKED: 1; NOT_STARTED: 22.

One ticket at a time per coding lane. Start dependencies differ from acceptance dependencies. An unaccepted A00 proposal can be reviewed by W00; A00 acceptance still requires W00. P1 requires explicit core-green promotion. No task is marked complete by this document review.

| ID | Owner | Priority | Status | Task | Start after | Accept after | Tests |
|---|---|---|---|---|---|---|---|
| W00 | work | P0 | BLOCKED | Adopt scope and review bootstrap proposal | Immediately | Own evidence | Review deliverable |
| A00 | codex | P0 | NOT_STARTED | Inspect repository and create shared executable scaffold | Immediately | W00 | T01, T28 |
| C00 | cowork | P0 | NOT_STARTED | Prepare UX and leadership scenario | Immediately | Own evidence | Review deliverable |
| B00 | code | P0 | NOT_STARTED | Build UI shell from shared scaffold | A00 | C00 | Review deliverable |
| A01 | codex | P0 | NOT_STARTED | Auth, bootstrap, scoped relational persistence | A00 | Own evidence | T02, T03, T04, T05, T27 |
| B01 | code | P0 | NOT_STARTED | Real login and configuration screens | B00 | A01, A02 | T02, T05, T06, T29 |
| A02 | codex | P0 | NOT_STARTED | Versioned configuration and transactional consent | A01 | Own evidence | T06, T07, T08, T09, T10 |
| B02 | code | P0 | NOT_STARTED | Principal consent journey | B00 | A02 | T04, T07, T08, T29 |
| W01 | work | P0 | NOT_STARTED | Review authority and consent contracts | A00 | A01, A02 | T03, T04, T05, T08, T09 |
| A03 | codex | P0 | NOT_STARTED | Durable workflow and restricted CRM execution | A02 | Own evidence | T10, T11, T12, T13 |
| A04 | codex | P0 | NOT_STARTED | Policy enforcement and synthetic send admission | A03 | Own evidence | T14, T15, T16 |
| A05 | codex | P0 | NOT_STARTED | Uncertain effects, observations and local evidence | A03 | Own evidence | T13, T17, T18, T19, T20, T21, T22 |
| B03 | code | P0 | NOT_STARTED | Live workflow, failures, dashboard and evidence | B01, B02 | A03, A05 | T13, T17, T19, T20, T21, T22, T29 |
| C01 | cowork | P0 | NOT_STARTED | Capability truthfulness and operator runbook | C00 | A00, B00 | Review deliverable |
| A06 | codex | P0 | NOT_STARTED | Regression runner, recovery and security checks | A04, A05 | Own evidence | T03, T08, T09, T10, T11, T12, T14, T15, T16, T17, T18, T19, T20, T22, T23, T24, T25, T26, T27, T28 |
| B04 | code | P0 | NOT_STARTED | Test Lab and integrated browser acceptance | B03 | A04, A05, A06 | T14, T23, T24, T26, T27, T29 |
| W02 | work | P0 | NOT_STARTED | Cross-system correctness and security review | W01, A03 | A04, A05, A06, B04 | T11, T12, T14, T17, T18, T20, T24, T25, T26 |
| A08 | codex | P1 | NOT_STARTED | One explicitly promoted optional backend slice | A06 | W02 | T31, T32, T33, T34 |
| B05 | code | P1 | NOT_STARTED | UI for the selected optional slice | B04 | A08 | T31, T32, T33, T34 |
| A07 | codex | P0 | NOT_STARTED | Package and rerun frozen candidate | A06 | W02 | T01, T28, T30 |
| B06 | code | P0 | NOT_STARTED | Final UI fixes and candidate browser regression | B04 | A07 | T29, T30 |
| C02 | cowork | P0 | NOT_STARTED | Prepare evidence-backed presentation handover | C01 | A07, B06 | T30 |
| W03 | work | P0 | NOT_STARTED | Final acceptance decision and state consolidation | W02 | A07, B06, C02 | T30 |

## W00 — Adopt scope and review bootstrap proposal

**Owner:** work · **Status:** BLOCKED · **Accepted commit:** None recorded

Confirm current source/deadline/access facts; review one selected architecture and contract; record what remains unknown.

**Planned files:** `docs/decisions/ADR-001-prototype-profile.md`; `docs/reviews/work/W00_SCOPE_AND_CONTRACT.md`; `docs/reviews/work/W00_EVIDENCE.json`; `docs/prototype/SOURCE_ALIGNMENT.md`; `tracking/tasks.json`; `tracking/acceptance.json`; `docs/prototype/TASK_BOARD.md`; `CURRENT_STATE.md`; `handoffs/work/W00-96b8bd7.md`

**Evidence:** `docs/decisions/ADR-001-prototype-profile.md`; `docs/reviews/work/W00_SCOPE_AND_CONTRACT.md`; `docs/reviews/work/W00_EVIDENCE.json`; `handoffs/work/W00-96b8bd7.md`

## A00 — Inspect repository and create shared executable scaffold

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Preserve existing code; pin versions; start actual services; freeze exact schemas, auth/private interfaces and client generation; hand off base commit and UI file transfer.

**Planned files:** `package.json`; `pnpm-lock.yaml`; `packages/contracts/**`; `infrastructure/**`; `scripts/**`; `docs/engineering/REPOSITORY_INVENTORY.md`

**Evidence:** None recorded.

## C00 — Prepare UX and leadership scenario

**Owner:** cowork · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Define readable screens, state copy and synthetic scenario without waiting for backend; do not redesign shared contracts.

**Planned files:** `docs/prototype/UX_BRIEF.md`; `docs/prototype/DEMO_SCRIPT.md`; `docs/ux/ACCEPTANCE_JOURNEYS.md`

**Evidence:** None recorded.

## B00 — Build UI shell from shared scaffold

**Owner:** code · **Status:** NOT_STARTED · **Accepted commit:** None recorded

One reusable shell, status primitives, accessible loading/error/empty states; no second backend.

**Planned files:** `apps/web/src/app/layout.tsx`; `apps/web/src/app/workspace/**`; `apps/web/src/app/privacy/**`; `packages/ui/**`

**Evidence:** None recorded.

## A01 — Auth, bootstrap, scoped relational persistence

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Protected organisation bootstrap; staff/principal sessions, MFA and capabilities; tenant DB context and negative tests.

**Planned files:** `packages/auth/**`; `packages/authz/**`; `packages/db/**`; `apps/web/src/app/api/**`; `policy/admin/**`; `tests/security/**`

**Evidence:** None recorded.

## B01 — Real login and configuration screens

**Owner:** code · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Bind login/configuration forms and current identity to generated client; published states and permission denials real.

**Planned files:** `apps/web/src/app/workspace/**`; `tests/e2e/auth.spec.ts`; `tests/e2e/configuration.spec.ts`

**Evidence:** None recorded.

## A02 — Versioned configuration and transactional consent

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Purpose/notice/policy approval, principal/system mapping, consent aggregate/events/idempotency/outbox and receipts.

**Planned files:** `packages/domain/**`; `packages/db/migrations/**`; `apps/web/src/app/api/**`; `policy/processing/**`; `tests/integration/consent/**`

**Evidence:** None recorded.

## B02 — Principal consent journey

**Owner:** code · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Own choices/notice/history and grant/withdraw receipt with real persisted status and safe duplicate handling.

**Planned files:** `apps/web/src/app/privacy/**`; `tests/e2e/consent.spec.ts`

**Evidence:** None recorded.

## W01 — Review authority and consent contracts

**Owner:** work · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Review server scope, transaction/replay guarantees, role checks and API/UI compatibility; return bounded findings, no code takeover.

**Planned files:** `docs/reviews/work/AUTH_AND_CONSENT.md`; `CURRENT_STATE.md`

**Evidence:** None recorded.

## A03 — Durable workflow and restricted CRM execution

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Stable workflow and command identities; signed scopes; real CRM remove/read adapter; restart-safe outbox delivery.

**Planned files:** `apps/worker/**`; `apps/agent/**`; `packages/connectors/**`; `packages/db/**`; `tests/integration/workflows/**`

**Evidence:** None recorded.

## A04 — Policy enforcement and synthetic send admission

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Current-epoch send boundary, independent service fixture and fail-closed/queue degraded processing with tested ordering.

**Planned files:** `packages/policy-sdk/**`; `packages/authz/**`; `policy/processing/**`; `apps/demo-targets/**`; `tests/integration/enforcement/**`

**Evidence:** None recorded.

## A05 — Uncertain effects, observations and local evidence

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

REST fault/reconciliation, known failure/manual task, truthful aggregate status, separate observations and audited JSON export.

**Planned files:** `packages/domain/**`; `packages/connectors/**`; `apps/demo-targets/**`; `apps/web/src/app/api/**`; `tests/integration/evidence/**`

**Evidence:** None recorded.

## B03 — Live workflow, failures, dashboard and evidence

**Owner:** code · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Stateful timeline/table/details, real outcome counts, unresolved obligations and local export.

**Planned files:** `apps/web/src/app/workspace/**`; `packages/ui/**`; `tests/e2e/workflow.spec.ts`

**Evidence:** None recorded.

## C01 — Capability truthfulness and operator runbook

**Owner:** cowork · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Map full module vision to actual tested depth; record real setup commands only from engineering handoffs; prepare truthful question/answer notes.

**Planned files:** `tracking/capabilities.json`; `docs/runbooks/OPERATOR.md`; `docs/demo/CLAIMS_REGISTER.md`

**Evidence:** None recorded.

## A06 — Regression runner, recovery and security checks

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Allowlisted real assertions, broken-fixture detection, worker recovery, target quarantine restore, network/secret/input/command tests; fix failures.

**Planned files:** `packages/testing/**`; `tests/fault-fixtures/**`; `tests/integration/**`; `tests/security/**`; `tests/recovery/**`; `apps/web/src/app/api/**`

**Evidence:** None recorded.

## B04 — Test Lab and integrated browser acceptance

**Owner:** code · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Run actual allowed scenarios and display assertions; exercise complete UI and negative states; browser traffic evidence and regressions.

**Planned files:** `apps/web/src/app/workspace/**`; `tests/e2e/**`

**Evidence:** None recorded.

## W02 — Cross-system correctness and security review

**Owner:** work · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Read exact commit/results, challenge unknown/verified/recovery/egress claims, triage blockers and route fixes to owners.

**Planned files:** `docs/reviews/work/INTEGRATION_AND_SECURITY.md`; `CURRENT_STATE.md`

**Evidence:** None recorded.

## A08 — One explicitly promoted optional backend slice

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Only after core-green human promotion: choose one rights/retention/licence/help slice. Otherwise leave NOT_STARTED/OUT_OF_SPRINT.

**Planned files:** `packages/domain/**`; `apps/web/src/app/api/**`; `tests/integration/optional/**`

**Evidence:** None recorded.

## B05 — UI for the selected optional slice

**Owner:** code · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Bind only the promoted tested slice; do not create empty fake modules. Only its matching P1 test is required.

**Planned files:** `apps/web/src/app/workspace/**`; `apps/web/src/app/privacy/**`; `tests/e2e/optional.spec.ts`

**Evidence:** None recorded.

## A07 — Package and rerun frozen candidate

**Owner:** codex · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Record locked build/profile, real clean-start/bootstrap/seed/reset commands, package and raw test artifacts; no production signing claim.

**Planned files:** `scripts/**`; `infrastructure/**`; `artifacts/release-manifest.json`

**Evidence:** None recorded.

## B06 — Final UI fixes and candidate browser regression

**Owner:** code · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Fix only accepted issues after freeze; rerun candidate browser tests, capture actual screenshots and rehearsal artifacts.

**Planned files:** `apps/web/src/app/workspace/**`; `apps/web/src/app/privacy/**`; `packages/ui/**`; `tests/e2e/**`

**Evidence:** None recorded.

## C02 — Prepare evidence-backed presentation handover

**Owner:** cowork · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Assemble actual test/result links, limitations and recording index; optional website explanatory copy last; no automatic publishing.

**Planned files:** `docs/prototype/DEMO_SCRIPT.md`; `docs/prototype/RELEASE_CHECKLIST.md`; `docs/demo/LEADERSHIP_HANDOVER.md`

**Evidence:** None recorded.

## W03 — Final acceptance decision and state consolidation

**Owner:** work · **Status:** NOT_STARTED · **Accepted commit:** None recorded

Confirm exact candidate, all mandatory evidence, source/contract versions and limitations; recommend READY/PARTIAL/NOT_READY; human signs.

**Planned files:** `docs/reviews/work/FINAL_GATE_REPORT.md`; `CURRENT_STATE.md`

**Evidence:** None recorded.
