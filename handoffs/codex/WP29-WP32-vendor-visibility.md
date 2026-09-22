# WP29 / WP32 — Monitoring (M32), FR-M32-04

**Status: built as far as this deployment permits, and the part that is not is
stated rather than simulated. M32 stays `PARTIAL_SANDBOX`.**

## The shape of the problem

> Show vendor-side only its own service health and timestamped per-case reported
> facts; no automatic customer telemetry, employee tracking or model-absence
> incident.

Three of the four clauses are prohibitions, and a prohibition cannot be
demonstrated by asserting it. A page that says *"we collect no telemetry"* is
worth nothing: it is the same sentence a product that collected everything would
print. The claim has to be checkable by the person reading it.

## What is genuinely absent, and is said so

There is **no vendor-side application in V1 and no vendor service anywhere in
this build**. So:

- There is no vendor console to render. None was built, and none is faked.
- Vendor service health is reported as `observed: false` with the reason. That
  field is a literal `false` in the contract, so no future build can quietly
  start claiming it looked. An unobserved service is not a healthy one.

This is why M32 stays `PARTIAL_SANDBOX`. The customer-side report below is
genuinely useful, but it is not a vendor-side surface and does not stand in for
one.

## What was built

The requirement restricts what the vendor may see. So rather than asserting the
restriction, the build **accounts for everything that has ever left this
installation towards the vendor** and lets the reader check the list themselves.
If an automatic channel existed, the only way to keep this page honest would be
to list what it sent.

`GET /api/v1/admin/vendor-visibility` returns, per approved payload:

- the case and its subject, and the vendor case reference if one is recorded;
- **the timestamped per-case reported facts themselves** — closed diagnostic
  codes with occurrence counts and the window they were seen in;
- who approved it, when, and the exact payload digest they approved;
- whether anybody recorded carrying it, and how that went.

Three separations the report refuses to collapse:

| Kept apart | Why |
|---|---|
| Approved-and-carried vs approved-and-never-carried | An approval is not a disclosure. `approved_but_not_carried` is derived from the list and the schema refuses a disagreement. |
| A case vs a disclosure | `cases_with_nothing_disclosed` is counted separately so an open support case is never read as something having been sent. |
| What was disclosed vs what the vendor holds | `this_states_what_was_disclosed_not_what_the_vendor_holds` is a literal `true`. What the vendor actually holds is not observable from here. |

Every entry also carries `transported_by_orvia: false`. This product has no
transport; an operator carried the payload and recorded that they did.

**No table was added.** Every row is derived from the support records the
installation already keeps, which is the point: nothing is collected in order to
report that nothing is collected.

## The prohibitions, made checkable

- **No automatic telemetry.** There is no channel. Every entry required a named
  person to approve one exact digest, and the integration suite proves an opened
  case discloses nothing by itself.
- **No employee tracking.** The disclosed facts are closed codes; the unit suite
  asserts no diagnostic code contains `PRINCIPAL`, `EMPLOYEE`, `STAFF`, `USER`,
  `PERSON` or `OPERATOR`, and that fields like `note`, `log_excerpt`,
  `principal_id` and `hostname` are refused at parse time.
- **No model-absence incident.** Asserted against the closed vocabularies rather
  than in prose: the unit suite checks `DiagnosticCode`, `SupportSubject`,
  `IncidentSeverity` and `IncidentState` contain no `MODEL`, `AI_`, `INFERENCE`,
  `EMBEDDING`, `PREDICTION` or `TRAINING` term. **Adding one fails the suite.**

## Files

| Path | What it is |
|---|---|
| `packages/contracts/src/index.ts` | `VendorServiceHealth`, `VendorDisclosure`, `VendorVisibility`; one route |
| `packages/domain/src/monitoring/vendor.ts` | The derived read. No table, no collection |
| `apps/web/src/components/screens/vendor-visibility.tsx` | The screen |
| `tests/unit/vendor-visibility.test.ts` | 7 contract invariants |
| `tests/integration/monitoring/vendor-visibility.test.ts` | 18 assertions driving two real disclosures |

## Evidence

Run on the `codex-a00` profile:

| Command | Result |
|---|---|
| `npm test` | 158 unit tests, 0 failures |
| `npm run contracts:check` | 150 route examples, contract `0.14.0` |
| `npm run test:vendor-visibility` | 18 assertions, 0 failures |

## What a later build would still have to do

Build an actual vendor-side surface, once there is a vendor service to host one,
and keep it to the two things this requirement permits it to show. The contract
here already fixes what those two things are.
