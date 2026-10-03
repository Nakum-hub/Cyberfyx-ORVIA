-- Revision 1.11 automation quota: the plan summary also reports automated downstream actions issued this calendar month.
-- Counts only, for the caller's own scope (app.in_scope), whatever the reader may otherwise see.
DROP FUNCTION app.plan_usage();
CREATE FUNCTION app.plan_usage() RETURNS TABLE(websites integer, connected_systems integer, member_seats integer, automated_actions_per_month integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT (SELECT count(*)::int FROM app.cmp_sites s WHERE app.in_scope(s.tenant_id, s.legal_entity_id, s.environment_id) AND s.state <> 'DISABLED'),
         (SELECT count(*)::int FROM app.connections x WHERE app.in_scope(x.tenant_id, x.legal_entity_id, x.environment_id)),
         (SELECT count(*)::int FROM staff_auth.authority a WHERE app.in_scope(a.tenant_id, a.legal_entity_id, a.environment_id) AND a.active AND a.role IN ('MEMBER', 'AUDITOR')),
         (SELECT count(*)::int FROM app.agent_commands k WHERE app.in_scope(k.tenant_id, k.legal_entity_id, k.environment_id) AND k.created_at >= date_trunc('month', clock_timestamp())) $$;
REVOKE ALL ON FUNCTION app.plan_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.plan_usage() TO orvia_app;
