# 19 — Coverage and Failure Center (M18)

Scope: coverage numerator/denominator, overlapping states, gaps with owners, runbook guidance limits.
References: PRD FR-M18-01..04; master coverage sections; acceptance T17, T18, V1-05, V1-06.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-375 | Coverage shows numerator, denominator, exclusions | 10 systems declared, 7 connected, 5 verified | 1) Open coverage | Figures shown with scope, timestamp and exclusions | P0 | FUNC | FR-M18-01 |
| TC-376 | Coverage drops on permission loss | Revoke read on one system | 1) Refresh | Coverage decreases; gap created | P0 | FUNC | M18 acceptance |
| TC-377 | Coverage drops on stale freshness | Observation expires | 1) Refresh | Coverage decreases; stale shown | P0 | FUNC | M18 acceptance |
| TC-378 | Unknown destinations not green | Unknown flow | 1) View dashboard | Unknown shown as unknown (not green/compliant) | P0 | UX | M18 acceptance |
| TC-379 | Overlapping state counts not summed | Items both manual and unverified | 1) View totals | Semantics of overlap stated; no misleading sum | P1 | UX | FR-M18-02 |
| TC-380 | No compliance score | Dashboard | 1) Inspect | No single "% compliant" score or certification badge | P0 | UX | M18 outcome, T63 |
| TC-381 | Gap has owner, severity, deadline | New gap | 1) View | Owner, severity, deadline, evidence-linked action present; missing owner flagged | P1 | FUNC | FR-M18-03 |
| TC-382 | Runbook guidance exact match | Known error code | 1) Open guidance | Shows reviewed runbook version; does not claim root cause | P1 | FUNC | V1-05, FR-M18-04 |
| TC-383 | Guidance has no match | Unknown error | 1) Open guidance | Explicit no-match; human help available; no generated fallback | P1 | FUNC | V1-06 |
| TC-384 | Guidance cannot close gap or ALLOW | Guidance matched | 1) Try "resolve" via guidance | Guidance cannot close action or create ALLOW | P0 | SEC | FR-M18-04 |
| TC-385 | Filters and totals consistent | Filter by subtenant/system | 1) Compare list count vs total | Same scope/filters; stated whether total/filtered/sampled | P2 | FUNC | DATA_MODEL pagination |
| TC-386 | Failed test surfaces as gap | Privacy test FAIL | 1) View failure center | Gap linked to test run and control | P1 | FUNC | FR-M18-03 |
