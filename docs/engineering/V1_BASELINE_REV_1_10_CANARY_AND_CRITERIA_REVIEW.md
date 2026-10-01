# ORVIA V1 baseline addendum, revision 1.10: canary decisions and criteria evidence review

**Status:** owner decisions recorded 2026-10-01. This addendum adds to the approved master (Rev 1.4) and to the 1.5–1.9 addenda. It settles three questions raised by the Codex round 8 cross-review (`handoffs/codex/round8-proposed-feature-decisions.md`) under the "no assumptions" rule.

## Decision A: an active withdrawal canary is never admitted for marketing

**Question.** A decoy customer who never consented is planted in the organisation's marketing lists (migration 0079). If someone later records a consent grant for the decoy, through fraud or a mistake, should marketing to it still be blocked?

**Before.** Migration 0079 recorded the grant as a hit, but send admission followed the ordinary consent rules. Codex's diagnostic (`tests/integration/consent/canary-grant-admission.test.ts`) observed **ALLOW** with a send record.

**Owner decision: always block marketing.**
- While a decoy is ACTIVE, every marketing send admission for it is **BLOCK**, whatever consent is recorded. The reason code is the generic `RECIPIENT_MARKETING_HOLD` and does not name canaries.
- The decision is taken before any processing decision or send record is written, so a BLOCK never sits beside an ALLOW send record.
- The staff preview (`/api/v1/admin/policy/evaluate`) applies the same hold, so preview and send agree.
- Order and service messages follow the ordinary rules; the hold covers MARKETING only.
- The grant is still recorded as a hit, as before. Retiring the decoy returns the record to the ordinary rules; the recorded grant and its hit stay for review.

**Implementation.** Migration 0088 and contract 0.55.0.
- `app.canary_marketing_hold` may be called only by send admission (`orvia_sender`) and its preview (`orvia_app`). `database/customer/src/server-only.ts` revokes it from the other runtime roles after each blanket grant.
- Activation and retirement take an exclusive lock covering the principal across all purposes; the admission check takes the same lock shared. An admission therefore sees the decoy state either wholly before or wholly after a transition.

**Limit.** A sender that already controls every other admission prerequisite for a person can infer that a BLOCK came from something it cannot see. The response never says "canary", but perfect indistinguishability is not claimed.

## Decision B (real-person decoys): allowed, but nothing is ever delivered to them

**Question.** After real people are admitted (revision 1.9), may a real person's record be used as a decoy?

**Owner answer (2026-10-01):** "for testing we need this but we will not sending any mailbox or do an appropriate work".

**Recorded decision.**
- A real person's record **may** be designated, and activated, as a withdrawal canary.
- ORVIA **never transmits anything** to a real-person decoy.
  - A message addressed to one is still accepted from its author and recorded as a hit (0079).
  - When it falls due, the delivery runner marks it **WITHHELD** and makes no attempt.
  - The database also refuses to start a delivery attempt to a real-person decoy, whatever code path claims the message.
- The match is case-insensitive on the email address. A decoy counts while PENDING or ACTIVE; a retired decoy is an ordinary person again.
- Synthetic decoys, meaning organisation-owned decoy mailboxes, keep their behaviour: a message to one is sent and recorded.

**Implementation.** Migration 0089 and contract 0.55.0 (`OutboundDeliveryState.WITHHELD`).
- Only the delivery runner (`orvia_worker`) can withhold.
- No runtime role can ask which recipients are real-person decoys.

**Limits.**
- The author of a withheld message can see its WITHHELD state, which tells them the recipient is held. Hiding it would mean reporting a send that never happened, which ORVIA does not do.
- Real people exist only on a qualified installation after the protected admission command. So testing with a real decoy means testing on that installation, with real staff involved.

## Decision C: criteria evidence is shown and acknowledged before approval

**Question.** A signed regulatory package carries source hashes and "open verification items". The approver could not see them before approving production criteria.

**Owner decision: show and acknowledge.** This is vendor contract 0.6.0.
- `GET /api/v1/vendor/criteria/{id}/evidence` (practice read access) returns:
  - every source with its notification reference, official URL and file hash;
  - the signed package identity: package id, version and signing key;
  - the open verification items and their digest;
  - a plain statement that a signature proves where the claims came from, not that anyone checked the sources.
- Where provenance was never retained (test fixtures), the response says it is unknown. It is never reconstructed.
- `POST /api/v1/vendor/criteria/{id}/approve` now requires `CriteriaApprove`:
  - the digest of the version reviewed;
  - a review reference, which must contain no contact details;
  - the digest of the open items acknowledged.

  A changed version, unacknowledged items, the recorder approving, or a second approval are each refused.
- The review reference is kept with the approval as the approver's own statement. It is never labelled system verification.
- Vendor migration 0017:
  - makes recorded criteria content immutable;
  - makes approval happen once;
  - requires the review for any production approval made from now on.

  Rows approved before 0017 keep their history and show "no review reference exists".
- The practice screen opens a review panel showing this evidence. Approval stays disabled until a review reference is entered and the acknowledgement is ticked.

## Still open (not decided here)

- **Backup restore after the ledger purge** (Codex round 8, finding 5): restoring a backup older than the retained erasure ledger cannot identify everyone who must be erased again. The finding is in `handoffs/codex/round8-feature-review.md`, finding 5. The proposal file it names, `round8-proposed-backup-history.md`, was not committed. It needs an owner decision on how long the ledger is kept, or on what to show when a restore predates it.
