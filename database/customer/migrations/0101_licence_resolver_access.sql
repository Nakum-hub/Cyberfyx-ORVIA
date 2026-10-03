-- Revision 1.11, follow-up to 0100. Every staff write now asks which licence is in force, but app.licences is readable only
-- with licence.read, so a member without that capability would have found no licence and been refused. The resolver runs as
-- its owner and answers only for the caller's own scope (app.in_scope), so it reveals nothing outside it. The import guard
-- likewise sees the whole scope history whatever the importer may read.
CREATE OR REPLACE FUNCTION app.effective_licence(p_tenant uuid, p_entity uuid, p_environment uuid)
RETURNS TABLE(id uuid, licence_id uuid, edition text, term text, trial boolean, sequence integer, valid_from timestamptz, valid_to timestamptz,
              grace_until timestamptz, lifecycle text, claims jsonb, fallback_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  WITH rows AS (
    SELECT l.*, l.valid_to + make_interval(days => app.licence_grace_days(l.term)) AS grace_until FROM app.licences l
     WHERE l.tenant_id = p_tenant AND l.legal_entity_id = p_entity AND l.environment_id = p_environment AND l.active
       AND app.in_scope(p_tenant, p_entity, p_environment)),
  paid AS (SELECT * FROM rows WHERE NOT trial AND valid_from <= clock_timestamp() ORDER BY coalesce(sequence, 0) DESC, imported_at DESC LIMIT 1),
  overlay AS (SELECT * FROM rows WHERE trial AND valid_from <= clock_timestamp() AND valid_to > clock_timestamp() ORDER BY sequence DESC LIMIT 1),
  chosen AS (SELECT o.*, (SELECT p.id FROM paid p) AS fallback_id FROM overlay o
             UNION ALL SELECT p.*, NULL::uuid FROM paid p WHERE NOT EXISTS (SELECT 1 FROM overlay))
  SELECT c.id, c.licence_id, c.edition, c.term, c.trial, c.sequence, c.valid_from, c.valid_to, c.grace_until,
         CASE WHEN clock_timestamp() < c.valid_to THEN 'ACTIVE' WHEN clock_timestamp() < c.grace_until THEN 'GRACE' ELSE 'EXPIRED' END,
         c.claims, c.fallback_id
    FROM chosen c LIMIT 1 $$;
REVOKE ALL ON FUNCTION app.effective_licence(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.effective_licence(uuid, uuid, uuid) TO orvia_app;
GRANT EXECUTE ON FUNCTION app.licence_grace_days(text) TO orvia_app;
ALTER FUNCTION app.licence_import_guard() SECURITY DEFINER;

-- Which entitlements the licence in force names, for the same scope-bound caller (licence_entitlements is licence.read only).
CREATE FUNCTION app.licence_names_entitlement(p_licence_row uuid, p_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT EXISTS (SELECT 1 FROM app.licence_entitlements e
    WHERE app.in_scope(e.tenant_id, e.legal_entity_id, e.environment_id) AND e.licence_row_id = p_licence_row AND e.code = p_code) $$;
REVOKE ALL ON FUNCTION app.licence_names_entitlement(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.licence_names_entitlement(uuid, text) TO orvia_app;
