-- Deleting a login: a permanent suspension, not an erasure.
--
-- A deleted login can no longer be used or reactivated: its password and
-- authenticator are removed, its sessions end, it frees its member seat, and its
-- email address is released so the organisation can add that person again as a
-- new login. The identity row itself stays, because audit events, approvals and
-- decisions name it; erasing it would leave evidence pointing at nobody.
--
-- Who may delete what:
--   * an owner or administrator may delete MEMBER and AUDITOR logins of their
--     own organisation;
--   * a member, auditor or administrator may delete their own login;
--   * the owner (ORG_SUPER_ADMIN) may not delete their own login, because the
--     organisation would be left without an owner and this build has no
--     ownership transfer; nor may anyone delete an owner or administrator
--     through the member route.
-- The caller must pass the confirmation text 'DELETE' exactly; the database
-- checks it too, so no client can skip the confirmation.
ALTER TABLE staff_auth.authority
  ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid, ADD COLUMN deleted_email text,
  ADD CONSTRAINT deleted_is_inactive CHECK (deleted_at IS NULL OR NOT active);

CREATE FUNCTION app.staff_delete_login(p_id uuid, p_confirmation text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE a record; actor uuid; t uuid; le uuid; e uuid;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'DELETE' THEN RAISE EXCEPTION 'confirmation_required' USING ERRCODE = 'P0001', HINT = 'confirmation'; END IF;
  IF coalesce(current_setting('orvia.actor_domain', true), '') <> 'STAFF' OR coalesce(current_setting('orvia.actor_id', true), '') = '' THEN
    RAISE EXCEPTION 'staff_manage_forbidden' USING ERRCODE = '42501'; END IF;
  actor := current_setting('orvia.actor_id')::uuid;
  t := current_setting('orvia.tenant_id')::uuid; le := current_setting('orvia.legal_entity_id')::uuid; e := current_setting('orvia.environment_id')::uuid;
  PERFORM pg_advisory_xact_lock(hashtextextended('member-seats:' || t || ':' || le || ':' || e, 0));
  SELECT * INTO a FROM staff_auth.authority x WHERE x.user_id = p_id AND x.tenant_id = t AND x.legal_entity_id = le AND x.environment_id = e FOR UPDATE;
  IF a IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
  IF a.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'already_deleted' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  IF p_id = actor THEN
    -- Deleting one's own login.
    IF a.role = 'ORG_SUPER_ADMIN' THEN RAISE EXCEPTION 'owner_cannot_delete_own_login' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
    IF NOT app.has_capability('account.own.delete') THEN RAISE EXCEPTION 'staff_manage_forbidden' USING ERRCODE = '42501'; END IF;
  ELSE
    -- Deleting someone else's login: owner or administrator, members and auditors only.
    PERFORM app.staff_manager_check();
    IF a.role NOT IN ('MEMBER', 'AUDITOR') THEN RAISE EXCEPTION 'owner_and_administrator_are_managed_by_protected_setup' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  END IF;
  UPDATE staff_auth.authority SET active = false, must_change_password = false, deleted_at = clock_timestamp(), deleted_by = actor,
    deleted_email = (SELECT u.email FROM staff_auth."user" u WHERE u.id = p_id),
    deactivated_at = coalesce(deactivated_at, clock_timestamp()), deactivated_by = coalesce(deactivated_by, actor)
    WHERE user_id = p_id;
  DELETE FROM staff_auth.session WHERE "userId" = p_id;
  DELETE FROM staff_auth.account WHERE "userId" = p_id;
  DELETE FROM staff_auth."twoFactor" WHERE "userId" = p_id;
  -- Release the address for a future login while keeping the row (and its name) for the record.
  UPDATE staff_auth."user" SET email = 'deleted+' || p_id || '@deleted.invalid', "twoFactorEnabled" = false WHERE id = p_id;
END $$;

-- A deleted login is never reactivated.
CREATE OR REPLACE FUNCTION app.staff_member_set_active(p_id uuid, p_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE t uuid; le uuid; e uuid; a record;
BEGIN
  PERFORM app.staff_manager_check();
  t := current_setting('orvia.tenant_id')::uuid; le := current_setting('orvia.legal_entity_id')::uuid; e := current_setting('orvia.environment_id')::uuid;
  PERFORM pg_advisory_xact_lock(hashtextextended('member-seats:' || t || ':' || le || ':' || e, 0));
  SELECT * INTO a FROM staff_auth.authority x WHERE x.user_id = p_id AND x.tenant_id=t AND x.legal_entity_id=le AND x.environment_id=e FOR UPDATE;
  IF a IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
  IF a.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'login_deleted' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  IF a.role NOT IN ('MEMBER', 'AUDITOR') THEN RAISE EXCEPTION 'owner_and_administrator_are_managed_by_protected_setup' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  IF a.active = p_active THEN RAISE EXCEPTION '%', CASE WHEN p_active THEN 'already_active' ELSE 'already_inactive' END USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  IF p_active THEN
    PERFORM app.seat_available();
    UPDATE staff_auth.authority SET active = true, deactivated_by = NULL, deactivated_at = NULL WHERE user_id = p_id;
  ELSE
    UPDATE staff_auth.authority SET active = false, deactivated_by = current_setting('orvia.actor_id')::uuid, deactivated_at = clock_timestamp() WHERE user_id = p_id;
    DELETE FROM staff_auth.session WHERE "userId" = p_id;
  END IF;
END $$;

-- The team list shows deleted logins under the address they had.
DROP FUNCTION app.staff_member_list();
CREATE FUNCTION app.staff_member_list() RETURNS TABLE(id uuid, display_name text, email text, role text, active boolean, must_change_password boolean,
  authenticator_enrolled boolean, counts_against_seats boolean, created_by uuid, created_at timestamptz, deactivated_at timestamptz, deleted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
BEGIN
  PERFORM app.staff_manager_check();
  RETURN QUERY SELECT u.id, u.name, coalesce(a.deleted_email, u.email), a.role, a.active, a.must_change_password, coalesce(u."twoFactorEnabled", false),
      a.role IN ('MEMBER', 'AUDITOR'), a.created_by, a.created_at, a.deactivated_at, a.deleted_at
    FROM staff_auth.authority a JOIN staff_auth."user" u ON u.id = a.user_id
    WHERE a.tenant_id = current_setting('orvia.tenant_id')::uuid AND a.legal_entity_id = current_setting('orvia.legal_entity_id')::uuid
      AND a.environment_id = current_setting('orvia.environment_id')::uuid
    ORDER BY (a.deleted_at IS NOT NULL), CASE a.role WHEN 'ORG_SUPER_ADMIN' THEN 0 WHEN 'ORG_ADMIN' THEN 1 ELSE 2 END, a.created_at, u.id
    LIMIT 10100;
END $$;

REVOKE ALL ON FUNCTION app.staff_delete_login(uuid, text), app.staff_member_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.staff_delete_login(uuid, text), app.staff_member_list() TO orvia_app;
