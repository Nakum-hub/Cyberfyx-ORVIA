# 09 — Privacy Test Engine (M09)

Scope: product-side synthetic privacy tests, assertions, fixtures, production safety, scheduling, CI output.
References: PRD FR-M09-01..04; master §57–61, §125, §193; acceptance T27, T35, BUILD-15.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-166 | Seeded regression permits marketing send | Synthetic control deliberately broken | 1) Run marketing-withdrawal test | Test FAIL, traced to affected control/boundary | P0 | FUNC | T27, BUILD-15 |
| TC-167 | Repair passes only after rerun | TC-166 failing | 1) Fix control; 2) Rerun | PASS only on fresh execution; old FAIL retained | P0 | FUNC | BUILD-15 |
| TC-168 | Control FAIL vs detector success separate | Broken control detected | 1) View result | Control = FAIL, detection = worked; not merged | P1 | FUNC | FR-M09-02 |
| TC-169 | Interrupted runner | Kill runner mid-test | 1) View result | ERROR/INTERRUPTED distinct from FAIL/PASS; cleanup status shown | P1 | REC | BUILD-15 |
| TC-170 | Destructive test targets production | Test scoped to production records | 1) Run | Blocked without explicit approved test scope | P0 | SEC | T35 |
| TC-171 | Only synthetic identities | Fixture includes a real-looking identity not marked synthetic | 1) Run | Rejected; synthetic markers required | P0 | SEC | FR-M09-03 |
| TC-172 | Expected vs actual per assertion | Any run | 1) Inspect result | Each assertion has expected, actual, build, fixture identity | P1 | FUNC | FR-M09-02 |
| TC-173 | Cleanup failure | Cleanup step fails | 1) Run | Cleanup failure reported; fixture lease not silently released | P1 | NEG | M09 failure paths |
| TC-174 | Scheduled runs and history | Schedule daily | 1) Let 3 runs execute; 2) Query history | History queryable with trends; no invented pass rate | P2 | FUNC | FR-M09-04 |
| TC-175 | Machine-readable CI output | CI integration | 1) Run via CLI | Structured output; non-zero exit on FAIL/ERROR | P1 | FUNC | FR-M09-04 |
| TC-176 | Stale test contract | Test definition for an old policy version | 1) Run | Flagged stale; not reported as valid pass | P1 | NEG | M09 failure paths |
| TC-177 | Resource budget enforced | Test with large synthetic volume | 1) Run over budget | Stopped at budget; reported | P2 | SEC | FR-M09-03 |
