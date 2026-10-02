-- Revision 1.13 (owner decisions 2026-10-02): vendor members' first password. An administrator adding a work email either
-- sets the password then, or issues a one-time setup code the member uses once to set it. Accounts live in this central
-- vendor service, so reinstalling the tool on a member's device never asks for a password again: the member signs in.
-- A setup code is single use, expires (72 hours by default), locks after five wrong attempts, and only its SHA-256 digest is
-- stored. Issuing a code to a member who already has a password is an administrator-initiated reset: on completion the
-- old password is replaced and every session of that member ends.
-- Uses 0101 so it cannot collide with the base lane's reserved 0018.
CREATE TABLE vendor.account_setup_codes (
  user_id uuid PRIMARY KEY REFERENCES vendor_auth."user"(id),
  code_digest text NOT NULL CHECK (code_digest ~ '^[a-f0-9]{64}$'),
  issued_by uuid NOT NULL, issued_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  CHECK (expires_at > issued_at));
ALTER TABLE vendor.account_setup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor.account_setup_codes FORCE ROW LEVEL SECURITY;

-- Who may give whom a password or a code: the super administrator anyone; an administrator anyone but super administrators
-- and other administrators (the same rule as creating them).
CREATE FUNCTION vendor.require_may_manage(p_actor uuid, p_user uuid) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE manager text := vendor.require_team_manager(p_actor); target text;
BEGIN
  SELECT role INTO target FROM vendor_auth.authority WHERE user_id = p_user AND deleted_at IS NULL;
  IF target IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  IF manager <> 'VENDOR_SUPER_ADMIN' AND target IN ('VENDOR_SUPER_ADMIN', 'VENDOR_ADMIN') THEN RAISE EXCEPTION 'role_not_assignable' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
END $$;

-- Create a member with no password yet; the setup code is issued in the same transaction.
CREATE FUNCTION vendor.create_member_pending(p_actor uuid, p_id uuid, p_name text, p_email text, p_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE manager text := vendor.require_team_manager(p_actor);
BEGIN
  IF p_role NOT IN ('VENDOR_ADMIN','LEAD_AUDITOR','AUDITOR','AUDIT_REVIEWER') THEN RAISE EXCEPTION 'role_not_assignable' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
  IF p_role = 'VENDOR_ADMIN' AND manager <> 'VENDOR_SUPER_ADMIN' THEN RAISE EXCEPTION 'role_not_assignable' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
  IF length(p_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001', HINT = 'name'; END IF;
  IF EXISTS (SELECT 1 FROM vendor_auth."user" WHERE lower(email) = lower(p_email)) THEN RAISE EXCEPTION 'email_in_use' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  INSERT INTO vendor_auth."user"(id, name, email) VALUES (p_id, p_name, lower(p_email));
  INSERT INTO vendor_auth.authority(user_id, role, must_change_password, created_by) VALUES (p_id, p_role, false, p_actor);
END $$;

CREATE FUNCTION vendor.issue_setup_code(p_actor uuid, p_user uuid, p_digest text, p_hours integer) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE expires timestamptz := clock_timestamp() + make_interval(hours => greatest(1, least(p_hours, 168)));
BEGIN
  PERFORM vendor.require_may_manage(p_actor, p_user);
  IF NOT EXISTS (SELECT 1 FROM vendor_auth.authority WHERE user_id = p_user AND active) THEN RAISE EXCEPTION 'member_inactive' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  INSERT INTO vendor.account_setup_codes(user_id, code_digest, issued_by, expires_at) VALUES (p_user, p_digest, p_actor, expires)
    ON CONFLICT (user_id) DO UPDATE SET code_digest = EXCLUDED.code_digest, issued_by = EXCLUDED.issued_by, issued_at = clock_timestamp(), expires_at = EXCLUDED.expires_at, failed_attempts = 0;
  RETURN expires;
END $$;

-- An administrator sets a member's password directly (at creation, or later instead of a code).
CREATE FUNCTION vendor.set_member_password(p_actor uuid, p_user uuid, p_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  PERFORM vendor.require_may_manage(p_actor, p_user);
  IF EXISTS (SELECT 1 FROM vendor_auth.account WHERE "userId" = p_user AND "providerId" = 'credential') THEN
    UPDATE vendor_auth.account SET password = p_hash, "updatedAt" = clock_timestamp() WHERE "userId" = p_user AND "providerId" = 'credential';
    DELETE FROM vendor_auth.session WHERE "userId" = p_user;
  ELSE
    INSERT INTO vendor_auth.account(id, "accountId", "providerId", "userId", password) VALUES (gen_random_uuid(), p_user, 'credential', p_user, p_hash);
  END IF;
  UPDATE vendor_auth.authority SET must_change_password = false WHERE user_id = p_user;
  DELETE FROM vendor.account_setup_codes WHERE user_id = p_user;
END $$;

-- The member's side, unauthenticated: email + code + new password. Returns false on a wrong code (counted) and never says
-- whether the email exists: an unknown email, a missing, expired or locked code are all the same refusal.
CREATE FUNCTION vendor.complete_account_setup(p_email text, p_digest text, p_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE u uuid; s record;
BEGIN
  SELECT a.user_id INTO u FROM vendor_auth."user" x JOIN vendor_auth.authority a ON a.user_id = x.id WHERE lower(x.email) = lower(p_email) AND a.active AND a.deleted_at IS NULL;
  IF u IS NULL THEN RETURN false; END IF;
  SELECT * INTO s FROM vendor.account_setup_codes WHERE user_id = u FOR UPDATE;
  IF s IS NULL OR s.failed_attempts >= 5 OR s.expires_at <= clock_timestamp() THEN RETURN false; END IF;
  IF s.code_digest IS DISTINCT FROM p_digest THEN UPDATE vendor.account_setup_codes SET failed_attempts = failed_attempts + 1 WHERE user_id = u; RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM vendor_auth.account WHERE "userId" = u AND "providerId" = 'credential') THEN
    UPDATE vendor_auth.account SET password = p_hash, "updatedAt" = clock_timestamp() WHERE "userId" = u AND "providerId" = 'credential';
    DELETE FROM vendor_auth.session WHERE "userId" = u;
  ELSE
    INSERT INTO vendor_auth.account(id, "accountId", "providerId", "userId", password) VALUES (gen_random_uuid(), u, 'credential', u, p_hash);
  END IF;
  UPDATE vendor_auth.authority SET must_change_password = false WHERE user_id = u;
  DELETE FROM vendor.account_setup_codes WHERE user_id = u;
  RETURN true;
END $$;

-- The team view gains whether a password exists and whether a setup code is outstanding.
CREATE FUNCTION vendor.team_password_state() RETURNS TABLE(user_id uuid, password_set boolean, setup_code_expires_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NOT vendor.has_capability('vendor.team.read') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT a.user_id, EXISTS (SELECT 1 FROM vendor_auth.account c WHERE c."userId" = a.user_id AND c."providerId" = 'credential' AND c.password IS NOT NULL),
    (SELECT k.expires_at FROM vendor.account_setup_codes k WHERE k.user_id = a.user_id) FROM vendor_auth.authority a;
END $$;

REVOKE ALL ON FUNCTION vendor.require_may_manage(uuid,uuid), vendor.create_member_pending(uuid,uuid,text,text,text), vendor.issue_setup_code(uuid,uuid,text,integer),
  vendor.set_member_password(uuid,uuid,text), vendor.complete_account_setup(text,text,text), vendor.team_password_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vendor.create_member_pending(uuid,uuid,text,text,text), vendor.issue_setup_code(uuid,uuid,text,integer),
  vendor.set_member_password(uuid,uuid,text), vendor.complete_account_setup(text,text,text), vendor.team_password_state() TO orvia_vendor_app;
