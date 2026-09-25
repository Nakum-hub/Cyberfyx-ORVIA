# ORVIA V1 DPDP Operations — System Architecture and Integration

## 1. Architecture principle
Do not create a parallel DPDP application. Extend the completed V1 using existing service boundaries, module patterns, eventing, persistence, IAM, evidence, connector, workflow, testing, and deployment conventions.

The repository at implementation time is authoritative for exact package/service names.

## 2. New foundational capability A — Data & Processing Registry
Add or extend domain capability sufficient to represent:
- Data Principal references;
- relationship/category contexts;
- personal-data categories;
- processing activities;
- purposes;
- processing conditions;
- systems/targets;
- processors;
- data-sharing links;
- retention links;
- evidence links.

If existing Control Graph entities can represent these without semantic overload, extend them. If not, add dedicated entities and link them into the graph. Do not duplicate an existing canonical object.

## 3. New foundational capability B — Regulatory Core
Add a versioned regulatory subsystem containing:
- official source documents/references;
- source hashes and metadata;
- provisions;
- commencement/effective periods;
- requirement definitions;
- applicability expressions;
- operational mappings;
- evidence expectations;
- regulatory packages/releases;
- change diffs.

Customer runtime state must pin to a regulatory package/version for every material workflow execution.

## 4. Required integration with existing V1 modules
Extend, do not fork:
- Control Map/Graph;
- Purposes/Policies;
- Notices;
- Consent;
- Rights;
- Privacy Centre;
- Workflow Engine;
- Connectors;
- Retention;
- Processors;
- Incident;
- Evidence;
- Testing;
- Coverage/Failure;
- Attention;
- Notifications;
- IAM;
- audit logging;
- licensing/entitlements only where commercial packaging requires existing mechanisms.

## 5. Domain boundary rules
- Regulatory Core determines what the active official regulatory package says and how ORVIA requirements are versioned.
- Customer configuration determines the organisation's facts, systems, purposes, processing activities, external-law holds, and choices permitted by the product.
- Workflow Engine executes approved operational behavior.
- Connectors perform/verify target-system actions.
- Evidence system stores immutable/append-only proof references according to current V1 evidence architecture.
- Attention/Coverage surfaces unresolved facts and failures; they do not fabricate resolution.

## 6. Multi-tenant/customer isolation
Follow existing V1 tenancy/isolation architecture. New DPDP entities must carry the same tenant/customer isolation guarantees as the most sensitive existing records.

No cross-customer regulatory state may contain customer personal data. Regulatory packages are vendor/product content; customer applicability and evidence remain customer-local.

## 7. Customer-local deployment
DPDP operational data must not require transmission of Data Principal personal data to the ORVIA vendor cloud for core operation. If licensing/telemetry architecture exists, continue to use only the minimum fields already authorised by V1 contracts.

## 8. Event model
Add/extend events consistent with the existing event bus or job mechanism. Required event semantics include:
- data_principal_context_created/updated;
- processing_activity_created/updated;
- purpose_changed;
- notice_version_published;
- consent_granted/withdrawn/changed;
- rights_request_received/updated/closed;
- retention_trigger_reached;
- erasure_action_requested/executed/verified/failed;
- processor_relationship_changed;
- personal_data_breach_created/updated;
- regulatory_package_imported/activated;
- requirement_applicability_changed;
- verification_failed;
- evidence_recorded.

Exact names must match repository conventions; semantics are required.

## 9. Transactionality and idempotency
All externally executed actions must have:
- stable action IDs;
- idempotency keys where target permits;
- retry policy;
- timeout policy;
- partial failure accounting;
- immutable outcome/evidence linkage;
- no double-execution on worker retry.

## 10. Destructive-action safety
Erasure and similar irreversible actions must support:
- preview/dry run;
- impacted record count where available;
- scope display;
- approval gate using existing V1 maker-checker/approval architecture if present;
- target capability check;
- explicit unresolved-hold check;
- idempotent execution;
- post-action verification;
- failure escalation.

## 11. Historical state
Do not overwrite historical legal or operational state.

Version/effective-date at minimum:
- purpose;
- notice;
- processing activity material configuration;
- regulatory requirement;
- regulatory package;
- consent status/events;
- processor relationship;
- retention rule;
- exception/hold;
- workflow execution inputs.

A historical workflow must remain explainable using the version active when it ran.

## 12. Search/query capability
Authorised users and workflows must be able to query relationships such as:
- all processing activities for a Data Principal context;
- all systems containing a data category;
- all processors linked to a processing activity;
- all evidence supporting a requirement;
- all active retention holds for a record/population;
- all affected processing activities for a regulatory change;
- all failed downstream actions for a rights/erasure case.

## 13. API requirements
Follow existing API conventions. New APIs must provide:
- explicit tenant scoping;
- IAM authorization;
- pagination for large collections;
- bulk endpoints/jobs for large imports/actions;
- deterministic error codes;
- optimistic concurrency or equivalent for mutable configuration;
- audit events;
- no sensitive-data leakage in generic errors/logs.

## 14. Background jobs
Use current V1 job infrastructure for:
- large imports;
- connector discovery;
- retention scans;
- erasure batches;
- verification;
- deadline/timer evaluation;
- regulatory impact recalculation;
- evidence refresh;
- retry/reconciliation.

Jobs must be resumable and safe after process restart.

## 15. Observability
Extend existing observability with:
- workflow/action correlation IDs;
- per-target success/failure counts;
- retry counts;
- queue lag;
- verification latency;
- regulatory package version;
- blocked-by-unknown/hold counts;
- no raw personal data in metrics labels.

## 16. Compatibility rule
All existing V1 automated tests must remain passing. Any required behavior change to an existing contract must be implemented as an intentional, versioned migration with regression tests and must not silently break current functionality.
