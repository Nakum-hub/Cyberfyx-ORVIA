# 25 — Audit Administration (M33)

Scope: attributable audit of sensitive changes, scoped audit access, append-only corrections, retention.
References: PRD FR-M33-01..04.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-449 | Sensitive mutations audited | Perform role grant, owner change, policy publish, connector scope change, support approval, export, licence import, update | 1) Inspect audit | Each has tenant/domain/actor/time/target | P0 | FUNC | FR-M33-01 |
| TC-450 | Audit tampering | DB-level edit of audit row | 1) Run integrity check | Detected | P0 | SEC | M33 failure paths |
| TC-451 | Wrong-tenant audit export | Auditor A requests B audit | 1) Export | Denied | P0 | SEC | FR-M33-03 |
| TC-452 | Missing actor | Event emitted without actor | 1) Write | Rejected or flagged; never silently anonymous | P1 | NEG | M33 failure paths |
| TC-453 | Audit reads of sensitive logs are audited | Auditor views sensitive audit | 1) Inspect meta-audit | Read recorded | P1 | FUNC | FR-M33-03 |
| TC-454 | Vendor cannot read local audit | Vendor staff | 1) Request local audit stream | Not available | P0 | SEC | FR-M33-02 |
| TC-455 | No member activity mirroring | Local user activity | 1) Inspect vendor profile | No member activity | P0 | SEC | FR-M33-02, VM-03 |
| TC-456 | Corrections append | Wrong audit annotation | 1) Correct | Appended correction; original retained | P1 | FUNC | FR-M33-03 |
| TC-457 | Revoked auditor access | Auditor revoked | 1) Use old session | Denied | P0 | SEC | M33 failure paths |
| TC-458 | Audit retention with payload minimisation | Retention expires for payload | 1) Purge | Envelope history remains truthful | P1 | FUNC | FR-M33-04 |
