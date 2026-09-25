# 10 — Notification Engine (M10)

Scope: event-driven notifications, recipient scope, templates, delivery states, dedup, regulator/principal dispatch review.
References: PRD FR-M10-01..04; master §54–56, §75, §98, §100, §175.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-178 | Recipient never receives another principal's details | Batch of 500 request-acknowledgement emails | 1) Send; 2) Inspect each rendered message | Each message contains only its own principal's data | P0 | SEC | M10 acceptance |
| TC-179 | Duplicate event, single dispatch | Same event delivered 3 times | 1) Process | One notification sent | P0 | CONC | M10 acceptance |
| TC-180 | Draft never labelled delivered | Regulator notice in draft | 1) View status | Draft; not sent/delivered | P0 | FUNC | M10 acceptance |
| TC-181 | Delivery states distinct | Email to valid, bouncing and unknown addresses | 1) Send | Queued/sent/delivered/failed/acknowledged tracked separately; bounce = failed | P1 | FUNC | FR-M10-03 |
| TC-182 | Relay unavailable | SMTP down | 1) Trigger notification | Retries; escalation; deadlines not reset | P1 | REC | FR-M10-03 |
| TC-183 | Unapproved external provider | Template configured to non-approved webhook | 1) Dispatch | Blocked | P0 | SEC | M10 failure paths |
| TC-184 | Template version recorded | Template updated | 1) Send before and after | Each dispatch references exact template version | P1 | FUNC | FR-M10-01 |
| TC-185 | Board notification requires customer review | Incident Board intimation | 1) Attempt auto-dispatch | Requires review; manual submission package; no fabricated Board filing integration | P0 | LEGAL | FR-M10-04; Rule 7 |
| TC-186 | Vendor billing notices use designated contacts only | Invoice notification | 1) Trigger | Sent to vendor-side designated business contact only; never to runtime users | P1 | SEC | FR-M10-02 |
| TC-187 | No proactive diagnostic stream | Any error event | 1) Inspect outbound network | No notification to vendor support | P0 | SEC | FR-M10-04 |
| TC-188 | Principal notification in chosen language | Principal chose Hindi | 1) Trigger acknowledgement | Delivered in Hindi using reviewed template; fallback behaviour explicit if missing | P1 | LEGAL | Act §5(3), FR-M12-04 |
| TC-189 | Invalid destination | Malformed email/phone | 1) Dispatch | Failed with reason; owner alerted | P2 | NEG | M10 failure paths |
