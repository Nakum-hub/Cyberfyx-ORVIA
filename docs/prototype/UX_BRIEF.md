# ORVIA prototype: UX brief

**Owner:** Cowork (C00) · **Status:** REVISED_FOR_REVIEW · **Revision:** c00-r3, 16 Sep 2026 IST · **Documentation base:** `e839b1a` (`main` after the A00 bootstrap merge)

**Revision history:**

- c00-r2 was written against `96b8bd7` (planning documents only).
- c00-r3 refreshes this brief against `e839b1a` and the verified master. It keeps the r2 screen design.

**What this brief is.** A UX and copy handoff. It is not evidence that any screen exists: at `e839b1a` the application has only the A00 foundation page (`/`) and `/healthz`. Journeys and evidence requirements are in [`docs/ux/ACCEPTANCE_JOURNEYS.md`](../ux/ACCEPTANCE_JOURNEYS.md).

**Exact text lives in [`docs/ux/UI_COPY.json`](../ux/UI_COPY.json).**

- This brief refers to copy by ID (for example `state.action.ACKNOWLEDGED.detail`).
- Tables marked *generated* are copied from that file by `docs/reviews/cowork/tools/build_pack.py`. **Edit the JSON, not the generated tables.**
- `python3 docs/reviews/cowork/tools/build_pack.py --check` reports stale generated sections.

## 0. Sources and authority

### Inputs read at `e839b1a`

- `AGENTS.md`, `CURRENT_STATE.md` and `docs/prototype/EXECUTION_PLAN.md` (Plan 1.0)
- `docs/prototype/CONTRACT.md` (design 0.1.0)
- `docs/prototype/ACCEPTANCE.md`, `docs/prototype/FILE_OWNERSHIP.md`, `docs/prototype/SOURCE_ALIGNMENT.md` and `docs/prototype/TASK_BOARD.md`
- `docs/decisions/ADR-001-prototype-profile.md` and the W00 review
- `tracking/tasks.json` and `tracking/acceptance.json`
- The A00 handoff and the executable contract **proposal 0.2.0** (`packages/contracts`, `docs/engineering/A00-CONTRACT-PROPOSAL.md`). Its status is `PENDING_W00`, so it is not an accepted binding.

The approved master, revision 1.3, was read from the human's verified reference copy (SHA-256 `527daa1d…6bef6`, evidence EV-SRC-004). The repository copy under `docs/source/` is still absent (F-001).

### How conflicts are resolved

This replaces the r2 rule "the stricter wording wins", which is withdrawn.

1. **Product and security scope** come from the approved master's current numbered sections. Historical appendices and older kits do not override them.
2. **Demo depth and prototype adaptations** come from the execution plan and the decisions Work has recorded (ADR-001, W00 review). These apply only within their stated scope.
3. **Field and enum bindings** come from the executable contract **once Work has accepted it**.
   - Until then, the design contract 0.1.0 gives the meaning, and the 0.2.0 proposal is cited as a proposal.
   - An accepted executable contract governs implemented bindings. It does not silently override an approved product or security requirement.
4. **Cowork's own documents** apply these sources. They do not add requirements, enums or endpoints.
5. **When two sources conflict, Cowork does not pick a winner.** The item stays UNRESOLVED in `UI_COPY.json` with a finding in `docs/reviews/cowork/FINDINGS.csv`, and it is routed:
   - to **Work** for semantics and shared state;
   - to the **human** for source authority and access.

   If a kit version of this brief turns up, it is compared in `docs/reviews/cowork/` and any differences are handled the same way (F-005).

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
   - An unconfirmed write is never repeated as a *new* request. The client keeps the original request (Idempotency-Key, exact payload and `expected_epoch`) across timeout and reload, and offers `recovery.portal.retry_same`. A fresh choice is a separate operation, available only after the first request is settled or its conflict has been handled (F-024).
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
    - If Work accepts a criterion that lets an attested manual obligation complete, `state.workflow.COMPLETED.manual_note` is mandatory (F-013).
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

**Routes.** Route paths are Claude Code's decision (B00+). This brief fixes screens and copy, not URLs. A local Claude Code B00 plan, which is outside the repository, proposes paths such as `/workspace/failures` and `/workspace/test-lab`.

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

Each spec covers the same fields: actor, goal, prerequisite, visible information, labels and actions, permitted behaviour, destination and acceptance evidence. **Implementation status for all: NOT_IMPLEMENTED at `e839b1a`** (evidence EV-SRC-003).

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
| Unresolved | Auth-library labels and error mapping (F-023); MFA enrolment route and build metadata (F-011). The 0.2.0 proposal names Better Auth mounts `/api/auth/staff` and `/api/auth/principal`; A01 implements them. |

### W-OVERVIEW — core dashboard

| Field | Spec |
|---|---|
| Actor | All staff roles |
| Goal | See, at a glance, what is unresolved and which build this is |
| Prerequisite | Staff session |
| Visible | `overview.heading`, `overview.subheading`; cards `overview.card.*` with server counts; `overview.build_panel` |
| Actions | Each card links to a filtered W-WORKFLOWS or W-ATTENTION list. `global.action.retry` on a failed card. |
| Behaviour | Counts come from `GET /api/v1/admin/overview`. Loading shows `global.loading.count`; failure shows `global.count.unavailable`. No totals are calculated in the browser. |
| Destination | W-ATTENTION, W-WORKFLOWS, W-TESTLAB (latest run) |
| Empty | `overview.empty` |
| Evidence | J00, J15 (T01, T21, T30) |
| Unresolved | 0.2.0 proposes `Overview.counts` = accepted, running, needs_attention, completed, effect_unknown, manual_required, failed, unverified. Cards for unverifiable, not-satisfied and stale have no proposed count and stay unbound; `overview.card.unverified` needs a definition (F-007). Build metadata: F-011. |

### W-ATTENTION — unresolved obligations

| Field | Spec |
|---|---|
| Actor | All staff roles. MEMBER acts only on its assigned rows. |
| Goal | Find every required action that is unknown, failed, manual, not observed or unverifiable, and who owns it |
| Prerequisite | Staff session |
| Visible | `attention.heading`, `attention.subheading`, columns `attention.col.*`; status badges from §5 |
| Actions | Row → W-WORKFLOW-DETAIL (anchored to the action) |
| Behaviour | Data from `GET /api/v1/admin/failures`. Sorted by oldest first. Nothing leaves the list unless the server resolves it. |
| Empty | `attention.empty`. The scope caveat is always shown. |
| Evidence | J12, J13, J15 (T19, T20, T21) |

### W-WORKFLOWS — workflow list

| Field | Spec |
|---|---|
| Actor | All staff roles |
| Goal | Find a workflow by status, purpose or time |
| Visible | `workflows.heading`, columns `workflows.col.*`, workflow badges |
| Actions | Status filter; row → W-WORKFLOW-DETAIL |
| Behaviour | Server pagination (`GET /api/v1/admin/workflows`). The unresolved count comes from the server. |
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
| Behaviour | Reconcile calls `POST /admin/actions/{id}/reconcile`, which returns 202 `AcceptedOperation` in 0.2.0. While waiting for that response, show the transient `reconcile.pending`. Afterwards, show the durable reconciliation record from the workflow (`state.reconciliation.*`) and the resulting observation, if any. The uncertain attempt remains `Outcome unknown` in history. Attest calls `POST /admin/manual-tasks/{id}/attest` (statement plus at least one evidence reference in 0.2.0). The attestation appears as `attest.record_line` + `attest.record_note`, and the Observation cell does not change. Optional polling (0.2.0 proposes 2 s, backing off to 30 s) updates a polite live region and never moves focus. Writes are never retried automatically. |
| Destination | W-EVIDENCE for this workflow |
| Evidence | J07–J14, J18 (T08–T20, T11) |
| Reconciliation | ADR-001 requires a durable, typed reconciliation attempt. The 0.2.0 proposal (Codex, pending W00) adds a separate `Reconciliation` record (`PENDING → RECONCILING → RESOLVED \| INCONCLUSIVE \| FAILED`), while the uncertain attempt stays `EFFECT_UNKNOWN`. Show that record with `state.reconciliation.*`. `reconcile.pending` is only transient button text and never replaces the durable record. Cowork introduces no enum values of its own. |
| Unresolved | Acceptance of the 0.2.0 reconciliation record; "retry permitted" representation; stale-event timeline type; attestation effect on completion (F-008, F-013) |

**Example action rows** (illustrative layout only; no result is implied):

| System | Operation | Action status | Observation | Next step |
|---|---|---|---|---|
| Aster CRM (synthetic) | Remove from marketing audience | Acknowledged | Required state observed · membership read · {observed_at} · generation {generation} | — |
| Aster Messaging Simulator | Restrict marketing | Outcome unknown | Not observed | Reconcile |
| Aster Loyalty Ledger (no API) | — | Manual action required | Cannot be observed | Assigned to {owner_name} |

### W-PURPOSES / W-NOTICES — configuration

| Field | Spec |
|---|---|
| Actor | ORG_ADMIN or ORG_SUPER_ADMIN create; AUDITOR and MEMBER read-only (`permission.read_only_auditor` / `permission.view_only_member`) |
| Goal | Define `promotional_marketing` and `order_service_demo` separately; write the notice a person reads |
| Visible | `purposes.*`, `notices.*`; version and publication state per row |
| Actions | `purposes.create`, `purposes.save`, `notices.create`, `notices.save`. `notices.publish` is **unresolved** (the contract has no notice publish route; F-017). |
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
| Behaviour | The relationship view is a list/detail panel; no animated graph is needed. Coverage labels are derived from the system's declared capabilities: 0.2.0 proposes connector `SYNTHETIC_CRM` \| `ORVIA_REST_SIMULATOR` \| `LEGACY_MANUAL` with `supports_restrict` and `supports_read`. The send gateway is **not** a configured system; explain it as the enforcement point in text only (F-018). The permission-loss label `state.coverage.coverage_reduced` and the quarantine display `systems.quarantine` are **unresolved** (F-008). |
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
| Actions | `testlab.field.scenario`, offering only the server allowlist and no free text. 0.2.0 proposes three scenarios, labelled `testlab.scenario.*`. Then `testlab.run`. |
| Behaviour | The UI never selects, edits or reinterprets a result. A run with `expected_fault_detection` keeps its recorded assertion results, and a FAIL there is not shown as PASS. Earlier runs are never overwritten. |
| Empty | `testlab.empty` |
| Evidence | J17 (T23, T24) |

### W-CAPABILITIES — read-only register

| Field | Spec |
|---|---|
| Actor | All staff roles |
| Goal | See every programme module with target release/depth separate from implementation and test status |
| Visible | Columns `capabilities.col.*`; badges `capabilities.deferred_v2` (the seven learned-AI modules only) and `capabilities.v1_programme` |
| Behaviour | Data from `GET /admin/capabilities`, sourced from `tracking/capabilities.json`. That file is **absent** at `e839b1a`, so the register must show `capabilities.unavailable` rather than an invented list (F-002). The master confirms 33 modules, with IDs 19–25 deferred to Version 2 (EV-SRC-004). That fact is used to cross-check the genuine register when it arrives, not to create one. |
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
| Behaviour | Withdraw sends `expected_epoch`, `interaction_id` and an `Idempotency-Key` created once for this logical request. The client keeps that exact request across timeout and reload. While waiting, show `choices.saving` with the button disabled, which blocks double submission.<br>**Outcomes:**<br>• Timeout or network loss: `error.portal.network_change`, then the `recovery.portal.*` panel. **Retry the same request** re-sends the identical key and payload, and **Check my current choice** reloads.<br>• The retry returns the original receipt: show `recovery.portal.resolved_saved`.<br>• `EPOCH_CONFLICT`: show `error.portal.409_epoch` with its action. Only after the reload succeeds, show `error.portal.409_epoch.reloaded`.<br>• `IDEMPOTENCY_CONFLICT`: `error.portal.409_idempotency`.<br>A new choice (new key, current epoch) is offered only after one of these outcomes. **Never** show "nothing changed" after a timeout or a generic 503. The browser never retries a write automatically (0.2.0). Client retention and recovery are unimplemented (F-024). The service card shows `choices.service_card.note` and has no marketing-linked control (F-017). |
| Destination | P-RECEIPT |
| Empty | `choices.empty` |
| Evidence | J06, J07, J14 (T07–T10, T15) |

### P-GRANT — read notice and agree

| Field | Spec |
|---|---|
| Actor | Data principal |
| Goal | Make an informed, affirmative choice for one purpose |
| Visible | `grant.heading`, the full notice text, `grant.notice_meta` (server's notice version), `grant.note` |
| Actions | `grant.button`, which sends `notice_version_id`, `expected_epoch`, `interaction_id`, `affirmative: true` (0.2.0) and an `Idempotency-Key`. Also `grant.not_now`. |
| Behaviour | No pre-ticked control. The grant covers only this purpose. Timeout and conflict handling are the same as for withdrawal: keep the original request, offer `recovery.portal.*`, and never create a second grant request while the first is unsettled (F-024). |
| Destination | P-RECEIPT |
| Evidence | J06, J14 (T07, T10) |

### P-RECEIPT — receipt and current progress

| Field | Spec |
|---|---|
| Actor | Data principal (own receipts only) |
| Goal | Know that the choice is saved, what that does and does not prove, and what is happening now |
| Visible | `receipt.heading`; `receipt.accepted.withdraw` or `.grant`; labelled facts `receipt.label.*` from the stored receipt (`receipt_id`, `event_id`, `purpose_id`, `consent_status`, `consent_epoch`, `accepted_at`); `receipt.proves`, `receipt.next`, `receipt.not_changed`. A separate block `receipt.progress.heading` shows one of `receipt.progress.*` (unresolved F-006). |
| Behaviour | Focus moves to `receipt.heading` when it loads. Stored facts never change: 0.2.0 proposes `ReceiptView.receipt`, which is immutable. The progress block comes from `ReceiptView.current` and is labelled with its own `as_of` time. It describes the original receipt's workflow and does not claim that workflow controls later choices. A recovered retry shows the original receipt, not a new one. No connector, command or generation detail is shown. |
| Destination | `receipt.view_all` → P-RECEIPTS |
| Evidence | J07 (T08, T09) |

### P-RECEIPTS — receipt list

| Field | Spec |
|---|---|
| Actor | Data principal |
| Visible | `receipts.heading`, columns `receipts.col.*` |
| Behaviour | **Blocked on the contract**: no list route exists (F-016). Until one is added, show only receipts reachable by ID from the current session, or omit the nav item. |
| Empty | `receipts.empty` |
| Evidence | J07 |

### Required but not specified as screens

| Need | Status | Route |
|---|---|---|
| View of send-admission records (to show "no send row" for T14) | **MISSING** | No staff route in 0.2.0; send is a MACHINE-only interface. Show through W-TESTLAB assertions and W-EVIDENCE until Work/Codex decide (F-018). |
| Worker restart / quarantined restore procedure | Operator procedure, not a screen | Evidence via runbook artifacts (`docs/runbooks/OPERATOR.md`) |
| Organisation bootstrap | CLI, not a screen | Codex A00/A01 |

## 5. Status copy (generated from UI_COPY.json)

<!-- BEGIN GENERATED: status-copy -->
### Consent

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `NOT_GIVEN` | ○ Not given | You haven't agreed to this. | `state.consent.NOT_GIVEN.label`, `state.consent.NOT_GIVEN.portal` | design 0.1.0 |
| `GRANTED` | ● Given | You agreed on {changed_at}. | `state.consent.GRANTED.label`, `state.consent.GRANTED.portal` | design 0.1.0 |
| `WITHDRAWN` | – Withdrawn | You withdrew consent on {changed_at}. | `state.consent.WITHDRAWN.label`, `state.consent.WITHDRAWN.portal` | design 0.1.0 |

### Workflow

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `ACCEPTED` | ○ Accepted | Withdrawal recorded. Downstream actions are still being checked. | `state.workflow.ACCEPTED.label`, `state.workflow.ACCEPTED.detail` | UNRESOLVED F-013 |
| `RUNNING` | ◐ In progress | Planned actions are being carried out and checked. | `state.workflow.RUNNING.label`, `state.workflow.RUNNING.detail` | design 0.1.0 |
| `NEEDS_ATTENTION` | ! Needs attention | Required actions remain unresolved. | `state.workflow.NEEDS_ATTENTION.label`, `state.workflow.NEEDS_ATTENTION.detail` | design 0.1.0 |
| `COMPLETED` | ✓ Completed | Every required obligation in this workflow's declared scope met its approved completion criterion. | `state.workflow.COMPLETED.label`, `state.workflow.COMPLETED.detail` | design 0.1.0 |

### Action status (what was sent and what the system replied)

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `PENDING` | ○ Pending | Planned for this system. Not sent yet. | `state.action.PENDING.label`, `state.action.PENDING.detail` | design 0.1.0 |
| `RUNNING` | ◐ Sending | The local agent is sending the approved operation. | `state.action.RUNNING.label`, `state.action.RUNNING.detail` | design 0.1.0 |
| `ACKNOWLEDGED` | ↩ Acknowledged | Command acknowledged. Outcome not yet independently observed. | `state.action.ACKNOWLEDGED.label`, `state.action.ACKNOWLEDGED.detail` | design 0.1.0 |
| `EFFECT_UNKNOWN` | ? Outcome unknown | Outcome unknown. Reconciliation is required. | `state.action.EFFECT_UNKNOWN.label`, `state.action.EFFECT_UNKNOWN.detail` | design 0.1.0 |
| `FAILED` | ✕ Failed | The system reported a known failure ({failure_reason}). A timeout on its own is shown as Outcome unknown. | `state.action.FAILED.label`, `state.action.FAILED.detail` | UNRESOLVED F-009 |
| `MANUAL_REQUIRED` | ✎ Manual action required | Manual action required. Automated outcome not verified. | `state.action.MANUAL_REQUIRED.label`, `state.action.MANUAL_REQUIRED.detail` | design 0.1.0 |
| `SKIPPED` | – Not applicable | Skipped: {skip_reason}. | `state.action.SKIPPED.label`, `state.action.SKIPPED.detail` | UNRESOLVED F-009 |

### Observation (what ORVIA read separately)

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `NOT_CHECKED` | ○ Not observed | No independent observation yet. | `state.observation.NOT_CHECKED.label`, `state.observation.NOT_CHECKED.detail` | design 0.1.0 |
| `OBSERVED_SATISFIED` | ✓ Required state observed | Required state observed · {method} · {observed_at} · generation {generation} · fresh until {fresh_until} · scope {scope_summary}. | `state.observation.OBSERVED_SATISFIED.label`, `state.observation.OBSERVED_SATISFIED.detail` | UNRESOLVED F-012 |
| `OBSERVED_NOT_SATISFIED` | ! Required state not observed | Read by {method} at {observed_at}: found {observed_summary}; required {desired_summary}. | `state.observation.OBSERVED_NOT_SATISFIED.label`, `state.observation.OBSERVED_NOT_SATISFIED.detail` | UNRESOLVED F-012 |
| `UNVERIFIABLE` | ? Cannot be observed | ORVIA has no permitted way to read this system. This is not a pass. {known_limits} | `state.observation.UNVERIFIABLE.label`, `state.observation.UNVERIFIABLE.detail` | UNRESOLVED F-012 |
| `STALE` | ◷ Observation out of date | Observation is out of date. Recheck required. Last observed {observed_at}. | `state.observation.STALE.label`, `state.observation.STALE.detail` | design 0.1.0 |

### Reconciliation record (0.2.0 proposal, pending W00)

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `PENDING` | ○ Reconciliation queued | A reconciliation attempt is recorded and waiting to start. | `state.reconciliation.PENDING.label`, `state.reconciliation.PENDING.detail` | UNRESOLVED F-008 |
| `RECONCILING` | ◐ Reconciling | ORVIA is reading the system's state or receipt for the uncertain attempt. | `state.reconciliation.RECONCILING.label`, `state.reconciliation.RECONCILING.detail` | UNRESOLVED F-008 |
| `RESOLVED` | ✓ Reconciliation resolved | Resolved by {method} at {finished_at}; see the linked observation. The original attempt stays recorded as Outcome unknown. | `state.reconciliation.RESOLVED.label`, `state.reconciliation.RESOLVED.detail` | UNRESOLVED F-008 |
| `INCONCLUSIVE` | ? Reconciliation inconclusive | The read couldn't settle the outcome ({reason_code}). The action still needs attention. | `state.reconciliation.INCONCLUSIVE.label`, `state.reconciliation.INCONCLUSIVE.detail` | UNRESOLVED F-008 |
| `FAILED` | ✕ Reconciliation failed | The reconciliation attempt itself failed ({reason_code}). The action still needs attention. | `state.reconciliation.FAILED.label`, `state.reconciliation.FAILED.detail` | UNRESOLVED F-008 |

### Processing decision

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `ALLOW` | ✓ Allowed | The current authority and published policy permit this use for this purpose. | `state.decision.ALLOW.label`, `state.decision.ALLOW.detail` | design 0.1.0 |
| `BLOCK` | ✕ Blocked | The current authority doesn't permit this use for this purpose: {decision_reason}. | `state.decision.BLOCK.label`, `state.decision.BLOCK.detail` | UNRESOLVED F-025 |
| `INDETERMINATE` | ? Undecided — not sent | ORVIA couldn't reach a decision, so nothing was sent. For marketing, an undecided result is held or blocked, never sent. | `state.decision.INDETERMINATE.label`, `state.decision.INDETERMINATE.detail` | design 0.1.0 |

### Test result

| Stored value | Badge | Detail | Copy IDs | Binding |
|---|---|---|---|---|
| `NOT_RUN` | ○ Not run | No execution recorded. | `state.test.NOT_RUN.label`, `state.test.NOT_RUN.detail` | design 0.1.0 |
| `RUNNING` | ◐ Running | Assertions are executing now. | `state.test.RUNNING.label`, `state.test.RUNNING.detail` | design 0.1.0 |
| `PASS` | ✓ Passed | Every assertion in this run held. | `state.test.PASS.label`, `state.test.PASS.detail` | design 0.1.0 |
| `FAIL` | ✕ Failed — violation found | At least one assertion found behaviour that breaks the rule. See the assertion list. | `state.test.FAIL.label`, `state.test.FAIL.detail` | design 0.1.0 |
| `ERROR` | ! Error — could not finish | The run could not complete, so it proves nothing either way. | `state.test.ERROR.label`, `state.test.ERROR.detail` | design 0.1.0 |
| `SKIPPED` | – Skipped | Not executed: {skip_reason}. | `state.test.SKIPPED.label`, `state.test.SKIPPED.detail` | design 0.1.0 |

### Principal consent lines

| Stored value | Privacy Centre text | Copy ID |
|---|---|---|
| `NOT_GIVEN` | You haven't agreed to this. | `state.consent.NOT_GIVEN.portal` |
| `GRANTED` | You agreed on {changed_at}. | `state.consent.GRANTED.portal` |
| `WITHDRAWN` | You withdrew consent on {changed_at}. | `state.consent.WITHDRAWN.portal` |

### Supplementary status lines

| Copy ID | Text | Binding |
|---|---|---|
| `state.consent.detail` | Epoch {consent_epoch} · {changed_at} · notice {notice_version} | design 0.1.0 |
| `state.workflow.COMPLETED.scope` | Scope: {mapped_system_count} mapped systems. Systems not mapped in ORVIA are not covered. | design 0.1.0 |
| `state.workflow.COMPLETED.manual_note` | Includes {manual_count} obligations closed by an attributed manual statement. ORVIA did not independently observe those systems. | UNRESOLVED F-013 |
| `state.workflow.NEEDS_ATTENTION.summary` | {unknown_count} outcome unknown · {failed_count} failed · {manual_count} manual action required · {unverified_count} not independently observed | UNRESOLVED F-007 |
| `state.action.SKIPPED.missing_reason` | Skipped, but no reason was recorded. Treat this as unresolved. | design 0.1.0 |
| `state.decision.ALLOW.basis` | Checked: {authority_summary} · policy {policy_version} · evaluated {evaluated_at} | UNRESOLVED F-025 |
| `state.coverage.automated_observable.label` | Automated and observable | UNRESOLVED F-008 |
| `state.coverage.automated_observable.detail` | Operations: {operation_list}. Read method: {method}. | design 0.1.0 |
| `state.coverage.automated_unobservable.label` | Automated, cannot be observed | UNRESOLVED F-008 |
| `state.coverage.automated_unobservable.detail` | Changes can be sent, but ORVIA cannot read the result. | design 0.1.0 |
| `state.coverage.manual_only.label` | Manual only | UNRESOLVED F-008 |
| `state.coverage.manual_only.detail` | No supported API. ORVIA assigns a person and cannot change or read this system. | design 0.1.0 |
| `state.coverage.enforcement_point.label` | Enforcement point | UNRESOLVED F-018 |
| `state.coverage.enforcement_point.detail` | Checks current authority when a message is admitted. It is not a data target. | design 0.1.0 |
| `state.coverage.coverage_reduced.label` | Coverage reduced | UNRESOLVED F-008 |
| `state.coverage.coverage_reduced.detail` | Since {changed_at}, ORVIA cannot read this system. New observations will show Cannot be observed. | design 0.1.0 |
| `state.observation.method.SCOPED_READ` | scoped read | UNRESOLVED F-012 |
| `state.observation.method.PROVIDER_RECEIPT` | provider receipt | UNRESOLVED F-012 |
| `state.observation.method.NONE` | no observation method | UNRESOLVED F-012 |

<!-- END GENERATED: status-copy -->

## 6. Loading, empty, error and permission states (generated from UI_COPY.json)

<!-- BEGIN GENERATED: state-copy -->
| Copy ID | Audience | Semantic state | Text | Binding |
|---|---|---|---|---|
| `global.loading.page` | ALL | LOADING | Loading {page_name}… | design 0.1.0 |
| `global.loading.slow` | ALL | LOADING | Still loading. The local services may be busy. | design 0.1.0 |
| `global.loading.count` | STAFF | LOADING | Loading count… | design 0.1.0 |
| `global.count.unavailable` | STAFF | SERVICE_ERROR | Not available | design 0.1.0 |
| `error.staff.400` | STAFF | VALIDATION_ERROR | Check the highlighted fields. {field_errors} | design 0.1.0 |
| `error.staff.401` | STAFF | UNAUTHENTICATED | Your session has ended. Sign in again to continue. | design 0.1.0 |
| `error.staff.403` | STAFF | FORBIDDEN | You don't have permission to do this. Your role: {role_label}. Ask an organisation admin if you need access. | design 0.1.0 |
| `error.staff.404` | STAFF | NOT_FOUND_OR_INACCESSIBLE | Not found. It doesn't exist, or it isn't available to your account. | design 0.1.0 |
| `error.staff.409_version` | STAFF | VERSION_CONFLICT | This changed after you opened it. Reload to see the latest version, then try again. | design 0.1.0 |
| `error.staff.409_idempotency` | STAFF | IDEMPOTENCY_CONFLICT | This request reference was already used for a different change. Reload and try again. | design 0.1.0 |
| `error.staff.429` | STAFF | RATE_LIMITED | Too many requests. Wait a moment, then try again. | design 0.1.0 |
| `error.staff.503` | STAFF | SERVICE_UNAVAILABLE | A required service isn't available. If you were saving a change, it may or may not have been saved — reload to check before trying again. | UNRESOLVED F-024 |
| `error.staff.network_read` | STAFF | NETWORK_ERROR | Couldn't reach ORVIA. Check that the local services are running, then retry. | design 0.1.0 |
| `error.staff.network_change` | STAFF | OUTCOME_UNCONFIRMED | We couldn't confirm whether this change was saved. Don't start it again yet. Reload to check, then retry the same request if it still isn't there. | UNRESOLVED F-024 |
| `error.portal.400` | PRINCIPAL | VALIDATION_ERROR | Something in the request wasn't accepted. Reload the page and try again. | design 0.1.0 |
| `error.portal.401` | PRINCIPAL | UNAUTHENTICATED | Please sign in again. Your session has ended. | design 0.1.0 |
| `error.portal.403_404` | PRINCIPAL | NOT_FOUND_OR_INACCESSIBLE | This page isn't available. Go to Your choices. | design 0.1.0 |
| `error.portal.409_epoch` | PRINCIPAL | VERSION_CONFLICT | Your choice changed in another window or device. | UNRESOLVED F-024 |
| `error.portal.409_epoch.action` | PRINCIPAL | VERSION_CONFLICT | Load my latest choice | UNRESOLVED F-024 |
| `error.portal.409_epoch.reloaded` | PRINCIPAL | RELOAD_SUCCEEDED | We've loaded your latest choice. Check it before making a new choice. | UNRESOLVED F-024 |
| `error.portal.409_idempotency` | PRINCIPAL | IDEMPOTENCY_CONFLICT | This request doesn't match the one you started. Load your latest choice, then make your choice again. | UNRESOLVED F-024 |
| `error.portal.429` | PRINCIPAL | RATE_LIMITED | Please wait a moment and try again. | design 0.1.0 |
| `error.portal.503` | PRINCIPAL | SERVICE_UNAVAILABLE | The Privacy Centre can't finish this right now. Your choice may not have been saved. Check your current choice before trying again. | UNRESOLVED F-024 |
| `error.portal.503_not_saved` | PRINCIPAL | NOT_SAVED | We couldn't save your choice. Your previous choice is unchanged. | CONDITIONAL — do not display (F-024) |
| `error.portal.network_change` | PRINCIPAL | OUTCOME_UNCONFIRMED | We couldn't confirm whether your choice was saved. Don't make a new choice yet — first check what happened. | UNRESOLVED F-024 |
| `permission.read_only_auditor` | STAFF | FORBIDDEN | Read-only access. Your role can view this page but not change anything. | design 0.1.0 |
| `permission.view_only_member` | STAFF | FORBIDDEN | View only. You can act on tasks assigned to you. | design 0.1.0 |
| `permission.mfa_required` | STAFF | FORBIDDEN | Set up multi-factor authentication to continue. This action needs it. | design 0.1.0 |
| `permission.reauth_required` | STAFF | FORBIDDEN | Confirm it's you. Enter your authentication code to continue. | design 0.1.0 |
| `permission.principal_in_workspace` | PRINCIPAL | FORBIDDEN | This area is for organisation staff. You're signed in to the Privacy Centre. | design 0.1.0 |
| `permission.staff_in_portal` | STAFF | FORBIDDEN | Sign in with a Privacy Centre account. Staff accounts can't manage a person's choices. | design 0.1.0 |
| `permission.both_sessions` | ALL | FORBIDDEN | You're signed in to both the workspace and the Privacy Centre in this browser. Sign out of one, or use a separate browser window. | UNRESOLVED F-026 |
| `permission.action.go_to_choices` | PRINCIPAL |  | Go to your choices | design 0.1.0 |
| `permission.action.setup_mfa` | STAFF |  | Set up MFA | UNRESOLVED F-011 |
| `overview.empty` | STAFF | EMPTY | No workflows yet. A workflow starts when a person withdraws consent for a purpose that is mapped to systems. | design 0.1.0 |
| `attention.empty` | STAFF | EMPTY | Nothing needs attention in this scope. This covers systems mapped in ORVIA only. | design 0.1.0 |
| `workflows.empty` | STAFF | EMPTY | No workflows yet. They appear after a person changes a consent choice that needs system updates. | design 0.1.0 |
| `purposes.empty` | STAFF | EMPTY | No purposes yet. Create a purpose to describe why personal data is used. | design 0.1.0 |
| `notices.empty` | STAFF | EMPTY | No notices yet. A notice is the text a person reads before agreeing. | design 0.1.0 |
| `policies.empty` | STAFF | EMPTY | No policies yet. Draft a policy, then ask a different reviewer to publish it. | design 0.1.0 |
| `systems.empty` | STAFF | EMPTY | No systems added. Add one of the allowlisted demonstration systems. | design 0.1.0 |
| `principals.empty` | STAFF | EMPTY | No demo principals yet. Add fictional people for the demonstration. | design 0.1.0 |
| `evidence.gaps.empty` | STAFF | EMPTY | No unresolved gaps are recorded for the mapped systems. Systems outside ORVIA's map are not covered. | design 0.1.0 |
| `evidence.empty` | STAFF | EMPTY | Choose a workflow to see its evidence. | design 0.1.0 |
| `testlab.empty` | STAFF | EMPTY | No test runs yet. Nothing has been executed in this environment. | design 0.1.0 |
| `capabilities.unavailable` | STAFF | EMPTY | Capability register not available. No list is shown rather than a guessed one. | UNRESOLVED F-002 |
| `choices.empty` | PRINCIPAL | EMPTY | There are no choices for you to manage right now. | design 0.1.0 |
| `receipts.empty` | PRINCIPAL | EMPTY | No receipts yet. You get one each time you make or change a choice. | UNRESOLVED F-016 |
| `recovery.portal.heading` | PRINCIPAL | OUTCOME_UNCONFIRMED | Your last request is unconfirmed | UNRESOLVED F-024 |
| `recovery.portal.body` | PRINCIPAL | OUTCOME_UNCONFIRMED | You asked to {requested_change} at {requested_at}. We don't yet know whether it was saved. Retrying the same request is safe: if it was already saved, you'll get the original receipt. | UNRESOLVED F-024 |
| `recovery.portal.retry_same` | PRINCIPAL | OUTCOME_UNCONFIRMED | Retry the same request | UNRESOLVED F-024 |
| `recovery.portal.check` | PRINCIPAL | OUTCOME_UNCONFIRMED | Check my current choice | UNRESOLVED F-024 |
| `recovery.portal.new_choice_note` | PRINCIPAL | OUTCOME_UNCONFIRMED | A new choice is a separate request. You can make one after this request is settled. | UNRESOLVED F-024 |
| `recovery.portal.resolved_saved` | PRINCIPAL | RECOVERED_ORIGINAL_RECEIPT | Your earlier request was saved. Here is its receipt. | UNRESOLVED F-024 |
| `recovery.portal.resolved_conflict` | PRINCIPAL | VERSION_CONFLICT | Your choice changed before this request could be applied. We've loaded your latest choice. | UNRESOLVED F-024 |
| `recovery.staff.retry_same` | STAFF | OUTCOME_UNCONFIRMED | Retry the same request | UNRESOLVED F-024 |
| `error.retry.NEVER` | ALL | NEVER | This can't be retried. | UNRESOLVED F-024 |
| `error.retry.REAUTHENTICATE` | ALL | REAUTHENTICATE | Sign in again, then retry. | UNRESOLVED F-024 |
| `error.retry.REFRESH` | ALL | REFRESH | Reload the page, then try again. | UNRESOLVED F-024 |
| `error.retry.SAME_IDEMPOTENCY_KEY` | ALL | SAME_IDEMPOTENCY_KEY | Retry the same request. Don't start a new one. | UNRESOLVED F-024 |
| `error.retry.AFTER_DELAY` | ALL | AFTER_DELAY | Wait a moment, then try again. | UNRESOLVED F-024 |
| `error.staff.409_generation` | STAFF | STALE_GENERATION | The target record changed since this action was planned. ORVIA won't apply the old action. | UNRESOLVED F-008 |
| `error.any.unsupported_version` | ALL | UNSUPPORTED_VERSION | This page is out of date. Reload to continue. | UNRESOLVED F-011 |
<!-- END GENERATED: state-copy -->

**Rules for these states**

- **Error reference.** Every error surface adds `global.error.reference` with `global.action.copy_reference` when the server returns a `request_id`. No stack traces, raw request bodies or secrets.
- **Loading.**
  - Skeletons carry no digits.
  - After 10 s, add `global.loading.slow`.
  - Mutation buttons show their own loading text and are disabled until the response arrives.
- **Staff vs principal errors.**
  - Cross-tenant and cross-principal access use the same not-found copy, so nothing reveals that a resource exists (F-014 fixes the HTTP code).
  - Principals get one message for 403 and 404.
- **Service unavailable.** `error.*.503` uses outcome-unconfirmed wording because a generic 503 cannot prove that nothing was saved. `error.portal.503_not_saved` is **conditional and must not be displayed** until an accepted contract gives an explicit no-commit signal and tests prove it (F-024). Follow the response's `retry` hint (`error.retry.*`) where the accepted contract provides one.
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
| F-002 | Capability register absent |
| F-006 | Receipt and current-progress values (0.2.0 proposed) |
| F-007 | Overview counts and the meaning of `unverified` |
| F-008 | Reconciliation record (0.2.0 proposed); quarantine, stale-event, retry-permitted and coverage-loss representations |
| F-009 | Skip and failure reason text |
| F-010 | Expected fault detection and scenarios (0.2.0 proposed) |
| F-011 | Build metadata and MFA enrolment |
| F-012 | Observation methods and limits (0.2.0 proposed) |
| F-013 | Attested manual completion criterion |
| F-014 | 404 vs 403 |
| F-016 | Receipt list route |
| F-017 | Notice publish route, lifecycle values, service purpose in the portal |
| F-018 | Send-admission view |
| F-023 | Sign-in and MFA labels (auth library) |
| F-024 | Uncertain-write recovery and no-commit assurance |
| F-025 | Purpose-specific decision explanation |
| F-026 | Dual-session rule |
