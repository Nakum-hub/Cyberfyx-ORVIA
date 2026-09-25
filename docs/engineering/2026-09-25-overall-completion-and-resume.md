# ORVIA overall completion and restart record

Inspected source: `58d0781ab9608e8bee22e6ed171bc83bac0b4bd9` (merged DPDP + expanded V1). This is a repository/evidence assessment, not a new test run or legal assessment. Approved scope: master revision 1.4 plus expanded baseline E1 and the integrated DPDP extension. Do not use the older bounded sprint as the product-completion denominator.

## Measurable state

- No defensible overall completion percentage is available: the 218 numbered master sections are indexed, but all 218 section mappings remain UNREVIEWED. Sections are not individual requirements and are not equally sized.
- The expansion register has 14 families: 4 IN_PROGRESS, 10 OPEN, and all 14 full-family acceptance statuses NOT_RUN. These are recorded acceptance gaps, not proof that the OPEN families have no code; several now contain Claude's implementation or newer discovery/AI work not reconciled into that register.
- All 34 existing complete application scenarios remain NOT_RUN. New expansion/DPDP full scenarios also require definition and execution. No frozen release candidate is qualified.
- The legacy 33-module register records 22 IMPLEMENTED_SANDBOX_SUBSET, 3 PARTIAL_SANDBOX, 1 NOT_IMPLEMENTED and 7 DEFERRED_V2. These older labels cannot measure the expanded product. In particular, payment core and DPDP work have progressed beyond some register descriptions.
- Latest combined-source evidence: 252 unit tests pass; typecheck, full lint, production Next build, OPA compile check and generation/check of 300 unique API routes pass. These checks establish build/component consistency, not complete runtime acceptance.
- Earlier component evidence: GRC/audit HTTP 57 checks and audit database 41 checks; payment store 45 checks; discovery/catalog/AI-monitor subsets and browser journeys have dated artifacts. Those earlier results do not qualify the merged source by themselves.
- The earlier '100 of 104 requirements' statement in CURRENT_STATE.md belongs to the historical bounded build and is not an overall completion percentage.

## What is present

Base implementation includes staff/principal authentication, MFA, scoped authorization/RLS, consent/notices, durable withdrawal processing, signed local agent commands, independent synthetic-target readback, graph/inventory, rights intake, retention/holds, processor assessments, incidents, notification records, evidence/reporting, licensing, support/update records, guided connection/import, monitoring and audit administration. Depth varies; synthetic and declaration-only boundaries remain explicit.

Expansion implementation includes approved/scheduled PostgreSQL catalog metadata discovery, provenance and missing-map findings, non-model AI-use governance and monitoring, framework/control mappings, manual evidence reviews, risk treatments, audit plans/requests/responses/closure, and vendor-side UPI/card payment processing primitives. A catalog metadata read is not sensitive-value classification; a declared control or approved plan is not verified execution.

Claude's integrated implementation adds signed regulatory-package import/review and applicability decisions; people/context/category/reference registries; versioned activities/notices/consent/retention/processor records; child/representative controls; estate import; rights/retention/correction/withdrawal workflow execution, approval and independent synthetic verification; breach tasks and SDF obligations; evidence packages; attention/notification sweeps; a database-checkpointed background runner; and workspace/portal screens. It adds 102 routes, taking the merged contract from 198 to 300. Thirteen DPDP integration suite files exist. No committed operations-suite execution artifacts were found in this checkout during this inspection; their presence is not recorded as PASS.

## Specific remaining work by delivery family

| Family | Remaining implementation or qualification |
|---|---|
| EX01 Consent/preferences | Complete universal purpose/channel preferences and touchpoints; connect actual downstream systems; prove cross-channel withdrawal, replay, expiry, offline/restart and independent readback on the merged application. Finish notice authoring/translation review and served-version evidence. |
| EX02 Website CMP | Build the authorized website cookie/tracker scanner, discovered inventory, script/category blocking, consent UI/configuration, applicable preference signals and multilingual operation. Prove network behavior before/after consent and withdrawal, keyboard/accessibility, and supported browser/site cases. |
| EX03 Rights | Complete supported-system discovery/search, correction/erasure, identity/representation adverse paths, per-copy/processor and hold handling, redaction, reviewed response packaging and secure expiring/revocable delivery. Exercise Claude's rights execution and V1 outcome synchronization together. |
| EX04 Discovery/classification | Extend the current synthetic PostgreSQL column-metadata slice to named supported real databases, files/object stores and APIs; implement sensitive-value classification and source/code flow analysis with rule versions, quality measurements, limits, provenance and failure/restart cases. |
| EX05 Mapping/RoPA | Reconcile the existing graph and Claude's processing registry; complete source-to-activity/purpose/recipient/location/transfer/owner mappings, change impact and complete bounded exports. Validate missing/stale/conflicting links; declarations remain distinct from observed flows. |
| EX06 Assessments | Build general versioned PIA/DPIA/SDF/AI questionnaires, required-answer/evidence validation, control/risk links, independent approval, remediation ownership/deadlines and retest/escalation. Existing processor-assessment race fix is only a component. |
| EX07 Retention/holds | Qualify Claude's evaluator, dry run, approval and action runner; implement supported real-copy deletion/readback, backup obligations and supported crypto-erasure/key handling; prove hold conflicts, uncertain outcomes, restart and restored restrictions. |
| EX08 Third parties | Complete supplier onboarding/due diligence, scoped external questionnaire/assignment access, agreement lifecycle, reassessment/expiry, subcontractor/transfer restrictions and remediation; verify actual processor outcomes beyond declarations and synthetic dispositions. |
| EX09 Incidents | Complete real monitored-event linkage and customer-controlled notification transports; reviewed audience/content, failed/retried delivery and actual receipts; qualify breach awareness/deadline uncertainty and follow-up workflows using reviewed regulatory content. |
| EX10 GRC/audit | Run the new audit-screen browser journeys and installed Next integration; complete enterprise policy lifecycle, audit findings/issues/remediation, broader regulatory-content-to-control mapping, and verification of mitigation outcomes. Existing audit closure is not certification. |
| EX11 Continuous compliance | Implement/complete scheduled scoped control checks and connector evidence collection, durable drift/findings/remediation, deduplicated real alert delivery and auditor reporting. Prove deliberately broken controls, stale/manual/error evidence, recovery and test history. |
| EX12 DSPM/AI governance | Extend AI inventory/declaration checks to supported-source sensitivity, access/exposure and purpose posture using actual receipts; complete assessment/incident/control links and monitoring coverage. No model-behavior verification is currently established. |
| EX13 UPI/card commerce | Build separate vendor identity/MFA/API/UI and hosted checkout; actual provider sandbox conformance; invoices/tax, subscription/renewal/refund/dispute flows; unknown-outcome reconciliation UI; production database roles; licence signing, entitlement delivery/downloads and support integration. Razorpay is an adapter candidate, not an activated provider. |
| EX14 Enterprise delivery | Enterprise SSO/SCIM/directory and customer-held recovery; tenant lifecycle; supported installer and upgrade/rollback; customer-local backup/DR drills; separately trusted signed evidence exports and signing custody; accessibility and browser matrix; representative 1M mixed workload; security/privacy/supply-chain review; exact candidate, full acceptance and release approval. |

## Claude-specific unfinished items to preserve

1. Run all 13 DPDP suites on an isolated migrated merged runtime: regulatory, applicability, registry, estate-import, notices, consent-withdrawal, rights, correction, processors, breach, sdf, runner and retention-scale. Retain assertions and failures; do not reset a shared runtime.
2. Complete UI creation flows currently documented as API-first: purposes, activities, notices, rules, holds and engagements. Exercise the real writer/reviewer/principal journeys, not only API fixtures.
3. Obtain/hash official source artifacts and resolve the baseline's explicitly listed verification items: commencement-date discrepancy, missing corrigendum and unencoded Schedules. These are unresolved repository content checks; this report does not assert which legal date is correct. Obtain legal review before production-package qualification.
4. Build, sign, independently approve and test an actual production regulatory package and its update/adoption/impact behavior. All documented executed DPDP examples use TEST_FIXTURE packages.
5. Replace synthetic-only automated action coverage with named real connector conformance. MANUAL_ONLY must continue returning unsupported rather than success.
6. Qualify deployment/supervision, restart, retries and permissions of the separate database-checkpointed operations runner alongside the existing Temporal withdrawal worker. Its existence alone does not prove integrated operational readiness.

## Cross-cutting blockers and decisions

- No real customer-system connector is qualified. Name the pilot providers and permitted operations; credentials must be provisioned securely outside chat.
- UPI/cards are approved methods. Payment provider/account, catalogue/prices, tax, renewal/refund terms and production signing custody remain decisions needed for activation, not grounds to invent defaults.
- The 1M-row indexed query probe passed, but ingest/jobs/API concurrency/export/backup/restore at 1M remain unqualified. Implement resumable batched exports: current documented reports cap sections at 2,000 and audit export at 5,000. Select hardware/workload and measurable service targets before claiming capacity.
- A cold-start OPA failure was observed and preserved; subsequent checks passed unchanged. Diagnose and qualify cold-start/load behavior without relaxing fail-closed authorization.
- Complete approved customer-held recovery, backup topology and recovery targets, retention/record-class decisions, evidence/release/licence key custody and trusted distribution.
- Full security/privacy/legal/accessibility/deployment acceptance and independent review remain open. Freeze one exact candidate after implementation; run T01-T34 plus all expansion/DPDP scenarios and required rehearsals on that identity.
- M19-M25 custom-model work remains DEFERRED_V2. If 'overall idea' includes V2, those seven modules are also unfinished; they are not secretly counted as delivered V1 and must not be introduced into V1 contrary to its approved restriction.

## Fast restart order

1. Start from the combined commit above (or its reviewed successor). Reconcile the stale CURRENT_STATE/capability/expansion records and map the 218 sections plus E1/DPDP obligations to actual code, tests and missing acceptance. Do not rebuild features Claude already implemented.
2. Establish an isolated merged runtime with all migrations and workers; run the 13 DPDP suites and affected V1/GRC suites, then audit/DPDP browser journeys. Fix integration defects first and capture the cold-start case.
3. Finish API-only UI flows and shared gaps: general assessments, policy/issue/remediation lifecycle, complete evidence/export jobs. These support multiple delivery families.
4. Deliver named real connector(s) with independent readback; use them to qualify consent, rights, retention, processors, discovery and posture end to end. Build CMP separately with explicit browser/network acceptance.
5. Finish vendor commerce once provider and commercial decisions are recorded. Keep customer operational data out of vendor services.
6. Run capacity, recovery, security and accessibility qualification; freeze a candidate and execute all complete acceptance scenarios. Only then calculate actual accepted coverage and request release approval.

No time estimate or effort percentage is supplied: remaining requirements are not yet fully decomposed/weighted, and external provider, legal, recovery and deployment decisions affect the critical path.

Sources: `tracking/{capabilities,acceptance,v1-source-inventory,v1-expansion}.json`; `docs/engineering/{V1_EXPANDED_BASELINE,PRODUCTION_READINESS,CAPACITY_1M,dpdp-operations}.md`; `docs/engineering/2026-09-25-dossier-gap-checklist.md`; dated V1 expansion and PR16 merge handoffs and their artifacts. Historical records are cited as historical, not current release acceptance.
