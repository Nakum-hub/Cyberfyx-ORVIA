# 14 — Rights Management (M14)

Scope: access (§11), correction/completion/updating/erasure (§12), grievance (§13), nomination (§14), identity matching, mandates, planning, redaction, response.
References: PRD FR-M14-01..04; DPDPA Act §11–§15, Rule 14 (grievance ≤ 90 days, not universal for all rights); master §24, §25, §33 etc.; acceptance T23–T25, BUILD-11.
Request states: RECEIVED, PENDING_VERIFICATION, VERIFIED, SCOPING, AWAITING_APPROVAL, EXECUTING, PARTIALLY_COMPLETED, COMPLETED, FAILED, ESCALATED, REJECTED, CLOSED. All cases start **NOT_RUN**.
Deadlines: use only values from the counsel-approved rule pack loaded in the test environment; record the value used.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-265 | Access request full happy path | Verified principal; data in 3 connected systems | 1) Submit access; 2) Verify; 3) Scope; 4) Approve; 5) Execute; 6) Review; 7) Deliver | Response has summary of personal data and processing activities; each state transition recorded | P0 | E2E | Act §11(1)(a) |
| TC-266 | Access response lists recipients | Data shared with 2 processors and 1 fiduciary | 1) Generate response | Identities of fiduciaries/processors shared with and description of data shared included per pack | P0 | LEGAL | Act §11(1)(b) |
| TC-267 | Access package contains third-party data | Support ticket mentions another customer | 1) Generate package | Third-party data redacted or escalated before release | P0 | SEC | T25, BUILD-11 |
| TC-268 | Correction request | Wrong address in CRM | 1) Submit correction with evidence; 2) Execute | Address corrected in supported systems; unsupported systems get manual tasks; verification per system | P0 | FUNC | Act §12(2) |
| TC-269 | Completion/updating request | Missing alternate phone | 1) Submit completion | Record completed; processors notified where applicable | P1 | FUNC | Act §12(2) |
| TC-270 | Erasure with no retention need | Marketing-only data | 1) Submit erasure | Deleted in supported systems; verification per copy; processors instructed | P0 | FUNC | Act §12(3) |
| TC-271 | Erasure blocked by legal retention | KYC data under retention obligation | 1) Submit erasure | Erasure partially refused with stated reason; retained data purpose-restricted; response explains | P0 | LEGAL | Act §12(3), §8(7) |
| TC-272 | CLOSED is not erasure | Request closed administratively with unverified system | 1) View request | Unverified destination remains visible; CLOSED not shown as fully erased | P0 | FUNC | FR-M14-04 |
| TC-273 | Shared/recycled phone ambiguous match | Phone number reassigned to new person | 1) New holder requests access via OTP | Ambiguous; no disclosure/deletion of old holder's data | P0 | SEC | T23 |
| TC-274 | Identity match levels | Candidates at exact/strong/probable/ambiguous/no-match | 1) Submit request for each | Ambiguous blocks disclosure and destructive automation; probable needs review; no-match handled honestly | P0 | FUNC | FR-M14-02 |
| TC-275 | Verified channel not universal ownership | Principal verified by email | 1) Request records linked by phone only | Phone-only records not automatically included | P0 | SEC | FR-M14-02 |
| TC-276 | Nomination registration | Principal nominates person N | 1) Register nomination | Stored with scope; principal can view/revoke | P0 | LEGAL | Act §14 |
| TC-277 | Nominee invokes on death | Death evidence provided | 1) Nominee requests erasure | Invocation reviewed per configured evidence; actions scoped by nomination | P0 | LEGAL | Act §14 |
| TC-278 | Nomination revoked | Principal revokes nomination | 1) Former nominee submits request | Denied | P0 | SEC | T24 |
| TC-279 | Scope change invalidates approval | Plan approved for 2 systems | 1) Add 3rd; 2) Execute | Re-approval required | P0 | SEC | M14 acceptance |
| TC-280 | Partial targets | 1 of 4 systems fails | 1) Execute | PARTIALLY_COMPLETED; failed system has owner/next action | P0 | FUNC | FR-M14-04 |
| TC-281 | Manual/unverified destinations retained | Paper records/offline system | 1) Plan | Manual task created; unverified status retained | P1 | FUNC | FR-M14-04 |
| TC-282 | Failed secure delivery | Delivery link bounced | 1) View request | Undelivered remains undelivered; not COMPLETED | P0 | FUNC | USER_FLOWS rights |
| TC-283 | Grievance clock | Grievance submitted | 1) Check deadline | Due date from reviewed pack (Rule 14 upper bound 90 days); escalation before due | P0 | LEGAL | Rule 14 |
| TC-284 | Grievance deadline not applied to all rights | Access request | 1) Check clock | Uses its own configured deadline, not grievance window by default | P1 | LEGAL | Rule 14 note |
| TC-285 | Request rejection with reasons | Request out of scope (e.g. data not held) | 1) Reject | Principal receives reason and grievance route | P1 | LEGAL | Act §13 |
| TC-286 | Rights request for exempt processing | Processing under §17 exemption configured and reviewed | 1) Submit request | Exemption applied only with reviewed applicability; response explains | P1 | LEGAL | Act §17 |
| TC-287 | Duplicate request | Same principal submits same request twice | 1) Submit | Linked/deduplicated; one workflow | P1 | FUNC | FR-M14-01 |
| TC-288 | Request escalation | Request nearing deadline | 1) Wait | ESCALATED to owner; deadline not reset | P1 | FUNC | FR-M14-01 |
| TC-289 | Identity verification failure | OTP fails repeatedly | 1) Submit | PENDING_VERIFICATION then REJECTED/closed per policy with explanation | P1 | NEG | FR-M14-01 |
| TC-290 | Correction conflicting with source of truth | Principal requests DOB change contradicting KYC | 1) Submit | Routed to review; not auto-applied | P1 | FUNC | FR-M14-04 |
| TC-291 | Erasure across derived copies | Data in warehouse and analytics copies | 1) Erase | Each copy planned; derived copies listed; backups marked per retention (not claimed deleted) | P0 | FUNC | FR-M15-04 |
| TC-292 | Erasure under legal hold | Principal under litigation hold | 1) Erase | Held scope excluded with reason; rest processed | P0 | LEGAL | FR-M15-02 |
| TC-293 | Access response language | Principal chose Kannada | 1) Deliver response | Cover letter/template in Kannada where reviewed; data values as stored | P2 | UX | Act §6(3) |
| TC-294 | False/frivolous request handling | Repeated abusive requests | 1) Submit | Handled per configured policy with review; not auto-rejected on count alone | P2 | LEGAL | Act §15 |
| TC-295 | Impersonation attempt | Attacker uses leaked email/phone | 1) Request access | Verification steps prevent disclosure; suspicious pattern flagged | P0 | SEC | Act §15(b) |
| TC-296 | Response redaction review | Package with internal notes | 1) Review | Reviewer can redact; redaction logged; final bytes tested | P1 | FUNC | BUILD-11 |
| TC-297 | Request on behalf of person with disability | Lawful guardian | 1) Guardian submits | Treated under guardian mandate with verification | P1 | LEGAL | Act §9 (lawful guardian), FR-M14-03 |
| TC-298 | Processor-held data in access response | Processor holds data without API | 1) Plan access | Coordination task to processor; status tracked; response states pending/unavailable honestly | P1 | FUNC | FR-M16-02 |
| TC-299 | Rights request audit trail | Completed request | 1) Export audit | Every transition with actor, time and evidence | P1 | FUNC | FR-M08-01 |
