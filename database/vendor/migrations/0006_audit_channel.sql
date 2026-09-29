-- DPDPA audit mandate channel on the vendor's VENDOR_SERVICE installation
-- (revision 1.6 addendum, docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md).
--
--   channels            one per engagement: the channel key sealed with the vault
--                       key, the client installation's pinned evidence key and the
--                       delivery chain position;
--   channel_mandates    every mandate document the client installation signed and
--                       presented, as received;
--   channel_requests    auditor requests, signed with the audit key when issued;
--   channel_deliveries  evidence deliveries and their signed receipts;
--   channel_events      every check-in, delivery and refused call, for health and
--                       rate limiting.
--
-- The client installation is not a login. The application authenticates each
-- channel call by the HMAC of the engagement's channel key, then binds the
-- engagement as actor with domain CLIENT_INSTALLATION; the functions below act
-- only on that engagement. Nothing here connects to a client installation.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;

ALTER TABLE vendor.audit_events DROP CONSTRAINT audit_events_actor_domain_check;
ALTER TABLE vendor.audit_events ADD CONSTRAINT audit_events_actor_domain_check CHECK (actor_domain IN ('VENDOR_STAFF','CLIENT_ACCOUNT','MACHINE','CLIENT_INSTALLATION'));
ALTER TABLE vendor.packages ADD COLUMN source text NOT NULL DEFAULT 'UPLOAD' CHECK (source IN ('UPLOAD','CHANNEL'));
ALTER TABLE vendor.package_refusals ADD COLUMN source text NOT NULL DEFAULT 'UPLOAD' CHECK (source IN ('UPLOAD','CHANNEL'));

CREATE TABLE vendor.channels (
  engagement_id uuid PRIMARY KEY REFERENCES vendor.engagements(id),
  key_ciphertext bytea NOT NULL, key_nonce bytea NOT NULL, key_tag bytea NOT NULL,
  installation_public_key text, installation_key_id text CHECK (installation_key_id ~ '^orvia-installation-[a-f0-9]{32}$'), pinned_at timestamptz,
  last_check_in_at timestamptz, check_ins integer NOT NULL DEFAULT 0,
  chain_state text NOT NULL DEFAULT 'NOT_STARTED' CHECK (chain_state IN ('NOT_STARTED','INTACT','BROKEN')), chain_problem text CHECK (chain_problem IS NULL OR length(chain_problem) <= 80),
  next_sequence integer NOT NULL DEFAULT 1 CHECK (next_sequence >= 1), last_digest text CHECK (last_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((installation_public_key IS NULL) = (pinned_at IS NULL) AND (installation_public_key IS NULL) = (installation_key_id IS NULL)),
  CHECK ((chain_state = 'BROKEN') = (chain_problem IS NOT NULL)));
CREATE TABLE vendor.channel_mandates (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), mandate_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ENGAGEMENT','CONTINUOUS_ASSURANCE')), state text NOT NULL CHECK (state IN ('ACTIVE','SUSPENDED','REVOKED','ENDED')),
  valid_from timestamptz NOT NULL, valid_to timestamptz NOT NULL, document jsonb NOT NULL, signed jsonb NOT NULL, digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (engagement_id, digest));
CREATE TRIGGER channel_mandates_immutable BEFORE UPDATE OR DELETE ON vendor.channel_mandates FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TABLE vendor.channel_requests (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id),
  kind text NOT NULL CHECK (kind IN ('COLLECT_NOW','SAMPLE_COUNT','EVIDENCE_FILE')), requirement_id text, categories text[] NOT NULL DEFAULT '{}',
  population text, sample_size integer, seed text, description text NOT NULL CHECK (length(description) BETWEEN 1 AND 2000), due_date date NOT NULL,
  signed jsonb NOT NULL, issued_by uuid NOT NULL, issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DELIVERED','AWAITING_CLIENT_APPROVAL','REFUSED','WITHDRAWN')),
  status_reason text CHECK (status_reason IS NULL OR length(status_reason) <= 80), acknowledged_at timestamptz, delivery_id uuid, package_id uuid);
CREATE TABLE vendor.channel_deliveries (
  delivery_id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), mandate_id uuid,
  sequence integer NOT NULL CHECK (sequence >= 1), digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'), previous_digest text,
  kind text NOT NULL CHECK (kind IN ('SNAPSHOT','RESPONSE')), request_id uuid, generated_at timestamptz, period_from timestamptz, period_to timestamptz,
  entries integer NOT NULL DEFAULT 0, document jsonb, signed jsonb,
  outcome text NOT NULL CHECK (outcome IN ('ACCEPTED','REFUSED')), reasons text[] NOT NULL DEFAULT '{}', receipt jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(), purged_at timestamptz,
  CHECK (outcome = 'ACCEPTED' OR (document IS NULL AND signed IS NULL)));
CREATE UNIQUE INDEX channel_deliveries_accepted_sequence ON vendor.channel_deliveries(engagement_id, sequence) WHERE outcome = 'ACCEPTED';
CREATE TABLE vendor.channel_events (
  id uuid PRIMARY KEY, engagement_id uuid REFERENCES vendor.engagements(id),
  kind text NOT NULL CHECK (kind IN ('CHECK_IN','DELIVERY','PACKAGE','AUTH_REFUSED','REFUSED')), outcome text NOT NULL CHECK (length(outcome) BETWEEN 1 AND 80),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX channel_events_recent ON vendor.channel_events(engagement_id, recorded_at);
CREATE TRIGGER channel_events_immutable BEFORE UPDATE OR DELETE ON vendor.channel_events FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['channels','channel_mandates','channel_requests','channel_deliveries','channel_events'] LOOP
    EXECUTE format('ALTER TABLE vendor.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE vendor.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
-- Staff: channel health is visible with the engagement; mandates, requests and deliveries to the engagement team only.
CREATE POLICY channel_health ON vendor.channels FOR SELECT USING (vendor.has_capability('engagements.read') OR vendor.on_team(engagement_id));
CREATE POLICY channel_create ON vendor.channels FOR INSERT WITH CHECK (vendor.has_capability('engagements.manage'));
CREATE POLICY team_mandates ON vendor.channel_mandates FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY team_channel_requests ON vendor.channel_requests FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY team_channel_requests_insert ON vendor.channel_requests FOR INSERT WITH CHECK (vendor.on_team(engagement_id) AND issued_by = vendor.actor() AND vendor.has_capability('audit.fieldwork') AND status = 'PENDING');
CREATE POLICY team_channel_requests_withdraw ON vendor.channel_requests FOR UPDATE USING (vendor.on_team(engagement_id) AND vendor.has_capability('audit.fieldwork')) WITH CHECK (vendor.on_team(engagement_id));
CREATE POLICY team_deliveries ON vendor.channel_deliveries FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY channel_events_read ON vendor.channel_events FOR SELECT USING ((engagement_id IS NOT NULL AND vendor.on_team(engagement_id)) OR vendor.has_capability('vendor.audit.read'));
-- A channel caller sees the packages of its own engagement (duplicate check on receipt).
CREATE POLICY channel_packages ON vendor.packages FOR SELECT USING (vendor.actor_domain() = 'CLIENT_INSTALLATION' AND engagement_id = vendor.actor());

GRANT SELECT, INSERT ON vendor.channels TO orvia_vendor_app;
GRANT SELECT, INSERT, UPDATE ON vendor.channel_requests TO orvia_vendor_app;
GRANT SELECT ON vendor.channel_mandates, vendor.channel_deliveries, vendor.channel_events TO orvia_vendor_app;

-- ---------------------------------------------------------------- channel functions
CREATE FUNCTION vendor.channel_caller() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF vendor.actor_domain() IS DISTINCT FROM 'CLIENT_INSTALLATION' OR vendor.actor() IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN vendor.actor();
END $$;
-- The sealed channel key of the engagement with this digest; the application opens it with the vault key and checks the HMAC before binding any actor.
CREATE FUNCTION vendor.channel_key(p_digest text) RETURNS TABLE(engagement_id uuid, state text, key_ciphertext bytea, key_nonce bytea, key_tag bytea)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT e.id, e.state, c.key_ciphertext, c.key_nonce, c.key_tag FROM vendor.engagements e JOIN vendor.channels c ON c.engagement_id = e.id WHERE e.code_digest = p_digest $$;
CREATE FUNCTION vendor.channel_refused(p_engagement uuid, p_kind text, p_outcome text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  INSERT INTO vendor.channel_events(id, engagement_id, kind, outcome) VALUES (gen_random_uuid(), p_engagement, p_kind, left(p_outcome, 80)) $$;
-- At most 120 channel calls per engagement per 10 minutes, counted under a lock.
CREATE FUNCTION vendor.channel_rate_ok() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e uuid := vendor.channel_caller(); recent integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('vendor-channel:' || e::text));
  SELECT count(*) INTO recent FROM vendor.channel_events WHERE engagement_id = e AND recorded_at > clock_timestamp() - interval '10 minutes';
  RETURN recent < 120;
END $$;
-- What a channel call needs to know about its own engagement.
CREATE FUNCTION vendor.channel_context() RETURNS TABLE(engagement_id uuid, engagement_state text, organisation_name text, reference text, scope text[], code_digest text,
  installation_public_key text, installation_key_id text, chain_state text, next_sequence integer, last_digest text,
  mandate_id uuid, mandate_state text, mandate_valid_from timestamptz, mandate_valid_to timestamptz, mandate_document jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT e.id, e.state, o.name, e.reference, e.scope_requirement_ids, e.code_digest, c.installation_public_key, c.installation_key_id, c.chain_state, c.next_sequence, c.last_digest,
    m.mandate_id, m.state, m.valid_from, m.valid_to, m.document
  FROM vendor.engagements e JOIN vendor.organisations o ON o.id = e.organisation_id JOIN vendor.channels c ON c.engagement_id = e.id
  LEFT JOIN LATERAL (SELECT * FROM vendor.channel_mandates x WHERE x.engagement_id = e.id ORDER BY x.received_at DESC, x.id LIMIT 1) m ON true
  WHERE e.id = vendor.channel_caller() $$;
-- The first authenticated check-in pins the installation's evidence key; a different key later is refused.
CREATE FUNCTION vendor.channel_pin_key(p_public text, p_key_id text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e uuid := vendor.channel_caller(); c record;
BEGIN
  SELECT * INTO c FROM vendor.channels WHERE engagement_id = e FOR UPDATE;
  IF c.installation_public_key IS NULL THEN
    UPDATE vendor.channels SET installation_public_key = p_public, installation_key_id = p_key_id, pinned_at = clock_timestamp() WHERE engagement_id = e;
    RETURN 'PINNED';
  END IF;
  IF c.installation_public_key <> p_public OR c.installation_key_id <> p_key_id THEN RETURN 'KEY_CHANGED'; END IF;
  RETURN 'MATCHES';
END $$;
CREATE FUNCTION vendor.channel_record_mandate(p_mandate uuid, p_kind text, p_state text, p_from timestamptz, p_to timestamptz, p_document jsonb, p_signed jsonb, p_digest text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e uuid := vendor.channel_caller();
BEGIN
  INSERT INTO vendor.channel_mandates(id, engagement_id, mandate_id, kind, state, valid_from, valid_to, document, signed, digest)
  VALUES (gen_random_uuid(), e, p_mandate, p_kind, p_state, p_from, p_to, p_document, p_signed, p_digest) ON CONFLICT (engagement_id, digest) DO NOTHING;
END $$;
CREATE FUNCTION vendor.channel_checked_in(p_outcome text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e uuid := vendor.channel_caller();
BEGIN
  IF p_outcome = 'OK' THEN UPDATE vendor.channels SET last_check_in_at = clock_timestamp(), check_ins = check_ins + 1 WHERE engagement_id = e; END IF;
  INSERT INTO vendor.channel_events(id, engagement_id, kind, outcome) VALUES (gen_random_uuid(), e, 'CHECK_IN', left(p_outcome, 80));
END $$;
-- The client installation reports what it did with each request; only a pending request moves, once.
CREATE FUNCTION vendor.channel_acknowledge(p_request uuid, p_outcome text, p_reason text, p_delivery uuid, p_package uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e uuid := vendor.channel_caller();
BEGIN
  IF p_outcome NOT IN ('DELIVERED','AWAITING_CLIENT_APPROVAL','REFUSED') THEN RAISE EXCEPTION 'invalid_outcome' USING ERRCODE = 'P0001', HINT = 'acknowledgements'; END IF;
  UPDATE vendor.channel_requests SET status = p_outcome, status_reason = left(p_reason, 80), acknowledged_at = clock_timestamp(),
    delivery_id = coalesce(p_delivery, delivery_id), package_id = coalesce(p_package, package_id)
  WHERE id = p_request AND engagement_id = e AND (status = 'PENDING' OR (status = 'AWAITING_CLIENT_APPROVAL' AND p_outcome IN ('DELIVERED','REFUSED')));
END $$;
CREATE FUNCTION vendor.channel_pending_requests() RETURNS TABLE(id uuid, signed jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT r.id, r.signed FROM vendor.channel_requests r WHERE r.engagement_id = vendor.channel_caller() AND r.status IN ('PENDING','AWAITING_CLIENT_APPROVAL') ORDER BY r.issued_at, r.id LIMIT 200 $$;
CREATE FUNCTION vendor.channel_stored_delivery(p_delivery uuid) RETURNS TABLE(digest text, receipt jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT d.digest, d.receipt FROM vendor.channel_deliveries d WHERE d.delivery_id = p_delivery AND d.engagement_id = vendor.channel_caller() $$;
-- Records a delivery and its signed receipt. An accepted delivery advances the chain; a chain break is kept visible.
CREATE FUNCTION vendor.channel_record_delivery(p_delivery uuid, p_mandate uuid, p_sequence integer, p_digest text, p_previous text, p_kind text, p_request uuid,
  p_generated timestamptz, p_from timestamptz, p_to timestamptz, p_entries integer, p_document jsonb, p_signed jsonb, p_outcome text, p_reasons text[], p_receipt jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e uuid := vendor.channel_caller(); c record;
BEGIN
  SELECT * INTO c FROM vendor.channels WHERE engagement_id = e FOR UPDATE;
  INSERT INTO vendor.channel_deliveries(delivery_id, engagement_id, mandate_id, sequence, digest, previous_digest, kind, request_id, generated_at, period_from, period_to, entries, document, signed, outcome, reasons, receipt)
  VALUES (p_delivery, e, p_mandate, p_sequence, p_digest, p_previous, p_kind, p_request, p_generated, p_from, p_to, p_entries,
    CASE WHEN p_outcome = 'ACCEPTED' THEN p_document END, CASE WHEN p_outcome = 'ACCEPTED' THEN p_signed END, p_outcome, p_reasons, p_receipt);
  IF p_outcome = 'ACCEPTED' THEN
    -- A delivery that does not follow the last one is still accepted (the evidence keeps flowing), but the break stays visible for good.
    IF p_sequence < c.next_sequence THEN RAISE EXCEPTION 'sequence_reused' USING ERRCODE = 'P0001', HINT = 'sequence'; END IF;
    IF p_sequence <> c.next_sequence OR p_previous IS DISTINCT FROM c.last_digest THEN
      UPDATE vendor.channels SET chain_state = 'BROKEN', chain_problem = left('delivery ' || p_sequence || ' does not follow delivery ' || (c.next_sequence - 1), 80) WHERE engagement_id = e AND chain_state <> 'BROKEN';
    END IF;
    UPDATE vendor.channels SET next_sequence = p_sequence + 1, last_digest = p_digest, chain_state = CASE WHEN chain_state = 'BROKEN' THEN 'BROKEN' ELSE 'INTACT' END WHERE engagement_id = e;
    IF p_request IS NOT NULL THEN
      UPDATE vendor.channel_requests SET status = 'DELIVERED', delivery_id = p_delivery, acknowledged_at = clock_timestamp(), status_reason = NULL
        WHERE id = p_request AND engagement_id = e AND status IN ('PENDING','AWAITING_CLIENT_APPROVAL');
    END IF;
  END IF;
  INSERT INTO vendor.channel_events(id, engagement_id, kind, outcome) VALUES (gen_random_uuid(), e, 'DELIVERY', p_outcome);
  INSERT INTO vendor.audit_events(id, actor_id, actor_domain, operation, resource_id, request_id) VALUES (gen_random_uuid(), e, 'CLIENT_INSTALLATION', 'audit.channel.delivery-' || lower(p_outcome), p_delivery, gen_random_uuid());
  IF p_outcome = 'ACCEPTED' THEN UPDATE vendor.engagements SET state = 'FIELDWORK' WHERE id = e AND state = 'PLANNING'; END IF;
END $$;

-- ---------------------------------------------------------------- packages over the channel (Rev 1.5 packages for requests only a person can release)
CREATE OR REPLACE FUNCTION vendor.record_upload_attempt() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE recent integer;
BEGIN
  IF vendor.account_organisation() IS NULL AND vendor.actor_domain() IS DISTINCT FROM 'CLIENT_INSTALLATION' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('vendor-upload:' || vendor.actor()::text));
  SELECT count(*) INTO recent FROM vendor.upload_attempts WHERE account_id = vendor.actor() AND attempted_at > clock_timestamp() - interval '10 minutes';
  IF recent >= 10 THEN RETURN false; END IF;
  INSERT INTO vendor.upload_attempts(account_id) VALUES (vendor.actor());
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION vendor.engagement_for_code(p_digest text) RETURNS TABLE(id uuid, state text, processing_agreement boolean, organisation_name text, reference text, scope text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT e.id, e.state, e.processing_agreement_reference IS NOT NULL, o.name, e.reference, e.scope_requirement_ids FROM vendor.engagements e JOIN vendor.organisations o ON o.id = e.organisation_id
  WHERE e.code_digest = p_digest AND (e.organisation_id = vendor.account_organisation() OR (vendor.actor_domain() = 'CLIENT_INSTALLATION' AND e.id = vendor.actor())) $$;
CREATE OR REPLACE FUNCTION vendor.store_package(p_id uuid, p_engagement uuid, p_client_package uuid, p_file_sha256 text, p_manifest jsonb, p_fingerprint text, p_expires timestamptz,
  p_personal boolean, p_scan_engine text, p_wrapped bytea, p_key_nonce bytea, p_key_tag bytea, p_items jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e record; st text; q text; i jsonb; channel boolean := vendor.actor_domain() = 'CLIENT_INSTALLATION';
BEGIN
  SELECT * INTO e FROM vendor.engagements WHERE id = p_engagement FOR UPDATE;
  IF e IS NULL OR NOT (e.organisation_id IS NOT DISTINCT FROM vendor.account_organisation() OR (channel AND e.id = vendor.actor())) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF e.state = 'CLOSED' THEN RAISE EXCEPTION 'engagement_closed' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
  IF EXISTS (SELECT 1 FROM vendor.packages WHERE engagement_id = p_engagement AND client_package_id = p_client_package) THEN RAISE EXCEPTION 'package_already_received' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
  IF p_personal AND e.processing_agreement_reference IS NULL THEN st := 'QUARANTINED'; q := 'PERSONAL_DATA_WITHOUT_PROCESSING_AGREEMENT'; ELSE st := 'ACCEPTED'; END IF;
  INSERT INTO vendor.packages(id, engagement_id, client_package_id, uploaded_by, file_sha256, manifest, manifest_fingerprint, expires_at, contains_personal_data, state, quarantine_reason,
    scan_engine, scan_result, wrapped_key, key_nonce, key_tag, source)
  VALUES (p_id, p_engagement, p_client_package, vendor.actor(), p_file_sha256, p_manifest, p_fingerprint, p_expires, p_personal, st, q, p_scan_engine, 'CLEAN', p_wrapped, p_key_nonce, p_key_tag,
    CASE WHEN channel THEN 'CHANNEL' ELSE 'UPLOAD' END);
  FOR i IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO vendor.package_items VALUES (p_id, (i->>'item_id')::uuid, i->>'requirement_id', i->>'kind', i->>'title', i->>'file_name', i->>'media_type', (i->>'size_bytes')::integer, i->>'sha256',
      (i->>'contains_personal_data')::boolean, decode(i->>'ciphertext', 'base64'), decode(i->>'nonce', 'base64'), decode(i->>'tag', 'base64'));
  END LOOP;
  UPDATE vendor.packages SET state = 'REVOKED', revoked_at = clock_timestamp(), quarantine_reason = NULL
    WHERE engagement_id = p_engagement AND state IN ('ACCEPTED','QUARANTINED') AND client_package_id IN (SELECT (x)::uuid FROM jsonb_array_elements_text(p_manifest->'revoked_package_ids') x);
  INSERT INTO vendor.audit_events(id, actor_id, actor_domain, operation, resource_id, request_id) VALUES (gen_random_uuid(), vendor.actor(), vendor.actor_domain(), 'audit.package.received', p_id, gen_random_uuid());
  IF channel THEN INSERT INTO vendor.channel_events(id, engagement_id, kind, outcome) VALUES (gen_random_uuid(), p_engagement, 'PACKAGE', st); END IF;
  IF e.state = 'PLANNING' THEN UPDATE vendor.engagements SET state = 'FIELDWORK' WHERE id = p_engagement; END IF;
  RETURN st;
END $$;
CREATE OR REPLACE FUNCTION vendor.refuse_package(p_engagement uuid, p_file_sha256 text, p_reasons text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE channel boolean := vendor.actor_domain() = 'CLIENT_INSTALLATION';
BEGIN
  IF vendor.account_organisation() IS NULL AND NOT channel THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF channel THEN p_engagement := vendor.actor();
  ELSIF p_engagement IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vendor.engagements WHERE id = p_engagement AND organisation_id = vendor.account_organisation()) THEN p_engagement := NULL; END IF;
  INSERT INTO vendor.package_refusals(id, engagement_id, uploaded_by, file_sha256, reasons, source) VALUES (gen_random_uuid(), p_engagement, vendor.actor(), p_file_sha256, p_reasons, CASE WHEN channel THEN 'CHANNEL' ELSE 'UPLOAD' END);
  IF channel THEN INSERT INTO vendor.channel_events(id, engagement_id, kind, outcome) VALUES (gen_random_uuid(), p_engagement, 'PACKAGE', 'REFUSED'); END IF;
END $$;

-- Retention also destroys the content of channel deliveries; their digests, receipts and the mandates stay.
CREATE OR REPLACE FUNCTION vendor.retention_sweep(p_actor uuid) RETURNS TABLE(engagement_id uuid, packages integer, items integer, bytes bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e record; np integer; ni integer; nb bigint;
BEGIN
  IF p_actor IS DISTINCT FROM vendor.actor() OR NOT vendor.has_capability('engagements.manage') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  FOR e IN SELECT * FROM vendor.engagements WHERE state = 'CLOSED' AND purged_at IS NULL AND closed_at + make_interval(days => retention_days) <= clock_timestamp() FOR UPDATE LOOP
    SELECT count(*), coalesce(sum(i.size_bytes), 0) INTO ni, nb FROM vendor.package_items i JOIN vendor.packages p ON p.id = i.package_id WHERE p.engagement_id = e.id AND i.ciphertext IS NOT NULL;
    UPDATE vendor.package_items i SET ciphertext = NULL, nonce = NULL, tag = NULL FROM vendor.packages p WHERE p.id = i.package_id AND p.engagement_id = e.id;
    UPDATE vendor.packages SET state = 'PURGED', purged_at = clock_timestamp(), wrapped_key = NULL, key_nonce = NULL, key_tag = NULL, quarantine_reason = NULL WHERE vendor.packages.engagement_id = e.id AND state <> 'PURGED';
    GET DIAGNOSTICS np = ROW_COUNT;
    UPDATE vendor.channel_deliveries SET document = NULL, signed = NULL, purged_at = clock_timestamp() WHERE vendor.channel_deliveries.engagement_id = e.id AND purged_at IS NULL;
    UPDATE vendor.engagements SET purged_at = clock_timestamp() WHERE id = e.id;
    INSERT INTO vendor.retention_purges(id, engagement_id, packages, items, bytes, actor_id) VALUES (gen_random_uuid(), e.id, np, ni, nb, p_actor);
    engagement_id := e.id; packages := np; items := ni; bytes := nb; RETURN NEXT;
  END LOOP;
END $$;
-- The retention sweep updates channel deliveries as the definer; the business role never does.
CREATE POLICY never_update ON vendor.channel_deliveries FOR UPDATE USING (false);

-- ---------------------------------------------------------------- leadership overview: counts only, never evidence
CREATE FUNCTION vendor.overview() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE r jsonb;
BEGIN
  IF NOT vendor.has_capability('vendor.overview.read') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'organisations', (SELECT count(*) FROM vendor.organisations),
    'licence_states', (SELECT coalesce(jsonb_object_agg(licence_state, n), '{}') FROM (SELECT licence_state, count(*) AS n FROM vendor.organisations GROUP BY licence_state) x),
    'licences_expiring_60_days', (SELECT count(DISTINCT organisation_id) FROM (SELECT DISTINCT ON (organisation_id, installation_id) organisation_id, valid_to FROM vendor.licence_issues ORDER BY organisation_id, installation_id, issued_at DESC) l
       WHERE valid_to > clock_timestamp() AND valid_to <= clock_timestamp() + interval '60 days'),
    'engagements_by_state', (SELECT coalesce(jsonb_object_agg(state, n), '{}') FROM (SELECT state, count(*) AS n FROM vendor.engagements GROUP BY state) x),
    'engagements_without_lead', (SELECT count(*) FROM vendor.engagements e WHERE e.state <> 'CLOSED' AND NOT EXISTS (SELECT 1 FROM vendor.engagement_team t WHERE t.engagement_id = e.id AND t.engagement_role = 'LEAD')),
    'engagements_without_independence', (SELECT count(*) FROM vendor.engagements WHERE state <> 'CLOSED' AND independence_statement IS NULL),
    'channels', jsonb_build_object(
       'with_active_mandate', (SELECT count(*) FROM vendor.engagements e JOIN LATERAL (SELECT state, valid_to FROM vendor.channel_mandates m WHERE m.engagement_id = e.id ORDER BY received_at DESC, id LIMIT 1) m ON true
          WHERE e.state <> 'CLOSED' AND m.state = 'ACTIVE' AND m.valid_to > clock_timestamp()),
       'silent_over_48_hours', (SELECT count(*) FROM vendor.channels c JOIN vendor.engagements e ON e.id = c.engagement_id WHERE e.state <> 'CLOSED' AND c.pinned_at IS NOT NULL AND c.last_check_in_at < clock_timestamp() - interval '48 hours'),
       'chain_broken', (SELECT count(*) FROM vendor.channels c JOIN vendor.engagements e ON e.id = c.engagement_id WHERE e.state <> 'CLOSED' AND c.chain_state = 'BROKEN'),
       'deliveries_30_days', (SELECT count(*) FROM vendor.channel_deliveries WHERE outcome = 'ACCEPTED' AND received_at > clock_timestamp() - interval '30 days')),
    'requests', jsonb_build_object(
       'open', (SELECT count(*) FROM vendor.channel_requests r JOIN vendor.engagements e ON e.id = r.engagement_id WHERE e.state <> 'CLOSED' AND r.status IN ('PENDING','AWAITING_CLIENT_APPROVAL'))
             + (SELECT count(*) FROM vendor.audit_requests a JOIN vendor.engagements e ON e.id = a.engagement_id WHERE e.state <> 'CLOSED' AND a.due_date >= current_date),
       'overdue_with_clients', (SELECT count(*) FROM vendor.channel_requests r JOIN vendor.engagements e ON e.id = r.engagement_id WHERE e.state <> 'CLOSED' AND r.status IN ('PENDING','AWAITING_CLIENT_APPROVAL') AND r.due_date < current_date)),
    'packages_30_days', (SELECT coalesce(jsonb_object_agg(source, n), '{}') FROM (SELECT source, count(*) AS n FROM vendor.packages WHERE uploaded_at > clock_timestamp() - interval '30 days' GROUP BY source) x),
    'packages_quarantined', (SELECT count(*) FROM vendor.packages WHERE state = 'QUARANTINED'),
    'findings_open_by_severity', (SELECT coalesce(jsonb_object_agg(severity, n), '{}') FROM (SELECT severity, count(*) AS n FROM vendor.findings WHERE status <> 'CLOSED' GROUP BY severity) x),
    'findings_overdue', (SELECT count(*) FROM vendor.findings WHERE status <> 'CLOSED' AND due_date < current_date),
    'reports_signed', (SELECT count(*) FROM vendor.reports WHERE state IN ('SIGNED','SUPERSEDED') AND signed_document_id IS NOT NULL),
    'reports_awaiting_review', (SELECT count(*) FROM vendor.reports WHERE state = 'DRAFT'),
    'support_open_by_urgency', (SELECT coalesce(jsonb_object_agg(urgency, n), '{}') FROM (SELECT urgency, count(*) AS n FROM vendor.support_cases WHERE state <> 'RESOLVED' GROUP BY urgency) x),
    'retention_due', (SELECT count(*) FROM vendor.engagements WHERE state = 'CLOSED' AND purged_at IS NULL AND closed_at + make_interval(days => retention_days) <= clock_timestamp()),
    'as_of', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) INTO r;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION vendor.channel_caller(), vendor.channel_key(text), vendor.channel_refused(uuid,text,text), vendor.channel_rate_ok(), vendor.channel_context(),
  vendor.channel_pin_key(text,text), vendor.channel_record_mandate(uuid,text,text,timestamptz,timestamptz,jsonb,jsonb,text), vendor.channel_checked_in(text),
  vendor.channel_acknowledge(uuid,text,text,uuid,uuid), vendor.channel_pending_requests(), vendor.channel_stored_delivery(uuid),
  vendor.channel_record_delivery(uuid,uuid,integer,text,text,text,uuid,timestamptz,timestamptz,timestamptz,integer,jsonb,jsonb,text,text[],jsonb), vendor.overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vendor.channel_caller(), vendor.channel_key(text), vendor.channel_refused(uuid,text,text), vendor.channel_rate_ok(), vendor.channel_context(),
  vendor.channel_pin_key(text,text), vendor.channel_record_mandate(uuid,text,text,timestamptz,timestamptz,jsonb,jsonb,text), vendor.channel_checked_in(text),
  vendor.channel_acknowledge(uuid,text,text,uuid,uuid), vendor.channel_pending_requests(), vendor.channel_stored_delivery(uuid),
  vendor.channel_record_delivery(uuid,uuid,integer,text,text,text,uuid,timestamptz,timestamptz,timestamptz,integer,jsonb,jsonb,text,text[],jsonb), vendor.overview() TO orvia_vendor_app;
