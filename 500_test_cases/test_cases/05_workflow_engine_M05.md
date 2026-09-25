# 05 — Workflow Engine (M05)

Scope: outbox/inbox durability, plans and approvals, action attempts, unknown effects, reconciliation, pause/resume/cancel, dead letters.
References: PRD FR-M05-01..04, NFR-02; master §17, §18, §24–26, §99, §100, §149, §174–179; acceptance T09, T11–T13, T19, BUILD-04..06.
Execution states: PENDING, RUNNING, ACKNOWLEDGED, EFFECT_UNKNOWN, FAILED, MANUAL_REQUIRED, SKIPPED. All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-086 | Commit succeeds, publisher crashes | Withdrawal accepted | 1) Kill outbox publisher right after DB commit; 2) Restart | Event published after restart; no accepted event lost | P0 | REC | T11 |
| TC-087 | Domain state and outbox are atomic | Fault injection in DB transaction | 1) Force failure after domain write before outbox write | Both roll back; never state without event or event without state | P0 | REC | FR-M05-01 |
| TC-088 | Duplicate event delivery | Same event delivered 3 times | 1) Consumer processes all | One effect; inbox dedup recorded | P0 | CONC | FR-M05-01, T06 |
| TC-089 | Worker dies after remote effect | Adapter applies deletion then worker killed before ack | 1) Restart worker | State EFFECT_UNKNOWN; reconciliation via readback; no blind repeat of destructive action | P0 | REC | T12, BUILD-05 |
| TC-090 | Lost response after effect | Target applies change; response dropped | 1) Observe action state | EFFECT_UNKNOWN, not FAILED or verified; reconciliation scheduled | P0 | REC | FR-M05-03, T19 |
| TC-091 | Idempotency key reused with changed payload | Action with key K done | 1) Submit key K with different payload | Conflict; no external effect | P0 | SEC | T13 |
| TC-092 | Idempotent retry with same payload | Action with key K accepted | 1) Retry identical request | Same result returned; no duplicate effect | P1 | FUNC | DATA_MODEL safe retry |
| TC-093 | Approval bound to scope and expiry | Plan approved for 3 systems, expires in configured window | 1) Add a 4th system; 2) Execute | Execution blocked; re-approval required | P0 | SEC | FR-M05-02, BUILD-06 |
| TC-094 | Approval expired | Approved plan past expiry | 1) Execute | Blocked; approval expired recorded; old approval retained historically | P0 | NEG | BUILD-06 |
| TC-095 | Approver revoked before execution | Approver's role revoked | 1) Execute plan | Blocked; requires new approval by current authority | P0 | SEC | M05 failure paths |
| TC-096 | Record generation changed | Deletion task created at generation g1; record recreated at g2 | 1) Execute old task | Generation mismatch forces re-evaluation; g2 data not deleted blindly | P0 | FUNC | T09 |
| TC-097 | Pause and resume at effect boundary | Marketing send workflow paused after read | 1) Accept withdrawal during pause; 2) Resume | Recheck at effect boundary; send blocked/queued for that principal | P0 | FUNC | BUILD-04, T26 |
| TC-098 | Cancellation stops new work only | Workflow with 5 steps, 2 done (one irreversible) | 1) Cancel | Remaining steps not started; completed irreversible effect not claimed undone; state explicit | P1 | FUNC | FR-M05-04 |
| TC-099 | Exhausted retries go to dead letter | Target down permanently | 1) Let retries exhaust | Dead-letter entry with owner, inspection view, no silent drop | P1 | REC | FR-M05-04 |
| TC-100 | Manual task assignment | Step requires manual action | 1) Assign task; 2) Complete with evidence | Attribution recorded; completion is attestation, not independent verification | P1 | FUNC | FR-M05-04, FR-M07-04 |
| TC-101 | Version-safe resumption | Workflow started on definition v1; v2 deployed | 1) Resume v1 execution | Runs on v1 definition; no mixed-version behaviour | P1 | REC | FR-M05-04 |
| TC-102 | No in-memory-only queue | Inspect architecture | 1) Kill all processes with pending work; 2) Restart | All accepted work recovered from durable store | P0 | REC | FR-M05-01 |
| TC-103 | Closed administration never fabricates verification | Workflow closed administratively | 1) Inspect action verification status | Unverified actions remain unverified | P0 | FUNC | M05 acceptance |
| TC-104 | Escalation on SLA breach | Manual task past configured due time | 1) Wait past due | Escalation raised to configured owner; deadline not reset | P1 | FUNC | FR-M05-04 |
| TC-105 | Restart at every durable boundary | Scripted kill at each boundary of withdrawal workflow | 1) Kill/restart at each point | No lost work, no duplicate destructive effect, final state consistent | P0 | REC | M05 acceptance |
