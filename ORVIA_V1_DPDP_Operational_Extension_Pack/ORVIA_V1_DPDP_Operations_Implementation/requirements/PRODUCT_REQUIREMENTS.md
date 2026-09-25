# ORVIA V1 DPDP Operations — Product Requirements

## 1. Product requirement
Extend the completed ORVIA V1 into a DPDP operational system that can govern existing and future digital personal data processed by a customer organisation without replacing the existing V1 architecture.

The extension must convert applicable official DPDP requirements into traceable operational records, workflows, actions, verifications, and evidence.

## 2. Required product outcome
A customer must be able to use ORVIA to:
1. establish what categories of Data Principals and personal data it processes;
2. register and maintain processing activities and purposes;
3. map systems and processors to those activities;
4. link notices, consent or other configured processing conditions, retention, safeguards, rights handling, incidents, and evidence;
5. onboard an existing data estate without inventing missing history;
6. govern future processing continuously;
7. execute supported downstream actions through connectors;
8. verify execution independently where technically possible;
9. preserve versioned evidence and historical state;
10. react to official regulatory changes through a controlled, versioned regulatory core.

## 3. Explicit non-goals
Do not implement:
- a one-time questionnaire as the primary product;
- an arbitrary compliance score;
- legal advice masquerading as software output;
- unsupported declarations that an organisation is “fully DPDP compliant”;
- a universal sector taxonomy claimed to be statutory;
- generic cybersecurity features with no DPDP operational relationship;
- automatic deletion where retention/legal basis is unresolved;
- automatic legal interpretation from third-party articles.

## 4. Personas and operating roles
Use existing V1 IAM/role architecture. Add/extend capabilities needed for:
- privacy administrator;
- DPO/responsible contact where configured;
- business/process owner;
- security/incident responder;
- processor/vendor owner;
- approver/maker-checker;
- auditor/read-only evidence reviewer;
- Data Principal/authorised representative through the external privacy surface.

Do not assume these role names are the exact existing V1 role names. Map to existing authorization primitives.

## 5. Core operating objects
The product must support at minimum:
- Data Principal identity reference or pseudonymous subject key;
- Data Principal relationship/category;
- personal-data category;
- processing activity;
- purpose;
- processing condition/basis record;
- notice and notice version;
- consent record where applicable;
- system/target;
- processor/vendor relationship;
- data-sharing relationship;
- retention rule and retention instance/state;
- exception/exemption/other-law hold;
- Data Principal request/case;
- grievance;
- nomination/representative relation where applicable;
- child/guardian relation where applicable;
- security safeguard/control evidence;
- personal-data breach incident;
- workflow execution;
- downstream action;
- verification result;
- evidence artifact/reference;
- regulatory source;
- regulatory provision/version;
- ORVIA executable requirement;
- applicability determination;
- regulatory package/version.

## 6. Existing-data onboarding
ORVIA must support data estates that pre-date deployment.

Required states include:
- known;
- unknown;
- evidence available;
- evidence missing;
- needs verification;
- needs remediation;
- not applicable;
- exception/hold recorded.

The system must support bulk import/discovery and must not require one-by-one manual creation for large populations.

## 7. Future-data operating mode
After baseline establishment, ORVIA must support event-driven or scheduled operational governance for new or changed records. Examples include:
- new Data Principal relationship;
- new processing activity;
- new purpose;
- consent event;
- withdrawal event;
- rights request;
- correction/update;
- retention trigger;
- processor change;
- system change;
- personal-data breach;
- regulatory package change.

## 8. Data Principal model
Do not model the product around “employee” as the universal person type.

A Data Principal can have multiple relationship contexts. Example:
- one individual may be both an employee and a patient;
- the same individual may have different processing purposes, systems, notices, retention rules, and evidence under each relationship.

The implementation must preserve these contexts separately while allowing authorised linkage to the same person reference where configured.

## 9. Processing Activity Registry
Each processing activity must support linkage to:
- purpose;
- Data Principal category/categories;
- personal-data category/categories;
- collection/source channels;
- systems/targets;
- processors;
- processing condition/basis configuration;
- applicable notice/version;
- retention configuration;
- safeguards/controls;
- business owner;
- evidence;
- regulatory requirements;
- status and effective period.

## 10. Purpose registry
Purposes must be versioned and effective-dated. Changing a purpose must produce a governed change event and impact analysis against linked notices, processing activities, consent configurations, retention, and downstream workflows.

## 11. Notice operations
The product must provide:
- notice records and versions;
- effective dates;
- purpose and data mappings;
- Data Principal category mappings;
- language/locale support consistent with existing V1 localization patterns;
- delivery/presentation channel records;
- evidence that a specific version was presented where integration permits;
- withdrawal/rights contact/link configuration;
- supersession history.

## 12. Consent operations
Where consent is the configured processing condition, support:
- requested;
- presented;
- granted;
- declined where captured;
- modified;
- withdrawn;
- expired if product configuration explicitly requires it;
- downstream propagation;
- verification;
- evidence.

Do not assume consent is the basis for all processing.

## 13. Processing-condition records
The engine must be able to represent the configured processing condition and its official source mapping. If unresolved, mark unresolved and prevent dependent destructive/legally significant automation.

## 14. Data Principal Rights Centre
Operational workflows must support the rights/processes applicable under the official DPDP framework and current regulatory package, including configuration for:
- access-related requests;
- correction/completion/updating;
- erasure;
- grievance redressal;
- nomination;
- authorised representative/guardian handling where applicable.

Each case must have status, timestamps, owners, actions, evidence, exceptions, response records, and closure evidence.

## 15. Privacy Centre
Extend the external privacy surface using existing V1 architecture to support applicable:
- privacy/notice information;
- consent/preference actions;
- withdrawal;
- rights request intake;
- correction/erasure intake;
- grievance intake;
- nomination/representative functions where supported;
- request status and communications.

Internal administrative capabilities must remain separated from Data Principal-facing capabilities.

## 16. Retention and erasure
The product must support:
- retention policies/rules;
- trigger event/date;
- purpose-status dependency;
- external legal/other-law retention hold;
- exception/hold;
- erasure eligibility;
- approval policy;
- downstream execution;
- partial failure;
- retry/idempotency;
- verification;
- evidence.

Never infer a retention period that is not present in official law, customer configuration, or explicitly recorded external legal requirement.

## 17. Processor operations
Processor records must be connected to actual processing activities and data categories, not remain a standalone vendor list.

Support:
- processor identity;
- service;
- processing activities;
- Data Principal categories;
- personal-data categories;
- systems/interfaces;
- contracts/contract evidence references;
- safeguards;
- data-sharing relationships;
- subprocessors if customer records them;
- termination and data-disposition evidence.

## 18. Data sharing
Maintain a queryable register linking data/process/purpose to recipient/processor and supporting evidence. Rights workflows must be able to use this register where the official requirement calls for such information.

## 19. Security safeguards
Reuse existing security/control/evidence primitives. Add only DPDP-relevant mappings such as:
- access control;
- encryption/obfuscation/masking/tokenisation where applicable;
- logging/monitoring;
- backup/availability safeguards;
- processor safeguards;
- technical/organisational measures.

ORVIA need not become the customer's SIEM. It may reference or verify evidence from authoritative connected systems.

## 20. Personal-data breach operations
Personal-data breach must be a first-class incident type connected to:
- affected processing activities;
- affected systems;
- affected Data Principals/populations;
- data categories;
- processors;
- awareness/discovery timestamp;
- mitigation;
- notification actions;
- statutory/internal timers from the active regulatory package;
- communications;
- remediation;
- evidence;
- closure.

## 21. Children and guardian handling
Support rule-driven child/guardian workflows only when applicable. The model must support:
- child status/context;
- guardian relationship;
- verification evidence;
- applicable consent/exemption configuration;
- restrictions/controls activated from the active regulatory package.

## 22. Significant Data Fiduciary mode
Implement an organisation capability/profile flag that activates additional obligations only when configured/legally applicable. Support architecture for:
- DPO role/contact;
- independent auditor relationship;
- periodic DPIA workflow;
- periodic audit workflow;
- applicable technical-measure/algorithmic due-diligence records;
- applicable government-specified transfer/data restriction controls.

Do not label every customer an SDF.

## 23. Regulatory change operations
When a new signed/approved regulatory package is imported:
- diff provisions/requirements;
- identify affected ORVIA requirement mappings;
- identify customer configurations potentially affected;
- create review/action records;
- preserve prior version behavior/evidence;
- apply effective dates;
- never rewrite historical evidence to the newest rule version.

## 24. Attention and coverage/failure
Extend existing surfaces to show factual work states such as:
- rights cases requiring action;
- breach deadlines;
- erasure failures;
- missing mappings;
- unavailable downstream targets;
- missing historical evidence;
- regulatory changes affecting configured requirements;
- verification failures.

## 25. Scale
The design must support large organisations and datasets. Bulk operations must include:
- batching;
- idempotency;
- resumability;
- progress and failure accounting;
- dry-run/preview for destructive operations;
- maker-checker where existing V1 policy requires it;
- no requirement to load all Data Principal records into memory simultaneously.

## 26. Product success criteria
The extension is successful only when end-to-end tests demonstrate:
1. existing data can be onboarded without false history;
2. future events enter the governance lifecycle;
3. a Data Principal request can traverse connected systems and close with evidence;
4. consent withdrawal can propagate to supported targets and be independently verified;
5. retention/erasure can run safely at batch scale with failures surfaced;
6. a personal-data breach can run through timer/notification/evidence workflow using active regulatory rules;
7. official-source regulatory packages are versioned and historically pinned;
8. existing V1 functionality remains passing.
