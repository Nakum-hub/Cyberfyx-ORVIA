-- Catalog observations can raise scoped, durable operational gaps. A worker may
-- insert or refresh only catalog-sourced gaps; staff retain accountable closure.
ALTER TABLE app.coverage_gaps DROP CONSTRAINT coverage_gaps_source_check;
ALTER TABLE app.coverage_gaps ADD CONSTRAINT coverage_gaps_source_check CHECK(source IN
 ('NO_RETENTION_BASIS','NEVER_OBSERVED','STALE_OBSERVATION','UNREVIEWED_INVENTORY',
  'UNRESOLVED_DESTINATION','FAILED_EXECUTION','CATALOG_SCHEMA_CHANGED','CATALOG_READ_EXHAUSTED'));
ALTER TABLE app.coverage_gaps DROP CONSTRAINT coverage_gaps_subject_kind_check;
ALTER TABLE app.coverage_gaps ADD CONSTRAINT coverage_gaps_subject_kind_check CHECK(subject_kind IN
 ('DATA_ASSET','RIGHTS_REQUEST','CATALOG_TARGET'));
ALTER TABLE app.coverage_gaps ADD CONSTRAINT catalog_gap_subject CHECK
 (source NOT IN ('CATALOG_SCHEMA_CHANGED','CATALOG_READ_EXHAUSTED') OR subject_kind='CATALOG_TARGET');

CREATE POLICY catalog_gap_worker_read ON app.coverage_gaps FOR SELECT USING
 (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute') AND source IN ('CATALOG_SCHEMA_CHANGED','CATALOG_READ_EXHAUSTED'));
CREATE POLICY catalog_gap_worker_insert ON app.coverage_gaps FOR INSERT WITH CHECK
 (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute') AND source IN ('CATALOG_SCHEMA_CHANGED','CATALOG_READ_EXHAUSTED')
  AND subject_kind='CATALOG_TARGET' AND state='OPEN');
CREATE POLICY catalog_gap_worker_update ON app.coverage_gaps FOR UPDATE USING
 (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute') AND source IN ('CATALOG_SCHEMA_CHANGED','CATALOG_READ_EXHAUSTED')
  AND state IN ('OPEN','IN_PROGRESS')) WITH CHECK
 (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND source IN ('CATALOG_SCHEMA_CHANGED','CATALOG_READ_EXHAUSTED'));
GRANT SELECT,INSERT,UPDATE ON app.coverage_gaps TO orvia_worker;
