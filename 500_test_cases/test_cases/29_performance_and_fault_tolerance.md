# 29 — Performance and Fault Tolerance

Scope: benchmark illustrative targets, contention, target slowdown, pool/spool/disk pressure.
References: PRD NFR-06, NFR-09; TEST_AND_ACCEPTANCE layer "Performance/fault".
All cases start **NOT_RUN**. NFR-06 figures are illustrative targets, not SLAs; always record hardware and workload.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-495 | Control-plane latency | Defined workload/hardware | 1) Benchmark | Report measured p95 against illustrative <500 ms | P2 | PERF | NFR-06 |
| TC-496 | Marketing propagation latency | Connected marketing target | 1) Withdraw 1,000 principals; 2) Measure until send blocked | Report p95 against illustrative <30 s | P1 | PERF | NFR-06 |
| TC-497 | Consent spike | 10x normal grant/withdraw load | 1) Run | No lost events; monotonic state; backlog visible | P1 | PERF | NFR-02 |
| TC-498 | Target slowdown | Connector target latency 10x | 1) Run workflows | Rate limiting/circuit breaker protect target; queues visible | P1 | PERF | NFR-09 |
| TC-499 | DB pool exhaustion | Constrain pool | 1) Load | Graceful queuing/errors; no cross-tenant leakage | P0 | PERF | T02 |
| TC-500 | Chaos: random process kills | Run 1 hour with random kills | 1) Compare final state to expected | No lost accepted work; no duplicate destructive effects; unknowns reconciled | P0 | REC | NFR-02 |
