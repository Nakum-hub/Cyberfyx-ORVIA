-- Website privacy-policy discovery (EX02 website controls / EX04 discovery; master §§33, 36, 37).
-- For an enabled website whose origins a second person approved, the worker reads one page (the origin's home page) and asks
-- the site where its privacy policy is, the way the site itself declares it: the registered HTML link type
-- <link rel="privacy-policy" href="…">. Only when no declaration exists does it fall back to a link on that same page whose
-- text names the privacy policy, and says so. It then reads that one document, if it is on an approved origin, keeps its text
-- and a digest, and compares it with the previous discovery for the site. Nothing else on the site is crawled.
-- A policy on another origin is reported, never fetched. Discoveries are queued by staff or weekly by the worker; a
-- completed discovery is immutable except for one staff review (who, when, note), so a change is acknowledged, not erased.
CREATE TABLE app.policy_discoveries (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, site_id uuid NOT NULL, origin text NOT NULL CHECK (length(origin) <= 300),
 trigger text NOT NULL CHECK (trigger IN ('STAFF', 'SCHEDULE')),
 state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED', 'COMPLETED', 'FAILED')),
 requested_by uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
 observed_at timestamptz, failure_code text CHECK (failure_code IS NULL OR length(failure_code) <= 80),
 results jsonb, policy_text text CHECK (policy_text IS NULL OR length(policy_text) <= 200000),
 text_digest text CHECK (text_digest IS NULL OR text_digest ~ '^[a-f0-9]{64}$'),
 reviewed_by uuid, reviewed_at timestamptz, review_note text CHECK (review_note IS NULL OR length(btrim(review_note)) BETWEEN 3 AND 1000),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, site_id) REFERENCES app.cmp_sites(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((state = 'COMPLETED') = (results IS NOT NULL AND observed_at IS NOT NULL)), CHECK ((state = 'FAILED') = (failure_code IS NOT NULL)),
 CHECK ((reviewed_at IS NULL) = (reviewed_by IS NULL) AND (reviewed_at IS NULL) = (review_note IS NULL)), CHECK (reviewed_at IS NULL OR state = 'COMPLETED'));
CREATE UNIQUE INDEX policy_discoveries_one_queued ON app.policy_discoveries(tenant_id, legal_entity_id, environment_id, site_id) WHERE state = 'QUEUED';
CREATE INDEX policy_discoveries_by_site ON app.policy_discoveries(tenant_id, legal_entity_id, environment_id, site_id, requested_at DESC);

CREATE FUNCTION app.policy_discovery_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'policy_discovery_is_retained' USING ERRCODE = '23514'; END IF;
 IF (NEW.id, NEW.site_id, NEW.origin, NEW.trigger, NEW.requested_by, NEW.requested_at) IS DISTINCT FROM (OLD.id, OLD.site_id, OLD.origin, OLD.trigger, OLD.requested_by, OLD.requested_at)
 THEN RAISE EXCEPTION 'policy_discovery_transition_refused' USING ERRCODE = '23514'; END IF;
 IF OLD.state = 'QUEUED' THEN
  IF NEW.attempts < OLD.attempts OR NEW.reviewed_at IS NOT NULL THEN RAISE EXCEPTION 'policy_discovery_transition_refused' USING ERRCODE = '23514'; END IF;
 ELSIF OLD.state = 'COMPLETED' AND OLD.reviewed_at IS NULL AND NEW.reviewed_at IS NOT NULL THEN
  -- The one permitted change to a completed discovery: its review.
  IF (NEW.state, NEW.attempts, NEW.observed_at, NEW.failure_code, NEW.results, NEW.policy_text, NEW.text_digest)
     IS DISTINCT FROM (OLD.state, OLD.attempts, OLD.observed_at, OLD.failure_code, OLD.results, OLD.policy_text, OLD.text_digest)
  THEN RAISE EXCEPTION 'policy_discovery_transition_refused' USING ERRCODE = '23514'; END IF;
 ELSE RAISE EXCEPTION 'policy_discovery_transition_refused' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.policy_discoveries FOR EACH ROW EXECUTE FUNCTION app.policy_discovery_guard();
REVOKE ALL ON FUNCTION app.policy_discovery_guard() FROM PUBLIC;

ALTER TABLE app.policy_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.policy_discoveries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.policy_discoveries FROM PUBLIC;
CREATE POLICY staff_read ON app.policy_discoveries FOR SELECT USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.read'));
CREATE POLICY staff_request ON app.policy_discoveries FOR INSERT WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.write') AND state = 'QUEUED' AND trigger = 'STAFF');
CREATE POLICY staff_review ON app.policy_discoveries FOR UPDATE USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.write')) WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id));
CREATE POLICY worker_read ON app.policy_discoveries FOR SELECT USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
CREATE POLICY worker_schedule ON app.policy_discoveries FOR INSERT WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute') AND state = 'QUEUED' AND trigger = 'SCHEDULE');
CREATE POLICY worker_complete ON app.policy_discoveries FOR UPDATE USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute')) WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id));
GRANT SELECT, INSERT, UPDATE ON app.policy_discoveries TO orvia_app;
GRANT SELECT, INSERT, UPDATE ON app.policy_discoveries TO orvia_worker;
