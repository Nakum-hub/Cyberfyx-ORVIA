# 20 — Billing, Licensing and Entitlements (M26, M27, M28)

Scope: server-side pricing, verified payment callbacks, signed licences, offline import, continuity on expiry, entitlement layering.
References: PRD FR-M26-01..04, FR-M27-01..04, FR-M28-01..04; acceptance T29, T41, T45, T46, T55, BUILD-16, BUILD-17, UX-16, V1-03.
All cases start **NOT_RUN**. Commercial terms, durations and limits are OPEN owner decisions — tests use whatever the approved catalogue says.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-387 | Server-side pricing | Test checkout | 1) Tamper price/edition in browser request | Server recalculates from approved catalogue; tampered value ignored | P0 | SEC | FR-M26-02 |
| TC-388 | Browser redirect is not payment proof | Checkout | 1) Hit success URL without payment | No paid state, no entitlement | P0 | SEC | BUILD-16 |
| TC-389 | Forged payment callback | Unsigned/wrong-signature webhook | 1) Send | Rejected; no entitlement | P0 | SEC | BUILD-16 |
| TC-390 | Duplicate/out-of-order callbacks | Paid, then duplicate paid, then late pending | 1) Deliver | One transition; one licence; late pending doesn't regress state | P0 | CONC | FR-M26-03 |
| TC-391 | No client-record collection in billing | Checkout | 1) Inspect vendor DB fields | Only business account, contacts, subscription, invoice, payment refs | P0 | SEC | FR-M26-01, T41 |
| TC-392 | Licence schema strict | Licence with extra field containing canary/command | 1) Import | Rejected; no vendor request-body retention | P0 | SEC | T46, FR-M27-02 |
| TC-393 | Wrong signer | Licence signed by other key | 1) Import | Rejected | P0 | SEC | FR-M27-02 |
| TC-394 | Replayed older entitlement | Old licence re-imported after upgrade | 1) Import | Rejected or no downgrade per replay rules | P1 | SEC | FR-M27-03 |
| TC-395 | Clock rollback | Set system clock back to extend licence | 1) Import/validate | Trusted-time rules detect/handle; no extension | P1 | SEC | M27 failure paths |
| TC-396 | Offline licence works with vendor blocked | Valid licence; vendor unreachable | 1) Run core workflows | Consent, rights, workflows, tests operate | P0 | FUNC | T45 |
| TC-397 | Licence cannot appoint owner or run command | Licence with owner/command fields | 1) Import | Rejected | P0 | SEC | M27 acceptance |
| TC-398 | Expiry mid-request | Licence expires during rights request execution | 1) Continue | Continuity/hand-off policy; no data destruction; restrictions preserved | P0 | REC | T29, T55, BUILD-17 |
| TC-399 | Expired entitlement cannot turn BLOCK into ALLOW | Enforcement entitlement expired | 1) Evaluate withdrawn principal | Still BLOCK | P0 | SEC | M28 acceptance |
| TC-400 | Disabled capability via direct API | Feature not in edition | 1) Call its API directly | Denied | P0 | SEC | M28 acceptance |
| TC-401 | V2 AI / remote access not unlockable | Set AI flag, premium licence, super admin | 1) Try activate | Remains unavailable/DEFERRED_V2 | P0 | SEC | FR-M28-04, V1-03 |
| TC-402 | Upgrade keeps records | Foundation to Enterprise | 1) Upgrade | Local records intact; entitlement grants no operational authority | P1 | FUNC | UX-16 |
| TC-403 | Downgrade continuity | Enterprise to Foundation | 1) Downgrade | Accepted work completes/hands off; restrictions preserved; export available | P0 | REC | FR-M28-03 |
| TC-404 | Refund/cancellation ambiguity | Provider sends refund after renewal | 1) Process | Explicit state; no remote weakening of privacy controls | P1 | FUNC | FR-M26-04 |
