-- Base V1 capacity path. These indexes keep chronological, scoped reads and
-- keyset pages bounded as a customer organisation grows beyond a million
-- records. The scope prefix is also the RLS boundary; no global event scan is
-- needed for a single environment. Apply in a maintenance window on a large
-- existing installation because this migration is transactional.

CREATE INDEX consent_events_scope_time_id
  ON app.consent_events (tenant_id, legal_entity_id, environment_id, accepted_at DESC, id DESC);
CREATE INDEX audit_events_scope_time_id
  ON app.audit_events (tenant_id, legal_entity_id, environment_id, created_at DESC, id DESC);
CREATE INDEX rights_requests_scope_time_id
  ON app.rights_requests (tenant_id, legal_entity_id, environment_id, received_at DESC, id DESC);
CREATE INDEX coverage_gaps_scope_time_id
  ON app.coverage_gaps (tenant_id, legal_entity_id, environment_id, detected_at DESC, id DESC);
CREATE INDEX incidents_scope_time_id
  ON app.incidents (tenant_id, legal_entity_id, environment_id, detected_at DESC, id DESC);
