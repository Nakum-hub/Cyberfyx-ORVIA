# ORVIA — Engineering execution plan

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Dependency-based ownership and implementation work packages, without a calendar or day-by-day schedule.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## 1. Execution objective

Complete the remaining approved V1 scope in the existing project. Treat the current repository as a useful but incomplete fragment. Preserve verified semantics; finish missing integration, production configuration and modules. Work in small behaviour-complete changes: schema/contract, backend, UI where needed, auth/audit, tests and operating guidance together. Do not call a scaffold or unavailable required endpoint a completed feature.

This plan retains the original 20 role IDs, 36 work-package IDs and 33 module IDs from Appendix G, with its updated 1.4 details. Acceptance predecessors below are source dependencies, not a claim every predecessor must be coded serially from nothing: reuse and requalify the existing portions and parallelise independent work under accepted contracts. There is no project-duration estimate, day allocation or new scope reduction here. Sources: [§117](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-117), [§119](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-119), [§120](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-120), [§121](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-121), [§188](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-188), [§189](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-189), [§190](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-190), [§216](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-216).

## 2. Four development tracks

| Track | Primary outputs | Boundaries |
|---|---|---|
| ChatGPT Work | PRD/contract interpretation, design decisions, bounded tasks, integration and security review | Does not independently change shared contracts behind coders; does not certify its own product |
| Codex | Backend/data/policy/workflow/agent/connector/platform implementation and component/integration tests | One owner for schema/lockfile/shared contract changes; no accidental customer/prototype resource reset |
| Claude Cowork | UX states/content, independent scenario expectations, maintained runbooks and evidence organisation | Does not invent test passes, support commitments or new product scope |
| Claude Code | Feature UI, generated-client integration, browser/accessibility tests and approved scoped code tasks | No fake API fallback or duplicate backend schema to make screens complete |

The human is integration/release authority. The current AGENTS snapshot assigns some paths differently from this intended four-track baseline; record a human-authorised path/task transfer before edits, preserve provenance and do not overwrite concurrent work. Actual tool access and available human reviewers are not established by this pack.

## 3. Role register

The roles are responsibility hats, not a claim of twenty appointed staff. Existing titles are retained. D12/D13 perform deterministic V1 support/guidance/validation tasks only; model responsibilities stay with WP35 for V2.

| ID | Retained engineering responsibility | Current interpretation |
|---|---|---|
| D01 | Chief Architect / Technical Lead | Scope and ownership in the source Appendix G and linked work packages |
| D02 | Core Backend Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D03 | Privacy Control Graph Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D04 | Policy Engine Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D05 | Workflow / Distributed Systems Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D06 | Connector Platform Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D07 | Data Connector Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D08 | SaaS/API Integration Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D09 | Frontend Platform Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D10 | Product UX Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D11 | Data Principal Portal Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D12 | AI/ML Engineer | V1 rules/diagnostic validation, synthetic checks; model engineering deferred |
| D13 | AI Applications Engineer | V1 support/runbook/guidance outcomes; model apps deferred |
| D14 | Security / Application Security Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D15 | IAM / Identity Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D16 | Cloud / DevOps Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D17 | SRE / Observability Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D18 | QA / Automation Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D19 | Performance / Reliability Engineer | Scope and ownership in the source Appendix G and linked work packages |
| D20 | Release / Platform / Developer Experience Engineer | Scope and ownership in the source Appendix G and linked work packages |

## 4. Work-package execution contracts

The build/acceptance statements below are extracted from the active Appendix G; current continuation notes are proposed implementation guidance based on the inspected fragment. No human task owner is assigned by this document. All work remains unverified at the agent's new working commit until inspected/tested.

<a id="wp01"></a>

### WP01 — Architecture, contracts and outcome integration

**Accountable source role:** D01 — Chief Architect / Technical Lead. **Contributors:** D02 D03 D04 D05 D09 D14 D15 D20.  
**Acceptance predecessors:** No new V1 predecessor; see release qualification.  
**Source:** [§1](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-1), [§2](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-2), [§3](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-3), [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§11](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-11), [§12](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-12), [§116](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-116), [§117](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-117), [§119](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-119), [§120](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-120), [§121](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-121), [§138](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-138), [§146](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-146), [§184](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-184), [§186](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-186), [§187](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-187), [§188](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-188), [§189](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-189), [§190](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-190), [§200](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-200), [§201](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-201), [§202](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-202), [§203](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-203), [§204](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-204), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205), [§206](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-206), [§207](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-207), [§208](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-208), [§209](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-209), [§210](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-210), [§211](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-211), [§212](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-212), [§216](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-216). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Freeze the active master, identity/hosting boundaries, common terminology, state machines, deployment-unit inventory and change-control. Choose unresolved implementation options once through an ADR. Assign one technical lead per complete outcome, not merely per screen.

**Source deliverables:** Approved architecture and contracts; source/role/work-package map; decision log; integration plan; repository ownership rules.

**Continue from the fragment:** Carry forward the actual refactor and canonical contracts. Confirm current checkout/source precedence and record one agreed path-ownership map. Do not repeat the completed backend/privacy-control extraction. Resolve only meaningful remaining architecture decisions.

**Acceptance:** Every V1 capability has an owner and test boundary; no V2 model dependency; proposed UI/API/event contracts agree; unsupported decisions have an owner and block dependent work.

**Review:** Founder product review; D14 security; D18 acceptance; D20 packaging.

**Requirement links:** Cross-cutting/source sections and NFR requirements; WP35/WP36 retain their stated future or conditional scope.

<a id="wp02"></a>

### WP02 — Independent identity, access, members and subtenants

**Accountable source role:** D15 — IAM / Identity Engineer. **Contributors:** D02 D04 D09 D11 D14 D18.  
**Acceptance predecessors:** WP01.  
**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§33](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-33), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§109](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-109), [§110](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-110), [§127](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-127), [§158](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-158). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Implement separate vendor commerce/staff, customer operator and principal sessions. Add local owner bootstrap/recovery, privileged MFA, delegated admin/member permissions, service credentials and subtenant/environment restrictions. Keep identity proof for rights distinct from ordinary login.

**Source deliverables:** Role/permission matrix; auth/session middleware; member/role APIs and views; recovery process; machine-identity contracts.

**Continue from the fragment:** Reuse real staff/principal authentication and scope checks. Add general protected local first-run owner, invitation/delegation/transfer/recovery and independently configured vendor identities. Expand specialised capabilities and supported subtenant/SSO paths without a global bypass.

**Acceptance:** Vendor token cannot access customer runtime; customer token cannot become vendor staff; siblings and principals cannot cross scopes; delegated admin cannot elevate itself or bypass approvals.

**Review:** D14 + D18; customer identity prerequisites reviewed.

**Requirement links:** FR-M01-01–04, FR-M02-01–04, FR-M33-01–04

**Approved 1.4 detail retained:** implement §84 first-run local claim, one primary owner after activation, scoped single-use/IdP invitations, explicit administrator-grant delegation and protected customer-held transfer/recovery. No vendor credentials, staff-directory synchronisation or remote-support grants. Acceptance adds VM-11–VM-14 and the relevant VM-02/VM-08/VM-23 cases.

<a id="wp03"></a>

### WP03 — Core platform APIs, transactional storage and migrations

**Accountable source role:** D02 — Core Backend Engineer. **Contributors:** D03 D15 D16 D18 D20.  
**Acceptance predecessors:** WP01, WP02.  
**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§11](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-11), [§12](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-12), [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35), [§36](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-36), [§97](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-97), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99), [§100](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-100), [§101](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-101), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§122](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-122), [§124](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-124), [§131](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-131), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§170](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-170). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build customer domain API composition, explicit ownership/tenant data access, constraints, migration ordering, safe errors and event contracts. Apply equivalent patterns separately to vendor business records. Do not place the whole graph in an arbitrary JSON document.

**Source deliverables:** Schemas/migrations; scoped repositories; API foundation; validation/error envelope; seed fixtures; backwards-compatibility checks.

**Continue from the fragment:** Retain current migrations and scoped transactions. Add schema/repository/API support only for accepted real features, with vendor stores separate. Add supported import staging/provenance and connection setup records; remove fixture-only production assumptions through reviewed contracts.

**Acceptance:** Authenticated write persists across restart; wrong-scope queries fail; schema upgrade preserves data; missing tenant context is denied before reads/mutations.

**Review:** D03 data + D14/D15 access + D18 tests.

**Requirement links:** FR-M02-01–04, FR-M29-01–04

**Approved 1.4 detail retained:** model the record families in §5.4 without vendor replication of local identities or data. Add the supported local import staging/validation/provenance lifecycle in §111 and independent vendor contact/support retention. D02 owns import API/migration work; D03 owns provenance/identity mapping, D07 source mappings and D09 the local preview UI. Exact shipped formats/types require a documented schema and tests.

<a id="wp04"></a>

### WP04 — Graph, inventory, local search and data lineage

**Accountable source role:** D03 — Privacy Control Graph Engineer. **Contributors:** D02 D04 D06 D07 D08 D09.  
**Acceptance predecessors:** WP03.  
**Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§8](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-8), [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§29](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-29), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§105](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-105), [§157](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-157). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Model purposes, processing conditions, systems, assets, copies, processors, relationships, owners and provenance. Import supported discovery observations; keep declared and observed inventory distinct. Build impact and local permission-filtered search.

**Source deliverables:** Graph schema/query API; inventory review; lineage/impact results; search/index scope; historical graph fixtures.

**Continue from the fragment:** Extend control-map/target mappings into reviewed inventory, relationship provenance, legal/activity/copy entities and permission-filtered graph/search/impact. Do not call the small mapping screen a complete graph.

**Acceptance:** Affected systems can be traced from a purpose; old evidence resolves its historic references; revoking discovery permission lowers freshness instead of preserving false coverage.

**Review:** D04 policy inputs; D14/D15 search isolation; D18 graph tests.

**Requirement links:** FR-M03-01–04

<a id="wp05"></a>

### WP05 — Policies, purposes, regulatory packs and applicability

**Accountable source role:** D04 — Policy Engine Engineer. **Contributors:** D02 D03 D09 D10 D15; privacy counsel.  
**Acceptance predecessors:** WP04.  
**Source:** [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§13](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-13), [§14](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-14), [§15](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-15), [§148](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-148), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§166](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-166), [§167](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-167), [§170](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-170), [§218](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-218). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build deterministic decision and obligation schemas, reviewed publication/migration lifecycle, applicability records, legal source/version register and separate admin/processing policy namespaces. Store source text, interpretation, customer facts and executable rule separately.

**Source deliverables:** Policy APIs/UI; versioned rule/source packs; applicability evaluation; approval records; decision reason codes and tests.

**Continue from the fragment:** Extend narrow synthetic purpose/notice/condition schemas to reviewed general purpose and policy contracts; preserve OPA, exact publication and versioning. Add applicability/source packs and full obligation handling through approved adapters.

**Acceptance:** Historical decision retains exact version; evaluation failure is not ALLOW; unsatisfied masking/other obligations block or escalate; future-effective content is not silently active.

**Review:** D15 technical permission review; counsel approves interpretations; D18 tests.

**Requirement links:** FR-M04-01–04

<a id="wp06"></a>

### WP06 — Notices, ordered consent and withdrawal acceptance

**Accountable source role:** D02 — Core Backend Engineer. **Contributors:** D03 D04 D05 D09 D10 D11 D15.  
**Acceptance predecessors:** WP03, WP05, WP14.  
**Source:** [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§18](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-18), [§19](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-19), [§155](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-155), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Implement notice/version/language management, purpose-specific capture receipts, import provenance, consent epochs, fresh re-consent and atomic withdrawal plus outbox publication. Keep communications preferences separate from processing permission.

**Source deliverables:** Notice/consent APIs; review/capture/withdrawal UI contracts; receipts; monotonic transition tests; language/content fixtures.

**Continue from the fragment:** Retain epoch/receipt/outbox safety and existing tests. Add exact source/language/notice/provenance, expiry and material-change handling. Imported historical grants cannot supersede current withdrawal.

**Acceptance:** Duplicate grant creates no duplicate transition; stale grant cannot undo withdrawal; new consent is a new authorised transition; changed purpose does not silently inherit old consent.

**Review:** D04 meaning; D05 ordering; D15 actor/identity; D18 tests.

**Requirement links:** FR-M11-01–04, FR-M12-01–04

<a id="wp07"></a>

### WP07 — Rights, identity matching, nomination and guardians

**Accountable source role:** D05 — Workflow / Distributed Systems Engineer. **Contributors:** D02 D03 D04 D09 D11 D14 D15.  
**Acceptance predecessors:** WP02, WP04, WP05, WP08.  
**Source:** [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§80](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-80). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build scoped rights requests, identity confidence, authority/representation, nomination and guardian lifecycles, safe response delivery, manual review and per-system unresolved status. Build applicable baseline safeguards before supporting that processing.

**Source deliverables:** Request/representation state machine; authority APIs; operator and principal journey contracts; secure disclosure/export rules.

**Continue from the fragment:** Implement request identity/authority/scoping/response lifecycle using existing shared workflow/evidence services. Add nomination, guardianship, grievance and safe redacted delivery; this is not a renamed withdrawal screen.

**Acceptance:** Ambiguous identity prevents destructive automation; revoked authority prevents new action; third-party information is not disclosed; CLOSED does not imply every target verified.

**Review:** D15/D14 identity/disclosure; privacy reviewer scope; D18 negative tests.

**Requirement links:** FR-M13-01–04, FR-M14-01–04

<a id="wp08"></a>

### WP08 — Durable orchestration, plans, approvals and reconciliation

**Accountable source role:** D05 — Workflow / Distributed Systems Engineer. **Contributors:** D02 D04 D06 D14 D17.  
**Acceptance predecessors:** WP03, WP05, WP14.  
**Source:** [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§18](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-18), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24), [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99), [§100](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-100), [§149](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-149), [§174](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-174), [§175](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-175), [§176](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-176), [§177](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-177), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178), [§179](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-179), [§180](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-180), [§181](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-181), [§182](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-182), [§183](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-183). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Implement durable workflow history, transactional event publication, deduplication, exact-scope approvals, action attempts, unknown/reconciling outcomes, retries, cancellation, manual tasks and safe resume under current authorisation.

**Source deliverables:** Workflow definitions; action/approval contract; outbox/inbox; failure/escalation paths; restart/replay tests.

**Continue from the fragment:** Generalise withdrawal orchestration to typed workflow definitions/plans/approvals with safe versioning and retries. Preserve unknown effects and manual criteria. Production durable persistence and recovery must be qualified.

**Acceptance:** Accepted event survives publisher/worker crash; lost response enters reconciliation; changed scope invalidates approval; old work cannot mutate a new record generation blindly.

**Review:** D04 policy; D06 external effects; D18/D19 fault tests.

**Requirement links:** FR-M05-01–04, FR-M14-01–04

<a id="wp09"></a>

### WP09 — Agent, connector SDK and capability conformance

**Accountable source role:** D06 — Connector Platform Engineer. **Contributors:** D05 D07 D08 D14 D15 D20.  
**Acceptance predecessors:** WP02, WP03, WP08.  
**Source:** [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§171](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-171), [§172](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-172), [§173](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-173), [§176](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-176), [§177](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-177). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build restricted customer agent, customer-controlled command authority, capability/version manifests, nonce/expiry/scope checks, connector lifecycle, secret references, isolation and operation budgets. Provide reproducible connector conformance tests.

**Source deliverables:** Agent and SDK; manifest/command schema; sandbox harness; health API; compatibility/advisory metadata.

**Continue from the fragment:** Preserve signed agent envelopes and replay/scope checks. Add actual resource/action manifests, reviewed adapter ports, permission lifecycle, local secret integration, bounded spooling and conformance tests.

**Acceptance:** Wrong tenant/install, expired or replayed commands fail; plugin cannot read another secret; loss of permission changes advertised capability; no vendor command channel.

**Review:** D14/D15 security; D20 signing/package; D18 conformance.

**Requirement links:** FR-M06-01–04

**Approved 1.4 detail retained:** expose local preflight, capability/permission tests and explicitly approved resource scope to the wizard. No connector auto-grant, public vendor DB access or support tunnel. Revoked credentials or changed scope require truthful degradation/revalidation.

<a id="wp10"></a>

### WP10 — Database connectors and independent readback

**Accountable source role:** D07 — Data Connector Engineer. **Contributors:** D03 D05 D06 D14 D19.  
**Acceptance predecessors:** WP04, WP09.  
**Source:** [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§29](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-29), [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§51](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-51), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§128](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-128), [§171](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-171), [§172](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-172), [§173](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-173), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Implement supported PostgreSQL/MySQL discovery, scoped query/match, restrict/update/delete where supported, and read-after-effect verification. Limit permissions and workload. Treat replicas/backups according to actual capability.

**Source deliverables:** Database adapters; exact-match fixtures; paginated discovery; scoped action plans; observed-result records; permission/load documentation.

**Continue from the fragment:** Build real selected database adapters and guarded onboarding/readback with dedicated scoped identities. Do not just rename crm-synthetic. Remove domain dependence on marketing_memberships while retaining a synthetic adapter for regression.

**Acceptance:** Synthetic CRM membership changes and is read back; wrong or ambiguous identity cannot mutate; records beyond approved scope remain unchanged; unobserved copies stay unverified.

**Review:** D06 contract; D14 query/secret safety; D18/D19 scope and load.

**Requirement links:** FR-M06-01–04, FR-M07-01–04

**Approved 1.4 detail retained:** implement the §84 guided database path using §172 local secret references. Start Observe/read-only; separately approve supported mutations. Collaborate on supported local import validation/source mapping, making snapshots/manual declarations distinct from live execution and independent readback. Add VM-15–VM-20 as applicable.

<a id="wp11"></a>

### WP11 — REST/SaaS connectors and external processor paths

**Accountable source role:** D08 — SaaS/API Integration Engineer. **Contributors:** D05 D06 D14 D17 D18.  
**Acceptance predecessors:** WP04, WP09.  
**Source:** [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§29](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-29), [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§53](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-53), [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§98](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-98), [§128](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-128), [§173](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-173), [§174](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-174), [§176](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-176). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build the common REST adapter and the pilot-selected CRM/marketing/support integrations. Handle supported credentials, pagination, bounded retries, webhook signatures, changed permissions and reconciliation. Keep controlled simulators labelled.

**Source deliverables:** Provider adapters; simulator/test accounts; webhook receiver/sender; capability limits; conformance results.

**Continue from the fragment:** Implement selected approved REST/SaaS provider contracts, errors, pagination, rate limits and confirmation/verification. Provider selection/test credentials are external prerequisites; unsupported paths stay explicit.

**Acceptance:** Effect followed by response loss yields unknown then supported reconciliation; missing pages/permissions cannot become complete coverage; unapproved destinations are blocked.

**Review:** D06 capability; D14 endpoint/credential safety; D18 provider failure.

**Requirement links:** FR-M06-01–04, FR-M07-01–04, FR-M10-01–04, FR-M16-01–04

<a id="wp12"></a>

### WP12 — Runtime enforcement and policy SDKs

**Accountable source role:** D04 — Policy Engine Engineer. **Contributors:** D05 D06 D08 D14 D20.  
**Acceptance predecessors:** WP05, WP06, WP09.  
**Source:** [§13](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-13), [§40](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-40), [§41](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-41), [§42](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-42), [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178), [§179](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-179), [§180](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-180), [§181](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-181), [§182](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-182), [§183](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-183). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build supported Node/Python SDK and application/API enforcement boundaries, local policy-service calls, decision obligations, consent-epoch/freshness checks, approved degraded modes and audit correlation. Later languages retain their original sequencing.

**Source deliverables:** SDK check/authorise/enforce/record; runtime adapter; obligation handlers; freshness contract; demonstrable supported boundary.

**Continue from the fragment:** Extend the existing privacy-control package and TargetObserver boundary. Complete current-at-use admission and obligation adapters plus supported Node/Python SDKs. Do not add one hard-coded provider branch per connector or infer universal blocking.

**Acceptance:** Post-withdrawal marketing send is blocked; unrelated approved service action is evaluated independently; stale revocation cannot silently fail open; required mask actually changes the payload.

**Review:** D14 safety; D05 race behaviour; D20 SDK compatibility; D18 enforcement tests.

**Requirement links:** FR-M04-01–04

<a id="wp13"></a>

### WP13 — Verification engine, outcome claims, coverage and failures

**Accountable source role:** D07 — Data Connector Engineer. **Contributors:** D02 D03 D05 D06 D08 D09 D13.  
**Acceptance predecessors:** WP08, WP10, WP11, WP14.  
**Source:** [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§151](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-151), [§169](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-169), [§185](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-185), [§196](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-196). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build shared outcome/observation records with scope, method, source, observation time, freshness and limitations; unify adapter readbacks. Track configuration, attempt, acknowledgement, observation and test result separately. Surface gaps and manual tasks.

**Source deliverables:** Claim/verification APIs; coverage denominator and exclusions; failed/stale/unknown states; failure-centre UI contract.

**Continue from the fragment:** Reuse scoped observations but build general OutcomeClaim/coverage/freshness/gap services and interfaces. Preserve provider/manual assertions versus independent observation. Do not count declared systems as fully verified.

**Acceptance:** API success with unchanged target fails verification; stale observation loses freshness; one successful target does not mark all systems verified; manual task cannot fabricate observation.

**Review:** D08 multi-provider review; D05 lifecycle; D18 independent observation tests.

**Requirement links:** FR-M07-01–04, FR-M18-01–04

<a id="wp14"></a>

### WP14 — Evidence, audit, privacy of stored history and reporting

**Accountable source role:** D02 — Core Backend Engineer. **Contributors:** D03 D05 D07 D09 D14 D17 D20.  
**Acceptance predecessors:** WP03.  
**Source:** [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§45](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-45), [§46](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-46), [§47](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-47), [§106](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-106), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§133](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-133), [§134](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-134), [§150](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-150), [§161](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-161), [§162](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-162), [§169](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-169). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build append-oriented audit/evidence, historical version references, separately retained integrity envelopes and personal payloads, correction events, local authorised exports and reports. Implement manifest/offline integrity verification without overclaiming external truth.

**Source deliverables:** Evidence/audit APIs; envelope/payload schema; retention and purge jobs; reports/exports; integrity validator; access auditing.

**Continue from the fragment:** Retain evidence/audit primitives and add general envelope/payload retention, correction, report/export and offline verifier. Include customer retention and separate vendor service-data lifecycle.

**Acceptance:** Changed evidence bytes fail integrity; authorised historical data resolves exact versions; personal payload deletion preserves justified envelope semantics; export cannot cross tenant/vendor boundaries.

**Review:** D14 integrity/privacy; D03 reference retention; D18 tamper/export tests; counsel retention review.

**Requirement links:** FR-M08-01–04, FR-M33-01–04

<a id="wp15"></a>

### WP15 — Retention, deletion, restricted copies and restoration safety

**Accountable source role:** D05 — Workflow / Distributed Systems Engineer. **Contributors:** D03 D04 D06 D07 D08 D14 D17.  
**Acceptance predecessors:** WP04, WP05, WP08, WP10, WP13.  
**Source:** [§50](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-50), [§51](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-51), [§52](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-52), [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178), [§179](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-179). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Implement copy/purpose-specific retention constraints, lawful holds, restricted retained copies, release/re-evaluation, safe deletion plans and derived-copy tasks. Preserve scoped cryptographic deletion as advanced support-gated capability. Reconcile restored restrictions before resumed processing.

**Source deliverables:** Retention/hold APIs; eligibility planner; safe deletion workflows; copy outcome report; restore-reconciliation ledger/process.

**Continue from the fragment:** Implement scoped copy eligibility/hold/restriction/deletion plans using shared actions and verification. Add backup restore quarantine/current safety reconciliation. Crypto deletion retains conditional advanced scope.

**Acceptance:** Marketing stops while a valid retained transaction stays purpose-restricted; hold release rechecks scope; restoring an old audience cannot reactivate known withdrawal; unsupported backup erasure remains explicit.

**Review:** D04/counsel retention meaning; D14 destruction safety; D17/D19 restore; D18 tests.

**Requirement links:** FR-M15-01–04

<a id="wp16"></a>

### WP16 — Processors, assessments, SDF governance and remediation

**Accountable source role:** D03 — Privacy Control Graph Engineer. **Contributors:** D02 D04 D05 D08 D09; privacy SME.  
**Acceptance predecessors:** WP04, WP05, WP08, WP14.  
**Source:** [§53](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-53), [§80](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-80), [§118](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-118), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§166](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-166), [§167](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-167), [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build processor relationships/contracts, subprocessor scope, response tasks, assessment records, findings, remediation owners and closure tests. Model SDF pack/applicability only against reviewed facts; do not infer legal status from company size.

**Source deliverables:** Processor/assessment APIs and UI; findings/remediation workflow; reviewer evidence; approved assessment calendar and pack configuration.

**Continue from the fragment:** Implement processor/contracts, assessment/findings/remediation and reviewed SDF applicability. Link all closure decisions to control/evidence/retests rather than isolated questionnaires.

**Acceptance:** Processor change identifies affected controls; questionnaire completion does not mark runtime verification; finding closure links to evidence/retest; unreviewed applicability stays unresolved.

**Review:** Privacy reviewer owns meaning; D05 actions; D14 access; D18 closure tests.

**Requirement links:** FR-M16-01–04

<a id="wp17"></a>

### WP17 — Incident workspace, clocks and notification engine

**Accountable source role:** D05 — Workflow / Distributed Systems Engineer. **Contributors:** D02 D03 D04 D08 D09 D10 D17; privacy SME.  
**Acceptance predecessors:** WP04, WP05, WP08, WP14.  
**Source:** [§54](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-54), [§55](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-55), [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§98](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-98), [§100](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-100), [§108](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-108). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Implement local incident timelines, affected scope, rule-driven severity, separately configured notification tasks/clocks, human review, actual dispatch evidence and processor/manual submission handling. Implement in-app/email/webhook routes under the approved boundary; retain later channels.

**Source deliverables:** Incident/notification APIs; independent clock engine; reviewed templates; operator timeline; safe delivery/status records.

**Continue from the fragment:** Implement incident timeline/trigger/recipient clocks and reviewed notification tasks. Add customer-controlled in-app/email/webhooks and attributable dispatch. Do not hard-code statutory time constants from memory.

**Acceptance:** One incident can have completed and pending notifications independently; corrected timestamps preserve history; a draft never counts as delivery; no automatic legal declaration.

**Review:** Privacy reviewer approves clock/content rules; D14 data recipients; D18 timeline and delivery tests.

**Requirement links:** FR-M10-01–04, FR-M17-01–04

<a id="wp18"></a>

### WP18 — Customer-facing Privacy Test Engine and regression product

**Accountable source role:** D18 — QA / Automation Engineer. **Contributors:** D04 D05 D06 D07 D08 D09 D12 D20.  
**Acceptance predecessors:** WP08, WP10, WP12, WP14.  
**Source:** [§57](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-57), [§58](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-58), [§59](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-59), [§60](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-60), [§61](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-61), [§107](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-107), [§193](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-193). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build executable test specifications, synthetic identities/fixtures, environment safety, expected/actual assertions, versioned results, schedules and customer CI outputs. This shipped engine is distinct from the team’s internal QA suite.

**Source deliverables:** Test schema/runner; fixture lifecycle; regression suite; machine-readable CI result; failure/evidence UI.

**Continue from the fragment:** Extend genuine synthetic Test Lab behaviour into versioned definitions/history/scheduling/CI with controlled fixtures and real assertions. Preserve failure/interruption evidence and keep destructive testing out of production by default.

**Acceptance:** A real enforcement bypass in an isolated fixture causes a failing assertion; repair passes the same scope; destructive test against unapproved production scope is blocked.

**Review:** D14 test safety; D04 expected policy meaning; D20 CI contract; independent D12/D19 fixtures.

**Requirement links:** FR-M09-01–04

<a id="wp19"></a>

### WP19 — Deterministic drift, reusable controls and change simulation

**Accountable source role:** D04 — Policy Engine Engineer. **Contributors:** D03 D05 D06 D09 D18 D20.  
**Acceptance predecessors:** WP04, WP05, WP12, WP18.  
**Source:** [§40](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-40), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§60](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-60), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§148](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-148), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build graph/configuration diffs, impact assessment, affected tests, controlled review and reusable control packages. Simulator uses explicit snapshots and approved synthetic data; predictions retain assumptions. AI explanation remains deferred.

**Source deliverables:** Control-package schema; diff/simulation APIs; code-review/CLI outputs; promotion history; drift owner/task mapping.

**Continue from the fragment:** Build versioned control packages, graph-backed impact, deterministic drift classification and dry-run/simulation from actual snapshots. Evidence of simulated outcomes is not production observation.

**Acceptance:** New unapproved destination produces a scoped review/test failure; missing inventory stays unknown; policy rollback cannot restore withdrawn consent or erase evidence.

**Review:** D03 graph accuracy; D14 promotion safety; D18 mutation/impact tests.

**Requirement links:** FR-M04-01–04, FR-M09-01–04, FR-M18-01–04

<a id="wp20"></a>

### WP20 — Shared design system and interface contracts

**Accountable source role:** D10 — Product UX Engineer. **Contributors:** D09 D11 D14 D18.  
**Acceptance predecessors:** WP01.  
**Source:** [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§102](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-102), [§103](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-103), [§104](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-104), [§105](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-105), [§106](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-106), [§107](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-107), [§108](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-108), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§154](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-154), [§155](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-155), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156), [§158](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-158), [§184](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-184), [§185](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-185). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Create reusable components and interaction/state specifications for vendor/account, staff, customer workspace and principal portal. Define accessibility, responsive behaviour, localisation, validation, confirmations and truthful outcome labels.

**Source deliverables:** Design system; screen/state catalogue; form/permission/empty/error specifications; accessible components and UI fixtures.

**Continue from the fragment:** Inspect/reuse current UI primitives and split only real feature responsibility. Define shared status/approval/form/table/timeline patterns and accessible complete states; no unrelated visual rewrite.

**Acceptance:** Keyboard/focus/error flows work in assessed browsers; role/domain are clear; unknown/unverified is not styled as success; no V1 fake AI or unsupported compliance score.

**Review:** D09/D11 implementation review; D14 unsafe actions; D18 accessibility.

**Requirement links:** Cross-cutting/source sections and NFR requirements; WP35/WP36 retain their stated future or conditional scope.

**Approved 1.4 detail retained:** specify designated-contact vendor profiles, Last reported/Not reported states, exact-report approval, protected owner setup, delegated invites and local connection/import previews. Do not design remote-session, staff-sync or employee-monitoring controls for Version 1.

<a id="wp21"></a>

### WP21 — Customer Workspace, local administration and operator UI

**Accountable source role:** D09 — Frontend Platform Engineer. **Contributors:** D02 D03 D04 D05 D10 D14 D15 D17.  
**Acceptance predecessors:** WP02, WP03, WP20.  
**Source:** [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§34](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-34), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§102](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-102), [§103](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-103), [§104](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-104), [§105](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-105), [§106](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-106), [§107](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-107), [§108](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-108), [§157](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-157), [§158](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-158), [§170](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-170), [§184](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-184), [§185](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-185). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build role-oriented dashboards, graph/policy/consent/request views, actions/approvals, integrations, evidence, testing, incidents and local settings. Bind incremental screens to corresponding feature contracts; keep data-boundary configured/observed/tested status explicit.

**Source deliverables:** Customer-console routes/API bindings; members/roles/settings; evidence/drift/failure UI; actual local health; browser journeys.

**Continue from the fragment:** Extend local Workspace to remaining modules/settings through real APIs, with current scope/mode/version and error/empty/partial/stale states. Avoid one giant operations component or hard-coded metrics.

**Acceptance:** An authorised browser action changes persisted local state; read-only user cannot mutate; no vendor assets/telemetry are needed to render runtime; feature flags cannot fake implementation.

**Review:** D10 usability; D15 security; D18 browser/end-to-end. Each page also waits for its specific API package.

**Requirement links:** Cross-cutting/source sections and NFR requirements; WP35/WP36 retain their stated future or conditional scope.

<a id="wp22"></a>

### WP22 — Customer Privacy Centre and public/private separation

**Accountable source role:** D11 — Data Principal Portal Engineer. **Contributors:** D02 D05 D10 D14 D15.  
**Acceptance predecessors:** WP02, WP06, WP07, WP20.  
**Source:** [§19](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-19), [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24), [§33](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-33), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§154](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-154), [§155](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-155), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build customer-branded notices, consent and rights journeys with scoped authentication, uploads, receipts/status, nomination/representation and accessibility. Publish through customer-controlled ingress where approved; keep admin endpoints private.

**Source deliverables:** Principal portal; secure session flow; form/API integration; reviewed language content; safe response/status UI.

**Continue from the fragment:** Extend real consent portal with requests/status/responses/representation and reviewed languages. Keep customer-hosted assets and strict own/mandate permissions; segregate public portal ingress from admin.

**Acceptance:** Principal can withdraw and view its own receipt; another person’s data is denied; public portal cannot invoke admin APIs; vendor commercial account is not needed.

**Review:** D15 identity; D14 exposure/uploads; D18 cross-person/browser tests.

**Requirement links:** FR-M13-01–04

<a id="wp23"></a>

### WP23 — Vendor website, customer Account and commerce

**Accountable source role:** D02 — Core Backend Engineer. **Contributors:** D08 D09 D10 D14 D15 D20; product/finance.  
**Acceptance predecessors:** WP01, WP02, WP03, WP20.  
**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§77](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-77), [§78](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-78), [§79](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-79), [§80](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-80), [§81](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-81), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§83](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-83), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§135](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-135), [§136](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-136), [§159](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-159), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168), [§195](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-195), [§198](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-198), [§204](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-204). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build product/edition/docs/security pages, account membership, checkout/subscription/invoice/payment-state handling, download entitlements and customer business support entry. Readiness scanner remains reviewed declarations, not permission to upload operational inventory; reconcile any conflicting field against §31.

**Source deliverables:** Website/Account UI and separate vendor APIs/database; commercial provider adapter after selection; invoice/subscription states; download selector.

**Continue from the fragment:** Implement actual vendor business account/designated contacts, catalogue/payment/subscription/invoice/download flow under selected provider/terms. Do not copy client or local member data for account setup.

**Acceptance:** Purchase/licence issuance follows verified commercial state; duplicate provider event cannot duplicate entitlement; one buyer cannot access another account; no live workload dashboards are invented.

**Review:** D15 account access; D14 collection/payment boundary; product/finance selects provider and commercial rules.

**Requirement links:** FR-M26-01–04

**Approved 1.4 detail retained:** implement necessary customer-supplied contact roles (owner/technical-support/billing) without importing local member roles or activity. Review purpose, access, notice, correction/rights/grievance and retention with the named privacy/legal owner (§165). Purchases/downloads do not imply installed runtime status or authority.

<a id="wp24"></a>

### WP24 — Vendor staff administration and support-case lifecycle

**Accountable source role:** D13 — AI Applications Engineer. **Contributors:** D02 D09 D10 D14 D15 D17.  
**Acceptance predecessors:** WP02, WP03, WP20, WP23.  
**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§158](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-158), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build Vendor Super Admin/Admin staff roles, scoped assignments, support attention queue, case details, synthetic reproductions, defect/advisory links and staff audit. Use submitted/approved reports only; runtime health may be unreported.

**Source deliverables:** Staff-console UI; separate support APIs; assignment/state machine; safe attachment/rejection handling; staff access audit.

**Continue from the fragment:** Implement separate vendor staff identities, assigned organisation/case console and permissible status/contact records. No remote-session, staff-sync or employee activity features.

**Acceptance:** Assigned admin can process a permitted case but not inspect customer runtime; unassigned case enumeration denied; closure does not change local verification; no model required for support.

**Review:** D14/D15 authority; D18 case isolation; support owner staffing.

**Requirement links:** FR-M30-01–04, FR-M33-01–04

**Approved 1.4 detail retained:** build the organisation list/detail tabs specified in §96, using only vendor-held minimum fields and individually submitted diagnostic reports. Vendor Admin access is account/case-assigned; no live runtime member/health mirror, employee tracking, remote desktop, SSH, SQL console, impersonation or support session. Add VM-01–VM-10 as applicable.

<a id="wp25"></a>

### WP25 — Signed licences, entitlements and continuity

**Accountable source role:** D20 — Release / Platform / Developer Experience Engineer. **Contributors:** D02 D04 D09 D14 D15; product/legal.  
**Acceptance predecessors:** WP02, WP03, WP23.  
**Source:** [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§77](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-77), [§78](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-78), [§79](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-79), [§80](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-80), [§81](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-81), [§94](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-94), [§144](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-144), [§145](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-145), [§146](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-146), [§159](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-159), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160), [§161](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-161), [§198](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-198), [§204](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-204). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Implement vendor licence issuance and customer-local verification as distinct services/trusts; purchased capabilities, supported-release checks, feature flags, edition changes, renewal/import, expiry/handover and permitted random installation binding.

**Source deliverables:** Licence schema/signer/verifier; local entitlement evaluator; import/renewal UI; continuity tests; no-AI V1 capability manifest.

**Continue from the fragment:** Implement signed licence issuance/local verification, supported entitlements and explicit expiry/downgrade continuity. Commercial limits/grace terms require approved decisions; they cannot weaken privacy restrictions.

**Acceptance:** Vendor outage does not stop valid local processing; expired licence never turns BLOCK to ALLOW or wipes data; flag/paid tier cannot activate deferred V2 code; local records survive edition change.

**Review:** D14 key separation; D04 safety; product/legal signs continuity terms; D18 negative tests.

**Requirement links:** FR-M27-01–04, FR-M28-01–04

<a id="wp26"></a>

### WP26 — Privacy-safe diagnostic reports and escalation transport

**Accountable source role:** D12 — AI/ML Engineer. **Contributors:** D02 D06 D09 D13 D14 D15 D17.  
**Acceptance predecessors:** WP02, WP03, WP24.  
**Source:** [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§113](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-113), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build fixed-schema local diagnostic generation, forbidden-field check, exact per-report local preview/approval and customer-origin transport/offline transfer; do not build proactive vendor diagnostic jobs. Keep detailed local evidence and mappings inside the customer.

**Source deliverables:** Local exporter/validator; support report schema; preview/approval UI; permitted vendor ingress; synthetic reproduction protocol.

**Continue from the fragment:** Implement deterministic per-report preview/digest approval/export and strict vendor intake. Updated SUP-07 excludes proactive reporting. Keep customer-local case mapping and customer-applied fixes; no live remote support.

**Acceptance:** Forbidden fields prevent sending; vendor does not retain rejected bodies; changed payload requires fresh approval and old standing rules cannot emit diagnostics; no live remote access, shell or impersonation; case state and local action state stay independent.

**Review:** D14 mandatory boundary review; D15 approval; D18 canary/offline/revocation tests.

**Requirement links:** FR-M30-01–04

**Approved 1.4 detail retained:** optional means the customer may submit an individual report after exact local preview/approval. No standing-rule or proactive notification feature is in Version 1. An allowed delivery retry, if implemented, must remain bound to the same approved content/destination; it cannot generate fresh diagnostics under old approval. Isolated customers can use approved manual transfer. SUP-07 tests exclusion, not an enabled signal feature.

<a id="wp27"></a>

### WP27 — Full-product ZIP, installation, distribution and updates

**Accountable source role:** D20 — Release / Platform / Developer Experience Engineer. **Contributors:** D06 D09 D14 D15 D16 D17 D18.  
**Acceptance predecessors:** WP03, WP14, WP20, WP25, WP28.  
**Source:** [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§83](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-83), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§86](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-86), [§93](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-93), [§101](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-101), [§146](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-146), [§147](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-147), [§148](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-148), [§149](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-149), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160), [§194](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-194), [§197](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-197), [§202](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-202), [§203](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-203). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Produce signed images and primary ZIP envelope with supported server/Compose, Kubernetes/Helm and offline profiles as actually validated. Include preflight, local bootstrap/licence import, durable dependencies, migration, rollback or forward recovery, advisories and customer-approved updates.

**Source deliverables:** Versioned ZIP; manifest/signatures/SBOM/provenance; installer/verifier; offline dependency inventory; supported matrix; release/upgrade instructions.

**Continue from the fragment:** Replace rehearsal-only installation assumptions with the supported complete signed ZIP/customer setup/update process. Preserve existing reusable packaging tooling and validate offline dependencies, migrations, trust and exact supported matrix.

**Acceptance:** Clean install works without code rebuild/model/GPU; tampered package rejected; no hidden downloads in declared offline profile; vendor account cannot execute updates remotely; upgrade preserves data and restrictions.

**Review:** D14 trust; D15 bootstrap; D18 clean install; D17 restore; customer IT support profile.

**Requirement links:** FR-M29-01–04, FR-M31-01–04

**Approved 1.4 detail retained:** installer creates no vendor runtime account or remote-support agent; it hands off to the protected local owner flow. Organisation-assigned hotfixes remain reviewed/signed downloads applied by customer IT, never remote commands. Test that old configuration/updates cannot activate excluded diagnostic/access paths.

<a id="wp28"></a>

### WP28 — Infrastructure, environments and internal CI/CD

**Accountable source role:** D16 — Cloud / DevOps Engineer. **Contributors:** D01 D14 D17 D18 D20.  
**Acceptance predecessors:** WP01.  
**Source:** [§11](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-11), [§12](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-12), [§34](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-34), [§37](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-37), [§38](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-38), [§39](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-39), [§86](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-86), [§87](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-87), [§116](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-116), [§122](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-122), [§123](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-123), [§124](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-124), [§130](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-130). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build repo execution foundation, isolated development/test/staging, vendor hosting, customer deployment manifests, scoped build credentials, secrets integration, test/scanning jobs and artifact production. Keep internal CI distinct from customer privacy-test CI.

**Source deliverables:** Infrastructure definitions; image/build scripts; test/scanning pipeline; local environment; deployment profiles; credential/trust inventory.

**Continue from the fragment:** Retain useful container/build practices; configure separate environments and authority stores, reproducible CI and least-privilege secrets. Full production Temporal/storage/ingress is distinct from demo composition.

**Acceptance:** Same source builds reproducibly with pinned inputs; vendor/customer networks and secrets separate; missing model is expected; secrets do not appear in code/artifacts/logs.

**Review:** D14 hardening; D17 recoverability; D20 artifact policy.

**Requirement links:** FR-M31-01–04

<a id="wp29"></a>

### WP29 — Customer-local monitoring, backup, recovery and operations

**Accountable source role:** D17 — SRE / Observability Engineer. **Contributors:** D02 D05 D06 D09 D14 D16 D19 D20.  
**Acceptance predecessors:** WP03, WP08, WP14, WP28.  
**Source:** [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43), [§88](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-88), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§90](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-90), [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92), [§129](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-129), [§130](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-130), [§131](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-131), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§195](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-195), [§196](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-196). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Implement local telemetry/health/security alerts, redaction, retention, backups, restore/runbooks and operator responsibilities. Vendor monitoring covers only its own services plus permitted support signals. Measure freshness, backlog and recovery rather than uptime alone.

**Source deliverables:** Health dashboards; privacy-safe telemetry; backup/restore scripts; operating guide; measured service/recovery evidence.

**Continue from the fragment:** Build customer-local operational monitoring and backup/restore/current-safety reconciliation. Vendor visibility remains submitted facts only; document actual recovery limits and no model dependence.

**Acceptance:** Accepted workflow/evidence survive tested recovery; restored consent restrictions reconcile before traffic; prohibited canaries never reach vendor telemetry; offline health is not fabricated.

**Review:** D14 egress; D19 fault testing; D18 evidence; customer IT handover.

**Requirement links:** FR-M32-01–04

<a id="wp30"></a>

### WP30 — Security programme, independent assessment and release blockers

**Accountable source role:** D14 — Security / Application Security Engineer. **Contributors:** D01 D02 D06 D09 D11 D15 D16 D18 D20; independent assessor.  
**Acceptance predecessors:** WP01.  
**Source:** [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35), [§36](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-36), [§37](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-37), [§38](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-38), [§39](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-39), [§46](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-46), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§87](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-87), [§90](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-90), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§109](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-109), [§110](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-110), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§126](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-126), [§127](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-127), [§128](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-128), [§163](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-163), [§164](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-164), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168), [§171](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-171), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178), [§206](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-206). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Threat-model and implement/review authentication, authorisation, data egress, input/upload/connector abuse, key/signature trust, dependency risks and secure defaults. Run finding triage, independent production assessment, fixes/retests and vulnerability/advisory lifecycle.

**Source deliverables:** Threat models; security test/finding register; scans/SBOM review; assessed-scope pentest/retest; vulnerability response and supported-version policy.

**Continue from the fragment:** Maintain threat/control/finding review throughout changes, scan dependencies/source/images, test boundary exclusions and prepare defined-scope independent assessment/retest. No certification claim from an AI review.

**Acceptance:** No unresolved confirmed applicable Critical/High or mandatory boundary blocker in assessed release; no unknown-vulnerability guarantee; two AI reviews do not count as independent penetration testing.

**Review:** Qualified independent assessor for independent assurance; D01/D20/founder release decision.

**Requirement links:** FR-M01-01–04

**Approved 1.4 detail retained:** include assigned vendor-org/case isolation, designated-contact collection, no staff replication or remote access, per-report approval, bootstrap/owner recovery and import/source safety in the threat model. Record vendor-service privacy/claims review separately from security test results. Add applicable VM acceptance scenarios.

<a id="wp31"></a>

### WP31 — Internal QA, integration, accessibility and release evidence

**Accountable source role:** D18 — QA / Automation Engineer. **Contributors:** D02 D09 D10 D11 D12 D14 D17 D19 D20.  
**Acceptance predecessors:** WP01.  
**Source:** [§119](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-119), [§120](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-120), [§125](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-125), [§126](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-126), [§127](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-127), [§128](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-128), [§137](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-137), [§191](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-191), [§192](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-192), [§193](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-193), [§194](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-194), [§207](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-207), [§217](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-217). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build internal unit/integration/browser/contract/security/privacy suites alongside code. Own independent assertions, fixture integrity, UI accessibility, regression control, release-scope coverage and factual test reporting. This is not the shipped Privacy Test Engine itself.

**Source deliverables:** Executable suites; master-to-test traceability; build-linked results; defect/retest records; prototype/pilot/production acceptance report.

**Continue from the fragment:** Requalify refactored baseline, then test every added journey/failure/security boundary. Keep MASTER versus PROTO IDs distinct; record current evidence without editing source expectations to pass.

**Acceptance:** Complete customer journeys execute on a named build; negative cases do not rely on fake success; deferred/unsupported/not-run tests are distinct; changes have regression coverage.

**Review:** D14 security; D01 scope; D20 artifact; an available reviewer distinct from the author.

**Requirement links:** Cross-cutting/source sections and NFR requirements; WP35/WP36 retain their stated future or conditional scope.

**Approved 1.4 detail retained:** preserve all existing scenario IDs, use the revised SUP-07 meaning, and add VM-01–VM-24. Record actual evidence; inherited NOT_RUN/DEFERRED_V2 statuses are not implementation results. Exercise blocked capabilities beyond hidden UI, including APIs, jobs, licence flags, restore and update paths.

<a id="wp32"></a>

### WP32 — Performance, capacity and destructive-failure safety

**Accountable source role:** D19 — Performance / Reliability Engineer. **Contributors:** D03 D04 D05 D06 D07 D08 D17 D18.  
**Acceptance predecessors:** WP03, WP08, WP09, WP28.  
**Source:** [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43), [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92), [§129](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-129), [§130](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-130), [§131](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-131), [§174](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-174), [§175](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-175), [§176](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-176), [§177](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-177). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Build bounded load/race/fault workloads for policy decisions, consent transitions, workers, connectors and storage. Measure against declared configuration; investigate saturation, retries, noisy neighbours, disk pressure and recovery.

**Source deliverables:** Workload/hardware specification; load and fault scripts; latency/throughput/recovery results; tuning recommendations and known limits.

**Continue from the fragment:** Measure representative loads/latency/propagation and failure recovery for accepted profiles, including quotas, slow targets, DB locks, queues and disk pressure. Do not substitute inherited prototype measurements for product capacity.

**Acceptance:** No stale grant/reactivated control under concurrency; load never bypasses permission/safety; retries respect provider budgets; targets are reported as measured, unmet or untested.

**Review:** D17 environment; D18 reproducibility; D14 failure safety.

**Requirement links:** FR-M32-01–04

<a id="wp33"></a>

### WP33 — Optional rules-based Guided Assistance

**Accountable source role:** D13 — AI Applications Engineer. **Contributors:** D12 D02 D04 D09 D10 D14 D18.  
**Acceptance predecessors:** WP03, WP05, WP13, WP20, WP26.  
**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§103](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-103), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§157](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-157), [§158](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-158), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). **Release qualification:** V1_OPTIONAL_RULES_ONLY.

**Source build outcome:** Implement a small reviewed rule/error catalogue, local documentation search, runbook suggestions, configuration checklists and validated templates. Reuse existing data/permission structures. Start with error explanations and links; do not add a new AI service.

**Source deliverables:** Versioned rule/runbook pack; deterministic guidance contract; optional local UI; source/version labels; no-match/insufficient-context states.

**Continue from the fragment:** Optional exact error/runbook/local search/template guidance only. Reuse existing help/validation/audit; no learned embeddings/model service. Omission does not remove required documentation or support.

**Acceptance:** Known error maps to reviewed facts/runbook; no arbitrary execution or invented root cause; missing helper leaves core/direct support usable; no weights/API/embedding/model dependency.

**Review:** D12 deterministic fixtures; D14 content/egress; D18 helper absence; qualified content review.

**Requirement links:** Cross-cutting/source sections and NFR requirements; WP35/WP36 retain their stated future or conditional scope.

<a id="wp34"></a>

### WP34 — Developer experience, CLI, documentation and customer handover

**Accountable source role:** D20 — Release / Platform / Developer Experience Engineer. **Contributors:** D01 D06 D09 D10 D13 D15 D17 D18; customer IT.  
**Acceptance predecessors:** WP01.  
**Source:** [§41](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-41), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§83](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-83), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§114](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-114), [§115](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-115), [§154](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-154), [§155](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-155), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156), [§161](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-161), [§162](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-162), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168), [§184](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-184), [§186](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-186), [§197](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-197). **Release qualification:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES.

**Source build outcome:** Document actual APIs/SDKs/webhooks/connectors, reviewed local install/upgrade/restore, feature limits, role administration, offboarding and safe support. Package CLI commands against the same permission/API contracts. Prepare operator training and acceptance.

**Source deliverables:** OpenAPI/SDK/CLI guides; quickstart; permissions/runbook catalogue; local handover/export manifest; truthful release/demo narrative.

**Continue from the fragment:** Keep maintained CLI/SDK/API/install/recovery/support documentation and actual commands. Deliver real packaging/contract tools, not a new plan file per feature. Customer handover includes unresolved coverage and data boundaries.

**Acceptance:** A fresh operator can reproduce documented supported install/workflow/recovery steps; examples match current build; offboarding exports locally and revokes credentials without artificial lock-in.

**Review:** D18 reproduction; D14 privacy; customer IT/operator acceptance.

**Requirement links:** FR-M29-01–04

<a id="wp35"></a>

### WP35 — Future custom ORVIA Intelligence

**Accountable source role:** D12 — AI/ML Engineer. **Contributors:** D13 D04 D14 D16 D18 D19 D20; privacy/content reviewer.  
**Acceptance predecessors:** No new V1 predecessor; see release qualification.  
**Source:** [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§64](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-64), [§65](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-65), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§67](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-67), [§68](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-68), [§69](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-69), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§71](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-71), [§72](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-72), [§73](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-73), [§74](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-74), [§112](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-112), [§113](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-113), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). **Release qualification:** DEFERRED_V2.

**Source build outcome:** Preserve the full from-scratch model lineage, approved public/licensed and vendor-authored corpus, authorised Lightning development, local inference, grounded assistance, safety/evaluation and signed model releases. This work begins only under a separately approved V2 plan.

**Source deliverables:** Future corpus/model/evaluation/provenance and local-inference artifacts; future model-driven applications owned by D13.

**Continue from the fragment:** DEFERRED_V2. Preserve the source custom-model design; do not create training/inference/GPU/vector/model folders or dependencies now. V1 absence and no-customer-training tests still apply.

**Acceptance:** V1 build/install/runtime/CI does not depend on this package. Future model tests remain DEFERRED_V2; customer data never becomes training material.

**Review:** Future independent model/data/security review; founder separately approves budget.

**Requirement links:** Cross-cutting/source sections and NFR requirements; WP35/WP36 retain their stated future or conditional scope.

<a id="wp36"></a>

### WP36 — Previously later ecosystem and advanced expansion ownership

**Accountable source role:** D01 — Chief Architect / Technical Lead. **Contributors:** D04 D06 D08 D11 D14 D16 D18 D20; privacy SME.  
**Acceptance predecessors:** No new V1 predecessor; see release qualification.  
**Source:** [§21](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-21), [§41](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-41), [§52](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-52), [§60](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-60), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§80](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-80), [§86](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-86), [§142](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-142), [§143](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-143), [§153](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-153), [§154](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-154), [§199](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-199), [§215](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-215). **Release qualification:** EXISTING_ROADMAP_QUALIFICATION_UNCHANGED.

**Source build outcome:** Keep explicit owners for national/Consent Manager interoperability, later SDKs/mobile/channels, marketplace/plugins, advanced crypto deletion, restricted deployments and customer-AI-processing governance. Already supported V1 portions stay in their active packages; this register does not move them to V2.

**Source deliverables:** Per-capability prerequisites, jurisdiction/provider decisions, conformance/support boundaries and retained roadmap backlog.

**Continue from the fragment:** Retain the source-specific later/advanced qualifications for national/interoperability/marketplace/crypto/customer-AI-governance work. Do not automatically pull these into V1 or use them to defer unrelated ordinary V1 functions.

**Acceptance:** No unsupported universal coverage, unlearning or integration claim. No new deadline or promise; each capability needs source/legal/security/integration gates already in the master.

**Review:** D14/D18 and the relevant qualified privacy/customer reviewer.

**Requirement links:** Cross-cutting/source sections and NFR requirements; WP35/WP36 retain their stated future or conditional scope.

## 5. Full-stack outcome ownership

| Complete outcome | Lead | Required integration partners |
|---|---|---|
| Buy → signed download → install → local owner | D20 | D02 commerce, D09 UI, D15 identity, D16 deployment, D14/D18 review |
| Consent → downstream restriction → independent observation → evidence | D05 | D02/D03/D04, D06–D08, D09/D11, D18 |
| Rights → authority/scope → approved execution → safe response | D05 | D15 identity, D03 graph, D07/D08 adapters, D11 portal, D14 disclosure |
| Control change → impact → privacy regression | D04 | D03 graph, D06 adapter coverage, D18 tests, D09 UI, D20 CLI |
| Reported fault → exact approved diagnostic → fix → local verification | D13 | D12 exporter, D02/D09 vendor service, D14 boundary, D20 patch, D17 recovery |
| Update/restore → preserve authority/restrictions → safe resume | D20 | D16/D17 infrastructure, D05 workflow, D15 identity, D14/D18/D19 checks |

A role completing its file is not the same as the outcome passing. The lead owns integration and defect coordination; other domains retain their own authority.

## 6. Parallel ownership and dependency handoff

Keep one owner for canonical contracts, one coordinated migration ledger per plane, one dependency/lockfile writer, one source-path migration owner and explicit UI/domain boundaries. Agents exchange typed contracts, capability/error semantics and actual checks, not free-form promises. Schema changes and generated clients ship together. Non-authorised agents report findings with reproduction and expected result rather than editing another owner's file.

A ready task identifies requirement IDs/source sections, current base commit, permitted paths, dependencies, design/OPEN decisions, data/authority boundary, expected behaviour, failure cases and tests. A complete handoff identifies exact changed paths, API/schema compatibility, executed results, remaining gaps and next consumer. Use the repository's maintained handoff/tracking location; do not create a new redundant file for every thought or tool call.

## 7. Integration and completion rules

Keep one default working integration branch and separately protected presentation resources. Short-lived branches/worktrees must not share mutable databases/volumes/ports/result files without explicit coordination. Integrate bounded changes after compiler/contract/unit checks plus the relevant real integration/UI/security tests; do not postpone testing until every module is written.

Before broad expansion, requalify the new backend/privacy-control boundary and resolve actual production/synthetic composition. Then choose ready requirements from the dependency graph; work in different owned areas concurrently. Important common primitives—identity, evidence, transactions, policy and connector contracts—must remain shared, not copied into each feature.

A review checks functionality, state transitions, scope/auth, exact data ownership, error/unknown handling, migration/replay safety, minimal file/dependency changes, UI truthfulness, tests and operations. A new file without a requirement and consumer is removed; required tests/security/recovery evidence are retained. Placeholder implementations, disabled checks and broad rewrites are not acceptable completion shortcuts.

## 8. Release evidence and decision dependencies

Maintain implemented/tested/supported/licensed/accepted statuses separately. A production gate depends on the specific deployed scope and independent review, not a source-section coverage percentage. Use [TEST_AND_ACCEPTANCE](TEST_AND_ACCEPTANCE.md), the source production blockers and the OPEN register. Missing vendor payment credentials, legal approval or customer infrastructure does not justify fake production success; record the dependency and continue independent work.

The deliverable is real integrated software with declared supported capabilities. This plan itself does not assert the remaining product is finished, assign dates, reduce safety standards or start code/deployment/spending actions.
