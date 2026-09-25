# 06 — Connector Framework and Agent (M06)

Scope: capability manifests, guided local setup, TLS, scoped identities, signed commands, pagination, rate limits, SSRF, spool, revocation.
References: PRD FR-M06-01..04; master §27–30, §84, §111, §128, §147, §171–178; acceptance T14–T18, VM-15..17, BUILD-07.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-106 | Capability manifest declared per action | Connector installed | 1) View manifest | Discovery, read, plan, action, reconciliation, verification capabilities listed with limitations and consistency windows | P1 | FUNC | FR-M06-01 |
| TC-107 | Discovery-only identity cannot mutate | Connector with discovery identity | 1) Issue delete/update command | Rejected by agent and target; no effect | P0 | SEC | M06 acceptance |
| TC-108 | Invalid TLS certificate | Target presents self-signed/expired cert | 1) Run setup | Setup stops with actionable error; no "ignore TLS" fallback | P0 | SEC | FR-M06-02, VM-16 |
| TC-109 | No root/DBA shortcut | Setup wizard | 1) Try to supply root/DBA credential | Warned/blocked per policy; dedicated service identity required | P0 | SEC | FR-M06-02 |
| TC-110 | Resource allowlist enforced | Allowlist = tables A, B | 1) Command targets table C | Rejected | P0 | SEC | FR-M06-02, VM-16 |
| TC-111 | Newly discovered fields not auto-approved | Schema adds column | 1) Rediscover | New field pending mapping review | P1 | FUNC | USER_FLOWS connector |
| TC-112 | Observe-first activation | New connector | 1) Complete setup | Starts in Observe mode; enforcement requires explicit approval | P0 | FUNC | FR-M06-02, VM-15 |
| TC-113 | Enable delete with ambiguous scope | Connectivity test passed | 1) Enable delete without dry-run/approval | Denied until scope, capability, approval and dry-run pass | P0 | SEC | VM-17 |
| TC-114 | Wrong-tenant signed command | Command signed for Tenant B sent to Tenant A agent | 1) Deliver | Rejected | P0 | SEC | T14 |
| TC-115 | Replayed command | Valid command executed | 1) Replay identical command | Rejected (nonce); no duplicate effect | P0 | SEC | T15 |
| TC-116 | Expired command | Command past expiry | 1) Deliver | Rejected | P0 | SEC | T15 |
| TC-117 | Command digest mismatch | Signed command with modified body | 1) Deliver | Signature validation fails; rejected | P0 | SEC | FR-M06-03 |
| TC-118 | Plugin requests another connector's secret | Two plugins | 1) Plugin A requests B's secret reference | Access denied | P0 | SEC | T16 |
| TC-119 | Partial pagination | Provider fails last page | 1) Run discovery/verification | Scope marked incomplete; no full-coverage claim | P0 | FUNC | T17, BUILD-07 |
| TC-120 | Mutation permission removed at provider | Connector had delete permission | 1) Remove permission at provider; 2) Run capability check | Capability/coverage degraded; gap created | P0 | FUNC | T18 |
| TC-121 | Credential expiry | Secret expires | 1) Run scheduled job | Clear failure, owner notified, coverage stale; no fallback credential | P1 | NEG | M06 failure paths |
| TC-122 | SSRF via connector URL | Setup allows host entry | 1) Enter 169.254.169.254, localhost, internal admin hosts, DNS rebinding host | Blocked per egress policy | P0 | SEC | M06 failure paths, T49 |
| TC-123 | Spool full | Agent spool at capacity | 1) Continue sending events | Backpressure; no silent drop; operator alerted | P1 | REC | FR-M06-04 |
| TC-124 | Rate limit and circuit breaker | Target slow/erroring | 1) Send burst | Rate limits honoured; circuit opens; customer system protected | P1 | PERF | FR-M06-04, NFR-09 |
| TC-125 | Revocation of connector | Active connector | 1) Revoke installation | Pending commands rejected; secrets dereferenced; status revoked | P1 | FUNC | FR-M06-04 |
| TC-126 | Update trust separate from execution trust | Update signing key | 1) Sign an execution command with update key | Rejected | P0 | SEC | FR-M06-03 |
| TC-127 | File/manual onboarding visibly separate | Import-based source | 1) View source in inventory | Labelled snapshot/manual, not live integration | P1 | UX | FR-M06-04 |
| TC-128 | Connector error containing canary | Target returns error with synthetic personal canary | 1) Inspect logs, telemetry, support draft | Canary absent from telemetry/support bundle | P0 | SEC | T40 |
| TC-129 | Conformance: replay and permission-change cases | Connector conformance suite | 1) Run suite | Includes failure, replay, permission-change cases; all results recorded | P1 | FUNC | M06 acceptance |
| TC-130 | Egress to undeclared destination | Plugin tries outbound call to internet host | 1) Execute | Blocked by runtime/network policy; local failure evidence | P0 | SEC | T49 |
