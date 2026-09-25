# 13 — Data Principal Portal / Customer Privacy Centre (M13)

Scope: customer-hosted portal, self/mandate-scoped access, non-enumerating status, verification proportionality, accessibility, secure delivery.
References: PRD FR-M13-01..04; master §20, §22–24, §33, §84, §111, §154–156; acceptance UX-04, UX-09, UX-12.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-245 | Principal A cannot access B's request | Two principals with requests | 1) A changes request id in URL/API to B's | Denied before disclosure | P0 | SEC | M13 acceptance, UX-04 |
| TC-246 | Public status is non-enumerating | Public status lookup by reference | 1) Iterate sequential/random references | No existence oracle; references unguessable; rate-limited | P0 | SEC | FR-M13-02 |
| TC-247 | Public ingress cannot reach staff APIs | Portal exposed publicly | 1) From public network, call admin/staff paths | Unreachable/denied | P0 | SEC | UX-09 |
| TC-248 | No ORVIA account needed | Principal with no vendor account | 1) Complete consent and request journeys | Works fully; never asked to create ORVIA account | P0 | FUNC | M13 outcome |
| TC-249 | Customer branding and local assets | Portal | 1) Inspect network | All assets from customer host; no vendor CDN, analytics, chat widget, session replay | P0 | SEC | FR-M13-04, T48 |
| TC-250 | Proportionate identity verification | Request type "access" by logged-in principal | 1) Submit | No blanket ID-document upload demanded when existing authentication suffices per policy | P1 | LEGAL | FR-M13-02; Rule 10 context |
| TC-251 | Retry after acceptance is idempotent | Request submitted; network drops before response | 1) Retry same submission | Same request id/receipt returned; no duplicate request | P0 | FUNC | M13 acceptance |
| TC-252 | Browser closed after acceptance | Request accepted | 1) Close browser | Workflow continues server-side | P1 | REC | UX-12 |
| TC-253 | Honest pending state | Request awaiting processor | 1) View status | Shows pending/partial honestly; no "completed" before completion | P0 | UX | FR-M13-03 |
| TC-254 | Unsafe file upload | Upload .exe renamed .pdf, zip bomb, polyglot, oversized file | 1) Upload | Blocked locally with message; not stored in usable location | P0 | SEC | M13 failure paths |
| TC-255 | Response download expiry | Access response ready with expiring link | 1) Download after expiry | Denied; principal can request re-issue | P1 | SEC | FR-M13-03 |
| TC-256 | Response delivery requires authentication | Access package link forwarded to someone else | 1) Third party opens link | Requires principal authentication; denied otherwise | P0 | SEC | FR-M13-03 |
| TC-257 | Revoked representative | Nominee mandate revoked | 1) Nominee logs in and views principal data | Denied | P0 | SEC | T24 |
| TC-258 | Keyboard-only journey | Portal | 1) Complete consent, withdrawal, request using keyboard only | All achievable; visible focus; no traps | P1 | UX | FR-M13-03, NFR-05 |
| TC-259 | Screen reader journey | Portal with NVDA/VoiceOver | 1) Complete journeys | Labels, errors and status announced | P1 | UX | NFR-05 |
| TC-260 | Low bandwidth / interruption | Throttle to 2G, drop connection mid-form | 1) Submit | Form state preserved or clear retry; no duplicate submission | P1 | UX | FR-M13-03 |
| TC-261 | Language switch mid-journey | Switch English to Bengali | 1) Continue request | Content switches using reviewed variants; submitted data preserved | P1 | UX | Act §6(3) |
| TC-262 | Grievance submission | Principal unhappy with response | 1) Submit grievance | Grievance recorded separately from original request with its own clock per pack | P0 | LEGAL | Act §13, Rule 14 |
| TC-263 | Board escalation information | Grievance resolved unsatisfactorily | 1) View outcome | Information on approaching the Board shown per pack | P1 | LEGAL | Act §13(3) |
| TC-264 | Session timeout on shared device | Principal logs in on shared computer | 1) Idle beyond timeout | Session ends; sensitive data not cached in browser storage | P1 | SEC | FR-M13-02 |
