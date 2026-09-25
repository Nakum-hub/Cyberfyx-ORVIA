# Build Order

This file defines implementation order only. It is not a planning deliverable and does not replace coding.

## Phase 1 — repository integration foundation
Inspect the completed V1 and map the existing canonical entities/services that will be reused. Implement schema extensions and migrations required by the Domain Data Model. Add shared enums/state contracts without breaking current V1.

## Phase 2 — regulatory and domain backend
Implement the DPDP Regulatory Core, Data & Processing Registry, Data Principal relationships, processing activities, purposes, conditions, notices, consent event model, retention structures, processor relationships, evidence links, and applicability/unknown-state handling.

## Phase 3 — operational backend workflows
Implement rights/grievance cases, consent withdrawal enforcement, retention evaluation and erasure orchestration, correction propagation, breach operations, deadlines/timers, Coverage/Failure, Attention, notifications, and SDF-gated workflows.

## Phase 4 — connector execution and verification
Implement/extend connector capability declarations, downstream action execution, retries/idempotency, independent verification states, partial-failure handling, and evidence production.

## Phase 5 — frontend and Privacy Centre
Implement internal operational surfaces and the configured external Privacy Centre using the real backend contracts. Include truthful unknown/partial/failure states and dangerous-action safeguards.

## Phase 6 — existing-data migration/backfill
Implement resumable/importable existing-data onboarding, unknown/missing-evidence preservation, relationship/context mapping, source references, batch safety, and migration from the finished V1 data model.

## Phase 7 — integrated validation
After coding is complete and wired together, execute the stage-gated testing in `quality/TESTING_STRATEGY_AND_RELEASE_ACCEPTANCE.md`. Fix failures without repeatedly rerunning unaffected expensive suites.

## Phase 8 — final release verification
Run the final V1 regression, security, migration, evidence, performance, and production-build gates. Produce the implementation report from actual results.
