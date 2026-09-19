# Handoff — WP13 (M18 Coverage) and WP16 (M16 Processors) — Claude Code — not committed

**Base commit:** `5a07649`, with the uncommitted WP04, WP07, WP08 and WP15 work already in the tree.
**New commit:** not committed.
**Source master / hash verified:** SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`, unchanged.
**Contract version:** 0.7.0.
**Scope and profile:** `codex-a00` only. The frozen `rehearsal` profile was not started or modified.

## WP13 / M18 — Coverage and Failure Center

Requirements implemented: **FR-M18-01, FR-M18-02, FR-M18-03, FR-M18-04**.

Two habits the module refuses, enforced in schema, database and UI:

1. **No percentage without its denominator.** Each of five dimensions reports `numerator`, `denominator`, `excluded` and the reasons for every exclusion. A numerator larger than its denominator is rejected, and an exclusion with no stated reason is rejected — an unexplained exclusion is indistinguishable from a silent drop.
2. **Overlapping states are never summed.** Each attention state names the states a record may simultaneously be in, the report says in its own text that the figures must not be added, and the UI deliberately shows no total. A state cannot claim to overlap with itself.

Coverage is computed at read time, never stored, so there is no cached figure that can be true about a past the operator cannot see. Gaps *are* stored, because an owner, a severity, a deadline and a closure are decisions people make. Re-deriving refreshes an existing gap instead of stacking duplicates, so a long-standing problem keeps its original detection date; closure is terminal, and a recurrence opens a **new** gap so "we fixed that once" cannot hide it. A gap closes only with named evidence, or with an acceptance of risk that has an assigned owner and a recorded reason. Runbook guidance carries a literal `ADVISORY_ONLY` authority field and states in its own caveats that it does not establish a cause and does not close anything.

## WP16 / M16 — Processor and Vendor Management

Requirements implemented: **FR-M16-01, FR-M16-02, FR-M16-03**, and **FR-M16-04 partially**.

The defining rule, enforced in the schema, in database CHECK constraints and at the boundary: **telling a processor something, the processor replying, and somebody independently checking are three different facts.** Only an independent check with named evidence can record `VERIFIED`; a processor's own statement or reply is always an attributable claim. Acknowledgement and verification are refused if nothing was recorded as notified for that subject. Standing reports the three as three separate booleans and has no combined score field — when a processor has been told and has replied but not been checked, the UI says so explicitly.

Standing also derives systems linked to a processor that serve a purpose the processor was never authorised for, from declared links and published policies rather than from anyone's assertion. An assessment needs a reviewed applicability basis (not a questionnaire) and cannot complete while its own findings are open. A finding closes only with defined closure evidence or a retest.

## Closing the loop on WP04

M03's change-impact previously reported `ASSESSMENTS`, `PROCESSOR_RELATIONSHIPS` and `RETENTION_PLANS` as `unavailable_dimensions` because those modules did not exist. WP15 and WP16 made two of them real, so impact now computes **processor** and **retention constraint** dimensions for real and `unavailable_dimensions` is empty. The field is retained so a future dimension (incidents, notification obligations) can be declared unavailable rather than silently returned as empty. The graph suite grew from 46 to 48 assertions to cover it.

## Commands actually executed

All on `codex-a00`, 2026-09-19.

| Command | Exit code | Result | Artifact |
|---|---|---|---|
| `tsc --noEmit` | 0 | PASS | — |
| `eslint … --max-warnings 0` | 0 | PASS | — |
| `contracts:generate --check` | 0 | PASS | 89 route examples, contract 0.7.0 |
| `tsx --test tests/unit/*.test.ts` | 0 | PASS | **64/64** |
| `tracking:check` | 0 | PASS | 33 capability modules |
| `hygiene:check` | 0 | PASS | 0 findings |
| `db:migrate` | 0 | PASS | applied `0019_coverage_gaps` and `0020_processors` |
| `web build` | 0 | PASS | five new routes |
| `test:coverage` | 0 | **PASS 52/52** | `A00-coverage-integration-1789831009063…json` |
| `test:processors` | 0 | **PASS 35/35** | `A00-processors-integration-1789831597674…json` |
| `test:graph` | 0 | PASS 48/48 | `A00-graph-integration-1789831781549…json` |
| `test:rights` | 0 | PASS 64/64 | rerun |
| `test:retention` | 0 | PASS 45/45 | rerun |
| `test:consent` | 0 | PASS | `A00-consent-integration-1789832446896…json` |

**Tests not run:** `test:auth`, `test:workflows`, `test:evidence`, `test:expiry`, `test:regression`, `test:lifecycle`, `test:tls`, `services:smoke`, `test:network`, `test:isolation`, `dependencies:check`, Playwright suites, canonical acceptance T01–T34. They remain **NOT_RUN**. `test:enforcement` still carries the pre-existing failure attributed at the baseline in the WP04 handoff.

### Retained failures during development

1. **`test:coverage` failed at 39/52** — `the database refuses to backdate a detection` returned ACCEPTED. The **test** was wrong: its `UPDATE` targeted `state='IN_PROGRESS'` rows that did not exist, so it matched zero rows and the trigger never fired. Retargeted at a row that actually exists; the trigger then rejected it as intended. Product unchanged.
2. **`test:processors` failed at 34/35** — `a completed assessment cannot be completed again` returned 400 rather than 409. The **400 was correct**: the conclusion `'Again.'` is below the minimum length, so validation refused it before the terminal-state check. Split into two assertions — one proving a too-short conclusion is refused, one proving the terminal-state rule — which is a better test than the one I first wrote. Product unchanged.
3. **`tests/unit/graph.test.ts` failed once** after the impact vocabulary changed, asserting the old `unavailable_dimensions`. Updated deliberately, because the contract change was intentional and is now covered by an assertion that a now-implemented dimension can no longer be declared unavailable.

## Contract / dependency / ownership changes

- 17 additive routes across the two modules; four new capabilities (`coverage.read`, `coverage.manage`, `processor.read`, `processor.write`).
- **One narrowing change:** `ImpactAssessment.affected` gained `processor_ids` and `retention_constraint_ids`, and the `unavailable_dimensions` vocabulary changed from `ASSESSMENTS | PROCESSOR_RELATIONSHIPS | RETENTION_PLANS` to `INCIDENTS | NOTIFICATION_OBLIGATIONS`. Any consumer sending an old value now gets a 400. Within this uncommitted change set the only consumers are the test suite and the UI, both updated, but this is flagged for review.
- **No dependency added.** The unrelated `@pnpm/exe` lockfile entry is still present and still not mine.

## Remaining limitations and blockers

- **Coverage denominators count only what was recorded locally.** A system nobody declared is absent from both sides of every ratio, so coverage is not a measure of the estate. This is stated in the report's own limits and in the UI.
- Gap derivation is on demand only: there is no schedule and no notification when a gap passes its deadline. Overdue is visible but nobody is told.
- Connector-capability change is named in FR-M18-03 but is not yet a gap source, because no connector currently publishes a capability version change to detect.
- **FR-M16-04 is only partly met.** Assessment `kind` distinguishes sector-specific work and applicability requires a reviewed basis, but there are no SDF rule packs, no sub-processor chain discovery and no contract document storage.
- Nothing is exchanged with a processor automatically. Every coordination fact is recorded locally by a person; ORVIA sends nothing and receives nothing.
- Canonical acceptance T01–T34 remain **NOT_RUN**.

## Next integration action

Work reviews contracts 0.6.0/0.7.0 across WP04, WP07, WP08, WP15, WP13 and WP16 together. Six modules now interlock: the graph supplies copies, rights and retention act on them, processors carry the third-party relationships, and coverage measures all of it without inventing a headline number. The strongest next dependency is **WP17/M17 Privacy Incidents** — the one remaining `unavailable_dimensions` value — or the deferred execution work in WP08/WP15 that would let ORVIA dispatch and independently observe actions rather than record attested outcomes. Commit, merge, deployment and release remain with the human owner.
