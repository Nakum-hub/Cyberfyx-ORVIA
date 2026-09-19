# Handoff — WP08 (M14 execution outcomes) — Claude Code — not committed

**Base commit:** `5a07649`, with the uncommitted WP04 and WP07 work already in the tree.
**New commit:** not committed.
**Source master / hash verified:** SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`, unchanged.
**Contract version:** 0.7.0 (route and schema additions folded into the same unreviewed version as WP07).
**Scope and profile:** `codex-a00` only. The frozen `rehearsal` profile was not started or modified.

## Why this work package

The WP07 handoff recorded a specific defect: moving a request to `EXECUTING` set the execution dimension to `RUNNING` **because the operator clicked**, not because anything happened. That made the most important column in the module a restatement of the lifecycle state. This work package removes that.

## Delivered

| Path | Change |
|---|---|
| `packages/contracts/src/index.ts` | `SystemOutcomeRecord`/`SystemOutcome` with result/method/evidence invariants; `RequestPlanItemInput` split from `RequestPlanItem` so `automatable` is no longer operator input; `RightsRequest.outcomes`; a contract-level rule that `COMPLETE` requires a successful outcome on every planned system; `record_outcome` route |
| `packages/domain/src/shared/completion.ts` | `rightsExecution(plan, outcomes, unresolvedCount)` — pure, unit-testable derivation |
| `packages/db/migrations/0017_rights_outcomes.sql` | Outcome table with the same invariants as CHECK constraints, RLS, an immutability trigger, and a trigger preventing a plan item with a recorded outcome from being deleted |
| `packages/domain/src/rights/rights.ts` | `recordOutcome`; `settleExecution`; `automatable()` derived from the real connector; `transitionRequest` no longer writes the execution dimension; re-scoping preserves executed systems |
| `packages/backend/src/business.ts` | Dispatches `record_outcome` |
| `apps/web/src/components/screens/rights.tsx` | "What actually happened" table per system, with method and evidence, and a note saying the execution status is computed from exactly those rows |
| `tests/integration/rights/rights.test.ts`, `tests/unit/rights.test.ts` | Extended to 64 and 15 assertions |
| `tracking/capabilities.json` | M14 limitation rewritten to describe what execution now means |

Four guarantees now hold that did not before:

1. **A lifecycle transition cannot manufacture an effect.** `rightsExecution` takes the plan, the outcomes and the unreached-destination count. No lifecycle state is an input — asserted by a unit test on the function's arity as well as by behaviour.
2. **Success must name its method and its evidence.** Enforced in the schema, in a database CHECK, and at the boundary.
3. **A connector cannot be credited with an operation it does not implement.** `automatable` is derived from the system's real connector (restriction is the only operation the supported connectors implement), and recording a `CONNECTOR_OPERATION` against a non-automatable plan item is rejected.
4. **Work already performed cannot be un-planned.** Re-scoping may not drop a system with a recorded outcome, nor change the action it was executed under.

## Commands actually executed

All on `codex-a00`, 2026-09-19.

| Command | Exit code | Result | Artifact |
|---|---|---|---|
| `tsc --noEmit` | 0 | PASS | — |
| `eslint … --max-warnings 0` | 0 | PASS | — |
| `contracts:generate --check` | 0 | PASS | 63 route examples, contract 0.7.0 |
| `tsx --test tests/unit/*.test.ts` | 0 | PASS | **45/45** |
| `tracking:check` | 0 | PASS | 33 capability modules |
| `hygiene:check` | 0 | PASS | 0 findings |
| `db:migrate` | 0 | PASS | `A00-migration-1789827909124…json`, applied `0017_rights_outcomes` |
| `web build` | 0 | PASS | — |
| `test:rights` | 0 | **PASS 64/64** | `A00-rights-integration-1789828249960…json` |
| `test:graph` | 0 | PASS 46/46 | rerun after WP08 |
| `test:workflows` | 0 | PASS | `A00-workflow-integration-1789828636961…json` |

**Tests not run:** `test:auth`, `test:consent`, `test:evidence`, `test:expiry`, `test:regression`, `test:lifecycle`, `test:tls`, `services:smoke`, `test:network`, `test:isolation`, `dependencies:check`, Playwright suites, canonical acceptance T01–T34. They remain **NOT_RUN**. `test:enforcement` still carries the pre-existing failure attributed at the baseline in the WP04 handoff.

### Retained failures during development

1. **`test:rights` failed at 23/64** — `a recorded success is reflected in the execution dimension` expected `COMPLETE`, observed `PARTIAL`. **The product was right and the assertion was wrong.** That request had an unreachable tape archive, so a success on every planned system is still partial. The assertion was corrected to state that, which is a better test than the one I first wrote. Product code unchanged.

2. **`test:rights` failed at 63/64 with a 503** — `re-scoping cannot discard a system whose outcome was recorded`. This was a genuine design collision I had introduced: `scopeRequest` deleted and reinserted every plan item, which the new retention trigger correctly refused once an outcome existed. Fixed in the product, not the test: re-scoping now preserves executed plan items, rejects omitting them (409) and rejects changing the action they were executed under (409). The test was expanded to cover all three cases.

Both are recorded rather than quietly amended, because the first shows a test being corrected to match correct behaviour and the second shows behaviour being corrected to match a constraint.

## Contract / dependency / ownership changes

- `RequestPlanItemInput` is a **narrowing** of what the API accepts: `automatable` was previously supplied by the caller and is now rejected as an unknown field. Any existing caller sending it will get a 400. Within this uncommitted change set the only caller is the test suite, which was updated, but this is the one change here that is not purely additive and it is flagged for review.
- **No dependency added.** The unrelated `@pnpm/exe` lockfile entry is still present and still not mine.

## Remaining limitations and blockers

- **Outcomes are recorded, not driven.** ORVIA does not yet dispatch a planned action and observe its effect for rights requests; an operator or external process records what happened. The durable workflow engine, the signed-command path and the agent already exist for consent withdrawal, but joining them would require generalising `app.workflows` beyond its consent-specific columns and adding agent capabilities and a new signed-command operation vocabulary — a change to `COMMAND_SCHEMA_VERSION` that needs deliberate versioning and agent-side review. That is the honest next step and it is **not** done.
- `EFFECT_UNKNOWN` is recordable but there is no reconciliation path for rights outcomes equivalent to the consent one; an unknown effect stays unknown until someone records a superseding request.
- A recorded outcome is immutable by design. Correcting a mistaken outcome currently requires a new request, which may be too blunt; a reviewed supersession record would be better and is not implemented.
- Everything else listed in the WP07 handoff (no portal intake, no age assurance, no response package generation) still stands.
- Canonical acceptance T01–T34 remain **NOT_RUN**.

## Next integration action

Work reviews contracts 0.6.0/0.7.0 across WP04, WP07 and WP08 together. The strongest next dependency is either **WP15/M15 Retention** (which the plan's `retention_exception` field and the outcome vocabulary already anticipate) or the deferred half of WP08 — generalising the workflow engine so rights actions are dispatched and independently observed rather than attested. Commit, merge, deployment and release remain with the human owner.
