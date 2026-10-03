-- Serialize service licence history checks with imports and seat admission.
CREATE OR REPLACE FUNCTION vendor.import_service_licence(p_actor uuid, p_id uuid, p_installation uuid, p_claims jsonb, p_key text, p_signature text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE top integer;
BEGIN
  IF p_actor IS DISTINCT FROM vendor.actor() OR NOT EXISTS (SELECT 1 FROM vendor_auth.authority WHERE user_id = p_actor AND active AND role = 'VENDOR_SUPER_ADMIN') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF (p_claims->>'installation_id')::uuid IS DISTINCT FROM p_installation THEN RAISE EXCEPTION 'wrong_installation' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  IF (p_claims->>'valid_to')::timestamptz <= clock_timestamp() THEN RAISE EXCEPTION 'expired' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  PERFORM pg_advisory_xact_lock(728140);
  SELECT max(sequence) INTO top FROM vendor.service_licences;
  IF top IS NOT NULL AND (p_claims->>'sequence')::int <= top THEN RAISE EXCEPTION 'stale_sequence' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  IF EXISTS (SELECT 1 FROM vendor.service_licences WHERE licence_id = (p_claims->>'licence_id')::uuid) THEN RAISE EXCEPTION 'replayed' USING ERRCODE = 'P0001', HINT = 'licence'; END IF;
  INSERT INTO vendor.service_licences(id, licence_id, installation_id, valid_from, valid_to, sequence, member_seats, claims, signing_key_id, signature, imported_by)
    VALUES (p_id, (p_claims->>'licence_id')::uuid, p_installation, (p_claims->>'valid_from')::timestamptz, (p_claims->>'valid_to')::timestamptz,
            (p_claims->>'sequence')::int, (p_claims->>'member_seats')::int, p_claims, p_key, p_signature, p_actor);
END $$;
REVOKE ALL ON FUNCTION vendor.import_service_licence(uuid,uuid,uuid,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vendor.import_service_licence(uuid,uuid,uuid,jsonb,text,text) TO orvia_vendor_app;
