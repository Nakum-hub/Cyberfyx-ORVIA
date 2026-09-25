# 11 — Consent Management (M11)

Scope: DPDPA-quality consent capture, withdrawal, epochs, receipts, re-consent, preferences vs consent vs suppression, imports.
References: PRD FR-M11-01..04; DPDPA Act §6 (free, specific, informed, unconditional, unambiguous, clear affirmative action; withdrawal ease; effect of withdrawal), §6(7)–(9) Consent Manager (later scope); master §16–19, §23, §99; acceptance T06–T08, T26, T31, BUILD-03, VM-20.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-190 | Grant captures full context | Published notice v3 (English) | 1) Principal grants consent for "Marketing SMS" | Record holds notice digest/version/language, affirmative interaction, purpose, source/channel, time | P0 | FUNC | FR-M11-01, Act §6(1) |
| TC-191 | Pre-ticked box is not consent | Consent widget | 1) Inspect default state; 2) Submit without interaction | No pre-selected consent; submission without affirmative action records no grant | P0 | LEGAL | Act §6(1) clear affirmative action |
| TC-192 | Bundled purposes rejected | Form with one checkbox covering marketing + analytics + profiling | 1) Configure | Configuration warns/blocks; purposes must be separately grantable | P0 | LEGAL | Act §6(1) specific |
| TC-193 | Consent not a condition for unrelated service | Service "delivery" does not need marketing | 1) Principal refuses marketing; 2) Proceed with delivery | Delivery path unaffected; refusal recorded | P0 | LEGAL | Act §6(1) unconditional |
| TC-194 | Consent limited to necessary data | Purpose "Delivery" requests Aadhaar number | 1) Map data categories to purpose | Flagged as beyond necessity for review; not silently accepted | P1 | LEGAL | Act §6(1) proviso |
| TC-195 | Duplicate grant delivered twice | Same interaction id twice | 1) Submit | One aggregate transition, one receipt | P0 | CONC | T06 |
| TC-196 | Old grant arrives after withdrawal | Grant(t1), Withdraw(t2) processed; Grant(t1) redelivered | 1) Redeliver | Withdrawn state stays authoritative; epoch unchanged | P0 | CONC | T07, BUILD-03 |
| TC-197 | Valid new re-consent | Withdrawn principal re-consents with fresh interaction | 1) Grant | New epoch; scoped authorisation correct; history intact | P0 | FUNC | T08 |
| TC-198 | Retry vs fresh re-consent distinguished | Network retry of withdrawn-era grant | 1) Replay old interaction id | Treated as retry, not re-consent | P0 | FUNC | FR-M11-03 |
| TC-199 | Monotonic epoch under concurrency | 100 concurrent grant/withdraw events for one principal/purpose | 1) Submit in random order | Final state equals last authoritative event; epoch monotonic; property test over many seeds | P0 | CONC | FR-M11-02 |
| TC-200 | Withdrawal as easy as grant | Grant took 1 click in portal | 1) Withdraw from same portal | Withdrawal achievable with comparable effort; no extra login hurdles beyond grant | P0 | LEGAL | Act §6(4) |
| TC-201 | Withdrawal does not require accepting new notice | New notice published after grant | 1) Withdraw | Withdrawal accepted without forcing new notice acceptance | P0 | LEGAL | M11 acceptance |
| TC-202 | Withdrawal stops processing within configured time | Connected marketing system | 1) Withdraw; 2) Attempt send at intervals | Sends blocked; propagation lag measured and shown (illustrative target p95 < 30 s, not an SLA) | P0 | FUNC | Act §6(6), NFR-06 |
| TC-203 | Withdrawal accepted before supported send | Campaign queued | 1) Withdraw; 2) Campaign executes | Current authorisation blocks/queues that principal | P0 | FUNC | T26 |
| TC-204 | Withdrawal propagates to processors | Processor receives data for purpose | 1) Withdraw | Processor notification task created; acknowledgement and verification tracked separately | P0 | LEGAL | Act §6(6), FR-M16-02 |
| TC-205 | Processing before withdrawal stays lawful | Order processed before withdrawal | 1) View history | Prior processing not retroactively flagged unlawful | P2 | LEGAL | Act §6(4) |
| TC-206 | Marketing withdrawal plus valid retained transaction | Marketing withdrawn; invoice retention required | 1) Execute | Marketing stops; invoice copy retained purpose-restricted | P0 | LEGAL | T31 |
| TC-207 | Receipt is immutable | Receipt issued | 1) Attempt modification via API | Rejected | P0 | SEC | FR-M11-01 |
| TC-208 | Historic receipt shows content captured | Notice updated after grant | 1) Open old receipt | Shows exact notice version/language captured, not newest | P0 | FUNC | M11 acceptance, FR-M12-02 |
| TC-209 | Channel preference distinct from consent | Principal prefers email, not SMS | 1) Change preference | Consent unchanged; channel routing changes | P1 | FUNC | FR-M11-04 |
| TC-210 | Suppression distinct from consent | Principal on suppression list (e.g. bounce) | 1) Evaluate marketing | Suppression enforced independently of consent state | P1 | FUNC | FR-M11-04 |
| TC-211 | Imported consent with evidence | CSV with notice ref and timestamp | 1) Import | Status SUPPORTED with provenance | P1 | FUNC | FR-M11-04 |
| TC-212 | Imported consent missing evidence | CSV row "yes" without notice/time | 1) Import | INCOMPLETE_EVIDENCE; not usable as full consent without review | P0 | LEGAL | FR-M11-04 |
| TC-213 | Import conflicts with newer withdrawal | Withdrawal on 1 Sep; import says consent 1 Aug | 1) Import | CONFLICTING; withdrawal remains; no silent re-grant | P0 | CONC | VM-20, BUILD-03 |
| TC-214 | Ambiguous subject in import | Row matches two principals | 1) Import | REVIEW_REQUIRED; no grant applied | P1 | NEG | M11 failure paths |
| TC-215 | Material purpose expansion | Purpose broadened after grant | 1) Evaluate processing under new scope | Old grant does not cover expansion; fresh consent/migration decision required | P0 | LEGAL | T10 |
| TC-216 | Consent expiry before effect | Consent configured with validity period; expires while send queued | 1) Execute send | Rechecked at effect; blocked | P1 | FUNC | M11 failure paths |
| TC-217 | No device fingerprinting as validity | Inspect capture payload | 1) Review stored fields | No fingerprint used to validate consent | P1 | LEGAL | FR-M11-01 |
| TC-218 | Stale work vs newly authorised record | Deletion job created before re-consent | 1) Re-consent; 2) Old job runs | Generation/authority recheck; new authorised data not affected blindly | P0 | FUNC | FR-M11-03, T09 |
| TC-219 | Consent by guardian for child | Principal flagged child; guardian verified | 1) Guardian grants | Grant recorded with guardian identity/mandate reference | P0 | LEGAL | Act §9(1) |
| TC-220 | Withdrawal via assisted channel | Call-centre agent records withdrawal on principal's instruction | 1) Record | Accepted with agent attribution and channel; same effect as self-service | P1 | FUNC | FR-M13-03 |
| TC-221 | Consent request language options | Principal selects Tamil | 1) View consent request | Available in English and configured Eighth Schedule language; reviewed translation used | P0 | LEGAL | Act §6(3) |
| TC-222 | Consent request shows DPO/contact | Consent request | 1) View | Contact details of DPO/designated person shown | P1 | LEGAL | Act §6(3), Rule 3 |
| TC-223 | Consent Manager status not claimed | Product UI/marketing | 1) Inspect labels | No claim of registered Consent Manager; CM interoperability shown as not enabled unless its prerequisites exist | P0 | LEGAL | Act §6(7)–(9); master AM-16 |
| TC-224 | Consent history visible to principal | Multiple grants/withdrawals | 1) Principal views history | Complete chronological history with receipts | P1 | FUNC | FR-M13-01 |
