# Round 8 proposed feature decisions

**PROPOSED ONLY — no application, schema, contract or acceptance change applied.** Source inspection, 2026-10-01. Tests below are NOT_RUN. This document is separate from the implemented pending-canary-retirement defect (migration 0086). Root owns qualification and producer coordination.

Authority read for this review: immutable revision 1.4 master (current numbered requirements, not its historical diff appendices), `docs/engineering/V1_EXPANDED_BASELINE.md`, `tracking/v1-expansion.json`, revision 1.5 audit exchange, revision 1.6 audit mandate, and revision 1.9 real-principal admission. The master requires preserved withdrawal restrictions and customer-local records. Revision 1.5 confines audit criteria to DPDPA signed regulatory requirements. The canary-specific expansion record describes decoy hits; it does not clearly decide admission after a subsequent grant. Existing implementation comments disagree on that point. No external legal review requirement is reintroduced.

## Decision A: active canary after a recorded grant

### Observed implementation and missing case

`backend/privacy-control/src/processing.ts:admitSend` evaluates normal consent/policy/target gates, possibly inserts a send record, and only then invokes `app.canary_trap`. The void function in migration 0079 appends a hit and does not change the decision. Its migration description says SEND_ADMISSION is BLOCK, whereas its consumer says the hit is recorded whatever the decision. `tests/integration/consent/canaries.test.ts` proves a never-consented canary is blocked and separately proves a recorded registry grant produces a hit. It does not establish an otherwise ALLOW-qualified active canary after a grant. Unresolved suppression already blocks ordinary withdrawal re-grants; that existing control is distinct from a canary that never consented and has no suppression workflow.

Affected existing public contracts/routes:

- `POST /api/v1/machine/simulator/send`, operation `send`, canonical `SendRequest` / `SendResult` in `shared/contracts/src/index.ts`.
- `WithdrawalCanaryCreate`, `WithdrawalCanary`, `CanaryHit`, `CanaryHitQuery` in `shared/contracts/src/expansion.ts`; canary admin routes in `shared/contracts/src/expansion-routes.ts`.
- `POST /api/v1/admin/withdrawal-canaries/{id}/activation` and `/retirement`; registration `POST /api/v1/admin/withdrawal-canaries`; hit read/review routes. No new public endpoint is proposed for detecting whether a recipient is a canary.

### Recommended owner decision and narrowly scoped patch

Recommend: an ACTIVE synthetic canary is an organisation-controlled decoy whose marketing admission is always blocked, even if a grant is subsequently recorded. Preserve a consent-grant hit as evidence and preserve ordinary unrelated service-message rules; decide explicitly whether the block applies only to MARKETING or also ORDER_SERVICE. Recommend MARKETING only because a marketing canary is not, by itself, a new authority over legitimate service communication. An outbound staff-created message remains an observable decoy hit under the existing design; that does not authorize real-person marketing.

If approved:

1. Add a coordinated new migration after the allocated migration range, without editing 0079. Make the active-decoy check and activation/retirement transitions serialize on a scoped principal lock in the same transaction as send admission. The consent lock already uses principal plus purpose; canary activation covers the principal across purposes, so using only that existing purpose lock is insufficient.
2. Apply the approved restriction before persisting `processing_decisions`, `send_records` or `send_attempts`. A recorded BLOCK must never coexist with an ALLOW send record. Keep a single SEND_ADMISSION hit for each new attempt; both HTTP idempotent replay and same attempt replay must return stored results without adding another hit. Do not alter or delete earlier acceptance evidence or send records.
3. Keep the canary lookup scoped and privileged. Do not expose a boolean canary probe to `orvia_sender`/`orvia_worker`, or relax sensitive-read RLS. Retain the existing void trap callable where required; any new privileged helper should perform the protected admission operation, rather than hand the caller an explicit canary identity flag.
4. Return the ordinary `SendResult` shape and a reviewed generic restriction reason, with no canary label/id or hit count. Canonical reason vocabulary and contract version must be updated with generated artifacts and consumer tests if a new reason is introduced. A generic BLOCK avoids explicit disclosure; it cannot promise that an adversary with otherwise complete consent/target knowledge can never infer a difference. Record that limit rather than claiming perfect indistinguishability.
5. Do not mutate consent state to fabricate withdrawal or silently grant/clear suppression. A later retirement is not authority to reactivate previously withdrawn marketing. Existing unresolved-workflow, target restriction and quarantine gates continue to apply.

Alternative owner decision: an observational canary only records attempted admissions, while ordinary consent/target policy remains the sole admission authority. In that case update the contradictory BLOCK wording and add the adverse fixture proving what is allowed and why. This is a product decision, not a passing implementation control for unconditional-block semantics.

### Real-person decoy companion decision

Revision 1.9 admits real principal records but does not authorize using a real person's address as an organisation-owned decoy. Current `createCanary` only checks scoped existence. Recommend a synthetic-only canary requirement, with a domain refusal and database guard on registration/activation, and retained historical records visibly flagged for review rather than rewritten. `synthetic` must come from the database, never the request. If owners instead permit real withdrawn-person canaries, first define consent/ownership evidence and safe transport behavior; do not inherit the assumption that the mailbox belongs to the organisation.

### Exact regression scope

- Extend `tests/integration/consent/canaries.test.ts` or a new bounded companion suite: activate a synthetic never-consented decoy; independently establish all ordinary ALLOW prerequisites (published matching policy/notice, current unrestricted non-quarantined target, current grant and no unresolved suppression); verify the ordinary non-canary control ALLOW, then the active canary decision required by the owner. Verify exact durable decision/send-record counts and one hit, not only HTTP text.
- Repeat the same attempt/request key and assert no additional hit or send; changed body under the same key must refuse with no side effect. Test foreign tenant/principal/machine-system IDs and existing role isolation.
- A scoped concurrent activation-versus-send test must observe the actual lock ordering and a valid serialized outcome, not use timing sleeps as proof. Retired control must still obey ordinary withdrawal restrictions.
- Extend `tests/integration/onboarding/real-principals.test.ts` only in its scratch rehearsal database: before/after admission synthetic decoys remain permitted, synthetic label cannot be forged, and a synthetic fixture email labelled real after admission cannot become a decoy under the recommended decision. Never admit real people on codex-a00.

## Decision B: production criteria evidence visible before approval

### Concrete implementation gap versus proposed review policy

`backend/vendor/audit/practice.ts:recordProductionCriteria` retains source hashes and package `open_verification_items` in `vendor.criteria_versions.sources`. Its comment promises those items are available to the approver. `practiceState`, canonical `PracticeState` in `shared/contracts/src/vendor-practice.ts`, and `frontend/src/app/vendor/practice/page.tsx` expose only the criteria summary. The page also maintains a local `State` DTO; a coordinated consumer change should derive its types from canonical schemas rather than extend another hand-maintained model.

The missing visibility is an implementation gap relative to the stated review flow. Requiring explicit acknowledgement, resolving items before approval, and defining acceptable source-review evidence are owner/contract decisions. A release signature proves the signed claims came from the trusted key, not that the claimed source hash was independently verified by this service. The vendor must not contact a customer installation to resolve it.

Existing routes (under vendor prefix `/api/v1/vendor`):

- `GET /practice`: response `PracticeState`, capability `engagements.read`.
- `POST /practice/criteria/production`: request `CriteriaPackageRecord` aliasing canonical `RegulatoryPackageImport`, capability `practice.manage`.
- `POST /criteria/{id}/approve`: currently no approval body contract, capability `practice.approve`.
- `POST /practice/activations`: `ActivationRecord`, capability `practice.activate`; PRODUCTION_CRITERIA requires an approved production criteria row.

### Proposed canonical patch for approval

Recommend exposing retained evidence and requiring a digest-bound human review reference, without claiming automated external source verification:

1. Coordinate a vendor contract version bump from 0.5.0. Add a canonical `CriteriaEvidence` schema and proposed `GET /api/v1/vendor/criteria/{id}/evidence` route, protected by a reviewed least-privilege practice-read capability (decide whether existing `engagements.read` suffices). Keep the 200-row PracticeState summary unchanged in size. Return the criteria id/digest/distribution, source identifiers and URLs, hashes and retained retrieval facts, signed package identity/version/key id, and `open_verification_items`. Bound every field/array using existing `RegulatorySource`/package primitives, not arbitrary JSON.
2. Represent unavailable historical provenance explicitly as null/UNKNOWN with a limitation. The current conversion did not retain every original regulatory source fact (for example `retrieved_at`); never invent it or claim to reconstruct an original signature from a partial projection. For new records retain the exact signed package or a reviewed sufficient signed provenance envelope, with immutable digest binding and restricted vendor-local storage. Decide evidence retention before adding a migration after current vendor migration 0016.
3. Add canonical proposed `CriteriaApprove` input: expected criteria digest, nonempty review evidence reference, and explicit acknowledgement of the displayed open-item set bound to an evidence digest. Decide whether unresolved items can be acknowledged or must be resolved before production approval. Recommend refusing approval when the reviewed evidence cannot establish required source verification, while allowing historical synthetic fixture approval under its visibly synthetic rules.
4. Inside the approval transaction lock the criteria row, recheck distinct preparer/approver and current authority, compare expected digests, and append the review evidence to durable immutable approval history. Store acknowledgement/review references as human statements; do not label them independent system verification. Preserve the existing database two-person guard and approved-production gate. Already-approved historical rows keep history and should be marked evidence-coverage-unknown if needed; no acceptance or gate is silently promoted or revoked by this proposal.
5. Update `/vendor/practice` with a criteria evidence view available before approval, showing exact source facts, package provenance, and unresolved items. The approval form names the reviewed version/digest and records the reference/acknowledgement. Parse responses and infer types from the canonical schema. Do not auto-fetch arbitrary source URLs, add an unallowlisted downloader, or require external legal review that the owner has already waived.

### Exact regression scope

- `tests/integration/vendor/audit-practice.test.ts`: record a synthetic production-shaped signed package with known open items; the eligible independent reviewer reads exact retained evidence; insufficient role and customer installation cannot read/write it; unknown id is 404; recorder cannot approve; missing acknowledgement, stale digest and changed replay body refuse without approval/audit side effects. Exact replay returns its original approval evidence. Preserve wrong-key, modified-signature, TEST_FIXTURE refusal and real-engagement gate controls.
- `tests/e2e/vendor-production-criteria-local.ts`: reviewer sees known source hashes and all open items before approval; missing review input produces a visible refusal; valid independent review records its evidence; uploader has no approval action. Exercise applicable Chromium/WebKit/Firefox variants through root's frozen-candidate matrix; current suite is Chromium-specific.
- Database guard test: approved source facts and evidence references cannot be rewritten; direct same-recorder approval and forged evidence digest fail. Historical fixture/legacy evidence shows UNKNOWN where provenance was never retained.

## Ownership and next dependency

Owner must settle canary admission scope, whether real principals may be canaries, source evidence/retention and open-item approval semantics. Canonical contract producer must coordinate versioned schemas/routes/examples and any customer/vendor migrations before consumer changes. Root can run today's unchanged feature suites and document these uncovered cases without calling the proposed behavior implemented. Neither proposal grants vendor access to customer records, changes the immutable master, qualifies production keys/criteria or launches Phase B.
