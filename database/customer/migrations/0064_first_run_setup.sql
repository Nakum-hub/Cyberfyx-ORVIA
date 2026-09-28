-- First-run setup of a customer installation.
--
-- The installer generates a one-time setup code and shows it only on the
-- installer's console and in a protected local file. Here only its SHA-256 digest
-- is kept. On first start, whoever holds the code opens the setup page and
-- creates the organisation, its owner (ORG_SUPER_ADMIN) and its administrator
-- (ORG_ADMIN), each with a password of their own choosing; both then enrol an
-- authenticator at first sign-in, as every privileged login does.
--
-- Guardrails: the code is single-use and expires; five wrong attempts lock it
-- (the installer must issue a new one); setup is refused once any owner exists
-- in the installation; everything happens in one transaction. The application
-- role reaches staff_auth only through app.first_run_complete().
CREATE TABLE app.installation_setup (
  singleton smallint PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  code_digest text NOT NULL CHECK (code_digest ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  used_at timestamptz,
  CHECK (expires_at > issued_at));
REVOKE ALL ON app.installation_setup FROM PUBLIC;

-- Whether setup is still open. Returns nothing about the code.
CREATE FUNCTION app.first_run_state() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM staff_auth.authority WHERE role = 'ORG_SUPER_ADMIN') THEN 'COMPLETED'
    WHEN NOT EXISTS (SELECT 1 FROM app.installation_setup) THEN 'NO_CODE_ISSUED'
    WHEN (SELECT used_at IS NOT NULL FROM app.installation_setup) THEN 'COMPLETED'
    WHEN (SELECT failed_attempts >= 5 FROM app.installation_setup) THEN 'LOCKED'
    WHEN (SELECT expires_at <= clock_timestamp() FROM app.installation_setup) THEN 'EXPIRED'
    ELSE 'OPEN' END $$;

CREATE FUNCTION app.first_run_complete(p_code_digest text, p_org text, p_owner_id uuid, p_owner_name text, p_owner_email text, p_owner_hash text,
  p_admin_id uuid, p_admin_name text, p_admin_email text, p_admin_hash text) RETURNS TABLE(tenant_id uuid, legal_entity_id uuid, environment_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE s record; t uuid := gen_random_uuid(); le uuid := gen_random_uuid(); e uuid := gen_random_uuid();
BEGIN
  PERFORM pg_advisory_xact_lock(728130);
  IF EXISTS (SELECT 1 FROM staff_auth.authority WHERE role = 'ORG_SUPER_ADMIN') THEN RAISE EXCEPTION 'setup_already_completed' USING ERRCODE = 'P0001', HINT = 'setup'; END IF;
  SELECT * INTO s FROM app.installation_setup FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'no_setup_code_issued' USING ERRCODE = 'P0001', HINT = 'code'; END IF;
  IF s.used_at IS NOT NULL THEN RAISE EXCEPTION 'setup_already_completed' USING ERRCODE = 'P0001', HINT = 'setup'; END IF;
  IF s.failed_attempts >= 5 THEN RAISE EXCEPTION 'setup_code_locked' USING ERRCODE = 'P0001', HINT = 'code'; END IF;
  IF s.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'setup_code_expired' USING ERRCODE = 'P0001', HINT = 'code'; END IF;
  IF s.code_digest IS DISTINCT FROM p_code_digest THEN
    -- Record the failure outside the refusal: the caller commits the counter before reporting it.
    UPDATE app.installation_setup SET failed_attempts = failed_attempts + 1;
    RETURN;
  END IF;
  IF length(p_org) NOT BETWEEN 2 AND 120 OR length(p_owner_name) NOT BETWEEN 1 AND 100 OR length(p_admin_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_names' USING ERRCODE = 'P0001', HINT = 'names'; END IF;
  IF lower(p_owner_email) = lower(p_admin_email) THEN RAISE EXCEPTION 'owner_and_admin_must_differ' USING ERRCODE = 'P0001', HINT = 'admin_email'; END IF;
  IF EXISTS (SELECT 1 FROM staff_auth."user" u WHERE lower(u.email) IN (lower(p_owner_email), lower(p_admin_email))) THEN RAISE EXCEPTION 'email_in_use' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  INSERT INTO app.organisations(id, name) VALUES (t, p_org);
  INSERT INTO app.legal_entities VALUES (t, le, p_org);
  INSERT INTO app.environments VALUES (t, le, e, 'Production');
  INSERT INTO staff_auth."user"(id, name, email, "emailVerified") VALUES (p_owner_id, p_owner_name, lower(p_owner_email), false), (p_admin_id, p_admin_name, lower(p_admin_email), false);
  INSERT INTO staff_auth.account(id, "accountId", "providerId", "userId", password) VALUES
    (gen_random_uuid(), p_owner_id, 'credential', p_owner_id, p_owner_hash), (gen_random_uuid(), p_admin_id, 'credential', p_admin_id, p_admin_hash);
  INSERT INTO staff_auth.authority(user_id, tenant_id, legal_entity_id, environment_id, role, active) VALUES
    (p_owner_id, t, le, e, 'ORG_SUPER_ADMIN', true), (p_admin_id, t, le, e, 'ORG_ADMIN', true);
  UPDATE app.installation_setup SET used_at = clock_timestamp();
  INSERT INTO app.audit_events(id, tenant_id, legal_entity_id, environment_id, actor_id, actor_domain, operation, resource_id, request_id)
    VALUES (gen_random_uuid(), t, le, e, p_owner_id, 'MACHINE', 'first-run.setup-completed', p_owner_id, gen_random_uuid());
  tenant_id := t; legal_entity_id := le; environment_id := e; RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION app.first_run_state(), app.first_run_complete(text,text,uuid,text,text,text,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.first_run_state(), app.first_run_complete(text,text,uuid,text,text,text,uuid,text,text,text) TO orvia_app;
