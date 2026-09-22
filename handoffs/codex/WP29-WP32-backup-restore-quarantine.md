# WP29 / WP32 — Monitoring (M32), FR-M32-03

**Status: built, applied and qualified on the `codex-a00` profile. M32 stays at
`PARTIAL_SANDBOX` — three of four requirements are now built, FR-M32-04 is not.**

## The failure this exists to prevent

Not a lost backup. A restore that quietly reinstates consent somebody has since
withdrawn.

An archive taken on Monday carries Monday's answers. A system that resumes from
it on Friday is processing under permission that no longer exists, and nobody
notices, because everything looks restored. That is a privacy failure with no
technical symptom, which is exactly the kind this product is supposed to catch.

## What was deliberately not built

ORVIA does not create, encrypt, store, move or read an archive. That is the
customer's own database tooling under the customer's own key, and a product
claiming otherwise would be making a statement about infrastructure it has never
seen. Two structural fields on every snapshot say so and cannot be flipped:

- `archive_is_held_by_the_customer: true`
- `encryption_was_not_verified_by_this_product: true`

There is no field on a snapshot in which an archive path, a byte count, a cipher
name, a key or a "verified" flag could be written. The unit suite asserts each
of those is refused at parse time.

## What was built — the part only this product can do

**1. A checkable statement of state at a moment.** `declareSnapshot` counts the
domains the customer says the archive covers — `CONFIGURATION`, `WORKFLOW`,
`EVIDENCE`, `DOMAIN_RECORDS` — by reading this installation's own tables, and
digests the result. The counts are what ORVIA read, never what the caller
asserted, and the integration suite proves that by comparing them against direct
queries. A snapshot counts exactly the domains it claims to cover; the schema
refuses a mismatch in either direction.

`key_reference` is a reference to where the customer keeps the key. The column
check and the schema pattern both refuse whitespace and anything over 120
characters, so a pasted PEM body, a base64 blob or a sentence is rejected before
a row is written. Both suites assert this with the real shapes.

**2. The refusal.** A restore begins `QUARANTINED` and there is no way to start
it anywhere else. `conflictsFor` computes every consent pair whose state now
differs from its state as at the snapshot moment. Nothing bulk is stored to make
this work: `app.consent_events` is already an append-only history with
timestamps, so "the state as at T" is a query, not a copy.

A pair with no event by the snapshot moment was `NOT_GIVEN`, and a restore
cannot reinstate something never given, so those are not conflicts. Padding the
list would make a reconciliation look thorough while asking questions nobody
needed to answer.

Every conflict must be decided by a named person before the restore may resume:

- `CURRENT_STATE_PREVAILS` — the withdrawal stands. The answer in nearly every case.
- `RESTORED_STATE_PREVAILS` — somebody decided the archived answer wins, and said why. This is the decision that should be hard to make quietly, and it is attributed and kept.

**3. Separation of duties.** Declaring, starting and acknowledging need
`configuration.write`. Releasing needs `restore.release`, which only
`ORG_SUPER_ADMIN` holds. The person who ran the restore is not automatically the
person who signs it off. The integration suite proves an `ORG_ADMIN` who
successfully started the restore is refused `403` on release, and an auditor who
can read the reconciliation is refused it too.

## The claim the suite actually proves

> A restore ran, was reconciled and was released — and the person who withdrew is
> still withdrawn.

Asserted three ways at the end of `tests/integration/monitoring/restore.test.ts`:
the `app.consent_aggregates` row, the principal's own portal view, and the
recorded acknowledgement decision. `releasing_never_reinstates_a_withdrawal` is a
literal `true`, and fields like `reinstated`, `consents_restored` and
`overwrote_current_state` are refused at parse time.

## Where the refusals live

Each one is enforced at the layer that cannot be bypassed:

| Refusal | Enforced by |
|---|---|
| Release while a decision is outstanding | Domain (`400`, closed code `consent_decisions_changed_since_snapshot_are_outstanding`) and the schema's `superRefine` |
| A released restore returning to quarantine | DB trigger `restore_leaves_quarantine_once` (`23514`) |
| A declared snapshot being edited | DB trigger `snapshot_append_only` (`23514`) |
| An acknowledgement being withdrawn | DB trigger `acknowledgement_append_only` (`23514`) |
| A restore run being deleted | DB trigger `restore_run_is_not_deleted` (`23514`) |
| Releasing without the capability | RLS policy `scoped_release` **and** `policy/admin/authorization.rego` |

The trigger tests run as the migrator role, which is superuser with `BYPASSRLS`,
so a refusal there proves a trigger fired rather than a policy.

## Relationship to OPEN-09

OPEN-09 (*object/log/workflow persistence and current-safety recovery*) is
**not** resolved by this work, and nothing here should be read as resolving it.
What is still open is the store topology, the backup boundaries and the measured
loss/recovery windows. **This build makes no RPO or RTO statement.**

What was built is OPEN-09's stated interim rule, and only that:

> Quarantine when current state cannot be established; no reconstructing new
> events from old backup.

Resolving `CURRENT_STATE_PREVAILS` leaves the withdrawal standing precisely
because reconstructing new events from an old backup is forbidden.

## Two gaps this closed elsewhere

Both were honest absences before, and both are now answered from the record
rather than from the archive:

- **M32's `BACKUP_STATUS` signal** was `measured: false`. It is now the age of
  the most recently declared snapshot — and reverts to unmeasured, never to
  zero, on an installation where none has been declared. The sentence beside it
  says a declaration is not evidence that the archive exists or can be read.
- **M29's `BACKUP_TARGET` preflight gate** was `NOT_VERIFIABLE_HERE`. It is now
  decidable, but only over the record: it passes when a snapshot has been
  declared *and* a restore has been reconciled and released, and otherwise fails
  with a remedy. An untested restore is the failure it exists to catch. This
  supersedes the seventh row of `WP34-preflight-gates.md`.

No gate in this build now returns `NOT_VERIFIABLE_HERE`. The verdict stays in
the vocabulary and is exercised directly by the unit suite, because a report that
cannot say "I could not check this" will eventually be asked to pass something it
never looked at.

## Files

| Path | What it is |
|---|---|
| `packages/db/migrations/0033_backup_restore.sql` | Three tables, five triggers, RLS including the separate `scoped_release` UPDATE policy |
| `packages/domain/src/monitoring/restore.ts` | Declaration, conflict computation, acknowledgement, release |
| `packages/contracts/src/index.ts` | Contract `0.14.0`; `restore.release` capability; seven routes |
| `apps/web/src/components/screens/restores.tsx` | The screen. No one-click resume; release is disabled while anything is outstanding |
| `tests/unit/backup-restore.test.ts` | 7 contract invariants |
| `tests/integration/monitoring/restore.test.ts` | 33 assertions against the live product |

## Evidence

Run on the `codex-a00` profile, all green:

| Command | Result |
|---|---|
| `npm test` | 151 unit tests, 0 failures |
| `npm run contracts:check` | 8 artifacts, 149 route examples, contract `0.14.0` |
| `npm run test:restore` | 33 assertions, 0 failures |
| `npm run test:monitoring` | 31 assertions, 0 failures |
| `npm run test:preflight` | 19 assertions, 0 failures |
| `npm run test:regression` | 0 failures |
| `npm run web:smoke` | PASS |
| `npm run hygiene:check` | 0 findings |
| `npm run tracking:check` | validated; no results promoted |

## Still not built in M32

**FR-M32-04** — the vendor-side view. No vendor service exists in this build, so
there is nothing to show. It is not started and M32 stays `PARTIAL_SANDBOX`.
