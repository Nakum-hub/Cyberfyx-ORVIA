# ORVIA V1 DPDP Operations — Domain Data Model and Schema Contract

## 1. General rule
Use repository naming conventions and existing canonical entities. The following logical model is mandatory; physical table/service names may differ.

Every customer-scoped record must include current V1 tenancy, authorization, audit, created/updated metadata, and soft-delete/versioning conventions where applicable.

## 2. DataPrincipalRef
Purpose: canonical or pseudonymous reference to an individual inside a customer's environment.

Minimum fields/semantics:
- id;
- tenant/customer id;
- external/source subject references (encrypted/protected according to V1);
- status;
- created_at/updated_at.

Do not require ORVIA to centralise all raw personal attributes. Store only what is necessary for orchestration/reference and follow connector/source-of-truth design.

## 3. DataPrincipalRelationship
Represents organisational context, e.g. patient, customer, employee, user.

Fields:
- id;
- data_principal_ref_id;
- category_id;
- effective_from/effective_to;
- source_system/reference;
- status;
- evidence/reference if applicable.

One person may have multiple relationships.

## 4. DataPrincipalCategory
Customer-configurable relationship type.

Fields:
- id;
- name;
- description;
- active;
- optional regulatory tags;
- not asserted as a statutory category unless official source explicitly defines one.

## 5. PersonalDataCategory
Customer-configurable category/type of digital personal data.

Fields:
- id;
- name;
- description;
- sensitivity/handling classification only if existing V1 supports customer-defined classification;
- source mappings;
- active.

Do not invent legal special-category labels not present in the applicable DPDP source.

## 6. Purpose
Versioned object.

Fields:
- stable purpose_id;
- version_id/version_number;
- description;
- effective_from/effective_to;
- owner;
- status;
- change_reason;
- evidence.

## 7. ProcessingActivity
Fields:
- id;
- name;
- description;
- owner;
- effective_from/effective_to;
- status;
- purpose_version references;
- processing_condition reference;
- notice version reference(s);
- regulatory mapping references;
- evidence completeness state.

Relationships:
- DataPrincipalCategory many-to-many;
- PersonalDataCategory many-to-many;
- System/Target many-to-many;
- Processor many-to-many;
- collection/source channel many-to-many;
- RetentionRule many-to-many/qualified link;
- Safeguard/Control many-to-many.

## 8. ProcessingCondition
Represents the configured condition/basis for processing and its authority mapping.

Fields:
- id;
- type/code from approved regulatory package/customer configuration;
- official requirement/provision references;
- effective_from/effective_to;
- status;
- unresolved flag/reason;
- evidence requirements;
- customer factual justification reference where needed.

## 9. Notice and NoticeVersion
Notice:
- stable id;
- name;
- audience/category links.

NoticeVersion:
- version id;
- content reference/hash;
- effective_from/effective_to;
- locale/language;
- linked purposes/data categories;
- withdrawal/rights channel configuration;
- publication status;
- source/template metadata;
- superseded_by.

## 10. NoticeDeliveryEvidence
Fields:
- data_principal_ref or population reference;
- relationship context;
- notice_version_id;
- channel;
- presented/delivered timestamp;
- source system;
- evidence artifact/reference;
- result/status.

Do not create historical delivery evidence without a source record.

## 11. ConsentRecord and ConsentEvent
ConsentRecord:
- subject/context;
- purpose/processing activity;
- current status;
- notice version;
- source/channel.

ConsentEvent append-only history:
- requested/presented/granted/declined/changed/withdrawn/etc.;
- timestamp;
- actor/source;
- evidence;
- regulatory package/version;
- downstream action correlation.

## 12. SystemTarget
Reuse existing connector/target entity if available. Add capability metadata:
- discover_metadata;
- read_reference;
- correct;
- erase;
- stop/restrict processing if connector supports a meaningful target action;
- verify;
- retrieve_evidence;
- bulk support;
- idempotency support.

Capabilities are factual connector properties, not promises.

## 13. ProcessorRelationship
Fields:
- processor/vendor identity;
- service;
- effective dates;
- contract evidence;
- safeguards evidence;
- active/terminated status;
- data disposition state;
- linked processing activities/data categories/systems;
- subprocessor references if configured.

## 14. DataSharingLink
Fields:
- source processing activity;
- data category;
- Data Principal category;
- recipient/processor;
- purpose;
- system/interface;
- effective period;
- evidence.

## 15. RetentionRule
Fields:
- id/version;
- scope expression;
- trigger definition;
- duration/condition only from explicit configuration/authoritative requirement;
- regulatory source if applicable;
- customer external-law reference if applicable;
- approval requirement;
- erasure action policy;
- effective period.

## 16. RetentionState
Per subject/record/population as implementation permits:
- eligible_at;
- blocked_by_hold;
- hold references;
- purpose_still_active state;
- scheduled action;
- last evaluated;
- unresolved reason.

## 17. LegalHoldOrException
Fields:
- id;
- type: official exemption / customer-recorded other-law retention / operational hold;
- authoritative/customer reference;
- scope;
- reason;
- start/end/review date;
- approver/owner;
- evidence;
- status.

An “other law” record is customer/legal-team supplied unless ORVIA has an official-source module for that law. Do not infer it.

## 18. DataPrincipalRequestCase
Fields:
- type;
- requester/context;
- identity/authority verification state;
- received_at;
- regulatory package/version;
- status;
- due/timer fields derived from active rule/configuration;
- linked processing/system scope;
- actions;
- exceptions;
- response record;
- closure evidence.

## 19. GrievanceCase
May extend DataPrincipalRequestCase if existing architecture supports subtype semantics. Must retain investigation, communications, owner, escalation, outcome, closure evidence.

## 20. RepresentativeGuardianRelationship
Fields:
- Data Principal;
- representative/guardian ref;
- relationship type;
- authority evidence;
- effective period;
- verification status;
- applicable workflow restrictions.

## 21. NominationRecord
Fields:
- Data Principal;
- nominee reference;
- scope/status;
- effective record;
- evidence;
- activation facts when applicable.

## 22. PersonalDataBreachIncident
Reuse Incident if present; subtype with:
- discovery/awareness timestamp;
- affected systems;
- processing activities;
- data categories;
- affected population references/counts where known;
- processors;
- facts/impact fields;
- mitigation;
- notification tasks/timers;
- communications;
- remediation;
- evidence;
- closure.

Unknown affected count must remain unknown until established.

## 23. RegulatorySource
Fields:
- source id;
- source type;
- official publisher;
- title;
- official URL/reference;
- gazette/notification number where available;
- publication date;
- hash/digest of ingested artifact;
- ingestion timestamp;
- verified flag/method;
- supersession/corrigendum relation.

## 24. RegulatoryProvisionVersion
Fields:
- source id;
- provision identifier;
- text/reference hash or structured representation;
- published/effective/commencement dates;
- status: published/not commenced/in force/amended/superseded;
- supersedes/superseded_by;
- official citations.

## 25. OrviaRequirementVersion
Fields:
- stable requirement id;
- version;
- title;
- official provision references;
- applicability expression;
- required operational behavior;
- evidence expectations;
- effective period;
- activation state;
- implementation mapping.

No requirement may become executable without an official-source reference and approved package.

## 26. RegulatoryPackage
Fields:
- package id/version;
- included requirement versions;
- source manifest;
- source hashes;
- creation/signing metadata;
- activation date;
- release notes/change diff;
- approval state.

## 27. ApplicabilityDecision
Fields:
- requirement version;
- customer/processing scope;
- result: applies/does_not_apply/unresolved;
- factual inputs;
- rule expression version;
- actor/system;
- timestamp;
- evidence;
- explanation trace.

## 28. WorkflowExecution
Must pin:
- workflow definition/version;
- regulatory package/version;
- customer policy/configuration versions;
- subject/scope references;
- start/end;
- status;
- action IDs;
- evidence;
- error/failure state.

## 29. DownstreamAction
Fields:
- action id;
- target;
- capability/action type;
- idempotency key;
- request payload reference (protected);
- request time;
- outcome;
- target response reference;
- retries;
- verification state;
- evidence.

## 30. VerificationResult
Fields:
- downstream action/workflow reference;
- verification method;
- verifier/connector;
- timestamp;
- expected state;
- observed state;
- pass/fail/inconclusive;
- evidence;
- failure reason.

Inconclusive must never be converted to pass.
