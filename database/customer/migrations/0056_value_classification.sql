-- EX04 value classification and EX12 access exposure over approved catalog targets.
-- Sampling values is more intrusive than reading metadata, so each run is
-- requested by someone who can enable connections and executed by the worker
-- through the read-only observer role. A run stores counts, decisions and the
-- relation's grants, never a sampled value. Labels are reviewed statements of a
-- column's true category; a quality measurement compares a completed run with
-- the labels in force and is kept as evidence of how well the rules performed.
CREATE TABLE app.classification_runs (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, target_id uuid NOT NULL, sample_limit integer NOT NULL CHECK(sample_limit BETWEEN 1 AND 1000),
 state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','COMPLETED','FAILED')),
 requested_by uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 ruleset text, observed_at timestamptz, relation_state text CHECK(relation_state IS NULL OR relation_state IN ('CLASSIFIED','MISSING','EMPTY')),
 rows_sampled integer CHECK(rows_sampled IS NULL OR rows_sampled>=0), columns jsonb, grants jsonb, owner text, limits jsonb,
 failure_code text, attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3), recorded_by uuid,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,target_id) REFERENCES app.catalog_discovery_targets(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='COMPLETED')=(observed_at IS NOT NULL AND columns IS NOT NULL AND grants IS NOT NULL AND ruleset IS NOT NULL)),
 CHECK((state='FAILED')=(failure_code IS NOT NULL)));
CREATE UNIQUE INDEX classification_run_queued ON app.classification_runs(tenant_id,legal_entity_id,environment_id,target_id) WHERE state='QUEUED';
CREATE INDEX classification_run_latest ON app.classification_runs(tenant_id,legal_entity_id,environment_id,target_id,requested_at DESC);
CREATE TABLE app.classification_labels (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, target_id uuid NOT NULL, column_name text NOT NULL CHECK(column_name ~ '^[a-z][a-z0-9_]{0,62}$'),
 expected text NOT NULL CHECK(expected IN ('EMAIL','PHONE_IN','PAN','AADHAAR','PAYMENT_CARD','IFSC','IPV4','NONE')),
 basis text NOT NULL, labelled_by uuid NOT NULL, labelled_at timestamptz NOT NULL DEFAULT clock_timestamp(), sequence bigserial NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,target_id) REFERENCES app.catalog_discovery_targets(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX classification_label_latest ON app.classification_labels(tenant_id,legal_entity_id,environment_id,target_id,column_name,sequence DESC);
CREATE TABLE app.classification_quality (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, run_id uuid NOT NULL, ruleset text NOT NULL, measurement jsonb NOT NULL, recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,run_id) REFERENCES app.classification_runs(tenant_id,legal_entity_id,environment_id,id));

CREATE FUNCTION app.classification_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Classification records are never deleted' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME<>'classification_runs' THEN RAISE EXCEPTION 'Labels and quality measurements are append-only' USING ERRCODE='23514'; END IF;
 IF (NEW.id,NEW.target_id,NEW.sample_limit,NEW.requested_by,NEW.requested_at) IS DISTINCT FROM (OLD.id,OLD.target_id,OLD.sample_limit,OLD.requested_by,OLD.requested_at)
    OR OLD.state<>'QUEUED' OR NEW.attempts<OLD.attempts
 THEN RAISE EXCEPTION 'A classification run is completed or failed once' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.classification_guard FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['classification_runs','classification_labels','classification_quality'] LOOP
  EXECUTE format('CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.classification_guard()',tab);
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''graph.read''))',tab);
 END LOOP;
END $$;
CREATE POLICY staff_request ON app.classification_runs FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('connection.enable') AND state='QUEUED' AND requested_by::text=current_setting('orvia.actor_id',true));
CREATE POLICY worker_read ON app.classification_runs FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
CREATE POLICY worker_complete ON app.classification_runs FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope());
CREATE POLICY staff_label ON app.classification_labels FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.write') AND labelled_by::text=current_setting('orvia.actor_id',true));
CREATE POLICY staff_measure ON app.classification_quality FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.write') AND recorded_by::text=current_setting('orvia.actor_id',true));
GRANT SELECT,INSERT ON app.classification_runs, app.classification_labels, app.classification_quality TO orvia_app;
GRANT USAGE ON SEQUENCE app.classification_labels_sequence_seq TO orvia_app;
GRANT SELECT,UPDATE ON app.classification_runs TO orvia_worker;
GRANT SELECT ON app.catalog_discovery_targets TO orvia_worker;
