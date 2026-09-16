# ORVIA prototype: claims register

**Owner:** Cowork (C01) · **Status:** REVISED_FOR_REVIEW · **Revision:** c01-r2, 16 Sep 2026 IST · **Documentation base:** `e839b1a` (r1 was written against `96b8bd7`)

## Rule

**A claim may be made in the demo only when its status is `EVIDENCED`.** An `EVIDENCED` claim has:

- an entry in `docs/demo/EVIDENCE_INDEX.json`;
- an artifact from the frozen candidate;
- a review status of `INSPECTED`.

## Current state

**No claim is `EVIDENCED`.** At `e839b1a` the repository holds the A00 bootstrap:
- a foundation page and `/healthz`;
- infrastructure probes;
- contract proposal 0.2.0 (pending W00 review).

It has no business workflow, test record for T01–T34, screenshot, recording or rehearsal. The A00 bootstrap checks are engineering subsets (indexed in `EVIDENCE_INDEX.json` → `engineering_reports`) and support none of the claims below. Every row is therefore `NOT_EVIDENCED — do not present as demonstrated`.

Until evidence exists, the permitted wording may be used only as a statement of **intent**: "the prototype is designed to …". It must never be used as a statement of what was shown.

**How the validator checks a claim.** `docs/reviews/cowork/tools/validate_docs.py` rejects any row marked `EVIDENCED` unless **all** of the following hold:
- every listed test has an `INSPECTED` record with observed PASS;
- that record is on the identified frozen candidate;
- the record's artifacts exist with matching hashes.

For expected-detection runs (T24), the record must carry the recorded FAIL of the broken control **and** a healthy rerun.

## Columns

| Column | Meaning |
|---|---|
| **Permitted wording** | The exact sentence to use once evidenced. |
| **Tested scope** | The scope the evidence must cover. |
| **Evidence required** | The test IDs, from ACCEPTANCE.md. |
| **Limitation** | Must be said, or shown on screen, alongside the claim. |
| **Must not say** | Wording that overstates the claim. |

---

| ID | Claim area | Permitted wording (once evidenced) | Tested scope | Evidence required | Status | Limitation to state | Must not say |
|---|---|---|---|---|---|---|---|
| CL-01 | What this is | "An internal working prototype of ORVIA Version 1's outcome-assurance path, running locally on fictional data." | Frozen candidate `{build_id}`, synthetic profile | T01, T30 | NOT_EVIDENCED | Not a production release, customer pilot or security certification | "Production-ready", "launch", "customer-ready" |
| CL-02 | Separate identities and tenants | "Staff and people using the Privacy Centre have separate sessions, and one fictional organisation could not read another's records in our tests." | Aster/Birch, tested routes, export and jobs | T02, T03, T04, T22 | NOT_EVIDENCED | Covers the tested routes and synthetic data. A denial screenshot alone is not isolation proof. | "Fully isolated", "multi-tenant certified", "secure" |
| CL-03 | Least privilege and review | "The author of a policy version could not publish it. A different authorised reviewer approved that exact version." | Demo roles; policy publish | T05 | NOT_EVIDENCED | Only the demo role subset exists. Full role management is not built. | "Complete RBAC", "all master roles implemented" |
| CL-04 | Installation admin is not vendor access | "Organisation administrators manage their own installation. The prototype accepts no Cyberfyx vendor identity." | Session and authz tests | T02, T04 | NOT_EVIDENCED | Local development identities only | "Cyberfyx can administer customer installations", "remote support access" |
| CL-05 | Separate purposes | "Marketing and order-service are separate purposes, each decided on its own authority. Withdrawing marketing did not change the order-service decision, which follows its own approved condition." | `promotional_marketing`, `order_service_demo` fixtures | T06, T15 | NOT_EVIDENCED | The order-service condition is a synthetic fixture | "Service messages are legally exempt", "all purposes handled" |
| CL-06 | Durable receipt | "A withdrawal receipt is issued only after the choice, its event and the follow-up work are saved together." | Local database transaction | T08, T09 | NOT_EVIDENCED | A receipt proves the choice was recorded. It does **not** prove downstream completion. | "The receipt proves everything was updated", "instant everywhere" |
| CL-07 | Stale replay safety | "Replaying an older grant did not re-enable marketing or lower the choice number." | Consent aggregate, stale worker | T10 | NOT_EVIDENCED | Local supported path, as documented | "Globally atomic", "impossible to reactivate" |
| CL-08 | Actual target effect | "The synthetic CRM's marketing audience actually changed, and ORVIA confirmed it with a separate read." | Synthetic CRM database and restricted agent | T12, T13 | NOT_EVIDENCED | A local synthetic CRM, not a commercial CRM integration | "Works with Salesforce/HubSpot", "verified" (for an acknowledgement) |
| CL-09 | Acknowledgement is not observation | "ORVIA shows what a system replied separately from what it later observed, and only the latter counts as observed." | Workflow detail, evidence export | T13, T18, T21 | NOT_EVIDENCED | Observation is limited to targets with a supported read | "Every change is verified" |
| CL-10 | Current-boundary control | "At the local supported send point, a queued marketing message was blocked after withdrawal, and no simulated send was admitted." | Local send-admission simulator | T14, T16 | NOT_EVIDENCED | Only this integration point. No global interception. No recall of messages already handed off. | "ORVIA stops all marketing everywhere", "recalls sent emails" |
| CL-11 | Uncertainty handling | "When a reply was lost, ORVIA kept the outcome as unknown, recorded a separate reconciliation attempt and read the system before any further action." | Local REST simulator fault | T17, T18, T19 (all mandatory) | NOT_EVIDENCED | Real vendor APIs may lack read or receipt support | "Never loses track", "self-healing" |
| CL-12 | Manual gaps stay visible | "A system without an API became an assigned manual task. A person's record of action is kept as a statement, not as an independent observation, and the workflow says so." | Legacy fixture | T20, T21 | NOT_EVIDENCED | ORVIA cannot act on or observe that system | "Covers legacy systems automatically" |
| CL-13 | Truthful dashboard | "The overview shows live counts from the database, including unknown, failed, manual and unobservable items." | Overview and failures | T21 | NOT_EVIDENCED | Counts cover the mapped systems only | "Compliance score", "X% compliant" |
| CL-14 | Local evidence export | "Evidence is exported locally for an authorised user, is recorded in the audit log, and includes gaps." | Export route | T21, T22 | NOT_EVIDENCED | A digest is relative to a trusted copy. It is not a legal certificate. | "Tamper-proof", "court-ready", "certified evidence" |
| CL-15 | Regression detection | "The regression test caught a deliberately broken, test-only sender by observing what it sent, and passed again once the healthy fixture was restored." | Test Lab, allowlisted scenarios | T23, T24 | NOT_EVIDENCED | Synthetic scenario coverage only | "Continuous compliance testing of your estate" |
| CL-16 | Recovery | "After a worker restart, the accepted request continued without being lost or repeated. A restored old synthetic CRM copy stayed blocked until it was reconciled." | Worker, target-only restore | T11, T25 | NOT_EVIDENCED | Not control-plane backup recovery. Not enterprise disaster recovery or HA. | "Disaster recovery", "high availability" |
| CL-17 | Customer-local runtime | "With outbound internet blocked, the core scenario ran, and no unapproved traffic was observed during the tested interval." | Tested interval, candidate | T26 | NOT_EVIDENCED | Covers the tested interval only. Not an air-gapped installer. | "Air-gapped", "never contacts the internet" |
| CL-18 | No runtime AI | "This version uses no AI model, hosted model API, embeddings or training." | Dependency and egress review | T26, T27 | NOT_EVIDENCED (no build to inspect) | The seven learned-AI modules are planned for Version 2 | "AI-powered", "smart", "learns" |
| CL-19 | Hygiene | "Inputs are bounded, sessions are protected, and the dependency and secret scans were triaged with no unacceptable critical finding." | Candidate scans | T27 | NOT_EVIDENCED | These are scan results, not a penetration test | "Secure", "pen-tested", "vulnerability-free" |
| CL-20 | Repeatability | "We ran the demo twice from the documented starting state on this exact build." | Frozen candidate | T28, T30 | NOT_EVIDENCED | Two rehearsals on one machine | "Reproducible anywhere", "fully automated install" |
| CL-21 | Programme scope | "The Version 1 programme is larger than this demo. Every module is listed with its target and its actual status, which are kept separate." | `tracking/capabilities.json` | T30; C01 register review | **BLOCKED**: register absent (F-002). The master confirms 33 modules with IDs 19–25 deferred (EV-SRC-004), but that is not the register. | Unbuilt Version 1 capabilities remain in Version 1. Only the seven learned-AI modules are Version 2. | "Everything else is Version 2", "33 modules built" |
| CL-22 | Legal position | None. Make no legal-compliance claim. | — | — | NOT_PERMITTED | Legal review is outside this prototype | "DPDP-compliant", "GDPR-compliant", "legally certified" |

## Distinctions to keep

- **Synthetic local connector ≠ supported commercial-vendor integration.**
- **Targeted marketing suppression ≠ erasure of all data.** Withdrawal stops marketing use; it is not deletion.
- **Acknowledgement ≠ observed outcome.**
- **Task closure or manual attestation ≠ automated verification.**
- **Scoped internal demo ≠ production security, legal certification or disaster recovery.**
- **Designed / coded / renders / tested on a feature branch / accepted on the frozen candidate are five different states.** Only the last supports a demo claim.

## Review procedure (C02)

For each claim, before it is presented:

1. Confirm that `EVIDENCE_INDEX.json` has entries for **every** listed test ID, all with:
   - `commit` equal to the frozen candidate;
   - `observed_result` taken from the artifact;
   - `review_status` of `INSPECTED`.
2. Confirm that the stated limitation is present in the script or on screen.
3. Change the status to `EVIDENCED` and record the evidence IDs.

If any test is missing, failed or errored, remove the claim or restate it truthfully (for example, "we have not yet shown …").
