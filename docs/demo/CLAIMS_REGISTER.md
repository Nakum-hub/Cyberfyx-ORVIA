# ORVIA prototype: claims register

**Owner:** GPT Work, successor to Cowork (C01) · **Status:** REVISED_FOR_REVIEW · **Revision:** c01-r4, 16 Sep 2026 UTC · **Documentation base:** `2432a008539450725129d19ff5fc6c2eee488031`

## Rule

**A claim may be made in the demo only when its status is `EVIDENCED`.** An `EVIDENCED` claim has:

- an entry in `docs/demo/EVIDENCE_INDEX.json`;
- an artifact from the frozen candidate;
- a review status of `INSPECTED`.

## Current state

**No full-demo claim is `EVIDENCED`.** At `2432a008539450725129d19ff5fc6c2eee488031`, A00/A01 are accepted increments; A02/A03 and PR #16 correction plus PR #17 A04 are supplied for consolidated review. Auth/configuration/consent/workflow/agent/send-admission sources and engineering reports exist. They are not a frozen candidate or full acceptance.

The index preserves 174 original command reports, including 32 non-zero exits, and A04's initial failed assertion report plus corrected 46-assertion PASS at their actual dirty-source/build identities. Work inspected the bytes/provenance and retained limitations; no application rerun is implied. No current workspace/Privacy Centre browser evidence, candidate media or qualifying rehearsal is supplied. Every full-demo claim below remains NOT_EVIDENCED; the narrower source/engineering facts can be described with those limits.

Until evidence exists, the permitted wording may be used only as a statement of **intent**: "the prototype is designed to …". It must never be used as a statement of what was shown.

**How the validator checks a claim.** `docs/reviews/cowork/tools/validate_docs.py` rejects any row marked `EVIDENCED` unless **all** of the following hold:
- every listed test has qualifying inspected evidence; T24 preserves actual broken-control FAIL between required healthy controls;
- all evidence matches the full candidate commit/build/contract/profile/fixture/scenario, with later failures/incomplete runs preserved;
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
| CL-18 | No runtime AI | "This version uses no AI model, hosted model API, embeddings or training." | Dependency and egress review | T26, T27 | NOT_EVIDENCED (engineering builds exist; final-candidate package/dependency and runtime egress scope not qualified) | The seven learned-AI modules are planned for Version 2 | "AI-powered", "smart", "learns" |
| CL-19 | Hygiene | "Inputs are bounded, sessions are protected, and the dependency and secret scans were triaged with no unacceptable critical finding." | Candidate scans | T27 | NOT_EVIDENCED | These are scan results, not a penetration test | "Secure", "pen-tested", "vulnerability-free" |
| CL-20 | Repeatability | "We ran the demo twice from the documented starting state on this exact build." | Frozen candidate | T28, T30 | NOT_EVIDENCED | Two rehearsals on one machine | "Reproducible anywhere", "fully automated install" |
| CL-21 | Programme scope | "The Version 1 programme is larger than this demo. Every module is listed with its target and its actual status, which are kept separate." | `tracking/capabilities.json` | T30; C01 register review | NOT_EVIDENCED: genuine register restored and module identities reviewed; final-candidate capability claims and compatible API mapping remain pending (F-029). | Unbuilt Version 1 capabilities remain in Version 1. Only the seven learned-AI modules are Version 2. | "Everything else is Version 2", "33 modules built" |
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

## r4 genuine capability mapping

The canonical register is restored byte-for-byte from the verified v1 kit (SHA-256 `34ba16bbebdad5c21a4851341ef011be3518176ad6836f1521b5ae130b347669`). Schema, 33 IDs/names, target depth and V1/V2 assignments are preserved. Its NOT_INSPECTED implementation values concern whole-module status; the narrower source/report observations below do not promote them. All module integration/full-scenario test and acceptance claims remain unqualified unless a row explicitly cites an already accepted increment. F-029 records the original-register versus binary API mapping gap.

All source paths below refer to inspected base `2432a008539450725129d19ff5fc6c2eee488031`. Engineering reports in EVIDENCE_INDEX preserve actual tested/dirty identities. Source presence is neither full implementation nor candidate test evidence.

| ID | Original name | Target / depth | Actual source or document mapping | Limit / remaining gate |
|---|---|---|---|---|
| M01 | Identity and Access Management | V1 / CORE | packages/auth; packages/authz; A01 accepted | Scoped auth/MFA subset; B01 browser absent, full T02/T27 pending |
| M02 | Tenant Management | V1 / CORE | packages/db migrations 0001–0003; A01 accepted | Scoped RLS subset; full job/export isolation pending |
| M03 | Privacy Control Graph | V1 / LIGHT | packages/domain/src/configuration.ts controlMap | Declared relationships; A02 review and wider discovery absent |
| M04 | Policy Engine | V1 / CORE | policy/admin/authorization.rego; configuration.ts; processing.ts; policy/processing | Admin plus A04 OPA processing/send source and reports present; consolidated acceptance/full candidate T14–T16 pending |
| M05 | Workflow Engine | V1 / CORE | apps/worker/src/withdrawal-workflows.ts; domain/workflow.ts | A03 source/reports; final candidate/recovery/reconciliation gates pending |
| M06 | Connector Framework | V1 / SANDBOX | apps/agent/src/execute.ts; packages/connectors/src/target-db.ts | Synthetic CRM subset; simulator/real vendor scope unqualified |
| M07 | Verification Engine | V1 / SANDBOX | packages/domain/src/workflow.ts observer; completion.ts | Scoped-read source; full observation/fault/coverage gates pending |
| M08 | Evidence Engine | V1 / CORE | consent receipts and workflow/audit source | Full evidence view/export A05/B03 absent |
| M09 | Privacy Test Engine | V1 / SANDBOX | tests/integration/consent and workflows | Producer test subsets, no deployed Test Lab/healthy-broken-healthy qualification |
| M10 | Notification Engine | V1 / LIGHT | UX brief attention/status specification | In-app notification implementation not demonstrated |
| M11 | Consent Management | V1 / CORE | packages/domain/src/consent.ts; A02 correction reports | Present; consolidated acceptance and browser recovery pending |
| M12 | Notice Management | V1 / LIGHT | configuration.ts notice and exact publication | Present A02; accepted implementation/UI absent |
| M13 | Data Principal Portal | V1 / CORE | apps/web/src/server/business.ts own routes | Own API present; Privacy Centre UI absent |
| M14 | Rights Management | V1 / COORDINATION_OPTIONAL | No implementation inspected in this bounded delivery | Retained V1 programme; outside selected P0 depth |
| M15 | Retention Management | V1 / COORDINATION_OPTIONAL | No implementation inspected in this bounded delivery | Retained V1 programme; outside selected P0 depth |
| M16 | Processor/Vendor Management | V1 / LIGHT | configuration systems/mappings; legacy contract | Declared sandbox targets; not a vendor-risk suite |
| M17 | Privacy Incident Explorer | V1 / ROADMAP | No implementation inspected in this bounded delivery | Retained V1 programme; outside selected P0 depth |
| M18 | Coverage and Failure Center | V1 / CORE | UX brief unknown/manual/unverified states | Failure Centre UI/complete data projections absent |
| M19 | AI Privacy Copilot | V2 / ROADMAP | DEFERRED_V2 under approved master | No model/runtime/training/embeddings work promoted into V1 |
| M20 | AI Discovery | V2 / ROADMAP | DEFERRED_V2 under approved master | No model/runtime/training/embeddings work promoted into V1 |
| M21 | AI Policy Builder | V2 / ROADMAP | DEFERRED_V2 under approved master | No model/runtime/training/embeddings work promoted into V1 |
| M22 | AI Workflow Builder | V2 / ROADMAP | DEFERRED_V2 under approved master | No model/runtime/training/embeddings work promoted into V1 |
| M23 | AI Risk/Drift Analysis | V2 / ROADMAP | DEFERRED_V2 under approved master | No model/runtime/training/embeddings work promoted into V1 |
| M24 | AI Test Generation | V2 / ROADMAP | DEFERRED_V2 under approved master | No model/runtime/training/embeddings work promoted into V1 |
| M25 | AI Incident Analysis | V2 / ROADMAP | DEFERRED_V2 under approved master | No model/runtime/training/embeddings work promoted into V1 |
| M26 | Billing | V1 / ROADMAP | No implementation inspected in this bounded delivery | Retained V1 programme; outside selected P0 depth |
| M27 | Licensing | V1 / DEVELOPMENT_FIXTURE_OPTIONAL | No implementation inspected in this bounded delivery | Retained V1 programme; outside selected P0 depth |
| M28 | Entitlements | V1 / DEVELOPMENT_FIXTURE_OPTIONAL | No implementation inspected in this bounded delivery | Retained V1 programme; outside selected P0 depth |
| M29 | Customer Onboarding | V1 / LIGHT | scripts/auth-init.ts; auth-bootstrap.ts; A01 accepted | Protected local bootstrap; no universal production installer |
| M30 | Support Bundle System | V1 / DOCUMENTED_LOCAL_ONLY | docs/runbooks/OPERATOR.md | Local-only operator guidance; no support export automation |
| M31 | Updates | V1 / MANIFEST_ONLY | packages/contracts/generated/manifest.json; producer build records | Contract/build metadata; no A07 release/update trust qualification |
| M32 | Monitoring | V1 / LIGHT | healthz; scripts/preflight.ts; workflow source | Local liveness/probe subset; no full monitoring UI |
| M33 | Audit Administration | V1 / LIGHT | packages/domain/src/transaction.ts; local request/audit records | Audit subset; scoped evidence export/full admin review pending |
