# WP02 / WP14 — Audit Administration (M33), FR-M33-04

**Status: built, applied and qualified on the `codex-a00` profile. M33 stays
`PARTIAL_SANDBOX`** — see the last section for why the status did not move even
though all four requirements are now addressed.

## What the requirement asks, and what this build can honestly answer

> Apply purpose-based retention with payload minimisation and tested backup
> handling; preserve truthful envelope history when justified payload deletion
> occurs.

Three facts about this build decide the shape of an honest answer.

**There is no payload.** `app.audit_events` has ten columns: the scope, the
actor and their domain, the operation, the resource, the request id and the
time. It has never had a payload column. So payload minimisation here is not a
policy that could lapse — it is the absence of a place to put anything — and
**justified payload deletion cannot occur, because there is nothing to delete.**
The truthful envelope history the requirement asks to preserve is the entire
record, and migration 0027 preserves it absolutely.

**The trail cannot be shortened.** 0027 made `app.audit_events` append-only with
a trigger that refuses UPDATE and DELETE even to the migrator. A product that
deleted its own audit trail on a timer would be the exact failure that trigger
exists to prevent. So retention here is a **schedule and a disclosure, never a
purge**, and an elapsed period is reported rather than acted on.

**No period may be invented.** OPEN-10's interim rule forbids universal
statutory retention numbers. Nothing ships with a period.

## What was built

**Purpose-based retention.** Each of FR-M33-01's eight audited categories is
retained under exactly one of four purposes, and the contract refuses a report
where a category appears twice or not at all — so no part of the trail is kept
for a reason nobody stated:

| Purpose | Categories |
|---|---|
| `SECURITY_INVESTIGATION` | role grants, owner changes, connector credentials and scope |
| `REGULATORY_ACCOUNTABILITY` | policy publication, exports |
| `COMMERCIAL_OBLIGATION` | licences, support approval |
| `CHANGE_TRACEABILITY` | updates |

The operation names behind each purpose come from `operationsFor`, now exported
from `audit.ts` and shared with the coverage report. Two reports disagreeing
about what an operation is would make both worthless.

**Periods somebody configured and justified.** `app.audit_retention_rules` holds
versions, not edits: recording a new period supersedes the old one and the old
one stays. Shortening a period is exactly the change somebody would make to clear
a backlog, so it has to remain visible. The column check requires a
`source_reference` of real length, and a purpose with no rule reports
`period_is_not_configured_here: true` — deliberately not the same fact as being
kept forever by choice.

**Payload minimisation, measured.** The report counts payload-shaped columns on
the audit table at read time, and `payload_columns_found` is `z.literal(0)`. If a
payload column is ever added, **the endpoint stops rendering** rather than
continuing to describe an envelope-only trail that has quietly started carrying
content. The integration suite checks the product's count against the column list
read straight from `information_schema`.

**Tested backup handling.** The report counts declared snapshots whose coverage
includes `EVIDENCE` — read from FR-M32-03's record — and states structurally that
nothing it describes reaches a copy inside one. The archive is the customer's,
held under their key, outside this product entirely.

## The refusals, and where each lives

| Refusal | Enforced by |
|---|---|
| A period with no stated basis | Column check (`length(btrim(source_reference))>=10`) and the schema |
| Editing or deleting a recorded rule | DB trigger `retention_rule_append_only` (`23514`) |
| Deleting an audit event, overdue or not | DB trigger `audit_append_only` from 0027 (`23514`) |
| Overdue events counted against a period nobody set | Schema `superRefine` |
| A report rendering once a payload column exists | `payload_columns_found: z.literal(0)` |
| Setting a period with only read access | RLS `scoped_write` on `audit.administer` |

Both trigger checks run as the migrator, which is superuser with `BYPASSRLS`, so
a refusal proves a trigger fired rather than a policy.

## Evidence

Run on the `codex-a00` profile:

| Command | Result |
|---|---|
| `npm test` | 165 unit tests, 0 failures |
| `npm run test:audit-retention` | 24 assertions, 0 failures |
| `npm run test:audit` | 51 assertions, 0 failures (unchanged by the shared `operationsFor`) |
| `npm run contracts:check` | 152 route examples, contract `0.14.0` |

## Why M33 stays `PARTIAL_SANDBOX`

All four requirements are now addressed, but **FR-M33-02 is satisfied by absence
rather than by behaviour this module built**: local operational audit is separate
from vendor audit because there is no vendor-facing audit surface at all. Nothing
was constructed to keep them apart, so there is no built behaviour to exercise,
and `IMPLEMENTED_SANDBOX_SUBSET` would overstate it. The register entry says so
in those terms.

## What a later build would still have to decide

Whether audit envelopes may ever be deleted. That is the record-class question
**OPEN-10** leaves open, and this build deliberately does not pre-empt it: the
schedule reports what is past its period and stops there.
