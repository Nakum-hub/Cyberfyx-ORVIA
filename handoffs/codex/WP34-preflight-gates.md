# WP03 / WP34 — Customer Onboarding (M29), FR-M29-01 and FR-M29-02

**Status: built, applied and qualified on the `codex-a00` profile. M29 stays at
`PARTIAL_SANDBOX` — three of four requirements are now built, FR-M29-04 is not.**

## What was built

Eleven preflight gates, each answered by examining something rather than
asserting it.

| Gate | What it actually examines |
|---|---|
| `RUNTIME_LOCATION` | The address this process is serving on, from the running profile. |
| `RUNTIME_AND_ARCHITECTURE` | The Node major version, platform and arch this process is executing on. |
| `TRANSPORT_SECURITY` | The scheme served, and whether that address is reachable off the host. |
| `DURABLE_STORAGE` | The database's own `fsync` and `synchronous_commit` settings. |
| `CUSTOMER_CONTROLLED_IDENTITY` | Active primary owners in this organisation's local identity store. |
| `SIGNING_KEYS` | The verification key identifiers present in the running environment. |
| `BACKUP_TARGET` | ~~Nothing — reports `NOT_VERIFIABLE_HERE` with the reason.~~ **Superseded by FR-M32-03:** whether a snapshot has been declared and a restore reconciled and released. See `WP29-WP32-backup-restore-quarantine.md`. |
| `PERMITTED_EGRESS` | Configured connection endpoints outside loopback. Not the firewall, and it says so. |
| `VENDOR_TELEMETRY_DISABLED` | The telemetry switches of every third-party component. |
| `LICENCE_VALIDITY` | Whether a signed licence is inside its validity window. |
| `PACKAGE_SIGNATURE` | FR-M29-01: whether the installed version has a verified manifest behind it. |

> **Amended after FR-M32-03.** The seventh row was the design point of this
> work package: at the time this build had no backup subsystem, so the gate
> reported that it could not check rather than passing. FR-M32-03 later gave
> the installation a record of declared snapshots and reconciled restores, and
> the gate is decidable over that record now. No gate in the current build
> returns `NOT_VERIFIABLE_HERE`; the verdict remains in the vocabulary and is
> exercised by the unit suite. The paragraph below is kept as written because
> the reasoning still governs any future gate that cannot examine anything.

The design point is the seventh row. This build has no backup subsystem, so a
gate reporting a backup target as verified would be a claim about infrastructure
the product has never seen. It reports that it cannot check, says why, and is
listed separately from the failing gates — `an_unverified_gate_is_not_a_passed_gate`
is a literal `true`, and the schema refuses an unverifiable gate that observes
anything, or a passing gate that claims it could not be checked.

There is no overall verdict, no score and no percentage. A preflight that passes
everything is indistinguishable from one that checked nothing, and
`passing_every_gate_is_not_a_statement_about_the_law` says so structurally.
Fields like `ready_for_production`, `compliant` and `score` are refused at parse
time, which the unit suite asserts.

Migration `0032` exposes two integers — active identities and active primary
owners, scoped to the caller's organisation — through a view. The application
role cannot read `staff_auth`, and should not be able to: widening a business
role to see identity records so a gate could count to one would be far larger
than the requirement needs. Same shape and reasoning as `0026`'s
`schema_revision`.

## Evidence

Commit under test: working tree on `prototype/claude/v1-modules-wp04-wp25`,
parent `3ced2bf`, profile `codex-a00`, contract 0.13.0.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | clean, exit 0 |
| Lint | `npm run lint` | 0 findings, exit 0 |
| Unit tests | `npm test` | **144 passed, 0 failed** (7 of them preflight) |
| Contract check | `npm run contracts:check` | 142 route examples validated, contract 0.13.0 |
| Hygiene | `npm run hygiene:check` | 0 findings, 3001 files examined |
| Tracking | `npm run tracking:check` | 33 capability modules validated; no results promoted |
| Migration | `npm run db:migrate` | `0032_local_identity_summary` applied |
| M29 preflight | `npm run test:preflight` | **18 assertions, 0 failures**, run twice |
| M29 connection | `npm run test:onboarding` | 33 assertions, 0 failures |
| Core regression | `npm run test:regression` | 70 assertions, 0 failures |
| Web smoke | `npm run web:smoke` | PASS |
| Runtime image | `npm run runtime:build` | PASS from the committed source |

## What running it actually found

**Three failures, all mine, none of them in the product.**

1. The identity gate first read `staff_auth.authority` directly. The application
   role has no access to that schema and the route answered 503. The fix was not
   to grant it: a scoped view returning two integers answers the gate without
   letting a business role see an identity record.

2. A second 503 after the fix was the stale-build trap — I edited the domain
   module and re-ran the suite without rebuilding, so the fixture was still
   serving the previous bundle. Worth recording because it looks exactly like a
   real failure and is not one.

3. The identity assertion compared against an **unscoped** owner count. The
   fixture holds primary owners in a second tenant and a sibling environment, so
   the unscoped number is larger. The gate was right and the test was wrong; the
   suite now asserts the scoped count *and* that it is strictly smaller than the
   unscoped one, which pins the scoping down rather than merely accommodating it.

## What is not done, plainly

- **FR-M29-04 has no code**, and `OPEN-11` leaves the supported import formats
  undecided. Nothing imports, quarantines, previews, reconciles, traces
  provenance or purges.
- **The customer-held recovery route is not built.** FR-M29-02 names both a
  protected primary owner and a customer-held recovery procedure; only the first
  exists.
- **The preflight reads the installation at one moment.** It does not watch it,
  and a configuration that changes afterwards is not reflected until it is run
  again.
- **The earlier wizard steps do not exist** — organisation, industry, admins and
  deployment are not screens.
