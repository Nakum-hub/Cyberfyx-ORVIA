-- Revision 1.13: the licence of the company's own vendor service, separate from customer licences (different audience,
-- signing key and table; see shared/contracts/src/vendor-service-licence.ts). It limits active vendor member logins. The
-- signature, audience and installation are verified by the application against the trusted public key before this table
-- sees the licence; the database keeps every imported licence immutably, refuses an older sequence, and enforces the seat
-- limit on every path that creates or reactivates a member (the super administrator and administrators are not counted).
-- With no licence imported, seats are not limited and the state says so; the readiness check reports it.
CREATE TABLE vendor.service_licences (
  id uuid PRIMARY KEY, licence_id uuid NOT NULL UNIQUE, installation_id uuid NOT NULL,
  valid_from timestamptz NOT NULL, valid_to timestamptz NOT NULL, sequence integer NOT NULL UNIQUE CHECK (sequence >= 1),
  member_seats integer NOT NULL CHECK (member_seats BETWEEN 0 AND 10000),
  claims jsonb NOT NULL, signing_key_id text NOT NULL, signature text NOT NULL,
  imported_by uuid NOT NULL, imported_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK (valid_to > valid_from));
CREATE TRIGGER service_licences_immutable BEFORE UPDATE OR DELETE ON vendor.service_licences FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
ALTER TABLE vendor.service_licences ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor.service_licences FORCE ROW LEVEL SECURITY;

-- The licence in force: the highest sequence whose window has started.
CREATE FUNCTION vendor.service_licence_in_force() RETURNS TABLE(licence_id uuid, sequence integer, valid_to timestamptz, member_seats integer, expired boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT licence_id, sequence, valid_to, member_seats, valid_to <= clock_timestamp() FROM vendor.service_licences
   WHERE valid_from <= clock_timestamp() ORDER BY sequence DESC LIMIT 1 $$;

CREATE FUNCTION vendor.active_member_logins(p_except uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT count(*)::int FROM vendor_auth.authority WHERE active AND deleted_at IS NULL AND role IN ('LEAD_AUDITOR','AUDITOR','AUDIT_REVIEWER') AND user_id IS DISTINCT FROM p_except $$;

-- Seats: enforced on every insert or reactivation of a member role, whichever function does it. An expired licence allows
-- no new or reactivated member (existing logins keep working); no licence imported means no limit.
CREATE FUNCTION vendor.service_seat_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE l record;
BEGIN
  IF NOT (NEW.active AND NEW.deleted_at IS NULL AND NEW.role IN ('LEAD_AUDITOR','AUDITOR','AUDIT_REVIEWER')) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.active AND OLD.role IN ('LEAD_AUDITOR','AUDITOR','AUDIT_REVIEWER') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(728140);
  SELECT * INTO l FROM vendor.service_licence_in_force();
  IF l IS NULL THEN RETURN NEW; END IF;
  IF l.expired THEN RAISE EXCEPTION 'vendor_licence_expired' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  IF vendor.active_member_logins(NEW.user_id) >= l.member_seats THEN RAISE EXCEPTION 'vendor_seat_limit_reached' USING ERRCODE = 'P0001', HINT = 'seats'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER service_seat_guard BEFORE INSERT OR UPDATE OF active, role ON vendor_auth.authority FOR EACH ROW EXECUTE FUNCTION vendor.service_seat_guard();

-- Import (after the application verified the signature): super administrator only, this installation only, newer sequence.
CREATE FUNCTION vendor.import_service_licence(p_actor uuid, p_id uuid, p_installation uuid, p_claims jsonb, p_key text, p_signature text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE top integer;
BEGIN
  IF p_actor IS DISTINCT FROM vendor.actor() OR NOT EXISTS (SELECT 1 FROM vendor_auth.authority WHERE user_id = p_actor AND active AND role = 'VENDOR_SUPER_ADMIN') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF (p_claims->>'installation_id')::uuid IS DISTINCT FROM p_installation THEN RAISE EXCEPTION 'wrong_installation' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  IF (p_claims->>'valid_to')::timestamptz <= clock_timestamp() THEN RAISE EXCEPTION 'expired' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  SELECT max(sequence) INTO top FROM vendor.service_licences;
  IF top IS NOT NULL AND (p_claims->>'sequence')::int <= top THEN RAISE EXCEPTION 'stale_sequence' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  IF EXISTS (SELECT 1 FROM vendor.service_licences WHERE licence_id = (p_claims->>'licence_id')::uuid) THEN RAISE EXCEPTION 'replayed' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  INSERT INTO vendor.service_licences(id, licence_id, installation_id, valid_from, valid_to, sequence, member_seats, claims, signing_key_id, signature, imported_by)
    VALUES (p_id, (p_claims->>'licence_id')::uuid, p_installation, (p_claims->>'valid_from')::timestamptz, (p_claims->>'valid_to')::timestamptz,
            (p_claims->>'sequence')::int, (p_claims->>'member_seats')::int, p_claims, p_key, p_signature, p_actor);
END $$;
CREATE FUNCTION vendor.service_licence_state() RETURNS TABLE(licence_id uuid, sequence integer, valid_to timestamptz, member_seats integer, expired boolean, members_active integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NOT vendor.has_capability('vendor.team.read') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT f.licence_id, f.sequence, f.valid_to, f.member_seats, f.expired, vendor.active_member_logins(NULL) FROM (SELECT 1) x LEFT JOIN vendor.service_licence_in_force() f ON true;
END $$;
REVOKE ALL ON FUNCTION vendor.service_licence_in_force(), vendor.active_member_logins(uuid), vendor.service_seat_guard(), vendor.import_service_licence(uuid,uuid,uuid,jsonb,text,text), vendor.service_licence_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vendor.import_service_licence(uuid,uuid,uuid,jsonb,text,text), vendor.service_licence_state() TO orvia_vendor_app;
