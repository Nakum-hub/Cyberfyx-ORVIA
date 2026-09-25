# 24 — Monitoring, Backup and Restore (M32)

Scope: local health/metrics, business readiness, backup under customer keys, restore quarantine and reconciliation.
References: PRD FR-M32-01..04, NFR-07; acceptance T30, T33, T53, BUILD-19, VM-23.
All cases start **NOT_RUN**. RPO/RTO are measured, not assumed.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-439 | Liveness vs readiness vs business readiness | Policy service down | 1) Check health endpoints | Liveness ok; readiness/business readiness report degraded | P1 | FUNC | FR-M32-01 |
| TC-440 | Business metrics | Load | 1) View monitoring | Propagation lag, oldest unresolved work, queue saturation, freshness, storage, backup status | P1 | FUNC | FR-M32-02 |
| TC-441 | Logs minimise secrets/payload | Run workflows with canaries | 1) Grep logs | No secrets, tokens or canary personal data | P0 | SEC | FR-M32-01 |
| TC-442 | Backup under customer keys | Backup configured | 1) Backup; 2) Inspect destination and keys | Customer-controlled storage/keys; no vendor upload | P0 | SEC | T53 |
| TC-443 | Disaster restore measured | Full restore drill | 1) Restore | Measured RPO/RTO recorded; consent/evidence reconciled before traffic | P0 | REC | T30 |
| TC-444 | Stale restore after withdrawal/role revocation | Snapshot older than a withdrawal and role revocation | 1) Restore | Quarantine; no resurrected access/processing until reconciled | P0 | REC | BUILD-19 |
| TC-445 | Restore from config with excluded features | Old config enables diagnostics rule | 1) Restore/upgrade | Excluded features stay disabled; identity state reconciled | P0 | SEC | VM-23 |
| TC-446 | Disk full | Fill disk | 1) Continue operations | Safe failure; accepted work not corrupted; alert | P1 | REC | M32 failure paths |
| TC-447 | Secret store unavailable | Stop secret store | 1) Run connectors | Fail closed with clear error; no plaintext fallback | P0 | REC | M32 failure paths |
| TC-448 | Vendor sees no customer telemetry | Run full workflows | 1) Inspect vendor observability | No operational canary; vendor shows only own service health | P0 | SEC | FR-M32-04 |
