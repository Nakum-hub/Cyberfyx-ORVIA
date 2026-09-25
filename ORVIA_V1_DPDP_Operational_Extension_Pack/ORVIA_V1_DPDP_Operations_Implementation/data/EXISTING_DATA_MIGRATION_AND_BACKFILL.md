# Existing Data, Migration and Backfill Implementation

## 1. Objective
Add the DPDP operational extension after current V1 completion without losing or rewriting unrelated V1 data/functionality.

## 2. Migration safety
Database/schema migrations must:
- be backward compatible during deployment where current release architecture requires;
- preserve all existing records;
- have rollback/forward-fix procedure;
- be tested against a representative copy/fixture of the current V1 schema;
- avoid destructive default values that imply legal facts.

## 3. Existing V1 entity mapping
Before adding any table/entity:
1. inspect repository schema/domain objects;
2. identify canonical existing objects;
3. extend/reuse where semantically correct;
4. create new entity only when required semantics do not exist;
5. document mapping in code migration notes.

Do not duplicate People, Systems, Processor, Evidence, Control, Workflow, Incident, Notice, Consent or Rights objects if current V1 already has them.

## 4. Existing Data Estate onboarding
Support three ingestion methods where technically relevant:
- connector discovery/import;
- structured bulk import/API;
- authorised manual record/configuration for gaps.

Each imported fact must have provenance.

## 5. Provenance
For every imported/mapped fact record:
- source system/file;
- source reference/key;
- import job;
- timestamp;
- transformation/version;
- confidence/status only if factual and product-defined;
- evidence reference where available.

## 6. Historical evidence rule
If historical consent/notice delivery/processor evidence is not present, store:
- evidence_missing or unknown;
- source checked;
- remediation task if configured.

Never generate a historical consent timestamp or notice presentation record merely because a current account exists.

## 7. Historical purpose/processing mapping
Bulk mapping may assign records to a processing activity only when based on:
- reliable source-system metadata;
- customer-configured deterministic mapping;
- authorised confirmed mapping.

Machine suggestions, if ever used, must remain suggestions until confirmed and may not become legal fact automatically.

## 8. Scale
Imports must be asynchronous/batched and support:
- checkpoint/resume;
- deduplication/idempotency;
- error row isolation;
- partial success reporting;
- replay of failed batch;
- no all-record in-memory loading requirement;
- deterministic mapping version.

## 9. Duplicate person handling
Do not aggressively merge individuals based only on name/email similarity.

Use existing identity resolution rules if present. Otherwise preserve separate references until explicit deterministic matching/authorised merge criteria are available.

Every merge must be auditable and reversible where existing data model permits.

## 10. Backfill of regulatory mappings
Existing V1 controls/evidence may be linked to new ORVIA requirements only when mapping is explicit and reviewed. Do not automatically label an existing generic control as satisfying a DPDP requirement without mapping logic and evidence.

## 11. Current V1 consent/notices/rights migration
Where existing V1 already stores these:
- migrate references/versioning without losing history;
- preserve original IDs where technically practical;
- add new fields/relations using null/unknown where facts are absent;
- add tests proving prior API/UI behavior remains valid.

## 12. Processor migration
Existing vendor/processor records must be retained. New DPDP relationships are additive. Missing data-category/processing mappings remain unresolved, not auto-filled.

## 13. Incident migration
Existing incident records remain unchanged. Only incidents explicitly classified/linked as personal-data breaches receive the new breach-specific model/workflow.

## 14. Cutover verification
Before release:
- run schema integrity checks;
- compare pre/post record counts for preserved entities;
- run V1 regression suite;
- run new extension acceptance suite;
- verify no unexpected outbound vendor data flow was introduced;
- verify regulatory package source manifest/integrity;
- verify at least one representative end-to-end workflow in a clean customer environment and one upgraded existing-V1 environment.
