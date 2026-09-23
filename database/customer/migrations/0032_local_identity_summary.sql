-- WP03 / WP34 / M29 Customer Onboarding, FR-M29-02.
--
-- A preflight gate has to answer whether this installation has a primary owner
-- under its own customer-controlled authentication. The application role cannot
-- read staff_auth, and should not be able to: that schema holds the identity
-- records, and widening a business role to see them so a gate can count to one
-- would be a far larger change than the requirement needs.
--
-- So the application gets exactly the two integers it needs and nothing else.
-- No user id, no email, no role assignment, no session -- two counts, scoped to
-- the caller's own organisation, from a view that runs with its owner's
-- privileges. This is the same shape as 0026's schema_revision, and for the
-- same reason: the narrowest possible disclosure that still answers the
-- question honestly.

CREATE VIEW app.local_identity_summary AS
 SELECT count(*)::integer AS active_identities,
        count(*) FILTER (WHERE role='ORG_SUPER_ADMIN')::integer AS active_primary_owners
 FROM staff_auth.authority
 WHERE active AND app.in_scope(tenant_id,legal_entity_id,environment_id);

GRANT SELECT ON app.local_identity_summary TO orvia_app;
REVOKE ALL ON app.local_identity_summary FROM PUBLIC;
