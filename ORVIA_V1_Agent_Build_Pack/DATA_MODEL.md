# ORVIA — Data model and persistence contract

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Source-aligned logical model, fields, relations, invariants and migration obligations. This is not executable production DDL.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## 1. What is authoritative versus proposed

**REQ:** the entity families, customer/vendor separation, scope, versioning, retention and lifecycle semantics come from the approved master. **OBS:** the pinned prototype's contract and selected SQL references establish a narrow physical subset. **DESIGN:** the field types, logical groupings, proposed record families and index suggestions below are implementation specifications for review against current migrations. A logical family does not automatically require one new table per label.

Do not create duplicate tables when an existing relation already provides the correct invariant. Inspect every migration and retained data shape before choosing additive changes. Retain existing table names and wire IDs during refactoring unless a compatibility migration explicitly changes them. No automatic migration/reset is authorised by this document.

## 2. Three separate data responsibilities

| Boundary | Authority | Allowed content |
|---|---|---|
| Vendor database | Commercial/support facts | Business accounts, designated contacts, subscriptions, licences, downloads, assigned cases and permitted report fields |
| Customer ORVIA database/stores | Privacy operation and local identity | Members, scope, graph, policies, consent, requests, actions, verification, evidence, tests, local files/secrets references/telemetry |
| Connected business databases/APIs | Existing customer business source | Authorised scoped source records accessed through reviewed local adapters; not blanket imported or vendor mirrored |

There are no cross-database foreign keys, synchronous DB links, shared superuser accounts, change-data-capture pipelines or operational joins from vendor to customer. Licence/installation/case references cross only through the permitted minimal contract. Customer local tables may contain personal information; the promise is controlled locality/minimisation, not 'the application stores no personal data.' Sources: [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§32](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-32), [§34](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-34), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35).

## 3. Common logical conventions

Use an opaque UUID/compatible existing identifier, typed status, audit/version metadata and explicit ownership for each record. Prefer `timestamptz` for stored instants; keep user timezone for display and reviewed deadline calculation. Distinguish occurrence, acceptance, observation and recording times. Clients never choose authoritative ordering solely through timestamps.

Scope customer business records by organisation/tenant, relevant legal entity and environment; add subtenant restrictions only where meaningful. Preserve the existing `tenant_id`/`organisation_id` translation deliberately. The prototype uses Scope(tenant_id, legal_entity_id, environment_id); the master consent aggregate lists tenant/legal entity/principal/purpose. Decide environment semantics explicitly before changing uniqueness or merging data, and test cross-environment denial. No column rename may silently merge scopes.

Each relational reference must resolve inside the allowed scope, preferably with composite unique/FK constraints where the relationship is tenant-owned. Index the actual authority-bound queries. Foreign-key and uniqueness errors must not expose another tenant's existence through raw database errors. Current PostgreSQL documentation notes that row security does not cover every operation and owners/privileged roles can bypass it; use a non-owner role, explicit predicates and tested policies rather than treating RLS as sufficient. [T2 in the decision register.]

JSONB is appropriate for immutable versioned policy/plan documents and connector-specific validated attributes. Core identity, scope, relationships and lifecycle fields must remain queryable and constrained. Avoid arbitrary polymorphic IDs that bypass referential/tenant checks. A domain graph can use typed relationship tables rather than a separate graph database.

Use positive monotonically increasing version/epoch fields with compare-and-swap. Existing wire Epoch is bounded by JavaScript safe integer; do not silently emit arbitrary PostgreSQL bigint values as imprecise JSON numbers. A future decimal-string representation needs a contract migration.

## 4. Observed physical anchors — not a complete schema inventory

The inspected current processing SQL references `app.purpose_versions`, `app.target_mappings`, `app.policy_versions`, `app.consent_aggregates`, `app.workflows`, `app.service_conditions`, `app.processing_decisions`, `app.send_attempts`, `app.send_records` and `machine_auth.sender_systems`. The scoped transaction checks `machine_auth.identities`. Synthetic target code references `marketing_memberships` in the target connection.

These are **existing anchors**, not proof of all required columns/indexes/constraints or a reason to leave demo-specific structures in production. The existing migration directory includes ordered SQL changes; its full semantics must be inspected for a task. The current transaction helper checks role privilege flags and sets transaction-local scope. Preserve those checks when generalising connection configuration. Evidence: R-CONTROL and R-DB in [repository baseline](REPOSITORY_BASELINE_AND_TRANSITION.md).

## 5. Logical record dictionary

Every row group below inherits the common ownership/version rules. Fields are **DESIGN proposals** grounded in the cited source families; precise nullable/default/index decisions must be made in the canonical schema migration with tests. No production table is created by this document.

### DM-01 — Organisation / LegalEntity / Environment / Subtenant

**Boundary:** CUSTOMER. **Owner:** D02. **Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§35](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-35).

**Proposed fields:** id UUID; legal_name/display_name text; country/timezone/industry configuration; status enum; created_at/updated_at timestamptz; environment_id and legal_entity_id explicit on scoped operational records; optional subtenant_id.

**Relationships:** Organisation 1:N legal entities/environments/memberships; subtenant belongs to organisation and assigned legal/environment scope.

**Constraints / query implications:** No cross-organisation parent references; lifecycle transition cannot drop the only owner; scope is authority-validated. Index actual scope/status lookup paths.

### DM-02 — Membership / RoleBinding

**Boundary:** CUSTOMER. **Owner:** D15. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7).

**Proposed fields:** membership_id UUID; identity_id; organisation scope; status; role/capability-set ref; valid_from/valid_to; granted_by; revoked_at; row_version.

**Relationships:** Identity N:M organisation memberships; membership 1:N scoped role grants. Authentication provider tables remain library-owned.

**Constraints / query implications:** Unique active membership per intended identity/scope; delegation subset enforced outside raw role names; no vendor directory replication. Index identity+scope+active and scoped grant expiry.

### DM-03 — OwnerAssignment / SetupClaim / OwnershipRecoveryRecord

**Boundary:** CUSTOMER. **Owner:** D15. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84).

**Proposed fields:** organisation_id; owner_membership_id; assignment_version; established_at; setup claim digest/expiry/used_at; recovery event method/ref/result; no plaintext recovery secret in ordinary records.

**Relationships:** Exactly one owner pointer/assignment per activated organisation; claim and recovery records reference local installation and audit.

**Constraints / query implications:** Use locked parent-owner transaction and unique current assignment; activation requires eligible owner/recovery setup. Concurrent transfer fails rather than briefly persisting two owners. Recovery material separately protected.

### DM-04 — LocalInvitation / ServiceIdentity

**Boundary:** CUSTOMER. **Owner:** D15. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84).

**Proposed fields:** invitation_id; token digest; invited identity/channel; requested scope/delegable capability-set; inviter; expires_at; used/revoked state. Service identity: kind, installation, public key/trust ref, scoped capabilities, expiry, rotation state.

**Relationships:** Invitation grants one accepted membership flow; service identities attach to an installation and supported purpose.

**Constraints / query implications:** No reusable emailed passwords; accept invitation only once with current grant checks. Never share local password hashes, MFA seeds or service tokens with vendor.

### DM-05 — PrincipalReference / IdentityAssertion / IdentityLink

**Boundary:** CUSTOMER. **Owner:** D03. **Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23).

**Proposed fields:** opaque principal_ref UUID; local protected mapping; assertion type/source; verification method; observed/valid times; match state; evidence_payload_ref; owner/reviewer; disputed/revoked status.

**Relationships:** One principal can have several source identities; links scoped by system and purpose context; no global email hash graph.

**Constraints / query implications:** Ambiguous/probable match cannot approve disclosure/destruction. Shared/recycled identifier conflicts require review; source identity uniqueness must reflect actual system scope, not email as global primary key.

### DM-06 — Nomination / RepresentationMandate / AgeAssuranceRecord

**Boundary:** CUSTOMER. **Owner:** D05. **Source:** [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23).

**Proposed fields:** id; principal_ref; representative_ref; authority kind; permitted rights/scope; issuer/evidence ref; start/expiry/revocation; invocation event/review; minimal age/guardian attestation; row_version.

**Relationships:** Nomination distinct from guardian mandate; each privileged request links the exact active authority decision.

**Constraints / query implications:** No disability-to-incapacity inference; revoke prevents new actions; adulthood/guardian changes force scope review; do not warehouse full ID documents where a minimal attestation suffices.

### DM-07 — Purpose / PurposeVersion / ProcessingCondition

**Boundary:** CUSTOMER. **Owner:** D04. **Source:** [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§13](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-13), [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16).

**Proposed fields:** stable purpose_id; version_id; version; name/description; data_category refs; system/recipient/action scope; owner; condition code and reviewed legal/source ref; valid/published times; digest.

**Relationships:** Purpose 1:N immutable versions; policy/notice/receipt points to exact versions; condition linked to an approved context.

**Constraints / query implications:** Stable logical purpose must not be replaced by a new identity on every edit. Current synthetic codes require compatible generalisation, not removing all constraints.

### DM-08 — Notice / NoticeVersion / LanguageVariant / NoticeMigrationPlan

**Boundary:** CUSTOMER. **Owner:** D02. **Source:** [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§19](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-19), [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§156](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-156).

**Proposed fields:** notice_id/version_id; purpose_version refs; language; content/payload ref and digest; review/publish/effective times; change class; migration scope and reviewer decision.

**Relationships:** One notice has language-specific immutable content versions; capture references exact content and language; migration relates source/target versions.

**Constraints / query implications:** No UPDATE to a published payload; translation/editorial/material changes distinct; expanded purpose cannot inherit grants without reviewed decision.

### DM-09 — PolicyVersion / PublicationProof / ControlVersion

**Boundary:** CUSTOMER. **Owner:** D04. **Source:** [§13](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-13), [§14](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-14), [§15](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-15), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§40](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-40).

**Proposed fields:** stable id/version_id; schema_version; canonical document/digest; author/reviewer; reauthentication proof reference/expiry; lifecycle; effective/recorded times; scope; obligations.

**Relationships:** Policy references purpose/notice/source applicability and controlled systems; control version references governing policy and supported boundary.

**Constraints / query implications:** Publication checks exact digest/independent reviewer; historical version immutable; policies never accepted as arbitrary executable code. Index scope+purpose+active version.

### DM-10 — ConsentAggregate / ConsentEvent / Receipt

**Boundary:** CUSTOMER. **Owner:** D02. **Source:** [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§18](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-18), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99).

**Proposed fields:** principal_ref; stable purpose_id; consent_epoch bigint or bounded integer wire representation; state; current receipt/notice-version refs; event/interaction id; accepted_at; expiry; source/capture metadata; immutable receipt digest.

**Relationships:** Aggregate 1:N events/receipts; accepted withdrawal has outbox/workflow reference; history remains distinct from current state.

**Constraints / query implications:** Unique scoped principal+purpose aggregate; epoch increment and event/outbox atomic; expected_epoch CAS; key/digest replay safety. Keep environment semantics compatible with existing data; no silent global merge.

### DM-11 — Preference / Suppression / RevocationCursor

**Boundary:** CUSTOMER. **Owner:** D02. **Source:** [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§18](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-18), [§42](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-42), [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91).

**Proposed fields:** preference channel/value/purpose scope; suppression state/reason/source epoch; cursor last_applied_epoch/acknowledged_at/freshness; justified retention/ref.

**Relationships:** Channel preferences distinct from consent; each control point tracks current relevant revocation view.

**Constraints / query implications:** Old cursor never authorises after a newer accepted restriction; expiry is visible. Suppression ledger itself may be personal and needs scoped retention.

### DM-12 — System / Dataset / Field / DataCategory / DataAsset

**Boundary:** CUSTOMER. **Owner:** D03. **Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§8](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-8), [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62).

**Proposed fields:** ids; names within local scope; source system identifiers; kind/schema metadata; owner; declared/observed state; snapshot/version; last_seen/review/freshness; classification evidence.

**Relationships:** System 1:N assets/datasets/fields; category assignments are explicit reviewed relationships.

**Constraints / query implications:** No assumption that field name proves content/purpose. Counts describe observed or declared scope. Exclude system/internal names from vendor diagnostics.

### DM-13 — ProcessingActivity / DataFlow / ProcessingCopy / TransferRoute

**Boundary:** CUSTOMER. **Owner:** D03. **Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§8](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-8), [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§50](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-50), [§51](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-51), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62).

**Proposed fields:** id; source/target typed refs; purpose/condition; category; copy kind/location ref; processor/region where configured; permitted operations; version/provenance/times.

**Relationships:** Activity relates purpose/data/systems/processor; each copy can have independent retention/hold/action outcomes.

**Constraints / query implications:** Typed FK-backed relationships for core entities; no arbitrary JSON edge that bypasses scope. Unobserved copies stay declared/unknown, not invented.

### DM-14 — GraphRelationship / InventorySnapshot / ImpactAssessment

**Boundary:** CUSTOMER. **Owner:** D03. **Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§8](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-8), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213).

**Proposed fields:** relationship id/type; typed endpoints; source; asserted_or_observed; review/confidence basis; valid_from/to; recorded_at/last_seen; owner; snapshot; diff; affected refs.

**Relationships:** Snapshot fixes a view for coverage/change simulation; impact assessment lists affected versioned controls/tests/policies.

**Constraints / query implications:** Avoid full bitemporal design on incidental data. Historical relationship versions must remain resolvable; scope check both edge endpoints.

### DM-15 — SourceInstrument / ProvisionVersion / RegulatoryPack / InterpretationDecision

**Boundary:** CUSTOMER. **Owner:** D04. **Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§166](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-166), [§167](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-167).

**Proposed fields:** issuer/source locator; content digest; publication/effective/commencement metadata; jurisdiction; version/status; reviewer; interpretation distinct from source text; pack compatibility/signature.

**Relationships:** Pack maps provision and reviewed interpretation to obligations/control templates; customer activation has separate applicability.

**Constraints / query implications:** No generated legal rule becomes law. Historical dates retained; newly introduced operational obligations require current qualified review. Index jurisdiction+version+status.

### DM-16 — ApplicabilityAssessment / Obligation / ExceptionDecision

**Boundary:** CUSTOMER. **Owner:** D04. **Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§9](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-9), [§50](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-50), [§54](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-54), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214).

**Proposed fields:** id; legal entity/activity/population/date; provision/version; supporting facts; decision state; reviewer/time; condition/expiry; control mapping.

**Relationships:** Assessment links source/interpretation and the customer facts; obligations can trigger requests/incident/retention controls.

**Constraints / query implications:** APPLIES/SCHEDULED/DOES_NOT_APPLY/INSUFFICIENT_FACTS/LEGAL_REVIEW_REQUIRED are conceptual states from the source model; exact enum finalised centrally. Exceptions require scope/authority, not free-text business need.

### DM-17 — ConnectorRelease / CapabilityManifest / ConnectorInstallation

**Boundary:** CUSTOMER. **Owner:** D06. **Source:** [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§147](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-147).

**Proposed fields:** package/version/digest; capability schema; resource/action; required permission; identity/method/consistency/limitations; installation id/key ref; status/expiry.

**Relationships:** Installation selects a signed compatible connector release; manifests relate capability and permission observations.

**Constraints / query implications:** Disallow automatic unreviewed plugin installation. Public manifest names cannot be replaced by customer system names in vendor diagnostics.

### DM-18 — ConnectionSetup / ConnectorScope / PermissionCheck / SourceMapping

**Boundary:** CUSTOMER. **Owner:** D06. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§172](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-172), [§173](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-173).

**Proposed fields:** setup id/status; environment; endpoint config protected locally; secret_ref; selected resources/actions; TLS result; check time/result; mapping version; approved scope digest; mode.

**Relationships:** Setup becomes an active scoped connection only after checks/review. Mappings link customer principal/purpose to exact source key/generation.

**Constraints / query implications:** Read-only first; changed credential/scope requires revalidation; deny mutation lacking grants. Store credentials in local secret store, not in these records or vendor upload.

### DM-19 — PrivacyRequest / IdentityReview / RequestScope / ResponsePackage

**Boundary:** CUSTOMER. **Owner:** D05. **Source:** [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§22](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-22), [§23](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-23), [§24](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-24), [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56).

**Proposed fields:** request id/type; authenticated actor/principal; identity/mandate refs; received/time; lifecycle; reviewer/owner; scoped systems; unresolved state; response payload/digest; expiry/delivery status.

**Relationships:** Request 1:N plans/actions; response links reviewed source results and redact decisions; data principal sees own authorised state.

**Constraints / query implications:** Keep request administration distinct from effect/verification/delivery; public IDs unguessable but still authorised; no direct global lookup by email.

### DM-20 — WorkflowExecution / WorkflowDefinitionVersion / PlanVersion

**Boundary:** CUSTOMER. **Owner:** D05. **Source:** [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§149](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-149).

**Proposed fields:** workflow id/domain trigger; engine execution ref; definition version; state/timestamps; plan id/version/digest; target set, generations, epoch/policy references; operation budget.

**Relationships:** Workflow 1:N plans; plan 1:N actions; outbox supplies start trigger; Temporal engine history is separate operational persistence.

**Constraints / query implications:** Do not duplicate full authoritative event history in multiple competing stores. Preserve running definition compatibility; exact plan changes invalidate approval.

### DM-21 — ApprovalBinding / Action / ActionAttempt / SignedCommandReceipt

**Boundary:** CUSTOMER. **Owner:** D05. **Source:** [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99), [§178](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-178).

**Proposed fields:** approval decision/actor/time/expiry/plan digest; action stable operation id; attempt id; idempotency key/payload digest; command id/signing key/nonce/expiry; result/reason; target generation.

**Relationships:** One effect identity can have bounded attempts; receipts reference exact signed command and attempt; independent observations separate.

**Constraints / query implications:** Same key/different payload conflicts. Approval cannot be copied to different scope/version. Keys are references; private keys/credentials never stored in ordinary plan JSON.

### DM-22 — Reconciliation / ManualTask / DeadLetter

**Boundary:** CUSTOMER. **Owner:** D05. **Source:** [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§26](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-26), [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§174](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-174), [§175](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-175).

**Proposed fields:** id; uncertain attempt; method; state/start/end; observation ref/reason; manual owner/task version/statement/evidence refs; dead-letter cause/next action.

**Relationships:** Reconciliation attaches to unknown effect; manual attestation is attributed claim; all operator interventions audited.

**Constraints / query implications:** Require expected task version; manual closure cannot satisfy a scoped-observation criterion. Retry rechecks current authority/scope and effect safety.

### DM-23 — Outbox / Inbox / IdempotencyRecord

**Boundary:** CUSTOMER. **Owner:** D02. **Source:** [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99), [§100](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-100).

**Proposed fields:** event id/schema; aggregate id/version; scope; occurrence/recording time; causation/correlation; safe payload/ref; delivery state; consumer dedupe id; operation key/digest/result.

**Relationships:** Outbox inserted with domain transaction; Inbox unique by consumer/event; idempotency scoped by actor/action/resource as defined contractually.

**Constraints / query implications:** Stable order within aggregate; lease/lock prevents unbounded duplicate concurrent work but delivery remains at-least-once. Retention must not erase needed dedupe safety too early.

### DM-24 — VerificationObservation / OutcomeClaim

**Boundary:** CUSTOMER. **Owner:** D07. **Source:** [§44](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-44), [§47](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-47), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§169](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-169).

**Proposed fields:** id/action/system/resource; generation; observation state/method; observed_at/fresh_until; desired/actual typed state; scope; connector/policy versions; limitation refs.

**Relationships:** Claims reference attempts and independent observations; evidence records claim provenance without upgrading assertion to fact.

**Constraints / query implications:** Observed status requires real method/time/freshness and matching scope/generation. A provider receipt remains an assertion unless its exact supported semantics justify a distinct claim.

### DM-25 — CoverageAssertion / Gap / FailureProjection

**Boundary:** CUSTOMER. **Owner:** D07. **Source:** [§28](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-28), [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§49](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-49), [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62).

**Proposed fields:** inventory snapshot; capability resource/action; credential-check ref; denominator/numerator; exclusions; last checked/freshness; gap owner/severity/deadline/state.

**Relationships:** Derived from authoritative capabilities/observations/tests; projections can be rebuilt but retain declared scope/version.

**Constraints / query implications:** Do not sum overlapping failure buckets into a compliance percentage. Missing permission/page lowers coverage; no assumed full inventory.

### DM-26 — EvidenceEnvelope / EvidencePayload / IntegrityManifest / AuditEvent

**Boundary:** CUSTOMER. **Owner:** D02. **Source:** [§45](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-45), [§46](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-46), [§47](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-47), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§150](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-150).

**Proposed fields:** event id; actor/domain/scope; object refs; policy/workflow/action/version; time/outcome; protected payload ref/digest; chain/signature metadata; correction/tombstone reference.

**Relationships:** Envelope can outlive payload only under justified retention. Audit is separate by vendor/customer plane. Export manifest references exact included artifacts.

**Constraints / query implications:** Append corrections; protected payload deletion does not silently edit envelope. Hash/signature verification proves recorded integrity only. Index scoped time/action/workflow queries.

### DM-27 — RetentionConstraint / LegalHold / EligibilityDecision / DeletionPlan

**Boundary:** CUSTOMER. **Owner:** D05. **Source:** [§50](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-50), [§51](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-51), [§52](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-52), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132).

**Proposed fields:** copy/context scope; source/basis; trigger; min/max calculation; permitted use; owner/review/release; hold reason/evidence; eligibility facts; plan digest/budget.

**Relationships:** Copy 1:N applicable constraints/holds; deletion composes approved effects through shared plans/workflows, not a second orchestration system.

**Constraints / query implications:** Do not universalise longest retention or key destruction. Current hold/re-consent/generation rechecked before effect. Timer does not reset on ordinary background read.

### DM-28 — Processor / ProcessorRelationship / ContractReference

**Boundary:** CUSTOMER. **Owner:** D03. **Source:** [§4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-4), [§53](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-53), [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214).

**Proposed fields:** id/name locally; purpose/data/category/system scope; authorised subprocessors; region; owner/contact; contract version/ref; response expectations; status.

**Relationships:** Relations connect processor to graph/control/assessment/notification and supported acknowledgement records.

**Constraints / query implications:** Do not confuse a customer's processor inventory with ORVIA's vendor commercial customer directory; no vendor copy of processor operational map.

### DM-29 — Assessment / Finding / RemediationTask / GovernanceReview

**Boundary:** CUSTOMER. **Owner:** D03. **Source:** [§214](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-214).

**Proposed fields:** assessment type/scope/version/applicability; reviewer/time; finding/control ref; risk state; owner/due; closure criterion; evidence/retest refs.

**Relationships:** Assessment 1:N findings; finding links affected graph/control and remediation workflow.

**Constraints / query implications:** Questionnaire completion cannot mark control verified; SDF label requires reviewed applicability. Approved exception remains scoped/expiring and visible.

### DM-30 — Incident / IncidentEvent / NotificationObligation / ClockVersion

**Boundary:** CUSTOMER. **Owner:** D05. **Source:** [§54](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-54), [§55](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-55), [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56), [§108](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-108).

**Proposed fields:** incident id; occurrence/detection/awareness; separate trigger and source/reviewer; affected scope; severity rule; obligation recipient/regime; deadline rule/version; corrections.

**Relationships:** Incident 1:N events, affected refs and independent recipient/regime tasks. Notification dispatch is linked, not the incident's sole status.

**Constraints / query implications:** Changing awareness appends clock correction. Severity alone does not decide legal notification. No hard-coded universal 72/90-hour/day rule.

### DM-31 — NotificationTask / DeliveryAttempt / WebhookEndpoint

**Boundary:** CUSTOMER. **Owner:** D08. **Source:** [§56](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-56), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§98](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-98).

**Proposed fields:** event/template version; authorised recipient ref; delivery channel; payload ref; reviewed dispatch authority; state/time; attempt id; signature key ref; acknowledgement.

**Relationships:** Customer notification source and recipient remain local/approved. Vendor billing mail uses separate records/provider configuration.

**Constraints / query implications:** Idempotent event-to-recipient delivery; scoped payload and secure destination checks; delivered/acknowledged distinctions. No forwarding local operational messages into vendor support.

### DM-32 — TestDefinition / TestRun / TestAssertion / FixtureLease

**Boundary:** CUSTOMER. **Owner:** D18. **Source:** [§57](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-57), [§58](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-58), [§59](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-59), [§60](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-60), [§61](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-61).

**Proposed fields:** test id/version; policy/control/environment; preconditions/steps; expected outcome; scope budget; run/build id; assertion expected/observed/result; fixture lease/cleanup.

**Relationships:** Definition 1:N runs; run 1:N assertions; fixture target scope separate from actual customer records.

**Constraints / query implications:** No production mutation from a synthetic test by default. Interrupted/error not PASS; detecting a broken control is a successful detector and a failed control, recorded separately.

### DM-33 — ControlPackage / SimulationRun / DriftEvent

**Boundary:** CUSTOMER. **Owner:** D04. **Source:** [§62](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-62), [§213](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-213).

**Proposed fields:** package id/version/compatibility; controls/policy/test/connector/evidence schema refs; assumptions; requested diff; snapshot; impact refs; rule severity; review.

**Relationships:** Package installed after mapping/review; simulation compares frozen current/proposed state and produces impact, not new legal purpose.

**Constraints / query implications:** No source mutation from dry run. Drift does not auto-publish policy. Missing graph coverage remains a stated assumption.

### DM-34 — ImportJob / ImportMapping / ImportRowResult / ImportProvenance

**Boundary:** CUSTOMER. **Owner:** D02. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§16](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-16), [§27](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-27), [§84](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-84), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132).

**Proposed fields:** job id/type/schema; uploader; protected file ref/digest/source date; mapping/scope version/digest; preview approval; chunk cursor; row result/code; expiry/purge status.

**Relationships:** Imports enter explicitly supported target modules with provenance, not arbitrary DB tables. Row records can be short-lived staging rather than permanent copies.

**Constraints / query implications:** Declared atomic/chunk semantics; dedupe key ties source/mapping/scope. No old file overrides newer consent; rejected rows produce no effects; no source-system mutation claim.

### DM-35 — LocalSupportCase / DiagnosticDraft / DiagnosticApproval

**Boundary:** CUSTOMER. **Owner:** D12. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96).

**Proposed fields:** local case id; protected operational refs; vendor case mapping; fixed allowed report; payload digest; destination/purpose/retention disclosure; approver/time/expiry; delivery id/state.

**Relationships:** One approved immutable draft can be transferred/retried within its approved delivery scope; new report requires new approval. Vendor-visible identity is a permitted case/install reference, not local workflow ID.

**Constraints / query implications:** Unknown fields/free text/credentials/canaries block export. Approval cannot create a support session or scheduled report subscription. Detailed mapping never leaves local store.

### DM-36 — LocalLicenceState / InstallationVersion / UpdatePlan

**Boundary:** CUSTOMER. **Owner:** D20. **Source:** [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§77](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-77), [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§93](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-93), [§94](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-94), [§160](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-160).

**Proposed fields:** signed document/ref; trusted signer; installation binding; entitlements/validity; local verification/clock state; version/digest; plan/from-to compatibility; approval/outcome.

**Relationships:** Only permitted commercial licence fields cross planes. Local owner approves update from official signed distribution.

**Constraints / query implications:** Licence is not an auth token or command. Old/invalid licence cannot re-enable BLOCKed processing. No per-question/per-request vendor call.

### DM-37 — BackupManifest / RestoreRun / SafetyCheckpoint / ExportJob

**Boundary:** CUSTOMER. **Owner:** D17. **Source:** [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§92](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-92), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§161](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-161), [§162](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-162).

**Proposed fields:** artifact refs/digests/key version; capture/checkpoint times; included domain/workflow/object stores; restored version; quarantine state; reconciliation result; export scope/delivery/expiry.

**Relationships:** Safety checkpoint must be recoverable under stated failure model, not assumed current merely because an old backup exists.

**Constraints / query implications:** Reconcile roles/invitations/revocations/holds/consent before traffic. Missing current state blocks unsafe resumption. Keys/backups stay customer-controlled.

### DM-38 — RulePack / RunbookVersion / GuidanceResult

**Boundary:** CUSTOMER. **Owner:** D13. **Source:** [§48](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-48), [§63](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-63), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§157](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-157).

**Proposed fields:** rule/template id/version/digest; app compatibility; reviewed content/source refs; match status; local authorised inputs; suggested next step; approval requirement.

**Relationships:** Reuse existing docs/search/audit where enough; optional guidance may not need separate result tables.

**Constraints / query implications:** No embeddings/learned weights/training store, no automatic action, no support-summary upload. Exclude when helper omitted.

### DM-39 — VendorStaffIdentity / StaffRoleAssignment / CommercialAccountMember

**Boundary:** VENDOR. **Owner:** D15. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§6](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-6), [§7](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-7), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96).

**Proposed fields:** provider identity ref; status; vendor role; assigned account/case scope; MFA/session metadata in proper auth store; grant/revoke/audit.

**Relationships:** Vendor staff separate from purchaser contacts; no join to local runtime membership.

**Constraints / query implications:** No global runtime superadmin bit. Staff cases default denied outside assignment; authenticated commercial customer cannot become staff.

### DM-40 — CommercialAccount / DesignatedContact / InstallationReference

**Boundary:** VENDOR. **Owner:** D02. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96).

**Proposed fields:** commercial account UUID; legal/display business name; only necessary billing/tax data; nominated contact name/work email/responsibility; random installation id and licence association.

**Relationships:** Contact may fill several business responsibilities; installation reference deliberately issued, not discovered from hardware/customer records.

**Constraints / query implications:** No local user id, hostname, database name, employee activity, principal count or live health. Retire replaced contacts under the approved retention policy.

### DM-41 — PlanVersion / Order / Subscription / Invoice / PaymentReference

**Boundary:** VENDOR. **Owner:** D02. **Source:** [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§81](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-81), [§159](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-159).

**Proposed fields:** catalogue version; edition/price/currency/terms; order/subscription id; state; billing period; provider reference; verified event id/time; invoice/ref; refund/adjustment state.

**Relationships:** Separate commercial event ledger from runtime entitlements. Payment provider actual schema/terms remain OPEN.

**Constraints / query implications:** Do not store full payment-card credentials. Duplicate callbacks deduped; browser return URL never sufficient payment evidence. No customer runtime counts required.

### DM-42 — LicenceAssignment / ReleaseArtifact / DownloadAuthorisation / DownloadEvent

**Boundary:** VENDOR. **Owner:** D20. **Source:** [§76](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-76), [§82](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-82), [§85](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-85), [§93](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-93), [§94](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-94).

**Proposed fields:** licence id/sequence/validity/entitlement document; public signer key id; release version/profile/arch/digest; assignment; auth scope/expiry; actual download time/status.

**Relationships:** Licence issuance separated from release signing. Same signed product artifacts across editions; wrapper may include separately signed licence.

**Constraints / query implications:** No download=installed/healthy inference. Signed manifest and trusted identity verification separate from a checksum on a web page.

### DM-43 — SupportCase / SupportCaseAssignment / ApprovedDiagnosticReceipt / FixAssignment

**Boundary:** VENDOR. **Owner:** D13. **Source:** [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§89](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-89), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96).

**Proposed fields:** vendor case id; account/install ref if permitted; urgency; assigned engineer; allowed product/component/error/check fields; report/receipt time; case state; guidance/patch ref; reported outcome.

**Relationships:** Per-report payload from approved path; local workflow reference never stored. Case assignment and patch eligibility are not runtime authority.

**Constraints / query implications:** No raw attachments/customer-record screenshots/resources feed. Last reported remains an assertion; customer-reported resolution not independent verification. Future training excluded.

### DM-44 — VendorAuditEvent / ServiceDataRetentionRule / VendorPrivacyCase

**Boundary:** VENDOR. **Owner:** D14. **Source:** [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§46](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-46), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165).

**Proposed fields:** staff/action/account or case reference; vendor timestamp/outcome; retention purpose/rule; correction/deletion/privacy-request state; restricted accidental-submission handling.

**Relationships:** Separate vendor access audit and privacy processes for business/contact/service data. No customer audit mirror.

**Constraints / query implications:** Retention decisions require appropriate review; protect accidentally received prohibited content, minimise/delete per documented procedure and do not use for debugging or training.

## 6. Critical relationship model

```text
Customer Organisation
  -> legal entity / environment / scoped membership
  -> principal reference -> identity assertions / mandates
  -> purpose -> purpose version -> notice version / processing condition
  -> policy version -> control version -> supported system/capability
  -> consent aggregate -> consent event + immutable receipt + outbox
  -> privacy request -> scope decision -> workflow -> exact plan -> approval
  -> action -> attempt/receipt -> independent observation -> outcome claim
  -> evidence envelope -> protected payload / correction / integrity manifest
  -> test definition -> run -> assertions -> control/observation evidence
  -> processing copy -> retention constraints / holds -> deletion outcomes

Vendor Commercial Account
  -> designated contact / commercial members
  -> subscription / invoice / verified payment reference
  -> licence assignment / eligible signed release / download event
  -> assigned support case -> approved minimal diagnostic receipt -> fix assignment

The only cross-plane references are permitted commercial licence/installation/case
references. They do not establish database access or identity equivalence.
```

This is a logical relationship explanation, not a full ERD of shipped tables. A physical ERD should be generated from the accepted schema rather than a second hand-maintained implementation.

## 7. Essential invariants and transactional proofs

| Invariant | Suggested mechanism | Required proof |
|---|---|---|
| One primary owner per activated organisation | Lock organisation row; unique current owner pointer/assignment; activation precondition | Concurrent setup/transfer yields one valid assignment; failure rolls back without unowned active organisation |
| Monotonic consent | Unique scoped aggregate; row/advisory lock or version CAS; event/outbox same transaction | Duplicate/reordered grant and concurrent withdrawal cannot regress epoch/state |
| Exact approval | Immutable plan version/digest, approval actor/time/expiry/generation | Editing target scope or replaying old approval cannot create effect |
| Safe retry | Stable operation key + payload digest; unique consumer/event processing | Same key/different payload rejects; unknown effect reconciles before retry |
| Historical policy/evidence | Immutable published versions; append corrections; FK/ref integrity | New policy cannot rewrite old receipt/evaluation; approved purge truthfully marks payload absence |
| One report approval, one displayed payload | Stored draft bytes/digest/destination; approval ref; immediate pre-egress validation | Mutated field, new report, destination change or broadened schema requires new approval |
| No cross-scope relation | Explicit scope on query, composite constraints where applicable, no bypass role | Cross-tenant edge/query/export fails and pooled context cannot leak |
| Import provenance | Immutable approved mapping/scope; row/chunk dedupe; source version/date | Retried chunk does not duplicate; stale consent cannot supersede newer withdrawal |
| Restore safety | Recovery checkpoints and restricted startup until current scope/restrictions established | No revoked identity, old diagnostic setting or withdrawn purpose reactivated |

**Not a trivial detail:** assertions spanning several tables often require an application transaction plus DB constraints; a `CHECK` clause alone cannot enforce every multirow invariant. Choose a tested mechanism rather than promising an impossible declarative constraint.

## 8. Query design and indexes

Design indexes against access patterns: scoped workflow state/time; principal+purpose consent; source system/resource mapping; active policy version; pending outbox/lease; action attempts; observation freshness; request owner/deadline; incident obligation deadline; import job/chunk; vendor assigned case/account and licence/download eligibility.

Use keyset pagination with a stable ordering and validated opaque cursor. Do not use unbounded `SELECT *` exports or load the entire graph into the browser. Query lists and counts through the same scope/filters; state whether counts are total, filtered, sampled or unknown. Protect identities in index/log diagnostics as well as rows.

Partition high-volume event/audit data only when measurement justifies the operational complexity; retention and unique-key semantics must remain correct. Do not add Redis/search infrastructure before a concrete measured need. Local PostgreSQL full-text search can support bounded guidance/search without embeddings; restricted content is filtered before snippets.

## 9. Storage placement and retention policy

| Class | Placement | Lifecycle requirement |
|---|---|---|
| Domain relational records | Customer PostgreSQL | Scoped access, version/history, approved retention/migrations |
| Workflow engine history | Customer-controlled Temporal persistence | Version-compatible replay; minimise search attributes/payloads; justify retention |
| Attachments/imports/response/evidence payloads | Customer-controlled object/file store | Random internal names, access controls, integrity, quarantine, expiry/purge |
| Credentials/private keys | Customer-controlled protected secret/KMS store | Reference only, least privilege, rotation/revocation/recovery |
| Caches/search indexes/local traces | Customer-controlled stores | Same scope and deletion rules; never alternative retention loopholes |
| Vendor business/support store | Vendor-controlled dedicated store | Field-purpose-recipient-access-retention inventory and privacy/rights process |

The sources do not supply universal retention durations. Before activation, define per class: owner, purpose/source justification, trigger, duration/review, permitted use, purge method, backups, holds, exceptions and evidence of deletion. Do not retain all payloads forever under 'audit'. Diagnostic report timestamps are approval/receipt facts, not a covert operational event feed. Sources: [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§37](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-37), [§38](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-38), [§39](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-39), [§91](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-91), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165).

## 10. Migration and compatibility plan

First inventory current migrations, schema/version ledger, auth-library tables, data fixtures and workflow histories. Preserve all applied migrations and use additive expand/contract changes where practical. A physical folder move updates runner paths only; it must not modify applied SQL or checksums.

For every schema change: define old/new reader/writer compatibility, required backfill, batch limits/lock impact, invariant validation, idempotent resumption, expected down/forward recovery and tests. Keep customer and vendor migration ledgers separate. No startup auto-connection to customer business databases or automatic destructive data conversion.

Before generalising synthetic principal/purpose/operation fields, define production schema provenance, validate safety/effect contracts and keep test fixtures in an explicit evaluation scope. Removing a fictional email restriction alone is not a production identity model. Initial demo state is not a business migration source unless the user explicitly selects it; never reset the protected presentation database.

## 11. Unresolved physical decisions

The exact auth-provider/version configuration, cloud/object/secret storage provider, database deployment topology, backup safety-ledger strategy, TTLs, indexing/partition scale and legal retention settings require the owners in [DECISIONS_AND_TRACEABILITY](DECISIONS_AND_TRACEABILITY.md). No provider is selected or billable infrastructure created by this model. These decisions block dependent production activation, not independent unit/schema design work.
