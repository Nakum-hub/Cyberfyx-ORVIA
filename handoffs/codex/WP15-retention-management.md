# Handoff — WP15 (M15 Retention Management) — Claude Code — not committed

**Base commit:** `5a07649`, with the uncommitted WP04, WP07 and WP08 work already in the tree.
**New commit:** not committed.
**Source master / hash verified:** SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`, unchanged.
**Contract version:** 0.7.0 (folded into the same unreviewed version as WP07/WP08).
**Scope and profile:** `codex-a00` only. The frozen `rehearsal` profile was not started or modified.

## Delivered

Requirements implemented: **FR-M15-01, FR-M15-02, FR-M15-04**, and **FR-M15-03 partially** (see limitations).

| Path | Change |
|---|---|
| `packages/contracts/src/index.ts` | Retention constraints, legal holds, reviewed decisions, eligibility with a typed blocker vocabulary, per-copy-class outcomes; `retention.read`/`retention.write`/`retention.approve`; 9 routes |
| `packages/db/migrations/0018_retention.sql` | 5 tables, RLS, grants, append-only triggers, terminal-release trigger, and the backup-erasure CHECK |
| `packages/domain/src/retention/retention.ts` | New bounded domain module owning M15, including the eligibility engine |
| `packages/backend/src/business.ts` | Dispatches the 9 routes |
| `packages/authz/src/index.ts`, `policy/admin/authorization.rego` | `retention.approve` granted only to `ORG_SUPER_ADMIN` |
| `apps/web/src/components/screens/retention.tsx`, `apps/web/src/app/workspace/retention/**`, `shell.tsx`, `inventory.tsx` | Constraints, holds and outcomes screens; eligibility embedded in the data-asset detail page |
| `tests/integration/retention/retention.test.ts`, `tests/unit/retention.test.ts` | New suites (45 + 6 assertions) |
| `tracking/capabilities.json` | M15 `NOT_IMPLEMENTED` → `IMPLEMENTED_SANDBOX_SUBSET` |
| `package.json` | Adds `test:retention` |

Retention attaches to a **copy** — a data asset from the M03 graph — rather than to a vague "record", because a live store, a derived copy and a backup differ in what can be reached and what can be verified. Three refusals are enforced end to end, in the schema, in the database and at the boundary:

1. **Silence is not permission.** A copy with no recorded retention basis is `NO_RECORDED_BASIS` and ineligible. Deleting it is refused with 409. Absence of a rule is never treated as authority to delete.
2. **Conflicting constraints do not resolve themselves.** When one constraint would permit deletion and another still requires retention, the result is `UNRESOLVED_CONSTRAINT_CONFLICT` — blocked until a reviewer with `retention.approve` records which constraint governs and why. The longest duration is never applied automatically. A reviewed decision settles a conflict but cannot manufacture permission a constraint does not give, nor override a hold.
3. **A backup is never reported as erased.** A `BACKUP_COPY` cannot record `SUPPRESSED` or `DELETED` at any layer; the honest result is `EFFECT_UNKNOWN`. A future expiry date is not accepted as current proof of erasure.

Holds name the exact copies they cover — there is no hold-everything flag, and a hold over a copy that does not exist is a 404. A released hold is terminal; re-imposing one requires a new hold with its own authority reference, so each period of preservation is separately justified.

## Commands actually executed

All on `codex-a00`, 2026-09-19.

| Command | Exit code | Result | Artifact |
|---|---|---|---|
| `tsc --noEmit` | 0 | PASS | — |
| `eslint … --max-warnings 0` | 0 | PASS | — |
| `contracts:generate --check` | 0 | PASS | 72 route examples, contract 0.7.0 |
| `tsx --test tests/unit/*.test.ts` | 0 | PASS | **51/51** |
| `tracking:check` | 0 | PASS | 33 capability modules |
| `hygiene:check` | 0 | PASS | 0 findings |
| `db:migrate` | 0 | PASS | `A00-migration-1789828946560…json`, applied `0018_retention` |
| `web build` | 0 | PASS | includes the three retention routes |
| `test:retention` | 0 | **PASS 45/45** | `A00-retention-integration-1789829359663…json` |
| `test:rights` | 0 | PASS 64/64 | rerun after WP15 |
| `test:graph` | 0 | PASS 46/46 | rerun after WP15 |
| `test:consent` | 0 | PASS | `A00-consent-integration-1789829821147…json` |
| `test:evidence` | 0 | PASS | `A00-evidence-integration-1789830049761…json` |

**Tests not run:** `test:auth`, `test:workflows`, `test:expiry`, `test:regression`, `test:lifecycle`, `test:tls`, `services:smoke`, `test:network`, `test:isolation`, `dependencies:check`, Playwright suites, canonical acceptance T01–T34. They remain **NOT_RUN**. `test:enforcement` still carries the pre-existing failure attributed at the baseline in the WP04 handoff.

### Retained failure during development

`test:retention` failed at 30/45 — `a backup copy cannot be reported as deleted` returned **503** instead of 400. The refusal was correct but was reaching the caller as an unhandled schema error rather than a typed validation failure. Fixed in the product: the backup rule is now an explicit named check (`backup_erasure_is_not_independently_verifiable`) so an operator gets a stated reason rather than a bare failure. The schema and database checks remain as defence in depth.

## Contract / dependency / ownership changes

- 9 additive routes and three new capabilities. `retention.approve` is held only by `ORG_SUPER_ADMIN`; as with `rights.release`, whether that is the right role is a customer policy decision flagged for review.
- **No dependency added.** The unrelated `@pnpm/exe` lockfile entry is still present and still not mine.

## Remaining limitations and blockers

- **FR-M15-03 is only partly met.** Outcomes are recorded per copy with dependency-free ordering; there is no bounded adapter execution, no generation check at the moment of deletion, no operation budget and no checkpointing, because nothing dispatches a deletion yet. Outcomes are attested, exactly as in WP08.
- Only `RECORD_CREATED` and `LAST_INTERACTION` trigger dates can be established locally. `CONSENT_WITHDRAWN`, `CONTRACT_ENDED` and `LEGAL_EVENT` are accepted as triggers but their dates are not linked to a copy, so their periods are reported as *not shown to have elapsed* rather than silently treated as elapsed. This is deliberate and is stated in the eligibility reason, but it is a real gap.
- Crypto deletion is not implemented. The master treats it as optional advanced scope with key-copy limitations; nothing here claims it.
- Backup expiry schedules are not tracked, so a backup's eventual rotation is not modelled — only that its erasure cannot be verified.
- A quarantined restore is surfaced as a blocker for an operator to clear; there is no automatic reconciliation of current restrictions against the restored copy.
- Canonical acceptance T01–T34 remain **NOT_RUN**.

## Next integration action

Work reviews contracts 0.6.0/0.7.0 across WP04, WP07, WP08 and WP15 together. The four modules now form a coherent spine: the graph inventory (M03) supplies the copies, rights requests (M14) and retention (M15) both act on them, and both record outcomes rather than asserting them. The strongest next dependency is **WP13/M18 coverage and gaps**, which now has a real inventory denominator to compute against, or the deferred execution half of WP08/WP15 — generalising the durable workflow engine so deletions and rights actions are dispatched and independently observed instead of attested. Commit, merge, deployment and release remain with the human owner.
