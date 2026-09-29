# Handoff — AUDIT-PRACTICE-01-REVIEW — Codex

**Base commit:** `9e4bf8c0efa813fce677fecbabb949fcf45d63a0` (branch created from origin/main).
**New commit:** identified by `git log -1 -- handoffs/codex/2026-09-29-review-audit-practice.md`; publication hashes are in the final response. This file cannot contain its own commit hash.
**Source master / hash verified:** revision 1.4, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`; addenda 1.5 and 1.6 apply.
**Contract version:** 0.43.0 on origin/main; reviewed branch 0.45.0; no shared contract edited.
**Scope and profile:** synthetic local engineering only; no main merge, Claude branch push, production qualification or acceptance promotion.

## Delivered

Read-only focused review of `0794f7e..a82f14aa582829363b72e031dbab43a3e695694f`. Allowed writes: this handoff, `handoffs/codex/repro/audit-practice-review.mjs`, and `handoffs/codex/artifacts/AUDIT-PRACTICE-review-repro.log`. Review baseline: numbered 1.4 authority, local-data, durable-state and evidence requirements, narrowed by the owner’s 1.5/1.6 addenda. No Claude-owned file was changed.

### R1 — HIGH — Finding responses bypass personal-data exception/DPA gates

`backend/domain/src/dpdpa-audit/mandate.ts:178` (`createFindingResponse`), `backend/domain/src/dpdpa-audit/channel.ts:324`, `backend/vendor/audit/channel.ts:128`, `database/customer/migrations/0069_audit_channel_round_trip.sql:88`.

A preparer includes a synthetic person's name and medical detail in `response` or `action_plan`; a second administrator approves it. The redactor removes only selected identifier patterns. The worker signs and sends the free text, and `managementResponse` stores it without a personal-data classification, per-item exception/justification, or processing-agreement gate. Ordinary dual approval is not the Rev 1.5 exception record. The supplied reproduction confirms unredacted text; this review does not claim an end-to-end network exploit was executed.

Proposed fix: carry free-text management responses through the existing sealed, classified per-item package path, including reviewer-confirmed classification and vendor quarantine unless the required DPA is recorded. Keep automatic categories restricted to the Rev 1.6 allowlist. If a dedicated response contract is retained, reserve **0.46.0** for equivalent classification/exception semantics and adversarial tests; do not implement it in this round. Owner: Claude.

### R2 — HIGH — Offered PDFs can permanently block check-in

`backend/vendor/audit/channel.ts:117`, `database/vendor/migrations/0010_channel_documents_pdf.sql:13`, `backend/domain/src/dpdpa-audit/channel.ts:56`, `shared/contracts/src/audit-channel.ts:165`.

The vendor selects up to 20 documents without a byte budget. Two individually schema-valid 600,000-character PDF encodings produce a 1,200,520-byte instruction body; the client stops reading at 1,048,576 bytes. No document is staged/acknowledged, so the same oversized batch is offered again and blocks later deliveries. A single PDF above the 900,000-character contract cap instead makes the vendor’s instruction parse fail. The report signer does not enforce that cap.

Proposed fix: budget the complete signed response before selecting documents; offer only a fitting prefix and a truthful file-fallback state for a single oversized document. Never drop or implicitly acknowledge it. Add multi-document and oversized-single-report regressions. A protocol change needs reserved 0.46.0; a bounded fitting-prefix implementation may fit the existing contract. Owner: Claude.

### R3 — MEDIUM — Attention silently omits some truncation warnings

`backend/domain/src/operations/attention.ts:89`.

There are eleven capped query lists. With more than six at their caps, the two fixed caveats plus `truncated` are sliced to eight entries; later retention/hold/SDF/import warnings disappear. A busy installation therefore sees an incomplete kind without its truncation warning. Also, `rows.length >= limit` incorrectly says “more exist” when exactly the limit exists.

Proposed fix: query limit+1 and combine all genuinely truncated kinds into one bounded message, preserving all kinds within the existing eight-message contract. No contract edit needed. Owner: Claude.

### R4 — MEDIUM — Breach fixture remains dependent on shared history

`tests/integration/operations/breach.test.ts:22`; package selection is `backend/domain/src/operations/shared.ts:64`.

The initial review saw the 81-hour fixture. Commit 18753a2 narrows it further to 80.05 hours (three minutes before awareness), but does not eliminate the collision: a package already effective 80.025 hours ago wins at the incident’s 80-hour awareness time. The assertion that the newly imported package is selected can still fail correctly. The reproduction reads the actual fixture margin from the reviewed source. This is an ordering reproduction, not a rerun of the full breach suite.

Proposed fix: run the suite in an isolated scope/database with controlled package history and bind awareness/effective times to one captured clock. Do not change a fixture or expected value simply to obtain a pass. Owner: Claude under the requested path reservation.

### R5 — MEDIUM — Five-minute lease has no renewal or fencing

`backend/domain/src/dpdpa-audit/channel.ts:132`, `:299`, `:361`.

A worker processing sequential requests can exceed five minutes (up to 20 automatic answers, packages and responses, each transport allowing 30 seconds). A second worker can acquire the expired lease while the first still executes. `stillOpen` checks mandate state but not lease ownership; the original worker continues generating/sending. Unique sequence constraints may refuse some work, but do not provide the promised single-worker send boundary.

Proposed fix: renew a fenced lease and check its token inside each generation transaction and immediately before network sends; stop on lease loss. Test a delayed cycle crossing expiry with two workers. Static finding; concurrency reproduction NOT_RUN. Owner: Claude.

### R6 — MEDIUM — New definer read helpers lack caller/team scope

`database/vendor/migrations/0008_audit_practice.sql:84`, `:88`; `database/vendor/migrations/0009_audit_practice_integrity.sql:45`.

`engagement_accepted`, `review_barred` and `requirement_supported` query engagements as SECURITY DEFINER without checking the caller’s team/capability. The earlier 0003 blanket REVOKE covers only functions existing at that time; these new functions have no corresponding PUBLIC revoke. A role with schema usage can probe another engagement’s acceptance, review-bar status or conclusion support by known IDs, bypassing the tables’ RLS. This is a database-level scope finding; no HTTP route exploit is claimed.

Proposed fix: revoke PUBLIC execute for every new definer function and split internal trigger helpers from caller-facing, scoped wrappers. Confirm cross-engagement denial as the actual app role. Do not amend already-applied migration checksums: use a new migration. Database reproduction NOT_RUN because local vendor roles are absent. Owner: Claude.

### R7 — MEDIUM — Inactive-mandate check-ins exceed the approved outbound rule

`backend/domain/src/dpdpa-audit/channel.ts:121`, `:349`; `docs/engineering/audit-channel-semantics.md:91`.

The worker deliberately selects suspended/revoked/ended mandates and sends a check-in before testing whether they are open. Rev 1.6 says no calls when no mandate is active. The semantics document describes a terminal-state notification exception, but is not an owner-approved addendum. This also makes local queue settlement depend on a successful vendor check-in: if the vendor is down, `stillOpen` is never reached and terminal queues remain unsettled.

Proposed fix: settle terminal queues locally before attempting transport; conform to the no-call rule. If a final authenticated state-only notification is required, obtain an explicit owner decision defining that exception. Owner: Claude plus owner decision for changed product scope.

## Authority, RLS and interface observations

- TS role capabilities and OPA agree for practice.manage, practice.approve, practice.activate and engagement.accept. New staff routes pass through `requireVendorCapability`; service functions and RLS add team/reviewer checks. The response channel uses HMAC plus installation signatures, not staff-session authority.
- Customer 0069 definer functions have fixed search paths, explicit PUBLIC revokes, scoped caller construction and independent approval checks. Vendor new tables enable and force RLS. These are static observations, not fresh/upgrade execution proof.
- 600 is a reasonable bounded response size: existing per-kind caps total 560, plus a small number of aggregate rows. The old screen rendered every row and placed caveats below them. Codex’s separate base-V1 branch adds 50-item presentation pages and moves caveats above the table, without changing the DTO or server response. Browser rendering at 600 remains NOT_RUN.
- No inspected NOT_RUN entry was represented as accepted. Claude explicitly retains acceptance NOT_RUN. The handoff’s contract 0.44.0 and battery wording lag its 0.45.0 branch head; update it with exact final commands/artifacts and remaining failures. Earlier failures and later successful reruns must both remain visible.
- Review is bounded to the requested surfaces. No production security certification or exhaustive independent audit is claimed.
- The final delta from 5b3d849 to a82f14a was inspected: the principal-rights ordering retains its principal predicate in both cursor queries; setup gains a shell; browser checks wait for rendering; the crawl collects failures and still asserts its findings list is empty. These changes are not independently browser-qualified here. The merge preview and browser preflight were repeated at a82f14a.

## Commands actually executed

| Command | Exit | Result | Artifact / environment |
|---|---:|---|---|
| `git fetch origin claude/upbeat-newton-w4h53x main` | 1 then 0 | Initial sandbox FETCH_HEAD denial; normal escalation succeeded | reviewed head above |
| `git log --oneline origin/main..origin/claude/upbeat-newton-w4h53x -60` | 0 | Read branch commits | local checkout |
| `tsx handoffs/codex/repro/audit-practice-review.mjs ../audit-practice-runtime` | 0 | Four focused failure-mechanism reproductions confirmed | `handoffs/codex/artifacts/AUDIT-PRACTICE-review-repro.log` |

## Acceptance

NOT_RUN. The reproduction exits 0 because it confirms defects; it is not a passing product control. Full vendor RLS, channel, breach and 600-row browser tests were not executed in this review.

## Contract / dependency / ownership changes

No implementation ownership change. Reserve 0.46.0 only for a response-classification or channel protocol change if Claude determines one is needed; no shared contracts were edited.

## Remaining limitations and blockers

R1–R7 require Claude action or the named owner decision. Legal review remains pending. Local vendor DB roles are absent; do not create/grant roles under this task’s no-permission-change constraint.

## Next integration action

Claude fixes its paths and supplies exact fresh/upgrade, authority, channel and browser evidence. A human decides/merges; Codex has not merged main or pushed to Claude’s branch.
