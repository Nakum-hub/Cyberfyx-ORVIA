-- Customer-held owner recovery (OPEN-07; owner decision 2026-09-30: a protected server command).
-- Master §§7, 84 and "Version 1 invitation, delegation and ownership recovery": one accountable owner must not become an
-- unrecoverable single point of access failure; recovery is customer-held, never a vendor recovery key, a shared owner password
-- or a permanently active second owner; it is a protected, audited local transaction that keeps exactly one primary owner.
--
-- Someone with administrator access to the installation's server runs `pnpm run owner:recovery-code confirm:<profile> <owner
-- email>`. That issues a one-time code for the active owner only: valid 30 minutes, five wrong attempts lock it, a new issue
-- replaces it, and only its SHA-256 digest is kept. The owner then enters their email, the code and a new password on the
-- recovery page. In one transaction the password is replaced, the old authenticator is removed (a new one must be enrolled at
-- the next sign-in, as every privileged login requires), every existing session of that login ends, the code is spent, and the
-- act is recorded in the audit trail. The owner stays the owner; nobody else gains authority.
CREATE TABLE app.owner_recovery_codes (
  user_id uuid PRIMARY KEY REFERENCES staff_auth."user"(id),
  code_digest text NOT NULL CHECK (code_digest ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  used_at timestamptz,
  CHECK (expires_at > issued_at AND expires_at <= issued_at + interval '30 minutes'));
REVOKE ALL ON app.owner_recovery_codes FROM PUBLIC;

-- Issued only by the protected local command (the migration/operator connection), never through the application role.
CREATE FUNCTION app.owner_recovery_issue(p_email text, p_code_digest text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE u uuid; a record;
BEGIN
  PERFORM pg_advisory_xact_lock(728131);
  SELECT au.user_id, au.tenant_id, au.legal_entity_id, au.environment_id INTO a FROM staff_auth.authority au JOIN staff_auth."user" su ON su.id = au.user_id
    WHERE lower(su.email) = lower(p_email) AND au.role = 'ORG_SUPER_ADMIN' AND au.active;
  IF a IS NULL THEN RAISE EXCEPTION 'not_an_active_owner' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  u := a.user_id;
  INSERT INTO app.owner_recovery_codes(user_id, code_digest, expires_at) VALUES (u, p_code_digest, clock_timestamp() + interval '30 minutes')
    ON CONFLICT (user_id) DO UPDATE SET code_digest = EXCLUDED.code_digest, issued_at = clock_timestamp(), expires_at = EXCLUDED.expires_at, failed_attempts = 0, used_at = NULL;
  INSERT INTO app.audit_events(id, tenant_id, legal_entity_id, environment_id, actor_id, actor_domain, operation, resource_id, request_id)
    VALUES (gen_random_uuid(), a.tenant_id, a.legal_entity_id, a.environment_id, u, 'MACHINE', 'owner-recovery.code-issued-on-server', u, gen_random_uuid());
  RETURN u;
END $$;
REVOKE ALL ON FUNCTION app.owner_recovery_issue(text, text) FROM PUBLIC;

-- Completes recovery. Returns false for a wrong code, an unknown email or a login that is not an active owner, without saying
-- which; a wrong code for the owner is counted and committed by the caller.
CREATE FUNCTION app.owner_recovery_complete(p_email text, p_code_digest text, p_new_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE a record; c record;
BEGIN
  PERFORM pg_advisory_xact_lock(728131);
  SELECT au.user_id, au.tenant_id, au.legal_entity_id, au.environment_id INTO a FROM staff_auth.authority au JOIN staff_auth."user" su ON su.id = au.user_id
    WHERE lower(su.email) = lower(p_email) AND au.role = 'ORG_SUPER_ADMIN' AND au.active;
  IF a IS NULL THEN RETURN false; END IF;
  SELECT * INTO c FROM app.owner_recovery_codes WHERE user_id = a.user_id FOR UPDATE;
  IF c IS NULL OR c.used_at IS NOT NULL OR c.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'no_valid_recovery_code' USING ERRCODE = 'P0001', HINT = 'recovery_code'; END IF;
  IF c.failed_attempts >= 5 THEN RAISE EXCEPTION 'recovery_code_locked' USING ERRCODE = 'P0001', HINT = 'recovery_code'; END IF;
  IF c.code_digest IS DISTINCT FROM p_code_digest THEN
    UPDATE app.owner_recovery_codes SET failed_attempts = failed_attempts + 1 WHERE user_id = a.user_id;
    RETURN false;
  END IF;
  IF p_new_hash IS NULL OR length(p_new_hash) < 20 THEN RAISE EXCEPTION 'invalid_password_hash' USING ERRCODE = 'P0001', HINT = 'new_password'; END IF;
  UPDATE staff_auth.account SET password = p_new_hash, "updatedAt" = now() WHERE "userId" = a.user_id AND "providerId" = 'credential';
  DELETE FROM staff_auth."twoFactor" WHERE "userId" = a.user_id;
  UPDATE staff_auth."user" SET "twoFactorEnabled" = false WHERE id = a.user_id;
  DELETE FROM staff_auth.session WHERE "userId" = a.user_id;
  UPDATE app.owner_recovery_codes SET used_at = clock_timestamp() WHERE user_id = a.user_id;
  INSERT INTO app.audit_events(id, tenant_id, legal_entity_id, environment_id, actor_id, actor_domain, operation, resource_id, request_id)
    VALUES (gen_random_uuid(), a.tenant_id, a.legal_entity_id, a.environment_id, a.user_id, 'MACHINE', 'owner-recovery.completed', a.user_id, gen_random_uuid());
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION app.owner_recovery_complete(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.owner_recovery_complete(text, text, text) TO orvia_app;
