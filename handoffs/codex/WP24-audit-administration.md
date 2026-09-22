# WP24 — Audit Administration (M33)

**Status: built, applied and qualified on the `codex-a00` profile. The module
stays at `PARTIAL_SANDBOX`, deliberately.**

Two of the module's four requirements are met in full, a third is met by the
absence of the thing it separates rather than by anything built here, and the
fourth is not built at all. `tracking/capabilities.json` therefore records M33
as `PARTIAL_SANDBOX` / `COVERED_AT_CANDIDATE` — the test status moves because
there is now a suite; the implementation status does not, because FR-M33-04
has no code.

## What was built

| Requirement | How it is met |
|---|---|
| FR-M33-01 | `auditCoverage` answers the eight named categories by counting the trail, not by reading a list of what somebody intended to audit. Each entry names the operations behind its count, so the claim is checkable — and the suite checks it, comparing every reported figure against a direct count of exactly those operation names. `has_a_path` separates the two facts that matter: a category with a route nobody has used reports `recorded: 0`, and a category this build has no route for reports `has_a_path: false` with a note saying there is nothing to audit rather than something unaudited. `AuditCoverageEntry` refuses the impossible combination outright. Tenant, domain and actor context travel on every event and are asserted present on every row returned. |
| FR-M33-02 | Met by absence, and recorded as such rather than claimed as work. There is no vendor staff access, no vendor profile and no mirroring path in this build; the nearest thing to a vendor-facing record is the M30 diagnostic report, whose own suite asserts against nine identifiers that it carries none of them, including staff and data principals. Nothing in WP24 built a separation, because there are not two things here to separate. |
| FR-M33-03 | Read, export and administration are three separate permissions. `audit.read` reads and filters; `audit.export` takes the trail out of the installation and is held by the auditor and the owner but **not** by the organisation administrator who can read it; `audit.administer` appends a correction and is the owner's alone. Filtering is by five declared keys that reach PostgreSQL as bound parameters — an undeclared key, a repeated key or a value outside the vocabulary is a 400, not a silently ignored parameter. An export carries every event its filter matched or is refused by name: `AuditExport` cannot express a partial result, and the domain refuses a match above the ceiling rather than shortening it. Correction is by appending — the disputed event is read back byte-for-byte after a correction and is unchanged. Reading the trail is itself an audited event, so a quiet look leaves a trace. |
| FR-M33-04 | **Not built.** No purpose-based retention of audit records, no payload minimisation policy, no tested backup handling, and no truthful-envelope history for justified payload deletion. This is the reason the module is not promoted. |

Migration `0027_audit_administration.sql` puts the append-only guarantee below
the application: `BEFORE UPDATE OR DELETE` triggers on both `app.audit_events`
and the new `app.audit_corrections` raise unconditionally. Policy and grants
already stopped the application role from trying; the migrator is superuser and
bypasses row-level security, so without the trigger the only thing between the
trail and a privileged rewrite was that nobody had written the `UPDATE`. The
suite proves the trigger by attempting exactly that write as the migrator.

Migration `0028_audit_export.sql` exists for one reason: RLS decided visibility
on `audit.read`, so a role granted `audit.export` alone would have selected
nothing and been handed a file correctly stating that it carried everything the
filter matched. It would have been true, and it would have read as a complete
record of a quiet period. The policy makes "whoever may export may read what
they export" a property of the schema rather than of today's role table.

## Evidence

Commit under test: working tree on `prototype/claude/v1-modules-wp04-wp25`,
parent `89012d2`, profile `codex-a00`.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | clean, exit 0 |
| Lint | `npm run lint` | 0 findings, exit 0 |
| Unit tests | `npm test` | **122 passed, 0 failed** (10 of them M33) |
| Contract check | `npm run contracts:check` | 130 route examples and 7 error examples validated, contract 0.11.0 |
| Hygiene | `npm run hygiene:check` | 0 findings, 2935 files examined |
| Tracking | `npm run tracking:check` | 33 capability modules validated; no results promoted |
| Migrations | `npm run db:migrate` | `0027` then `0028` applied; artifacts `A00-migration-1790055619788-*`, `A00-migration-1790057153396-*` |
| Policy | `npm run services -- up`, then OPA queried directly | `audit.read` true for `ORG_SUPER_ADMIN` and `AUDITOR`, false for `MEMBER`; `audit.administer` true for `ORG_SUPER_ADMIN` only; `audit.export` true for `ORG_SUPER_ADMIN` and `AUDITOR`, **false for `ORG_ADMIN`** |
| M33 integration | `npm run test:audit` | **51 assertions, 0 failures**, run twice against the same database; artifacts `A00-audit-integration-1790058022877-*`, `A00-audit-integration-1790058095933-*` |
| Consent regression | `npm run test:consent` | PASS, 0 failures (this pass changed `idempotent`'s signature) |
| Auth security | `npm run test:auth` | PASS, 0 failures |
| Core regression | `npm run test:regression` | 70 assertions, 0 failures |
| Web smoke | `npm run web:smoke` | PASS, 3 assertions |
| Runtime image | `npm run runtime:build` | PASS; the M33 sources are present in the `git ls-files` context, so what was built is what is committed |
| Screens | driven through the real fixture with an authenticated owner | `/workspace/audit-trail` and `/workspace/audit-coverage` both 200; all three endpoints 200; the export answers with `content-disposition: attachment` |

## What running it actually found

**Four things, and one of them was a defect in my own migration.**

1. **`0027`'s foreign key could not have worked as written.** `app.audit_events`
   was keyed on `id` alone, with no unique constraint on
   `(tenant_id, legal_entity_id, environment_id, id)` for a scoped reference to
   point at. Caught by reading the table definition before applying, not by the
   migration failing. The fix adds that constraint, which is also what makes a
   correction structurally unable to name an event in another organisation —
   asserted directly with a direct insert as the migrator.

2. **A read cannot contain its own audit record, and my first assertion said it
   should.** The suite failed `19 !== 18`. The event for a read is written after
   its rows are selected, so the trail the reader receives is the trail as it was
   when they asked. That is correct and worth stating rather than papering over:
   the assertion now snapshots the ids immediately before the read and compares
   exactly, and a separate assertion confirms the read's own event shows up in
   the next one.

3. **The trail in this environment already held 11,064 events**, so the export
   ceiling refusal fired for real rather than being an untested branch. The
   suite asserts both outcomes exactly — the whole trail on a small installation,
   the named refusal on a large one — because the outcome that must never occur
   is the third one, a shortened file that reads as a whole one.

4. **My first refusal code was unbounded.** It embedded the match count, which
   is the same fault I corrected earlier in this build when the audit operation
   vocabulary had UUIDs concatenated into it: a code containing a number cannot
   be grouped, filtered or translated. It is now the closed
   `matched_set_above_export_ceiling`, and the screen explains what to do about
   it, because the number was never what the operator needed.

A fifth, procedural: a stale `next start` on port 4310 survived a `pkill` that
does not exist in this shell, and I spent four probes concluding the export
route was unregistered when I was querying a server built before it existed.
The route resolution was correct the whole time. `netstat -ano` and `taskkill`
are the working pair here.

## What is not done, plainly

- **FR-M33-04 has no code.** No retention, no minimisation policy, no backup
  handling, no envelope history. The module stays `PARTIAL_SANDBOX` for this
  reason alone.
- **A correction cannot be withdrawn.** That is deliberate and is stated on the
  artifact and the screen, but it does mean a mistaken dispute is permanent.
- **The export is a single in-memory document with a fixed ceiling**, not a
  streamed file. An installation with a large trail must narrow by date, and
  there is no paged or resumable export.
- **The screens report and correct; they do not schedule.** There is no retention
  schedule UI because there is no retention.
- **`tracking/tasks.json` B00–B06 and the 34 acceptance definitions are
  untouched.** Those are reviewer gates and remain `NOT_STARTED` / `NOT_RUN`.
