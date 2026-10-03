-- Revision 1.13 (owner decisions 2026-10-02): the company website manages vendor accounts by calling this central vendor
-- service; the vendor service stays the only store of accounts. A provisioning client is created by a protected command on
-- the vendor server and shown once. Its secret is kept sealed under the installation's vault key (HMAC needs it); every
-- request is signed over the product name "ORVIA", method, path, timestamp, a single-use nonce and the body digest, so a
-- key issued for another product of the company can never act here, and a captured request cannot be replayed.
-- The website never handles a password: creating an account returns a one-time setup code; the person sets their own
-- password with the vendor service (rev 1.13 V2).
CREATE TABLE vendor.provisioning_clients (
  id uuid PRIMARY KEY, product text NOT NULL CHECK (product = 'ORVIA'),
  name text NOT NULL CHECK (name ~ '^[A-Za-z0-9 ._-]{2,60}$'),
  scopes text[] NOT NULL CHECK (cardinality(scopes) > 0 AND scopes <@ ARRAY['accounts.read','accounts.create.member','accounts.create.admin','accounts.create.super_admin','accounts.setup_code','accounts.deactivate']::text[]),
  secret_ciphertext bytea NOT NULL, secret_nonce bytea NOT NULL, secret_tag bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), revoked_at timestamptz);
CREATE TABLE vendor.provisioning_nonces (
  client_id uuid NOT NULL REFERENCES vendor.provisioning_clients(id), nonce text NOT NULL CHECK (nonce ~ '^[A-Za-z0-9_-]{16,64}$'),
  seen_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY (client_id, nonce));
ALTER TABLE vendor.provisioning_clients ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor.provisioning_clients FORCE ROW LEVEL SECURITY;
ALTER TABLE vendor.provisioning_nonces ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor.provisioning_nonces FORCE ROW LEVEL SECURITY;

-- The sealed secret of an active client, for signature verification by the application.
CREATE FUNCTION vendor.provisioning_client(p_client uuid) RETURNS TABLE(scopes text[], secret_ciphertext bytea, secret_nonce bytea, secret_tag bytea)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT scopes, secret_ciphertext, secret_nonce, secret_tag FROM vendor.provisioning_clients WHERE id = p_client AND revoked_at IS NULL $$;
-- A nonce is accepted once per client within the timestamp window; older nonces are pruned.
CREATE FUNCTION vendor.provisioning_accept_nonce(p_client uuid, p_nonce text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  DELETE FROM vendor.provisioning_nonces WHERE seen_at < clock_timestamp() - interval '15 minutes';
  INSERT INTO vendor.provisioning_nonces(client_id, nonce) VALUES (p_client, p_nonce) ON CONFLICT DO NOTHING;
  RETURN FOUND;
END $$;

CREATE FUNCTION vendor.provisioning_require(p_client uuid, p_scope text) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vendor.provisioning_clients WHERE id = p_client AND revoked_at IS NULL AND p_scope = ANY(scopes)) THEN
    RAISE EXCEPTION 'scope_not_granted' USING ERRCODE = 'P0001', HINT = 'scope'; END IF;
END $$;
CREATE FUNCTION vendor.provisioning_audit(p_client uuid, p_operation text, p_resource uuid, p_request uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  INSERT INTO vendor.audit_events(id, actor_id, actor_domain, operation, resource_id, request_id) VALUES (gen_random_uuid(), p_client, 'MACHINE', p_operation, p_resource, p_request) $$;

-- Accounts the website may see: vendor staff only (never client-organisation accounts).
CREATE FUNCTION vendor.provisioning_accounts(p_client uuid) RETURNS TABLE(user_id uuid, name text, email text, role text, active boolean, deleted boolean, password_set boolean, mfa_enrolled boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  PERFORM vendor.provisioning_require(p_client, 'accounts.read');
  RETURN QUERY SELECT a.user_id, u.name, u.email, a.role, a.active, a.deleted_at IS NOT NULL,
    EXISTS (SELECT 1 FROM vendor_auth.account c WHERE c."userId" = a.user_id AND c."providerId" = 'credential' AND c.password IS NOT NULL), u."twoFactorEnabled", a.created_at
    FROM vendor_auth.authority a JOIN vendor_auth."user" u ON u.id = a.user_id ORDER BY a.created_at, a.user_id;
END $$;

-- Create a vendor account with no password and its first setup code. A super administrator can be created only while none
-- exists (the website may complete first setup instead of the setup-code page); every other role needs its own scope.
CREATE FUNCTION vendor.provisioning_create_account(p_client uuid, p_id uuid, p_name text, p_email text, p_role text, p_digest text, p_hours integer) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE expires timestamptz := clock_timestamp() + make_interval(hours => greatest(1, least(p_hours, 168)));
BEGIN
  PERFORM pg_advisory_xact_lock(728131);
  IF p_role = 'VENDOR_SUPER_ADMIN' THEN
    PERFORM vendor.provisioning_require(p_client, 'accounts.create.super_admin');
    IF EXISTS (SELECT 1 FROM vendor_auth.authority WHERE role = 'VENDOR_SUPER_ADMIN' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'super_admin_exists' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
  ELSIF p_role = 'VENDOR_ADMIN' THEN PERFORM vendor.provisioning_require(p_client, 'accounts.create.admin');
  ELSIF p_role IN ('LEAD_AUDITOR','AUDITOR','AUDIT_REVIEWER') THEN PERFORM vendor.provisioning_require(p_client, 'accounts.create.member');
  ELSE RAISE EXCEPTION 'role_not_assignable' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
  IF length(p_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001', HINT = 'name'; END IF;
  IF EXISTS (SELECT 1 FROM vendor_auth."user" WHERE lower(email) = lower(p_email)) THEN RAISE EXCEPTION 'email_in_use' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  INSERT INTO vendor_auth."user"(id, name, email) VALUES (p_id, p_name, lower(p_email));
  INSERT INTO vendor_auth.authority(user_id, role, must_change_password, created_by) VALUES (p_id, p_role, false, NULL);
  INSERT INTO vendor.account_setup_codes(user_id, code_digest, issued_by, expires_at) VALUES (p_id, p_digest, p_client, expires);
  IF p_role = 'VENDOR_SUPER_ADMIN' THEN UPDATE vendor.installation_setup SET used_at = coalesce(used_at, clock_timestamp()); END IF;
  RETURN expires;
END $$;

CREATE FUNCTION vendor.provisioning_issue_code(p_client uuid, p_user uuid, p_digest text, p_hours integer) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE expires timestamptz := clock_timestamp() + make_interval(hours => greatest(1, least(p_hours, 168))); r text;
BEGIN
  PERFORM vendor.provisioning_require(p_client, 'accounts.setup_code');
  SELECT role INTO r FROM vendor_auth.authority WHERE user_id = p_user AND active AND deleted_at IS NULL;
  IF r IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  -- Resetting a super administrator or an administrator needs the scope that could create one.
  IF r = 'VENDOR_SUPER_ADMIN' THEN PERFORM vendor.provisioning_require(p_client, 'accounts.create.super_admin'); END IF;
  IF r = 'VENDOR_ADMIN' THEN PERFORM vendor.provisioning_require(p_client, 'accounts.create.admin'); END IF;
  INSERT INTO vendor.account_setup_codes(user_id, code_digest, issued_by, expires_at) VALUES (p_user, p_digest, p_client, expires)
    ON CONFLICT (user_id) DO UPDATE SET code_digest = EXCLUDED.code_digest, issued_by = EXCLUDED.issued_by, issued_at = clock_timestamp(), expires_at = EXCLUDED.expires_at, failed_attempts = 0;
  RETURN expires;
END $$;

CREATE FUNCTION vendor.provisioning_deactivate(p_client uuid, p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE r text;
BEGIN
  PERFORM vendor.provisioning_require(p_client, 'accounts.deactivate');
  SELECT role INTO r FROM vendor_auth.authority WHERE user_id = p_user AND deleted_at IS NULL;
  IF r IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  IF r = 'VENDOR_SUPER_ADMIN' THEN RAISE EXCEPTION 'super_admin_not_deactivated' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
  IF r = 'VENDOR_ADMIN' THEN PERFORM vendor.provisioning_require(p_client, 'accounts.create.admin'); END IF;
  UPDATE vendor_auth.authority SET active = false WHERE user_id = p_user;
  DELETE FROM vendor_auth.session WHERE "userId" = p_user;
  DELETE FROM vendor.account_setup_codes WHERE user_id = p_user;
END $$;

REVOKE ALL ON FUNCTION vendor.provisioning_client(uuid), vendor.provisioning_accept_nonce(uuid,text), vendor.provisioning_require(uuid,text), vendor.provisioning_audit(uuid,text,uuid,uuid),
  vendor.provisioning_accounts(uuid), vendor.provisioning_create_account(uuid,uuid,text,text,text,text,integer), vendor.provisioning_issue_code(uuid,uuid,text,integer), vendor.provisioning_deactivate(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vendor.provisioning_client(uuid), vendor.provisioning_accept_nonce(uuid,text), vendor.provisioning_audit(uuid,text,uuid,uuid),
  vendor.provisioning_accounts(uuid), vendor.provisioning_create_account(uuid,uuid,text,text,text,text,integer), vendor.provisioning_issue_code(uuid,uuid,text,integer), vendor.provisioning_deactivate(uuid,uuid) TO orvia_vendor_app;
