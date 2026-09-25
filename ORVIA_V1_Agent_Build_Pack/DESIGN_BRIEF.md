# ORVIA — Design brief and screen specifications

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Interface requirements for the complete supported V1 experience; reuse existing UI assets and working interactions.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## 1. Design objective

Make privacy operations understandable and actionable without concealing limits. Every action should answer **WHAT / WHY / WHERE / WHO / WHEN / RESULT / EVIDENCE**. The first view should identify outstanding work and accountable next steps; detail views explain exact scope, versions, observation freshness and unsupported boundaries. The product should feel coherent across modules, not like unrelated pages collected under one navigation. Sources: [§3](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-3), [§102](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-102), [§103](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-103), [§104](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-104), [§106](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-106), [§184](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-184).

**Design stance:** calm, operational, readable. Reuse the prototype's existing coherent components where suitable. Do not redesign the brand, install another component framework or add decorative dashboards solely to demonstrate activity. Existing visual tokens are an implementation starting point, not proof of accessibility. New token names/spacing/patterns below are DESIGN proposals, not approved branding.

## 2. Four authority-aware experiences plus public entry

| Experience | Header/context | Required navigation | Forbidden presentation |
|---|---|---|---|
| Public vendor website | ORVIA product + supported release claims | Product, editions, deployment, docs, security/trust, reviewed readiness, login | Certification/no-vulnerability claims; collection of operational estate data without review |
| ORVIA Account | Commercial organisation + commercial role | Overview, licences, downloads, billing, designated/commercial contacts, updates/security, support, guides | Runtime request/client/staff directory, live operational health or remote launch proxy |
| Vendor staff console | Vendor role + assigned organisation/case | Organisations, assigned cases, permitted reports, advisories/releases, staff/audit | Customer impersonation, remote session, raw client logs or database browser |
| Customer Workspace | Organisation/legal entity/environment + local role + operating mode | Dashboard, Privacy Graph, Purposes, Policies, Consent, Privacy Requests, Retention, Systems, Processors, Controls, Testing, Incidents, Evidence, Reports, Integrations, Settings | Vendor telemetry, fake completion, unstated cross-scope counts |
| Customer Privacy Centre | Customer branding + language/help + principal context | Privacy information, choices, requests/status, grievance, supported representation | Vendor billing login, staff admin navigation or another principal's records |

Navigation grouping is allowed; original product capabilities are not removed. Portal public access and admin private exposure are different deployment paths, even when components share source. Sources: [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§33](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-33), [§34](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-34), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§102](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-102), [§103](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-103).

## 3. Role-oriented landing views

Privacy/DPO: deadlines, requests, required approvals, processor responses and unresolved verified-outcome gaps. Engineering: integration checks, changes, impacted controls, regressions and technical next actions. Auditor: scoped history, evidence, method and limitations, read-only by default. Organisation owner/IT: identity, local health, connectivity, licence validity, updates, backups/recovery and data boundary. Members: only assigned tasks and permitted views.

A vendor support engineer sees an assigned case queue and timestamped submitted facts, not the customer's operational landing view. Commercial contacts see purchase/support responsibilities, not current local role assertions. Menu hiding helps orientation; APIs remain the access boundary.

## 4. Required reusable interaction components

| Component | Behaviour contract | Avoid |
|---|---|---|
| Scope header/switcher | Only scopes actually authorised by server; explicit environment and current mode | Client-written tenant context or silent production switch |
| Paged data table | Server filters/cursor; clear empty/error/partial states; accessible headers/actions | Unbounded browser dump; fake total from current page length |
| Status plus freshness | Text, symbol and timestamp/method; as-of context visible | Green alone; indefinite fresh/verified badge |
| Timeline | Occurrence/recording/observation/approval distinguished; corrections visible | Reordering solely by client clock or changing historical facts |
| Plan review | Exact actions/resources/generations, risks, budgets, approvals and digest/version | Generic “Are you sure?” for destructive scope |
| Evidence link/panel | Only authorised refs; method, source/version, limits and integrity separately | “Proof” badge that implies universal legal truth |
| Form / wizard | Accessible labels, inline errors + summary, progress by real checkpoints | Silent privilege escalation or guessed next-step success |
| Background-operation card | Receipt/id/status and bounded refresh, resume after reload | Timer animation pretending actual progress |
| Notification / action feedback | Separate Accepted, Pending, Applied, Observed and Failed | Success toast on request submission for unfinished effects |
| Rule/runbook help | Source/version and read-only recommended step, direct human support | AI badge, model confidence or action execution from text |
| Restricted file preview | Validated local preview with scope/provenance | External URL rendering or raw uploaded active content |
| Capability limitation | Supported profile/connector/action explanation and honest alternative | Fake enabled action or hiding an unimplemented required feature from tracking |

## 5. Screen catalogue and acceptance contracts

The screen names below are implementation targets. They do not require one file or one route per row. Preserve current URLs where compatible; new route names belong in the canonical contract/route owner.

| Screen ID | Screen / main data | Main permitted action | Failure/permission/acceptance rule | Flow |
|---|---|---|---|---|
| WEB-01 | Product/editions/security/deployment | Compare supported offer, navigate to purchase/docs | Claims match released support evidence; no invented prices/certificates | FLOW-01 |
| WEB-02 | Readiness questionnaire | Submit approved non-operational fields | Field set requires §31/§135 review; result is gaps/assumptions, not certificate | FLOW-01 |
| ACC-01 | Commercial overview and designated contacts | Edit necessary commercial contacts | Does not synchronise local users or create runtime authority | FLOW-01, FLOW-25 |
| ACC-02 | Orders/subscription/invoices | Purchase/renew/change plan through approved provider | Pending/failed/refunded separated; browser redirect not paid truth | FLOW-01, FLOW-20 |
| ACC-03 | Licences/download catalogue | Download eligible signed ZIP/licence | Host profile chosen explicitly; download does not mean installed | FLOW-01, FLOW-02 |
| ACC-04 | Own support cases | Submit business case / approved diagnostic | No raw operational attachments; case scope server-enforced | FLOW-19 |
| VEN-01 | Assigned Organisations list/detail | Inspect business/licence/contact facts | No client/staff activity tables, no runtime proxy | FLOW-25 |
| VEN-02 | Support case detail | Request reviewed diagnostic, assign case, publish guidance | Exact allowed receipt only, current assignment checked | FLOW-19, FLOW-25 |
| VEN-03 | Fix/advisory/release record | Grant download eligibility / reviewed publication | Not customer execution authority; signing duty separate | FLOW-21 |
| VEN-04 | Vendor staff/audit | Grant delegated vendor permissions | No self-elevation/runtime role inheritance | FLOW-25 |
| SET-01 | Protected setup and local recovery readiness | Claim installation, set owner/MFA/recovery | Claim single-use; one primary owner; no vendor password | FLOW-02 |
| SET-02 | Members/roles/environments | Invite/delegate/revoke/transfer owner | Explicit admin-grant; no last-owner loss/cross-subtenant access | FLOW-03 |
| SET-03 | Data boundary/local health | Inspect approved egress, stores, tests, version | Configured/observed/tested/stale/not-tested distinguished | FLOW-02, FLOW-22 |
| SET-04 | Licence/update/backup | Import licence, approve update, run local backup procedure | Safe continuity, trusted artifacts, explicit impacts | FLOW-20–FLOW-22 |
| INT-01 | Connector catalogue/setup | Configure scoped local connection | No database secrets sent to vendor; read-only first | FLOW-04 |
| INT-02 | Capabilities/mappings/health | Validate permission, review mapping, change mode | Connected is not safe-to-delete; capability loss visible | FLOW-04, FLOW-06 |
| IMP-01 | Local import/preview/results | Map/validate/approve supported import | Quarantine, partial/conflict review, no live-source implication | FLOW-05 |
| GRA-01 | Graph/search/inventory | Explore/review declared/observed relations | Accessible list alternative, authorisation and freshness | FLOW-06 |
| GOV-01 | Purpose/notice/policy versions | Draft/review/preview/publish | Exact source/version and independent approval preserved | FLOW-07 |
| CON-01 | Consent history/current state | Permitted review or configured interaction | Historic receipt versus current epoch distinct | FLOW-08 |
| REQ-01 | Request list/detail/identity review | Scope/assign/plan/respond | Own/mandate authority; third-party redaction; close not verified | FLOW-10, FLOW-11 |
| WRK-01 | Plan/action/approval detail | Approve/reconcile/pause/manual attest | Exact digest/generation/version; no blind unknown retry | FLOW-12 |
| CTL-01 | Control list/detail/admission preview | Inspect scope/decision/last test/observation | Preview not executable permission; limitation visible | FLOW-09 |
| COV-01 | Coverage/failure centre | Assign/review/reconcile known gaps | Denominator/exclusions and overlapping counts explicit | FLOW-06, FLOW-12 |
| RET-01 | Retention/copy/hold/delete plan | Review eligibility/hold/plan | No universal longest-duration or backup-erased claim | FLOW-13 |
| PRO-01 | Processor/assessment/finding | Review scope, assign remediation | Questionnaire not runtime verification | FLOW-14 |
| INC-01 | Incident timeline/obligations | Review triggers/drafts/dispatch evidence | Independent clocks; no universal notified checkbox | FLOW-15 |
| EVI-01 | Evidence/report/export | Inspect scope and create allowed local export | Purged content/expired links and integrity limits visible | FLOW-16 |
| TST-01 | Test definition/run/assertions | Run scoped synthetic/CI tests | Real expected/actual; FAIL/ERROR/interrupted distinct | FLOW-17 |
| CHG-01 | Drift/simulation/control package | Review impact and approve supported change | No hidden production mutation; incomplete graph stated | FLOW-18 |
| SUP-01 | Local support/report preview | Run diagnostic, preview, approve this report | No automatic send, remote session or free-form report text | FLOW-19 |
| HLP-01 | Optional guidance/search | Read versioned help / suggested runbook | No model, no auto-action, direct support available | FLOW-24 |
| OFF-01 | Export/offboarding checklist | Export/revoke/handoff | Existing restrictions/evidence and legal retention handled | FLOW-23 |
| POR-01 | Principal notices/choices/history | Grant/withdraw own purpose | Clear notices, comparable withdrawal access, no extra acceptance | FLOW-08 |
| POR-02 | Principal request/status/response | Submit/review own request/response | Non-enumeration, appropriate verification, expiring local delivery | FLOW-10 |
| POR-03 | Principal representation/grievance/help | Manage supported mandate/request help | No takeover/unrelated-person disclosure | FLOW-11 |

## 6. State language: exact meanings

Keep canonical transport enums and domain states separate from translated labels. Existing prototype `EFFECT_UNKNOWN` is not silently renamed to the master's conceptual `OUTCOME_UNKNOWN`; any mapping is explicit. Use “Accepted” for durable intake, “Action acknowledged” for a provider reply, “Observed satisfied at …” for supported observation, “Manual statement received” for attestation, “Outside automated verification” for unsupported readback, and “Stale observation” when validity elapsed.

For vendor status, use **Not reported**, **Last reported**, **Report received**, **Customer-reported resolution**. Licence renewal or download cannot refresh runtime health. For policy, show Draft/Review/Approved/Published/Superseded/Archived with version history, not an editable published record. For imports, show snapshot/declaration and source date, not “live system connected.”

Never use “100% compliant”, “unbreachable”, “all deleted” or “verified everywhere” without evidence supporting the precise scoped claim; a general legal guarantee is not an approved claim. Source: [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§151](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-151), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168), [§169](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-169).

## 7. Complete screen-state requirements

Every applicable screen handles: initial loading, authorised populated data, authorised empty data, empty filter, read-only, missing permission, unauthenticated, expired session, validation error, conflict/stale revision, unavailable dependency, unsupported operation, partial result, unknown external effect and complete/observed result. Do not duplicate permission errors as ordinary empty lists; use safe non-enumerating behaviour for public principal endpoints.

Mutation forms retain safe unsent values through validation, but do not persist sensitive drafts in unrestricted browser storage. Session reauthentication must preserve user intent without replaying an expired destructive approval. On version conflict, show refresh/review rather than resubmitting a stale mutation automatically. Display unsaved edits and disable repeated submission while preserving server idempotency.

Background work returns a stable receipt; the page can reload to current server state. A client timer is only a refresh mechanism, not a source of completion truth. Error messages expose a safe code and permitted support route, not secrets, SQL, stack traces or internal hostnames.

## 8. Visual-system direction

Reuse existing component tokens after inspection. Define semantic surface/text/border/focus/info/warning/error/success roles rather than hard-coded colour meaning in individual modules. Status always includes text/symbols; colour is supplementary. Use consistent spacing/type hierarchy, readable table rows, sensible line lengths and progressive disclosure of technical fields. Keep long identifiers copyable only where authorised, but do not hide all context behind truncated strings.

Use responsive layouts: wide operational tables can offer column choices and controlled horizontal scroll; important actions/status remain visible on narrow screens. Principal interactions prioritise simple sequential forms. Avoid gratuitous animation, decorative threat maps, live counters without a data source, tiny dense legal text or a mandatory graph canvas for navigation. No external fonts/assets/analytics in the customer bundle.

**DESIGN proposal for evaluation:** target relevant WCAG 2.2 AA criteria across complete journeys, with a documented assessment scope. The W3C specification provides testable accessibility criteria; passing a few automated scans is not a conformance claim. [T4 in the decision register.] Confirm keyboard navigation, focus restoration, accessible names/errors, screen-reader status messages, zoom/reflow, contrast and non-colour cues. Test with representative principal languages and low-bandwidth conditions. This pack does not assert a completed accessibility assessment.

## 9. Localisation and content ownership

Store user-facing strings in the existing suitable localisation mechanism. Keep original API enums stable. Notice/legal text is reviewed and versioned independently from UI translation. English-first administration does not excuse missing required notice/principal language paths. Dates include explicit timezone where material; amounts/currency originate from commercial records. Do not auto-translate legally significant notice content through an external model or generate unreviewed legal conclusions.

D10 owns interaction/content/accessibility specification; D09 owns shared frontend implementation; D11 owns principal journey implementation; domain owners verify status meaning; D14/D15 review security and D18 verifies actual behaviours. Vendor contact/privacy wording needs the designated product/privacy reviewer. Sources: [§19](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-19), [§102](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-102), [§155](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-155), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165).

## 10. Design acceptance

Review every screen against its source/flow/permission contract. Run representative journeys across the declared browser/device matrix using isolated synthetic fixtures. Verify tab order, focus, error recovery, approval expiry, reload/retry, real API binding, no vendor data/asset traffic and no fabricated outcomes. A polished screenshot does not pass a state, permission or API test.

Create new component files only for a current feature or real shared responsibility. Reuse one table/form/timeline/status implementation rather than create module-specific copies. Avoid exporting server-only logic through a UI barrel. Maintain design documentation here rather than generate a new brief per page. Actual builds remain the evidence.
