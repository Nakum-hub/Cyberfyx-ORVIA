# Audit practice and expanded-V1 reconciliation: 2026-09-29

**Task:** AUDIT-PRACTICE-01 (Claude Code, branch `claude/upbeat-newton-w4h53x`).

**Base.** Merge `0794f7e`, which brought origin/main `2247dd8` into this branch. The work covered here runs through the commit that adds this file.

**Sources read, in AGENTS.md order.**
- Revision 1.4 master; historical addenda.
- `CURRENT_STATE.md`, the contract and ownership files, and `tracking/tasks.json`.
- The owner transfers, `V1_EXPANDED_BASELINE.md` and `v1-expansion.json`.
- The revision 1.5 and 1.6 addenda and the DPDP extension.
- Codex's review `2026-09-28-project-review.md` and the latest Codex and Claude handoffs.

**Not available here.** Codex's uncommitted discovery-authority fixes are not in this checkout. They were neither assumed nor reconstructed.

## States used

| State | Meaning |
|---|---|
| `VERIFIED_ON_CURRENT_SOURCE` | Implemented, and executed on this source with the named evidence. |
| `IMPLEMENTED_NOT_VERIFIED` | Code exists; no execution evidence on this source. |
| `PARTIAL` | Some of the requirement is built or verified; the gap is named. |
| `MISSING` | Not built. |
| `BLOCKED_EXTERNAL` | Needs something outside engineering: a person, a legal review, network access, a real provider. |
| `DEFERRED_V2` | Out of Version 1 by the master. |

Evidence names below refer to suites run on this source. Their exact commands, exit codes and artifacts are in `handoffs/code/2026-09-29-audit-practice.md`.

The main suites:
- **VA:** `tests/integration/vendor/vendor-audit.test.ts`
- **AP:** `tests/integration/vendor/audit-practice.test.ts`
- **AM:** `tests/integration/expansion/audit-mandate.test.ts`
- **DA:** `tests/integration/expansion/dpdpa-audit.test.ts`
- **E2E-DA:** `tests/e2e/dpdpa-audit-local.ts`
- **E2E-AM:** `tests/e2e/audit-mandate-local.ts`

## A. Engagement acceptance and independence

| Requirement | Implementation | State | Evidence and limits |
|---|---|---|---|
| Service types: readiness/advisory, evidence audit, statutory SDF claim | `vendor.engagement_acceptances.service_type`; `vendor-practice.ts` `AcceptancePrepare` | VERIFIED_ON_CURRENT_SOURCE | AP: a statutory claim without an applicability basis or eligibility evidence is refused. E2E-DA: acceptance prepared in the UI. |
| Statutory SDF claim needs validated applicability and eligibility | DB CHECK plus contract refinement. The fields are recorded as entered and reviewed. | PARTIAL | Recorded and required. ORVIA does not validate SDF status or eligibility, by design. The legal meaning is BLOCKED_EXTERNAL (see Legal). |
| Terms: objectives, users, responsibilities, confidentiality, evidence handling, restrictions, competence | Acceptance record; fixed once prepared | VERIFIED_ON_CURRENT_SOURCE | AP: terms immutable after the decision. |
| Conflicts and prior work, with safeguards | `vendor.engagement_conflicts` and its review | VERIFIED_ON_CURRENT_SOURCE | AP: acceptance refused while a conflict is open; a safeguard is required; a prior implementer stays barred from review. |
| Commercial, implementation and author roles cannot hold independent review | `vendor.review_barred`, `team_guard`, `independent_review_guard`, `acceptance_guard` | VERIFIED_ON_CURRENT_SOURCE | AP: a commercial owner cannot be the reviewer; the decider cannot be the preparer, the lead or barred; preparers cannot review their own work. |
| Buying ORVIA never conditions a finding | `licence_independence` CHECK(true); report statement; ORVIA guidance kept separate from the recommendation | VERIFIED_ON_CURRENT_SOURCE | AP and E2E-DA: acceptance cannot be prepared without it; the PDF carries the statement. |
| Real engagements need activation gates and production criteria | `practice_activations`, `practice_gates_missing()`, `acceptance_guard`, configure check | VERIFIED_ON_CURRENT_SOURCE | AP: REAL refused, the dev-key gate refused, the production-criteria gate refused. The gates themselves are BLOCKED_EXTERNAL (legal review, official package, key ceremony). |

## B. Understanding and applicability

| Requirement | Implementation | State | Evidence and limits |
|---|---|---|---|
| Versioned understanding, reusing existing records | `vendor.understanding_versions`; `existing_records` by reference | VERIFIED_ON_CURRENT_SOURCE | AP, E2E-DA: versions, independent review, redaction of contact details. It does not import client RoPA content; it references it. |
| Provision-level applicability: effective date, rationale, evidence, reviewer, open questions | `vendor.applicability_decisions` | VERIFIED_ON_CURRENT_SOURCE | AP: unresolved decisions need a question; provisions must belong to the requirement; independent review. |
| Statutory, contractual and advisory criteria kept apart | `criterion_type` on applicability and findings | VERIFIED_ON_CURRENT_SOURCE | AP: an advisory finding does not block MEETS; a statutory one does. |

## C. Scope and plan

| Requirement | Implementation | State | Evidence and limits |
|---|---|---|---|
| Scope revisions with change-impact assessment | `vendor.scope_versions`, `scope_guard`; the engagement scope follows only an approved version (0009 trigger) | VERIFIED_ON_CURRENT_SOURCE | AP: a revision needs a reason and an impact assessment; direct edits are refused; the change diff is shown; unresolved applicability is carried as a limitation. |
| Approved, risk-based work programme | `vendor.procedures`, `plan_approvals`; the digest is approved; problems listed | VERIFIED_ON_CURRENT_SOURCE | AP: a high residual risk without an operating-effectiveness procedure blocks approval; the author cannot approve; a change after approval un-approves the programme. |
| Traceability: provision → requirement → risk → control → objective → procedure → evidence → result → finding → remediation → retest → conclusion | `EngagementFile.traceability`; the report coverage table | PARTIAL | Built on the vendor side and shown in the UI and report. Client-side remediation appears only as the GRC issue state sent with a response; client GRC content does not flow back, by design. |
| Reuse GRC objects where the meaning matches | The client links findings to `grc_issues` (existing `audit_finding_links`) | PARTIAL | Findings become client GRC issues, and their state travels back as a reference. Vendor-side controls are references, not the client's GRC controls; separate installations make this intended. |

## D. Risk methodology

| Requirement | Implementation | State | Evidence and limits |
|---|---|---|---|
| Versioned methodology: likelihood, impact, inherent, control effectiveness, residual; people, scope, duration, uncertainty | `vendor.methodologies`; `rate()`; `risk_assessments` | VERIFIED_ON_CURRENT_SOURCE | AP: a non-monotonic matrix is refused; ratings are computed, never supplied by the client; the recorder cannot approve. |
| Severity rationale under the methodology | `findings.severity_rationale`, `methodology_id` | VERIFIED_ON_CURRENT_SOURCE | Required on every finding. Severity is still chosen by the auditor, guided by the stated rules; it is not computed. |
| Risk acceptance: authority, justification, expiry; never erases a finding | `vendor.risk_acceptances`; `finding_status_guard` | VERIFIED_ON_CURRENT_SOURCE | AP: needs a client proposal; at most one year; the finding stays on file and in the PDF. |

## E. Evidence and working papers

| Requirement | Implementation | State | Evidence and limits |
|---|---|---|---|
| Provenance, period, method, hashes, access history, freshness, procedure links | `vendor.evidence`, `evidence_evaluations`, access log | VERIFIED_ON_CURRENT_SOURCE | AP, AM: package items, signed channel entries and auditor records. Access history covers package items only. |
| Types: assertion, document, system-generated, observation, reperformance, corroboration | `evidence_type` with fit rules | VERIFIED_ON_CURRENT_SOURCE | AP: a statement cannot be registered as a document; an assertion is never high reliability. |
| Relevance, reliability and sufficiency | Evaluations per procedure | VERIFIED_ON_CURRENT_SOURCE | AP, E2E-DA. |
| Request lifecycle: deadline, owner, clarification, resubmission, rejection, overdue, unable to obtain | `audit_requests` status and `request_events` | VERIFIED_ON_CURRENT_SOURCE | AP: every transition; unobtainable evidence appears in the report limitations. |
| Working papers with preparer, reviewer and review notes | `vendor.working_papers` (versioned, digested), `review_notes` | VERIFIED_ON_CURRENT_SOURCE | AP, E2E-DA: open notes block review; only the preparer answers; reviewed versions are immutable. |
| Sanitise free text | `shared/contracts/src/redaction.ts` applied to all practice free text and client responses | PARTIAL | E-mail, phone-like and PAN-format identifiers are removed. Names and other personal data are not detected; the documents say so. |

## F. Sampling

| Requirement | Implementation | State | Evidence and limits |
|---|---|---|---|
| Population definition, completeness, method, size rationale, selection | `vendor.populations` | VERIFIED_ON_CURRENT_SOURCE | AP, AM: a channel sample takes the seed, size, counts and selection digest from the signed entry. |
| The seed does not prove completeness | COMPLETE needs named, evaluated, non-assertion completeness evidence (0009 CHECK) | VERIFIED_ON_CURRENT_SOURCE | AP: refused without it and with an assertion; AM: a channel sample stays UNVERIFIED. |
| Design vs implementation vs operating effectiveness | `procedures.test_nature`; operating effectiveness needs a COMPLETE, tested population | VERIFIED_ON_CURRENT_SOURCE | AP. |
| Interviews alone are not proof | `effectiveProblem` refuses EFFECTIVE on assertions or interviews alone | VERIFIED_ON_CURRENT_SOURCE | AP. |
| Failed, unavailable, contradictory, untested shown explicitly | Conclusions `EXCEPTIONS_NOTED`, `INEFFECTIVE`, `UNABLE_TO_TEST`, `NOT_TESTED`; contradicting evaluations block EFFECTIVE | VERIFIED_ON_CURRENT_SOURCE | AP. |
| Aggregates are no substitute for record-level testing | Record-level procedures need auditor re-performance, observation or corroboration | VERIFIED_ON_CURRENT_SOURCE | AP. |

## G. Findings

| Requirement | Implementation | State | Evidence and limits |
|---|---|---|---|
| Criteria, scope, condition, evidence, tests, cause, consequence, severity rationale, recommendation | Practice finding contract; rests on an adverse working paper | VERIFIED_ON_CURRENT_SOURCE | AP, DA, E2E-DA. |
| Management responses and disagreement | `management_responses`: facts agreed or disputed, agree / partially / disagree | VERIFIED_ON_CURRENT_SOURCE | AP (recorded by the auditor), AM and E2E-AM (over the channel). |
| Round trip: vendor finding → client GRC → back to the auditor | Signed findings offered at check-in → staged → imported by a person → GRC issue → dual-approved, installation-signed response → vendor finding CLIENT_RESPONDED → retest | VERIFIED_ON_CURRENT_SOURCE | AM, E2E-AM for the channel leg; AP for retest and closure. A retest after a channel response was not run end to end in one suite. |
| Recommendations are never executable commands | `assertAdvisory` refuses code or commands; the PDF labels recommendations advice only; nothing executes them | VERIFIED_ON_CURRENT_SOURCE | AP. |

## H. Review, report and follow-up

| Requirement | Implementation | State | Evidence and limits |
|---|---|---|---|
| Independent working-paper review; a conclusion for every scoped requirement | `approvalProblems`; review guards | VERIFIED_ON_CURRENT_SOURCE | AP: approval refused without a conclusion or with unreviewed papers. |
| Adverse findings allowed; no unsupported favourable conclusion | 0009 `result_guard` / `requirement_supported` | VERIFIED_ON_CURRENT_SOURCE | VA, AP, E2E-DA: MEETS refused without a reviewed EFFECTIVE paper or with an open statutory finding. PARTIALLY_MEETS is not guarded. |
| Executive summary plus detailed report | Report fields and PDF sections | VERIFIED_ON_CURRENT_SOURCE | AP; E2E-DA; the PDF text was read. |
| Approval and signature bound to the exact snapshot; corrections and supersession | `approved_snapshot_digest`, `report_binding_guard`; corrections supersede | VERIFIED_ON_CURRENT_SOURCE | AP: signing refused after a change; the digest cannot be altered; the correction supersedes the original. A schema defect that made supersession impossible was found and fixed (0009). |
| RETEST_PASSED only with a retest procedure, fresh evidence and a reviewer | `recordRetest`, `finding_status_guard` | VERIFIED_ON_CURRENT_SOURCE | AP: stale evidence refused; status cannot be forced; the legacy note route cannot set it. |
| Verified remediation, risk acceptance, withdrawal and administrative closure kept distinct | `closure_type` with consistency CHECK | VERIFIED_ON_CURRENT_SOURCE | AP. Engagement-withdrawn closure was not exercised by a test. |
| Retention, holds, purge | `legal_holds`; `retention_sweep` skips held engagements | VERIFIED_ON_CURRENT_SOURCE | AP: an administrator cannot hold; a held engagement is not purged; released → purged. |
| Visible marks: synthetic, test-fixture, dev key | `watermarks()`, UI banners | VERIFIED_ON_CURRENT_SOURCE | AP, E2E-DA. |

## Revision 1.6 completion

| Requirement | State | Evidence and limits |
|---|---|---|
| Tenant and engagement binding; replay; pinned keys; signatures; chain | VERIFIED_ON_CURRENT_SOURCE | AM: refused calls, replay, forged key, chain gap. |
| Expired requests | VERIFIED_ON_CURRENT_SOURCE | AM: a past-due signed request is refused as PAST_DUE and reported. |
| Response limits and redirect refusal | VERIFIED_ON_CURRENT_SOURCE | Unit transport test against a loopback server. |
| Durable recovery; UNKNOWN until reconciled | VERIFIED_ON_CURRENT_SOURCE | AM: lost response, then resend settled by the original receipt. A fetch error-classification defect (`error.cause`) was found and fixed. |
| Recheck the mandate before dispatch | VERIFIED_ON_CURRENT_SOURCE | AM: a mid-cycle suspension stops the next generation; resuming sends it. |
| Revocation and end settle queued work | IMPLEMENTED_NOT_VERIFIED | Code in `stillOpen`; no test drives a revocation with queued items. |
| Lease against concurrent workers | VERIFIED_ON_CURRENT_SOURCE | AM: a leased mandate is left alone; the lease is released after a cycle. Two truly concurrent worker processes were not run. |
| Propagation semantics documented | VERIFIED_ON_CURRENT_SOURCE | `docs/engineering/audit-channel-semantics.md`. |
| Continuous assurance keeps its own mandate | PARTIAL | A separate mandate kind with its own approval. No vendor workflow separate from engagements; no pricing. |
| Integrity limits stated | VERIFIED_ON_CURRENT_SOURCE | Semantics document §Integrity limits. |
| Real TLS to a separately hosted vendor | BLOCKED_EXTERNAL | Needs hosting and certificates; every run used loopback HTTP. |

## Legal

| Item | State | Notes |
|---|---|---|
| Official Act, Rules and notifications retrieved and hashed | BLOCKED_EXTERNAL | Egress to meity.gov.in and egazette.gov.in is denied. See `docs/regulatory/LEGAL_SOURCE_STATUS.md`. |
| Rule 13 empanelment claim | VERIFIED_ON_CURRENT_SOURCE (withdrawn) | Withdrawn as unverified. ORVIA never decides eligibility and labels any reference "not verified by ORVIA". |
| Legal review of the engagement letter and DPA | BLOCKED_EXTERNAL | Human step; it is also an activation gate the software enforces. |
| TEST_FIXTURE criteria and dev keys visibly non-production | VERIFIED_ON_CURRENT_SOURCE | Marks on the UI, signed JSON and PDF. |

## Known items rechecked

| Item | State | Notes |
|---|---|---|
| R01 preference ordering | VERIFIED_ON_CURRENT_SOURCE | Fixed earlier in this task; preferences suite in the battery. |
| R02 generated contracts | VERIFIED_ON_CURRENT_SOURCE | Contract 0.44.0; `contracts:check` passes. |
| R03 scope-predicate migration | PARTIAL | `0063_typed_scope_predicate` exists. The 1M mixed-workload qualification is not re-run here. |
| R04 credential separation paths | PARTIAL | Fixed; unit tests pass. A run on Windows is NOT_RUN. |
| R09 duplicate relation on migrate | IMPLEMENTED_NOT_VERIFIED | Not reproduced: upgrade from V1 through 0069 passes and matches a fresh install. Codex's original database was not available to diagnose. |
| PostgreSQL adapter: generation, version, approval | IMPLEMENTED_NOT_VERIFIED (Codex lane) | `connectors/src/postgres-records/adapter.ts` needs an approved mapping, generation and monotonic version. Unit tests use SQL doubles. Real least-privilege deployment is BLOCKED_EXTERNAL. |
| Customer clean install and upgrade | VERIFIED_ON_CURRENT_SOURCE | `tests/integration/migration/upgrade.test.ts` 10/10. |
| Vendor fresh vs upgraded schema | VERIFIED_ON_CURRENT_SOURCE | `tests/integration/vendor/schema-equivalence.test.ts` 7/7. |
| Vendor migration prefixes and roles | PARTIAL | `0003_licence_fulfilment` (Codex, commerce) and `0003_vendor_service` share a prefix. The runner orders by file name, so installations that received them at different times applied them in different orders; the resulting schema is identical (7/7). Renaming needs a coordinated change with the commerce owner. Commerce migration 0003 grants nothing to the runtime role. |
| Test-fixture checklist criteria | VERIFIED_ON_CURRENT_SOURCE | Criteria recorded as TEST_FIXTURE; the checklist says so. |
| Retest notes-only | VERIFIED_ON_CURRENT_SOURCE (fixed) | The legacy note route can no longer set RETEST_PASSED, RETEST_FAILED or CLOSED. |
| Source signatures and historical artifacts | IMPLEMENTED_NOT_VERIFIED | Not re-examined in this task beyond the inventories (`qualification-inventory`, `v1-source-inventory` checks pass). |
| Installer qualification | BLOCKED_EXTERNAL | systemd, reboot survival and real hosts are NOT_RUN (unchanged from revisions 1.5/1.6). |
| Commerce is not a purchase journey | VERIFIED_ON_CURRENT_SOURCE | No runtime route calls the commerce module; its tests use the operator role. Live payments are not activated. |

## UX

| Item | State | Notes |
|---|---|---|
| Vendor workspace with nine tabs | VERIFIED_ON_CURRENT_SOURCE | E2E-DA drives every tab of the core path; screenshots in `output/playwright/practice-*.png`. |
| Customer views: requests, approvals, evidence, mandates, findings, remediation, reports | VERIFIED_ON_CURRENT_SOURCE | E2E-AM: documents staged and imported, responses prepared, approved and accepted; earlier views unchanged. |
| Empty, loading, error, permission, validation and recovery states | PARTIAL | Present on the vendor workspace and practice page. Action forms are always expanded, so tabs are long. Firefox and WebKit are NOT_RUN. |

## Not in scope, or elsewhere

- Custom-model functions: DEFERRED_V2.
- Commerce, connectors and the discovery-authority fixes are Codex's lane and were not changed.
