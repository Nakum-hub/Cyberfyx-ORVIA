# WP26 / WP27 — Support Bundle System (M30) and Updates (M31)

**Status: built, applied and qualified on the `codex-a00` profile.**
Both modules moved from `NOT_IMPLEMENTED` to `IMPLEMENTED_SANDBOX_SUBSET` /
`COVERED_AT_CANDIDATE` in `tracking/capabilities.json` in this pass, on the
strength of the runs recorded below. The previous revision of this document
said the source had never executed; that was true when it was written and is
no longer true.

## What was built

### WP26 / M30 — Support Bundle System

| Requirement | How it is met |
|---|---|
| FR-M30-01 | `DiagnosticReport` is a closed schema: every field is an enum, integer, timestamp, version or digest. There is no field in which a log line, an operational summary or a directory listing could be written. The report is assembled from local counts only, and `installation_reference` is a one-way digest so a vendor can correlate two reports without learning the installation identity. The integration suite checks the exact canonical bytes against nine identifiers a support bundle normally leaks — installation, tenant, environment, a data principal, a staff email, a system, an asset, a gap and the case itself — and none of them is present. |
| FR-M30-02 | Approval names the exact `payload_digest` the approver previewed; a mismatch is refused, not reconciled. A new draft supersedes the previous one, so an approval that named the old payload cannot transfer the new one. `authorises_generation` is a literal `false`. The digest is revalidated again at transfer time, and database triggers enforce both bindings independently of the application — proven by direct writes as the migrator, which is superuser and bypasses RLS. |
| FR-M30-03 | `validateSubmission` is the check a vendor ingress would run, exposed locally so a customer learns whether a payload would be refused before carrying it anywhere. `app.support_ingress_validations` has six columns beyond scope and no seventh: the suite reads `information_schema` and asserts the exact column set, so there is no column in which a submitted body could be kept, rejected or not. |
| FR-M30-04 | `SupportResolution` records the vendor's answer against the vendor's case and has no parameter that could mark a local control verified. `local_control_state` is read from the linked coverage gap on every request, never copied. The acceptance case is asserted directly: a vendor may close their case while the local gap is still open, and the standing reports `VENDOR_CLOSED` alongside `GAP_OPEN` with `local_control_verified` false. |

The canary scan is defence in depth and says so: the schema should already make
it unnecessary, but the schema is a statement about today and the scan is a
statement about every change after it. A hit refuses generation, names which
registered canary matched, and stores nothing.

### WP27 / M31 — Updates

| Requirement | How it is met |
|---|---|
| FR-M31-01 | `ReleaseClaims` carries provenance (source commit, build time, builder and reviewer references), a dependency inventory with digests, per-migration notes and the supported profile list. The manifest row is immutable: a trigger refuses every UPDATE and DELETE. |
| FR-M31-02 | Eligibility is eight separately named checks, reported individually, and `eligibility_is_not_permission_to_execute` is a literal `true`. Applying is a second act under a second capability (`update.approve`) that re-runs every check. Trust is re-evaluated at eligibility rather than inherited from import: the suite writes a manifest straight to the table with an untrusted signer, and it comes back ineligible on `TRUSTED_ORIGIN` and `SIGNATURE_VALID`. `unsafeArchiveEntry` refuses traversal, absolute, drive-qualified, backslash, empty-segment and null-embedded paths; a declared expansion over 100× the artifact is refused as a bomb. |
| FR-M31-03 | `recoveryMode` is derived from the manifest, never chosen: one irreversible migration forces `FORWARD_RECOVERY_ONLY`, both `UpdateEligibility` and `UpdatePlan` refuse to parse if `rollback_available` disagrees, and the database refuses to relax `recovery_mode` after approval. The ledger is append-only, so a failed run leaves its evidence rather than being tidied away by the next attempt. |
| FR-M31-04 | `introduces_network_egress` and `requires_model_runtime` are literal `false`, and `introduces_capabilities` is closed to this contract's own vocabulary, so a release cannot introduce an authority that does not already exist. `NO_UNSAFE_DOWNGRADE` refuses a release that is not strictly newer — asserted after a real apply moved the installed version on. `REVALIDATE_BOUNDARIES` and `RUN_CORE_REGRESSION` are two of the seven required steps, and the database refuses to record an update as applied until all seven have succeeded. |

## Evidence

Commit under test: working tree at the time of the run, on branch
`prototype/claude/v1-modules-wp04-wp25`, profile `codex-a00`.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | clean, exit 0 |
| Unit tests | `npm test` | 104 passed, 0 failed |
| Lint | `npm run lint` | 0 findings, exit 0 |
| Contract check | `npm run contracts:check` | 125 route examples validated, contract 0.9.0 |
| Hygiene | `npm run hygiene:check` | 0 findings, 2869 files examined |
| Tracking | `npm run tracking:check` | 33 capability modules validated |
| Migrations | `npm run db:migrate` | `0024`, `0025` then `0026` applied; artifacts `A00-migration-1790033126328-*`, `A00-migration-1790034211682-*` |
| Policy | `npm run services -- up` then OPA queried directly | all five new capabilities decided correctly for `ORG_SUPER_ADMIN`, `ORG_ADMIN` and `AUDITOR` |
| M30 integration | `npm run test:support` | **57 assertions, 0 failures**, run three times against the same database; artifact `A00-support-integration-1790035643533-*` |
| M31 integration | `npm run test:updates` | **54 assertions, 0 failures**, run twice against the same database; artifact `A00-updates-integration-1790035651228-*` |
| Core regression | `npm run test:regression` | 70 assertions, 0 failures; artifact `A00-regression-integration-1790034659889-*` |
| Web smoke | `npm run web:smoke` | PASS; artifact `A00-web-integration-1790035772445-*` |
| Screens | driven through the real fixture with an authenticated owner | all five render 200 with the new navigation group; all five endpoints answer 200 |

## What running it actually found

Four things, the first of which the previous revision of this document had
flagged as an unverified assumption rather than known-good:

1. **`GRANT SELECT ON bootstrap_migrations TO orvia_app` in 0024 was
   ineffective.** The grant succeeded and did nothing: the ledger lives in
   `public`, and `orvia_app` has no `USAGE` on `public`, so to that role the
   table does not exist at all. `generate_diagnostic` failed with a relation
   error surfaced as a 503 — a service error where a refusal or a correct
   answer belonged. Fixed by `0026_schema_revision.sql`, which revokes the
   useless grant and exposes `app.schema_revision`: a single integer, no
   migration names, no filenames, no checksums and no arguments. Widening
   `orvia_app` to the whole `public` schema to obtain one integer would have
   been a far larger change than the requirement needs.
2. **The running build predated the modules.** `apps/web/.next` was built before
   WP26/WP27 existed, so the new routes answered 404 through the product's own
   error envelope. This is a fixture hazard rather than a product defect, but it
   is worth recording: a stale build makes a missing route look like a missing
   row. `npm run build` is a prerequisite for either suite.
3. **Neither suite was re-runnable at first.** Both passed once and were then
   refused by the state they had left. `test:updates` hardcoded manifest
   versions, which are unique per environment whether or not they were ever
   applied, so an earlier run's rejected candidates occupied them; versions are
   now derived from the highest version the environment has seen. `test:support`
   registered a canary matching a value present in every report this
   installation can produce, and the product cannot withdraw a canary, so every
   later generation was refused; the suite now removes that one row directly and
   says in the code that having to bypass the product is itself the finding.
   Both suites were then run repeatedly against the same database to prove it.
4. **`web:smoke` had been failing since before this work.** It matched the
   landing page on wording the page has not carried since it was rewritten, and
   asserted that `/api/v1/admin/overview` returns 404 on the grounds that the
   route was unbuilt — an assertion that turned into a test that the product was
   incomplete, and that started failing the moment the overview module landed at
   `9742271`. The last recorded pass was 2026-09-16. Repaired to assert what is
   actually worth proving at bootstrap: the landing page is labelled synthetic,
   and a business endpoint started without its profile environment refuses with
   503 rather than answering anyway.

## Screens

Five read-only screens were added under two navigation groups, built so the
separations each module exists to keep cannot be smudged by the interface:

| Screen | What it refuses to do |
|---|---|
| Support cases | Put the vendor's case state and the local control state in one column. They are two rows, and when a vendor has closed their case while the local control is unverified the screen says so in as many words. |
| Forbidden content | Show a canary token. Only the digest is displayed, so the page that checks for a secret does not become a place to read one. |
| Releases | Present eligibility as a single verdict. Every one of the eight checks is a row with its own reason, and the page states that eligible means fetch and verify, not run. |
| Updates | Offer rollback when the manifest says it would not work. A forward-recovery release says plainly why, and both post-change checks are separate columns from the plan state. |
| Installed versions | Move when an update starts. A row appears when one finishes, because an installation that has restarted its services is not one whose boundaries have been rechecked. |

The `list_update_plans` route was added for these (contract 0.9.0): without it
only an applied plan was reachable, through the installed version history, so
FR-M31-03's promise that an interrupted update stays visible was not keepable.

## What is not done, plainly

1. **The screens report and do not act.** Generating, approving, transferring,
   registering a canary, importing a release, planning an update and recording a
   step are all API-only. This is the largest remaining gap for both modules.
2. **Nothing is fetched, unpacked or executed by M31.** Archive safety and the
   expansion ratio are decided from the signed manifest before anything would be
   written, but this module records and gates an update a customer performs; it
   does not perform one. Rollback for a reversible release is likewise recorded
   as available and never executed.
3. **The release signing key has no default.** `ORVIA_RELEASE_KEY_ID` and
   `ORVIA_RELEASE_PUBLIC_KEY` must be supplied; without them `importRelease`
   returns 503. The local fixture pair lives at `.local/release-fixture.json`
   (git-ignored, generated in this pass, equivalent to the licence fixture) and
   both it and the private half must be exported for `npm run test:updates`.
4. **No retention enforcement against a recorded approval window**, and no way
   to withdraw a registered canary — the second is why `test:support` has to
   delete a row directly to stay re-runnable.
5. **M26 Billing remains at zero** and is partly blocked: the payment provider
   is an OPEN decision the build pack forbids inventing.

## Running the suites

```
npm run services -- up
npm run db:migrate
npm run build
ORVIA_RELEASE_KEY_ID=… ORVIA_RELEASE_PUBLIC_KEY=… ORVIA_RELEASE_PRIVATE_KEY=… npm run test:updates
npm run test:support
```

The three release variables come from `.local/release-fixture.json`: `key_id`,
`public` and `private` respectively. `test:support` needs none of them.
