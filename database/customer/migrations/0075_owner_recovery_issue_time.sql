-- 0074 took issued_at from the column default and expires_at from a later clock reading, so the two differed by more than
-- 30 minutes by a few microseconds and the table's "at most 30 minutes" check refused every issue (found by the owner-recovery
-- integration test before any release). Both times now come from one clock reading.
CREATE OR REPLACE FUNCTION app.owner_recovery_issue(p_email text, p_code_digest text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE u uuid; a record; issued timestamptz := clock_timestamp();
BEGIN
  PERFORM pg_advisory_xact_lock(728131);
  SELECT au.user_id, au.tenant_id, au.legal_entity_id, au.environment_id INTO a FROM staff_auth.authority au JOIN staff_auth."user" su ON su.id = au.user_id
    WHERE lower(su.email) = lower(p_email) AND au.role = 'ORG_SUPER_ADMIN' AND au.active;
  IF a IS NULL THEN RAISE EXCEPTION 'not_an_active_owner' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  u := a.user_id;
  INSERT INTO app.owner_recovery_codes(user_id, code_digest, issued_at, expires_at) VALUES (u, p_code_digest, issued, issued + interval '30 minutes')
    ON CONFLICT (user_id) DO UPDATE SET code_digest = EXCLUDED.code_digest, issued_at = EXCLUDED.issued_at, expires_at = EXCLUDED.expires_at, failed_attempts = 0, used_at = NULL;
  INSERT INTO app.audit_events(id, tenant_id, legal_entity_id, environment_id, actor_id, actor_domain, operation, resource_id, request_id)
    VALUES (gen_random_uuid(), a.tenant_id, a.legal_entity_id, a.environment_id, u, 'MACHINE', 'owner-recovery.code-issued-on-server', u, gen_random_uuid());
  RETURN u;
END $$;
REVOKE ALL ON FUNCTION app.owner_recovery_issue(text, text) FROM PUBLIC;
