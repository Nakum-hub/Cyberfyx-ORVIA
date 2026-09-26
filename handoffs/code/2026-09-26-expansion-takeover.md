# Handoff — expanded V1 takeover — Claude Code — branch `claude/upbeat-newton-w4h53x`

**Base commit:** `211c146` (main, PR 20 merged)
**Contract version:** 0.29.0 → 0.30.0 (additive; each family bumps as it lands)
**Scope and profile:** remaining expanded-V1 work from `docs/engineering/2026-09-25-overall-completion-and-resume.md`, taken over from Codex at the user's request while Codex credits are exhausted. Isolated synthetic `codex-a00` profile in a disposable cloud container.

Codex should review every section below. Nothing here promotes a family to accepted; every family still needs exact-build acceptance and the external decisions listed at the end.

## EX06 — general impact assessments (this commit)

**Built**
- Migration `0051_impact_assessments.sql`: versioned templates; assessments; append-only answers, findings and finding events; lifecycle triggers (a template version is immutable; an assessment moves only DRAFT→SUBMITTED→APPROVED/REJECTED, APPROVED→SUPERSEDED; nothing is deleted); forced RLS on `grc.read`/`grc.write`/`grc.approve` (worker via `operations.execute`); the approver must differ from the creator and the submitter, and the publisher from the author (CHECK constraints); one answer-rule finding per question; one escalation per finding and due date.
- Contract `shared/contracts/src/expansion.ts`, `expansion-routes.ts` (13 routes), `expansion-examples.ts`; a guard in `index.ts` makes a schema-name collision fail the contract build. A collision was found and fixed: the graph module already owns `ImpactAssessment`, so this family uses `ImpactAssessmentDetail`.
- Domain `backend/domain/src/assessments/impact.ts`:
  - required answers and evidence are enforced at submission;
  - answer rules raise findings;
  - any unresolved finding blocks approval;
  - risk acceptance needs `grc.approve`, a person other than the raiser, and a future expiry (an expired acceptance blocks again);
  - a retest is a new revision carrying answers forward (marked as carried forward), and the predecessor is superseded only when the retest is approved;
  - an optional regulatory requirement link is validated against the package in force;
  - the idempotent escalation sweep is exposed as a route.
- Screen `/workspace/impact-assessments`: question builder, publish/retire, start with a subject picker, answer sheet, submit, decision, finding progress, raise finding, retest, escalation. The existing "Assessments" nav item is relabelled "Processor assessments".
- Generated OpenAPI now labels expansion routes `IMPLEMENTED_V1_EXPANSION_PENDING_REVIEW` and DPDP routes `IMPLEMENTED_DPDP_OPERATIONS_PENDING_REVIEW` (they previously fell through to `CONTRACT_ONLY_PENDING_TICKET`).

**Fixed along the way (shared UI)**
- `WriteForm` gained `keepValues` for edit forms. Detail panels are keyed by record id: Impact assessments, Data Principals, consent records and estate imports.
- Before this fix, a saved answer sheet cleared itself, and the next save silently dropped fields that were not re-typed. The breach correction form had the same latent behaviour.

**Executed**
| Command | Result |
|---|---|
| typecheck, lint, contracts:generate/check (313 route examples, 0.30.0) | PASS |
| db:migrate on codex-a00 | applied `0051_impact_assessments` |
| `tsx tests/integration/expansion/impact.test.ts` | **40/40 PASS** (first run failed on a harness detail: the fixture sends GET when the body is undefined, so body-less POSTs pass `{}`) |
| `tsx tests/e2e/expansion-screens-local.ts` (EX06 phase) | **14/14 PASS**. Earlier runs failed and exposed the form defect above, plus a race in my own test |

**Remaining for EX06:** a reviewed legal applicability mapping of templates to regulatory content (needs the official package); overdue escalation delivered through customer-controlled notification transports (EX09); full application acceptance on a frozen candidate.

## EX08 — third-party lifecycle

**Built**
- Migration `0052_third_party.sql`:
  - `processor_agreements`, changeable only by termination; supersession happens once;
  - `processor_tiers`, append-only;
  - `supplier_links`, storing only a SHA-256 digest; expiry ≤31 days; the only changes allowed are use and a single revocation;
  - `impact_answers.respondent` (`STAFF`/`SUPPLIER`);
  - `app.resolve_supplier_link(digest)` and `app.supplier_assessment()` as narrow security-definer functions;
  - RLS so a supplier actor sees exactly one draft assessment, its template and only its own answers;
  - a restrictive policy so an answer is labelled SUPPLIER exactly when a supplier actor wrote it (staff cannot forge an attestation).
- Contract 0.31.0:
  - 11 routes;
  - new route authority `SUPPLIER_LINK` with OpenAPI scheme `supplierLink` (HTTP bearer);
  - new capability `supplier.respond`;
  - the `ImpactAnswer.respondent` field;
  - supplier routes are excluded from the UI endpoint types.
- Domain `backend/domain/src/third-party/third-party.ts`: the standing derives these gaps from recorded engagements, linked activities and their current purpose versions, sub-processor engagements, tier, approved `VENDOR_DUE_DILIGENCE` assessments and dispositions:
  - `NO_AGREEMENT_IN_FORCE`
  - `AGREEMENT_EXPIRING`
  - `REGION_NOT_PERMITTED`
  - `PURPOSE_NOT_PERMITTED`
  - `SUBPROCESSOR_NOT_PERMITTED`
  - `NO_TIER`
  - `DUE_DILIGENCE_MISSING`
  - `REASSESSMENT_DUE`
  - `DISPOSITION_NOT_VERIFIED`
- EX06 integration:
  - supplier answers block approval (`supplier_attestations_not_confirmed`) until staff record the answer themselves;
  - a retest carries forward only staff-confirmed answers.
- HTTP `backend/api/src/supplier.ts`: refuses cookies, requires a same-origin write, needs a `Bearer` 64-hex token, caps the body at 256 KiB, resolves the token by digest, runs as actor `MACHINE`/role `SUPPLIER` expiring with the link, and responds with `no-store` and `no-referrer`. It is dispatched from the `[...segments]` catch-all.
- Screens:
  - `/workspace/third-parties`: overview and detail, gaps, agreements (record, supersede, terminate), tier, supplier links (issue with a show-once URL, revoke);
  - `/supplier`, the public questionnaire: the token is read from the URL fragment and removed from the address bar; it has no session.

**Invariant tests updated (review requested)**
- `tests/unit/deployment-boundary.test.ts` "there is no vendor actor": the authority list gains exactly `SUPPLIER_LINK`, with an assertion that every such route is under `/api/v1/supplier/` with capability `supplier.respond`. The vendor checks are unchanged: no /vendor/ authority or capability, and no new audit actor domain. A supplier is the customer's own processor, not the ORVIA vendor.
- `tests/unit/processors.test.ts`: the count of `processor.*` routes goes from 11 to 20. All remain staff-only, idempotent and typed.

**Executed**
| Command | Result |
|---|---|
| unit | 252/252 PASS |
| db:migrate | applied `0052_third_party` |
| `tsx tests/integration/expansion/third-party.test.ts` | **43/43 PASS** on the first run, including database-level policy checks run as `orvia_app` with supplier settings |
| `tsx tests/e2e/expansion-screens-local.ts` | **21/21 PASS** (EX06 + EX08) |

**Remaining for EX08:** actual processor outcomes beyond declarations (needs real connectors); onward-transfer checks against observed transfers (needs EX05/EX04 flow evidence); supplier link delivery by customer-controlled email (EX09).

## EX10 / EX11 — policy lifecycle, issues and continuous control tests

**Built**
- Migration `0053_grc_lifecycle.sql`:
  - `grc_policies`: versioned by `policy_key`; the text of a version is immutable, and its only allowed transitions are DRAFT→PUBLISHED and PUBLISHED→RETIRED.
  - `grc_policy_acknowledgements`: a reader may insert only their own acknowledgement (restrictive `acknowledgement_self`).
  - `control_tests`: `check_kind`, `maximum_violations` and `control_id` are fixed once created. Only `enabled` and `next_run_at` change.
  - `control_test_runs`, `grc_issues`, `grc_issue_events` and `compliance_alerts` are append-only; the guard trigger refuses UPDATE and DELETE.
  - At most one issue exists per control test (partial unique index), and at most one alert per run.
  - RLS: STAFF with `grc.read` reads, and only writers insert (restrictive `writers_only`). The MACHINE actor reads and writes through `operations.execute`.
  - `app.run_control_check(kind)` is SECURITY DEFINER with a fixed search_path. It reads only the transaction's scope and needs STAFF `grc.write` or MACHINE `operations.execute`. It returns a violation count and at most 10 identifiers, never record contents.
  - The nine deterministic checks are:
    - systems used by an activity have a connector binding;
    - consent events have evidence;
    - active retention rules state a period;
    - engaged processors have an agreement in force;
    - withdrawals have a propagation run;
    - approved assessments are not past review;
    - every `app` table has FORCE ROW LEVEL SECURITY;
    - the audit append-only trigger is enabled;
    - every control has current evidence.
- Contract 0.32.0 adds 18 routes under `/grc/policies`, `/grc/issues`, `/grc/regulatory-framework`, `/grc/control-tests`, `/grc/compliance-alerts` and `/grc/compliance-report`. The expansion policy schemas are named `GrcPolicy*`, because `Policy*` collided with the base consent-policy schemas; the collision guard caught it.
- Domain `backend/domain/src/grc/lifecycle.ts`:
  - Policies:
    - the author cannot publish their own policy;
    - publishing a new version retires the one in force;
    - a version may cite requirements only from the regulatory package in force;
    - a review date is derived on publication.
  - Issues:
    - state is derived from events: OPEN, REMEDIATION_PLANNED, REMEDIATED, VERIFIED, RISK_ACCEPTED or ACCEPTANCE_EXPIRED;
    - a remediation cites evidence;
    - verification is either an independent review by an approver who is not the remediator, or a PASS run of a covering test observed after the remediation;
    - risk acceptance needs an approver who is not the raiser and a future expiry.
  - Control tests:
    - on FAIL the test opens one issue; a later failure on an issue that was verified or accepted appends RECURRED;
    - a PASS after REMEDIATED auto-verifies the issue with the run id;
    - an alert is raised only on a change of state (DRIFT_TO_FAIL, RECOVERED, ERROR);
    - ERROR records the SQLSTATE and is never counted as a pass;
    - STALE means the test has not run within twice its interval.
  - Framework import copies the in-force package's requirements into a GRC framework, labelled `test fixture` or `production`.
  - The auditor report derives from these records: test standings, open and overdue issues, policies, and mapped versus unmapped requirements per framework. It states its limits.
- Operations runner (`services/worker/src/operations-runner.ts`): each cycle runs due control tests as the enrolled MACHINE identity and escalates overdue issues once per due date. It also now drives the EX06 finding escalation, which previously existed only as a staff button. The report gains the fields `control_tests_run`, `compliance_alerts`, `issues_escalated` and `findings_escalated`.
- Screen `/workspace/compliance` ("Continuous compliance" in the nav) shows:
  - standing and framework coverage;
  - control tests: add, run now, enable or disable, run history with observation digest, and run due tests now;
  - alerts;
  - issues: filter by state, raise one, and record progress, verification or risk acceptance;
  - policies: draft, new version, publish, acknowledge, retire;
  - framework import from the package.

**Honest limits**
- Compliance alerts are stored with `delivery_state = NOT_DELIVERED`. Delivery through customer-controlled email or webhook is EX09 (task #14) and has not been built yet.
- Checks read only this installation's database. They do not observe external systems, and the report says so.
- The STALE standing is computed and shown, but no suite has executed it: the run history is append-only by design, so the suite cannot age a run.
- `issueList` with a state filter scans a bounded window of 1000 issues per page request and resumes from the last scanned row. It is correct but not indexed by state, because state is derived from events.

**Executed (codex-a00, synthetic fixtures)**
| Command | Result |
|---|---|
| `pnpm run contracts:generate` | 341 route examples validated, contract 0.32.0 |
| `pnpm run typecheck` / `pnpm run lint` | clean. Lint flagged an unchecked reassignment in my EX06 test, which now asserts that `missing` is empty. |
| `pnpm test` (unit) | 252/252 PASS |
| `tsx tests/integration/expansion/grc-lifecycle.test.ts` | 75/75 PASS. The first attempt stopped on the test's own page limit (200 > max 100); that failed artifact is kept. It covers: a deliberately broken control (an unbound system linked to an activity) detected as FAIL→issue→one DRIFT alert; a repeat failure that neither duplicates nor alerts; verification by a run from before the remediation refused; binding the system gives PASS→RECOVERED→auto-VERIFIED; a new break gives RECURRED on the same issue; fault injection (EXECUTE revoked from `orvia_app`, then restored in `finally`) gives an explicit ERROR with `SQLSTATE_42501`, one alert and no issue; the runner's scheduled run as MACHINE, with a disabled test skipped; escalation exactly once across runner and HTTP sweeps; the auditor reading the report but refused writes; another tenant getting 404; database immutability (23514); and reader inserts refused at RLS (42501). |
| `tsx tests/e2e/expansion-screens-local.ts` | 29/29 PASS (EX06, EX08, EX10/11). The first attempt failed on a race in the EX08 step: it waited for text in the list, then asserted on the detail table. The wait now targets the detail table, and that failed artifact is kept. |
| impact / third-party / operations runner / consent-withdrawal suites (rerun after these changes) | 41/41, 43/43, 10/10, 38/38 PASS |
