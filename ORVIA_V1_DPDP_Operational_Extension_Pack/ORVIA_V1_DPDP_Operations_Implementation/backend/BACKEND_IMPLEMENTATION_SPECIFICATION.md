# Backend Implementation Specification

## Objective
Implement the server-side, persistence, workflow, job, regulatory, evidence, and API capabilities required by the Product Requirements while preserving the completed V1 backend architecture.

## Mandatory backend capabilities

### Data Principal and relationship services
- canonical Data Principal reference model consistent with V1 identity rules;
- configurable relationship categories;
- multiple relationships per person;
- source-system identifiers/references;
- authorised lookup/linking;
- bulk onboarding without unnecessary duplication of raw source-system personal data.

### Data & Processing Registry
Persist and query:
- personal-data categories;
- processing activities;
- purposes and versions;
- processing conditions;
- systems/targets;
- processors;
- notices and versions;
- consent events/evidence;
- retention rules/holds/exceptions;
- safeguards;
- requirement/version links;
- workflow/action/verification/evidence relationships.

### Processing activity service
Each processing activity must be able to link Data Principal categories, data categories, purpose, processing condition, systems, processors, collection/source context, notice, retention, safeguard/control, owner, evidence, and status.

### Purpose and policy service
Implement effective-dated/versioned purposes, material-change events, impact relationships, approval/audit integration, and mappings to processing activities, conditions, notices, data categories, and retention.

### Notice service
Implement version creation, publication/effective state, processing/purpose/data mappings, presentation/delivery evidence ingestion, historical lookup by timestamp, and Privacy Centre retrieval.

### Consent lifecycle service
Implement append-only consent events, active-state derivation, notice-version pinning, purpose/processing links, withdrawal, downstream enforcement, verification/evidence, and bulk import that preserves missing proof as missing.

### Rights and grievance case service
Implement a case state machine for intake, authority verification, scope discovery, generated actions, approvals where configured, execution, verification, exceptions/holds, response, communication, and evidence-backed closure. Do not close a case with hidden failed/inconclusive targets.

### Retention and erasure service
Implement versioned retention rules, evaluation jobs, purpose/status checks, holds/exemptions, dry-run impact computation, approval hooks, batch action creation, downstream erasure, restart/resume, idempotency, verification, evidence, and factual failure reporting.

### Processor and data-sharing service
Implement processing/data/system relationships, contract/safeguard evidence, lifecycle state, termination/disposition tasks, historical relationships, and query support for rights and incident scope.

### Personal-data breach service
Implement awareness/discovery timestamps, affected scope, processors, requirement-pinned timers, notification tasks, communications evidence, remediation, closure, and historical regulatory-package pinning.

### Regulatory Core integration
Implement the full contract in `regulatory/DPDP_REGULATORY_CORE.md` including authoritative source manifests, requirement versions, commencement/effective state, applicability, integrity/versioning, impact diff, and controlled activation.

### Evidence service
Support immutable/versioned evidence references for notices, consent, rights actions, processors, retention/erasure, safeguards, breach response, regulatory source manifests, and independent verification. Evidence records must capture origin, timestamp, actor/system, integrity reference/hash where supported, and related requirement/workflow.

### Coverage, Failure and Attention services
Generate factual operational gaps from real state. Examples: missing mapping, unresolved processing condition, missing evidence, connector unavailable, action failed, verification inconclusive, unresolved hold, unresolved applicability, approaching deadline. Do not fabricate generic recommendations as operational facts.

### Notification service
Extend the existing notification infrastructure for rights, grievance, consent/withdrawal acknowledgement where configured, breach, internal deadlines, regulatory-change alerts, and processor/retention failures. Persist delivery status/evidence.

### SDF capability
Keep inactive unless applicable/configured. When active, support DPO/contact records, independent auditor reference, required DPIA/audit workflow support, technical-measure records, transfer/restriction controls driven only by active official requirements, and recurring timers/evidence.

## API requirements
Follow existing V1 routing, authentication, validation, error envelope, pagination, versioning, and tenant isolation patterns. Implement real APIs for the capabilities needed by the frontend and integrations. Do not return hard-coded demo data as implementation.

## Job and event requirements
Reuse existing V1 scheduling/event infrastructure for retention evaluation, deadline/timer processing, regulatory effective-date activation, bulk operations, verification runs, retries, and resumable backfill.

## Persistence and migrations
Use V1 migration tooling. Reuse existing canonical entities where semantically correct. Add new tables/fields/indices only where required. Historical fields must be nullable/unknown on migration rather than invented.

## Performance
Bulk paths must use pagination/streaming/batching with bounded memory and resumability. Avoid unbounded fan-out and avoid O(N^2) identity/graph behavior on critical bulk paths unless proven necessary and measured.
