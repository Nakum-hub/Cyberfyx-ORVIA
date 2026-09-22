# WP03 / WP34 — Customer Onboarding (M29), FR-M29-04

**Status: built, applied and qualified on the `codex-a00` profile. M29 stays
`PARTIAL_SANDBOX`** — all four requirements now have code, but FR-M29-02's
customer-held recovery route is still unbuilt.

## The scope OPEN-11 sets

> Implement one approved typed path fully before another parser; no arbitrary
> upload-to-table tool.

So this is **one** import kind — a data-asset inventory — built through. A second
format is a contract change that fails the unit suite, which is the review
OPEN-11 is asking for. The row-identity and atomic-versus-partial semantics that
decision also leaves open are **not** pre-empted: collision detection is on name
within a system, and the limitation says so.

There is no file picker, no delimiter, no format field and no target-table field
anywhere in the contract. **The declared row shape is the parser** — there is no
looser parsing step behind it that could accept something the schema would not.

## The clause everything else is shaped by

> Source snapshots are never live control evidence.

An inventory exported from a customer's CRM records what that system's operator
believed at the moment of export. It is not something ORVIA observed, and it is
certainly not evidence that a restriction is in force.

So every asset created from an import goes through the ordinary
`createDataAsset` path with provenance `ASSERTED` and review state `UNREVIEWED`.
The graph schema already refuses to let an `ASSERTED` record carry an observation
time or a freshness window, so **an import cannot manufacture an observation even
by trying**. The integration suite checks this against the row written to the
database, not against the response.

Two structural literals carry the claim: `imported_rows_are_asserted_never_observed`
and `a_source_snapshot_is_not_evidence_that_any_control_is_in_force`.

## The five things the requirement names

| Clause | How it works |
|---|---|
| **Quarantine** | The only entry state. The column default is `QUARANTINED` and nothing reaches the inventory before an explicit apply. |
| **Preview** | Per row: collides with nothing, restates something already recorded, or disagrees with a named existing asset. A conflicting row must name what it conflicts with — "there is a conflict somewhere" is not a preview. |
| **Conflict handling** | A disagreement blocks the apply until a named person decides `SKIP_ROW` or `IMPORT_AS_NEW`. Conflicts are **recomputed at apply**, not trusted from the preview, because the inventory can change in between — applying against a stale picture is how a duplicate gets created by somebody who thought they had checked. |
| **Provenance** | The batch records the source the customer named and the moment the rows describe. An import that will not say which moment it is a snapshot of is refused. |
| **Purge** | Really deletes the quarantined rows. The batch survives saying it was purged, when, by whom and why. |

## Why the batch survives a purge

Deleting the batch as well would leave nothing to distinguish a purge from an
import that was never submitted — and that is exactly the distinction somebody
reviewing this later needs. A DB trigger refuses to delete a batch; the suite
proves it with `23514` as the migrator.

Purging the *rows* is the safe direction: it discards input that never became
inventory, which is precisely what a customer should be able to take back.

## Where each refusal lives

| Refusal | Enforced by |
|---|---|
| A settled import moving again, or applying twice | DB trigger `import_batch_settles_once` (`23514`) and a 409 in the domain |
| Deleting the batch record | DB trigger `import_batch_is_not_deleted` (`23514`) |
| A conflicting row that names nothing | Column check and schema `superRefine` |
| Applying with a conflict undecided | Domain (`400`, closed code `conflicting_rows_are_undecided`) and the schema |
| Deciding a row that is not in conflict | Domain (`400`, `row_is_not_in_conflict`) |
| A purge with no stated reason | Column check and schema |
| An import naming a system nobody configured | Domain (`400`, `unknown_system_in_import`) |

## Evidence

Run on the `codex-a00` profile:

| Command | Result |
|---|---|
| `npm test` | 173 unit tests, 0 failures |
| `npm run test:imports` | 31 assertions, 0 failures |
| `npm run contracts:check` | 158 route examples, contract `0.14.0` |

Two existing guards fired and were correct to: the graph route count moved 11 →
17, and the audit suite's "nothing purges an audit record" check was matching
`purge_import` on a bare substring. That guard was **tightened to audit-scoped
routes** rather than loosened — it now tests what it claims to test.

## Why M29 stays `PARTIAL_SANDBOX`

FR-M29-02 names a customer-held recovery route that is still not built; only the
single primary owner it also names exists. The other absences the register lists
(no wizard for the earlier onboarding steps, connectivity recorded as the
customer performed it rather than observed) are unchanged by this work.
