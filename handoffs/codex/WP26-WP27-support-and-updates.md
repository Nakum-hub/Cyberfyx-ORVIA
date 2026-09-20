# WP26 / WP27 — Support Bundle System (M30) and Updates (M31)

**Status: source written and verified Docker-free. Never executed against a database.**
Both modules remain `NOT_IMPLEMENTED` in `tracking/capabilities.json`. That is
deliberate and it is the honest reading: migrations 0024 and 0025 have never been
applied, and no route in either module has ever been called. Docker was not
running for the duration of this work, so every Docker-backed check is NOT_RUN
and stays NOT_RUN.

## What was built

### WP26 / M30 — Support Bundle System

| Requirement | How it is met |
|---|---|
| FR-M30-01 | `DiagnosticReport` is a closed schema: every field is an enum, integer, timestamp, version or digest. There is no field in which a log line, an operational summary or a directory listing could be written. The report is assembled from local counts only, and `installation_reference` is a one-way digest so a vendor can correlate two reports without learning the installation identity. |
| FR-M30-02 | Approval names the exact `payload_digest` the approver previewed; a mismatch is refused, not reconciled. A new draft supersedes the previous one, so an approval that named the old payload cannot transfer the new one. `authorises_generation` is a literal `false`. The digest is revalidated again at transfer time, and a database trigger enforces both bindings independently of the application. |
| FR-M30-03 | `validateSubmission` is the check a vendor ingress would run, exposed locally so a customer learns whether a payload would be refused before carrying it anywhere. `app.support_ingress_validations` has six columns and no seventh: there is no column in which a submitted body could be kept, rejected or not. |
| FR-M30-04 | `SupportResolution` records the vendor's answer against the vendor's case and has no parameter that could mark a local control verified. `local_control_state` is read from the linked coverage gap on every request, never copied. `vendor_resolution_closes_local_gaps` is a literal `false`. |

The canary scan is defence in depth and says so: the schema should already make
it unnecessary, but the schema is a statement about today and the scan is a
statement about every change after it. A hit refuses generation and names which
registered canary matched.

### WP27 / M31 — Updates

| Requirement | How it is met |
|---|---|
| FR-M31-01 | `ReleaseClaims` carries provenance (source commit, build time, builder and reviewer references), a dependency inventory with digests, per-migration notes and the supported profile list. The manifest row is immutable: a trigger refuses every UPDATE and DELETE. |
| FR-M31-02 | Eligibility is eight separately named checks, reported individually, and `eligibility_is_not_permission_to_execute` is a literal `true`. Applying is a second act under a second capability (`update.approve`) that re-runs every check. Trust is re-evaluated at eligibility rather than inherited from import, so a withdrawn key makes an imported release ineligible. `unsafeArchiveEntry` refuses traversal, absolute, drive-qualified, backslash, empty-segment and null-embedded paths; a declared expansion over 100× the artifact is refused as a bomb. |
| FR-M31-03 | `recoveryMode` is derived from the manifest, never chosen: one irreversible migration forces `FORWARD_RECOVERY_ONLY`, and both `UpdateEligibility` and `UpdatePlan` refuse to parse if `rollback_available` disagrees. The ledger is append-only, so an interrupted run leaves its evidence rather than being tidied away by the next attempt. |
| FR-M31-04 | `introduces_network_egress` and `requires_model_runtime` are literal `false`, and `introduces_capabilities` is closed to this contract's own vocabulary, so a release cannot introduce an authority that does not already exist. `NO_UNSAFE_DOWNGRADE` refuses a release that is not strictly newer. `REVALIDATE_BOUNDARIES` and `RUN_CORE_REGRESSION` are two of the seven required steps, and the database refuses to record an update as applied until all seven have succeeded. |

## Evidence

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | clean, exit 0 |
| Unit tests | `npm test` | 104 passed, 0 failed (19 new) |
| Lint | `npm run lint` | 0 findings, exit 0 |
| Contract check | `npm run contracts:check` | 124 route examples validated, contract 0.8.0 |
| Hygiene | `npm run hygiene:check` | 0 findings |
| Tracking | `npm run tracking:check` | 33 capability modules validated |
| Integration | — | **NOT_RUN.** Docker unavailable. |
| Migrations 0024, 0025 | — | **NOT APPLIED.** No database has these tables. |

## What is not done, plainly

1. **No integration suite exists for either module.** Every claim above about
   runtime behaviour is a claim about code that has been typechecked and
   unit-tested at the schema boundary, not about code that has run. The database
   triggers in particular have never fired.
2. **The migrations are unapplied.** They may not even execute cleanly; that is
   exactly what has not been checked. Notably `GRANT SELECT ON bootstrap_migrations
   TO orvia_app` in 0024 assumes that table is reachable from the `app` role's
   search path, which has not been verified.
3. **No UI.** Neither module has a screen. The routes exist and the navigation
   does not.
4. **The release signing key pair does not exist.** `ORVIA_RELEASE_KEY_ID` and
   `ORVIA_RELEASE_PUBLIC_KEY` have no configured value, so `importRelease`
   currently returns 503 on every call. A fixture pair equivalent to the licence
   one in `.local/licence-fixture.json` still needs generating.
5. **M26 Billing remains at zero** and is partly blocked: the payment provider is
   an OPEN decision the build pack forbids inventing.

## Next steps, in order

1. Start Docker, apply 0024 and 0025 on the `codex-a00` profile, and fix whatever
   the migrations get wrong.
2. Restart OPA (`docker restart orvia-codex-a00-opa-1`) — the five new
   capabilities are a `.rego` change and OPA loads policy from disk at start.
3. Generate a release fixture key pair and write
   `tests/integration/support/support.test.ts` and
   `tests/integration/updates/updates.test.ts`, then add `test:support` and
   `test:updates` scripts.
4. Only then may these modules move off `NOT_IMPLEMENTED`.
