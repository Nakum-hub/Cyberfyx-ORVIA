-- Audit coverage (FR-M33-01) counts recorded events per operation. Without an index on the operation every category was a
-- full scan of the trail, which grows without bound; at a few hundred thousand events the report took about a second idle
-- and timed out under load. Scope prefix first (the RLS boundary), then operation, with created_at for first/last seen.
-- Transactional: apply in a maintenance window on a large existing installation.
CREATE INDEX audit_events_scope_operation_time
  ON app.audit_events (tenant_id, legal_entity_id, environment_id, operation, created_at);
