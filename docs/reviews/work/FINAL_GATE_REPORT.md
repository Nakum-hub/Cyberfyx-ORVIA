# W03 — final gate report

**Latest intake, not acceptance:** A03 was human-merged in PR #11 at 16:26:17 UTC while this package was being published: implementation `034100943f2c2f2b8e8934921501093746962b9b`, publication `397cb370bedaf45c3f62409e88fb891f7cd3b23e`, main `8a45911be8f86f7a35bfe1153bd40f968f4aecac`. Manifest metadata still says contract 0.3.0/PENDING_WORK_REVIEW. Only commit/path/publication metadata was inspected; A03 implementation and producer results remain queued for the requested consolidated review. This does not close A02 F01 or any Work gate.

**Integration update:** Work PR #10 was human-merged to `4eb346f0974bb38abcc541744cc57bdf87428f1a` during preparation; its tree exactly matches `33aa63a630619d170e1709b8cea2b30a78b6b78f`. This package is based on that integration. The earlier application snapshot remains the last runtime reviewed.

**Current recommendation: NOT_READY for the completed internal outcome demonstration.**

**Work preparation: COMPLETE. W03 acceptance: BLOCKED. Human release decision: NOT_SIGNED.** Date: 2026-09-16. This report completes the available current-state assessment and final review criteria. It does not claim that a frozen candidate, full acceptance run or rehearsal exists. The human requested preparing W01–W03 now, with later consolidated A03–A07 review; that instruction changes preparation order, not acceptance requirements.

## Exact current scope and provenance

| Field | Verified current value / boundary |
|---|---|
| Reviewed application source | Main `a5b6ff73c4fca4aa02e110ee5f11a121b1a7563b`; latest reviewed implementation is A02 `3242521e59966885d8053747a82d96cb92ea55d5` |
| Existing Work publication | `33aa63a630619d170e1709b8cea2b30a78b6b78f`, PR #10; exact review commits A01 `10f8e11830c43a875bfc29d05f650c9f0d853c33`, A02 `b3c582f86c78ca565562b95aa692a8b84f672770` |
| Approved source | Master document revision 1.3, 850752 bytes, SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`; Plan 1.0; single ADR-001 |
| Contract | Accepted baseline 0.2.1; executable 0.3.0 candidate pending A02 F01 correction/retest. Codex remains schema/dependency writer. |
| Accepted tasks | W00, A00, A01 only. A02/W01 acceptance blocked on F01; A03 coding reported under the human continuation, not accepted. Later code/UI/claims acceptance awaits exact submissions. |
| Frozen final candidate / build | **NOT_IDENTIFIED**. No A07 final release manifest, candidate browser evidence or two rehearsals reviewed at this checkpoint. This source is a review snapshot, not a freeze declaration. |
| Profile | Customer-local, synthetic Aster/Birch marketing withdrawal; actual local CRM, REST simulator and unsupported legacy obligation only when implemented/tested. No real vendor connector, customer data, destructive erasure or public deployment. |
| Optional scope | No P1 promoted. T31–T34 remain unselected and NOT_RUN. Custom AI stays DEFERRED_V2; the wider non-demo V1 backlog remains authoritative. |
| Time | Original approximately 36-hour remaining-work allocation retained; exact R0/meeting deadline unavailable. No new countdown, recurring review or unsupervised integration. |

## Current gate decision

| Gate from EXECUTION_PLAN | Required evidence | Actual checkpoint / owner |
|---|---|---|
| G1 — persisted authority | Real bootstrap/authentication, role and tenant/principal denial with persisted action | A01 bounded increment accepted; producer and Work subsets retained. Full browser/jobs/export coverage remains NOT_RUN. Codex + Claude Code supply missing scope. |
| G2 — durable withdrawal to target | Real browser withdrawal, transactional acceptance, actual CRM mutation and separate read | A02 source reviewed with F01 open; no reviewed A03/B02 final flow. Codex A02/A03 and Claude Code B02/B03. |
| G3 — core story and failure | Current send boundary, independent service condition, uncertainty, stale replay, real regression detection | No integrated A03–A06/B04 evidence reviewed here. W02 matrix is ready; Codex/Claude Code execute. |
| G4 — security/recovery corrections | Required failure, reset/restore, isolation and egress results; blocking findings fixed/retested | F01 correction/retest pending; A06/B04 tests absent at full-scenario depth. Work has not executed database reproduction, network capture or recovery. |
| G5 — frozen candidate | Exact build/contract/lockfile/profile, reproducible clean start, full required acceptance and browser evidence | No candidate manifest or complete suite. Codex A07 and Claude Code B06 prepare; Work reviews. |
| G6 — rehearsals and human decision | Two rehearsals, current claims/recording/export, known limits, human readiness sign-off | No rehearsals or sign-off. Cowork C02 pack is prepared against an older source and must be refreshed. Human decides. |

No G2–G6 gate is closed by the existence of this report. W03 start dependency remains W02; acceptance dependencies remain A07/B06/C02. W02 accepts only after its own code/UI dependencies and evidence, even when all tickets arrive in one submission.

## Evidence already available and its limits

Work accepted A00's foundation and A01's authentication/scoping increment. Work independently ran 11 unit tests plus contract generation, typecheck and lint on each A01/A02 review snapshot; the recorded checks passed. Work inspected A01's 87 producer security assertions and A02's 49 producer consent assertions. Their raw failures, reruns, source identities and artifact checks remain in [A01 evidence](W01_A01_EVIDENCE.json) and [A02 evidence](W01_A02_EVIDENCE.json).

A02's two final committed-source reports match all 141 recorded source files; earlier build/auth/lint/hygiene/unit/type reports retain their dirty-snapshot limits. Artifact existence and subset assertions do not establish final-candidate acceptance. No Work Docker/PostgreSQL/OPA/Next HTTP, browser, protected TLS, runtime egress, reset/restore or rehearsal execution is claimed. Current Work validation checks documents/trackers only.

### Canonical scenario status at this checkpoint

All prototype IDs below come from `tracking/acceptance.json`; they are not the master's differently numbered §217 tests. **0/30 mandatory full scenarios have a recorded PASS; all 34 remain NOT_RUN.** Linked engineering subsets retain their own coverage and do not change this count.

| Test | Priority / title | Full result | Implementation owners |
|---|---|---|---|
| T01 | P0 — Clean local start | NOT_RUN | A00, A07 |
| T02 | P0 — Protected bootstrap and authentication | NOT_RUN | A01, B01 |
| T03 | P0 — Tenant and environment isolation | NOT_RUN | A01, A06 |
| T04 | P0 — Principal and staff separation | NOT_RUN | A01, B02 |
| T05 | P0 — Least privilege and approval | NOT_RUN | A01, A02, B01 |
| T06 | P0 — Persisted configuration and relationships | NOT_RUN | A02, B01 |
| T07 | P0 — Grant and own receipt | NOT_RUN | A02, B02 |
| T08 | P0 — Atomic withdrawal acceptance | NOT_RUN | A02, A06, B02 |
| T09 | P0 — Idempotency and concurrent epochs | NOT_RUN | A02, A06 |
| T10 | P0 — Replay and fresh re-consent safety | NOT_RUN | A02, A03, A06 |
| T11 | P0 — Outbox and worker recovery | NOT_RUN | A03, A06 |
| T12 | P0 — Restricted signed commands | NOT_RUN | A03, A06 |
| T13 | P0 — Actual CRM mutation and readback | NOT_RUN | A03, A05, B03 |
| T14 | P0 — Current send-admission enforcement | NOT_RUN | A04, A06, B04 |
| T15 | P0 — Independent service purpose | NOT_RUN | A04, A06 |
| T16 | P0 — Degraded policy safety | NOT_RUN | A04, A06 |
| T17 | P0 — Applied but response lost | NOT_RUN | A05, A06, B03 |
| T18 | P0 — Acknowledgement without effect | NOT_RUN | A05, A06 |
| T19 | P0 — Known failure and bounded retry | NOT_RUN | A05, A06, B03 |
| T20 | P0 — Manual and missing capability | NOT_RUN | A05, A06, B03 |
| T21 | P0 — Truthful evidence and dashboard | NOT_RUN | A05, B03 |
| T22 | P0 — Local export protection | NOT_RUN | A05, A06, B03 |
| T23 | P0 — Healthy regression run | NOT_RUN | A06, B04 |
| T24 | P0 — Broken fixture detection and repair | NOT_RUN | A06, B04 |
| T25 | P0 — Quarantined target restore | NOT_RUN | A06 |
| T26 | P0 — No runtime vendor/model egress | NOT_RUN | A06, B04 |
| T27 | P0 — Input/session and secret hygiene | NOT_RUN | A01, A06, B04 |
| T28 | P0 — Reset and fault isolation | NOT_RUN | A00, A06, A07 |
| T29 | P0 — Integrated browser flow and error states | NOT_RUN | B01, B02, B03, B04, B06 |
| T30 | P0 — Frozen-candidate repeatability and claims | NOT_RUN | A07, B06, W03, C02 |
| T31 | P1 — Rights case coordination | NOT_RUN | A08, B05 |
| T32 | P1 — Retention/hold review coordination | NOT_RUN | A08, B05 |
| T33 | P1 — Development licence import | NOT_RUN | A08, B05 |
| T34 | P1 — Deterministic help | NOT_RUN | A08, B05 |

### Required finding lifecycle

**MEDIUM W01-A02-F01 — OPEN; Codex A02.** Files: `packages/domain/src/configuration.ts`, `packages/domain/src/consent.ts`, and their transaction/API/test paths identified in [the exact review](W01_A02_REVIEW.md). Source evidence shows expiry checked with transaction-start time across waits; a later consent publication wait is also relevant. Reproduction: hold the scoped synthetic lock, start before expiry, release after expiry and inspect the real response/committed effects. **Work runtime reproduction: NOT_RUN.** Expected: advancing current-time expiry at new-operation consumption after relevant waits; no committed side effects on denial; authorized replay of an already committed result remains stable. Required retest: fresh/expired/lock-wait/late-wait, rollback/no-effect, replay and applicable authority/concurrency controls on the correction SHA. This is a source finding, not an executed full-scenario FAIL.

Future findings must name severity, task/exact file and commit, evidence or reproduction with execution status, expected behavior, owning lane and exact retest/closure. Never relabel an unresolved finding as accepted merely because its implementation was human-merged. The dated Cowork pack's obsolete source/contract/master status is a final-refresh dependency; it is not a newly reproduced application vulnerability.

## Final candidate intake and freeze protocol

1. Human selects the integrated candidate after reviewable owner handoffs. Work records its full source SHA and tree; Codex records build ID, contract version, approved source hash, exact lockfile/tool/image identities, migration state, supported host/profile and fixture version. Evidence-publication commits are recorded separately from the source tested. No future SHA or platform support is invented.
2. Resolve A02/F01 and W01, then review A03–A06/B04 against [W02](INTEGRATION_AND_SECURITY.md). Review any executable contract change with its producer and UI consumer before accepting dependent results. A07 may be prepared already; acceptance still follows W02.
3. Codex supplies the real package, release manifest and documented clean-start/bootstrap/seed/reset commands. Use a named isolated rehearsal environment with protected credentials, required TLS/storage prerequisites and no publicly exposed stores/control services. Human owns access and any reset/restore/network approvals. Preserve evidence before any reset.
4. Execute the full 30 P0 scenarios on the frozen candidate plus only explicitly promoted P1 coverage. Include raw commands, timestamps, exits, expected/actual assertions, denied and healthy controls, fixture/profile and artifact hashes. A summary label, generated document, screenshot alone or test stub is insufficient for a runtime claim. Retain failed attempts and their corrected-source retests.
5. Claude Code supplies actual B06 candidate browser regression/screenshots and API/error/network evidence; Cowork updates C02 claims/capabilities/runbooks/media from the accepted facts. Work compares all identities and evidence, records limitations and decides its recommendation.
6. Freeze means no unreviewed runtime, migration, schema, dependency or configuration change. A correction creates a new identified candidate and invalidates affected evidence; rerun required candidate gates and rehearsals after material changes. A document-only evidence publication must prove the tested implementation is unchanged and name both commits; never call an old runtime run a test of changed code.

For each runtime record require `APPLICATION_ACCEPTANCE` and `FULL_SCENARIO` coverage only when the entire canonical expected behavior actually ran. Record exact source commit, command, UTC start/end, exit, deployment profile, fixture, assertion results, local artifacts/hashes and execution/review attribution under the existing evidence rules. PARTIAL and DOCUMENT_ONLY results retain their labels. Work does not add executable schemas or a second results system.

## Two-rehearsal review protocol

| Rehearsal | Required run and evidence | Current result |
|---|---|---|
| R1 | Start from the documented synthetic state on the frozen build; demonstrate staff setup/approval, principal grant/withdrawal/receipt, current marketing denial and separate service control, actual CRM/readback, REST unknown/reconciliation, visible legacy gap, local export and real regression detection/repair. Record operator, UTC interval, build/profile, steps, actual outcomes, interruptions and artifacts. | NOT_RUN; no final candidate |
| R2 | Repeat independently from the documented, authorized start/reset state on the same frozen build. Include the agreed recovery/quarantine sequence and confirm all claimed steps remain repeatable. Preserve R1 evidence and any failure; disclose any pre-recorded segment with its build/date and non-live label. | NOT_RUN; no final candidate |

Codex supplies executable procedures; Claude Code supplies browser artifacts; Cowork maintains narrative/claims; the human runs or supervises and signs. Work reviews evidence and observes only where access permits. Two rerenderings of one report or replaying one video are not two rehearsals. Runtime fixes between rehearsals require refreshed evidence and two rehearsals for the final candidate. The full acceptance suite need not be narrated live, but all required scenarios still need actual candidate evidence.

## Recommendation rules and separate production gates

| Recommendation | Meaning |
|---|---|
| READY | Exact scoped frozen candidate, all mandatory full scenarios and promoted P1 evidence pass, blocking findings resolved/retested, package/browser/claims match and two rehearsals succeed. Work recommends internal-demo readiness; human sign-off is still required. |
| PARTIAL | Human elects to show a specifically bounded, evidenced safe slice with unmet P0 items and limitations visible. It is not completion of the outcome prototype; no unsafe behavior or false claim is approved. |
| NOT_READY | Required evidence/candidate is missing or a blocking correctness/security gate remains. **This is the current recommendation.** |

Do not waive tenant/principal leakage, false verification, lost accepted requests, unsafe target access, a bypass of the claimed boundary, unrepeatable start or unexplained egress to meet the date. No P1 is currently promoted; promote at most one only after the core gate is green without consuming testing/rehearsal reserve. Unselected P1 remains NOT_RUN, not PASS.

The master remains authoritative for pilot/production: applicable Critical/High findings and score-independent §163 blockers; complete non-AI threat modeling and security testing; dependency/SBOM, secret and vulnerability triage; signed package verification/build provenance; qualified independent assessment/retest; production deployment/identity/transport/egress/support boundaries; full backup/recovery and key custody; incident/vulnerability response and reviewed legal/applicability/claims gates. **These are NOT_ASSESSED here.** Work document review or two AI lane reviews are not an independent penetration test, legal approval or production certificate. Target-only synthetic restore proves no complete control-plane disaster recovery. Development signing/checksums imply no production signing trust. No public hosting, vendor operational plane, support upload or AI capability is authorized by this prototype work.

## Owner actions and handoff

The next dependency-ready correction is Codex A02 F01; authorized A03–A07 coding may continue. Claude Code B00 has its accepted A00 start and must follow the UI graph; C00 is needed for its acceptance. Human reviews/merges the Work documentation PR. After the coding/UI/claims artifacts arrive, use [WORK_REVIEW_QUEUE.md](WORK_REVIEW_QUEUE.md) for one consolidated review, applying W01 → W02 → W03 acceptance in order.

The [W03 preparation handoff](../../../handoffs/work/W03-preparation-a5b6ff7.md) records completed Work documents and the actual validation. No merge to main, reset, rehearsal, release approval or automatic future task is performed by this checkpoint. Work alone consolidates CURRENT_STATE and canonical results.
