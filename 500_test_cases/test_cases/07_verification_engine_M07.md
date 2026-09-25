# 07 — Verification Engine (M07)

Scope: independent observation, outcome claims, freshness, attestations vs observations, sampling.
References: PRD FR-M07-01..04; master §28, §44, §47, §49, §51, §169, §173; acceptance T20, T21.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-131 | API success but data remains | Adapter returns 200 for delete; target still holds row | 1) Run verification | Verification fails; action not verified; gap opened | P0 | FUNC | T20 |
| TC-132 | Observation expires | Verification with declared freshness window | 1) Advance past window | Freshness becomes stale; UI shows stale | P0 | FUNC | T21 |
| TC-133 | Material change invalidates freshness | Verified control; connector version changed | 1) Change connector/policy | Freshness invalidated; re-verification scheduled | P1 | FUNC | FR-M07-03 |
| TC-134 | Separate dimensions shown | Completed action | 1) View result | Configuration, capability, attempt, acknowledgement, observation, test and integrity shown separately; no single compliance score | P1 | UX | FR-M07-01 |
| TC-135 | Claim metadata complete | Outcome claim | 1) Inspect | Scope, method, time, source, versions, generation, consistency delay, validity, limitations present | P1 | FUNC | FR-M07-02 |
| TC-136 | One unobservable destination | Deletion across 4 systems; 1 has no read capability | 1) View claim | No "verified across all" claim; 3 verified, 1 unverified explicit | P0 | FUNC | M07 acceptance |
| TC-137 | Provider assertion is not observation | Processor confirms deletion by email | 1) Record confirmation | Stored as attributable assertion; not independent verification | P0 | FUNC | FR-M07-04 |
| TC-138 | Manual attestation contradicted | Manual attestation "deleted"; later observation shows data present | 1) Run observation | Contradiction flagged; gap reopened; both records retained | P0 | FUNC | M07 failure paths |
| TC-139 | Sampling cannot prove whole-population deletion | Verification by 5% sample | 1) View claim | Claim states sample and does not assert full population | P0 | FUNC | FR-M07-04 |
| TC-140 | Partial read | Verification read returns partial page | 1) Complete verification | Result partial, not satisfied | P0 | NEG | M07 failure paths |
| TC-141 | No verification permission | Connector lacks read | 1) Request verification | Explicit "unsupported verification", not pass | P0 | NEG | M06 acceptance |
| TC-142 | Metadata survives export and replay | Verified claim exported | 1) Export; 2) Re-import/validate | Method, generation, freshness preserved | P1 | FUNC | M07 acceptance |
| TC-143 | Observation fails reopens gap | Previously verified control | 1) Next scheduled observation fails | Gap reopened with owner | P1 | FUNC | FR-M07-03 |
| TC-144 | Consistency delay honoured | Target has eventual consistency window | 1) Verify immediately after action | Result pending until window elapses; not premature fail/pass | P1 | FUNC | FR-M07-02 |
| TC-145 | Verification of suppression (not deletion) | Marketing suppression applied | 1) Verify | Checks suppression effect specifically; does not claim data deletion | P1 | FUNC | FR-M15-03 |
