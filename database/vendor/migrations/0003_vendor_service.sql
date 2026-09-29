-- VENDOR_SERVICE installation (revision 1.5 addendum,
-- docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md).
--
-- The vendor's own ORVIA installation runs on this separate vendor database.
-- It holds no client organisation's operational data. It adds:
--   * the immutable installation kind record (VENDOR_SERVICE);
--   * vendor_auth: vendor staff logins (VENDOR_SUPER_ADMIN, VENDOR_ADMIN,
--     LEAD_AUDITOR, AUDITOR, AUDIT_REVIEWER), MFA mandatory;
--   * account_auth: client organisations' vendor-account logins, used only to
--     upload audit evidence packages against an engagement code;
--   * first-run setup by one-time code, request audit, audit events and
--     idempotency records.
-- Roles orvia_vendor_app (business, row-level security) and orvia_vendor_auth
-- (library identity tables) are created by the protected installer beforehand.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR NOT EXISTS (SELECT 1 FROM vendor.installation WHERE singleton = 1 AND boundary = 'VENDOR_COMMERCIAL_ONLY')
  THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orvia_vendor_app') OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orvia_vendor_auth')
  THEN RAISE EXCEPTION 'Vendor roles must be created by the installer first' USING ERRCODE = '42501'; END IF;
END $$;

-- Installation kind: written once, never changed.
CREATE TABLE vendor.installation_identity (
  singleton smallint PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  kind text NOT NULL CHECK (kind = 'VENDOR_SERVICE'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
INSERT INTO vendor.installation_identity(kind) VALUES ('VENDOR_SERVICE');
CREATE FUNCTION vendor.immutable_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable_vendor_record' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER installation_identity_immutable BEFORE UPDATE OR DELETE ON vendor.installation_identity FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER installation_identity_no_truncate BEFORE TRUNCATE ON vendor.installation_identity FOR EACH STATEMENT EXECUTE FUNCTION vendor.immutable_row();
CREATE FUNCTION vendor.installation_kind() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT kind FROM vendor.installation_identity WHERE singleton = 1 $$;

-- Identity stores: the same library tables as staff_auth, in two disjoint schemas.
CREATE SCHEMA vendor_auth;
CREATE SCHEMA account_auth;
DO $$
DECLARE domain text;
BEGIN
  FOREACH domain IN ARRAY ARRAY['vendor_auth','account_auth'] LOOP
    EXECUTE format('CREATE TABLE %I."user" (
      id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      "emailVerified" boolean NOT NULL DEFAULT false, image text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "twoFactorEnabled" boolean NOT NULL DEFAULT false)', domain);
    EXECUTE format('CREATE TABLE %I.session (
      id uuid PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "ipAddress" text, "userAgent" text, "userId" uuid NOT NULL REFERENCES %I."user"(id) ON DELETE CASCADE)', domain, domain);
    EXECUTE format('CREATE INDEX ON %I.session ("userId")', domain);
    EXECUTE format('CREATE TABLE %I.account (
      id uuid PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
      "userId" uuid NOT NULL REFERENCES %I."user"(id) ON DELETE CASCADE,
      "accessToken" text, "refreshToken" text, "idToken" text,
      "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("providerId", "accountId"))', domain, domain);
    EXECUTE format('CREATE INDEX ON %I.account ("userId")', domain);
    EXECUTE format('CREATE TABLE %I.verification (
      id uuid PRIMARY KEY, identifier text NOT NULL UNIQUE, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())', domain);
    EXECUTE format('CREATE TABLE %I."twoFactor" (
      id uuid PRIMARY KEY, secret text NOT NULL, "backupCodes" text NOT NULL,
      "userId" uuid NOT NULL UNIQUE REFERENCES %I."user"(id) ON DELETE CASCADE,
      verified boolean NOT NULL DEFAULT false, "failedVerificationCount" integer NOT NULL DEFAULT 0,
      "lockedUntil" timestamptz)', domain, domain);
    EXECUTE format('CREATE TABLE %I."rateLimit" (
      id uuid PRIMARY KEY, key text NOT NULL UNIQUE, count integer NOT NULL, "lastRequest" bigint NOT NULL)', domain);
    EXECUTE format('CREATE TABLE %I.auth_audit (
      id uuid PRIMARY KEY, request_id uuid NOT NULL, operation text NOT NULL,
      status integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now())', domain);
    EXECUTE format('CREATE TABLE %I.mfa_sessions (
      session_id uuid PRIMARY KEY REFERENCES %I.session(id) ON DELETE CASCADE,
      verified_at timestamptz NOT NULL DEFAULT now())', domain, domain);
  END LOOP;
END $$;

-- Client organisations known to the vendor (Rev 1.4 §96: business details and designated contacts only).
CREATE TABLE vendor.organisations (
  id uuid PRIMARY KEY, name text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  registered_address text CHECK (registered_address IS NULL OR length(registered_address) <= 400),
  licence_state text NOT NULL DEFAULT 'NONE' CHECK (licence_state IN ('NONE','ACTIVE','EXPIRED','SUSPENDED')),
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE (name));
CREATE TABLE vendor.organisation_contacts (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES vendor.organisations(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100), email text NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+$' AND length(email) <= 254),
  designation text NOT NULL CHECK (designation IN ('PRIMARY','BILLING','SECURITY','DPO','AUDIT_LIAISON')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE (organisation_id, email, designation));

CREATE TABLE vendor_auth.authority (
  user_id uuid PRIMARY KEY REFERENCES vendor_auth."user"(id),
  role text NOT NULL CHECK (role IN ('VENDOR_SUPER_ADMIN','VENDOR_ADMIN','LEAD_AUDITOR','AUDITOR','AUDIT_REVIEWER')),
  active boolean NOT NULL DEFAULT true, must_change_password boolean NOT NULL DEFAULT false,
  deleted_at timestamptz, created_by uuid, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (deleted_at IS NULL OR NOT active));
CREATE TABLE account_auth.authority (
  user_id uuid PRIMARY KEY REFERENCES account_auth."user"(id),
  organisation_id uuid NOT NULL REFERENCES vendor.organisations(id),
  active boolean NOT NULL DEFAULT true, must_change_password boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp());

-- Request audit, audit events and idempotency for the vendor installation.
CREATE TABLE vendor.request_audit (id uuid PRIMARY KEY, operation text NOT NULL, status integer NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE vendor.audit_events (
  id uuid PRIMARY KEY, actor_id uuid NOT NULL, actor_domain text NOT NULL CHECK (actor_domain IN ('VENDOR_STAFF','CLIENT_ACCOUNT','MACHINE')),
  operation text NOT NULL CHECK (length(operation) BETWEEN 1 AND 120), resource_id uuid, request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX audit_events_resource ON vendor.audit_events(resource_id, created_at);
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON vendor.audit_events FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TABLE vendor.idempotency_records (
  actor_id uuid NOT NULL, operation text NOT NULL, key text NOT NULL CHECK (length(key) BETWEEN 16 AND 128),
  digest text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (actor_id, operation, key));

-- Transaction-local context set by the server after authentication.
CREATE FUNCTION vendor.actor() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('vendor.actor_id', true), '')::uuid $$;
CREATE FUNCTION vendor.actor_domain() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('vendor.actor_domain', true), '') $$;
CREATE FUNCTION vendor.has_capability(c text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT vendor.actor_domain() = 'VENDOR_STAFF' AND c = ANY(string_to_array(current_setting('vendor.capabilities', true), ',')) $$;
CREATE FUNCTION vendor.account_organisation() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN vendor.actor_domain() = 'CLIENT_ACCOUNT' THEN nullif(current_setting('vendor.organisation_id', true), '')::uuid END $$;

ALTER TABLE vendor.organisations ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor.organisations FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON vendor.organisations FOR SELECT USING (vendor.has_capability('organisations.read') OR id = vendor.account_organisation());
CREATE POLICY staff_write ON vendor.organisations FOR INSERT WITH CHECK (vendor.has_capability('organisations.manage') AND created_by = vendor.actor());
CREATE POLICY staff_update ON vendor.organisations FOR UPDATE USING (vendor.has_capability('organisations.manage')) WITH CHECK (vendor.has_capability('organisations.manage'));
ALTER TABLE vendor.organisation_contacts ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor.organisation_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON vendor.organisation_contacts FOR SELECT USING (vendor.has_capability('organisations.read'));
CREATE POLICY staff_write ON vendor.organisation_contacts FOR INSERT WITH CHECK (vendor.has_capability('organisations.manage'));
ALTER TABLE vendor.audit_events ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY own_insert ON vendor.audit_events FOR INSERT WITH CHECK (actor_id = vendor.actor() AND actor_domain = vendor.actor_domain());
CREATE POLICY staff_read ON vendor.audit_events FOR SELECT USING (vendor.has_capability('vendor.audit.read'));
ALTER TABLE vendor.idempotency_records ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor.idempotency_records FORCE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON vendor.idempotency_records FOR ALL USING (actor_id = vendor.actor()) WITH CHECK (actor_id = vendor.actor());

-- First-run setup of the vendor installation: same one-time-code flow as a customer installation.
CREATE TABLE vendor.installation_setup (
  singleton smallint PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  code_digest text NOT NULL CHECK (code_digest ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5), used_at timestamptz,
  CHECK (expires_at > issued_at));
CREATE FUNCTION vendor.first_run_state() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM vendor_auth.authority WHERE role = 'VENDOR_SUPER_ADMIN') THEN 'COMPLETED'
    WHEN NOT EXISTS (SELECT 1 FROM vendor.installation_setup) THEN 'NO_CODE_ISSUED'
    WHEN (SELECT used_at IS NOT NULL FROM vendor.installation_setup) THEN 'COMPLETED'
    WHEN (SELECT failed_attempts >= 5 FROM vendor.installation_setup) THEN 'LOCKED'
    WHEN (SELECT expires_at <= clock_timestamp() FROM vendor.installation_setup) THEN 'EXPIRED'
    ELSE 'OPEN' END $$;
CREATE FUNCTION vendor.first_run_complete(p_code_digest text, p_owner_id uuid, p_owner_name text, p_owner_email text, p_owner_hash text,
  p_admin_id uuid, p_admin_name text, p_admin_email text, p_admin_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE s record;
BEGIN
  PERFORM pg_advisory_xact_lock(728131);
  IF EXISTS (SELECT 1 FROM vendor_auth.authority WHERE role = 'VENDOR_SUPER_ADMIN') THEN RAISE EXCEPTION 'setup_already_completed' USING ERRCODE = 'P0001', HINT = 'setup'; END IF;
  SELECT * INTO s FROM vendor.installation_setup FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'no_setup_code_issued' USING ERRCODE = 'P0001', HINT = 'code'; END IF;
  IF s.used_at IS NOT NULL THEN RAISE EXCEPTION 'setup_already_completed' USING ERRCODE = 'P0001', HINT = 'setup'; END IF;
  IF s.failed_attempts >= 5 THEN RAISE EXCEPTION 'setup_code_locked' USING ERRCODE = 'P0001', HINT = 'code'; END IF;
  IF s.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'setup_code_expired' USING ERRCODE = 'P0001', HINT = 'code'; END IF;
  IF s.code_digest IS DISTINCT FROM p_code_digest THEN
    UPDATE vendor.installation_setup SET failed_attempts = failed_attempts + 1;
    RETURN false;
  END IF;
  IF length(p_owner_name) NOT BETWEEN 1 AND 100 OR length(p_admin_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_names' USING ERRCODE = 'P0001', HINT = 'names'; END IF;
  IF lower(p_owner_email) = lower(p_admin_email) THEN RAISE EXCEPTION 'owner_and_admin_must_differ' USING ERRCODE = 'P0001', HINT = 'admin_email'; END IF;
  IF EXISTS (SELECT 1 FROM vendor_auth."user" u WHERE lower(u.email) IN (lower(p_owner_email), lower(p_admin_email))) THEN RAISE EXCEPTION 'email_in_use' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  INSERT INTO vendor_auth."user"(id, name, email) VALUES (p_owner_id, p_owner_name, lower(p_owner_email)), (p_admin_id, p_admin_name, lower(p_admin_email));
  INSERT INTO vendor_auth.account(id, "accountId", "providerId", "userId", password) VALUES
    (gen_random_uuid(), p_owner_id, 'credential', p_owner_id, p_owner_hash), (gen_random_uuid(), p_admin_id, 'credential', p_admin_id, p_admin_hash);
  INSERT INTO vendor_auth.authority(user_id, role, created_by) VALUES (p_owner_id, 'VENDOR_SUPER_ADMIN', p_owner_id), (p_admin_id, 'VENDOR_ADMIN', p_owner_id);
  UPDATE vendor.installation_setup SET used_at = clock_timestamp();
  INSERT INTO vendor.audit_events(id, actor_id, actor_domain, operation, resource_id, request_id) VALUES (gen_random_uuid(), p_owner_id, 'MACHINE', 'vendor.first-run.setup-completed', p_owner_id, gen_random_uuid());
  RETURN true;
END $$;

-- Vendor team management. Only VENDOR_SUPER_ADMIN and VENDOR_ADMIN manage members;
-- an administrator cannot create, change or delete a super administrator; nobody
-- deletes their own login here, and the last super administrator is never removed.
CREATE FUNCTION vendor.require_team_manager(p_actor uuid) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE r text;
BEGIN
  IF p_actor IS DISTINCT FROM vendor.actor() OR NOT vendor.has_capability('vendor.team.manage') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT role INTO r FROM vendor_auth.authority WHERE user_id = p_actor AND active;
  IF r IS NULL OR r NOT IN ('VENDOR_SUPER_ADMIN','VENDOR_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN r;
END $$;
CREATE FUNCTION vendor.team() RETURNS TABLE(user_id uuid, name text, email text, role text, active boolean, deleted boolean, mfa_enrolled boolean, must_change_password boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NOT vendor.has_capability('vendor.team.read') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT a.user_id, u.name, u.email, a.role, a.active, a.deleted_at IS NOT NULL, u."twoFactorEnabled", a.must_change_password, a.created_at
    FROM vendor_auth.authority a JOIN vendor_auth."user" u ON u.id = a.user_id ORDER BY a.created_at, a.user_id;
END $$;
CREATE FUNCTION vendor.create_member(p_actor uuid, p_id uuid, p_name text, p_email text, p_role text, p_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE manager text := vendor.require_team_manager(p_actor);
BEGIN
  IF p_role NOT IN ('VENDOR_ADMIN','LEAD_AUDITOR','AUDITOR','AUDIT_REVIEWER') THEN RAISE EXCEPTION 'role_not_assignable' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
  IF p_role = 'VENDOR_ADMIN' AND manager <> 'VENDOR_SUPER_ADMIN' THEN RAISE EXCEPTION 'role_not_assignable' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
  IF length(p_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001', HINT = 'name'; END IF;
  IF EXISTS (SELECT 1 FROM vendor_auth."user" WHERE lower(email) = lower(p_email)) THEN RAISE EXCEPTION 'email_in_use' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  INSERT INTO vendor_auth."user"(id, name, email) VALUES (p_id, p_name, lower(p_email));
  INSERT INTO vendor_auth.account(id, "accountId", "providerId", "userId", password) VALUES (gen_random_uuid(), p_id, 'credential', p_id, p_hash);
  INSERT INTO vendor_auth.authority(user_id, role, must_change_password, created_by) VALUES (p_id, p_role, true, p_actor);
END $$;
CREATE FUNCTION vendor.set_member_active(p_actor uuid, p_id uuid, p_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE manager text := vendor.require_team_manager(p_actor); target record;
BEGIN
  SELECT * INTO target FROM vendor_auth.authority WHERE user_id = p_id FOR UPDATE;
  IF target IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_id = p_actor THEN RAISE EXCEPTION 'cannot_change_own_login' USING ERRCODE = 'P0001', HINT = 'member'; END IF;
  IF target.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'login_deleted' USING ERRCODE = 'P0001', HINT = 'member'; END IF;
  IF target.role IN ('VENDOR_SUPER_ADMIN') OR (target.role = 'VENDOR_ADMIN' AND manager <> 'VENDOR_SUPER_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE vendor_auth.authority SET active = p_active WHERE user_id = p_id;
  IF NOT p_active THEN DELETE FROM vendor_auth.session WHERE "userId" = p_id; END IF;
END $$;
CREATE FUNCTION vendor.delete_member(p_actor uuid, p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE manager text := vendor.require_team_manager(p_actor); target record;
BEGIN
  SELECT * INTO target FROM vendor_auth.authority WHERE user_id = p_id FOR UPDATE;
  IF target IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_id = p_actor THEN RAISE EXCEPTION 'cannot_change_own_login' USING ERRCODE = 'P0001', HINT = 'member'; END IF;
  IF target.role = 'VENDOR_SUPER_ADMIN' OR (target.role = 'VENDOR_ADMIN' AND manager <> 'VENDOR_SUPER_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  -- Permanent: the login can never sign in again; history that names it is kept.
  UPDATE vendor_auth.authority SET active = false, deleted_at = coalesce(deleted_at, clock_timestamp()) WHERE user_id = p_id;
  DELETE FROM vendor_auth.session WHERE "userId" = p_id;
  DELETE FROM vendor_auth.account WHERE "userId" = p_id;
END $$;

-- Client vendor-account logins, created by vendor administrators for an organisation's designated contacts.
CREATE FUNCTION vendor.create_client_account(p_actor uuid, p_id uuid, p_organisation uuid, p_name text, p_email text, p_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF p_actor IS DISTINCT FROM vendor.actor() OR NOT vendor.has_capability('organisations.manage') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM vendor.organisations WHERE id = p_organisation) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF EXISTS (SELECT 1 FROM account_auth."user" WHERE lower(email) = lower(p_email)) THEN RAISE EXCEPTION 'email_in_use' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  INSERT INTO account_auth."user"(id, name, email) VALUES (p_id, p_name, lower(p_email));
  INSERT INTO account_auth.account(id, "accountId", "providerId", "userId", password) VALUES (gen_random_uuid(), p_id, 'credential', p_id, p_hash);
  INSERT INTO account_auth.authority(user_id, organisation_id, created_by) VALUES (p_id, p_organisation, p_actor);
END $$;
CREATE FUNCTION vendor.client_accounts(p_organisation uuid) RETURNS TABLE(user_id uuid, name text, email text, active boolean, mfa_enrolled boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NOT vendor.has_capability('organisations.read') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT a.user_id, u.name, u.email, a.active, u."twoFactorEnabled", a.created_at FROM account_auth.authority a JOIN account_auth."user" u ON u.id = a.user_id
    WHERE a.organisation_id = p_organisation ORDER BY a.created_at, a.user_id;
END $$;

-- Grants. The business role reaches identity tables only through the functions above.
REVOKE ALL ON ALL TABLES IN SCHEMA vendor, vendor_auth, account_auth FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA vendor FROM PUBLIC;
GRANT USAGE ON SCHEMA vendor TO orvia_vendor_app, orvia_vendor_auth;
GRANT USAGE ON SCHEMA vendor_auth, account_auth TO orvia_vendor_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA vendor_auth, account_auth TO orvia_vendor_auth;
REVOKE INSERT, UPDATE, DELETE ON vendor_auth.authority, account_auth.authority FROM orvia_vendor_auth;
GRANT UPDATE (must_change_password) ON vendor_auth.authority, account_auth.authority TO orvia_vendor_auth;
GRANT SELECT, INSERT, UPDATE ON vendor.organisations TO orvia_vendor_app;
GRANT SELECT, INSERT ON vendor.organisation_contacts, vendor.audit_events TO orvia_vendor_app;
GRANT SELECT, INSERT ON vendor.idempotency_records TO orvia_vendor_app;
GRANT INSERT ON vendor.request_audit TO orvia_vendor_app;
GRANT EXECUTE ON FUNCTION vendor.installation_kind(), vendor.first_run_state(), vendor.first_run_complete(text,uuid,text,text,text,uuid,text,text,text),
  vendor.actor(), vendor.actor_domain(), vendor.has_capability(text), vendor.account_organisation(),
  vendor.team(), vendor.create_member(uuid,uuid,text,text,text,text), vendor.set_member_active(uuid,uuid,boolean), vendor.delete_member(uuid,uuid),
  vendor.create_client_account(uuid,uuid,uuid,text,text,text), vendor.client_accounts(uuid) TO orvia_vendor_app;
GRANT EXECUTE ON FUNCTION vendor.require_team_manager(uuid) TO orvia_vendor_app;
