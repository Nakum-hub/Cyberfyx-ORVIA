-- Revision 1.7 (owner decision 2026-09-30, docs/engineering/V1_BASELINE_REV_1_7_ORGANISATION_INTAKE.md).
-- Rule 14(1) of the DPDP Rules, 2025 (official G.S.R. 846(E)): the Data Fiduciary "shall prominently publish on its website or
-- app, or both" the means by which a Data Principal may make a request. The organisation's own website or app is therefore the
-- request channel; its customers do not have to visit a separate ORVIA site.
--
-- 1. Intake keys. Staff create a key for one of the organisation's own applications (a registered system). The application's
--    server sends consent changes and rights requests for its signed-in customers with that key. The key is shown once; only its
--    digest is stored. It can be revoked at once.
-- 2. Intake submissions. A submission is recorded durably as received; nothing else happens in that request. The operations
--    runner (the local WORKER identity) applies it to the registry: a consent change becomes a consent record event (a withdrawal
--    then propagates like any other), a rights request becomes a rights request in the Workspace. A submission that cannot be
--    applied is kept, visibly, with the reason, for staff. The intake key itself can only add and read its own submissions.
-- 3. Privacy Centre switch. The Privacy Centre is optional and off unless staff turn it on for this organisation.
CREATE TABLE app.intake_clients (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
 system_id uuid NOT NULL,
 -- A statement recorded by the member of staff who created the key: the application signs its customers in before it sends
 -- anything for them. It decides whether an intake rights request starts with identity established or awaiting staff review.
 authenticates_customers boolean NOT NULL,
 accepts_consent boolean NOT NULL, accepts_rights boolean NOT NULL,
 token_digest text NOT NULL UNIQUE CHECK (token_digest ~ '^[a-f0-9]{64}$'),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 revoked_at timestamptz, revoked_by uuid, revocation_reason text, last_used_at timestamptz,
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK (accepts_consent OR accepts_rights),
 CHECK ((revoked_at IS NULL) = (revoked_by IS NULL) AND (revoked_at IS NULL) = (revocation_reason IS NULL)));

CREATE TABLE app.intake_submissions (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 client_id uuid NOT NULL,
 kind text NOT NULL CHECK (kind IN ('CONSENT','RIGHTS')),
 idempotency_key text NOT NULL CHECK (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
 request_digest text NOT NULL CHECK (request_digest ~ '^[a-f0-9]{64}$'),
 -- The customer's identifier in the organisation's application (the key's system).
 target_reference text NOT NULL CHECK (target_reference ~ '^[A-Za-z0-9_.:-]{1,120}$'),
 payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','APPLIED','NEEDS_STAFF','HANDLED')),
 outcome_reason text,
 consent_record_id uuid, rights_request_id uuid,
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(), processed_at timestamptz,
 handled_by uuid, handled_note text, handled_at timestamptz,
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 UNIQUE (tenant_id,legal_entity_id,environment_id,client_id,idempotency_key),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,client_id) REFERENCES app.intake_clients(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,consent_record_id) REFERENCES app.consent_records(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,rights_request_id) REFERENCES app.rights_requests(tenant_id,legal_entity_id,environment_id,id),
 CHECK ((status = 'RECEIVED') = (processed_at IS NULL)),
 CHECK (status NOT IN ('NEEDS_STAFF','HANDLED') OR outcome_reason IS NOT NULL),
 CHECK ((status = 'HANDLED') = (handled_at IS NOT NULL) AND (handled_at IS NULL) = (handled_by IS NULL) AND (handled_at IS NULL) = (handled_note IS NULL)));
CREATE INDEX intake_submissions_received ON app.intake_submissions(tenant_id,legal_entity_id,environment_id,received_at,id) WHERE status = 'RECEIVED';
CREATE INDEX intake_submissions_by_time ON app.intake_submissions(tenant_id,legal_entity_id,environment_id,received_at DESC,id DESC);

-- A key is revoked once and never changed otherwise, except for its last-used time.
CREATE FUNCTION app.intake_client_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'intake_client_is_retained' USING ERRCODE = 'P0001'; END IF;
  IF (NEW.tenant_id,NEW.legal_entity_id,NEW.environment_id,NEW.id,NEW.name,NEW.system_id,NEW.authenticates_customers,NEW.accepts_consent,NEW.accepts_rights,NEW.token_digest,NEW.created_by,NEW.created_at)
     IS DISTINCT FROM (OLD.tenant_id,OLD.legal_entity_id,OLD.environment_id,OLD.id,OLD.name,OLD.system_id,OLD.authenticates_customers,OLD.accepts_consent,OLD.accepts_rights,OLD.token_digest,OLD.created_by,OLD.created_at)
     OR (OLD.revoked_at IS NOT NULL AND (NEW.revoked_at,NEW.revoked_by,NEW.revocation_reason) IS DISTINCT FROM (OLD.revoked_at,OLD.revoked_by,OLD.revocation_reason))
  THEN RAISE EXCEPTION 'intake_client_is_immutable' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER intake_client_guard BEFORE UPDATE OR DELETE ON app.intake_clients FOR EACH ROW EXECUTE FUNCTION app.intake_client_guard();
-- What was received is never rewritten: only its processing outcome moves forward, RECEIVED -> APPLIED | NEEDS_STAFF -> HANDLED.
CREATE FUNCTION app.intake_submission_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'intake_submission_is_retained' USING ERRCODE = 'P0001'; END IF;
  IF (NEW.tenant_id,NEW.legal_entity_id,NEW.environment_id,NEW.id,NEW.client_id,NEW.kind,NEW.idempotency_key,NEW.request_digest,NEW.target_reference,NEW.payload,NEW.received_at)
     IS DISTINCT FROM (OLD.tenant_id,OLD.legal_entity_id,OLD.environment_id,OLD.id,OLD.client_id,OLD.kind,OLD.idempotency_key,OLD.request_digest,OLD.target_reference,OLD.payload,OLD.received_at)
     OR NOT ((OLD.status = 'RECEIVED' AND NEW.status IN ('APPLIED','NEEDS_STAFF')) OR (OLD.status = 'NEEDS_STAFF' AND NEW.status = 'HANDLED'))
     OR (OLD.status = 'NEEDS_STAFF' AND (NEW.outcome_reason,NEW.processed_at,NEW.consent_record_id,NEW.rights_request_id) IS DISTINCT FROM (OLD.outcome_reason,OLD.processed_at,OLD.consent_record_id,OLD.rights_request_id))
  THEN RAISE EXCEPTION 'intake_submission_transition_refused' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER intake_submission_guard BEFORE UPDATE OR DELETE ON app.intake_submissions FOR EACH ROW EXECUTE FUNCTION app.intake_submission_guard();
REVOKE ALL ON FUNCTION app.intake_client_guard FROM PUBLIC;
REVOKE ALL ON FUNCTION app.intake_submission_guard FROM PUBLIC;

-- Resolves an active key from its digest before any scope exists, returning only what scopes the application's transaction.
CREATE FUNCTION app.resolve_intake_client(digest text) RETURNS TABLE(id uuid, tenant_id uuid, legal_entity_id uuid, environment_id uuid, accepts_consent boolean, accepts_rights boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT c.id,c.tenant_id,c.legal_entity_id,c.environment_id,c.accepts_consent,c.accepts_rights FROM app.intake_clients c
 WHERE c.token_digest = digest AND c.revoked_at IS NULL $$;
REVOKE ALL ON FUNCTION app.resolve_intake_client(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.resolve_intake_client(text) TO orvia_app;
-- The key the current actor is, or null. Only an INTAKE actor is ever a key.
CREATE FUNCTION app.intake_actor() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN current_setting('orvia.actor_domain',true) = 'MACHINE' AND current_setting('orvia.role',true) = 'INTAKE' AND app.has_capability('intake.submit')
   THEN nullif(current_setting('orvia.actor_id',true),'')::uuid END $$;
REVOKE ALL ON FUNCTION app.intake_actor FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.intake_actor TO orvia_app, orvia_worker;

ALTER TABLE app.intake_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.intake_clients FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON app.intake_clients FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.read'));
CREATE POLICY staff_insert ON app.intake_clients FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true) = 'STAFF' AND app.has_capability('connection.enable'));
CREATE POLICY staff_revoke ON app.intake_clients FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true) = 'STAFF' AND app.has_capability('connection.enable')) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY key_self ON app.intake_clients FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND id = app.intake_actor());
CREATE POLICY key_touch ON app.intake_clients FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND id = app.intake_actor()) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));

ALTER TABLE app.intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.intake_submissions FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON app.intake_submissions FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.read'));
CREATE POLICY staff_handle ON app.intake_submissions FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.write')) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY key_insert ON app.intake_submissions FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND client_id = app.intake_actor() AND status = 'RECEIVED');
CREATE POLICY key_read ON app.intake_submissions FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND client_id = app.intake_actor());
GRANT SELECT, INSERT, UPDATE ON app.intake_clients, app.intake_submissions TO orvia_app;
GRANT SELECT, UPDATE ON app.intake_clients, app.intake_submissions TO orvia_worker;
REVOKE ALL ON app.intake_clients, app.intake_submissions FROM PUBLIC;

-- The runner turns a rights submission into a rights request, and only that: channel ORGANISATION_APP, from a submission of this scope.
CREATE POLICY runner_intake_principal_read ON app.principal_references FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner());
CREATE POLICY runner_intake_principal_insert ON app.principal_references FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner());
CREATE POLICY runner_intake_rights_insert ON app.rights_requests FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner()
  AND document->>'submitted_channel' = 'ORGANISATION_APP' AND state = 'RECEIVED' AND mandate_id IS NULL AND authority = 'SELF');
CREATE POLICY runner_intake_rights_event_insert ON app.rights_request_events FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner()
  AND from_state IS NULL AND to_state = 'RECEIVED');
CREATE POLICY runner_intake_rights_event_read ON app.rights_request_events FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner());
GRANT SELECT, INSERT ON app.principal_references, app.rights_requests, app.rights_request_events TO orvia_worker;

-- Privacy Centre switch: an append-only history per organisation scope; the latest row is in force; no row means off.
CREATE TABLE app.privacy_centre_settings (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 enabled boolean NOT NULL, reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 500),
 changed_by uuid NOT NULL, changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));
CREATE INDEX privacy_centre_latest ON app.privacy_centre_settings(tenant_id,legal_entity_id,environment_id,changed_at DESC,id DESC);
CREATE TRIGGER privacy_centre_settings_append_only BEFORE UPDATE OR DELETE ON app.privacy_centre_settings FOR EACH ROW EXECUTE FUNCTION app.append_only_history();
ALTER TABLE app.privacy_centre_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.privacy_centre_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON app.privacy_centre_settings FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.read'));
CREATE POLICY staff_insert ON app.privacy_centre_settings FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true) = 'STAFF' AND app.has_capability('connection.enable'));
GRANT SELECT, INSERT ON app.privacy_centre_settings TO orvia_app;
REVOKE ALL ON app.privacy_centre_settings FROM PUBLIC;
-- Read by the Data Principal sign-in path before any business transaction exists: one boolean for one scope, nothing else.
CREATE FUNCTION principal_auth.privacy_centre_enabled(t uuid, l uuid, e uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT coalesce((SELECT s.enabled FROM app.privacy_centre_settings s WHERE s.tenant_id = t AND s.legal_entity_id = l AND s.environment_id = e
   ORDER BY s.changed_at DESC, s.id DESC LIMIT 1), false) $$;
REVOKE ALL ON FUNCTION principal_auth.privacy_centre_enabled(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION principal_auth.privacy_centre_enabled(uuid,uuid,uuid) TO orvia_principal_auth;
-- An organisation that already had Privacy Centre accounts before this revision keeps the Privacy Centre on, so an upgrade never
-- silently takes a working channel away from people who use it. A new organisation starts with it off.
INSERT INTO app.privacy_centre_settings(tenant_id,legal_entity_id,environment_id,id,enabled,reason,changed_by)
SELECT DISTINCT a.tenant_id, a.legal_entity_id, a.environment_id, gen_random_uuid(), true,
  'Kept on during the revision 1.7 upgrade: this organisation already had Privacy Centre accounts.', '00000000-0000-0000-0000-000000000000'::uuid
FROM principal_auth.authority a WHERE a.active;
-- What the application may learn about its own submission after it was applied: the consent status or the request state, and
-- nothing else from those records. Only for a submission made with the calling key.
CREATE FUNCTION app.intake_result(submission uuid) RETURNS TABLE(consent_status text, request_state text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT r.current_status, q.state FROM app.intake_submissions s
   LEFT JOIN app.consent_records r ON r.tenant_id=s.tenant_id AND r.legal_entity_id=s.legal_entity_id AND r.environment_id=s.environment_id AND r.id=s.consent_record_id
   LEFT JOIN app.rights_requests q ON q.tenant_id=s.tenant_id AND q.legal_entity_id=s.legal_entity_id AND q.environment_id=s.environment_id AND q.id=s.rights_request_id
 WHERE s.id = submission AND s.client_id = app.intake_actor() AND app.in_scope(s.tenant_id,s.legal_entity_id,s.environment_id) $$;
REVOKE ALL ON FUNCTION app.intake_result(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.intake_result(uuid) TO orvia_app;
