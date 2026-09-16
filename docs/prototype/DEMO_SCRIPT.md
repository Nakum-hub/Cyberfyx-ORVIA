# ORVIA prototype: demo script

**Owner:** GPT Work, successor to Cowork (C00, finalised in C02) · **Status:** REVISED_FOR_REVIEW (C02: prepared, not frozen) · **Revision:** c02-r4, 16 Sep 2026 UTC · **Documentation base:** `2432a008539450725129d19ff5fc6c2eee488031`

**Live demo readiness: NOT_READY.** Source: current `CURRENT_STATE.md`; exact revision/hash/time are in DELIVERY_STATUS.json. This presentation does not independently establish readiness.

At the documentation base, the application has only the A00 foundation page and `/healthz`. Every step below is therefore a **specification of what must be shown**; none of it describes something that has been shown. Every screen status is `MISSING` and every evidence item is `MISSING` until real artifacts are indexed in [`docs/demo/EVIDENCE_INDEX.json`](../demo/EVIDENCE_INDEX.json).

**Mandatory tests.** Every P0 test named below (T01–T30) is mandatory for the completed internal demo. Where a step says a beat is optional *to show live*, only the live narration is optional; the test evidence is still required.

**Source of the story:** EXECUTION_PLAN §3 and CONTRACT §3–§9.

**Copy:** labels come from [`docs/ux/UI_COPY.json`](../ux/UI_COPY.json).

**Machine-readable steps:** [`docs/demo/demo_steps.json`](../demo/demo_steps.json). The step table in §4 is generated from it.

**Presentation deadline:** not recorded in any accessible file (F-015). No timing promise is made here.

---

## 1. Fixtures (all fictional)

- Email addresses use the reserved `.example` domain.
- Order and campaign identifiers use the `DEMO-` prefix.
- These are **proposed fixture definitions**. Codex owns the seed and reset implementation and may rename them. If it does, update this table rather than running two naming schemes.

### Organisations

| Organisation | Purpose in demo |
|---|---|
| **Aster Demo** | Main story |
| **Birch Demo** | Isolation checks only |

### Staff

| Name | Organisation | Role | Used for |
|---|---|---|---|
| Priya Admin (Demo) | Aster | `ORG_ADMIN` | Author of purposes, notice, systems and the policy draft |
| Karan Reviewer (Demo) | Aster | `ORG_SUPER_ADMIN`, MFA | Distinct reviewer who publishes the exact policy version; reconciles |
| Meera Auditor (Demo) | Aster | `AUDITOR` | Read-only and denied-write checks |
| Sam Member (Demo) | Aster | `MEMBER` | Assignee of the manual obligation |
| Bo Admin (Demo) | Birch | `ORG_ADMIN` | Cross-tenant denial |

Staff credentials are generated per installation and held by the human operator. None are written in the repository or in chat.

**Engineering names from A00** (`docs/engineering/A00-LOCAL-DEVELOPMENT.md`):

| Item | Name | State at the r4 inspected base |
|---|---|---|
| Seed | `aster-birch-v1` | Identity fixtures supplied; full planned business-scenario seeder still A07 |
| Profiles | `codex-a00`, `ui-b00`, `rehearsal` | The demo uses the separate `rehearsal` profile |

The following names/emails are **scenario specifications, not existing login credentials**. Current `seed:auth` uses generated local identities (`alice`, `bob`, `birch_principal`) and protected random credentials; A07 must map these to the agreed display scenario or supply an explicit mapping. A04 `seed:orders` creates dynamic expiring synthetic order references, not the display labels below. Do not type the illustrative emails into a current login or claim the complete scenario is seeded.

### Principals (all adults)

| Name | Organisation | Sign-in identifier | Used for |
|---|---|---|---|
| **Asha Demo** | Aster | `asha.demo@aster.example` | Main story |
| Ravi Demo | Aster | `ravi.demo@aster.example` | Principal-to-principal isolation; service condition absent (`DEMO-1043`) |
| Bela Demo | Birch | `bela.demo@birch.example` | Cross-tenant isolation |

### Purposes, notice and policy (Aster)

| Item | Detail |
|---|---|
| `promotional_marketing` | Consent-based. Needs an affirmative grant against a published notice. |
| `order_service_demo` | Uses its **own** separately approved synthetic condition. It does not inherit marketing consent. This is a demo fixture, not a legal claim that service messages are exempt. |
| Notice and policy | Aster Demo marketing notice, version 1. Marketing use policy, version 1: drafted by Priya, published by Karan. |

### Systems (Aster)

| System | Kind | Declared capability | Expected coverage label |
|---|---|---|---|
| Aster CRM (synthetic) | Separate synthetic CRM database | Remove from audience "Autumn offers (synthetic)"; read membership and generation | Automated and observable |
| Aster Messaging Simulator | Local REST provider simulator | Restrict, read, receipt; faults `HEALTHY`, `UNAVAILABLE`, `APPLY_THEN_TIMEOUT`, `ACK_WITHOUT_EFFECT` | Automated and observable |
| Aster Loyalty Ledger (no API) | Declared legacy target, explicitly unsupported | None | Manual only |
| Aster Send Gateway (simulator) | Local send-admission boundary, reached through the private machine send interface. **Not a configured system** in the accepted 0.2.1 shape. | Current-authority decision at admission | Explained as the enforcement point; not shown as a system row (F-018) |

### Queued attempts

| Attempt | Purpose | Recipient | Required result |
|---|---|---|---|
| `DEMO-CAMP-01` | Marketing | Asha | Blocked after withdrawal; no simulated send row |
| `DEMO-1042` | Order service | Asha | Decided on its own condition |
| `DEMO-1043` | Order service, condition deliberately absent | Ravi | Blocked |

## 2. Before the run

- [ ] **Candidate matches.** The candidate commit and build ID are recorded, and the on-screen build chip equals the build manifest (RELEASE_CHECKLIST G5).
- [ ] **Profile is ready.**
  - The `rehearsal` profile has been reset with the Codex-supplied, human-approved procedure. At the current base, only the bootstrap-only reset exists and refuses business migrations; a full application reset is A06/A07.
  - Evidence was exported **before** the reset.
- [ ] **Browser profiles are separate.** Karan (workspace, MFA done), Asha (Privacy Centre), Meera (auditor), Bo (Birch).
- [ ] **Fault modes are set** only through the documented private-profile procedure (not yet supplied; F-020).
- [ ] **Recordings are ready.** Fallback recordings, if any, are open and labelled (§6). None exist yet.
- [ ] **Network.** Outbound internet is blocked if the egress beat is shown (T26).

## 3. Timing

The target is 15 minutes live plus questions. The timings are guidance; they are not measured.

| Section | Minutes | Steps |
|---|---|---|
| Opening | 1 | — |
| Setup is real and controlled | 2 | 1, 2 |
| A person withdraws | 3 | 3, 4 |
| Actual effect and current-boundary control | 3 | 5, 6 |
| Uncertainty and manual gaps | 3 | 7, 8, 9 |
| Evidence and regression | 2 | 10, 11 |
| Recovery, scope and decision | 1 | 12, close |

**Opening line** (from EXECUTION_PLAN §1):
> "ORVIA can record what should happen, control a supported action, coordinate downstream work, and show what actually happened — including failures and gaps. Everything you'll see is fictional data on a local installation, with no AI model involved."

**Closing:** use `docs/demo/LEADERSHIP_HANDOVER.md` §6–§7. Name the decision the human owner is asking for; this has not been recorded yet (F-015).

## 4. Step-by-step (generated from demo_steps.json)

<!-- BEGIN GENERATED: demo-steps -->
### Step 1. Two separate organisations and people

| Field | Content |
|---|---|
| Actor | Human operator (seed); presenter |
| Precondition | Frozen candidate started in the 'rehearsal' profile (A00 profile name) and seeded with fixture 'aster-birch-v1' by Codex tooling (identity seed exists; complete planned business-scenario seed remains A07); principals Asha Demo, Ravi Demo (Aster) and Bela Demo (Birch) exist. |
| Screen / action | W-OVERVIEW (Aster) and W-PRINCIPALS — **MISSING** · Show the Aster workspace header (organisation, environment, build) and the demo principals list. |
| Expected observable fact | Header shows Aster Demo scope and the server build ID; principals list shows only Aster principals. |
| Evidence needed (mandatory tests) | T01, T03, T04: Clean-start transcript and build manifest (A07); isolation test output (A01/A06); screenshot of header with build ID (B06). — **MISSING** |
| Presenter words | “Everything here is fictional. Aster Demo and Birch Demo are separate organisations on the same local installation, and the build number on screen is the one we tested.” |
| Honest fallback | If the build chip shows 'Build ID not available', say so and do not continue with claims about the tested build. |
| Limitation to state | Local synthetic profile only; not a production deployment. |

### Step 2. Separate purposes, systems, notice and a reviewed policy

| Field | Content |
|---|---|
| Actor | Priya Admin (Demo) as author; Karan Reviewer (Demo) as distinct reviewer |
| Precondition | Staff sessions for both; Karan has MFA set up. |
| Screen / action | W-PURPOSES, W-NOTICES, W-SYSTEMS, W-POLICIES — **MISSING** · Show promotional_marketing and order_service_demo as separate purposes, the three declared systems (synthetic CRM, REST simulator, no-API ledger) with coverage labels, Priya's self-approval being refused, and Karan approving the exact digest. Explain that the send gateway is the enforcement point, not a configured system. |
| Expected observable fact | Self-approval refused; publication records reviewer, digest and time; published version cannot be edited. |
| Evidence needed (mandatory tests) | T05, T06: T05/T06 execution records; policy version record with reviewer and digest. — **MISSING** |
| Presenter words | “Marketing and order service are configured separately. The person who wrote the policy can't publish it; a different reviewer approved this exact version, and now it's fixed.” |
| Honest fallback | If configuration was seeded rather than created live, say it was seeded and point to the persistence test record instead. |
| Limitation to state | Policy editor is a small form with declared fields, not a general rules designer. |

### Step 3. Asha grants marketing consent

| Field | Content |
|---|---|
| Actor | Asha Demo (Privacy Centre) |
| Precondition | Asha signed in to the Aster Privacy Centre; marketing choice is NOT_GIVEN; notice published. |
| Screen / action | P-CHOICES, P-GRANT, P-RECEIPT — **MISSING** · Open the marketing card, read the notice, select 'I agree to Promotional marketing'. |
| Expected observable fact | Receipt shows the server's notice version and consent epoch; order-service card unchanged. |
| Evidence needed (mandatory tests) | T07, T15: T07 record; receipt JSON; consent read-back. — **MISSING** |
| Presenter words | “Asha makes an explicit choice after reading this exact notice. The receipt shows the version and choice number the server recorded.” |
| Honest fallback | If the grant was seeded, say so and show the stored receipt rather than claiming a live grant. |
| Limitation to state | Adult fictional principal only; guardian and nomination flows are not in this prototype. |

### Step 4. A marketing message is queued, then Asha withdraws

| Field | Content |
|---|---|
| Actor | Operator (queues synthetic attempt DEMO-CAMP-01); Asha Demo |
| Precondition | Asha's marketing consent GRANTED; DEMO-CAMP-01 queued but not admitted. |
| Screen / action | P-CHOICES, P-RECEIPT — **MISSING** · Select 'Withdraw consent'. Refresh the page after the receipt appears. |
| Expected observable fact | Receipt says 'Withdrawal recorded. Downstream actions are still being checked.' with the server's advanced epoch; refresh shows the persisted withdrawal. If the response is lost, the page offers 'Retry the same request' rather than a new request. |
| Evidence needed (mandatory tests) | T08, T09: T08/T09 records including injected pre-commit failure and idempotent retry; receipt JSON. — **MISSING** |
| Presenter words | “The receipt appears only after the choice, its event and the follow-up work are saved together. It is a receipt, not a claim that every system is already done.” |
| Honest fallback | If the receipt does not appear, say the outcome is unconfirmed. Use 'Retry the same request' (same key, payload and epoch) or 'Check my current choice'; never start a fresh withdrawal while the first is unsettled. |
| Limitation to state | Marketing withdrawal is not erasure of Asha's data and cannot recall messages already sent. |

### Step 5. The CRM audience actually changes, and ORVIA reads it back separately

| Field | Content |
|---|---|
| Actor | Worker and restricted agent; Karan views |
| Precondition | Withdrawal accepted in step 4. |
| Screen / action | W-WORKFLOW-DETAIL — **MISSING** · Open the workflow; point at the CRM row's two columns and the timeline. |
| Expected observable fact | Action status 'Acknowledged' and, separately, Observation 'Required state observed' with method, time, generation and scope. |
| Evidence needed (mandatory tests) | T11, T12, T13: T13 record with independent CRM fixture read; observation record; T12 command-rejection record. — **MISSING** |
| Presenter words | “Two columns on purpose. The first is what the CRM told us. The second is what ORVIA saw when it read the CRM afterwards. Only the second counts as observed.” |
| Honest fallback | If the observation is still 'Not observed', say so and wait or move on; do not describe the acknowledgement as proof. |
| Limitation to state | Synthetic local CRM database, not a commercial CRM integration. |

### Step 6. The queued marketing message is stopped; order service is judged separately

| Field | Content |
|---|---|
| Actor | Local send-admission gateway; Karan views |
| Precondition | Withdrawal committed before admission of DEMO-CAMP-01; DEMO-1042 has its own configured condition. |
| Screen / action | W-TESTLAB assertion detail and W-EVIDENCE (no staff send-record screen or route exists; F-018) — **MISSING** · Show the admission decisions recorded by the test run: DEMO-CAMP-01 blocked; DEMO-1042 evaluated under its own condition. |
| Expected observable fact | Decision BLOCK and no simulated send row for DEMO-CAMP-01; DEMO-1042 decision follows its own condition only. |
| Evidence needed (mandatory tests) | T14, T15, T16: T14 record including the no-send-row query and concurrency ordering; T15 and T16 records. — **MISSING** |
| Presenter words | “When the message reached the send point, ORVIA checked current authority again and blocked it. The order update is judged on its own approved condition, not on marketing consent. This protection is at this supported local send point, not every system in a company.” |
| Honest fallback | If no screen shows admission records, show the test assertion or evidence export and say the dedicated view is not built. |
| Limitation to state | Only the local supported send-admission integration is controlled; no global interception. |

### Step 7. Response lost: outcome unknown, then reconciliation

| Field | Content |
|---|---|
| Actor | Operator sets messaging simulator to APPLY_THEN_TIMEOUT before the run; Karan reconciles |
| Precondition | Fault mode set in the private synthetic profile using the Codex-supplied procedure. |
| Screen / action | W-WORKFLOW-DETAIL (reconcile dialog) — **MISSING** · Point at 'Outcome unknown', open Reconcile, confirm. |
| Expected observable fact | Action stays EFFECT_UNKNOWN (not FAILED); a separate reconciliation record moves through the server's proposed states and, if resolved, links an observation; no blind resend. |
| Evidence needed (mandatory tests) | T17, T18, T19: T17 record with the simulator call log showing no second restrict; the durable reconciliation record. T18 and T19 records are also mandatory P0 evidence: showing them live is optional, having their evidence is not. — **MISSING** |
| Presenter words | “The change was applied but the reply was lost. That's neither a failure nor a success, so ORVIA says it's unknown and reads the system before deciding anything.” |
| Honest fallback | If reconciliation is inconclusive, show that the action stays unknown and assigned; that is the correct behaviour. If T18/T19 are not shown live, point to their recorded evidence. |
| Limitation to state | Local simulator fault; real vendor APIs may not offer the same read or receipt capability. |

### Step 8. A system with no API becomes a manual obligation

| Field | Content |
|---|---|
| Actor | System; Sam Member (Demo) as assignee |
| Precondition | Legacy ledger declared with no supported operations and mapped to marketing. |
| Screen / action | W-ATTENTION, W-WORKFLOW-DETAIL (attest dialog) — **MISSING** · Show the manual row; Sam records a manual action. |
| Expected observable fact | Row shows 'Manual action required' and 'Cannot be observed'. The manual record is labelled as a person's statement, and the observation stays unchanged. While required manual work or required observations are unresolved under the approved criteria, the workflow is shown as Needs attention. Where the accepted declared criterion permits attributed manual completion, the workflow must still state that those systems were not independently observed. |
| Evidence needed (mandatory tests) | T20, T21: T20 record including attestation type and coverage change on permission removal. — **MISSING** |
| Presenter words | “This system has no API, so ORVIA assigns a person. Sam's record is kept as his statement, not as something ORVIA observed.” |
| Honest fallback | If the screen shows the workflow as completed or observed while required manual work is unresolved, stop the step and record it as a finding against the approved criteria; do not explain it away. |
| Limitation to state | Closing a task is not automated verification. |

### Step 9. An old grant replay cannot re-enable marketing

| Field | Content |
|---|---|
| Actor | Test harness (Codex); Asha views |
| Precondition | Withdrawal at a higher epoch than the replayed grant. |
| Screen / action | P-CHOICES; W-WORKFLOW-DETAIL timeline — **MISSING** · Replay the old grant event; refresh Asha's choices. |
| Expected observable fact | Epoch not lowered; marketing stays withdrawn. Fresh re-consent, if shown, is a new interaction at a higher epoch. |
| Evidence needed (mandatory tests) | T10: T10 record including the stale-worker generation check. — **MISSING** |
| Presenter words | “Replaying an old 'yes' does nothing. Only a new, deliberate choice can change it, and that gets a higher number.” |
| Honest fallback | Show the T10 test record rather than performing the replay live. |
| Limitation to state | Ordering guarantee applies to the local supported path as documented; not global distributed atomicity. |

### Step 10. Export local evidence, including gaps

| Field | Content |
|---|---|
| Actor | Karan; Bo Admin (Demo) for the denial |
| Precondition | Workflow from step 4 exists. |
| Screen / action | W-EVIDENCE — **MISSING** · Show sections including 'Gaps and limits'; download the JSON; Bo tries the same link. |
| Expected observable fact | Export includes versions, commands, observations, unknown and manual items and coverage limits; audit event written; Bo is refused. |
| Evidence needed (mandatory tests) | T21, T22: Exported synthetic file; audit record; denial response. — **MISSING** |
| Presenter words | “The export is generated here, is recorded in the audit log, and keeps the gaps in. The digest helps spot changes; it is not a legal certificate.” |
| Honest fallback | Show a previously exported file from the same candidate, labelled with its time and build. |
| Limitation to state | Tamper detection is relative to a trusted copy; not proof against an administrator who controls the store and keys. |

### Step 11. The regression test catches a real break

| Field | Content |
|---|---|
| Actor | Karan in Test Lab |
| Precondition | Allowlisted healthy scenario and deliberately broken test-only sender fixture available in the private profile. |
| Screen / action | W-TESTLAB — **MISSING** · Run 'Marketing withdrawal — healthy control', then 'Marketing withdrawal — deliberately broken test-only control', then the healthy control again; open the failing assertion. |
| Expected observable fact | Each run records assertion-level results from real policy, boundary and target interaction. The broken run's record carries expected_fault_detection and its assertion shows the actual violation; its recorded result is not converted to PASS. |
| Evidence needed (mandatory tests) | T23, T24: Three run records with build and fixture references; code review confirming the result is not derived from the selector. — **MISSING** |
| Presenter words | “The broken fixture really does send after withdrawal, and the test catches it by looking at what was sent. Then we restore the healthy one and run it again.” |
| Honest fallback | If a run ends in ERROR, say the run is incomplete, retain its assertions and failures, and do not claim a complete pass. Use prerecorded material only if a real indexed recording matches the exact candidate/profile/time; otherwise state that evidence is unavailable. |
| Limitation to state | Covers the synthetic scenario only. |

### Step 12. Recovery: worker restart and quarantined target-only restore

| Field | Content |
|---|---|
| Actor | Human operator using Codex-supplied procedures |
| Precondition | Isolated synthetic profile; human approval for interruption and restore. |
| Screen / action | W-WORKFLOW-DETAIL, W-SYSTEMS; operator transcript — **MISSING** · Show the recorded restart and restore evidence (prefer recorded evidence to live interruption). |
| Expected observable fact | Same workflow continues with one logical effect; restored target stays blocked until reconciled with the current withdrawal. |
| Evidence needed (mandatory tests) | T11, T25: T11 and T25 records (scenario 'Quarantined target restore'); operator transcripts with exit codes. — **MISSING** |
| Presenter words | “We stopped the worker after a request was accepted; it carried on without losing or repeating the action. An old copy of the CRM was restored into quarantine and stayed blocked until reconciled.” |
| Honest fallback | Show the labelled recording or transcripts; do not interrupt services live without rehearsal. |
| Limitation to state | Target-only synthetic restore; not control-plane backup recovery or enterprise disaster recovery. |
<!-- END GENERATED: demo-steps -->

## 5. Isolation side-steps (optional, 1–2 minutes)

| Actor | Action | Required observable fact | Tests | Evidence |
|---|---|---|---|---|
| Bo (Birch) | Open an Aster workflow, evidence or export URL | `error.staff.404` wording. No Aster detail in the response. | T03, T22 | MISSING |
| Ravi or Bela | Open Asha's receipt URL | `error.portal.403_404` wording | T04 | MISSING |
| Asha | Open `/workspace` | `permission.principal_in_workspace` | T04 | MISSING |
| Meera (Auditor) | Visit Configure pages. Try a write through the API. | No mutation controls; server 403 | T05 | MISSING |

**A screenshot of a denial page is not proof of server-side isolation.** Present these beats alongside the T03/T04/T05 test records.

## 6. Honest fallback and recordings

- **If a step fails live:**
  1. Say what happened in plain words.
  2. Don't refresh repeatedly, reset, or switch builds.
  3. Either skip the step or play its labelled recording.
  4. Log the time and screen for the evidence index.
- **Recording label.** Every recording shows this caption for its whole duration:
  > **RECORDING — not live.** Recorded `{date} {time} IST` · Build `{build_id}` · Commit `{short_commit}` · Profile `{profile}` · Synthetic data only.
- **File name:** `ORVIA_rec_step{NN}_{build_id}_{YYYYMMDD-HHMM}IST.{ext}`
- **Which recordings are valid.** A recording may be used only if all of these hold:
  - its build matches the frozen candidate;
  - it was captured by the human or by a Codex browser trace;
  - it is listed in `EVIDENCE_INDEX.json` with what it shows and what it does not show.

  An older recording does not validate a newer build.
- **Current state: no recordings exist.**

## 7. Words to use and to avoid

The exact claim wording is in [`docs/demo/CLAIMS_REGISTER.md`](../demo/CLAIMS_REGISTER.md). In short:

| Avoid | Say instead |
|---|---|
| Compliant, certified | Shows what happened, including gaps |
| Deleted her data | Stopped marketing use |
| Verified (for a reply) | Acknowledged; then observed separately |
| All systems | The systems mapped in ORVIA |
| Integrates with Salesforce/HubSpot | Synthetic local CRM |
| AI | Rule-based, no model |
| Production-ready | Internal prototype on synthetic data |

## r4 current-source boundary

The named organisations/principals and the twelve steps are the agreed synthetic scenario, not a claim that a complete seed command exists. A01 seeds identities; A02 test helpers construct business fixtures; A07 still owes a supported full-demo seed. All steps retain evidence requirements and honest fallbacks. Accepted semantics are 0.2.1; executable 0.3.0 and merged expiry correction await consolidated review. No runtime command, fault, reset or restore was run by Work for this document delivery.
