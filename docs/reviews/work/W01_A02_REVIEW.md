# W01 — A02 review and bounded correction

**Decision:** A02 acceptance BLOCKED by W01-A02-F01, medium severity. W01 remains open. A01's accepted foundation is retained.
**Reviewer:** Work · **Date:** 2026-09-16 · **Scope:** customer-local synthetic prototype, A02 only.

## Candidate and authority

| Item | Exact identity / observation |
|---|---|
| Approved source | Master document revision 1.3, SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`; unchanged and verified |
| A01 base | `50cb4daeded9253c4f7cca4f742cb212c10aa5b7`, accepted by Work review `10f8e11830c43a875bfc29d05f650c9f0d853c33` |
| A02 implementation | `3242521e59966885d8053747a82d96cb92ea55d5` |
| A02 evidence publication | `2e01b7a36d663382d82ec9310bd707f1c2d405ef`; only Codex handoff/evidence changes after implementation |
| Human integration | `004fe3dc43e3a278caeb9c4e4983e7e58a825b9f`, [PR #9](https://github.com/Nakum-hub/Cyberfyx-ORVIA/pull/9), merged at 15:38:53 UTC; tree identical to submitted head |
| Inspected main | `a5b6ff73c4fca4aa02e110ee5f11a121b1a7563b`, including the subsequent Cowork PR #7 merge at 15:41:25 UTC. A02 runtime source is unchanged by that merge |
| Contract | Executable candidate 0.3.0, A02-C01; accepted baseline 0.2.1. New route design is coherent with the profile, but candidate acceptance awaits F01 correction/retest |
| Scope/ownership | Codex implementation/schema/dependency writer; Work review/state writer; Claude Code UI/browser consumer; human integration/release. No new profile ADR, model, vendor operation, dependency pin or ownership transfer |

The repository's `handoffs/codex/A02-A07-continuation.md` records the human's instruction to implement the coding sequence continuously and seek consolidated Work review. The current user also reports A03 underway. Work records this implementation-order exception without changing the canonical acceptance dependencies or treating an unreviewed ticket as accepted. No recurring monitoring or automatic future review is established.

## Review finding W01-A02-F01

| Required field | Finding |
|---|---|
| Severity / disposition | **MEDIUM — correction/retest required before A02/W01 acceptance.** Expiring authority is checked against transaction-start time across lock waits. This is a bounded correctness/security defect, not a claimed cross-tenant exploit or a production assessment |
| Task / files | A02; `packages/domain/src/configuration.ts` (`publicationCandidate`, `publishPolicy`), `packages/domain/src/consent.ts` (`changeConsent`), with waits introduced by `transaction.ts` and `apps/web/src/server/business.ts`. Codex tests: `tests/integration/consent/consent.test.ts` |
| Source evidence | `publishPolicy` waits for publication/purpose locks and then consumes proof using `expires_at>now()`. `changeConsent` waits for aggregate state and selects an interaction using `expires_at>now() FOR UPDATE`, then may wait on the shared publication lock. The current SQL never rechecks these deadlines using the time at the eventual consume/mutation boundary |
| Why it matters | The producer promises a 120-second publication proof and ten-minute interaction. PostgreSQL `now()` is fixed at transaction start. A transaction begun before expiry can pass the predicate after expiry; an interaction can also expire after its initial check while a later publication lock is held. A timeout of ten seconds does not prevent a request starting near the deadline from crossing it |
| Reproduction / execution status | **Source-reviewed; real PostgreSQL/application reproduction NOT_RUN by Work.** Obtain a proof/interaction in Codex's isolated synthetic fixture, shorten only that test row's expiry to near future, hold the relevant publication/aggregate lock in another connection, start the real HTTP request before expiry, confirm it is waiting, then release after expiry within the query timeout. Current predicates can still admit the operation. The [temporary-table SQL control](repro/W01-A02-F01-expiry.sql) demonstrates the clock distinction; it too is NOT_RUN here and is not an application test |
| Expected behavior | At the defined consume/mutation boundary, new publication and consent operations must reject expired proof/interaction after relevant waits, without an approval, policy transition, event, outbox, receipt, idempotency-success record or epoch advance. Use an advancing trusted server clock with checks after lock acquisition; a check before a later wait is insufficient. An already committed, still-authorized identical idempotent replay must continue returning its original response |
| Owner | **Codex**. Preserve existing A01/A02/A03 work; no Work implementation edit. Update producer docs if the precise freshness boundary needs clarification. No dependency/framework/schema redesign is requested |
| Retest | Real HTTP/PostgreSQL controls for fresh success, already-expired denial, expiry during publication lock wait, expiry during aggregate/interaction wait, and expiry during the later shared-publication wait. Assert persisted rows and no epoch/outbox/approval changes on denial; retain identical committed replay after expiry and existing concurrent epoch/replay/isolation/MFA/immutability controls. Record pre-fix observation and corrected exact-commit evidence; return to Work |

This follows the source's privileged reauthentication and authenticated interaction requirements (master §§7, 16–17), the existing current-authority review mandate and A02-C01's stated expiry behavior. PostgreSQL documents that `now()`/`transaction_timestamp()` use transaction start and `clock_timestamp()` advances during execution. The runtime consequence above is an inference from that documented behavior and the reviewed query order, not a claimed executed failure. [PostgreSQL 17 date/time semantics](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)

Do not mechanically replace every timestamp or rewrite immutable history. The fix concerns expiry/freshness checks and their position relative to locks. Codex should define and test the exact check boundary; Work will review the concrete correction.

## What is already working / preserved

| Area | Reviewed implementation / producer evidence | Remaining boundary |
|---|---|---|
| Configuration and approval | Fixed typed purposes/notices/systems/policies; scoped references; exact digest/version; distinct reviewer; real Better Auth TOTP before session-bound, single-use proof; immutable published rows and constrained transitions | F01 freshness fix; browser binding is Claude Code-owned |
| Principal authority | Actual server-derived principal, tenant/legal entity/environment, capability/RLS checks, no caller-supplied principal authority | Existing scope model retained; later jobs/exports/agent boundaries remain their producing tickets |
| Consent and idempotency | Scoped operation/key/digest lock precedes replay; aggregate row locking; expected epoch and one-use interaction; exact current notice for affirmative grant; withdrawal needs no new notice acceptance | F01 interaction expiry after waits; no rollback of accepted withdrawal or old-event reactivation |
| Atomic persistence | State/event/workflow/outbox/receipt/idempotency share the transaction; rollback test reaches the writes and checks they are undone; committed replay remains immutable after newer epochs | Outbox dispatch, real target effects and target generations are A03/A06, not demonstrated by an ACCEPTED row |
| Evidence/state semantics | Receipt vs refreshed current state remains separate; old receipt replay does not restore marketing; mapping control map reports declared capability with observations null | Actual ACK/observed distinctions, unknown-effect reconciliation, retry safety and evidence exports remain A03–A06 |
| Contract 0.3.0 | Four bounded routes: exact-policy reauthentication; target mapping list/create; own consent history. Canonical schemas, generated types/examples/seed and signature vector updated together; no DTO duplication or runtime success fixtures | Work acceptance pending F01; schema writer remains Codex. The command version change must stay coordinated with A03; old envelopes are rejected |

The reviewed A02 code does not provide send admission, live agent execution, external-effect verification, recovery, reset or egress proof. These absences are correctly assigned later; no fix request expands A02 into those implementations.

## Evidence ledger

Work independently ran pinned Node 24.21.0 / pnpm 12.4.2 cached frozen install, **11/11 unit tests**, generated-contract/seed drift (**eight artifacts, 41 routes, seven error examples**), typecheck and lint: all exited 0 on the inspected source. Reports and raw logs are under [W01-A02-a5b6ff7](artifacts/W01-A02-a5b6ff7/).

The [read-only provenance audit](repro/W01-A02-source-audit.py) exited 0 and verified all **50** producer artifact hashes, unchanged master/lockfile, generated hashes/seed, source identity and raw-log assertion matches. The final contract check and **49-check consent suite** are the two exact committed-source reports; all **141** recorded source files in each match implementation and inspected main. The earlier **87-check auth regression**, build/lint/hygiene reports retain their actual dirty-source identity. Their four final-snapshot differences are generator/manifest/OpenAPI metadata and the consent test file; they are not relabelled as exact-commit runs. The earlier unit/typecheck/source snapshots have additional differences, so Work's current unit/typecheck results are separately recorded.

The producer's 22 command records retain 19 successes and three failures: unavailable database, the repaired publication trigger, and a sandbox-limited hygiene attempt. Review of a retained failure and later correction is not an expected broken-sender test. Work did not run Docker/PostgreSQL/OPA/Next HTTP, the SQL reproduction, browser flows or a release build here; PostgreSQL tools, Docker and PowerShell are unavailable. No access controls or existing advisory-upload rejection were bypassed.

The 49 producer checks cover successful/denied publication, affirmative grant, withdrawal, atomic persistence/rollback, immutable replay, conflict/epoch races, own receipt isolation, published-row immutability and restart persistence. They do **not** cover F01's expiry across lock waits. Thus normal passing evidence does not close F01. Full T01–T34 statuses remain NOT_RUN, with partial A02 evidence linked to relevant scenarios and no manufactured full PASS or executed FAIL.

## Handoff and next action

Use the [Codex correction prompt](W01_A02_CODEX_FIX.md). Work requests one bounded A02 correction and retest while preserving the human-authorized continuation. A03 is reported underway but has no reviewed/submitted source in this inspected snapshot; it is not accepted by this review. Final state, generated views and [handoff](../../../handoffs/work/W01-A02-a5b6ff7.md) record the open dependency. Human merges the Work review record and all implementation corrections; Work merges or releases nothing.

Cowork PR #7 is now human-merged but not substantively accepted in this A02 review. Its integration does not automatically complete C00–C02, B00 or any rehearsal requirement. No deadline restart, P1 promotion, W02/W03 completion or production readiness is implied.
