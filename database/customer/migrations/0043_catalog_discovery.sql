-- A reviewed, exact relation allowlist for local PostgreSQL metadata reads.
-- No row values, credentials, arbitrary queries, hosts or URLs enter this state.
CREATE TABLE app.catalog_discovery_targets (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,system_id uuid NOT NULL,
 schema_name text NOT NULL CHECK(schema_name ~ '^[a-z][a-z0-9_]{0,62}$'),
 relation_name text NOT NULL CHECK(relation_name ~ '^[a-z][a-z0-9_]{0,62}$'),
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','APPROVED','DISABLED')),
 created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_by uuid,approved_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,system_id,schema_name,relation_name),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id)
   REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state<>'PENDING')=(approved_by IS NOT NULL AND approved_at IS NOT NULL)),
 CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE TABLE app.catalog_discovery_jobs (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 target_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'READY' CHECK(state IN ('READY','RETRY','EXHAUSTED')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 next_run_at timestamptz NOT NULL DEFAULT clock_timestamp(),last_run_at timestamptz,
 last_error_code text,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,target_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,target_id)
   REFERENCES app.catalog_discovery_targets(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='EXHAUSTED')=(attempts=3)),
 CHECK((state='READY')=(attempts=0)),
 CHECK((state='READY')=(last_error_code IS NULL))
);
CREATE INDEX catalog_discovery_due ON app.catalog_discovery_jobs(tenant_id,legal_entity_id,environment_id,next_run_at)
 WHERE state<>'EXHAUSTED';
CREATE TABLE app.catalog_discovery_observations (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,target_id uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('OBSERVED_METADATA','MISSING','TRUNCATED')),
 observed_at timestamptz NOT NULL,digest text CHECK(digest IS NULL OR digest ~ '^[a-f0-9]{64}$'),
 columns jsonb NOT NULL CHECK(jsonb_typeof(columns)='array'),
 limits jsonb NOT NULL CHECK(jsonb_typeof(limits)='array'),
 recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,target_id)
   REFERENCES app.catalog_discovery_targets(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='OBSERVED_METADATA')=(digest IS NOT NULL))
);
CREATE INDEX catalog_discovery_history ON app.catalog_discovery_observations(tenant_id,legal_entity_id,environment_id,target_id,observed_at DESC,id);
CREATE FUNCTION app.catalog_observation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Catalog observations are append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER catalog_observation_no_change BEFORE UPDATE OR DELETE ON app.catalog_discovery_observations
 FOR EACH ROW EXECUTE FUNCTION app.catalog_observation_immutable();
REVOKE ALL ON FUNCTION app.catalog_observation_immutable FROM PUBLIC;
CREATE FUNCTION app.catalog_target_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.tenant_id,NEW.legal_entity_id,NEW.environment_id,NEW.id,NEW.system_id,NEW.schema_name,NEW.relation_name,NEW.created_by,NEW.created_at)
  IS DISTINCT FROM (OLD.tenant_id,OLD.legal_entity_id,OLD.environment_id,OLD.id,OLD.system_id,OLD.schema_name,OLD.relation_name,OLD.created_by,OLD.created_at)
  OR NOT ((OLD.state='PENDING' AND NEW.state='APPROVED' AND NEW.approved_by IS NOT NULL AND NEW.approved_by<>OLD.created_by)
       OR (OLD.state='APPROVED' AND NEW.state='DISABLED' AND NEW.approved_by=OLD.approved_by AND NEW.approved_at=OLD.approved_at))
 THEN RAISE EXCEPTION 'Catalog target transition denied' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER catalog_target_guard BEFORE UPDATE ON app.catalog_discovery_targets
 FOR EACH ROW EXECUTE FUNCTION app.catalog_target_transition();
REVOKE ALL ON FUNCTION app.catalog_target_transition FROM PUBLIC;

ALTER TABLE app.catalog_discovery_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.catalog_discovery_targets FORCE ROW LEVEL SECURITY;
ALTER TABLE app.catalog_discovery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.catalog_discovery_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE app.catalog_discovery_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.catalog_discovery_observations FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_target_staff_read ON app.catalog_discovery_targets FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.read'));
CREATE POLICY catalog_target_staff_insert ON app.catalog_discovery_targets FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.write') AND state='PENDING');
CREATE POLICY catalog_target_staff_approve ON app.catalog_discovery_targets FOR UPDATE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('connection.enable'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.has_capability('connection.enable'));
CREATE POLICY catalog_target_worker_read ON app.catalog_discovery_targets FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));

CREATE POLICY catalog_job_staff_read ON app.catalog_discovery_jobs FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.read'));
CREATE POLICY catalog_job_staff_insert ON app.catalog_discovery_jobs FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('connection.enable'));
CREATE POLICY catalog_job_worker_read ON app.catalog_discovery_jobs FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
CREATE POLICY catalog_job_worker_update ON app.catalog_discovery_jobs FOR UPDATE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope());

CREATE POLICY catalog_observation_staff_read ON app.catalog_discovery_observations FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.read'));
CREATE POLICY catalog_observation_worker_read ON app.catalog_discovery_observations FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
CREATE POLICY catalog_observation_worker_insert ON app.catalog_discovery_observations FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));

GRANT SELECT,INSERT,UPDATE ON app.catalog_discovery_targets TO orvia_app;
GRANT SELECT,INSERT ON app.catalog_discovery_jobs TO orvia_app;
GRANT SELECT ON app.catalog_discovery_observations TO orvia_app;
GRANT SELECT ON app.catalog_discovery_targets TO orvia_worker;
GRANT SELECT,UPDATE ON app.catalog_discovery_jobs TO orvia_worker;
GRANT SELECT,INSERT ON app.catalog_discovery_observations TO orvia_worker;
REVOKE ALL ON app.catalog_discovery_targets,app.catalog_discovery_jobs,app.catalog_discovery_observations FROM PUBLIC;
