-- Owner decision 2026-10-03: ORVIA is used by the organisation's staff only; the people whose data it processes (its Data
-- Principals) never sign in to ORVIA. A released rights response therefore reaches the person through the organisation's
-- own platform (its website, store or app collects it with the intake key that submitted the request), or a staff member
-- downloads it to hand over. Both use the release that already exists: one package, its expiry, revocation and download
-- allowance, and an immutable receipt for every collection, now stating the channel and who collected it.
ALTER TABLE app.rights_response_downloads
  ADD COLUMN channel text NOT NULL DEFAULT 'PORTAL' CHECK (channel IN ('PORTAL', 'PLATFORM', 'STAFF')),
  ADD COLUMN collected_by uuid;
ALTER TABLE app.rights_response_downloads ADD CONSTRAINT rights_response_downloads_collector
  CHECK ((channel = 'PORTAL') = (collected_by IS NULL));

-- One collection against the release, whoever collects: refuses unless the package is released, unrevoked, unexpired and
-- within its allowance; then counts the download and writes the receipt in the same transaction.
CREATE FUNCTION app.collect_released_package(p_package uuid, p_channel text, p_collector uuid, p_receipt uuid)
RETURNS TABLE(package_id uuid, request_id uuid, version integer, released_at timestamptz, expires_at timestamptz, downloads_remaining integer,
  content_digest text, content jsonb, delivery text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE p record; state text;
BEGIN
  SELECT * INTO p FROM app.rights_response_packages r WHERE r.id = p_package AND app.in_scope(r.tenant_id, r.legal_entity_id, r.environment_id) FOR UPDATE;
  IF p IS NULL THEN RETURN; END IF;
  state := CASE WHEN p.state <> 'RELEASED' THEN 'NOT_RELEASED' WHEN p.purged_at IS NOT NULL THEN 'EXPIRED' WHEN p.revoked_at IS NOT NULL THEN 'REVOKED'
    WHEN p.delivery_expires_at <= clock_timestamp() THEN 'EXPIRED' WHEN p.downloads >= p.max_downloads THEN 'EXHAUSTED' ELSE 'ACTIVE' END;
  IF state <> 'ACTIVE' THEN
    RETURN QUERY SELECT p.id, p.request_id, p.version, p.released_at, p.delivery_expires_at, greatest(coalesce(p.max_downloads, 0) - p.downloads, 0), p.content_digest, NULL::jsonb, state;
    RETURN;
  END IF;
  UPDATE app.rights_response_packages r SET downloads = r.downloads + 1 WHERE r.tenant_id = p.tenant_id AND r.legal_entity_id = p.legal_entity_id AND r.environment_id = p.environment_id AND r.id = p.id;
  INSERT INTO app.rights_response_downloads(tenant_id, legal_entity_id, environment_id, id, package_id, principal_id, content_digest, channel, collected_by)
    VALUES (p.tenant_id, p.legal_entity_id, p.environment_id, p_receipt, p.id, p.principal_id, p.content_digest, p_channel, p_collector);
  RETURN QUERY SELECT p.id, p.request_id, p.version, p.released_at, p.delivery_expires_at, p.max_downloads - p.downloads - 1, p.content_digest, p.released_content, 'ACTIVE'::text;
END $$;
REVOKE ALL ON FUNCTION app.collect_released_package(uuid, text, uuid, uuid) FROM PUBLIC;

-- The organisation's platform: only for a rights request this intake key submitted, and only its latest released package.
CREATE FUNCTION app.intake_collect_response(p_submission uuid, p_receipt uuid)
RETURNS TABLE(package_id uuid, request_id uuid, version integer, released_at timestamptz, expires_at timestamptz, downloads_remaining integer,
  content_digest text, content jsonb, delivery text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE client uuid := app.intake_actor(); s record; pkg uuid;
BEGIN
  IF client IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM app.intake_submissions i WHERE i.id = p_submission AND i.client_id = client AND i.kind = 'RIGHTS'
    AND app.in_scope(i.tenant_id, i.legal_entity_id, i.environment_id);
  IF s IS NULL OR s.rights_request_id IS NULL THEN RETURN; END IF;
  SELECT r.id INTO pkg FROM app.rights_response_packages r WHERE r.tenant_id = s.tenant_id AND r.legal_entity_id = s.legal_entity_id AND r.environment_id = s.environment_id
    AND r.request_id = s.rights_request_id AND r.state = 'RELEASED' ORDER BY r.version DESC LIMIT 1;
  IF pkg IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, s.rights_request_id, NULL::integer, NULL::timestamptz, NULL::timestamptz, 0, NULL::text, NULL::jsonb, 'NOT_RELEASED'::text;
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM app.collect_released_package(pkg, 'PLATFORM', client, p_receipt);
END $$;
REVOKE ALL ON FUNCTION app.intake_collect_response(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.intake_collect_response(uuid, uuid) TO orvia_app;

-- A staff member who may release responses downloads the released copy to hand it over through the organisation's own channel.
CREATE FUNCTION app.staff_collect_response(p_package uuid, p_receipt uuid)
RETURNS TABLE(package_id uuid, request_id uuid, version integer, released_at timestamptz, expires_at timestamptz, downloads_remaining integer,
  content_digest text, content jsonb, delivery text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
BEGIN
  IF current_setting('orvia.actor_domain', true) IS DISTINCT FROM 'STAFF' OR NOT app.has_capability('rights.release') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM app.collect_released_package(p_package, 'STAFF', nullif(current_setting('orvia.actor_id', true), '')::uuid, p_receipt);
END $$;
REVOKE ALL ON FUNCTION app.staff_collect_response(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.staff_collect_response(uuid, uuid) TO orvia_app;
