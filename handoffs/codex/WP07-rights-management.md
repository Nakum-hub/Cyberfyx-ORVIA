# Handoff — WP07 (M14 Rights Management) — Claude Code — not committed

**Base commit:** `5a07649`, with the uncommitted WP04 work of [WP04-privacy-control-graph.md](WP04-privacy-control-graph.md) already in the tree.
**New commit:** not committed.
**Source master / hash verified:** SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`, unchanged.
**Contract version:** 0.6.0 → **0.7.0** (additive only).
**Scope and profile:** `codex-a00` only. The frozen `rehearsal` profile was not started or modified.

## Delivered

Requirements implemented: **FR-M14-01, FR-M14-02, FR-M14-03, FR-M14-04** (module M14, work package WP07).

| Path | Change |
|---|---|
| `packages/contracts/src/index.ts` | Master request-state vocabulary, `REQUEST_TRANSITIONS` canonical map, five independent dimensions, identity grades, mandates, per-system plan, response release; `rights.read`/`rights.write`/`rights.release`; 10 routes |
| `packages/contracts/src/examples.ts` | Explicit `IdentityReview` example — the sampler cannot satisfy the grade/count invariant |
| `packages/db/migrations/0016_rights_requests.sql` | New: 4 tables, RLS, grants, 2 triggers (append-only history, terminal closure) |
| `packages/domain/src/rights/rights.ts` | New bounded domain module owning M14 |
| `packages/backend/src/business.ts` | Dispatches the 10 routes |
| `packages/authz/src/index.ts`, `policy/admin/authorization.rego` | `rights.release` granted only to `ORG_SUPER_ADMIN` |
| `apps/web/src/components/screens/rights.tsx`, `apps/web/src/app/workspace/rights/**`, `workspace/representation/**`, `shell.tsx` | Request list, request detail, representation screens |
| `tests/integration/rights/rights.test.ts`, `tests/unit/rights.test.ts` | New suites (44 + 10 assertions) |
| `tracking/capabilities.json` | M14 `NOT_IMPLEMENTED` → `IMPLEMENTED_SANDBOX_SUBSET` with resolving evidence |
| `package.json` | Adds `test:rights` |

The design decision the module exists to enforce: **the lifecycle state is never the whole answer.** Identity, authority, execution, response and scope are separate stored columns and separate UI columns. A request can be `CLOSED` while execution is `PARTIAL` and destinations remain unreached, and both the database trigger and the contract refuse to let closure rewrite that. `rights.release` is a separate capability from `rights.write`, because disclosing data to a person is a different authority from progressing a ticket.

## Commands actually executed

All on `codex-a00`, 2026-09-19.

| Command | Exit code | Result | Artifact |
|---|---|---|---|
| `tsc --noEmit` | 0 | PASS | — |
| `eslint … --max-warnings 0` | 0 | PASS | — |
| `contracts:generate --check` | 0 | PASS | 8 artifacts, 62 route + 7 error examples, contract 0.7.0 |
| `tsx --test tests/unit/*.test.ts` | 0 | PASS | **40/40** (20 baseline + 10 WP04 + 10 WP07) |
| `tracking:check` | 0 | PASS | 33 capability modules |
| `hygiene:check` | 0 | PASS | 0 findings |
| `db:migrate` | 0 | PASS | `A00-migration-1789823063631…json`, applied `0016_rights_requests` |
| `web build` | 0 | PASS | includes `/workspace/rights`, `/workspace/rights/[id]`, `/workspace/representation` |
| `test:rights` | 0 | **PASS 44/44** | `A00-rights-integration-1789823787295-47da1723…json` |
| `test:graph` | 0 | PASS 46/46 | `A00-graph-integration-1789823686949-3fb9fd4e…json` (rerun after WP07) |
| `test:consent` | 0 | PASS | `A00-consent-integration-1789823904349…json` |
| `test:evidence` | 0 | PASS | `A00-evidence-integration-1789824116675…json` |

**Tests not run:** `test:auth`, `test:workflows`, `test:expiry`, `test:regression`, `test:lifecycle`, `test:tls`, `services:smoke`, `test:network`, `test:isolation`, `dependencies:check`, Playwright suites, and canonical acceptance T01–T34. They remain **NOT_RUN**. `test:enforcement` carries the pre-existing failure documented in the WP04 handoff and was not rerun here.

### Retained failure during development

`test:rights` first run FAILED at 11/44 (`A00-rights-integration-1789823357167-c625d531…json`) — `an ambiguous identity cannot begin a disclosing execution` returned **409** instead of 403. Cause was in the **test**, not the product: it advanced `VERIFIED → AWAITING_APPROVAL` directly, skipping `SCOPING`, so the canonical transition map refused the move before the identity gate was ever reached. The map behaved correctly. The fixture was corrected to follow `VERIFIED → SCOPING → AWAITING_APPROVAL`; the product code was not changed to accommodate the test.

## Acceptance

Negative cases covered: a transition outside the canonical map (409); an unknown lifecycle state (400); an exact grade claiming two references, an ambiguous grade claiming one, and a no-match grade naming references (400); execution of a disclosing right under an ambiguous identity (403); disclosure to an unresolved identity (403); release attempted with only `rights.write` (403); an already-expired delivery window (400); declining redaction review and still releasing (400); a second release (409); completion while destinations remain unresolved (409); acting on a closed request (409); a second revocation (409); execution under a revoked mandate (403); a mandate whose window ends before it starts (400); a mandate used for a right it does not name; an expired mandate; an auditor writing (403); a member without the capability (403).

Database-level guarantees proved directly against the superuser path: a closed request cannot be reopened, and request history cannot be rewritten or deleted.

## Contract / dependency / ownership changes

- Contract **0.7.0**, additive over 0.6.0. `REQUEST_TRANSITIONS` and `RELATIONSHIP_ENDPOINTS` are now canonical exported constants that both the server and the tests read, so the transition rules cannot drift between them.
- **No dependency added.** The unrelated `@pnpm/exe` lockfile entry noted in the WP04 handoff is still present and still not mine.
- `rights.release` is a new privileged capability held only by `ORG_SUPER_ADMIN` in both `roleCapabilities` and the OPA policy. Whether that is the right role is a customer policy decision, not an engineering one, and is flagged for review.

## Remaining limitations and blockers

- **Planned actions are recorded, not dispatched.** Moving a request to `EXECUTING` does not yet drive connectors; that join to the workflow engine is WP08 and the execution dimension is set from the transition rather than from observed effects. This is the most important gap to close next and is stated in the capability register.
- No portal self-service intake: requests are created through the staff API. The principal-facing surface is M13/WP22.
- No age assurance or adulthood-transition recheck (part of FR-M14-03). Mandate scope, validity and revocation are enforced; automatic re-evaluation on a birthday is not implemented.
- Response release records a reviewed, expiring delivery reference; it does not generate the response package contents.
- Identity matching is a recorded reviewer judgement. There is no automated candidate matching against the graph yet — deliberately, since the master warns a verified channel is not universal ownership of all historic records.
- Canonical acceptance T01–T34 remain **NOT_RUN**.

## Next integration action

Work reviews contract 0.7.0 together with WP04. Recommended reruns on integration: `test:rights`, `test:graph`, and the full backend battery spaced for the authentication window, plus the browser suites. The strongest next dependency is **WP08** (join rights execution to the durable workflow engine so the execution dimension reflects observed effects rather than operator transitions), followed by **WP15/M15 Retention**, which the per-system plan's `retention_exception` field already anticipates. Commit, merge, deployment and release remain with the human owner.
