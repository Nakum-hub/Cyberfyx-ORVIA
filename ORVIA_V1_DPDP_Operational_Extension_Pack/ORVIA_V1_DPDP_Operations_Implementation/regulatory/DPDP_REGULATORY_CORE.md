# DPDP Regulatory Core — Official Source and Runtime Contract

## 1. Purpose
Create a legally traceable, versioned source-of-truth layer for ORVIA's executable DPDP behavior.

## 2. Allowed authoritative source classes
Only official Government of India sources may establish executable regulatory logic:
- enacted Digital Personal Data Protection Act, 2023;
- final Digital Personal Data Protection Rules, 2025;
- Gazette notifications;
- official commencement/enforcement notifications;
- official corrigenda;
- official Central Government/MeitY notifications/directions/orders where applicable;
- official Data Protection Board material where it has relevant legal/operational authority.

## 3. Prohibited authority sources
The following may be read by humans for context but must never become authoritative executable input:
- law-firm articles;
- blogs;
- vendor guidance;
- social posts;
- press articles;
- unofficial reproductions where official original is available;
- model-generated legal interpretation.

## 4. Initial official baseline
Implementation must initialise the library from verified official artifacts current at build time. At minimum verify and ingest/reference:
- Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023);
- Digital Personal Data Protection Rules, 2025;
- the official commencement/enforcement timeline notification(s);
- official Rules corrigendum(s) applicable at build time;
- Data Protection Board establishment/membership notifications where relevant to product behavior.

Do not use this file's statement as proof that a particular provision is currently in force. The build agent must verify the official artifact current at implementation time.

## 5. Ingestion contract
For every source:
1. retrieve from official domain/repository;
2. store source metadata;
3. compute content hash;
4. preserve publication/notification identifiers;
5. record retrieval time;
6. identify supersession/corrigendum relationships;
7. require human/vendor approval before producing an executable regulatory package.

## 6. Provision model
Every provision used by ORVIA must have:
- source reference;
- provision/rule/section identifier;
- version;
- publication date;
- commencement/effective date;
- status: published / not commenced / in force / amended / superseded;
- dependencies/exceptions where explicitly present;
- exact implementation requirement(s) derived and reviewed.

## 7. Requirement model
An ORVIA executable requirement must contain:
- stable requirement ID;
- version;
- official source references;
- plain operational statement;
- applicability expression;
- required evidence;
- product modules affected;
- workflow/timer behavior if any;
- effective period;
- test cases derived from the requirement.

No executable requirement without official source linkage.

## 8. Applicability
Applicability can return only:
- applies;
- does_not_apply;
- unresolved.

If a necessary customer fact is unknown, return unresolved. Never infer the missing fact.

## 9. Commencement handling
Different provisions/rules may commence at different times. The Regulatory Core must:
- store effective/commencement date per provision/requirement;
- prevent future provisions from being represented as already in force;
- permit preparation mode for future requirements without mislabeling legal status;
- activate operational deadlines/mandatory behavior only according to the approved package and effective date.

## 10. Corrigenda/amendments
A corrigendum or amendment must:
- create a new provision/requirement version;
- preserve prior versions;
- record what changed;
- update future applicability/execution after effective date;
- never rewrite historical workflow/evidence records.

## 11. Regulatory package
The runtime consumes an approved package, not loose sources.

A package must include:
- package version;
- manifest of official sources + hashes;
- requirement versions;
- change diff from prior package;
- activation/effective metadata;
- integrity/signature mechanism using existing ORVIA release-security architecture;
- approval record.

## 12. Customer activation
Do not silently alter production legal behavior merely because a new source was fetched.

Required lifecycle:
1. official source detected/imported;
2. source verified;
3. requirement changes authored/reviewed;
4. package built and tested;
5. package approved/signed;
6. customer deployment receives update through existing secure update path;
7. effective-date logic controls activation;
8. impact analysis creates customer-visible affected items;
9. historical executions remain pinned to prior package.

## 13. Impact analysis
For every changed requirement, compute affected relationships across:
- processing activities;
- notices;
- processing conditions;
- consent workflows;
- rights workflows;
- retention rules;
- processor obligations;
- security safeguards;
- incident timers;
- SDF obligations;
- Data Principal/child/guardian flows.

If impact cannot be determined because customer facts are missing, generate unresolved attention item rather than assuming.

## 14. Legal-output boundary
ORVIA may say:
- requirement applies/does not apply/unresolved under configured facts;
- evidence present/missing;
- action completed/failed/unverified;
- source provision and effective version;
- workflow/timer state.

ORVIA must not state an unconditional legal conclusion that the organisation is fully compliant.

## 15. Initial official source references for implementation verification
Use official pages/artifacts current at implementation time, including:
- MeitY Act and Policies portal;
- official DPDP Rules 2025 page and its linked Gazette PDFs;
- official DPDP Act 2023 Gazette publication.

The build process must store the actual retrieved official URL/notification identifier and hash, not only a human-readable citation in documentation.
