-- Organisation member logins, limited by the signed licence.
--
-- An installation starts with the owner (ORG_SUPER_ADMIN) and administrator
-- (ORG_ADMIN) created by the protected local setup. From the workspace, an owner
-- or administrator may now create member logins (MEMBER or AUDITOR) for their
-- own organisation scope, and deactivate or reactivate them. Administrator and
-- owner roles are still granted only by the protected setup; nothing here can
-- create or change one.
--
-- How many members may be active is a claim of the vendor-signed licence
-- (licensed_limits.member_seats). Owner and administrator logins are not counted.
-- The check runs inside the database, under a scope lock, against the active,
-- unexpired licence; with no licence, an expired one, or one that states no
-- member seats, no member can be created or reactivated. The application role
-- cannot touch staff_auth directly: it calls these functions, which check the
-- caller's scope, role and capability themselves.
--
-- A created login must change the one-time password at first sign-in before it
-- is given any authority (must_change_password), and then enrol an
-- authenticator as every staff login does.
ALTER TABLE staff_auth.authority
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN created_by uuid, ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  ADD COLUMN deactivated_by uuid, ADD COLUMN deactivated_at timestamptz;
-- The auth service clears the flag after a successful password change, and nothing else.
GRANT UPDATE(must_change_password) ON staff_auth.authority TO orvia_staff_auth;

CREATE FUNCTION app.staff_manager_check() RETURNS void LANGUAGE plpgsql STABLE SET search_path = pg_catalog, app AS $$
BEGIN
  IF coalesce(current_setting('orvia.actor_domain', true), '') <> 'STAFF'
     OR coalesce(current_setting('orvia.role', true), '') NOT IN ('ORG_SUPER_ADMIN', 'ORG_ADMIN')
     OR NOT app.has_capability('staff.manage')
     OR coalesce(current_setting('orvia.actor_id', true), '') = '' THEN
    RAISE EXCEPTION 'staff_manage_forbidden' USING ERRCODE = '42501';
  END IF;
END $$;

-- Seats for the caller's scope: what the active licence allows, and how many members are active.
CREATE FUNCTION app.member_seats() RETURNS TABLE(licence_state text, licensed integer, used integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE l record; t uuid; le uuid; e uuid;
BEGIN
  PERFORM app.staff_manager_check();
  t := current_setting('orvia.tenant_id')::uuid; le := current_setting('orvia.legal_entity_id')::uuid; e := current_setting('orvia.environment_id')::uuid;
  SELECT x.valid_to, x.claims INTO l FROM app.licences x WHERE x.tenant_id=t AND x.legal_entity_id=le AND x.environment_id=e AND x.active;
  used := (SELECT count(*)::integer FROM staff_auth.authority a WHERE a.tenant_id=t AND a.legal_entity_id=le AND a.environment_id=e AND a.active AND a.role IN ('MEMBER', 'AUDITOR'));
  IF l IS NULL THEN licence_state := 'NO_LICENCE'; licensed := NULL;
  ELSIF l.valid_to <= clock_timestamp() THEN licence_state := 'EXPIRED'; licensed := NULL;
  ELSIF l.claims->'licensed_limits'->'member_seats' IS NULL THEN licence_state := 'NO_MEMBER_SEATS'; licensed := NULL;
  ELSE licence_state := 'ACTIVE'; licensed := (l.claims->'licensed_limits'->>'member_seats')::integer; END IF;
  RETURN NEXT;
END $$;

CREATE FUNCTION app.seat_available() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM app.member_seats();
  IF s.licence_state <> 'ACTIVE' THEN RAISE EXCEPTION '%', lower(s.licence_state) USING ERRCODE = 'P0001', HINT = 'seat'; END IF;
  IF s.used >= s.licensed THEN RAISE EXCEPTION 'seat_limit_reached' USING ERRCODE = 'P0001', HINT = 'seat'; END IF;
END $$;

CREATE FUNCTION app.staff_member_create(p_id uuid, p_email text, p_name text, p_role text, p_password_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE t uuid; le uuid; e uuid;
BEGIN
  PERFORM app.staff_manager_check();
  IF p_role NOT IN ('MEMBER', 'AUDITOR') THEN RAISE EXCEPTION 'role_not_assignable' USING ERRCODE = 'P0001', HINT = 'role'; END IF;
  IF p_email !~ '^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,63}$' THEN RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  IF length(p_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001', HINT = 'display_name'; END IF;
  t := current_setting('orvia.tenant_id')::uuid; le := current_setting('orvia.legal_entity_id')::uuid; e := current_setting('orvia.environment_id')::uuid;
  -- One seat decision at a time per organisation scope.
  PERFORM pg_advisory_xact_lock(hashtextextended('member-seats:' || t || ':' || le || ':' || e, 0));
  PERFORM app.seat_available();
  IF EXISTS (SELECT 1 FROM staff_auth."user" u WHERE lower(u.email) = lower(p_email)) THEN RAISE EXCEPTION 'email_in_use' USING ERRCODE = 'P0001', HINT = 'email'; END IF;
  INSERT INTO staff_auth."user"(id, name, email, "emailVerified") VALUES (p_id, p_name, lower(p_email), false);
  INSERT INTO staff_auth.account(id, "accountId", "providerId", "userId", password) VALUES (gen_random_uuid(), p_id, 'credential', p_id, p_password_hash);
  INSERT INTO staff_auth.authority(user_id, tenant_id, legal_entity_id, environment_id, role, active, must_change_password, created_by)
    VALUES (p_id, t, le, e, p_role, true, true, current_setting('orvia.actor_id')::uuid);
END $$;

CREATE FUNCTION app.staff_member_set_active(p_id uuid, p_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE t uuid; le uuid; e uuid; a record;
BEGIN
  PERFORM app.staff_manager_check();
  t := current_setting('orvia.tenant_id')::uuid; le := current_setting('orvia.legal_entity_id')::uuid; e := current_setting('orvia.environment_id')::uuid;
  PERFORM pg_advisory_xact_lock(hashtextextended('member-seats:' || t || ':' || le || ':' || e, 0));
  SELECT * INTO a FROM staff_auth.authority x WHERE x.user_id = p_id AND x.tenant_id=t AND x.legal_entity_id=le AND x.environment_id=e FOR UPDATE;
  IF a IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
  IF a.role NOT IN ('MEMBER', 'AUDITOR') THEN RAISE EXCEPTION 'owner_and_administrator_are_managed_by_protected_setup' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  IF a.active = p_active THEN RAISE EXCEPTION '%', CASE WHEN p_active THEN 'already_active' ELSE 'already_inactive' END USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  IF p_active THEN
    PERFORM app.seat_available();
    UPDATE staff_auth.authority SET active = true, deactivated_by = NULL, deactivated_at = NULL WHERE user_id = p_id;
  ELSE
    UPDATE staff_auth.authority SET active = false, deactivated_by = current_setting('orvia.actor_id')::uuid, deactivated_at = clock_timestamp() WHERE user_id = p_id;
    -- A deactivated login keeps no live session.
    DELETE FROM staff_auth.session WHERE "userId" = p_id;
  END IF;
END $$;

CREATE FUNCTION app.staff_member_list() RETURNS TABLE(id uuid, display_name text, email text, role text, active boolean, must_change_password boolean,
  authenticator_enrolled boolean, counts_against_seats boolean, created_by uuid, created_at timestamptz, deactivated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
BEGIN
  PERFORM app.staff_manager_check();
  RETURN QUERY SELECT u.id, u.name, u.email, a.role, a.active, a.must_change_password, coalesce(u."twoFactorEnabled", false),
      a.role IN ('MEMBER', 'AUDITOR'), a.created_by, a.created_at, a.deactivated_at
    FROM staff_auth.authority a JOIN staff_auth."user" u ON u.id = a.user_id
    WHERE a.tenant_id = current_setting('orvia.tenant_id')::uuid AND a.legal_entity_id = current_setting('orvia.legal_entity_id')::uuid
      AND a.environment_id = current_setting('orvia.environment_id')::uuid
    ORDER BY CASE a.role WHEN 'ORG_SUPER_ADMIN' THEN 0 WHEN 'ORG_ADMIN' THEN 1 ELSE 2 END, a.created_at, u.id
    LIMIT 10100;
END $$;

REVOKE ALL ON FUNCTION app.staff_manager_check(), app.member_seats(), app.seat_available(), app.staff_member_create(uuid,text,text,text,text),
  app.staff_member_set_active(uuid,boolean), app.staff_member_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.staff_manager_check(), app.member_seats(), app.seat_available(), app.staff_member_create(uuid,text,text,text,text),
  app.staff_member_set_active(uuid,boolean), app.staff_member_list() TO orvia_app;
