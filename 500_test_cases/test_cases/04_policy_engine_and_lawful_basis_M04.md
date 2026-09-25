# 04 — Policy Engine and Lawful Basis (M04)

Scope: purposes, lawful basis (consent vs certain legitimate uses), versioning, maker/checker, decisions and obligations, fail-closed.
References: PRD FR-M04-01..04; DPDPA Act §4, §6, §7; master §9, §13–15, §26, §40–43; acceptance T04, T05, T26, T28.
All cases start **NOT_RUN**. Decision vocabulary: ALLOW / BLOCK / INDETERMINATE (+ obligations).

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-061 | No generic legitimate-interest basis available | Purpose editor | 1) Try to set basis "legitimate interest" | Option not available; only consent or a specified Act §7 legitimate use can be chosen, each with source reference | P0 | LEGAL | Act §4, §7; FR-M04-01 |
| TC-062 | Legitimate-use basis requires source and reviewer | Purpose basis = §7 legitimate use (e.g. employment) | 1) Save without reviewed source/applicability | Cannot publish; source and applicability review required | P0 | LEGAL | FR-M04-01 |
| TC-063 | Not all activity treated as consent-based | Purposes with consent and §7 bases | 1) Withdraw consent for principal; 2) Evaluate a §7-based purpose | Consent withdrawal affects consent purposes only; §7 purpose evaluated on its own conditions | P0 | LEGAL | FR-M04-01 |
| TC-064 | Published policy is immutable | Policy v2 published | 1) Attempt edit via UI and API | Rejected; change requires new draft v3 | P0 | FUNC | FR-M04-02 |
| TC-065 | Author cannot self-approve | Maker/checker configured | 1) Author drafts and tries to approve own draft | Denied; independent reviewer required | P0 | SEC | FR-M04-02 |
| TC-066 | Approval bound to digest | Draft approved | 1) Modify draft after approval; 2) Publish | Publish rejected; digest changed requires new approval | P0 | SEC | FR-M04-02 |
| TC-067 | Decision includes full context | Published policy | 1) Request decision | Response carries decision, reason code, policy id/version, scope, freshness, consent epoch, obligations | P1 | FUNC | FR-M04-03 |
| TC-068 | Consumer cannot honour obligation | Decision ALLOW with obligation "mask phone" to a consumer lacking masking | 1) Consumer processes decision | Consumer rejects or escalates; does not return unrestricted success | P0 | FUNC | FR-M04-03 |
| TC-069 | Policy engine unavailable | Stop OPA/policy service | 1) Request decision for marketing send | Fail closed or queue per approved action policy; never accidental ALLOW; explicit reason | P0 | REC | M04 acceptance, T28 |
| TC-070 | Future-effective rule | Rule effective next month | 1) Evaluate today | Rule shown as scheduled; not applied as commenced | P0 | FUNC | T05 |
| TC-071 | Historical decision keeps version | Decision made under v1; v2 published | 1) Open old decision | Shows v1; new decisions use v2 | P0 | FUNC | T04 |
| TC-072 | Rollback after withdrawal | Policy rolled back to older version that was permissive | 1) Evaluate principal who withdrew consent | Withdrawal still enforced; rollback cannot resurrect consent | P0 | LEGAL | M04 failure paths |
| TC-073 | Stale revocation state | Consent projection lagging | 1) Evaluate decision with stale projection beyond freshness bound | INDETERMINATE or BLOCK with stale reason; not ALLOW | P0 | NEG | FR-M04-03 |
| TC-074 | Admin authz and processing decisions are separate | Admin policy and processing policy both exist | 1) Attempt to use admin-authz allow to satisfy processing decision | Rejected; namespaces separate | P1 | SEC | FR-M04-04 |
| TC-075 | Hot-path latency | Local policy, representative workload | 1) Benchmark simple decision | Report measured p95 vs illustrative target of <100 ms with hardware stated; no SLA claim | P2 | PERF | NFR-06 |
| TC-076 | Unsupported obligation | Policy returns obligation type not supported by adapter | 1) Execute action | Action not performed; escalated with clear reason | P0 | NEG | M04 failure paths |
| TC-077 | Changed candidate after approval | Approval issued; candidate data modified | 1) Publish | Blocked; new approval needed | P0 | SEC | M04 failure paths |
| TC-078 | Regulatory pack applicability separate from executable rule | Pack contains legal text + rule | 1) Update legal source text only | Executable rule unchanged until reviewed/approved; linkage visible | P1 | LEGAL | FR-M04-01 |
| TC-079 | Purpose-specific evaluation | Consent for "Order updates" only | 1) Evaluate "Marketing" purpose for same principal | BLOCK; consent for one purpose does not cover another | P0 | LEGAL | Act §6(1) |
| TC-080 | Purpose version change requires review | Purpose description materially broadened | 1) Publish new purpose version | Flagged as material; linked notices/consents require migration decision | P0 | LEGAL | T10 |
| TC-081 | Old ALLOW not replayable | ALLOW issued for recipient R1 | 1) Reuse decision token for R2 or different action | Rejected; decision bound to recipient/action | P0 | SEC | USER_FLOWS enforcement |
| TC-082 | Deterministic decisions | Same input set | 1) Evaluate 1000 times | Identical output every time | P1 | FUNC | FR-M04-03 |
| TC-083 | Decision audit | Any decision | 1) Inspect audit/evidence | Actor/system, input digest, version, output recorded without excessive personal payload | P1 | FUNC | FR-M08-01 |
| TC-084 | State-function legitimate use requires reviewed applicability | Purpose basis = §7 State/instrumentality function | 1) Configure for a private company tenant | Applicability review required; cannot activate without reviewer decision | P1 | LEGAL | Act §7 |
| TC-085 | Malformed policy bundle | Upload bundle with syntax error / unknown fields | 1) Publish | Rejected at validation; current published policy continues | P1 | NEG | FR-M04-02 |
