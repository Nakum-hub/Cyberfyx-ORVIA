-- The licence report counts members the same way the seat check does.
CREATE OR REPLACE VIEW app.local_identity_summary AS
 SELECT count(*)::integer AS active_identities,
        count(*) FILTER (WHERE role='ORG_SUPER_ADMIN')::integer AS active_primary_owners,
        count(*) FILTER (WHERE role IN ('MEMBER','AUDITOR'))::integer AS active_members
 FROM staff_auth.authority
 WHERE active AND app.in_scope(tenant_id,legal_entity_id,environment_id);
