# ORVIA — User flows and interaction contracts

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Complete outcome paths with actors, preconditions, failure branches and stored results for V1.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## How to read these flows

These are source-derived journeys with proposed interaction sequencing. They are not implemented endpoints or clickable screens. Screen destinations are labels, not fixed URL contracts. Use the canonical schemas when binding real routes. Every flow inherits server-side authorisation, scope, idempotency, audit, safe errors and the data boundary.

The vendor website supplies software. Customer Workspace/Privacy Centre perform privacy operations. A caller's browser closing does not cancel accepted durable work; stopping the hosting server does affect availability. No flow sends customer operational data to vendor services.

| Flow | Outcome | Surface |
|---|---|---|
| [FLOW-01](#flow-01) | Purchase, licence and product download | ORVIA Account |
| [FLOW-02](#flow-02) | Protected installation and first local owner | Local installer and Workspace setup |
| [FLOW-03](#flow-03) | Invite, delegate, revoke and transfer ownership | Workspace → Members & Roles |
| [FLOW-04](#flow-04) | Guided live database/API connection | Workspace → Integrations |
| [FLOW-05](#flow-05) | Local file import or manual registration | Workspace → Import / relevant form |
| [FLOW-06](#flow-06) | Discover, review and explore the graph | Workspace → Privacy Graph / Systems |
| [FLOW-07](#flow-07) | Purpose, notice and policy publication/change | Workspace → Purposes / Notices / Policies |
| [FLOW-08](#flow-08) | Grant and withdraw purpose-specific consent | Customer Privacy Centre |
| [FLOW-09](#flow-09) | Runtime privacy-control admission | Supported SDK/API/middleware boundary |
| [FLOW-10](#flow-10) | Rights request intake and identity scoping | Privacy Centre → Request; Workspace → Privacy Requests |
| [FLOW-11](#flow-11) | Nomination, guardian and authority change | Privacy Centre / Workspace → Representation |
| [FLOW-12](#flow-12) | Plan approval, effect uncertainty and reconciliation | Workspace → Workflows / Action Plan |
| [FLOW-13](#flow-13) | Retention, legal hold and copy-level deletion | Workspace → Retention |
| [FLOW-14](#flow-14) | Processor assessment and remediation | Workspace → Processors / Assessments |
| [FLOW-15](#flow-15) | Incident response and multiple notification clocks | Workspace → Incidents |
| [FLOW-16](#flow-16) | Evidence, reports and offline integrity validation | Workspace → Evidence / Reports |
| [FLOW-17](#flow-17) | Create, run and integrate privacy regression tests | Workspace → Testing and supported CLI |
| [FLOW-18](#flow-18) | Drift and change-impact simulation | Workspace → Controls / Change Review |
| [FLOW-19](#flow-19) | Customer support and per-report diagnostics | Local Support → ORVIA Account / vendor case console |
| [FLOW-20](#flow-20) | Renewal, edition change and licence continuity | ORVIA Account → Local licence administration |
| [FLOW-21](#flow-21) | Customer-applied update or support hotfix | Downloads → Local Updates |
| [FLOW-22](#flow-22) | Backup, restore and safe resumption | Customer-local operations |
| [FLOW-23](#flow-23) | Offboarding and customer export | Workspace → Export/Offboard; ORVIA Account → subscription/privacy |
| [FLOW-24](#flow-24) | Rules-based Guided Assistance | Workspace → contextual Help |
| [FLOW-25](#flow-25) | Vendor organisation and case administration | Vendor console → Organisations |

<a id="flow-01"></a>

## FLOW-01 — Purchase, licence and product download

**Actor:** Commercial Owner / Billing or Download Contact. **Surface:** ORVIA Account.

**Source:** [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§83](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-83), [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§159](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-159). **Preconditions:** An approved catalogue and actual payment/provider integration exist; the contact has commercial permissions.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Review edition, supported deployment profile, purchased limits and continuity terms before checkout. |
| 2 | Create the order using server-side catalogue values and only necessary business/contact/billing information. |
| 3 | Verify payment through the approved server/provider channel. Keep pending/failed status until confirmed; never trust a redirect query string. |
| 4 | Issue the idempotent signed entitlement and authorised release download. Show exact version, profile, digest and verification instructions. |
| 5 | Download the full ZIP and separately signed licence, optionally wrapped together without changing product binaries. |

**Alternates and failures:** Duplicate payment callback returns the existing commercial outcome. Payment pending does not create a fake paid licence; an offline customer obtains a permitted manual/offline licence route if actually supported. Downloading from Windows does not force a Windows hosting package; no cloud/database credentials requested.

**Postcondition:** Vendor stores commercial facts only. The product is downloaded, not yet installed or healthy.

**Acceptance links:** T41, UX-02, UX-07, VM-01.

<a id="flow-02"></a>

## FLOW-02 — Protected installation and first local owner

**Actor:** Customer IT and nominated local owner. **Surface:** Local installer and Workspace setup.

**Source:** [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§86](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-86), [§94](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-94). **Preconditions:** Customer controls a supported host, network, storage and identity process; signed release and licence available.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Verify trusted signer, manifest/digests, profile/architecture and safe archive contents before execution. |
| 2 | Validate runtime, TLS, private admin/public portal exposure, storage, secret references, backup and approved egress. |
| 3 | Import and verify licence locally. Present the exact vendor-data boundary and disabled diagnostics defaults. |
| 4 | Consume the protected single-use setup claim; create one primary Organisation Super Admin, enrol MFA and establish tested customer-held recovery. |
| 5 | Close setup; run synthetic health/boundary tests before attaching real data. Distribute the customer Workspace address directly. |

**Alternates and failures:** Wrong signature/profile blocks setup; partial setup resumes without erasing existing secrets/data. Concurrent claims must produce one owner; setup cannot reopen after restart. Missing model/GPU is expected V1 state, not a failed preflight.

**Postcondition:** An activated customer installation with one owner, local keys/storage and explicit readiness evidence; not a universal production certification.

**Acceptance links:** T42–T45, T56, UX-10, UX-11, VM-11, VM-14.

<a id="flow-03"></a>

## FLOW-03 — Invite, delegate, revoke and transfer ownership

**Actor:** Organisation Super Admin or expressly delegated administrator. **Surface:** Workspace → Members & Roles.

**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84). **Preconditions:** Authenticated local authority with current delegable scope and required reauthentication.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Choose member or explicitly delegable admin capability-set and environment/subtenant; show privileges that will be granted. |
| 2 | Send a protected expiring invitation through customer-approved identity/delivery; invitee establishes its own credentials. |
| 3 | At acceptance, recheck token single use, eligibility, current inviter authority and scope; persist membership/role grant and audit. |
| 4 | Suspend/revoke access immediately through local session/service policy. Owner transfer separately validates successor and replaces the single assignment transactionally. |
| 5 | Use customer-held recovery for lost owner authority; no vendor reset or hidden second owner. |

**Alternates and failures:** Member-management alone cannot grant admin privileges. Changed/expired/replayed invitation or revoked inviter rejects safely. Concurrent transfers conflict; losing MFA does not authorise vendor impersonation.

**Postcondition:** Authoritative local membership state and attributable audit. Vendor designated contacts do not automatically change.

**Acceptance links:** ROLE-01–ROLE-10, VM-02, VM-11–VM-14.

<a id="flow-04"></a>

## FLOW-04 — Guided live database/API connection

**Actor:** Engineering/Security Admin with connector-setup permission. **Surface:** Workspace → Integrations.

**Source:** [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§172](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-172), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178). **Preconditions:** Supported adapter selected; customer DBA/IT can provision dedicated permissions and connectivity.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Select connector/version and explicit test/production environment. Choose discovery/read/verify and any separately required mutations. |
| 2 | Enter local endpoint/TLS and approved network route; bind a customer-held secret or workload identity, never vendor credentials. |
| 3 | Run bounded connectivity and permission checks; show observed capability and failure reasons. |
| 4 | Select approved schemas/resources/fields and identity/purpose mappings; review ambiguity and data destination. |
| 5 | Preview scope and budgets, run a synthetic/dry-run check, activate Observe mode; enable approved enforcement only after separate mutation checks/approval. |

**Alternates and failures:** Missing privileges show an actionable prerequisite; no TLS or auth bypass. Newly discovered fields are not automatically approved. Scope/credential/connector changes require revalidation; partial scan stays partial.

**Postcondition:** Versioned local connection, selected scope, secret reference and tested capability snapshot; no vendor source data.

**Acceptance links:** T17–T18, VM-15–VM-18, VM-24.

<a id="flow-05"></a>

## FLOW-05 — Local file import or manual registration

**Actor:** Authorised local data/privacy operator. **Surface:** Workspace → Import / relevant form.

**Source:** [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132). **Preconditions:** Supported import type/schema and allowed scope declared; local parser/storage available.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Upload locally or enter supported form data; file is quarantined and validated before parsing/import effects. |
| 2 | Record source date/type/digest; select explicit mappings and target scope. |
| 3 | Preview proposed creates/updates/rejections and identity/consent conflicts; freeze mapping/scope version for approval. |
| 4 | Run idempotent validated import under declared atomic/chunk semantics; store exact local results and provenance. |
| 5 | Purge unnecessary originals/staging/error payloads according to approved retention. |

**Alternates and failures:** Unsafe or unsupported file blocked without public scanning upload. Old consent=yes cannot overwrite a newer withdrawal. Rejected/partial rows are visible; changing mapping invalidates old preview; source CRM remains unchanged without a live adapter.

**Postcondition:** Local supported records with declared provenance; never a fabricated live integration or source-system deletion.

**Acceptance links:** VM-19–VM-22, T10.

<a id="flow-06"></a>

## FLOW-06 — Discover, review and explore the graph

**Actor:** Privacy/Engineering Admin. **Surface:** Workspace → Privacy Graph / Systems.

**Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§8](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-8), [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§105](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-105). **Preconditions:** Read-authorised connector or explicit customer declaration; bounded scan scope.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Start scoped discovery and capture snapshot/provenance/freshness. |
| 2 | Review discovered assets/fields/relationships and distinguish declared, observed and inferred suggestions. |
| 3 | Map purpose/category/system/processor/copy/control relationships with accountable owner and reviewed source. |
| 4 | Traverse or search the authorised graph, with accessible list/table alternative and exact historic version links. |
| 5 | Review changed relationship impact across policies, workflows, assessments and tests before enabling new processing. |

**Alternates and failures:** Partial pages, revoked scope and stale scan lower coverage. Field name alone never approves sensitive category/purpose. Cross-tenant or unsupported relationships rejected; unknown estate is not absent estate.

**Postcondition:** Reviewed inventory relationships and explicit coverage/impact, not a claim of complete discovery.

**Acceptance links:** T04, T17, T18, T34.

<a id="flow-07"></a>

## FLOW-07 — Purpose, notice and policy publication/change

**Actor:** Privacy author and distinct required reviewer. **Surface:** Workspace → Purposes / Notices / Policies.

**Source:** [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§13](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-13), [§14](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-14), [§15](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-15), [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§19](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-19), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§167](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-167). **Preconditions:** Reviewed processing conditions/applicability and supported systems; author has configuration authority.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Draft a versioned purpose scope with categories, recipients, retention and owner; create matching notice/language content. |
| 2 | Draft policy decisions/obligations against reviewed source configuration and exact notice version. |
| 3 | Preview impact and classify editorial/translation/material changes; create notice/consent migration decision when required. |
| 4 | Submit exact version/digest to independent review and required reauthentication; reject any modification after approval. |
| 5 | Publish immutably, distribute signed approved projections and retain historic versions/receipts. |

**Alternates and failures:** Future-effective rule stays scheduled; unresolved legal fact blocks activation not drafting. Author cannot satisfy required independent review; changed digest requires new approval. Expanded purpose cannot inherit previous grants automatically.

**Postcondition:** A published immutable policy/notice version with attributable approval and controlled migration, not legal certification.

**Acceptance links:** T04–T05, T10, ROLE-07.

<a id="flow-08"></a>

## FLOW-08 — Grant and withdraw purpose-specific consent

**Actor:** Data Principal. **Surface:** Customer Privacy Centre.

**Source:** [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§18](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-18), [§19](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-19), [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99). **Preconditions:** Own authenticated identity and active reviewed notice/purpose; no requirement to create a vendor account.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Show exact notice/language, separate purpose choices and current consent state. |
| 2 | Submit affirmative grant or withdrawal with interaction/idempotency identity and expected epoch. |
| 3 | Validate authority and current state; atomically write event, aggregate epoch, immutable receipt and needed outbox work. |
| 4 | Return acceptance receipt immediately with honest propagation status; do not wait for all targets to call the request accepted. |
| 5 | Track resulting workflow/system outcomes locally, keeping acknowledgement, observation and manual gaps separate. |

**Alternates and failures:** Network retry returns same accepted result; epoch conflict requests refresh/new authorised interaction. Withdrawal never requires accepting an updated notice. Re-consent is a new authorised event; stale work cannot act on new record generation without review.

**Postcondition:** Accepted authoritative choice and durable follow-up with visible uncertainty; not instantaneous global recall of already sent messages.

**Acceptance links:** T06–T13, T26.

<a id="flow-09"></a>

## FLOW-09 — Runtime privacy-control admission

**Actor:** Customer application/service identity. **Surface:** Supported SDK/API/middleware boundary.

**Source:** [§13](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-13), [§18](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-18), [§40](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-40), [§41](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-41), [§42](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-42), [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43). **Preconditions:** Instrumented boundary with authorised machine identity and current policy/revocation configuration.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Call check/authorise with exact principal, purpose, action/resource/context and current scope. |
| 2 | Evaluate published policy/current authority and return decision, version, epoch, obligations, validity and reason codes. |
| 3 | At actual use, reject stale/mismatched scope and satisfy mandatory mask/restrict/record obligations. |
| 4 | Record the admitted/blocked result and applicable evidence through the local API; keep previews separate from authorisation. |

**Alternates and failures:** Policy failure, stale cursor or unavailable obligation adapter uses explicit approved degraded mode, never accidental ALLOW. An old ALLOW cannot be replayed for another recipient/action. Already handed-off external effects have a declared cancellation limit.

**Postcondition:** A tested supported boundary outcome, not a universal database firewall.

**Acceptance links:** T26, T28, T54, NFR-06.

<a id="flow-10"></a>

## FLOW-10 — Rights request intake and identity scoping

**Actor:** Data Principal / authorised representative; Workflow Operator. **Surface:** Privacy Centre → Request; Workspace → Privacy Requests.

**Source:** [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26). **Preconditions:** Available supported rights flow and appropriate proportionate identity process.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Choose request type and submit minimal required information with durable receipt. |
| 2 | Verify requester/mandate and map exact source identities, surfacing ambiguous/shared/recycled identifiers. |
| 3 | Determine systems/purposes/copies, relevant constraints and response scope; create a reviewable plan. |
| 4 | Execute approved actions through shared workflow and record partial/manual/unverified outcomes. |
| 5 | For access/correction response, review third-party redaction and release through expiring authenticated customer-local delivery; preserve request and response states independently. |

**Alternates and failures:** Ambiguous identity blocks disclosure/destruction, not basic public information. Revoked/expired mandate prevents new actions. Undeliverable response remains undelivered; CLOSED does not imply all systems erased.

**Postcondition:** A scoped request outcome and honest response/evidence, with unresolved destinations visible.

**Acceptance links:** T23–T25, T29, UX-04.

<a id="flow-11"></a>

## FLOW-11 — Nomination, guardian and authority change

**Actor:** Principal/representative with reviewer. **Surface:** Privacy Centre / Workspace → Representation.

**Source:** [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24). **Preconditions:** Customer-approved verification and applicable safeguards; no universal identity-document demand.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Record nomination or guardian authority as separate types with exact scope/validity and minimal supporting evidence. |
| 2 | Review creation/amendment/revocation and notify through an appropriate permitted channel. |
| 3 | On invocation, establish triggering authority and permitted rights; do not transfer general account ownership automatically. |
| 4 | Recheck authority at later privileged steps, including adulthood transition, changed guardianship or withdrawal of mandate. |

**Alternates and failures:** Disputed scope requires review. Disability alone does not establish lack of capacity. An expired attestation cannot authorise export; a revoked relationship stays revoked after retry.

**Postcondition:** Time-scoped representation linked to permitted requests, not a global substitute account.

**Acceptance links:** T24–T25.

<a id="flow-12"></a>

## FLOW-12 — Plan approval, effect uncertainty and reconciliation

**Actor:** Local reviewer/operator; worker/agent. **Surface:** Workspace → Workflows / Action Plan.

**Source:** [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99), [§174](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-174), [§175](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-175). **Preconditions:** Typed plan and supported adapter; precise identity, generation, policy and budget.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Preview intended targets, changes, risks, required permissions and verification limits. |
| 2 | Approve exact plan/digest with current authority and required maker/checker checks. |
| 3 | Worker dispatches signed scoped command; agent independently validates and attempts supported effect. |
| 4 | Record acknowledgement separately; if response lost, mark unknown and initiate supported read/receipt reconciliation. |
| 5 | Retry only after safe resolution/idempotence; otherwise assign review/manual task. Surface independent observation and remaining gaps. |

**Alternates and failures:** Changed scope or stale generation invalidates approval. Worker restart resumes durable state; an interrupted effect is not blindly repeated. Pause/revoke stops new action, cannot reverse a completed irreversible effect.

**Postcondition:** Attributable action/attempt/observation history and safe unresolved-state handling.

**Acceptance links:** T11–T22, T35.

<a id="flow-13"></a>

## FLOW-13 — Retention, legal hold and copy-level deletion

**Actor:** Privacy/Retention Admin and required approver. **Surface:** Workspace → Retention.

**Source:** [§50](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-50), [§51](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-51), [§52](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-52), [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132). **Preconditions:** Known copies/context and reviewed retention/hold basis; supported action paths.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Evaluate trigger and eligibility per copy/category/purpose; show conflicting obligations and permitted uses. |
| 2 | Create or review exact-scope hold/restriction, owner, review date and release criteria. |
| 3 | Build deletion/suppression plan separating live/derived/processor/backup outcomes and generation/budget limits. |
| 4 | Approve and execute supported operations; independently verify what can be observed and retain backup/unknown gaps. |
| 5 | On hold release or restore, re-evaluate current eligibility/restrictions before action or resumed processing. |

**Alternates and failures:** Generic business need or longest-duration rule cannot override everything. Shared key prevents unscoped crypto deletion. Backup-expiry future date is not current proof of erasure.

**Postcondition:** Purpose-restricted retained data plus verified eligible changes and explicit unverified copies.

**Acceptance links:** T31–T33, T55.

<a id="flow-14"></a>

## FLOW-14 — Processor assessment and remediation

**Actor:** Privacy/Compliance reviewer; processor owner. **Surface:** Workspace → Processors / Assessments.

**Source:** [§53](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-53), [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214). **Preconditions:** Customer-local processor inventory; reviewed assessment/applicability framework.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Register relationship, purpose/data/subprocessor scope, contract reference and owner. |
| 2 | Run assessment tied to systems/controls and source applicability; record findings and exceptions. |
| 3 | Assign remediation tasks with evidence/retest criterion; trigger impacted-control review when relationship changes. |
| 4 | Request processor action/acknowledgement through supported channel and track verification separately. |
| 5 | Close a finding only against its declared criterion, preserving unverified runtime gaps. |

**Alternates and failures:** No processor API creates a manual task, not a successful adapter. Unapproved subprocessor or expired review remains review-required. SDF obligations are not assumed from a company label.

**Postcondition:** Accountable processor/governance records linked to the shared control graph.

**Acceptance links:** T18, T34; §214 acceptance.

<a id="flow-15"></a>

## FLOW-15 — Incident response and multiple notification clocks

**Actor:** Security/Privacy Officer and authorised dispatch reviewer. **Surface:** Workspace → Incidents.

**Source:** [§54](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-54), [§55](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-55), [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§108](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-108). **Preconditions:** Approved severity/applicability rules, local notification channels and recipient authority.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Create incident; record occurrence/detection/awareness with evidence and unknowns. |
| 2 | Link affected data/systems/purposes/processors/controls and establish each relevant notification trigger. |
| 3 | Create independent recipient/regime tasks with reviewed deadline/draft/dispatch requirements. |
| 4 | Review factual draft and legal assertions, dispatch through supported authorised channel or create manual submission package. |
| 5 | Record actual delivery/acknowledgement separately, escalate overdue reviews and append corrected timestamps without erasing original clocks. |

**Alternates and failures:** No blanket all-notified flag from one delivery. No invented regulator filing channel; failed relay remains pending/failed. Missing applicability is visible and owned; severity does not automatically decide the law.

**Postcondition:** Evidence-linked timeline, independent obligations and auditable response decisions.

**Acceptance links:** T36–T37.

<a id="flow-16"></a>

## FLOW-16 — Evidence, reports and offline integrity validation

**Actor:** Auditor or evidence-export-authorised actor. **Surface:** Workspace → Evidence / Reports.

**Source:** [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§45](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-45), [§46](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-46), [§47](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-47), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§133](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-133), [§134](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-134), [§162](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-162). **Preconditions:** Authorised scope and retained records/payloads; supported export format.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Filter records by allowed scope/version/time and inspect gaps, timestamps and observation methods. |
| 2 | Request a local export; validate authority, purpose, permitted payload/redaction and resource limits. |
| 3 | Generate supported JSON/CSV/PDF/signed package with exact source refs, manifest, limitations and audited access. |
| 4 | Deliver through authenticated expiring local path. Run offline integrity validation when needed. |

**Alternates and failures:** Missing/purged payload disclosed; no reconstructed fake content. Expired/revoked link or wrong tenant denied before bytes. Integrity pass states what was recorded, not that every external event happened.

**Postcondition:** Scoped local evidence/report artifact with truthful verification and history limits.

**Acceptance links:** T04, T20–T22, UX-19.

<a id="flow-17"></a>

## FLOW-17 — Create, run and integrate privacy regression tests

**Actor:** Engineering Admin / scoped CI identity. **Surface:** Workspace → Testing and supported CLI.

**Source:** [§57](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-57), [§58](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-58), [§59](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-59), [§60](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-60), [§61](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-61), [§193](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-193). **Preconditions:** Approved synthetic scope, connector capabilities and test definition; no real production record mutation by default.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Define versioned scenario preconditions, steps, expected boundary outcomes, policy/context and cleanup. |
| 2 | Acquire fixture scope and run actual events/actions; independent assertions inspect target and evidence. |
| 3 | Record expected/actual/result by assertion, run/build/environment and interruption state. |
| 4 | Expose FAIL for deliberately broken control and link affected control/owner; repair and rerun, retaining failed history. |
| 5 | Publish machine-readable result to an approved customer CI path and release the fixture safely. |

**Alternates and failures:** Unsafe target scope denied; unavailable dependency is ERROR/BLOCKED, not PASS. Runner interruption preserves partial evidence/cleanup obligation. External CI destination follows customer disclosure rules, never a vendor telemetry default.

**Postcondition:** A reproducible control regression result independent from ORVIA's internal test suites.

**Acceptance links:** T27, T35.

<a id="flow-18"></a>

## FLOW-18 — Drift and change-impact simulation

**Actor:** Policy/Engineering reviewer. **Surface:** Workspace → Controls / Change Review.

**Source:** [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§179](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-179), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213). **Preconditions:** Versioned graph/inventory and proposed change; actor can read affected scope.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Detect observed/configured delta or submit proposed policy/system change. |
| 2 | Freeze current/proposed context and compute impacted purposes, controls, copies, tests and assessments. |
| 3 | Show assumptions and incomplete discovery; classify severity through reviewed rules. |
| 4 | Run approved synthetic/dry-run tests and submit exact change for review/publication. |

**Alternates and failures:** Missing graph data yields an explicit limited impact set. New recipient cannot silently inherit old processing approval. Simulation never mutates production to produce predicted evidence.

**Postcondition:** Reviewable impact and real test evidence, with no invented prediction certainty.

**Acceptance links:** T34–T35.

<a id="flow-19"></a>

## FLOW-19 — Customer support and per-report diagnostics

**Actor:** Customer Support Admin; assigned Vendor Admin. **Surface:** Local Support → ORVIA Account / vendor case console.

**Source:** [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§88](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-88), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96). **Preconditions:** Direct human support available; reviewed public diagnostic schema/runbook; optional guidance not required.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Open case through approved business channel; keep detailed local operational references local. |
| 2 | Run a bounded reviewed diagnostic locally and construct an allowlisted immutable report. |
| 3 | Preview exact fields, destination, purpose and retention; approve this payload/digest only. |
| 4 | Validate again and deliver/transfer the approved report with idempotent receipt; vendor checks assignment and schema without logging rejected bodies. |
| 5 | Vendor reproduces synthetically and publishes reviewed guidance/signed patch; customer applies locally and verifies. |

**Alternates and failures:** Forbidden field/free text/canary blocks transfer; changed payload requires new approval. No support session, remote command, proactive schedule or staff-directory sync can be enabled. Vendor closure and customer-reported resolution do not mark privacy action verified.

**Postcondition:** Minimal reported vendor facts plus separate authoritative local verification.

**Acceptance links:** SUP-01–SUP-10, VM-03–VM-10, VM-24.

<a id="flow-20"></a>

## FLOW-20 — Renewal, edition change and licence continuity

**Actor:** Commercial contact plus local owner. **Surface:** ORVIA Account → Local licence administration.

**Source:** [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43), [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§77](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-77), [§81](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-81), [§94](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-94), [§159](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-159), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160). **Preconditions:** Approved commercial terms/continuity table; supported signed licence process.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Purchase renewal/edition change and obtain the next signed entitlement. |
| 2 | Import/obtain through permitted minimal exchange and validate signature, installation and sequence/validity locally. |
| 3 | Evaluate release support, feature flag, entitlement and actor authority independently. |
| 4 | For expiry/downgrade, apply the reviewed operation-level continuity/hand-off policy while preserving restrictions, evidence and permitted export/recovery. |

**Alternates and failures:** Offline revocation cannot be instantaneous without a channel; display last verifiable state. Wrong/old document cannot enable disallowed features. Expiry never changes BLOCK to ALLOW or deletes client data.

**Postcondition:** Updated local entitlements with retained operating safety and no hidden vendor dependency.

**Acceptance links:** T29, T45, T55, UX-16.

<a id="flow-21"></a>

## FLOW-21 — Customer-applied update or support hotfix

**Actor:** Customer IT/local owner; vendor release staff separately. **Surface:** Downloads → Local Updates.

**Source:** [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§93](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-93), [§101](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-101), [§146](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-146), [§147](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-147), [§148](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-148), [§149](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-149). **Preconditions:** Eligible reviewed signed release and supported upgrade path; backup/recovery plan.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Vendor assigns download eligibility for release/hotfix; no execution command is sent. |
| 2 | Customer verifies provenance/signature/digests, compatibility, package safety and change scope. |
| 3 | Approve local maintenance; apply migrations/deployment using resumable compatible steps and workflow version strategy. |
| 4 | Run post-update identity, privacy boundary, data, regression and recovery checks before full service. |
| 5 | Record local result; report only specifically approved support facts if needed. |

**Alternates and failures:** Tamper/downgrade/extra-egress attempt rejected. Interrupted migration uses tested recovery, not improvised reset. No model or excluded remote-access/telemetry capability hidden in V1 patch.

**Postcondition:** Versioned maintained installation with preserved roles/consent/evidence and truthful local verification.

**Acceptance links:** T43, T54, UX-14, VM-09, VM-23.

<a id="flow-22"></a>

## FLOW-22 — Backup, restore and safe resumption

**Actor:** Customer IT/SRE and local recovery approver. **Surface:** Customer-local operations.

**Source:** [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160). **Preconditions:** Approved backup topology, keys and recoverable current safety/revocation information.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Create and verify encrypted scoped backups for domain/workflow/payload/configuration; keep them in customer-approved storage. |
| 2 | Restore into isolated quarantine, verifying release/schema/trust and backup completeness. |
| 3 | Reconcile latest available consent, holds, suppression, roles/invitations/owner and egress configuration from authoritative recovery records. |
| 4 | Rebuild projections, verify restrictions and measure observed data loss/recovery time before resuming affected processing. |

**Alternates and failures:** If current authority/safety cannot be established, stay restricted; vendor cannot override. Do not claim a newer restriction was recovered from the same older snapshot. No old proactive diagnostic rule or duplicate owner is resurrected.

**Postcondition:** Customer-controlled recovery with measured limits and explicit unsafe-resumption prevention.

**Acceptance links:** T30, T33, T53, VM-23.

<a id="flow-23"></a>

## FLOW-23 — Offboarding and customer export

**Actor:** Local owner and commercial contact independently. **Surface:** Workspace → Export/Offboard; ORVIA Account → subscription/privacy.

**Source:** [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160), [§161](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-161), [§162](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-162). **Preconditions:** Authorised export/termination request and retention/continuity policy; current unresolved obligations known.

| Step | Interaction and system responsibility |
|---|---|
| 1 | List configuration/evidence/report exports, outstanding workflows, connectors and retained records. |
| 2 | Generate scoped local exports and verify completeness/limitations. |
| 3 | Hand off/close supported obligations safely; revoke connector/machine/member authority and uninstall through approved procedure. |
| 4 | Handle vendor business-contact/service-data correction/deletion under its separate reviewed retention process. |

**Alternates and failures:** Ending subscription cannot silently wipe operational data. Unknown effects require handoff; deletion of vendor account does not prove local erasure. Backup retention limits disclosed; audit retained only with justification.

**Postcondition:** Usable local handover/export and deliberate access termination, without artificial lock-in or vendor client-data copy.

**Acceptance links:** T55, UX-19; §161 acceptance.

<a id="flow-24"></a>

## FLOW-24 — Rules-based Guided Assistance

**Actor:** Authorised local operator. **Surface:** Workspace → contextual Help.

**Source:** [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§157](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-157). **Preconditions:** Optional reviewed compatible rule/runbook pack; ordinary support/errors still work without it.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Read the typed observed error and only authorised minimal local context. |
| 2 | Match deterministic rule or full-text documentation, preserving source/pack/app versions. |
| 3 | Show recorded facts, match/no-match/insufficient-context, known limits and suggested reviewed diagnostic. |
| 4 | Any action returns to existing permission/plan/approval/verification; support export uses the exact schema flow, not free-form summary. |

**Alternates and failures:** Untrusted text is data, never tool instructions. No model/embedding service or training introduced. Unknown cause stays unknown; helper failure does not block core operations.

**Postcondition:** Useful bounded guidance visibly labelled rules-based, not a model or verified root cause.

**Acceptance links:** V1-04–V1-11, V1-16–V1-17.

<a id="flow-25"></a>

## FLOW-25 — Vendor organisation and case administration

**Actor:** Vendor Super Admin / assigned Vendor Admin. **Surface:** Vendor console → Organisations.

**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165). **Preconditions:** Vendor staff identity with current MFA/assigned account or case permission.

| Step | Interaction and system responsibility |
|---|---|
| 1 | Open only authorised organisation cards with business profile, necessary designated contacts and commercial/licence facts. |
| 2 | Inspect actual download events and last submitted version/diagnostics with report/receipt time, not assumed live health. |
| 3 | Assign/review a case, request a permitted diagnostic or make guidance/patch download eligible. |
| 4 | Audit vendor access and changes; maintain contact/service retention and privacy-request processes. |

**Alternates and failures:** No staff tab synced from runtime, employee activity, principal records or open-runtime/remote-session button. Unassigned cases deny server-side access even with guessed IDs. Accidental client-data submission is restricted and handled through minimisation/deletion, not normal debugging.

**Postcondition:** A limited vendor business/support record; no authority over a customer installation.

**Acceptance links:** VM-01–VM-10, VM-24.

## Interaction sequence — accepted withdrawal and unknown effect

```text
Principal      Customer API/DB       Durable Worker       Agent/Target      Observation
   | submit          |                    |                    |                |
   |---------------->| validate + scoped transaction           |                |
   |                 | epoch/event/receipt/outbox committed     |                |
   |<----------------| accepted (not target completion)          |                |
   |                 |------------------->| plan/approval       |                |
   |                 |                    |------------------->| attempt effect |
   |                 |                    |<-- lost response ---|                |
   |                 |<-------------------| record EFFECT_UNKNOWN                |
   |                 |                    |-------------------------------> read|
   |                 |<---------------------------------------------- observation|
   |<----------------| show actual result + method + scope + remaining gaps      |
```

The diagram illustrates responsibilities, not a cross-database transaction or exactly-once guarantee.

## Interaction sequence — support without remote access

```text
Local operator -> local diagnostic -> fixed schema -> exact preview + approval
                                                        |
                                        allowed immutable report only
                                                        |
Vendor Account/case <- validated receipt <- permitted customer-initiated transfer
        |
Assigned vendor engineer -> synthetic reproduction -> reviewed guidance/signed patch
                                                        |
Customer owner -> download/import -> verify -> approve/apply -> local outcome check
```

There is no vendor-to-runtime login, command tunnel, shared staff directory, automatic operational log stream or implied permission to transmit a new report.
