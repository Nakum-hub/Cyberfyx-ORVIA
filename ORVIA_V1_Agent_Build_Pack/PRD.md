# ORVIA — Product requirements document

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Product outcomes and acceptance boundaries for the remaining full V1 programme, not a reduced prototype.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## 1. Product thesis and user value

ORVIA operationalises reviewed privacy requirements across supported customer systems: **DISCOVER → GOVERN → EXECUTE → ENFORCE → VERIFY → TEST → IMPROVE**. The central graph, policy, workflow, connector, evidence and testing models are shared. The goal is not disconnected consent/rights/incident pages. Sources: [§2](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-2), [§3](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-3), [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§201](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-201), [§209](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-209), [§212](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-212).

A privacy officer needs obligations, owners, deadlines and unresolved outcomes. An engineering user needs exact control boundaries, safe integrations, changes and regression evidence. An auditor needs attributable, scoped observations and historical context. Customer IT needs predictable installation, identity, secrets, updates and recovery. Purchasing/support contacts need the independent commercial interface. Data Principals need a customer-hosted privacy interaction, not an ORVIA billing account.

## 2. Scope and release meaning

The original module IDs remain unchanged: 26 non-model modules (M01–M18 and M26–M33) belong to the V1 baseline with existing support/rollout gates. M19–M25 are **DEFERRED_V2**. Control packages/simulation and assessments/SDF work are included where the source specifies them; they do not vanish because the initial module list predates those additions.

Retain existing later qualifications: national cross-company identity is not V1; customer-AI-processing governance is a separate already-later extension, not a reason to train or deploy ORVIA AI; marketplace and Consent Manager interoperability require their own prerequisites. Advanced crypto deletion and deployment/connector expansions retain their original conditional support. Do not turn all P1/P2 priorities into Product Version 2 deferrals, and do not silently call an unimplemented required V1 module complete. Sources: [§1](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-1), [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§21](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-21), [§52](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-52), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§153](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-153), [§199](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-199), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213), [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214), [§215](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-215), [§216](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-216).

**Excluded across V1 editions:** custom/third-party model inference or training; customer-runtime/database replication to the vendor; staff-directory synchronisation; employee-activity monitoring; proactive vendor diagnostic feeds; live vendor remote desktop/shell/SQL/impersonation/tunnels. Individual customer-approved diagnostics and customer-applied patches remain included. These are architectural exclusions, not premium feature flags.

## 3. Product surfaces and authority

| Surface | Audience | Data/authority boundary |
|---|---|---|
| Public website | Prospective buyers | Product, approved claims, editions, documentation, reviewed non-operational readiness questionnaire |
| ORVIA Account | Designated commercial contacts | Purchases, invoices, licences, downloads and own permitted support records |
| Vendor Administration and Support Console | Assigned vendor staff | Limited organisation profiles, designated contacts, cases and release information; never a runtime administrator |
| Customer Workspace | Local owner/admin/specialised roles/members | Customer operational data, policies, systems, requests, controls, evidence and health |
| Customer Privacy Centre | Data Principals/authorised representatives | Only their permitted customer-local interactions |

Exactly one active primary local owner follows protected bootstrap; specialised role grants and delegated administrators remain distinct from ownership. A designated vendor contact is not proof of the person's current local authority. Sources: [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§102](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-102).

## 4. Requirements by original module

Requirement IDs below are build-pack identifiers; original M/WP/section IDs are retained. Each requirement references the linked source sections. Repository observations are deliberately narrower than product requirements.

## M01 — Identity and Access Management

**Outcome:** An authorised customer can establish and recover its own owner account, delegate access and revoke it without vendor intervention.

**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§109](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-109), [§127](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-127). **Technical accountability:** D15; WP02, WP30.

**Baseline:** OBS: staff/principal sessions and four staff role labels exist in the prototype contracts; production owner bootstrap, delegated grants, recovery and vendor identities are not established by this inspection.

| Requirement | Required behaviour |
|---|---|
| FR-M01-01 | Create exactly one active primary owner assignment after protected local setup; concurrent claim and ownership-transfer attempts must not create a second primary owner. An unclaimed installation exposes only the protected setup path. |
| FR-M01-02 | Use the maintained authentication implementation for sessions and privileged MFA. Invitations are single-use, expiring and scope-bound; possession of an invite does not bypass identity establishment or current grant authority. |
| FR-M01-03 | Distinguish possessed capabilities from delegable capabilities. Member-management does not imply administrator-grant or ownership-transfer rights; no self-elevation or last-owner lockout. |
| FR-M01-04 | Enforce independent vendor-staff, commercial-contact, customer-staff, principal and service identities at every API/job/search/export boundary, with local recovery and revocation checks. |

**Important failure paths:** Expired/replayed invitation; concurrent ownership transfer; stale session after role revocation; wrong identity domain; lost MFA; absent recovery evidence.

**Acceptance:** Reject a vendor token at the customer API; prove sibling-scope denial, one-owner concurrency and recovery without a vendor key.

**Data ownership:** OwnerAssignment, Membership, RoleBinding, Invitation, RecoveryRecord, ServiceIdentity; authentication secrets remain in their own authority domain.

## M02 — Tenant Management

**Outcome:** An owner manages its organisation, legal entities, environments and explicitly supported subtenants without merging their records or authority.

**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35), [§36](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-36), [§101](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-101). **Technical accountability:** D02; WP03, WP02.

**Baseline:** OBS: tenant/legal-entity/environment Scope exists. General organisation lifecycle and subtenant administration require implementation/revalidation.

| Requirement | Required behaviour |
|---|---|
| FR-M02-01 | Model organisation, legal entity, environment, membership and optional subtenant as separate concepts; no automatic tenant per employee and no inferred consent sharing across a group. |
| FR-M02-02 | Bind tenant context to validated authority. Require scoped keys, predicates and tenant-aware foreign references for every owned record, including background work and exports. |
| FR-M02-03 | Provide create/update/suspend and delegated environment administration with version checks and audit. Suspension cannot erase evidence or silently relax accepted privacy restrictions. |
| FR-M02-04 | Keep vendor commercial accounts in a separate store with their own assignment checks. A shared design system is not a shared database, cookie store or privileged key. |

**Important failure paths:** Missing scope; scope mismatch; cached data from previous tenant; dangling cross-tenant relationship; wrong environment mutation.

**Acceptance:** A scoped operation survives restart; pooled connection reuse and missing-context jobs never disclose another tenant; suspension has defined continuity.

**Data ownership:** Organisation, LegalEntity, Environment, Subtenant and scoped membership/reference records.

## M03 — Privacy Control Graph

**Outcome:** A privacy officer can follow a purpose through data, systems, processors, controls, actions and evidence, with provenance and historical versions.

**Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§8](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-8), [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§105](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-105), [§157](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-157), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213), [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214). **Technical accountability:** D03; WP04.

**Baseline:** OBS: current control-map/target-mapping concepts are a fragment, not full inventory, lineage, legal-source or impact functionality.

| Requirement | Required behaviour |
|---|---|
| FR-M03-01 | Provide relational entities and typed relationships for the source graph, including data assets/datasets/fields, processing activities, copies, recipients and ownership. Start with PostgreSQL, not a new graph database. |
| FR-M03-02 | Ingest scoped connector discovery and customer declarations with distinct asserted/observed provenance, review state, recorded/valid time and freshness. Do not infer purpose from a field name alone. |
| FR-M03-03 | Provide bounded, authorised traversal and full-text/keyword search. Changing a system/processor/purpose relationship identifies affected policies, workflows, tests, assessments and owners. |
| FR-M03-04 | Preserve historical links needed by old evidence. Deletion of personal payloads leaves only justified integrity/tombstone references, not an invisible rewrite of history. |

**Important failure paths:** Partial discovery; revoked scan permission; stale snapshot; unknown destination; conflicted identity link; missing historical version.

**Acceptance:** A processor change produces a reviewed impact set; old evidence resolves its original graph version; incomplete discovery cannot yield complete-coverage claims.

**Data ownership:** Graph relationships, DataAsset, Dataset, Field, ProcessingActivity, ProcessingCopy, DataFlow, SourceInstrument and version references.

## M04 — Policy Engine

**Outcome:** An authorised reviewer publishes an exact policy version, and integrated boundaries enforce the returned decision and obligations.

**Source:** [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§13](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-13), [§14](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-14), [§15](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-15), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§40](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-40), [§41](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-41), [§42](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-42), [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43), [§148](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-148), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§166](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-166), [§167](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-167), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213). **Technical accountability:** D04; WP05, WP12, WP19.

**Baseline:** OBS: OPA-backed ALLOW/BLOCK/INDETERMINATE and exact policy publication exist in the narrow prototype. Full decisions, obligations, regulatory packs and general control compilation remain.

| Requirement | Required behaviour |
|---|---|
| FR-M04-01 | Maintain versioned purposes and processing conditions; do not treat all activity as consent-based or import generic legitimate-interest permission. Store reviewed source/applicability separately from executable technical rules. |
| FR-M04-02 | Implement draft/review/approval/publication/supersession without editing published versions. Approval binds exact version/digest and configured maker/checker checks. |
| FR-M04-03 | Return the master decision vocabulary with reason codes, exact policy/version, scope, freshness, consent epoch and enforceable obligations. A consumer unable to mask/restrict must reject or escalate, not return unrestricted success. |
| FR-M04-04 | Keep administrative authorisation and processing decisions in distinct namespaces. Runtime projections/bundles serve supported low-latency paths; no full inventory scan, long workflow or model call in the hot path. |

**Important failure paths:** Policy unavailable; stale revocation; unsupported obligation; changed candidate after approval; future-effective rule; policy rollback after withdrawal.

**Acceptance:** Fail closed/queue according to approved action policy; unsatisfied obligations do not pass; historic decisions keep their version while new effects recheck current safety.

**Data ownership:** PurposeVersion, PolicyVersion, PublicationApproval, RegulatoryPack, ApplicabilityAssessment, ProcessingDecision, ControlVersion.

## M05 — Workflow Engine

**Outcome:** Accepted privacy work continues across restarts and external failures, with accountable manual steps and explicit unresolved effects.

**Source:** [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§18](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-18), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24), [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99), [§100](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-100), [§149](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-149), [§174](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-174), [§175](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-175), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178), [§179](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-179). **Technical accountability:** D05; WP08.

**Baseline:** OBS: withdrawal orchestration exists. General request/retention/incident workflows and durable production deployment need expansion.

| Requirement | Required behaviour |
|---|---|
| FR-M05-01 | Commit accepted domain state and outbox event atomically; deliver at least once with inbox/deduplication and aggregate-version checks. No in-memory-only business queue. |
| FR-M05-02 | Create typed plan versions and separately recorded action attempts, approvals, commands, receipts, observations and reconciliations. Bind approval to identity, generation, scope, budget, policy and expiry. |
| FR-M05-03 | Treat a lost response after an effect as unknown. Reconcile via supported receipt/readback; retry only with proven idempotence or a safe supported operation. Unsafe uncertainty requires review. |
| FR-M05-04 | Support pause, escalation, manual tasks, dead-letter inspection and version-safe resumption. Retain the executing definition version; cancellation stops new work safely but cannot promise to undo irreversible effects. |

**Important failure paths:** Publisher crash; worker death after effect; changed scope; replay; exhausted retry; revoked approver; stale record generation.

**Acceptance:** Restart at each durable boundary without lost accepted work or blind duplicate destruction; cancelled/closed administration never fabricates verification.

**Data ownership:** Outbox, Inbox, WorkflowExecution, PlanVersion, ApprovalBinding, ActionAttempt, ManualTask, Reconciliation and dead-letter metadata.

## M06 — Connector Framework

**Outcome:** Customer IT connects a supported system locally, proves scoped permissions and enables only supported operations.

**Source:** [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§29](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-29), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§128](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-128), [§147](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-147), [§171](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-171), [§172](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-172), [§173](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-173), [§174](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-174), [§176](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-176), [§177](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-177), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178). **Technical accountability:** D06; WP09, WP10, WP11.

**Baseline:** OBS: a signed agent and synthetic connector family exist. The new TargetObserver is narrow; production connector onboarding/catalogue are not established.

| Requirement | Required behaviour |
|---|---|
| FR-M06-01 | Declare versioned resource/action/permission-specific capability manifests: discovery, matching, read, plan, action, reconciliation and verification; expose limitations and consistency windows. |
| FR-M06-02 | Implement local guided setup with TLS checks, dedicated service identities, secret references, explicit resource allowlists, mapping review, dry-run and Observe-first activation. No automatic self-grant or root/DBA shortcut. |
| FR-M06-03 | Have the agent independently validate command signature, identity, installation, environment, nonce, expiry, capability, generation, approval digest and budget. Separate update trust from execution trust. |
| FR-M06-04 | Provide controlled database/API adapters, pagination completeness, partial results, rate limits, circuit breakers, bounded spool and revocation. Keep file/manual onboarding visibly separate from live integration. |

**Important failure paths:** Wrong-tenant signed command; invalid cert; permission removal; partial pages; credential expiry; SSRF; spool full; plugin secret crossing.

**Acceptance:** A discovery-only identity cannot mutate; unsupported verification is explicit; connector conformance includes failure/replay/permission-change cases.

**Data ownership:** ConnectorRelease, Installation, ConnectionSetup, PermissionCheck, ConnectorScope, SourceMapping, capability snapshots and secret references.

## M07 — Verification Engine

**Outcome:** An operator knows exactly which result was observed, how it was observed and what remains outside verification.

**Source:** [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§47](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-47), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§51](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-51), [§169](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-169), [§173](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-173). **Technical accountability:** D07; WP13, WP10, WP11.

**Baseline:** OBS: independent synthetic scoped observations exist. General connector observations and outcome-claim lifecycle remain incomplete.

| Requirement | Required behaviour |
|---|---|
| FR-M07-01 | Record configuration, capability, attempt, acknowledgement, observation, test and integrity as separate dimensions, not levels of one universal compliance score. |
| FR-M07-02 | Attach claim, scope, method, observation time, source, connector/policy version, generation, consistency delay, validity and limitations to every outcome claim. |
| FR-M07-03 | Invalidate freshness after the declared window or material control/system change. Reopen the associated gap when observation fails or loses coverage. |
| FR-M07-04 | Treat provider assertions and manual attestations as attributable statements, not independent scoped observation. Sampling must state its sample and cannot substantiate whole-population deletion. |

**Important failure paths:** API success with unchanged target; stale observation; partial read; no verification permission; contradicted manual assertion.

**Acceptance:** One unobservable declared destination prevents a verified-across-all claim; method/generation/freshness survive exports and replay.

**Data ownership:** VerificationObservation, OutcomeClaim, CoverageAssertion, verification schedule and Gap references.

## M08 — Evidence Engine

**Outcome:** An auditor reconstructs an authorised operation and validates its recorded integrity without receiving unsupported proof claims.

**Source:** [§45](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-45), [§46](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-46), [§47](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-47), [§101](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-101), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§133](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-133), [§134](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-134), [§150](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-150), [§162](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-162), [§169](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-169). **Technical accountability:** D02; WP14.

**Baseline:** OBS: local evidence timeline/export exists for withdrawal. Broad evidence retention, report formats and offline validation need completion.

| Requirement | Required behaviour |
|---|---|
| FR-M08-01 | Create append-oriented events for material privacy actions with exact policy/workflow/action/actor/approval/version references. Corrections append rather than replace. |
| FR-M08-02 | Separate minimal evidence envelopes from protected personal payloads. Apply per-class retention across payloads, indexes, exports and backups; tombstones explain intentional deletion. |
| FR-M08-03 | Generate permission-scoped local JSON, supported CSV/PDF and signed packages; prevent third-party disclosure, audit creation/access and support expiring authenticated delivery. |
| FR-M08-04 | Provide an offline integrity verifier that reports manifest/hash/signature continuity and separately states that integrity is not proof of external-world truth. |

**Important failure paths:** Tampered payload; broken chain; missing historic version; expired link; unauthorised export; malicious CSV formula; payload already purged.

**Acceptance:** Export matches scoped stored facts and gaps; tampering is detected; purging payload leaves truthful justified history and no vendor copy.

**Data ownership:** EvidenceEnvelope, EvidencePayload, Correction, ExportJob, ExportArtifact, integrity manifest and AuditEvent.

## M09 — Privacy Test Engine

**Outcome:** An engineer defines a synthetic privacy scenario and detects whether an integrated control changed behaviour.

**Source:** [§57](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-57), [§58](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-58), [§59](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-59), [§60](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-60), [§61](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-61), [§125](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-125), [§193](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-193), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213). **Technical accountability:** D18; WP18, WP19.

**Baseline:** OBS: narrow regression runs exist. Reusable definitions, broader categories, scheduling, CLI/CI and historical run queries need completion.

| Requirement | Required behaviour |
|---|---|
| FR-M09-01 | Model versioned test definitions with preconditions, permitted synthetic scope, steps, expected results, severity, policy and environment. |
| FR-M09-02 | Execute supported actions and independently inspect outcomes; store expected/actual per assertion, run identity, build, interruptions and cleanup. A failed control remains FAIL even when detection worked correctly. |
| FR-M09-03 | Block accidental targeting of real/destructive production records. Use explicit synthetic identities, generation checks and resource budgets, including cleanup safety. |
| FR-M09-04 | Provide machine-readable results, run history, schedules and supported CI integration. The product test engine and ORVIA development QA remain different responsibilities. |

**Important failure paths:** Broken control; interrupted runner; invalid fixture; unsafe environment; stale test contract; cleanup failure.

**Acceptance:** A deliberate bypass yields a genuine failed assertion linked to the affected boundary; repair passes only after execution and observation.

**Data ownership:** TestDefinition, TestVersion, TestRun, TestAssertion, FixtureLease, execution/cleanup records.

## M10 — Notification Engine

**Outcome:** The right customer actor receives a factual, permitted notification and can distinguish dispatch from delivery.

**Source:** [§54](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-54), [§55](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-55), [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§98](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-98), [§100](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-100), [§175](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-175). **Technical accountability:** D08; WP17, WP11.

**Baseline:** OBS: no general notification platform is established by the inspected fragment.

| Requirement | Required behaviour |
|---|---|
| FR-M10-01 | Drive in-app/email/approved-webhook notifications from durable events with template version, recipient scope, purpose and preference rules where applicable. |
| FR-M10-02 | Use customer-controlled delivery for operational/principal messages; vendor billing notifications use separately designated business contacts only. |
| FR-M10-03 | Separate queued, sent, delivered, failed and acknowledged evidence; use retry/deduplication and local escalation without silently resetting deadlines. |
| FR-M10-04 | Keep legal declarations and regulator dispatch subject to customer review; no fabricated Board filing integration. No proactive diagnostic stream to vendor support. |

**Important failure paths:** Relay unavailable; duplicate event; invalid destination; unapproved external provider; review delay; bounce/unknown delivery.

**Acceptance:** One recipient never receives another principal's details; repeated events do not cause uncontrolled duplicate dispatch; draft is never labelled delivered.

**Data ownership:** NotificationTask, TemplateVersion, DeliveryAttempt, RecipientScope and approved webhook endpoint.

## M11 — Consent Management

**Outcome:** A principal grants or withdraws a specific purpose and sees an immutable receipt and the current propagation state.

**Source:** [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§18](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-18), [§19](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-19), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99). **Technical accountability:** D02; WP06.

**Baseline:** OBS: grant/withdraw/epoch/receipt work exists but purpose/notice/channel/identity inputs are intentionally synthetic and narrow.

| Requirement | Required behaviour |
|---|---|
| FR-M11-01 | Capture exact notice digest/version/language, affirmative interaction, purpose scope, source and time without device fingerprinting as a substitute for validity. |
| FR-M11-02 | Maintain an authoritative scope/principal/purpose aggregate and monotonic epoch; record event and outbox atomically. Old grants cannot overwrite a withdrawal. |
| FR-M11-03 | Distinguish fresh authorised re-consent from retries; recheck record generation/current authority before stale work affects newly authorised records. |
| FR-M11-04 | Keep channel preferences, consent and suppression distinct. Imported consent retains SUPPORTED/INCOMPLETE_EVIDENCE/CONFLICTING/REVIEW_REQUIRED provenance and never blindly overrides newer decisions. |

**Important failure paths:** Epoch conflict; duplicate interaction; old import; material purpose expansion; ambiguous subject; expiry before effect.

**Acceptance:** Concurrent/reordered events preserve monotonic state; withdrawing does not require acceptance of a new notice; receipts retain historic content references.

**Data ownership:** ConsentAggregate, ConsentEvent, Receipt, Preference, Suppression, capture/import provenance.

## M12 — Notice Management

**Outcome:** A privacy administrator publishes reviewed notices in the required language and can explain what each principal was shown.

**Source:** [§15](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-15), [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§19](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-19), [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§155](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-155), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156), [§167](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-167). **Technical accountability:** D02; WP06.

**Baseline:** OBS: a versioned English notice subset exists. Expanded language, notice migration and change classification remain.

| Requirement | Required behaviour |
|---|---|
| FR-M12-01 | Create draft, reviewed and immutable published notice variants tied to purposes, data categories, effective dates and contact information. |
| FR-M12-02 | Preserve exact content digests and language/version relationships; do not render a historic receipt using the newest notice. |
| FR-M12-03 | Classify notice changes as editorial, translation or material scope change; store an approved migration/fresh-consent decision and affected grants. |
| FR-M12-04 | Provide understandable accessible presentation and review of legally significant translations. English-first administration must not erase required principal language choices. |

**Important failure paths:** Missing reviewed translation; mismatched digest; reused consent for expanded purpose; broken historic reference.

**Acceptance:** Material changes do not silently expand grants; a receipt resolves the exact published language/content it captured.

**Data ownership:** Notice, NoticeVersion, LanguageVariant, NoticeMigrationPlan and approval record.

## M13 — Data Principal Portal

**Outcome:** A Data Principal uses a customer-branded privacy centre without an ORVIA purchasing account.

**Source:** [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24), [§33](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-33), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§154](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-154), [§155](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-155), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156). **Technical accountability:** D11; WP22, WP07.

**Baseline:** OBS: own consent and history screens exist. Rights/representation/grievance and scoped response delivery need expansion.

| Requirement | Required behaviour |
|---|---|
| FR-M13-01 | Serve notices, consent, withdrawals, requests, grievances and supported representation flows from customer-controlled services with locally bundled assets. |
| FR-M13-02 | Enforce self/mandate-scoped reads and non-enumerating public status; proportionate identity verification does not require blanket identity-document collection. |
| FR-M13-03 | Provide accessible, language-aware, low-bandwidth/assisted journeys, honest pending states and secure upload/delivery for required evidence and responses. |
| FR-M13-04 | Separate public portal exposure from private administration and databases; no vendor proxy, session replay, external chat widget or operational telemetry. |

**Important failure paths:** Wrong principal; revoked representative; inaccessible verification step; unsafe file; expired response; network interruption.

**Acceptance:** Principal A cannot access B's request; public ingress cannot call staff APIs; retry after acceptance returns the same request/receipt safely.

**Data ownership:** PortalIdentity, Request, ConsentReceipt, Mandate, Attachment and expiring response reference.

## M14 — Rights Management

**Outcome:** A privacy operator handles access, correction, erasure, grievance or nomination through verified identity, scoped work and an honest response.

**Source:** [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24), [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§50](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-50), [§51](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-51), [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56). **Technical accountability:** D05; WP07, WP08.

**Baseline:** OBS: general rights orchestration is not established by the inspected withdrawal fragment.

| Requirement | Required behaviour |
|---|---|
| FR-M14-01 | Implement the master request state vocabulary with independent identity, authority, execution, response and unresolved-scope dimensions. |
| FR-M14-02 | Support exact/strong/probable/ambiguous/no-match review; ambiguous identity blocks disclosure and destructive automation. A verified channel is not universal ownership of all historic records. |
| FR-M14-03 | Model nomination and guardian mandates separately, including revocation, permitted scope, invocation and adulthood/authority changes. Baseline child safeguards apply where processing is supported. |
| FR-M14-04 | Plan per-system actions, retention exceptions and response redaction; retain manual/unverified destinations. CLOSED is administrative closure, not universal erasure. |

**Important failure paths:** Shared/recycled contact; expired mandate; incompatible hold; partial targets; third-party data in response; failed secure delivery.

**Acceptance:** Revoked authority blocks new actions; scope changes invalidate approval; access response is reviewed and excludes unrelated persons.

**Data ownership:** PrivacyRequest, IdentityAssertion/Link, RepresentationMandate, Nomination, AgeAssuranceRecord, ScopeDecision and ResponsePackage.

## M15 — Retention Management

**Outcome:** A customer restricts and deletes eligible processing copies without destroying separately justified retained data or reactivating it after restore.

**Source:** [§50](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-50), [§51](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-51), [§52](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-52), [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178). **Technical accountability:** D05; WP15.

**Baseline:** OBS: synthetic target restriction/restore is not a general deletion, legal-hold or backup-erasure implementation.

| Requirement | Required behaviour |
|---|---|
| FR-M15-01 | Evaluate retention per copy/category/processing context with trigger, source, minimum/maximum constraints, permitted use, owner and review/release condition. |
| FR-M15-02 | Create exact-scope legal holds and reviewed conflict decisions. Neither longest-duration retention nor generic business need is a universal override. |
| FR-M15-03 | Execute bounded copy-level suppression/deletion through supported adapters with dependency order, generation checks, budgets, checkpoints and approval. |
| FR-M15-04 | Record live-store, derived-copy, processor and backup outcomes separately. Restore into quarantine and reconcile current restrictions before resuming; crypto deletion is optional advanced scope with explicit key-copy limitations. |

**Important failure paths:** Shared key; stale generation; released hold; unknown replica; lost response; restored stale audience; DB overload.

**Acceptance:** Marketing stops while a justified transaction copy stays purpose-restricted; unknown backups remain unverified; hold release re-evaluates rather than blindly deletes.

**Data ownership:** RetentionConstraint, LegalHold, EligibilityDecision, DeletionPlan, ProcessingCopy, SuppressionLedger and RestoreReconciliation.

## M16 — Processor/Vendor Management

**Outcome:** A customer identifies processors, contractual scope and unresolved obligations, and connects assessments to controls and remediation.

**Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§53](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-53), [§166](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-166), [§167](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-167), [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214). **Technical accountability:** D03; WP16, WP11.

**Baseline:** OBS: a systems/control-map fragment does not establish processor contracts, SDF governance or assessments.

| Requirement | Required behaviour |
|---|---|
| FR-M16-01 | Capture processor relationships, authorised purpose/data/subprocessor scope, region, contract reference, owner and incident/action contacts locally. |
| FR-M16-02 | Track processor notification, acknowledgement and independent verification as different facts; missing API integration becomes attributed coordination work. |
| FR-M16-03 | Link assessments, findings, exceptions and remediation tasks to actual systems, purposes and controls; closure needs defined evidence or a retest. |
| FR-M16-04 | Activate SDF/sector-specific assessment workflows only through reviewed applicability; a questionnaire or runtime pass does not certify all organisational duties. |

**Important failure paths:** Processor changed; expired contract evidence; unapproved subprocessor; no acknowledgement; stale assessment; unresolved applicability.

**Acceptance:** Changing a processor produces affected-control review; finding closure has accountable evidence and does not fabricate runtime verification.

**Data ownership:** Processor, ProcessorRelationship, ContractReference, Assessment, Finding, ExceptionDecision, RemediationTask.

## M17 — Privacy Incident Explorer

**Outcome:** A customer responds to an incident using an evidence-linked timeline and separate notification obligations.

**Source:** [§54](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-54), [§55](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-55), [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§108](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-108), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165). **Technical accountability:** D05; WP17.

**Baseline:** OBS: general incident/notification clocks are not established by inspected source.

| Requirement | Required behaviour |
|---|---|
| FR-M17-01 | Record occurrence, detection, awareness and each obligation trigger with source/reviewer; corrections append and do not silently restart clocks. |
| FR-M17-02 | Link affected systems, purposes, controls, processors and principal scope with evidence and uncertainty. Severity is configurable deterministic policy, not inferred law. |
| FR-M17-03 | Create independent applicability/deadline/draft/review/dispatch tasks per recipient/regime; use approved rule packs rather than hard-coded universal hours. |
| FR-M17-04 | Escalate overdue reviews and uncertain delivery; produce a manual submission package where no supported authorised filing channel exists. |

**Important failure paths:** Conflicting timestamps; pending applicability; review bottleneck; processor response missing; notification partial delivery.

**Acceptance:** One incident can show completed initial communication, pending detailed report and unresolved legal review independently; changed awareness keeps original clock history.

**Data ownership:** Incident, IncidentEvent, AffectedScope, NotificationObligation, ClockVersion, Draft and DispatchEvidence.

## M18 — Coverage and Failure Center

**Outcome:** An operator sees gaps and failing controls with an accountable next action, rather than a misleading compliance score.

**Source:** [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§104](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-104), [§169](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-169), [§173](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-173). **Technical accountability:** D07; WP13, WP19.

**Baseline:** OBS: failure/overview/capability queries exist for the synthetic path. Full inventory-dependent coverage/freshness needs extension.

| Requirement | Required behaviour |
|---|---|
| FR-M18-01 | Compute coverage by declared inventory/resource/action/permission/verification scope and timestamp, showing numerator, denominator and exclusions. |
| FR-M18-02 | Surface failed, manual, unknown, pending and unverified states without assuming they are disjoint counts that may be summed. |
| FR-M18-03 | Derive gaps from real observation, capability changes, stale inventory and tests; provide owner, severity, deadline and evidence-linked actions. |
| FR-M18-04 | Offer optional exact error-to-runbook guidance; no rule match may certify a root cause, close an unresolved action or create an ALLOW decision. |

**Important failure paths:** Permission revoked; stale snapshot; failed probe; incomplete pagination; missing owner; helper has no match.

**Acceptance:** Coverage decreases when access/freshness is lost; unknown destinations are not green; filters and totals have stated overlapping semantics.

**Data ownership:** CoverageAssertion, Gap, FailureProjection, InventorySnapshot, review/assignment records.

## M19 — AI Privacy Copilot

**DEFERRED_V2.** Retained model-driven capability; no V1 code, model UI, weights, endpoints or activation. Owner D13; WP35. See [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§64](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-64), [§65](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-65), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§67](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-67), [§68](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-68), [§69](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-69), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§71](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-71), [§72](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-72), [§73](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-73), [§74](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-74), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). Existing independence/privacy tests still apply to V1.

## M20 — AI Discovery

**DEFERRED_V2.** Retained model-driven capability; no V1 code, model UI, weights, endpoints or activation. Owner D13; WP35. See [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§64](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-64), [§65](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-65), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§67](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-67), [§68](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-68), [§69](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-69), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§71](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-71), [§72](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-72), [§73](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-73), [§74](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-74), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). Existing independence/privacy tests still apply to V1.

## M21 — AI Policy Builder

**DEFERRED_V2.** Retained model-driven capability; no V1 code, model UI, weights, endpoints or activation. Owner D13; WP35. See [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§64](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-64), [§65](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-65), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§67](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-67), [§68](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-68), [§69](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-69), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§71](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-71), [§72](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-72), [§73](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-73), [§74](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-74), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). Existing independence/privacy tests still apply to V1.

## M22 — AI Workflow Builder

**DEFERRED_V2.** Retained model-driven capability; no V1 code, model UI, weights, endpoints or activation. Owner D13; WP35. See [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§64](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-64), [§65](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-65), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§67](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-67), [§68](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-68), [§69](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-69), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§71](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-71), [§72](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-72), [§73](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-73), [§74](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-74), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). Existing independence/privacy tests still apply to V1.

## M23 — AI Risk/Drift Analysis

**DEFERRED_V2.** Retained model-driven capability; no V1 code, model UI, weights, endpoints or activation. Owner D13; WP35. See [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§64](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-64), [§65](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-65), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§67](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-67), [§68](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-68), [§69](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-69), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§71](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-71), [§72](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-72), [§73](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-73), [§74](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-74), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). Existing independence/privacy tests still apply to V1.

## M24 — AI Test Generation

**DEFERRED_V2.** Retained model-driven capability; no V1 code, model UI, weights, endpoints or activation. Owner D13; WP35. See [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§64](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-64), [§65](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-65), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§67](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-67), [§68](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-68), [§69](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-69), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§71](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-71), [§72](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-72), [§73](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-73), [§74](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-74), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). Existing independence/privacy tests still apply to V1.

## M25 — AI Incident Analysis

**DEFERRED_V2.** Retained model-driven capability; no V1 code, model UI, weights, endpoints or activation. Owner D13; WP35. See [§10](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-10), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§64](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-64), [§65](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-65), [§66](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-66), [§67](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-67), [§68](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-68), [§69](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-69), [§70](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-70), [§71](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-71), [§72](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-72), [§73](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-73), [§74](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-74), [§205](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-205). Existing independence/privacy tests still apply to V1.

## M26 — Billing

**Outcome:** A purchasing contact pays for the supported edition and obtains the correct commercial entitlement without exposing client records.

**Source:** [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§78](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-78), [§79](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-79), [§80](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-80), [§81](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-81), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§83](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-83), [§159](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-159), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165). **Technical accountability:** D02; WP23.

**Baseline:** OBS: production billing/checkout is not established by this inspection; actual provider and commercial terms are OPEN.

| Requirement | Required behaviour |
|---|---|
| FR-M26-01 | Keep business account, designated contacts, subscription, invoice and payment references on the vendor side; collect no local member directory or customer usage records. |
| FR-M26-02 | Calculate purchase terms server-side from an approved catalogue; a browser payment-success redirect is not authoritative proof of payment. |
| FR-M26-03 | Handle signed/provider-verified payment callbacks, deduplication and delayed/out-of-order events through an approved payment adapter; retain invoice and entitlement history. |
| FR-M26-04 | Show plan/renewal/cancellation transitions transparently; apply local licence continuity instead of remotely destroying or weakening privacy controls. |

**Important failure paths:** Payment pending/failed; duplicate callback; contradictory provider event; refund/cancellation ambiguity; offline runtime.

**Acceptance:** One verified paid transaction creates one correct entitlement; repeated callbacks cannot issue duplicate contradictory licences; vendor fields remain within §31.

**Data ownership:** CommercialAccount, DesignatedContact, PlanVersion, Order, Subscription, Invoice, PaymentReference and provider-event receipt.

## M27 — Licensing

**Outcome:** Customer IT imports a signed licence and continues supported local operations without a live vendor decision call.

**Source:** [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43), [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§94](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-94), [§159](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-159), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160). **Technical accountability:** D20; WP25.

**Baseline:** OBS: production licence issuance/verification/continuity is not established by inspected source.

| Requirement | Required behaviour |
|---|---|
| FR-M27-01 | Issue immutable, schema-validated licences containing only edition, entitlements, validity and licensed limits, with permitted installation binding where needed. |
| FR-M27-02 | Verify trusted signer, audience, signature, schema, installation/validity locally; reject command-like fields, new endpoints and authority grants. |
| FR-M27-03 | Support offline import and renewal with defined trusted-time, revocation freshness and replay rules. Exact durations/limits remain an owner-reviewed policy, not guessed defaults. |
| FR-M27-04 | Keep release signing, licence signing and customer execution/decryption authority separate; vendor outage cannot become a hidden runtime dependency. |

**Important failure paths:** Wrong signer; expired document; replayed older entitlement; clock rollback; unreachable renewal; altered installation.

**Acceptance:** No licence can appoint a local owner or execute a command; valid offline licence supports core workflows with vendor connectivity blocked.

**Data ownership:** LicenceDocument, LicenceAssignment, LocalLicenceState, trusted public-key set and verification audit.

## M28 — Entitlements

**Outcome:** An organisation changes edition without migrating product code or weakening the common safety floor.

**Source:** [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§77](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-77), [§78](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-78), [§79](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-79), [§80](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-80), [§81](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-81), [§145](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-145), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160). **Technical accountability:** D20; WP25.

**Baseline:** OBS: prototype capability inventory is not production entitlement enforcement.

| Requirement | Required behaviour |
|---|---|
| FR-M28-01 | Separate release availability, deployment support, controlled rollout, licence entitlement and actor authorisation; all must be satisfied for use. |
| FR-M28-02 | Use one codebase and shared domain engines across Foundation/Control/Enterprise, with a central capability vocabulary rather than scattered price checks. |
| FR-M28-03 | Define expiry/downgrade transitions per operation: complete/hand off accepted work, preserve restrictions, maintain authorised access/export/recovery as the approved policy requires. |
| FR-M28-04 | Never unlock V2 AI, vendor remote access, staff sync or proactive diagnostics through a flag or paid tier; essential security and truthful outcomes are common. |

**Important failure paths:** Mid-workflow expiry; feature flag inconsistent; stale cached licence; upgrade while disconnected; disabled capability still called via API.

**Acceptance:** An expired enforcement entitlement cannot turn BLOCK into ALLOW; unsupported features cannot be activated via direct endpoint calls.

**Data ownership:** CapabilityDefinition, EntitlementSet, FeatureRollout, LocalLicenceState and continuity decision records.

## M29 — Customer Onboarding

**Outcome:** IT installs the full product, creates its local owner, connects supported systems safely and proves the first useful outcome.

**Source:** [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§83](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-83), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§86](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-86), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§170](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-170), [§172](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-172), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178), [§197](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-197). **Technical accountability:** D20; WP27, WP34, WP03.

**Baseline:** OBS: Windows/rehearsal setup and fixed synthetic profiles exist, not a general customer onboarding path.

| Requirement | Required behaviour |
|---|---|
| FR-M29-01 | Keep purchase/download on vendor services and installation/configuration inside the customer boundary; verify the complete package before privileged setup. |
| FR-M29-02 | Validate runtime/profile/architecture, TLS, storage, identity, keys, backups and egress; create one protected primary owner and customer-held recovery, never demo production accounts. |
| FR-M29-03 | Provide the nine-step local connection wizard, granular permission checks, resource/mapping review and Observe-to-approved-enforcement transition. |
| FR-M29-04 | Provide explicitly supported local imports/manual forms with quarantine, preview, conflict handling, provenance and purge; source snapshots are never live control evidence. |

**Important failure paths:** Unsupported host; incomplete package; partial setup; missing privileges; wrong connection scope; unsafe import; stale mapping.

**Acceptance:** Clean installation needs no developer checkout or model; onboarding reports untested gates and never treats connection success as deletion approval.

**Data ownership:** InstallationState, SetupClaim, OwnerAssignment, ConnectionSetup, ImportJob and onboarding checkpoint.

## M30 — Support Bundle System

**Outcome:** A customer requests help and approves one exact minimal diagnostic report without granting access to operational data.

**Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§88](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-88), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132). **Technical accountability:** D12; WP26, WP24.

**Baseline:** OBS: production per-report support transport and assigned vendor organisation console are not established.

| Requirement | Required behaviour |
|---|---|
| FR-M30-01 | Generate a fixed-schema report locally from approved product versions, error/check-result enums and permitted support references; no free-form operational summary, logs or directory. |
| FR-M30-02 | Preview exact payload, destination, purpose and retention. Bind approval to payload digest and revalidate before transfer; edits/new reports require new approval. |
| FR-M30-03 | Validate vendor ingress without persisting rejected bodies; authorise assigned staff/cases and handle accidental forbidden submissions through isolation/minimisation procedures. |
| FR-M30-04 | Provide reviewed instructions or a signed customer-applied patch, and keep vendor case resolution distinct from local control verification. No live remote-access path or standing telemetry. |

**Important failure paths:** Canary in field; oversized/unknown field; changed approved payload; reused report approval; wrong case; forbidden accidental attachment.

**Acceptance:** Prohibited payloads never leave the customer path; vendor cannot impersonate local staff; closing a vendor case does not close local gaps.

**Data ownership:** LocalSupportCase, DiagnosticDraft/Approval; separate vendor SupportCase/Assignment, ApprovedDiagnosticReceipt and FixAssignment.

## M31 — Updates

**Outcome:** A customer verifies and applies an eligible signed update without losing state or broadening data access.

**Source:** [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§86](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-86), [§93](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-93), [§94](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-94), [§101](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-101), [§123](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-123), [§146](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-146), [§147](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-147), [§148](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-148), [§149](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-149), [§163](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-163). **Technical accountability:** D20; WP27, WP28.

**Baseline:** OBS: prototype packaging exists, but full signed product distribution/update lifecycle requires completion.

| Requirement | Required behaviour |
|---|---|
| FR-M31-01 | Publish immutable signed manifests, dependency inventories, provenance, migration/compatibility notes and supported versions from reviewed releases. |
| FR-M31-02 | Keep artifact download eligibility separate from execution. Customer-controlled installation verifies trusted origin, safe unpacking, digests and approved maintenance actions. |
| FR-M31-03 | Use compatibility-aware migrations, recoverable rollout and versioned workflow execution. Do not claim rollback when the schema requires tested forward recovery. |
| FR-M31-04 | Prevent updates from silently enabling vendor data egress, excluded support features, model dependencies or unsafe downgrade; rerun boundaries and core regression after changes. |

**Important failure paths:** Wrong signature; revoked trust; archive traversal/bomb; migration interruption; incompatible agent; lower unsafe version.

**Acceptance:** Tampered/unsupported release fails before privileged execution; interrupted update has a tested recovery path; roles/epochs/evidence survive.

**Data ownership:** ReleaseManifest, Artifact, Eligibility/FixAssignment, UpdatePlan, MigrationLedger and InstallationVersion history.

## M32 — Monitoring

**Outcome:** Customer operators understand health, backlog and recovery while all operational observability remains local.

**Source:** [§43](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-43), [§88](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-88), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§90](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-90), [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92), [§129](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-129), [§130](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-130), [§131](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-131), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§176](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-176), [§177](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-177). **Technical accountability:** D17; WP29, WP32.

**Baseline:** OBS: local rehearsal qualification exists; production SLOs, full backup/restore and deployment resilience are not established.

| Requirement | Required behaviour |
|---|---|
| FR-M32-01 | Collect bounded local health/logs/metrics/traces with secret/payload minimisation; distinguish liveness, readiness and business readiness. |
| FR-M32-02 | Measure propagation lag, oldest unresolved work, freshness, queue saturation, connector limits, storage and backup status, not just uptime. |
| FR-M32-03 | Back up customer domain/workflow/evidence/configuration under customer-held keys; restore into quarantine and reconcile current authority/restrictions before resuming. |
| FR-M32-04 | Show vendor-side only its own service health and timestamped per-case reported facts; no automatic customer telemetry, employee tracking or model-absence incident. |

**Important failure paths:** Disk/spool full; secret store unavailable; stalled queue; backup missing; stale restore; clock uncertainty; offline customer.

**Acceptance:** No operational canary reaches vendor observability; restore does not resurrect privileges/consent; publish measured, scoped RPO/RTO and latency, not assumed guarantees.

**Data ownership:** LocalMetric/Audit stores, health snapshots, BackupManifest, RestoreRun, SafetyCheckpoint and permitted report metadata.

## M33 — Audit Administration

**Outcome:** Authorised reviewers inspect who changed sensitive state within their own authority domain without rewriting adverse history.

**Source:** [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35), [§46](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-46), [§47](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-47), [§90](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-90), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§150](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-150), [§158](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-158). **Technical accountability:** D15; WP02, WP14, WP24.

**Baseline:** OBS: request/domain audit primitives exist for the fragment; broader admin audit views and lifecycle need expansion.

| Requirement | Required behaviour |
|---|---|
| FR-M33-01 | Audit role grants, owner changes, policy publication, connector credentials/scope, support approval, exports, licences and updates with correct tenant/domain/actor context. |
| FR-M33-02 | Separate local operational audit from vendor staff access and commercial/support audit. No mirroring of member activities into vendor profiles. |
| FR-M33-03 | Provide scoped read/export/filter permissions, restricted audit administration and append-only correction semantics; audit reads/exports where sensitive. |
| FR-M33-04 | Apply purpose-based retention with payload minimisation and tested backup handling; preserve truthful envelope history when justified payload deletion occurs. |

**Important failure paths:** Audit tampering; wrong tenant export; missing actor; stale revoked access; deletion of evidence to conceal failed action.

**Acceptance:** Sensitive mutations produce scoped attributable audit; vendor reviewer cannot retrieve local streams; corrections and retention remain reconstructable.

**Data ownership:** AuditEvent, AuditAccess, Correction, RetentionRule and scoped export references.

## 5. Cross-module product requirements

| ID | Requirement | Source |
|---|---|---|
| FR-X-01 | Control packages bundle applicability, policy, adapter needs, tests, evidence schema and declared limitations; customer maps/reviews/tests before activation. | [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213) |
| FR-X-02 | Change simulation shows affected purposes, notices, systems, copies, tests and owners with assumptions and graph coverage limitations; it performs no hidden production mutation. | [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§179](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-179), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213) |
| FR-X-03 | Assessments/findings/remediation connect to controls and closure evidence; applicable SDF and guardian safeguards require source-reviewed decisions. | [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214) |
| FR-X-04 | Deliver a complete signed ZIP product from vendor distribution for supported server/Kubernetes/offline profiles; customer-controlled operation and keys are common to editions. | [§81](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-81), [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§86](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-86), [§203](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-203) |
| FR-X-05 | Customer exports/offboarding remain local and usable, revoke integrations/identities safely and preserve required records; vendor-held business deletion follows its separate policy. | [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§161](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-161), [§162](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-162) |
| FR-X-06 | Optional Guided Assistance uses rules/templates/local search and cannot delay required errors, manual support or core operation. | [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§157](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-157) |
| FR-X-07 | Vendor readiness content collects only fields admitted by the minimum-data contract; source tension about system/maturity questions is an OPEN review, not permission for inventory upload. | [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§135](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-135), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165) |

## 6. Non-functional requirements

| ID | Requirement and acceptance boundary | Source |
|---|---|---|
| NFR-01 | Isolation across authority domains, tenants/legal entities/environments/subtenants, APIs, queues, object paths, search, exports and caches; test denied paths. | [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35), [§127](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-127) |
| NFR-02 | Durability for accepted events and safe repeated delivery; effect uncertainty is explicit. Run crash/restart/replay tests, not a diagram-based exactly-once claim. | [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99) |
| NFR-03 | Security controls, no unresolved applicable Critical/High findings, independent defined-scope review/retest, no score-only waiver of boundary defects. | [§109](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-109), [§126](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-126), [§163](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-163), [§164](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-164) |
| NFR-04 | Locality includes UI assets, telemetry, support drafts, histories, backups and imported payloads; no permitted-schema covert expansion into operational data. | [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§88](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-88), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132) |
| NFR-05 | Accessible keyboard/screen-reader flows, plain-language outcomes, language/version/timezone support and tested browser matrix. Quantitative conformance claim requires assessment. | [§102](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-102), [§154](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-154), [§155](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-155), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156), [§184](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-184) |
| NFR-06 | Preserve existing illustrative targets: control-plane p95 <500 ms, simple local policy p95 <100 ms, connected marketing propagation p95 <30 s. Benchmark with defined workload/hardware; these are not SLAs or already-achieved metrics. | [§129](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-129) |
| NFR-07 | Recovery objectives are set per supported profile/data class and measured; restore must reconcile current restrictions and authority before resuming. No invented RPO/RTO. | [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92) |
| NFR-08 | Signed, reproducible, versioned packages and migration/workflow/connector compatibility; documented unsupported profiles and upgrade recovery. | [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§93](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-93), [§101](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-101), [§146](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-146), [§147](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-147), [§148](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-148), [§149](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-149) |
| NFR-09 | Local rate limits, concurrency/load budgets and circuit breaking protect customer systems. Determine limits by measurement and customer permission. | [§130](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-130), [§131](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-131), [§176](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-176), [§177](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-177), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178) |
| NFR-10 | Explainable minimum code; no unused production files, duplicated state models, uncontrolled dependency additions or fake implementations. | [§120](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-120), [§121](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-121), [§124](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-124), [§188](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-188), [§190](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-190) |

## 7. Success measures and privacy of measurement

Use vendor business records to measure purchases/renewal/expansion and support effort. Product measures such as propagation, unknown effects, first useful workflow, connector reliability, test outcomes and unresolved age stay in customer-local monitoring. Do not upload a fleet-wide activity feed to satisfy a KPI. Ask for permitted customer feedback through reviewed business channels rather than silently broadening collection. No numerical business target or completion percentage is fabricated. Sources: [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§195](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-195), [§196](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-196), [§197](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-197).

## 8. Definition of product completion

For each supported claimed capability: working user journey, persistent/authorised backend, compatible API, data migration, failure/recovery handling, audit/evidence, operational monitoring, executable tests and maintained guidance. Unsupported external products/profile decisions remain disclosed and block their particular claims. Full V1 completion cannot be declared with missing required modules merely hidden from menus. Preserve the source's advanced/optional/later qualifications and do not use them to erase ordinary V1 work.

Production release additionally needs source-defined legal/collection/claims review, independent security assessment, measured deployment/recovery evidence and accountable sign-off. No software, penetration test or customer acceptance is completed by this document. Sources: [§120](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-120), [§163](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-163), [§164](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-164), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168), [§217](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-217).
