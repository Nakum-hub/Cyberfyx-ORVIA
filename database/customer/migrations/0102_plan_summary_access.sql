-- Revision 1.11 plan summary. Every staff member's interface shows which plan is in force and which features new work may
-- use, but the licence tables are licence.read only. These scope-bound owner functions answer exactly that, for the caller's
-- own scope (app.in_scope), and nothing else: no signature, no claims, no limits.
CREATE FUNCTION app.licence_entitlement_codes(p_licence_row uuid) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT coalesce(array_agg(e.code ORDER BY e.code), '{}') FROM app.licence_entitlements e
   WHERE app.in_scope(e.tenant_id, e.legal_entity_id, e.environment_id) AND e.licence_row_id = p_licence_row $$;
CREATE FUNCTION app.licence_row_edition(p_licence_row uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT l.edition FROM app.licences l WHERE app.in_scope(l.tenant_id, l.legal_entity_id, l.environment_id) AND l.id = p_licence_row $$;
REVOKE ALL ON FUNCTION app.licence_entitlement_codes(uuid), app.licence_row_edition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.licence_entitlement_codes(uuid), app.licence_row_edition(uuid) TO orvia_app;

-- The worker pauses scheduled premium work the licence in force does not cover (discovery, classification, AI monitoring).
GRANT EXECUTE ON FUNCTION app.effective_licence(uuid, uuid, uuid), app.licence_names_entitlement(uuid, text), app.licence_grace_days(text) TO orvia_worker;

-- Usage against the plan's limits, for the caller's own scope, whatever registry permissions the reader holds: counts only.
CREATE FUNCTION app.plan_usage() RETURNS TABLE(websites integer, connected_systems integer, member_seats integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT (SELECT count(*)::int FROM app.cmp_sites s WHERE app.in_scope(s.tenant_id, s.legal_entity_id, s.environment_id) AND s.state <> 'DISABLED'),
         (SELECT count(*)::int FROM app.connections x WHERE app.in_scope(x.tenant_id, x.legal_entity_id, x.environment_id)),
         (SELECT count(*)::int FROM staff_auth.authority a WHERE app.in_scope(a.tenant_id, a.legal_entity_id, a.environment_id) AND a.active AND a.role IN ('MEMBER', 'AUDITOR')) $$;
REVOKE ALL ON FUNCTION app.plan_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.plan_usage() TO orvia_app;
