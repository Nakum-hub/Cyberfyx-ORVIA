-- DPDPA audit mandate and outbound channel, client side (revision 1.6 addendum,
-- docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md).
--
--   audit_mandates            the one authorisation a client signs: scope, evidence
--                             categories, schedule and dates; drafted by one person,
--                             approved by a different owner or administrator;
--   audit_channel_keys        the channel key derived from the engagement code,
--                             written once by the application and readable only by
--                             the background worker;
--   installation_evidence_keys the installation's Ed25519 evidence key, created and
--                             used only by the worker, its private half sealed;
--   audit_channel_deliveries  every evidence delivery the worker generated, signed
--                             and sent, with the vendor's signed receipt;
--   audit_channel_requests    every auditor request received, verified and decided
--                             (answered automatically, waiting for a person, or refused);
--   audit_package_submissions sealed Rev 1.5 packages a person chose to send over the
--                             channel instead of carrying them as a file.
--
-- The worker (MACHINE, capability audit_evidence.collect) reads the evidence
-- source tables only while an active mandate exists in its scope, and never
-- reads evidence file content.
CREATE TABLE app.audit_mandates (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 engagement_id uuid NOT NULL, kind text NOT NULL CHECK (kind IN ('ENGAGEMENT','CONTINUOUS_ASSURANCE')),
 scope_requirement_ids text[] NOT NULL CHECK (cardinality(scope_requirement_ids) BETWEEN 1 AND 200),
 categories text[] NOT NULL CHECK (cardinality(categories) BETWEEN 1 AND 7 AND categories <@ ARRAY['INDICATORS','CONTROL_STANDING','CONTROL_TESTS','NOTICE_VERSIONS','POLICY_VERSIONS','ACTIVITY_LOG_DIGEST','SAMPLE_COUNTS']),
 schedule text NOT NULL CHECK (schedule IN ('DAILY','WEEKLY')),
 valid_from timestamptz NOT NULL, valid_to timestamptz NOT NULL CHECK (valid_to > valid_from AND valid_to <= valid_from + interval '400 days'),
 organisation_name text NOT NULL CHECK (length(organisation_name) BETWEEN 2 AND 160), installation_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','ACTIVE','SUSPENDED','REVOKED','ENDED')),
 prepared_by uuid NOT NULL, prepared_role text NOT NULL CHECK (prepared_role IN ('ORG_SUPER_ADMIN','ORG_ADMIN','MEMBER')), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_by uuid, approved_role text CHECK (approved_role IN ('ORG_SUPER_ADMIN','ORG_ADMIN')), approved_at timestamptz,
 state_changed_by uuid, state_changed_at timestamptz, state_reason text CHECK (state_reason IS NULL OR length(state_reason) BETWEEN 3 AND 500),
 -- Channel bookkeeping, written by the worker only.
 reported_state text, last_check_in_at timestamptz, next_collection_at timestamptz, channel_problem text CHECK (channel_problem IS NULL OR length(channel_problem) <= 80),
 vendor_next_sequence integer, vendor_last_digest text,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, engagement_id) REFERENCES app.audit_engagements(tenant_id, legal_entity_id, environment_id, id),
 CHECK (approved_by IS NULL OR approved_by <> prepared_by),
 -- A draft is never approved; an active, suspended or ended mandate always was; a revoked one may have been either.
 CHECK ((approved_at IS NULL) = (approved_by IS NULL) AND (state <> 'DRAFT' OR approved_at IS NULL) AND (state NOT IN ('ACTIVE','SUSPENDED','ENDED') OR approved_at IS NOT NULL)));
-- At most one mandate in force (active or suspended) per engagement.
CREATE UNIQUE INDEX audit_mandate_in_force ON app.audit_mandates(tenant_id, legal_entity_id, environment_id, engagement_id) WHERE state IN ('ACTIVE','SUSPENDED');
CREATE TABLE app.audit_channel_keys (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, engagement_id uuid NOT NULL,
 channel_key bytea NOT NULL CHECK (octet_length(channel_key) = 32), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, engagement_id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, engagement_id) REFERENCES app.audit_engagements(tenant_id, legal_entity_id, environment_id, id));
CREATE TABLE app.installation_evidence_keys (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 key_id text NOT NULL CHECK (key_id ~ '^orvia-installation-[a-f0-9]{32}$'), public_key text NOT NULL,
 private_ciphertext bytea NOT NULL, private_nonce bytea NOT NULL, private_tag bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id));
CREATE TABLE app.audit_channel_deliveries (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 mandate_id uuid NOT NULL, engagement_id uuid NOT NULL, sequence integer NOT NULL CHECK (sequence >= 1),
 kind text NOT NULL CHECK (kind IN ('SNAPSHOT','RESPONSE')), request_id uuid,
 period_from timestamptz NOT NULL, period_to timestamptz NOT NULL, entries integer NOT NULL, categories text[] NOT NULL,
 document jsonb NOT NULL, signed jsonb NOT NULL, digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','UNKNOWN','ACCEPTED','REFUSED','FAILED')),
 attempts integer NOT NULL DEFAULT 0, last_error text CHECK (last_error IS NULL OR length(last_error) <= 80),
 receipt jsonb, reasons text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, mandate_id) REFERENCES app.audit_mandates(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((kind = 'RESPONSE') = (request_id IS NOT NULL)),
 CHECK ((state IN ('ACCEPTED','REFUSED')) = (receipt IS NOT NULL)));
CREATE TABLE app.audit_channel_requests (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 engagement_id uuid NOT NULL, mandate_id uuid NOT NULL, kind text NOT NULL CHECK (kind IN ('COLLECT_NOW','SAMPLE_COUNT','EVIDENCE_FILE')),
 requirement_id text, description text NOT NULL, due_date date NOT NULL, request jsonb NOT NULL, signed jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 decision text NOT NULL CHECK (decision IN ('ANSWER_AUTOMATICALLY','AWAITING_CLIENT_APPROVAL','DELIVERED','REFUSED')),
 decision_reason text CHECK (decision_reason IS NULL OR length(decision_reason) <= 80), decided_by uuid, decided_at timestamptz,
 delivery_id uuid, package_id uuid, acknowledged_state text,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, engagement_id) REFERENCES app.audit_engagements(tenant_id, legal_entity_id, environment_id, id));
CREATE TABLE app.audit_package_submissions (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 package_id uuid NOT NULL, engagement_id uuid NOT NULL, request_id uuid, file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[a-f0-9]{64}$'), package_file bytea NOT NULL,
 state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','UNKNOWN','ACCEPTED','QUARANTINED','REFUSED','FAILED')),
 attempts integer NOT NULL DEFAULT 0, last_error text CHECK (last_error IS NULL OR length(last_error) <= 80), receipt jsonb, reasons text[] NOT NULL DEFAULT '{}',
 requested_by uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, package_id) REFERENCES app.audit_packages(tenant_id, legal_entity_id, environment_id, id),
 CHECK (octet_length(package_file) BETWEEN 1 AND 67108864));
CREATE UNIQUE INDEX audit_package_submission_once ON app.audit_package_submissions(tenant_id, legal_entity_id, environment_id, package_id) WHERE state <> 'FAILED';

-- Who is the channel worker, and may it read evidence sources now.
CREATE FUNCTION app.channel_worker() RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT current_setting('orvia.actor_domain', true) = 'MACHINE' AND app.has_capability('audit_evidence.collect') $$;
CREATE FUNCTION app.mandate_collector() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT app.channel_worker() AND EXISTS (SELECT 1 FROM app.audit_mandates m WHERE m.tenant_id = current_setting('orvia.tenant_id', true)::uuid
   AND m.legal_entity_id = current_setting('orvia.legal_entity_id', true)::uuid AND m.environment_id = current_setting('orvia.environment_id', true)::uuid
   AND m.state = 'ACTIVE' AND m.valid_from <= clock_timestamp() AND m.valid_to > clock_timestamp()) $$;
REVOKE ALL ON FUNCTION app.channel_worker(), app.mandate_collector() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.channel_worker(), app.mandate_collector() TO orvia_app, orvia_worker;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['audit_mandates','audit_channel_keys','installation_evidence_keys','audit_channel_deliveries','audit_channel_requests','audit_package_submissions'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC', tab);
  EXECUTE format('CREATE POLICY channel_worker_read ON app.%I FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker())', tab);
 END LOOP;
 -- Staff read everything about the channel except the keys.
 FOREACH tab IN ARRAY ARRAY['audit_mandates','audit_channel_deliveries','audit_channel_requests','audit_package_submissions'] LOOP
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''audit_exchange.read''))', tab);
 END LOOP;
END $$;
CREATE POLICY mandate_draft ON app.audit_mandates FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit_exchange.prepare')
  AND state = 'DRAFT' AND prepared_by::text = current_setting('orvia.actor_id',true) AND prepared_role = current_setting('orvia.role',true));
CREATE POLICY mandate_worker ON app.audit_mandates FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker()) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY channel_key_write ON app.audit_channel_keys FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit_exchange.prepare'));
CREATE POLICY evidence_key_create ON app.installation_evidence_keys FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker());
CREATE POLICY delivery_worker_insert ON app.audit_channel_deliveries FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.mandate_collector());
CREATE POLICY delivery_worker_update ON app.audit_channel_deliveries FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker()) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY request_worker_insert ON app.audit_channel_requests FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker());
CREATE POLICY request_worker_update ON app.audit_channel_requests FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker()) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY submission_worker_update ON app.audit_package_submissions FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker()) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
-- The worker reads the engagement it serves and the package it sends.
CREATE POLICY channel_worker_read ON app.audit_engagements FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker());

GRANT SELECT, INSERT ON app.audit_mandates, app.audit_channel_keys TO orvia_app;
GRANT SELECT ON app.audit_channel_deliveries, app.audit_channel_requests, app.audit_package_submissions TO orvia_app;
GRANT SELECT, UPDATE ON app.audit_mandates TO orvia_worker;
GRANT SELECT ON app.audit_channel_keys, app.audit_engagements TO orvia_worker;
GRANT SELECT, INSERT ON app.installation_evidence_keys TO orvia_worker;
GRANT SELECT, INSERT, UPDATE ON app.audit_channel_deliveries, app.audit_channel_requests TO orvia_worker;
GRANT SELECT, UPDATE ON app.audit_package_submissions TO orvia_worker;

-- Evidence sources the worker may read while an active mandate exists (aggregates are computed in code; file content is never among them).
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['consent_records','consent_record_events','registry_notice_versions','notice_delivery_evidence','workflow_runs','breach_tasks','rights_requests','rights_request_events',
   'retention_holds','sdf_obligations','grc_frameworks','grc_controls','grc_evidence','grc_reviews','control_tests','control_test_runs','grc_policies','audit_events','regulatory_packages','applicability_decisions'] LOOP
  EXECUTE format('CREATE POLICY mandate_collect ON app.%I FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.mandate_collector())', tab);
  EXECUTE format('GRANT SELECT ON app.%I TO orvia_worker', tab);
 END LOOP;
END $$;

-- Mandate bookkeeping by the worker cannot touch what the client signed, and its only state move is ending a mandate whose end date has passed.
CREATE FUNCTION app.audit_mandate_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.engagement_id IS DISTINCT FROM OLD.engagement_id OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.scope_requirement_ids IS DISTINCT FROM OLD.scope_requirement_ids
   OR NEW.categories IS DISTINCT FROM OLD.categories OR NEW.schedule IS DISTINCT FROM OLD.schedule OR NEW.valid_from IS DISTINCT FROM OLD.valid_from OR NEW.valid_to IS DISTINCT FROM OLD.valid_to
   OR NEW.prepared_by IS DISTINCT FROM OLD.prepared_by OR NEW.organisation_name IS DISTINCT FROM OLD.organisation_name OR NEW.installation_id IS DISTINCT FROM OLD.installation_id
   OR (OLD.approved_by IS NOT NULL AND NEW.approved_by IS DISTINCT FROM OLD.approved_by) THEN
  RAISE EXCEPTION 'mandate_terms_immutable' USING ERRCODE = 'P0001', HINT = 'mandate'; END IF;
 IF OLD.state IN ('REVOKED','ENDED') AND NEW.state IS DISTINCT FROM OLD.state THEN RAISE EXCEPTION 'mandate_final' USING ERRCODE = 'P0001', HINT = 'mandate'; END IF;
 IF NEW.state IS DISTINCT FROM OLD.state AND current_setting('orvia.actor_domain', true) = 'MACHINE'
   AND NOT (OLD.state IN ('ACTIVE','SUSPENDED') AND NEW.state = 'ENDED' AND OLD.valid_to <= clock_timestamp()) THEN
  RAISE EXCEPTION 'worker_may_only_end_an_expired_mandate' USING ERRCODE = 'P0001', HINT = 'mandate'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE UPDATE ON app.audit_mandates FOR EACH ROW EXECUTE FUNCTION app.audit_mandate_guard();
CREATE TRIGGER immutable BEFORE DELETE ON app.audit_mandates FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.audit_channel_keys FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.installation_evidence_keys FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE DELETE ON app.audit_channel_deliveries FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE DELETE ON app.audit_channel_requests FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE DELETE ON app.audit_package_submissions FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
-- A signed delivery never changes after it is generated; only its sending state and receipt do.
CREATE FUNCTION app.audit_delivery_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.document IS DISTINCT FROM OLD.document OR NEW.signed IS DISTINCT FROM OLD.signed OR NEW.digest IS DISTINCT FROM OLD.digest OR NEW.sequence IS DISTINCT FROM OLD.sequence THEN
  RAISE EXCEPTION 'delivery_sealed' USING ERRCODE = 'P0001', HINT = 'delivery'; END IF;
 IF OLD.state IN ('ACCEPTED','REFUSED') THEN RAISE EXCEPTION 'delivery_final' USING ERRCODE = 'P0001', HINT = 'delivery'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE UPDATE ON app.audit_channel_deliveries FOR EACH ROW EXECUTE FUNCTION app.audit_delivery_guard();

-- ---------------------------------------------------------------- staff actions (separation of duties checked here)
CREATE FUNCTION app.audit_mandate_approve(p_mandate uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve'); m record;
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 SELECT * INTO m FROM app.audit_mandates WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_mandate FOR UPDATE;
 IF m IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
 IF m.state <> 'DRAFT' THEN RAISE EXCEPTION 'mandate_not_a_draft' USING ERRCODE = 'P0001', HINT = 'mandate'; END IF;
 IF m.prepared_by = c.actor THEN RAISE EXCEPTION 'approver_must_differ_from_preparer' USING ERRCODE = 'P0001', HINT = 'approved_by'; END IF;
 IF m.valid_to <= clock_timestamp() THEN RAISE EXCEPTION 'mandate_already_ended' USING ERRCODE = 'P0001', HINT = 'valid_to'; END IF;
 IF NOT EXISTS (SELECT 1 FROM app.audit_engagements e WHERE e.tenant_id = c.t AND e.legal_entity_id = c.l AND e.environment_id = c.e AND e.id = m.engagement_id AND e.state = 'ACTIVE') THEN
  RAISE EXCEPTION 'engagement_closed' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
 IF NOT EXISTS (SELECT 1 FROM app.audit_channel_keys k WHERE k.tenant_id = c.t AND k.legal_entity_id = c.l AND k.environment_id = c.e AND k.engagement_id = m.engagement_id) THEN
  RAISE EXCEPTION 'channel_not_available_for_this_engagement' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
 IF EXISTS (SELECT 1 FROM app.audit_mandates o WHERE o.tenant_id = c.t AND o.legal_entity_id = c.l AND o.environment_id = c.e AND o.engagement_id = m.engagement_id AND o.state IN ('ACTIVE','SUSPENDED')) THEN
  RAISE EXCEPTION 'another_mandate_in_force_end_it_first' USING ERRCODE = 'P0001', HINT = 'mandate'; END IF;
 UPDATE app.audit_mandates SET state = 'ACTIVE', approved_by = c.actor, approved_role = c.role, approved_at = clock_timestamp(), state_changed_by = c.actor, state_changed_at = clock_timestamp(),
   next_collection_at = greatest(valid_from, clock_timestamp()) WHERE id = p_mandate;
END $$;
CREATE FUNCTION app.audit_mandate_change(p_mandate uuid, p_state text, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve'); m record;
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 IF length(coalesce(p_reason, '')) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001', HINT = 'reason'; END IF;
 SELECT * INTO m FROM app.audit_mandates WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_mandate FOR UPDATE;
 IF m IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
 IF NOT ((m.state = 'ACTIVE' AND p_state IN ('SUSPENDED','REVOKED')) OR (m.state = 'SUSPENDED' AND p_state IN ('ACTIVE','REVOKED')) OR (m.state = 'DRAFT' AND p_state = 'REVOKED')) THEN
  RAISE EXCEPTION 'transition_not_allowed' USING ERRCODE = 'P0001', HINT = 'state'; END IF;
 IF p_state = 'ACTIVE' AND m.valid_to <= clock_timestamp() THEN RAISE EXCEPTION 'mandate_already_ended' USING ERRCODE = 'P0001', HINT = 'valid_to'; END IF;
 UPDATE app.audit_mandates SET state = p_state, state_changed_by = c.actor, state_changed_at = clock_timestamp(), state_reason = p_reason WHERE id = p_mandate;
END $$;
-- A person decides an auditor request only ORVIA could not answer by itself: decline it, or answer it with a sealed package sent over the channel.
CREATE FUNCTION app.audit_request_decide(p_request uuid, p_decision text, p_reason text, p_package uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve'); r record; p record;
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 SELECT * INTO r FROM app.audit_channel_requests WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_request FOR UPDATE;
 IF r IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
 IF r.decision <> 'AWAITING_CLIENT_APPROVAL' THEN RAISE EXCEPTION 'request_already_decided' USING ERRCODE = 'P0001', HINT = 'request'; END IF;
 IF p_decision = 'REFUSED' THEN
  IF length(coalesce(p_reason, '')) NOT BETWEEN 3 AND 80 THEN RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001', HINT = 'reason'; END IF;
  UPDATE app.audit_channel_requests SET decision = 'REFUSED', decision_reason = p_reason, decided_by = c.actor, decided_at = clock_timestamp() WHERE id = p_request;
 ELSIF p_decision = 'PACKAGE' THEN
  SELECT * INTO p FROM app.audit_packages WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_package;
  IF p IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'package_id'; END IF;
  IF p.state <> 'APPROVED' OR p.expires_at <= clock_timestamp() OR p.engagement_id <> r.engagement_id THEN RAISE EXCEPTION 'package_not_sendable' USING ERRCODE = 'P0001', HINT = 'package_id'; END IF;
  UPDATE app.audit_channel_requests SET package_id = p_package, decided_by = c.actor, decided_at = clock_timestamp() WHERE id = p_request;
 ELSE RAISE EXCEPTION 'invalid_decision' USING ERRCODE = 'P0001', HINT = 'decision'; END IF;
END $$;
-- Queues an approved, unexpired package to be sent over the channel; the stored bytes were checked against the sealed hash by the caller.
CREATE FUNCTION app.audit_package_queue_submission(p_submission uuid, p_package uuid, p_request uuid, p_file bytea) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve'); p record;
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 SELECT * INTO p FROM app.audit_packages WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_package;
 IF p IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
 IF p.state <> 'APPROVED' OR p.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'package_not_sendable' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
 IF encode(sha256(p_file), 'hex') <> p.file_sha256 THEN RAISE EXCEPTION 'package_bytes_differ_from_approval' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
 IF NOT EXISTS (SELECT 1 FROM app.audit_channel_keys k WHERE k.tenant_id = c.t AND k.legal_entity_id = c.l AND k.environment_id = c.e AND k.engagement_id = p.engagement_id) THEN
  RAISE EXCEPTION 'channel_not_available_for_this_engagement' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
 INSERT INTO app.audit_package_submissions (tenant_id, legal_entity_id, environment_id, id, package_id, engagement_id, request_id, file_sha256, package_file, requested_by)
 VALUES (c.t, c.l, c.e, p_submission, p_package, p.engagement_id, p_request, p.file_sha256, p_file, c.actor);
END $$;
-- Closing an engagement ends any mandate in force for it, which closes the channel (the worker reports the end once).
CREATE FUNCTION app.audit_engagement_close(p_engagement uuid, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve');
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 IF length(coalesce(p_reason, '')) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001', HINT = 'reason'; END IF;
 UPDATE app.audit_engagements SET state = 'CLOSED' WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_engagement AND state = 'ACTIVE';
 IF NOT FOUND THEN RAISE EXCEPTION 'not_open' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
 UPDATE app.audit_mandates SET state = CASE WHEN state = 'DRAFT' THEN 'REVOKED' ELSE 'ENDED' END, state_changed_by = c.actor, state_changed_at = clock_timestamp(), state_reason = 'Engagement closed: ' || left(p_reason, 470)
  WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND engagement_id = p_engagement AND state IN ('DRAFT','ACTIVE','SUSPENDED');
END $$;
REVOKE ALL ON FUNCTION app.audit_engagement_close(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.audit_engagement_close(uuid,text) TO orvia_app;
-- Whether an engagement has a channel key (engagements registered before revision 1.6 do not); the key itself is never returned.
CREATE FUNCTION app.audit_channel_available(p_engagement uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT app.has_capability('audit_exchange.read') AND EXISTS (SELECT 1 FROM app.audit_channel_keys k WHERE k.tenant_id = current_setting('orvia.tenant_id', true)::uuid
   AND k.legal_entity_id = current_setting('orvia.legal_entity_id', true)::uuid AND k.environment_id = current_setting('orvia.environment_id', true)::uuid AND k.engagement_id = p_engagement) $$;
REVOKE ALL ON FUNCTION app.audit_channel_available(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.audit_channel_available(uuid) TO orvia_app;
-- The installation's public evidence key identifier, for display; the key itself stays with the worker.
CREATE FUNCTION app.installation_evidence_key_id() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT key_id FROM app.installation_evidence_keys WHERE tenant_id = current_setting('orvia.tenant_id', true)::uuid AND legal_entity_id = current_setting('orvia.legal_entity_id', true)::uuid
   AND environment_id = current_setting('orvia.environment_id', true)::uuid AND app.has_capability('audit_exchange.read') $$;
REVOKE ALL ON FUNCTION app.audit_mandate_approve(uuid), app.audit_mandate_change(uuid,text,text), app.audit_request_decide(uuid,text,text,uuid),
  app.audit_package_queue_submission(uuid,uuid,uuid,bytea), app.installation_evidence_key_id(), app.audit_mandate_guard(), app.audit_delivery_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.audit_mandate_approve(uuid), app.audit_mandate_change(uuid,text,text), app.audit_request_decide(uuid,text,text,uuid),
  app.audit_package_queue_submission(uuid,uuid,uuid,bytea), app.installation_evidence_key_id() TO orvia_app;
