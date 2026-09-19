# Handoff — WP17 (M17 Privacy Incident Explorer) — Claude Code — not committed

**Base commit:** `5a07649`, with the uncommitted WP04, WP07, WP08, WP15, WP13 and WP16 work already in the tree.
**New commit:** not committed.
**Source master / hash verified:** SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`, unchanged.
**Contract version:** 0.7.0.
**Scope and profile:** `codex-a00` only. The frozen `rehearsal` profile was not started or modified.

## Delivered

Requirements implemented: **FR-M17-01, FR-M17-02, FR-M17-03, FR-M17-04**.

Three design commitments, enforced in schema, database and UI:

1. **Occurrence, detection and awareness are three moments, not one.** Different duties run from different ones, so conflating them silently moves a deadline. Their real ordering is enforced at the boundary *and* in the database, and an unestablished moment stays `null` rather than being filled in from a neighbour. The UI shows them as three rows.
2. **ORVIA ships no notification periods.** Every deadline comes from a rule the customer recorded and activated, naming its own reviewed source, which of the three moments its clock runs from, and how long it allows. A duty whose clock has not started has **no deadline** rather than a guessed one, and nothing can be overdue without a deadline. Severity is recorded configured policy with a stated basis — never a determination of what a law requires.
3. **ORVIA dispatches nothing.** A dispatch is a recorded claim that must name its evidence; it cannot be withdrawn once recorded; and where no supported channel exists the obligation becomes `MANUAL_PACKAGE_REQUIRED` with a stated reason rather than silently succeeding.

Corrections append with their previous value, their reviewer and their reason, and **name every deadline they moved**, so a clock never shifts quietly. A rule that does not apply while the affected scope is uncertain is recorded as `NOT_APPLICABLE` rather than skipped, keeping the decision visible. An incident cannot be closed while any notification is still owed.

## Closing the last unassessed dimension

M03's change impact reported `INCIDENTS` as unavailable. It is now computed for real: impact returns `incident_ids` for incidents scoped to an affected system or purpose. `unavailable_dimensions` is down to a single value (`NOTIFICATION_OBLIGATIONS`, which are not traced to individual copies), and a unit test asserts that a now-implemented dimension can no longer be declared unavailable.

## Commands actually executed

All on `codex-a00`, 2026-09-19.

| Command | Exit code | Result | Artifact |
|---|---|---|---|
| `tsc --noEmit` | 0 | PASS | — |
| `eslint … --max-warnings 0` | 0 | PASS | — |
| `contracts:generate --check` | 0 | PASS | 98 route examples, contract 0.7.0 |
| `tsx --test tests/unit/*.test.ts` | 0 | PASS | **71/71** |
| `tracking:check` | 0 | PASS | 33 capability modules |
| `hygiene:check` | 0 | PASS | 0 findings |
| `db:migrate` | 0 | PASS | applied `0021_incidents` |
| `web build` | 0 | PASS | three new routes |
| `test:incidents` | 0 | **PASS 42/42** | `A00-incidents-integration-1789833354099…json` |
| `test:graph` | 0 | PASS 48/48 | rerun after impact wiring |

**Tests not run:** `test:auth`, `test:workflows`, `test:evidence`, `test:expiry`, `test:regression`, `test:lifecycle`, `test:tls`, `services:smoke`, `test:network`, `test:isolation`, `dependencies:check`, Playwright suites, canonical acceptance T01–T34. They remain **NOT_RUN**. `test:enforcement` still carries the pre-existing failure attributed at the baseline.

### Retained failures during development

Four, each fixed in the right place:

1. **503 on `an incident cannot be detected before it occurred`.** The database CHECK caught it but the boundary did not, so the caller got a bare failure. **Product fixed:** the ordering rules were added to `IncidentCreate` so a caller gets a named validation error, with the database constraint retained as defence in depth.
2. **`one obligation exists per activated rule` expected 2, got 4.** Obligation rules persist across runs of the suite, so the global count was not a stable assertion. **Test fixed** to assert on the two rules that run created, which is what the requirement is actually about.
3. **ZodError on containment.** `containIncident` wrote a `containment_note` into the stored document, which the strict wire schema then rejected when the document was spread into it. **Product fixed:** `incidentDocument` now selects wire fields explicitly, because the stored document legitimately carries operational notes the wire shape does not expose.
4. **ZodError on closure.** The incident carried obligations from rules earlier runs had activated, all of which correctly blocked closure. **Test fixed** to resolve every outstanding obligation first — the blocking behaviour is the requirement, not a defect.

Only the first and third changed product code; both were real defects in how a refusal reached the caller.

## Contract / dependency / ownership changes

- 9 additive routes; three new capabilities (`incident.read`, `incident.write`, `incident.approve`). Activating a rule pack and closing an incident are approval acts held by `ORG_SUPER_ADMIN`.
- **One narrowing change:** `ImpactAssessment.affected` gained `incident_ids` and `unavailable_dimensions` narrowed to `NOTIFICATION_OBLIGATIONS`. Consumers updated in the same change.
- **No dependency added.** The unrelated `@pnpm/exe` lockfile entry is still present and still not mine.

## Remaining limitations and blockers

- **Nothing is filed or sent.** There is no regulator integration, no message transport and no notification content drafting. Every dispatch is a person recording what they did, with evidence.
- Overdue duties are visible but trigger no alert; there is no scheduled escalation. This is the same gap as overdue gaps in M18 and wants one notification mechanism rather than two.
- `NOTIFICATION_OBLIGATIONS` remains an unavailable impact dimension because obligations attach to an incident, not to an individual copy. Tracing them to copies needs a modelling decision, not just code.
- Rule packs are per-scope rows, not versioned, signed or distributable artifacts. Sharing a reviewed pack between environments is not supported.
- Severity is a recorded label with a stated basis; nothing evaluates it against any rule pack.
- Canonical acceptance T01–T34 remain **NOT_RUN**.

## Next integration action

Work reviews contracts 0.6.0/0.7.0 across the seven completed work packages together. The strongest next dependency is a shared **notification and escalation mechanism** (M10/WP17's delivery half), which both overdue gaps and overdue notification duties need and which neither currently has, or the deferred execution work in WP08/WP15 that would let ORVIA dispatch and independently observe actions rather than record attested ones. Commit, merge, deployment and release remain with the human owner.
