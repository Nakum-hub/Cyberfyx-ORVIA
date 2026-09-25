-- A catalog-observed dataset still needs an accountable processing map.
ALTER TABLE app.coverage_gaps DROP CONSTRAINT coverage_gaps_source_check;
ALTER TABLE app.coverage_gaps ADD CONSTRAINT coverage_gaps_source_check CHECK(source IN
 ('NO_RETENTION_BASIS','NEVER_OBSERVED','STALE_OBSERVATION','UNREVIEWED_INVENTORY',
  'UNRESOLVED_DESTINATION','FAILED_EXECUTION','CATALOG_SCHEMA_CHANGED',
  'CATALOG_READ_EXHAUSTED','NO_PROCESSING_MAP'));
