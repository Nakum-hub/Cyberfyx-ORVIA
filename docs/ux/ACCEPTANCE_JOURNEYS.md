# ORVIA prototype: acceptance journeys

**Owner:** GPT Work, successor to Cowork (C00) · **Status:** REVISED_FOR_REVIEW · **Revision:** c00-r4, 16 Sep 2026 UTC · **Documentation base:** `2432a008539450725129d19ff5fc6c2eee488031`

## Status

These journeys define what a browser test, integration test or operator must do and observe. They are not evidence.

**Results in this file.** The *Result* column copies the canonical status recorded by Work in `tracking/acceptance.json` at the documentation base. At the r4 base every full scenario remains NOT_RUN. A00/A01 are accepted increments; A02/A03/A04 and PR #16 correction reports are available for review. No full-scenario candidate acceptance or application browser run is supplied.

**Updating results.** When real results exist, Work updates this column only from Work's canonical record and indexes the underlying artifacts in `docs/demo/EVIDENCE_INDEX.json`. A FAIL or ERROR is kept as recorded. Evidence existing, evidence inspected, an observed PASS and Work's acceptance are four different facts.

**Which tests are mandatory.** All T01–T30 are mandatory P0 tests for the completed internal demo. Some are marked optional *to narrate live* in the demo script (for example T18 and T19); their test evidence is still required. T31–T34 stay unpromoted unless the human selects a permitted P1 slice.

## How this file connects to the others

- **Test IDs:** `T01`–`T34` come from `docs/prototype/ACCEPTANCE.md`.
- **Screen IDs:** from `docs/prototype/UX_BRIEF.md`.
- **Copy IDs:** from `docs/ux/UI_COPY.json`.
- **Fixtures:** from `docs/prototype/DEMO_SCRIPT.md` §1.
- **Routes and fields:**
  - Use accepted 0.2.1 semantics and the current generated client; the UX_BRIEF r4 table distinguishes present producer source from pending acceptance.
  - Executable 0.3.0 additions remain pending consolidated Work review; old r3 pending-W00 wording is superseded.
  - UI paths are Codex's decision.

## Executors

| Code | Who runs it | Where |
|---|---|---|
| **CC-E2E** | Codex | Playwright tests (`tests/e2e/**`) |
| **CX** | Codex | Integration, security and recovery tests |
| **HUMAN** | Human operator | Manual checks |

## Rules

- **A rendered page proves nothing on its own.** Browser assertions check both the screen and the API or data outcome.
- **Mocked-state UI tests are reported separately** from integrated-flow results (J21).
- **Evidence records follow the ACCEPTANCE.md schema:** test_id, command, exit_code, started/finished, commit/build_id, contract_version, profile, fixture_id, result, artifact_paths, limitations.
- **Where evidence goes:** each record is indexed in `docs/demo/EVIDENCE_INDEX.json` when supplied.
- **Expected-detection runs keep their actual result.** In J17, the broken-fixture run is recorded as the result its assertion produced. It is never converted to PASS.

---

## Summary

| Journey | Title | Screens | T-IDs | Executor | Result |
|---|---|---|---|---|---|
| J00 | Clean start and build identity | W-SIGNIN, W-OVERVIEW | T01, T30 | HUMAN, CX | NOT_RUN |
| J01 | Staff sign-in, MFA, sign-out, revocation | W-SIGNIN | T02 | CC-E2E, CX | NOT_RUN |
| J02 | Cross-tenant and environment denial | W-WORKFLOW-DETAIL, W-EVIDENCE, P-RECEIPT | T03, T22 | CC-E2E, CX | NOT_RUN |
| J03 | Principal and staff separation | P-SIGNIN, P-CHOICES, W-OVERVIEW | T04 | CC-E2E, CX | NOT_RUN |
| J04 | Role limits and distinct-reviewer publish | W-POLICIES, Configure screens | T05 | CC-E2E, CX | NOT_RUN |
| J05 | Configuration and persistence | W-PURPOSES, W-NOTICES, W-POLICIES, W-SYSTEMS | T06 | CC-E2E, CX | NOT_RUN |
| J06 | Affirmative marketing grant | P-CHOICES, P-GRANT, P-RECEIPT | T07, T15 | CC-E2E | NOT_RUN |
| J07 | Withdrawal, durable receipt, retry and second tab | P-CHOICES, P-RECEIPT | T08, T09 | CC-E2E, CX | NOT_RUN |
| J08 | CRM effect with separate observation | W-WORKFLOW-DETAIL | T13, T12 | CC-E2E, CX | NOT_RUN |
| J09 | Current-authority send admission | W-POLICIES (preview), W-TESTLAB, W-EVIDENCE | T14, T15, T16 | CX, CC-E2E | NOT_RUN |
| J10 | Response lost → outcome unknown → reconcile | W-WORKFLOW-DETAIL | T17 | CC-E2E, CX | NOT_RUN |
| J11 | Acknowledged without effect | W-WORKFLOW-DETAIL | T18 | CC-E2E, CX | NOT_RUN |
| J12 | Known failure and bounded retry | W-WORKFLOW-DETAIL, W-ATTENTION | T19 | CX, CC-E2E | NOT_RUN |
| J13 | Manual obligation, attestation, coverage loss | W-ATTENTION, W-WORKFLOW-DETAIL, W-SYSTEMS | T20 | CC-E2E, CX | NOT_RUN |
| J14 | Old grant replay and fresh re-consent | P-CHOICES, P-GRANT, W-WORKFLOW-DETAIL | T10 | CX, CC-E2E | NOT_RUN |
| J15 | Truthful dashboard and unresolved list | W-OVERVIEW, W-ATTENTION | T21 | CC-E2E, CX | NOT_RUN |
| J16 | Evidence view and local export | W-EVIDENCE | T21, T22 | CC-E2E, CX | NOT_RUN |
| J17 | Test Lab: healthy → broken → healthy | W-TESTLAB | T23, T24 | CC-E2E, CX | NOT_RUN |
| J18 | Worker restart recovery | W-WORKFLOW-DETAIL + operator | T11 | CX, HUMAN | NOT_RUN |
| J19 | Quarantined target-only restore | W-SYSTEMS + operator | T25 | CX, HUMAN | NOT_RUN |
| J20 | No runtime vendor or model egress | All core screens | T26 | HUMAN, CX, CC-E2E | NOT_RUN |
| J21 | Screen states and accessibility sweep | All screens | T29, T27 (session/CSRF) | CC-E2E | NOT_RUN |
| J22 | Reset and fault isolation | W-TESTLAB + operator | T28 | CX, HUMAN | NOT_RUN |
| J23 | Frozen-candidate rehearsal and claims | Whole demo | T30 | HUMAN, Work review | NOT_RUN |
| J24 | P1: rights intake coordination | Not specified | T31 | — | NOT_RUN (not a gate unless selected) |
| J25 | P1: retention/hold review | Not specified | T32 | — | NOT_RUN (not a gate unless selected) |
| J26 | P1: development licence import | Not specified | T33 | — | NOT_RUN (not a gate unless selected) |
| J27 | P1: deterministic help | Not specified | T34 | — | NOT_RUN (not a gate unless selected) |

### What a browser cannot show

Every P0 scenario (T01–T30) maps to at least one journey. The parts below cannot be observed from a browser, so they stay with Codex's suites. The journey checks only their user-facing consequence.

| T-ID | Part that stays with Codex |
|---|---|
| T03 | Database-role RLS bypass; background-job scope |
| T08 | Injected pre-commit failure |
| T09 | True concurrent ordering |
| T12 | Signed-command tampering, scope, expiry and replay; arbitrary host/SQL rejection |
| T16 | Policy engine timeout, undefined or malformed result |
| T26 | Network capture |
| T27 | Dependency and secret scans; log redaction |
| T28 | Non-demo database guard |

---

## Journeys

Each journey lists:

- **Actor**
- **Pre** (preconditions)
- **Steps**
- **See** (screen, with copy IDs)
- **True** (server or data fact)
- **Never** (what must not happen)
- **Evidence** (artifacts to capture)

### J00 — Clean start and build identity (T01, T30)

- **Actor:** Human operator.
- **Pre:** A fresh isolated profile, prepared with Codex's documented prerequisites. No model or provider credentials present. The procedure is not yet supplied (F-020).
- **Steps:**
  1. Run the documented clean-start and protected-bootstrap commands exactly as written in the engineering handoff.
  2. Sign in as Karan.
- **See:**
  - `global.banner.synthetic`
  - `overview.build_panel` filled with server values
  - `global.header.build`
- **True:**
  - The build ID equals the candidate build manifest.
  - Stores use persistent volumes.
  - `/healthz` returns liveness only.
- **Never:**
  - A setup wizard.
  - A hardcoded build string.
  - A prompt for AI or vendor keys.
- **Evidence:**
  - Command transcript with exit codes
  - Build manifest
  - Overview screenshot
  - Candidate commit

### J01 — Staff sign-in, MFA, sign-out, revocation (T02)

- **Actor:** Karan (MFA) and Priya.
- **Steps:**
  1. Sign in as Karan and complete MFA.
  2. Open the account menu.
  3. Sign out, then press Back.
  4. Sign in again. The operator revokes the session through the supported auth path. Reload.
  5. Try a wrong password, then a wrong code.
- **See:**
  - The role description `global.account.role.ORG_SUPER_ADMIN`.
  - `global.account.mfa_on`.
  - After sign-out or revocation: `error.staff.401` or the sign-in page, never cached data.
  - For wrong credentials: `signin.staff.failed`, which does not say which factor failed.
- **True:**
  - `GET /api/v1/session` returns 401 after sign-out and after revocation.
  - No tokens appear in the session body.
- **Never:**
  - A role switcher.
  - A default password.
  - A "demo login as" control.
- **Evidence:**
  - Playwright trace
  - Status codes
  - Screenshots

### J02 — Cross-tenant and environment denial (T03, T22)

- **Actor:** Bo (Birch staff) and Bela (Birch principal).
- **Pre:** J07 has produced `{aster_workflow_id}` and `{asha_receipt_id}`.
- **Steps:**
  1. As Bo, open the Aster workflow, evidence and export URLs.
  2. As Bo, list workflows, purposes and systems.
  3. As Bo, POST a reconcile for an Aster action.
  4. As Bela, open Asha's receipt.
- **See:**
  - `error.staff.404` for steps 1 and 3.
  - Only Birch data, or empty states, for step 2.
  - `error.portal.403_404` for step 4.
- **True:**
  - Denied responses contain no Aster fields.
  - The export is refused.
  - The denial is audited, if A00 audits denials.
  - Use accepted scoped 404 for inaccessible resources and 403 for capability denial (F-014); verify actual context in the browser/API tests.
- **Never:**
  - Aster names or counts in any Birch response.
- **Evidence:**
  - Playwright trace
  - Redacted response bodies
  - CX isolation test output

### J03 — Principal and staff separation (T04)

- **Actor:** Asha, Ravi and Karan.
- **Steps:**
  1. Asha opens `/workspace` and calls `/api/v1/admin/overview`.
  2. Ravi opens Asha's receipt, then calls `/portal/me/consents`.
  3. Karan opens `/privacy` and calls `/portal/me/*`.
- **See:**
  - Step 1: `permission.principal_in_workspace`.
  - Step 2: `error.portal.403_404`.
  - Step 3: `permission.staff_in_portal`.
- **True:**
  - The Step 1 API call is refused.
  - Ravi's call returns only Ravi's records.
  - Portal routes accept no principal selector.
  - A staff session is not accepted as a principal.
- **Never:**
  - A person picker.
  - A URL parameter that changes whose data is shown.
- **Evidence:**
  - Playwright trace
  - Status codes

### J04 — Role limits and distinct-reviewer publish (T05)

- **Actor:** Meera (auditor), Sam (member), Priya (author) and Karan (reviewer).
- **Steps:**
  1. Meera visits every Configure screen.
  2. Meera calls create, publish, reconcile, attest and start-run through the API.
  3. Sam tries to change the configuration.
  4. Priya drafts a policy and tries to approve it.
  5. Karan approves the exact digest, with re-authentication.
  6. Karan tries to approve after the draft changed.
- **See:**
  - Meera: `permission.read_only_auditor`, with no mutation controls.
  - Sam: `permission.view_only_member`.
  - Priya: `policies.deny.self`.
  - Karan: `permission.reauth_required`, then `policies.published`.
  - Stale draft: `policies.deny.digest`.
- **True:**
  - Every denied write returns 403 from the server.
  - The published version is immutable.
  - The approval stores reviewer, digest and time.
- **Never:**
  - Disabled buttons that still submit.
  - Self-approval.
  - Publishing without re-authentication.
- **Evidence:**
  - Playwright trace
  - API responses
  - Policy version record

### J05 — Configuration and persistence (T06)

- **Actor:** Priya, then Karan.
- **Steps:**
  1. Create both purposes, the notice and the three allowlisted systems: synthetic CRM, REST simulator and no-API ledger.
  2. Run `systems.check` on each system.
  3. Map the systems to purposes.
  4. Reload. The operator restarts the app. Reload again.
  5. Try to enter a free-text URL or credentials when adding a system.
  6. Try to edit a published version.
- **See:**
  - `systems.declared_note`.
  - Three coverage badges, derived from `connector`, `supports_restrict` and `supports_read`:
    - `state.coverage.automated_observable.label` ×2
    - `state.coverage.manual_only.label`
  - The send gateway is explained in text only. It is not a configured system in the accepted 0.2.1 shape (F-018).
  - Identical content after the restart.
  - `systems.field.type.help`, with no URL or credential fields.
  - `purposes.published_fixed`.
- **True:**
  - Checks are real and timestamped.
  - Published versions read back with an equal digest.
- **Never:**
  - "Discovered automatically".
  - Credentials echoed in a response.
- **Evidence:**
  - Playwright trace across the restart
  - Read-back digests
- **Open:** how a notice is published (F-017).

### J06 — Affirmative marketing grant (T07, T15)

- **Actor:** Asha.
- **Steps:**
  1. Open `nav.portal.choices`.
  2. Select `choices.review_and_agree` on the marketing card.
  3. Read the notice.
  4. Select `grant.button`.
- **See:**
  - Separate cards for each purpose. The service card shows `choices.service_card.note`, subject to the F-017 decision.
  - `grant.notice_meta` showing the server's notice version.
  - On the receipt: `receipt.accepted.grant` and `receipt.label.epoch` with the server's epoch.
  - Back on choices: `state.consent.GRANTED.portal`.
- **True:**
  - `GRANTED` at the next epoch.
  - `notice_version_id` equals the notice shown.
  - The request carried an `Idempotency-Key` and `expected_epoch`.
  - The order-service record is unchanged.
- **Never:**
  - A toggle.
  - Anything pre-selected.
  - A grant for another purpose.
  - Epoch or notice values hardcoded in the UI.
  - A second grant request while the first is unconfirmed.
- **Timeout variant (CC-E2E + CX):**
  1. Drop the response after submitting the grant.
  2. **See:** `error.portal.network_change`, then `recovery.portal.heading`, `recovery.portal.retry_same` and `recovery.portal.check`.
  3. While the original request holder survives, select `recovery.portal.retry_same` after authorised recovery: same Idempotency-Key, exact payload, `notice_version_id`, `interaction_id` and `expected_epoch`. Separately reload the full document: until the accepted durable recovery mechanism exists, assert an honest unavailable-recovery state, no fabricated key/epoch and no assertion of rollback (UX_BRIEF C00-R4-RECOVERY).
  4. **True:**
     - If the first request committed, the original receipt is returned and `recovery.portal.resolved_saved` is shown.
     - If a different change intervened, `EPOCH_CONFLICT` leads to `recovery.portal.resolved_conflict`, which appears only after a successful reload.
  5. **Status:** F-024 (client retention, B02; replay, A02).
- **Evidence:**
  - Playwright trace
  - Receipt JSON
  - Consent read-back

### J07 — Withdrawal, durable receipt, retry and second tab (T08, T09)

- **Actor:** Asha.
- **Pre:** J06 complete. `DEMO-CAMP-01` is queued.
- **Steps:**
  1. Read `choices.withdraw.explainer`.
  2. Select `choices.withdraw.button` once. There is no confirmation dialog.
  3. Try to activate the button again while it is saving.
  4. On the receipt, note `receipt_id`, `event_id`, epoch and `accepted_at`.
  5. Refresh the page, then sign out and back in.
  6. In a second tab still showing the old state, withdraw again.
  7. (CX) Send an identical retry with the same key.
  8. (CX) Reuse the same key with a different body.
  9. (CX) Inject a pre-commit failure.
  10. (CC-E2E) Drop the response after submit, reload the page, then select `recovery.portal.retry_same`.
- **See:**
  - Step 3: `choices.saving` with the button disabled.
  - Step 4:
    - `receipt.accepted.withdraw`: "Withdrawal recorded. Downstream actions are still being checked."
    - `receipt.proves`
    - `receipt.progress.heading`, as a separate block
  - Step 5: `state.consent.WITHDRAWN.portal`.
  - Step 6: `error.portal.409_epoch` with `error.portal.409_epoch.action`. `error.portal.409_epoch.reloaded` appears only after the reload succeeds.
  - Step 8 in the browser, if exercised: `error.portal.409_idempotency`.
  - Step 10:
    - `error.portal.network_change`, then the `recovery.portal.*` panel, which survives the reload.
    - The retry reuses the same Idempotency-Key, `interaction_id` and `expected_epoch`.
    - The original receipt is shown (`recovery.portal.resolved_saved`) or the conflict is handled.
    - A new withdrawal is offered only after that.
- **True:**
  - The 202 receipt exists only after commit.
  - The status is `WITHDRAWN` at the next epoch.
  - There is exactly one consent event and one outbox record.
  - Step 7 returns the original receipt.
  - Step 8 returns 409.
  - The stale epoch returns 409.
  - The injected failure leaves no receipt and no state change.
- **Never:**
  - "Withdrawn" shown before the server responds.
  - A second receipt.
  - The receipt implying that downstream work is done.
  - A new notice required to withdraw.
  - "Nothing changed" after a timeout or a generic 503. `error.portal.503_not_saved` is never shown without an accepted no-commit signal (F-024).
  - A new key or a substituted epoch when retrying the original request.
- **Evidence:**
  - Playwright trace
  - Receipt JSON
  - CX transaction and idempotency output

### J08 — CRM effect with separate observation (T13, T12)

- **Actor:** Karan (viewing).
- **Steps:**
  1. Open the J07 workflow.
  2. Wait or select `global.action.refresh`.
  3. Filter the timeline to Commands, then to Observations.
- **See:**
  - CRM row, Action status: `state.action.ACKNOWLEDGED.label` / `.detail`.
  - CRM row, Observation: `state.observation.OBSERVED_SATISFIED.label`, with method, time, generation and scope.
  - Separate `workflow.timeline.command` and `workflow.timeline.observation` entries.
- **True:**
  - An independent read of the synthetic CRM fixture shows Asha is no longer in "Autumn offers (synthetic)".
  - The observation record has method, generation, observed_at and scope.
  - The observation is not a copy of the acknowledgement.
- **Never:**
  - "Required state observed" while the observation is `NOT_CHECKED`.
  - The observed visual treatment on the Action status column.
- **CX (T12):** tampered, wrong-tenant, wrong-installation or expired commands are rejected. A duplicate command ID causes no second effect. Arbitrary operations, hosts and SQL are rejected.
- **Evidence:**
  - Row screenshot
  - CRM fixture read output
  - Observation JSON
  - CX command tests

### J09 — Current-authority send admission (T14, T15, T16)

- **Actor:** Harness or operator; Karan views.
- **Steps:**
  1. After J07 commits, admit `DEMO-CAMP-01`.
  2. Admit `DEMO-1042`.
  3. Admit `DEMO-1043`.
  4. Karan runs `policies.preview.button` for Asha and marketing.
  5. (CX) Race a withdrawal against an admission.
  6. (CX) Degrade the policy engine.
- **See:**
  - Preview: `policies.preview.notice`, then `policies.preview.result` with `state.decision.BLOCK.label`.
  - Admission decisions, shown through W-TESTLAB assertions or W-EVIDENCE. **There is no dedicated send-record screen (F-018).**
  - Degraded run: `state.decision.INDETERMINATE.label`.
- **True:**
  - There is no simulated send row for `DEMO-CAMP-01`.
  - `DEMO-1042` is decided only by its own condition.
  - `DEMO-1043` is blocked.
  - The race follows the documented linearisation point.
  - A degraded policy engine produces no send.
- **Never:**
  - A send action in the preview.
  - Marketing withdrawal changing the order-service decision.
  - Fail-open behaviour.
- **Evidence:**
  - Send-table query
  - CX concurrency and degradation output
  - Screenshots

### J10 — Response lost → outcome unknown → reconcile (T17)

- **Actor:** The operator sets `APPLY_THEN_TIMEOUT` before the run. Karan reconciles.
- **Steps:**
  1. Open the workflow.
  2. On the simulator row, select `reconcile.button`.
  3. Read `reconcile.dialog.body`.
  4. Select `reconcile.dialog.confirm`.
- **See:**
  - Before:
    - `state.action.EFFECT_UNKNOWN.label` / `.detail` ("Outcome unknown. Reconciliation is required.")
    - `state.observation.NOT_CHECKED.label`
    - `state.workflow.NEEDS_ATTENTION.label`
  - While waiting for the 202: `reconcile.pending`. This is transient button text only.
  - After: a durable reconciliation record from the workflow, shown with `state.reconciliation.*`. The reconciliation values are accepted in 0.2.1; A05 producer and B03 consumer execution/evidence remain pending (F-008/F-019).
    - For RESOLVED: `reconcile.result.observed` plus the linked `state.observation.OBSERVED_SATISFIED.detail`.
    - For INCONCLUSIVE or FAILED: `reconcile.result.unresolved`.
  - The uncertain attempt still shows `Outcome unknown` in history.
- **True:**
  - The action status was `EFFECT_UNKNOWN`, not `FAILED`.
  - Reconciliation used the supported read or receipt path.
  - The simulator call log shows no second restrict command.
  - A separate reconciliation record exists, referencing the uncertain attempt, with start and finish times. RESOLVED requires an observation reference. Retrying reconciliation creates another record.
- **Never:**
  - "Failed" for a timeout.
  - A blind retry.
  - Unknown turned into observed without an observation record.
  - A reconciliation state shown only in the browser with no durable server record.
  - Canonical states invented by the UI or documentation (F-008).
- **Evidence:**
  - Simulator call log
  - Action history
  - Before and after screenshots

### J11 — Acknowledged without effect (T18)

*Mandatory P0 test. The demo script may leave it out of the live narration; its evidence is still required.*

- **Actor:** Operator sets `ACK_WITHOUT_EFFECT`.
- **See:**
  - `state.action.ACKNOWLEDGED.label` next to `state.observation.OBSERVED_NOT_SATISFIED.label`.
  - Workflow `NEEDS_ATTENTION`.
- **True:**
  - The observation is `OBSERVED_NOT_SATISFIED`.
  - The workflow is not `COMPLETED`.
- **Never:** any satisfied treatment on the row.
- **Evidence:**
  - Screenshot
  - Observation JSON
  - Workflow state read-back

### J12 — Known failure and bounded retry (T19)

*Mandatory P0 test. The demo script may leave it out of the live narration; its evidence is still required.*

- **Actor:** Operator sets `UNAVAILABLE`.
- **See:**
  - `state.action.FAILED.label` with its safe reason.
  - `workflow.attempts`.
  - At the limit: `workflow.retries_stopped`.
  - The row appears in W-ATTENTION.
- **True:**
  - Attempts are bounded.
  - Escalation is explicit.
  - The error is persisted.
- **Never:**
  - An endless "Sending".
  - The row disappearing.
- **Evidence:**
  - Attempt history
  - Screenshot

### J13 — Manual obligation, attestation, coverage loss (T20)

- **Actor:** Sam (assignee), Meera and the operator.
- **Steps:**
  1. Open W-ATTENTION and find the ledger row.
  2. As Meera, confirm there is no `attest.button`.
  3. As Sam, open `attest.title`. Try to save without the checkbox. Then save properly.
  4. The operator removes the CRM read permission, then triggers a new observation.
- **See:**
  - `state.action.MANUAL_REQUIRED.label` / `.detail`.
  - `state.observation.UNVERIFIABLE.label`.
  - After saving: `attest.success`, `attest.record_line` and `attest.record_note`. The Observation cell is unchanged.
  - The CRM system shows `state.coverage.coverage_reduced.label`, and new observations show `UNVERIFIABLE`.
- **True:**
  - The attestation is stored with its own type, actor and time.
  - The observation is unchanged.
  - While the ledger obligation is unresolved under the approved criteria, the workflow is `NEEDS_ATTENTION`.
  - After attestation, the workflow state must follow the criterion Work accepts (F-013). A COMPLETED workflow must show `state.workflow.COMPLETED.manual_note`.
  - A server result that shows the workflow as observed or completed against the approved criteria is recorded as a finding, not accepted.
- **Never:**
  - A manual record shown as an observation.
  - An optimistic pass on an unreadable target.
  - Attestation text describing the system as verified or observed.
- **Evidence:**
  - Attestation JSON
  - Coverage record
  - Screenshots

### J14 — Old grant replay and fresh re-consent (T10)

- **Actor:** Harness (CX) and Asha.
- **Steps:**
  1. (CX) Replay the earlier grant event.
  2. Asha refreshes.
  3. Asha selects `choices.agree_again`, reads the notice and selects `grant.button`.
  4. (CX) A stale withdrawal worker targets the new generation.
- **See:**
  - After the replay: still `state.consent.WITHDRAWN.portal`.
  - After re-consent: a new receipt and `state.consent.GRANTED.portal`.
  - The staff timeline may show `workflow.timeline.stale_event` (F-008).
- **True:**
  - The replay does not lower the epoch or create a grant.
  - Re-consent is at a higher epoch.
  - The stale cleanup is rejected at the CRM mutation by the generation check.
- **Never:** marketing re-enabled by the replay.
- **Evidence:**
  - Consent event log
  - CX output
  - Screenshots

### J15 — Truthful dashboard and unresolved list (T21)

- **Actor:** Karan and Meera.
- **Steps:**
  1. With the J10–J13 states present, open W-OVERVIEW.
  2. Compare every card with the API.
  3. Throttle the overview request, then fail it.
  4. Open W-ATTENTION.
- **See:**
  - `overview.subheading`.
  - Separate cards for the counts the accepted contract provides. Accepted 0.2.1 defines `overview.card.unknown`, `.failed`, `.manual` and `.unverified` alongside the workflow states.
  - `.unverifiable`, `.not_satisfied` and `.stale` appear only if the accepted contract adds those counts (F-007).
  - While loading: `global.loading.count`, with no digits.
  - On failure: `global.count.unavailable` with `global.action.retry`.
- **True:** each card equals the API count, which equals a direct database count (CX).
- **Never:**
  - `0` shown while loading or on failure.
  - Percentages or scores.
  - Fixed display numbers.
- **Evidence:**
  - Screenshot next to the API JSON
  - CX count query

### J16 — Evidence view and local export (T21, T22)

- **Actor:** Karan, Meera and Bo.
- **Steps:**
  1. Open W-EVIDENCE for the J07 workflow.
  2. Compare its references with W-WORKFLOW-DETAIL.
  3. Select `evidence.export`.
  4. Repeat as Meera.
  5. Bo tries the export URL.
- **See:**
  - All `evidence.section.*` headings, including `.gaps`.
  - `evidence.export.helper`.
  - `evidence.integrity_note`, if a digest is shown.
  - `evidence.export.success`.
- **True:**
  - The file contains the receipt, versions, plan, commands, observations, attestations, tests and unresolved coverage, matching the persisted records.
  - An audit event is written.
  - Bo is refused.
  - No outbound request is made (see J20).
- **Never:**
  - Unknown or manual items omitted.
  - "Certificate" or "compliant" wording.
- **Evidence:**
  - Exported synthetic file
  - Audit record
  - Denial response

### J17 — Test Lab: healthy → broken → healthy (T23, T24)

- **Actor:** Karan.
- **Steps:**
  1. In W-TESTLAB, pick `testlab.scenario.MARKETING_WITHDRAWAL_HEALTHY` in `testlab.field.scenario` and select `testlab.run`.
  2. Run `testlab.scenario.MARKETING_WITHDRAWAL_BROKEN_CONTROL`.
  3. Run the healthy scenario again.
  4. Open each run's assertions.
- **See:**
  - `testlab.run_header` on every run.
  - Result badges from `state.test.*`.
  - `testlab.broken_fixture_note`, only where the run record's `expected_fault_detection` is true (accepted 0.2.1 field; A06/B04 result evidence pending, F-010).
  - The failing assertion's actual observed violation.
- **True:**
  - Results are persisted per assertion.
  - Each result comes from real policy, boundary and target interaction.
  - Code review confirms no result is chosen by the selector.
  - Earlier runs are retained.
  - The broken run's FAIL assertion is recorded as FAIL, with `expected_fault_detection`. It is not converted to PASS in the evidence index.
- **Never:**
  - The UI choosing, editing or recolouring a result.
  - A free-text scenario field.
- **Evidence:**
  - Three run records with build and fixture
  - Artifacts
  - Screenshots

### J18 — Worker restart recovery (T11)

- **Actor:** Operator, following a Codex procedure (not yet supplied; F-020), with human approval.
- **Steps:**
  1. Accept a withdrawal.
  2. Stop the worker before dispatch completes.
  3. Restart the worker.
  4. Open the workflow.
- **See:**
  - The same workflow reference continuing.
  - No duplicate action rows.
- **True:**
  - The workflow identity is stable.
  - A duplicate dispatch attaches to the existing workflow.
  - The CRM receives one logical effect.
- **Evidence:**
  - Operator transcript with exit codes
  - Workflow history
  - CRM call log

### J19 — Quarantined target-only restore (T25)

- **Actor:** Operator, following a Codex procedure with human approval; Karan views.
- **See:**
  - The restored CRM system in its quarantined state. The wording `systems.quarantine` is unresolved, and no enum is introduced (F-008).
  - Marketing stays blocked.
- **True:**
  - Restored old membership does not re-enable marketing.
  - Reconciliation against the current withdrawal happens before any admission.
- **Say:** "Target-only synthetic restore; not control-plane backup recovery or disaster recovery."
- **Evidence:**
  - Operator transcript
  - Reconciliation record
  - Send table

### J20 — No runtime vendor or model egress (T26)

- **Actor:** Operator, with outbound internet blocked by the Codex-documented method.
- **Steps:**
  1. Run J06–J09 and J16.
  2. Capture browser requests with Playwright.
  3. Capture host/container traffic.
- **See:** fully rendered pages with local fonts and icons.
- **True:** no requests to non-local hosts during the tested interval.
- **Never:** CDN assets, analytics, crash reporting or model API calls.
- **Evidence:**
  - Browser request log
  - Capture summary
  - Interval start and end times
- **Limit:** the result covers only the tested interval.

### J21 — Screen states and accessibility sweep (T29, T27 session parts)

- **Actor:** Codex.
- **Checks, for every screen in UX_BRIEF §4:**
  - **Empty:** the screen's `*.empty` copy.
  - **Loading:** `global.loading.*`.
  - **Errors:** `error.staff.*` and `error.portal.*` for 400, 401, 403, 404, 409, 429 and 503.
  - **Network change:** `*.network_change`.
  - **Permissions:** the `permission.*` copy for each role.
  - **Keyboard:** full keyboard paths for grant, withdraw, publish, reconcile, attest and run. Focus lands on the result heading, and the polite live region announces the result.
  - **Layout:** 200% zoom; 320 px for the Privacy Centre.
  - **CSRF:** a bad origin or CSRF request is refused, and the session error is shown.
- **Never:**
  - Digits while loading.
  - Stack traces.
  - Colour-only status.
  - "Nothing changed" after a timeout.
- **Evidence:**
  - Playwright report
  - Accessibility scan output
  - Screenshots for each state
- **Reporting:** mocked-state results are reported separately from integrated-flow results.

### J22 — Reset and fault isolation (T28)

- **Actor:** Operator and Meera.
- **See:**
  - Fault and reset controls, if present, appear only under W-TESTLAB in the private synthetic profile.
  - Meera has no access to them.
  - Reset asks for the named namespace and an explicit confirmation.
- **True:**
  - Reset rejects a non-demo target, running jobs and missing authority.
  - Evidence is exported before any reset.
  - Parallel lane stores are untouched.
- **Evidence:**
  - CX output
  - Operator transcript

### J23 — Frozen-candidate rehearsal and claims (T30)

- **Actor:** Human presenter; Work reviews.
- **Steps:**
  1. Rehearse `DEMO_SCRIPT.md` twice on the frozen candidate, from the documented state.
  2. Check every spoken claim against `CLAIMS_REGISTER.md` and `EVIDENCE_INDEX.json`.
  3. Check every recording's label.
- **True:**
  - The on-screen build equals the manifest.
  - Every claim has evidence, or the claim is removed.
  - No Version 2 inference is advertised.
  - If the candidate changed, the relevant steps were rerun.
- **Evidence:**
  - Two rehearsal logs, each with times and issues
  - Labelled recordings
  - Completed claims checklist
- **Current state:** no rehearsal has taken place.

### J24–J27 — P1 slices (T31–T34)

Define these only after Work records a P1 selection and Codex extends the contract. Until then, none of them appears in navigation, and they are not gates.

Each P1 test carries this constraint from ACCEPTANCE.md:

| Test | Constraint |
|---|---|
| T31 | Coordination only |
| T32 | No destructive action |
| T33 | Development licence only |
| T34 | Non-model and no egress |

## r4 route, presentation and fallback cross-check

Actor, preconditions, steps, expected facts, test IDs and required artifacts remain in each journey above. This table completes the operator/presenter binding; all application UI routes remain required-but-unimplemented at the inspected base. The exact API interfaces and their acceptance state are in UX_BRIEF's r4 table. Never substitute the offline pack for a live screen.

| Journey | Supported producer action / dependency | Presenter text | Honest fallback |
|---|---|---|---|
| J00 | Operator profile/preflight/build; A07 package absent | “This is the identified local synthetic build.” Only say this with its manifest. | Show source identity and say no frozen candidate. |
| J01 | A01 auth clients/session; B01 screen | “Staff authority requires the actual authenticated session and MFA.” | Record missing browser flow; no role-switch simulation. |
| J02–J03 | Scoped auth/resource endpoints; B01/B02 denial tests | “This identity cannot access that scope.” | Show actual denied response only; missing trace stays NOT_RUN. |
| J04–J05 | A02 configuration, exact reviewer reauth/publish and mappings | “Another authorised reviewer approves this exact version.” | Explain candidate review gap; do not play a successful mock. |
| J06–J07 | Own choices/grant/withdraw/receipt/history; B02 | “The receipt records acceptance; propagation is separate.” | Preserve uncertain outcome and original request; no new key/reloaded epoch retry. |
| J08 | A03 workflow/agent and independent read | “The target change and the separate read are different evidence.” | State source/report scope; absent current browser evidence remains absent. |
| J09 | Actual machine admission and Test Lab evidence; A04/B04 pending | “This result concerns this supported send point.” | Preview is not send evidence; show missing gate. |
| J10–J12 | A05 reconcile/faults; B03/B04 pending | “Unknown, acknowledged and known failure remain distinct.” | Keep original failure/ERROR and partial assertions; no complete PASS. |
| J13 | A05 manual/coverage; B03 pending | “This is a person's statement, not an independent observation.” | Leave required unresolved obligations visible. |
| J14 | A02 replay; A03/A06 current target-generation controls | “An old event cannot create new authority.” | No inferred success without recorded race/replay assertions. |
| J15–J16 | A05 overview/evidence/export; B03 pending | “Counts and export reflect scoped stored facts.” | Mark unavailable, never zero or fabricated download. |
| J17 | A06 Test Lab healthy/broken/healthy; B04 | “This deliberately broken fixture produces an actual failed assertion.” | Keep FAIL/ERROR and inspect partial assertions; no relabelled healthy pass. |
| J18–J19 | A03 worker controls; A06 quarantined restore procedure pending | “Recovery is bounded to this tested profile and target.” | Do not run ad hoc interruption/reset/restore. |
| J20–J22 | A06 egress/hygiene/reset and B06 accessibility | “These are measured checks on this candidate.” | State NOT_RUN; a document browser render proves no application property. |
| J23 | A07/B06 exact build plus two qualifying T30 rehearsals | “These two distinct runs used the same documented candidate state.” | Show zero qualifying runs until real logs pass intake. |
| J24–J27 | Four unpromoted P1 definitions | “These remain outside this demo's selected scope.” | No invented implementation or promotion. |

CC-E2E is retained as the historical executor code for compatibility; its current owner is Codex. C00 documents have no B00 acceptance dependency. Codex's consumer cross-check is review, not a requirement that UI implementation be complete before C00 can be accepted.
