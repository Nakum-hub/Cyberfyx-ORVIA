# ORVIA prototype: UX brief

**Owner:** GPT Work, successor to Cowork (C00) · **Status:** REVISED_FOR_REVIEW · **Revision:** c00-r4-completion, 16 Sep 2026 UTC · **Documentation base:** `9bb8f2900909997f63db864eeea1211523aa5819`

**Revision history:**

- c00-r2 was written against `96b8bd7` (planning documents only).
- c00-r3 refreshes this brief against `e839b1a` and the verified master. It keeps the r2 screen design.

**What this brief is.** A UX and copy handoff. It is not evidence that any screen exists: at the inspected base, workspace/Privacy Centre UI routes remain absent; A00–A05 API/auth/consent/worker/agent sources and reports exist separately. Journeys and evidence requirements are in [`docs/ux/ACCEPTANCE_JOURNEYS.md`](../ux/ACCEPTANCE_JOURNEYS.md).

**Exact text lives in [`docs/ux/UI_COPY.json`](../ux/UI_COPY.json).**

- This brief refers to copy by ID (for example `state.action.ACKNOWLEDGED.detail`).
- Tables marked *generated* are copied from that file by `docs/reviews/cowork/tools/build_pack.py`. **Edit the JSON, not the generated tables.**
- `python3 docs/reviews/cowork/tools/build_pack.py --check` reports stale generated sections.

## 0. Sources and authority

### Inputs read at the r4 base

Current AGENTS/state/ownership, execution plan, accepted CONTRACT 0.2.1, canonical tasks/acceptance, W00/A01 acceptance and A02/A03/A04/A05/correction handoffs were inspected. The executable 0.4.0 transport manifest is PENDING_WORK_REVIEW; signed commands remain 0.3.0. The merged PR #16 correction is present; this document pass does not accept it.

The repository master revision 1.3 was independently rehashed (850752 bytes, SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`). The genuine v1 kit and 33-module register were recovered and verified. Their older UX/demo/checklist scaffold does not replace the useful r3 work. See `docs/reviews/cowork/artifacts/r4/source-intake.json`.

### How conflicts are resolved

This replaces the r2 rule "the stricter wording wins", which is withdrawn.

1. **Product and security scope** come from the approved master's current numbered sections. Historical appendices and older kits do not override them.
2. **Demo depth and prototype adaptations** come from the execution plan and the decisions Work has recorded (ADR-001, W00 review). These apply only within their stated scope.
3. **Field and enum bindings** come from the executable contract **once Work has accepted it**.
   - Accepted 0.2.1 governs its exact fields. The 0.3.0 route additions, 0.4.0 transport changes and implementation review remain pending; presence is not approval.
   - An accepted executable contract governs implemented bindings. It does not silently override an approved product or security requirement.
4. **Work successor documents** apply these sources. They do not add requirements, enums or endpoints.
5. **Conflicts require a scoped Work decision.** The item stays UNRESOLVED in `UI_COPY.json` with a finding in `docs/reviews/cowork/FINDINGS.csv`, and it is routed:
   - to **Work** for semantics and shared state;
   - to the **human** for source authority and access.

   The matching kit was compared in r4; its scaffold is retained as provenance, not substituted for this specification (F-005 resolved).

## 1. Design rules

1. **Two readings, never merged.** Every action row shows *Action status* (what was sent and what the system replied) and *Observation* (what ORVIA read separately afterwards) in separate columns.
   - An acknowledgement never uses the "observed" visual treatment.
   - An observation is never created from an acknowledgement, and an acknowledgement is never created from a read.
2. **No rounding up.**
   - `EFFECT_UNKNOWN`, `MANUAL_REQUIRED`, `UNVERIFIABLE` and `STALE` stay visible until the server changes them.
   - The browser never changes a status on its own.
3. **Server numbers only.**
   - While loading, show no digits. On failure, show `global.count.unavailable`, never `0`.
   - No percentages, scores, trend arrows or "compliance" wording.
4. **Colour is never the only cue.** Every badge is text plus an icon shape. Text meets WCAG 2.2 AA contrast; icons meet 3:1.
5. **Scope is always visible.**
   - The workspace header shows organisation, environment, role and build.
   - The Privacy Centre shows which organisation the person is dealing with.
6. **Synthetic is labelled.** `global.banner.synthetic` appears on every workspace page, and `global.banner.synthetic_portal` on every Privacy Centre page. Neither can be dismissed.
7. **Receipts are historical.**
   - A receipt shows what was recorded at acceptance.
   - Current progress is shown separately, with its own "checked at" time.
   - An old receipt is never rewritten to look like current propagation.
8. **Affirmative grant, easy withdrawal.**
   - Grant: show the notice, then one explicit button (`grant.button`). Nothing is pre-selected.
   - Withdrawal: one button (`choices.withdraw.button`), with the explanation shown **before** the button. There is no confirmation dialog and no new notice to accept. Withdrawing takes no more effort than agreeing.
   - An unconfirmed write is never repeated as a *new* request. Work specifies retention of the original request (Idempotency-Key, exact payload and `expected_epoch`) across authorised recovery. The safe memory/reload boundary and remaining durable-recovery dependency are defined in the r4 recovery decision below. A fresh choice is a separate operation, available only after the first request is settled or its conflict has been handled (F-024).
   - No copy claims that "nothing changed" unless an accepted contract gives an explicit no-commit signal and tests prove it. `error.portal.503_not_saved` is conditional and must not be displayed until then.
9. **No dark patterns.**
   - No toggles that look instant.
   - No "Are you sure?" loops, guilt wording or hidden options.
   - Withdraw and agree buttons are equally visible.
10. **Hiding is not security.**
    - Items a role cannot read are hidden.
    - Read-only roles see content without mutation controls.
    - Every route still relies on the server's 401/403/404.
13. **Manual work stays visible.**
    - While required manual work or required observations are unresolved under the approved criteria, the workflow is not presented as observed or completed.
    - A person's attestation is never shown as an independent observation.
    - Under accepted 0.2.1, when the declared criterion permits attributed manual completion, `state.workflow.COMPLETED.manual_note` is mandatory (F-013).
    - A server response that contradicts the approved criteria is a finding, not a new requirement.
14. **Authority is purpose-specific.** Decision copy describes the evaluated purpose's own authority. Marketing consent is never shown as a prerequisite for `order_service_demo`, and no legal exemption is claimed (F-025).
11. **Times.** Store UTC; show `global.time.display` (IST with the zone label). The UTC value is available on hover and on keyboard focus (`global.time.tooltip_utc`).
12. **Local only.**
    - No remote fonts, icons, analytics or error reporting (AGENTS.md).
    - No AI assistance anywhere in the interface.

## 2. Roles and identities

| Role (contract) | Product meaning shown to users | Can do in this prototype (subject to A00/A01) | Must not imply |
|---|---|---|---|
| `ORG_SUPER_ADMIN` | `global.account.role.ORG_SUPER_ADMIN` | Administer the organisation installation; act as the **distinct reviewer** who publishes a policy version | Cyberfyx vendor or root access |
| `ORG_ADMIN` | `global.account.role.ORG_ADMIN` | Create purposes, notices, draft policies, systems and demo principals | Publishing its own draft |
| `MEMBER` | `global.account.role.MEMBER` | Act on assigned tasks (e.g. manual attestation) | Configuration rights |
| `AUDITOR` | `global.account.role.AUDITOR` | Read everything in scope | Any mutation |
| `DATA_PRINCIPAL` | Not shown as a role; the person simply uses the Privacy Centre | Own choices and own receipts only | Seeing staff detail or another person's data |

**Staff and principal sessions are separate.** The contract defines no vendor identity, so the interface must never offer a "vendor", "support login" or role-switch control. Role-management screens are **not** part of this prototype; the account menu only *displays* the server-reported role.

## 3. Navigation

### 3.1 Workspace (`/workspace/*`, staff session)

**Header:** `ORVIA` · `global.header.scope` · `global.header.build` (or `global.header.build_missing`) · account menu (role description, MFA status, `global.account.sign_out`).

| Group | Item (copy ID) | Screen | Hidden when |
|---|---|---|---|
| `nav.workspace.group.monitor` | `nav.workspace.overview` | W-OVERVIEW | never, for staff |
| | `nav.workspace.attention` | W-ATTENTION | never, for staff |
| | `nav.workspace.workflows` | W-WORKFLOWS / W-WORKFLOW-DETAIL | never, for staff |
| `nav.workspace.group.configure` | `nav.workspace.purposes` | W-PURPOSES | never (MEMBER sees view-only) |
| | `nav.workspace.notices` | W-NOTICES | same |
| | `nav.workspace.policies` | W-POLICIES | same |
| | `nav.workspace.systems` | W-SYSTEMS | same |
| | `nav.workspace.principals` | W-PRINCIPALS | MEMBER (no directory access proposed; A01 decides) |
| `nav.workspace.group.prove` | `nav.workspace.evidence` | W-EVIDENCE | never, for staff |
| | `nav.workspace.testlab` | W-TESTLAB | never (start-run control per capability) |
| `nav.workspace.group.about` | `nav.workspace.capabilities` | W-CAPABILITIES | never, for staff |

**Routes.** Preserve the established `/workspace/*` and `/privacy/*` screen/navigation specification. Codex B00 owns concrete UI routes. No implemented UI route is claimed in this base. Bind API calls only to the generated client and the exact interface table below; an absent screen has an explicit B-task dependency. The earlier external Claude plan is retired from active authority.

**Deliberately absent:**
- A setup wizard. Bootstrap is a protected CLI (EXECUTION_PLAN §2).
- Settings, integrations marketplace, reports, anything AI.
- Rights, retention, licence or help pages (P1 only, after a contract extension).
- Empty pages for the wider programme; those appear only as rows in W-CAPABILITIES.

**Fault and reset controls,** if Codex exposes any in the private synthetic profile, belong inside W-TESTLAB under a "Test fixtures" section. They are never shown outside that profile (CONTRACT §9).

### 3.2 Privacy Centre (`/privacy/*`, principal session)

**Header:** `signin.portal.heading` organisation name · `global.banner.synthetic_portal` · `nav.portal.choices` · `nav.portal.receipts` · `global.account.sign_out`.

- No search, no person picker, and no route parameter that selects a person.
- No links into the workspace, and none back.

## 4. Screen specifications

Each spec covers the same fields: actor, goal, prerequisite, visible information, labels and actions, permitted behaviour, destination and acceptance evidence. **Implementation status for all: NOT_IMPLEMENTED at `1e23bbe3b31b4f1d50f096bdcc26bf105d1b1cac`** (scoped source inspection EV-SRC-007; not inferred from missing tests).

### W-SIGNIN — staff sign-in and MFA

| Field | Spec |
|---|---|
| Actor | Any staff identity created by protected bootstrap or seed |
| Goal | Establish a scoped staff session. Privileged roles use MFA. |
| Prerequisite | Organisation bootstrapped (CLI). Credentials generated per install and held by the human operator. |
| Visible | `signin.staff.heading`, identifier/password fields, MFA step `signin.staff.mfa.*`, `global.banner.synthetic` |
| Actions | `signin.staff.button`, `signin.staff.mfa.button` |
| Behaviour | Uses the auth library's mounted routes (CONTRACT §8). Failure text is generic (`signin.staff.failed`). No "demo login as…" shortcut, default password or role switcher. |
| Destination | W-OVERVIEW |
| Evidence | J01 (T02) |
| Unresolved | Visible labels and native protocol binding are specified and accepted as Work display decisions in `docs/reviews/work/C00-copy-source-review.md`. Use `staffAuthClient.signIn.email`, then enrollment (`twoFactor.enable`, `twoFactor.verifyTotp`) or the enrolled challenge indicated by `twoFactorRedirect`. A successful library session alone does not grant business authority. B01 implements/tests these flows (F-023/F-011). |

### W-OVERVIEW — core dashboard

| Field | Spec |
|---|---|
| Actor | All staff roles |
| Goal | See, at a glance, what is unresolved and which build this is |
| Prerequisite | Staff session |
| Visible | `overview.heading`, `overview.subheading`; cards `overview.card.*` with server counts; `overview.build_panel` |
| Actions | Each card links to W-WORKFLOWS or W-ATTENTION. Do not invent a server filter parameter; label any loaded-page filtering with its limited scope. `global.action.retry` on a failed card. |
| Behaviour | Counts come from `GET /api/v1/admin/overview`. Loading shows `global.loading.count`; failure shows `global.count.unavailable`. No totals are calculated in the browser. |
| Destination | W-ATTENTION, W-WORKFLOWS, W-TESTLAB (latest run) |
| Empty | `overview.empty` |
| Evidence | J00, J15 (T01, T21, T30) |
| Unresolved | Accepted 0.2.1 defines `Overview.counts` = accepted, running, needs_attention, completed, effect_unknown, manual_required, failed, unverified. Work defines `unverified` as obligations requiring a current scoped observation that do not satisfy the completion predicate, including stale scope or stale/unavailable reads. First four cards count workflows; remaining four count obligations and may overlap. Show the unit, no sum/percentage. Unknown/failed/manual counts are execution-state counts, including obligations completed by a separate criterion; do not describe them as an outstanding-work total. Suppress the unsupported unverifiable/not-satisfied/stale cards. A05 source exists; T21 count parity and B03 remain open (F-007). The development-unqualified build value is not a frozen candidate (F-011). |

### W-ATTENTION — unresolved obligations

| Field | Spec |
|---|---|
| Actor | All staff roles. MEMBER acts only on its assigned rows. |
| Goal | Find every required action that is unknown, failed, manual, not observed or unverifiable, and who owns it |
| Prerequisite | Staff session |
| Visible | `attention.heading`, `attention.subheading`, columns `attention.col.*`; status badges from §5 |
| Actions | Row → W-WORKFLOW-DETAIL (anchored to the action) |
| Behaviour | Data from `GET /api/v1/admin/failures`. Use the server cursor order, not an unsupported oldest-first promise. Continue while next_cursor is non-null even if a page is empty; it is a filtered obligations scan. Only a current server response changes a row. Retain selection/focus during refresh. FailureList supplies obligations without owner/system/workflow navigation fields: associate only exact obligation IDs with authorized loaded workflow detail, or show unavailable detail and no guessed link. F-007 tracks any additional versioned producer projection needed. |
| Empty | `attention.empty`. The scope caveat is always shown. |
| Evidence | J12, J13, J15 (T19, T20, T21) |

### W-WORKFLOWS — workflow list

| Field | Spec |
|---|---|
| Actor | All staff roles |
| Goal | Find a workflow by status, purpose or time |
| Visible | `workflows.heading`, columns `workflows.col.*`, workflow badges |
| Actions | Labelled filter of the loaded page only, unless a reviewed server filter is added; row → W-WORKFLOW-DETAIL |
| Behaviour | Server pagination (`GET /api/v1/admin/workflows`). No per-workflow unresolved count is supplied; display the state and actual obligation rows, not a fabricated total. |
| Empty | `workflows.empty` |
| Evidence | J08, J15 |

### W-WORKFLOW-DETAIL — plan, actions, observations, timeline

| Field | Spec |
|---|---|
| Actor | All staff roles (reconcile and attest per capability) |
| Goal | Understand exactly what was asked, sent, acknowledged, observed, unknown or manual for one workflow |
| Prerequisite | Workflow exists in the caller's scope; otherwise `error.staff.404` |
| Visible | `workflow.heading` + workflow badge + `state.workflow.*.detail` (+ `.summary` or `.scope`). Summary labels `workflow.summary.*` (principal shown as an opaque reference only). `workflow.explainer`. Actions table `workflow.col.*`. Timeline with `workflow.timeline.filter.*`. |
| Actions | `reconcile.button` on `EFFECT_UNKNOWN` rows (with `reconcile.dialog.*`). `attest.button` on `MANUAL_REQUIRED` rows, for the assignee only. |
| Behaviour | Reconcile calls `POST /admin/actions/{id}/reconcile`, whose accepted 0.2.1 response is 202 `AcceptedOperation` (A05 producer source exists; acceptance and B03 tests remain). While waiting for that response, show the transient `reconcile.pending`. Afterwards, show the durable reconciliation record from the workflow (`state.reconciliation.*`) and the resulting observation, if any. The uncertain attempt remains `Outcome unknown` in history. Attest calls `POST /admin/manual-tasks/{id}/attest` (statement plus at least one evidence reference in the accepted 0.2.1 shape). The attestation appears as `attest.record_line` + `attest.record_note`, and the Observation cell does not change. Optional polling (Accepted 0.2.1 defines 2 s, backing off to 30 s) updates a polite live region and never moves focus. Writes are never retried automatically. |
| Destination | W-EVIDENCE for this workflow |
| Evidence | J07–J14, J18 (T08–T20, T11) |
| Reconciliation | ADR-001 requires a durable, typed reconciliation attempt. Accepted 0.2.1 defines a separate `Reconciliation` record (`PENDING → RECONCILING → RESOLVED \| INCONCLUSIVE \| FAILED`), while the uncertain attempt stays `EFFECT_UNKNOWN`. Show that record with `state.reconciliation.*`. `reconcile.pending` is only transient button text and never replaces the durable record. Work introduces no API enum values. |
| Unresolved | Reconciliation semantics accepted; remaining "retry permitted", stale-event, quarantine and coverage-loss representations plus consumer implementation (F-008, F-013) |

**Example action rows** (illustrative layout only; no result is implied):

| System | Operation | Action status | Observation | Next step |
|---|---|---|---|---|
| Aster CRM (synthetic) | Restrict scoped marketing membership | Acknowledged | Required state observed · independent restriction read · {observed_at} · generation {generation} | — |
| Aster Messaging Simulator | Restrict marketing | Outcome unknown | Not observed | Reconcile |
| Aster Loyalty Ledger (no API) | — | Manual action required | Cannot be observed | Assigned to {owner_name} |

### W-PURPOSES / W-NOTICES — configuration

| Field | Spec |
|---|---|
| Actor | ORG_ADMIN or ORG_SUPER_ADMIN create; AUDITOR and MEMBER read-only (`permission.read_only_auditor` / `permission.view_only_member`) |
| Goal | Define `promotional_marketing` and `order_service_demo` separately; write the notice a person reads |
| Visible | `purposes.*`, `notices.*`; version and publication state per row |
| Actions | `purposes.create`, `purposes.save`, `notices.create`, `notices.save`. Suppress `notices.publish`: distinct-reviewer publication of the exact policy publishes its referenced notice. No separate notice action is designed (F-017 consumer check). |
| Behaviour | Published versions show `purposes.published_fixed` / `notices.grant_link_note` and no edit control. Validation errors are shown inline (`error.staff.400`). |
| Evidence | J05 (T06) |

### W-POLICIES — draft, distinct-reviewer publish, decision preview

| Field | Spec |
|---|---|
| Actor | ORG_ADMIN author drafts; a **different** authorised reviewer (ORG_SUPER_ADMIN in the demo) publishes. AUDITOR reads. |
| Goal | Publish one exact, immutable policy version with an attributable approval |
| Prerequisite | Draft exists; reviewer ≠ author; MFA set up |
| Visible | Draft/published badges (`policies.status.*`, unresolved F-017); review panel `policies.review.*` with digest, author and diff if the server provides one |
| Actions | `policies.create`, `policies.review.approve` (requires ticking `policies.review.checkbox` and `permission.reauth_required`), `policies.preview.button` |
| Behaviour | Denials: `policies.deny.self`, `policies.deny.digest` (409), `policies.deny.capability` (403). Success: `policies.published`. The preview panel always shows `policies.preview.notice` and never offers a send action. |
| Evidence | J04, J05, J09 (T05, T06, T14–T16) |

### W-SYSTEMS — systems and control map

| Field | Spec |
|---|---|
| Actor | ORG_ADMIN or ORG_SUPER_ADMIN add and check; others read |
| Goal | See which declared systems each purpose reaches, and how far ORVIA can act on and observe each |
| Visible | `systems.declared_note`; for each system: name, type, mapped purposes, coverage badge `state.coverage.*`, last check result |
| Actions | `systems.add` (type chosen from the allowlist only; no URL or credential fields), `systems.check` |
| Behaviour | The relationship view is a list/detail panel; no animated graph is needed. Coverage labels are derived from the system's declared capabilities: Accepted 0.2.1 defines connector `SYNTHETIC_CRM` \| `ORVIA_REST_SIMULATOR` \| `LEGACY_MANUAL` with `supports_restrict` and `supports_read`. The send gateway is **not** a configured system; explain it as the enforcement point in text only (F-018). The permission-loss label `state.coverage.coverage_reduced` and the quarantine display `systems.quarantine` are **unresolved** (F-008). |
| Evidence | J05, J13, J19 (T06, T20, T25) |

### W-PRINCIPALS — demo principals

| Field | Spec |
|---|---|
| Actor | ORG_ADMIN/ORG_SUPER_ADMIN create; AUDITOR reads |
| Goal | Create the fictional principals needed for the scenario and isolation checks |
| Visible | `principals.*`; opaque reference, display name, organisation |
| Behaviour | Not a public lookup. Never shows another tenant. |
| Evidence | J02, J03 (T03, T04) |

### W-EVIDENCE — evidence view and local export

| Field | Spec |
|---|---|
| Actor | All staff roles (export per capability) |
| Goal | Review and export exactly what happened for one workflow, including gaps |
| Visible | `evidence.heading`; sections `evidence.section.*`, always including `evidence.section.gaps`; `evidence.integrity_note` when a digest is shown; overall workflow badge |
| Actions | `evidence.export` (`evidence.export.helper`) |
| Behaviour | Download from `GET /admin/evidence/{workflow_id}/export`; no third-party renderer. Success: `evidence.export.success`. Another tenant gets `error.staff.404`. |
| Empty | `evidence.empty`; `evidence.gaps.empty` |
| Evidence | J16, J02 (T21, T22) |

### W-TESTLAB — regression runs

| Field | Spec |
|---|---|
| Actor | Staff with the test-run capability start runs; others read |
| Goal | Run allowlisted synthetic scenarios and read assertion-level results for this build |
| Visible | `testlab.heading`, `testlab.subheading`; run list with `testlab.run_header`; assertions; test badges; `testlab.broken_fixture_note` **only when the run record declares the test-only broken fixture** (F-010) |
| Actions | `testlab.field.scenario`, offering only the server allowlist and no free text. Accepted 0.2.1 defines three scenarios, labelled `testlab.scenario.*`. Then `testlab.run`. |
| Behaviour | The UI never selects, edits or reinterprets a result. A run with `expected_fault_detection` keeps its recorded assertion results, and a FAIL there is not shown as PASS. Earlier runs are never overwritten. |
| Empty | `testlab.empty` |
| Evidence | J17 (T23, T24) |

### W-CAPABILITIES — read-only register

| Field | Spec |
|---|---|
| Actor | All staff roles |
| Goal | See every programme module with target release/depth separate from implementation and test status |
| Visible | Columns `capabilities.col.*`; badges `capabilities.deferred_v2` (the seven learned-AI modules only) and `capabilities.v1_programme` |
| Behaviour | The programme section uses the genuine 33-module register with its original IDs/names, V1/V2, depth and implementation/test status. A separate runtime connector section consumes the implemented `GET /api/v1/admin/capabilities`; this endpoint does not return module rows. Codex supplies the compatible register consumer/import (F-029). Missing register data displays `capabilities.unavailable`, never fabricated rows or binary module completion. |
| Evidence | J23 (T30) |

### P-SIGNIN — Privacy Centre sign-in

| Field | Spec |
|---|---|
| Actor | Data principal (fictional) |
| Goal | Establish a principal session separate from any staff session |
| Visible | `signin.portal.heading`, `global.banner.synthetic_portal` |
| Behaviour | Auth-library routes. A staff session here gets `permission.staff_in_portal`. |
| Evidence | J03 (T04) |

### P-CHOICES — your choices

| Field | Spec |
|---|---|
| Actor | Data principal |
| Goal | See and change each purpose choice separately |
| Visible | `choices.heading`, `choices.intro`; one card per purpose returned by `GET /portal/me/consents`, showing its `state.consent.*.portal` line and the notice version |
| Actions | `NOT_GIVEN` → `choices.review_and_agree` (to P-GRANT). `GRANTED` → `choices.withdraw.explainer` shown above `choices.withdraw.button`. `WITHDRAWN` → `choices.agree_again` (to P-GRANT; a new interaction). |
| Behaviour | Withdraw sends `expected_epoch`, `interaction_id` and an `Idempotency-Key` created once for this logical request. Work specifies exact-request recovery with the safe retention/reload rules below; implementation remains F-024. While waiting, show `choices.saving` with the button disabled, which blocks double submission.<br>**Outcomes:**<br>• Timeout or network loss: `error.portal.network_change`, then the `recovery.portal.*` panel. **Retry the same request** re-sends the identical key and payload, and **Check my current choice** fetches current data in-app while retaining the original pending request. A full page reload is not recovery.<br>• The retry returns the original receipt: show `recovery.portal.resolved_saved`.<br>• `EPOCH_CONFLICT`: show `error.portal.409_epoch` with its action. Only after the authenticated same-principal current-choice read succeeds, show `error.portal.409_epoch.reloaded`.<br>• `IDEMPOTENCY_CONFLICT`: `error.portal.409_idempotency`.<br>A new choice (new key, current epoch) is offered only after a matching original receipt or a handled epoch conflict plus successful authenticated current-choice read. An idempotency mismatch or unchanged read alone does not authorize a new request. **Never** show "nothing changed" after a timeout or a generic 503. The browser never retries a write automatically (accepted 0.2.1 semantics). Client retention and recovery are unimplemented (F-024). The producer returns only promotional_marketing choices. Suppress the optional service card; order_service_demo is shown in the separate staff decision demonstration (F-017). |
| Destination | P-RECEIPT |
| Empty | `choices.empty` |
| Evidence | J06, J07, J14 (T07–T10, T15) |

### P-GRANT — read notice and agree

| Field | Spec |
|---|---|
| Actor | Data principal |
| Goal | Make an informed, affirmative choice for one purpose |
| Visible | `grant.heading`, the full notice text, `grant.notice_meta` (server's notice version), `grant.note` |
| Actions | `grant.button`, which sends `notice_version_id`, `expected_epoch`, `interaction_id`, `affirmative: true` (accepted 0.2.1 semantics) and an `Idempotency-Key`. Also `grant.not_now`. |
| Behaviour | No pre-ticked control. The grant covers only this purpose. Timeout and conflict handling are the same as for withdrawal: keep the original request, offer `recovery.portal.*`, and never create a second grant request while the first is unsettled (F-024). |
| Destination | P-RECEIPT |
| Evidence | J06, J14 (T07, T10) |

### P-RECEIPT — receipt and current progress

| Field | Spec |
|---|---|
| Actor | Data principal (own receipts only) |
| Goal | Know that the choice is saved, what that does and does not prove, and what is happening now |
| Visible | `receipt.heading`; `receipt.accepted.withdraw` or `.grant`; labelled facts `receipt.label.*` from the stored receipt (`receipt_id`, `event_id`, `purpose_id`, `consent_status`, `consent_epoch`, `accepted_at`); `receipt.proves`, `receipt.next`, `receipt.not_changed`. A separate block `receipt.progress.heading` shows one of `receipt.progress.*` (accepted 0.2.1 semantics; B02 consumer unimplemented). |
| Behaviour | Focus moves to `receipt.heading` when it loads. Stored facts never change: Accepted 0.2.1 defines `ReceiptView.receipt`, which is immutable. The progress block comes from `ReceiptView.current` and is labelled with its own `as_of` time. It describes the original receipt's workflow and does not claim that workflow controls later choices. A recovered retry shows the original receipt, not a new one. No connector, command or generation detail is shown. |
| Destination | `receipt.view_all` → P-RECEIPTS |
| Evidence | J07 (T08, T09) |

### P-RECEIPTS — receipt list

| Field | Spec |
|---|---|
| Actor | Data principal |
| Visible | `receipts.heading`, columns `receipts.col.*` |
| Behaviour | Use the implemented purpose-scoped history route `/api/v1/portal/me/consents/{purpose_id}/history` (introduced in 0.3.0, current 0.4.0 review pending). Retain P-RECEIPTS and the selected own purpose. Page until next_cursor is null; each row opens its own immutable receipt and separate current projection. No cross-principal selector or global receipt endpoint (F-016/B02). |
| Empty | `receipts.empty` |
| Evidence | J07 |

### Required but not specified as screens

| Need | Status | Route |
|---|---|---|
| View of send-admission records (to show "no send row" for T14) | **MISSING** | No staff route in the accepted 0.2.1 shape; send is a MACHINE-only interface. Show through W-TESTLAB assertions and W-EVIDENCE as the r4 C00 display decision; implementation remains F-018. |
| Worker restart / quarantined restore procedure | Operator procedure, not a screen | Evidence via runbook artifacts (`docs/runbooks/OPERATOR.md`) |
| Organisation bootstrap | CLI, not a screen | Codex A00/A01 |

## 5. Status copy (generated from UI_COPY.json)

<!-- BEGIN GENERATED: status-copy -->
### Consent

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `NOT_GIVEN` | ○ Not given | You haven't agreed to this. | `state.consent.NOT_GIVEN.label`, `state.consent.NOT_GIVEN.portal` | historical design 0.1.0; consumer unverified |
| `GRANTED` | ● Given | You agreed on {changed_at}. | `state.consent.GRANTED.label`, `state.consent.GRANTED.portal` | historical design 0.1.0; consumer unverified |
| `WITHDRAWN` | – Withdrawn | You withdrew consent on {changed_at}. | `state.consent.WITHDRAWN.label`, `state.consent.WITHDRAWN.portal` | historical design 0.1.0; consumer unverified |

### Workflow

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `ACCEPTED` | ○ Accepted | Withdrawal recorded. Downstream actions are still being checked. | `state.workflow.ACCEPTED.label`, `state.workflow.ACCEPTED.detail` | historical design 0.1.0; consumer unverified |
| `RUNNING` | ◐ In progress | Planned actions are being carried out and checked. | `state.workflow.RUNNING.label`, `state.workflow.RUNNING.detail` | historical design 0.1.0; consumer unverified |
| `NEEDS_ATTENTION` | ! Needs attention | Required actions remain unresolved. | `state.workflow.NEEDS_ATTENTION.label`, `state.workflow.NEEDS_ATTENTION.detail` | historical design 0.1.0; consumer unverified |
| `COMPLETED` | ✓ Completed | Every required obligation in this workflow's declared scope met its approved completion criterion. | `state.workflow.COMPLETED.label`, `state.workflow.COMPLETED.detail` | historical design 0.1.0; consumer unverified |

### Action status (what was sent and what the system replied)

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `PENDING` | ○ Pending | Planned for this system. Not sent yet. | `state.action.PENDING.label`, `state.action.PENDING.detail` | historical design 0.1.0; consumer unverified |
| `RUNNING` | ◐ Sending | The local agent is sending the approved operation. | `state.action.RUNNING.label`, `state.action.RUNNING.detail` | historical design 0.1.0; consumer unverified |
| `ACKNOWLEDGED` | ↩ Acknowledged | Command acknowledged. Outcome not yet independently observed. | `state.action.ACKNOWLEDGED.label`, `state.action.ACKNOWLEDGED.detail` | historical design 0.1.0; consumer unverified |
| `EFFECT_UNKNOWN` | ? Outcome unknown | Outcome unknown. Reconciliation is required. | `state.action.EFFECT_UNKNOWN.label`, `state.action.EFFECT_UNKNOWN.detail` | historical design 0.1.0; consumer unverified |
| `FAILED` | ✕ Failed | The system reported a known failure ({failure_reason}). A timeout on its own is shown as Outcome unknown. | `state.action.FAILED.label`, `state.action.FAILED.detail` | historical design 0.1.0; consumer unverified |
| `MANUAL_REQUIRED` | ✎ Manual action required | Manual action required. Automated outcome not verified. | `state.action.MANUAL_REQUIRED.label`, `state.action.MANUAL_REQUIRED.detail` | historical design 0.1.0; consumer unverified |
| `SKIPPED` | – Not applicable | Skipped: {skip_reason}. | `state.action.SKIPPED.label`, `state.action.SKIPPED.detail` | historical design 0.1.0; consumer unverified |

### Observation (what ORVIA read separately)

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `NOT_CHECKED` | ○ Not observed | No independent observation yet. | `state.observation.NOT_CHECKED.label`, `state.observation.NOT_CHECKED.detail` | historical design 0.1.0; consumer unverified |
| `OBSERVED_SATISFIED` | ✓ Required state observed | Required state observed · {method} · {observed_at} · generation {generation} · fresh until {fresh_until} · scope {scope_summary}. | `state.observation.OBSERVED_SATISFIED.label`, `state.observation.OBSERVED_SATISFIED.detail` | historical design 0.1.0; consumer unverified |
| `OBSERVED_NOT_SATISFIED` | ! Required state not observed | Read by {method} at {observed_at}: found {observed_summary}; required {desired_summary}. | `state.observation.OBSERVED_NOT_SATISFIED.label`, `state.observation.OBSERVED_NOT_SATISFIED.detail` | historical design 0.1.0; consumer unverified |
| `UNVERIFIABLE` | ? Cannot be observed | ORVIA has no permitted way to read this system. This is not a pass. {known_limits} | `state.observation.UNVERIFIABLE.label`, `state.observation.UNVERIFIABLE.detail` | historical design 0.1.0; consumer unverified |
| `STALE` | ◷ Observation out of date | Observation is out of date. Recheck required. Last observed {observed_at}. | `state.observation.STALE.label`, `state.observation.STALE.detail` | historical design 0.1.0; consumer unverified |

### Reconciliation record

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `PENDING` | ○ Reconciliation queued | A reconciliation attempt is recorded and waiting to start. | `state.reconciliation.PENDING.label`, `state.reconciliation.PENDING.detail` | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `RECONCILING` | ◐ Reconciling | ORVIA is reading the system's state or receipt for the uncertain attempt. | `state.reconciliation.RECONCILING.label`, `state.reconciliation.RECONCILING.detail` | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `RESOLVED` | ✓ Reconciliation resolved | Resolved by {method} at {finished_at}; see the linked observation. The original attempt stays recorded as Outcome unknown. | `state.reconciliation.RESOLVED.label`, `state.reconciliation.RESOLVED.detail` | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `INCONCLUSIVE` | ? Reconciliation inconclusive | The read couldn't settle the outcome ({reason_code}). The action still needs attention. | `state.reconciliation.INCONCLUSIVE.label`, `state.reconciliation.INCONCLUSIVE.detail` | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `FAILED` | ✕ Reconciliation failed | The reconciliation attempt itself failed ({reason_code}). The action still needs attention. | `state.reconciliation.FAILED.label`, `state.reconciliation.FAILED.detail` | accepted 0.2.1; consumer NOT_IMPLEMENTED |

### Processing decision

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `ALLOW` | ✓ Allowed | The current authority and published policy permit this use for this purpose. | `state.decision.ALLOW.label`, `state.decision.ALLOW.detail` | historical design 0.1.0; consumer unverified |
| `BLOCK` | ✕ Blocked | The current authority doesn't permit this use for this purpose: {decision_reason}. | `state.decision.BLOCK.label`, `state.decision.BLOCK.detail` | historical design 0.1.0; consumer unverified |
| `INDETERMINATE` | ? Decision unavailable | ORVIA could not determine whether this use is permitted. This result does not authorise processing. | `state.decision.INDETERMINATE.label`, `state.decision.INDETERMINATE.detail` | historical design 0.1.0; consumer unverified |

### Test result

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `NOT_RUN` | ○ Not run | No execution recorded. | `state.test.NOT_RUN.label`, `state.test.NOT_RUN.detail` | historical design 0.1.0; consumer unverified |
| `RUNNING` | ◐ Running | Assertions are executing now. | `state.test.RUNNING.label`, `state.test.RUNNING.detail` | historical design 0.1.0; consumer unverified |
| `PASS` | ✓ Passed | Every assertion in this run held. | `state.test.PASS.label`, `state.test.PASS.detail` | historical design 0.1.0; consumer unverified |
| `FAIL` | ✕ Failed — violation found | At least one assertion found behaviour that breaks the rule. See the assertion list. | `state.test.FAIL.label`, `state.test.FAIL.detail` | historical design 0.1.0; consumer unverified |
| `ERROR` | ! Error — could not finish | The run could not complete, so a complete pass is not established. Review the assertions and failures already recorded. | `state.test.ERROR.label`, `state.test.ERROR.detail` | historical design 0.1.0; consumer unverified |
| `SKIPPED` | – Skipped | Not executed: {skip_reason}. | `state.test.SKIPPED.label`, `state.test.SKIPPED.detail` | historical design 0.1.0; consumer unverified |

### Principal consent lines

| Stored value | Privacy Centre text | Copy ID |
|---|---|---|
| `NOT_GIVEN` | You haven't agreed to this. | `state.consent.NOT_GIVEN.portal` |
| `GRANTED` | You agreed on {changed_at}. | `state.consent.GRANTED.portal` |
| `WITHDRAWN` | You withdrew consent on {changed_at}. | `state.consent.WITHDRAWN.portal` |

### Supplementary status lines

| Copy ID | Text | Binding |
|---|---|---|
| `state.consent.detail` | Epoch {consent_epoch} · {changed_at} · notice {notice_version} | historical design 0.1.0; consumer unverified |
| `state.workflow.COMPLETED.scope` | Scope: {mapped_system_count} mapped systems. Systems not mapped in ORVIA are not covered. | historical design 0.1.0; consumer unverified |
| `state.workflow.COMPLETED.manual_note` | Includes {manual_count} obligations closed by an attributed manual statement. ORVIA did not independently observe those systems. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `state.workflow.NEEDS_ATTENTION.summary` | {unknown_count} outcome unknown · {failed_count} failed · {manual_count} manual action required · {unverified_count} not independently observed | UNRESOLVED F-007 |
| `state.action.SKIPPED.missing_reason` | Skipped, but no reason was recorded. Treat this as unresolved. | historical design 0.1.0; consumer unverified |
| `state.decision.ALLOW.basis` | Basis: {authority_summary} · policy {policy_version} · evaluated {evaluated_at} | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `state.coverage.automated_observable.label` | Automated and observable | UNRESOLVED F-008 |
| `state.coverage.automated_observable.detail` | Operations: {operation_list}. Read method: {method}. | historical design 0.1.0; consumer unverified |
| `state.coverage.automated_unobservable.label` | Automated, cannot be observed | UNRESOLVED F-008 |
| `state.coverage.automated_unobservable.detail` | Changes can be sent, but ORVIA cannot read the result. | historical design 0.1.0; consumer unverified |
| `state.coverage.manual_only.label` | Manual only | UNRESOLVED F-008 |
| `state.coverage.manual_only.detail` | No supported API. ORVIA assigns a person and cannot change or read this system. | historical design 0.1.0; consumer unverified |
| `state.coverage.enforcement_point.label` | Enforcement point | UNRESOLVED F-018 |
| `state.coverage.enforcement_point.detail` | Checks current authority when a message is admitted. It is not a data target. | historical design 0.1.0; consumer unverified |
| `state.coverage.coverage_reduced.label` | Coverage reduced | UNRESOLVED F-008 |
| `state.coverage.coverage_reduced.detail` | Since {changed_at}, ORVIA cannot read this system. New observations will show Cannot be observed. | historical design 0.1.0; consumer unverified |
| `state.observation.method.SCOPED_READ` | scoped read | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `state.observation.method.PROVIDER_RECEIPT` | provider receipt | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `state.observation.method.NONE` | no observation method | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.CURRENT_MARKETING_AUTHORITY` | Current marketing authority and published policy permit this scoped use. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.EXPLICIT_SYNTHETIC_ORDER_CONDITION` | The separate approved synthetic order-service condition permits this scoped use. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.CONDITIONS_NOT_SATISFIED` | The required conditions for this purpose are not satisfied. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.SERVICE_CONDITION_EXPIRED` | The synthetic order-service condition expired before the decision was completed. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.TARGET_OBSERVATION_UNAVAILABLE` | The target state could not be read. This result does not authorise processing. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.POLICY_UNAVAILABLE` | The policy service was unavailable. This result does not authorise processing. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.POLICY_RESULT_MISSING` | The policy service returned no decision. This result does not authorise processing. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.POLICY_RESULT_INVALID` | The policy response could not be validated. This result does not authorise processing. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.decision.UNKNOWN` | No reviewed explanation is available for this decision. Read its recorded result; this explanation grants no authority. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.command.APPLIED` | The target acknowledged the command. Check the separate observation for its effect. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.command.POLICY_NOT_APPROVED` | The command did not have a matching approved policy. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.command.STALE_EPOCH` | The command refers to an older consent state. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.command.STALE_GENERATION` | The command refers to a different target generation. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.command.PROVIDER_UNAVAILABLE` | The synthetic provider reported that it was unavailable. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.command.PROVIDER_DENIED` | The synthetic provider rejected this command. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.command.PROVIDER_RESPONSE_UNKNOWN` | The command response could not be confirmed. Reconciliation is required. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.command.UNKNOWN` | No reviewed explanation is available for this command result. Keep its recorded action status and separate observation. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.reconciliation.READ_UNAVAILABLE` | The independent read was unavailable. The earlier command remains uncertain. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.reconciliation.STALE_SCOPE` | The earlier scope is no longer current. This read does not settle the current obligation. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.reconciliation.DESIRED_STATE_NOT_OBSERVED` | The independent read did not show the required state. No new effect attempt is authorised. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `reason.reconciliation.UNKNOWN` | No reviewed explanation is available for this reconciliation result. Keep the recorded result and original uncertain attempt. | accepted 0.2.1; consumer NOT_IMPLEMENTED |

<!-- END GENERATED: status-copy -->

## 6. Loading, empty, error and permission states (generated from UI_COPY.json)

<!-- BEGIN GENERATED: state-copy -->
| Copy ID | Audience | Semantic state | Text | Binding |
|---|---|---|---|---|
| `global.loading.page` | ALL | LOADING | Loading {page_name}… | historical design 0.1.0; consumer unverified |
| `global.loading.slow` | ALL | LOADING | Still loading. The local services may be busy. | historical design 0.1.0; consumer unverified |
| `global.loading.count` | STAFF | LOADING | Loading count… | historical design 0.1.0; consumer unverified |
| `global.count.unavailable` | STAFF | SERVICE_ERROR | Not available | historical design 0.1.0; consumer unverified |
| `error.staff.400` | STAFF | VALIDATION_ERROR | Check the highlighted fields. {field_errors} | historical design 0.1.0; consumer unverified |
| `error.staff.401` | STAFF | UNAUTHENTICATED | Your session has ended. Sign in again to continue. | historical design 0.1.0; consumer unverified |
| `error.staff.403` | STAFF | FORBIDDEN | You don't have permission to do this. Your role: {role_label}. Ask an organisation admin if you need access. | historical design 0.1.0; consumer unverified |
| `error.staff.404` | STAFF | NOT_FOUND_OR_INACCESSIBLE | Not found. It doesn't exist, or it isn't available to your account. | historical design 0.1.0; consumer unverified |
| `error.staff.409_version` | STAFF | VERSION_CONFLICT | This changed after you opened it. Reload to see the latest version, then try again. | historical design 0.1.0; consumer unverified |
| `error.staff.409_idempotency` | STAFF | IDEMPOTENCY_CONFLICT | This request reference does not match the original change. Keep the original request and check its status; do not submit it with a new reference. | historical design 0.1.0; consumer unverified |
| `error.staff.429` | STAFF | RATE_LIMITED | Too many requests. Wait a moment, then try again. | historical design 0.1.0; consumer unverified |
| `error.staff.503` | STAFF | SERVICE_UNAVAILABLE | A required service isn't available. A change you submitted may have been saved. Keep this page open and check its status before using Retry the same request. | UNRESOLVED F-024 |
| `error.staff.network_read` | STAFF | NETWORK_ERROR | Couldn't reach ORVIA. Check that the local services are running, then retry. | historical design 0.1.0; consumer unverified |
| `error.staff.network_change` | STAFF | OUTCOME_UNCONFIRMED | We couldn't confirm whether this change was saved. Keep this page open. Check its status without starting a new change, then use Retry the same request when available. | UNRESOLVED F-024 |
| `error.portal.400` | PRINCIPAL | VALIDATION_ERROR | Something in the request wasn't accepted. Reload the page and try again. | historical design 0.1.0; consumer unverified |
| `error.portal.401` | PRINCIPAL | UNAUTHENTICATED | Please sign in again. Your session has ended. | historical design 0.1.0; consumer unverified |
| `error.portal.403_404` | PRINCIPAL | NOT_FOUND_OR_INACCESSIBLE | This page isn't available. Go to Your choices. | historical design 0.1.0; consumer unverified |
| `error.portal.409_epoch` | PRINCIPAL | VERSION_CONFLICT | This request is no longer current. Load your latest choice before making a new choice. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `error.portal.409_epoch.action` | PRINCIPAL | VERSION_CONFLICT | Load my latest choice | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `error.portal.409_epoch.reloaded` | PRINCIPAL | RELOAD_SUCCEEDED | We've loaded your latest choice. Check it before making a new choice. | UNRESOLVED F-024 |
| `error.portal.409_idempotency` | PRINCIPAL | IDEMPOTENCY_CONFLICT | This request doesn't match the one you started. Don't submit it as a new request. Keep this page open and check the original request. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `error.portal.429` | PRINCIPAL | RATE_LIMITED | Please wait a moment and try again. | historical design 0.1.0; consumer unverified |
| `error.portal.503` | PRINCIPAL | SERVICE_UNAVAILABLE | The Privacy Centre couldn't confirm whether your choice was saved. Keep this page open and use Check my current choice. Don't make a new choice while this request is unconfirmed. | UNRESOLVED F-024 |
| `error.portal.503_not_saved` | PRINCIPAL | NOT_SAVED | We couldn't save your choice. Your previous choice is unchanged. | CONDITIONAL — do not display (F-024) |
| `error.portal.network_change` | PRINCIPAL | OUTCOME_UNCONFIRMED | We couldn't confirm whether your choice was saved. Don't make a new choice yet — first check what happened. | UNRESOLVED F-024 |
| `permission.read_only_auditor` | STAFF | FORBIDDEN | Read-only access. Your role can view this page but not change anything. | historical design 0.1.0; consumer unverified |
| `permission.view_only_member` | STAFF | FORBIDDEN | View only. You can act on tasks assigned to you. | historical design 0.1.0; consumer unverified |
| `permission.mfa_required` | STAFF | FORBIDDEN | Set up multi-factor authentication to continue. This action needs it. | historical design 0.1.0; consumer unverified |
| `permission.reauth_required` | STAFF | FORBIDDEN | Confirm it's you. Enter your authentication code to continue. | historical design 0.1.0; consumer unverified |
| `permission.principal_in_workspace` | PRINCIPAL | FORBIDDEN | This area is for organisation staff. You're signed in to the Privacy Centre. | historical design 0.1.0; consumer unverified |
| `permission.staff_in_portal` | STAFF | FORBIDDEN | Sign in with a Privacy Centre account. Staff accounts can't manage a person's choices. | historical design 0.1.0; consumer unverified |
| `permission.both_sessions` | ALL | FORBIDDEN | You're signed in to both the workspace and the Privacy Centre in this browser profile. Sign out of one using its sign-out action, or use an independent browser profile. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `permission.action.go_to_choices` | PRINCIPAL |  | Go to your choices | historical design 0.1.0; consumer unverified |
| `permission.action.setup_mfa` | STAFF |  | Set up MFA | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `overview.empty` | STAFF | EMPTY | No workflows yet. A workflow starts when a withdrawal is recorded. | historical design 0.1.0; consumer unverified |
| `attention.empty` | STAFF | EMPTY | Nothing needs attention in this scope. This covers systems mapped in ORVIA only. | historical design 0.1.0; consumer unverified |
| `workflows.empty` | STAFF | EMPTY | No workflows yet. They appear after a person changes a consent choice that needs system updates. | historical design 0.1.0; consumer unverified |
| `purposes.empty` | STAFF | EMPTY | No purposes yet. Create a purpose to describe why personal data is used. | historical design 0.1.0; consumer unverified |
| `notices.empty` | STAFF | EMPTY | No notices yet. A notice is the text a person reads before agreeing. | historical design 0.1.0; consumer unverified |
| `policies.empty` | STAFF | EMPTY | No policies yet. Draft a policy, then ask a different reviewer to publish it. | historical design 0.1.0; consumer unverified |
| `systems.empty` | STAFF | EMPTY | No systems added. Add one of the allowlisted demonstration systems. | historical design 0.1.0; consumer unverified |
| `principals.empty` | STAFF | EMPTY | No demo principals yet. Add fictional people for the demonstration. | historical design 0.1.0; consumer unverified |
| `evidence.gaps.empty` | STAFF | EMPTY | No unresolved gaps are recorded for the mapped systems. Systems outside ORVIA's map are not covered. | historical design 0.1.0; consumer unverified |
| `evidence.empty` | STAFF | EMPTY | Choose a workflow to see its evidence. | historical design 0.1.0; consumer unverified |
| `testlab.empty` | STAFF | EMPTY | No test runs yet. Nothing has been executed in this environment. | historical design 0.1.0; consumer unverified |
| `capabilities.unavailable` | STAFF | EMPTY | Capability register not available. No list is shown rather than a guessed one. | UNRESOLVED F-029 |
| `choices.empty` | PRINCIPAL | EMPTY | There are no choices for you to manage right now. | historical design 0.1.0; consumer unverified |
| `receipts.empty` | PRINCIPAL | EMPTY | No receipts yet. You get one each time you make or change a choice. | UNRESOLVED F-016 |
| `recovery.portal.heading` | PRINCIPAL | OUTCOME_UNCONFIRMED | Your last request is unconfirmed | UNRESOLVED F-024 |
| `recovery.portal.body` | PRINCIPAL | OUTCOME_UNCONFIRMED | You asked to {requested_change} at {requested_at}. We don't yet know whether it was saved. When the original request is available, Retry the same request uses its unchanged details. If it was saved, an authorised replay returns its original receipt. | UNRESOLVED F-024 |
| `recovery.portal.retry_same` | PRINCIPAL | OUTCOME_UNCONFIRMED | Retry the same request | UNRESOLVED F-024 |
| `recovery.portal.check` | PRINCIPAL | OUTCOME_UNCONFIRMED | Check my current choice | UNRESOLVED F-024 |
| `recovery.portal.new_choice_note` | PRINCIPAL | OUTCOME_UNCONFIRMED | A new choice is a separate request. You can make one after this request is settled. | UNRESOLVED F-024 |
| `recovery.portal.resolved_saved` | PRINCIPAL | RECOVERED_ORIGINAL_RECEIPT | Your earlier request was saved. Here is its receipt. | UNRESOLVED F-024 |
| `recovery.portal.resolved_conflict` | PRINCIPAL | VERSION_CONFLICT | This request could not be applied with its original details. We've loaded your latest choice. Check it before making a new choice. | UNRESOLVED F-024 |
| `recovery.staff.retry_same` | STAFF | OUTCOME_UNCONFIRMED | Retry the same request | UNRESOLVED F-024 |
| `error.retry.NEVER` | ALL | NEVER | This can't be retried. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `error.retry.REAUTHENTICATE` | ALL | REAUTHENTICATE | Sign in again as the same account. Keep any unconfirmed request unchanged. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `error.retry.REFRESH` | ALL | REFRESH | Load the current details. Keep any unconfirmed request unchanged; a status check does not prove it was not saved. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `error.retry.SAME_IDEMPOTENCY_KEY` | ALL | SAME_IDEMPOTENCY_KEY | Retry the same request. Don't start a new one. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `error.retry.AFTER_DELAY` | ALL | AFTER_DELAY | Wait before retrying. For an unconfirmed change, use only the same request when offered. | accepted 0.2.1; consumer NOT_IMPLEMENTED |
| `error.staff.409_generation` | STAFF | STALE_GENERATION | The target record changed since this action was planned. ORVIA won't apply the old action. | UNRESOLVED F-009 |
| `error.any.unsupported_version` | ALL | UNSUPPORTED_VERSION | This page is out of date. Reload to continue. | UNRESOLVED F-009 |
<!-- END GENERATED: state-copy -->

**Rules for these states**

- **Error reference.** Every error surface adds `global.error.reference` with `global.action.copy_reference` when the server returns a `request_id`. No stack traces, raw request bodies or secrets.
- **Loading.**
  - Skeletons carry no digits.
  - After 10 s, add `global.loading.slow`.
  - Mutation buttons show their own loading text and are disabled until the response arrives.
- **Staff vs principal errors.**
  - Cross-tenant and cross-principal access use the same not-found copy, so nothing reveals that a resource exists (F-014 records the accepted scoped 404 / capability-denial 403 distinction).
  - Principals get one message for 403 and 404.
- **Service unavailable.** `error.*.503` uses outcome-unconfirmed wording because a generic 503 cannot prove that nothing was saved. `error.portal.503_not_saved` is **conditional and must not be displayed** until an accepted contract gives an explicit no-commit signal and tests prove it (F-024). Follow the response's `retry` hint (`error.retry.*`) subject to the outstanding-request rule. It cannot authorize a full reload, fresh key or changed payload/epoch for an unconfirmed write.
- **Mocked UI state tests.** Browser tests that mock these states are useful but are reported separately from integrated-flow results (J21).

## 7. Focus, keyboard and reading order

- **Keyboard.**
  - Every action is reachable by keyboard in reading order, and focus is always visible.
  - Dialogs (reconcile, attest, policy approval) trap focus, close on Esc (= cancel) and return focus to the control that opened them.
- **Focus after a completed action.** Focus moves to the result heading after grant, withdraw, publish, reconcile, attest and starting a run. The result is also announced through a polite live region.
- **Background updates.** Polling and background refreshes never move focus and never re-order rows under the pointer. `global.updated_at` shows freshness.
- **Tables.** Tables use header cells with scope. The two status columns have text headings plus tooltips (`workflow.col.action.tooltip`, `workflow.col.observation.tooltip`), reachable by focus.
- **Forms.**
  - Form errors are linked to their fields.
  - A summary at the top lists them and receives focus on submit failure.
- **Layout.**
  - The Privacy Centre works at 320 px width and 200% zoom.
  - The workspace works at 200% zoom with horizontal scroll contained to tables.
- **Motion.** Reduced motion is respected. No animation carries meaning.

## 8. Open producer/consumer decisions

[`docs/reviews/cowork/FINDINGS.csv`](../reviews/cowork/FINDINGS.csv) gives the owner, acceptance condition and closure evidence for each. Every UNRESOLVED entry in `UI_COPY.json` names one of these findings; the validator enforces it.

| Finding | Open decision |
|---|---|
| F-029 | Genuine register restored; original-to-API capability mapping remains open |
| F-006 | Resolved semantic binding; B02 consumer evidence remains F-019 |
| F-007 | Work count definition settled; A05 predicate and mixed units documented; T21/B03 parity remains. |
| F-008 | Reconciliation record (accepted 0.2.1); quarantine, stale-event, retry-permitted and coverage-loss representations |
| F-009 | Source-backed reason catalogue delivered; exact-envelope error conditions and B03 tests remain. |
| F-010 | Expected fault detection and scenarios (accepted 0.2.1) |
| F-011 | Build metadata and MFA enrolment |
| F-012 | Resolved semantic binding; consumer evidence remains F-019 |
| F-013 | Manual criterion accepted; withdrawal-only detail guard specified; T20/B03 remain. |
| F-014 | Resolved: scoped inaccessible resources use 404; capability denial uses 403. Consumer tests remain F-019. |
| F-016 | Own-principal history/receipt endpoints present in executable 0.3.0; review and B02 consumer tests remain. |
| F-017 | Notice publish route, lifecycle values, service purpose in the portal |
| F-018 | Send-admission view |
| F-023 | Labels/native protocol specified; B01 mapping and browser tests remain. |
| F-024 | Uncertain-write recovery and no-commit assurance |
| F-025 | Source-backed purpose-specific reason catalogue delivered; T15/T16/B03/B04 remain. |
| F-026 | Resolved: supported sign-out or independent browser profile; B01 tests remain F-019 |

## r4 implementation binding and recovery decisions

**Authorship:** Work C00 semantic/UX handoff, self-reviewed. These decisions apply the accepted 0.2.1 semantics and identify current 0.4.0 transport and 0.3.0 route/signed-command dependencies; they do not accept new application implementation. Codex must cross-check producer/consumer binding; the human accepts C00. C00 does not wait for completed B00.

| Screen/action | Exact producer interface | Present source / approval / remaining consumer |
|---|---|---|
| W-SIGNIN / P-SIGNIN | `staffAuthClient` / `principalAuthClient`; `/api/auth/staff/*`, `/api/auth/principal/*`; `GET /api/v1/session` | A01 accepted; native auth errors differ from API envelope. B01 UI/browser absent. |
| W-PURPOSES / W-NOTICES / W-POLICIES / W-SYSTEMS | `GET/POST /api/v1/admin/purposes`, `/notices`, `/policies`, `/systems` | A02 implementation present, 0.3.0 review pending. B01 absent. Notice publication occurs with the exact policy; no separate publish endpoint is invented. |
| W-POLICIES distinct reviewer | `POST /api/v1/admin/policies/{id}/reauthenticate`, then `/publish` | Reauthentication is a 0.3.0 candidate addition. Exact version/digest, current MFA and one-use proof; do not persist TOTP. Expiry correction merged, acceptance pending. |
| W-PRINCIPALS / mapped controls | `GET/POST /api/v1/admin/principals`; `GET/POST /api/v1/admin/target-mappings`; `GET /api/v1/admin/control-map` | Directory accepted A01; mapping addition pending 0.3.0 acceptance. Directory creation does not create a login. |
| P-CHOICES / P-GRANT | `GET /api/v1/portal/me/consents`; `POST /api/v1/portal/me/consents/{purpose_id}/grant` or `/withdraw` | A02 present, acceptance pending; B02 absent. Grant includes exact notice, interaction, epoch and affirmative action. Withdrawal does not require new notice acceptance. |
| P-RECEIPT / P-RECEIPTS | `GET /api/v1/portal/me/receipts/{id}`; `GET /api/v1/portal/me/consents/{purpose_id}/history` | Receipt/current separation accepted 0.2.1; history is a 0.3.0 candidate addition. Preserve P-RECEIPTS ID; scope history to the selected own purpose, not an invented global list. |
| W-WORKFLOWS / detail | `GET /api/v1/admin/workflows`, `/workflows/{id}` | A03 source present, review pending. B03 absent. A05 reconciliation and manual attestation producer source exists; implementation review and B03 tests remain. |
| W-OVERVIEW / W-ATTENTION / W-EVIDENCE | `GET /api/v1/admin/overview`, `/failures`, `/evidence/{workflow_id}`, `/evidence/{workflow_id}/export` | A05 producers present; B03 and acceptance pending. Export is audited, scoped, attachment/no-store; tests are currently an empty array. |
| W-CAPABILITIES | Genuine `tracking/capabilities.json`; separate `GET /api/v1/admin/capabilities` connector catalogue | Work specifies two labelled sections. Preserve all 33 module rows and V1/V2/depth/unknown statuses; never turn connector IMPLEMENTED into whole-module completion. F-029 consumer/import pending. |
| W-TESTLAB | Generated test routes (A06 pending) | No test producer/UI exists. Actual send/no-send is shown through real assertions/evidence, never policy preview. |

**C00-R4-RECOVERY:** While a logical request is outstanding, a dedicated same-tab in-memory request holder retains the original Idempotency-Key and exact payload, including expected_epoch, interaction_id and grant notice/affirmative fields. Retry is explicit, after authority is re-established for the same principal/scope, and sends that unchanged request. Reading current choice does not replace the payload/epoch or prove rollback. Do not put passwords, cookies, session tokens, MFA material or business records in browser persistence.

Full document reload/tab loss clears memory. Until Codex provides an accepted customer-local, authenticated pending-request recovery mechanism with scoped access/expiry and tests, the UI must say the prior outcome is unconfirmed and must not silently invent a fresh key, refresh the epoch for a retry, or offer a guaranteed recovery button when the original request is unavailable. Receipt/history can show positively identified acceptance; an unchanged read cannot establish non-commit. Codex B01/B02 plus A02 own this precise F-024 gap. This is a specified safe mechanism and limit, not a claim that reload recovery is implemented. No new API path is invented here.

For the accepted receipt recovered by authorised same-request replay, show the original receipt. A confirmed EPOCH_CONFLICT plus successful authenticated in-app current-choice read may display the refreshed choice and permit an explicitly new logical action. Keep `error.portal.503_not_saved` suppressed until an explicit accepted no-commit guarantee and tests exist.

**C00-R4-AUTH:** Dual active domains return 403 under accepted A01. Offer the library-supported sign-out flow or an independent browser profile/context. A normal new window shares cookies and is not isolation. Reauthentication never changes the request identity. Native auth errors must be mapped explicitly by B01 without rendering raw error objects.

**C00-R4-DECISION/ERROR:** `INDETERMINATE` is “Decision unavailable”; it grants no processing authority. Only a supported actual send-admission result may say “Not admitted at this send point.” Marketing remains fail-closed at the actual supported boundary. ERROR retains completed assertions and detected failures, while withholding a complete pass.

Keyboard/focus requirements above remain normative: semantic controls, visible focus, focus to the error summary/invalid field after a rejected submit, stable focus during polling, labelled status updates, and keyboard-visible UTC timestamps. Mobile layouts scroll wide tables inside their container, not the whole page. B06 supplies actual application checks; document preview is separate.

A04 intake at PR #17: `POST /api/v1/admin/policy/evaluate` now has supplied staff-preview source; `POST /api/v1/machine/simulator/send` has supplied SENDER-only source and engineering reports. Neither grants browser send authority. The staff preview cannot establish an actual send/no-send result. Full UI and candidate acceptance remain pending.

## C00 completed display bindings at the A05 source

The scoped decision and critical-copy self-review are in `docs/reviews/work/C00-copy-source-review.md`. UI_COPY contains the machine-readable code-to-text catalogue, exact source hashes, conditional display guards and overview count units. These are implementation inputs, not a second API model. Codex consumes the generated contract and these display rules.

For decision explanations, use the allowlisted reason text only when its required state equals the returned decision. An unknown code or a state mismatch uses the neutral fallback; never turn a code into authority. Marketing authority and the separate synthetic order condition are different explanations. In a preview, the result describes an evaluation; it never proves an actual send or absence of a send row. Show nullable policy/epoch as unavailable, not a made-up version or zero.

For action reasons, APPLIED remains an acknowledgement, including the deliberately acknowledged-without-effect fixture. A separate current observation establishes the effect. For reconciliation, keep READ_UNAVAILABLE, STALE_SCOPE and DESIRED_STATE_NOT_OBSERVED distinct and leave the original uncertain attempt visible. No read result authorizes a fresh effect retry.

A05 system checks report actual mapped-resource read availability and a declared restrict capability; the latter is not a mutation test. Do not relabel unreadable as quarantined. The unknown/failed/manual overview cards count recorded execution states even after a distinct completion criterion is met. They are not outstanding-work counters. A05 failures pagination can contain an empty page with a continuing cursor; the empty-state message is permitted only after all pages are exhausted. W-CAPABILITIES displays the 33-module register separately from configured connector status.
