# 22 — Support Bundle System (M30)

Scope: fixed-schema diagnostics, preview and digest-bound approval, vendor ingress validation, no remote access, case closure vs local verification.
References: PRD FR-M30-01..04; acceptance T51, T52, SUP-01..10, VM-06..10, BUILD-08, BUILD-09.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-417 | Diagnostic with principal reference | Draft includes principal ID/hostname/log | 1) Validate | Blocked locally; nothing sent | P0 | SEC | SUP-02, T51 |
| TC-418 | Hidden canary field | Draft with extra hidden field | 1) Validate | Blocked before egress | P0 | SEC | BUILD-08 |
| TC-419 | Payload changed after approval | Approved report edited | 1) Send | Digest mismatch; fresh approval required | P0 | SEC | SUP-03, VM-06 |
| TC-420 | Destination changed after approval | Approved report, new destination | 1) Send | Blocked; fresh approval | P0 | SEC | VM-06 |
| TC-421 | Legitimate minimal report | Valid report | 1) Approve and send | Only permitted fields reach assigned vendor case | P1 | FUNC | SUP-04 |
| TC-422 | Vendor ingress rejects unknown fields | Crafted request to vendor ingress | 1) Send oversized/unknown fields | Rejected without logging body | P0 | SEC | FR-M30-03 |
| TC-423 | No remote session | Request remote screen/SSH/SQL/tunnel | 1) Attempt enabling via API/config/licence | Not available anywhere | P0 | SEC | T52, VM-08, BUILD-09 |
| TC-424 | Proactive signals out of scope | Restore config with scheduled diagnostics | 1) Start | No scheduled transmission; each report needs approval | P0 | SEC | SUP-07 |
| TC-425 | Vendor case closure does not verify local action | Case resolved | 1) View local gap | Gap still open/unverified | P0 | FUNC | SUP-09, VM-09 |
| TC-426 | Signed patch applied by customer | Vendor assigns fix | 1) Customer verifies and applies | Customer approval required; vendor cannot execute | P1 | FUNC | SUP-05 |
| TC-427 | Offline customer status | No report received | 1) Vendor console | "Not reported/stale", not healthy | P1 | UX | SUP-01, VM-05 |
| TC-428 | Vendor admin opens unassigned case | Case assigned elsewhere | 1) Open | Denied | P1 | SEC | ROLE-02, VM-02 |
