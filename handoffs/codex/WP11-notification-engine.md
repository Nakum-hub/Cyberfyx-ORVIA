# Handoff — WP11 (M10 Notification Engine) — Claude Code — not committed

**Base commit:** `5a07649`, with the uncommitted WP04, WP07, WP08, WP15, WP13, WP16 and WP17 work already in the tree.
**New commit:** not committed.
**Source master / hash verified:** SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`, unchanged.
**Contract version:** 0.7.0.
**Scope and profile:** `codex-a00` only. The frozen `rehearsal` profile was not started or modified.

## Why this work package

The WP13 and WP17 handoffs each recorded the same gap: overdue coverage gaps and overdue notification duties are visible but nobody is told, and both wanted one mechanism rather than two. This is that mechanism.

## Delivered

Requirements implemented: **FR-M10-01, FR-M10-03**, and **FR-M10-02/FR-M10-04 partially**.

Three commitments, enforced in schema, database and UI:

1. **Five facts, not one status.** Queued, sent, delivered, failed and acknowledged are independent booleans derived from an append-only log. They keep their real order — delivery presupposes sending, acknowledgement presupposes delivery — but a failure and a later success are *both* true, because both happened. There is no status that advances and erases what came before.
2. **Only queueing is something ORVIA did.** It needs no evidence. Every fact after it is a claim about the outside world and is refused without a named evidence reference. A channel this deployment has no transport for is declared `channel_available: false`, queued honestly with a note saying it will not be sent, and **cannot** be recorded as sent at all.
3. **Escalation never moves a deadline.** The sweep raises attention on overdue, undelivered tasks and leaves `source_due_at` untouched. This is guaranteed three ways: the function never writes it, a database trigger rejects any change to it, and `EscalationSweep.deadlines_changed` is a literal `0` so the wire shape cannot express a sweep that moved one. A task escalates once; repeated sweeps manufacture nothing.

## Commands actually executed

All on `codex-a00`, 2026-09-19.

| Command | Exit code | Result | Artifact |
|---|---|---|---|
| `tsc --noEmit` | 0 | PASS | — |
| `eslint … --max-warnings 0` | 0 | PASS | — |
| `contracts:generate --check` | 0 | PASS | 105 route examples, contract 0.7.0 |
| `tsx --test tests/unit/*.test.ts` | 0 | PASS | **79/79** |
| `tracking:check` | 0 | PASS | 33 capability modules |
| `hygiene:check` | 0 | PASS | 0 findings |
| `db:migrate` | 0 | PASS | applied `0022_notifications` |
| `web build` | 0 | PASS | two new routes |
| `test:notifications` | 0 | **PASS 32/32** | `A00-notifications-integration-1789834782520…json` |

Full integration battery rerun after this change, all passing: `test:incidents` 42/42, `test:processors` 35/35, `test:coverage` 52/52, `test:retention` 45/45, `test:rights` 64/64, `test:graph` 48/48, `test:consent`.

**Tests not run:** `test:auth`, `test:workflows`, `test:evidence`, `test:expiry`, `test:regression`, `test:lifecycle`, `test:tls`, `services:smoke`, `test:network`, `test:isolation`, `dependencies:check`, Playwright suites, canonical acceptance T01–T34. They remain **NOT_RUN**. `test:enforcement` still carries the pre-existing failure attributed at the baseline.

No test failures occurred during this work package; the suite passed on its first run.

## Contract / dependency / ownership changes

- 7 additive routes; two new capabilities (`notification.read`, `notification.manage`).
- **No dependency added.** The unrelated `@pnpm/exe` lockfile entry is still present and still not mine.

## Remaining limitations and blockers

- **Nothing is transmitted.** There is no mail transport, no webhook egress and no in-app inbox rendering. `IN_APP` is the only channel marked available, and even that means "recordable", not "shown to a user". A real in-app inbox is the obvious next increment and would make one channel genuinely end to end.
- **Escalation is on demand.** The sweep is an endpoint, not a schedule. Nothing runs it automatically, so in practice an operator must. Wiring it to the existing worker is small and was deliberately not done without a decision about cadence.
- Tasks are not created automatically when a gap or obligation goes overdue; an operator raises them. Auto-raising would need a policy decision about which findings deserve a message.
- FR-M10-01's preference rules and FR-M10-02's vendor billing contacts are not implemented; recipient scope is modelled but there is no preference store and no vendor-side path.
- FR-M10-04 is met only in the negative sense that ORVIA fabricates no filing integration and streams nothing to vendor support. There is no regulator dispatch path at all.
- Canonical acceptance T01–T34 remain **NOT_RUN**.

## Next integration action

Work reviews contracts 0.6.0/0.7.0 across the eight completed work packages together. The most valuable next increments are, in order: a real in-app inbox so one channel is genuinely end to end; scheduled escalation on the existing worker; and the deferred execution work in WP08/WP15 that would let ORVIA dispatch and independently observe actions rather than record attested ones. Commit, merge, deployment and release remain with the human owner.
