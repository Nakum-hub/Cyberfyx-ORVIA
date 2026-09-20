-- WP27 / M31 Updates.
-- The guarantee this schema is built around: an update cannot be recorded as
-- applied until every step succeeded and both post-change checks passed. An
-- interrupted apply therefore stays visibly interrupted instead of decaying
-- into a reassuring "applied" row, and the recovery path is forward.

CREATE TABLE app.release_manifests (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 release_id uuid NOT NULL,version text NOT NULL CHECK(version ~ '^\d+\.\d+\.\d+$'),
 published_at timestamptz NOT NULL,
 artifact_digest text NOT NULL CHECK(artifact_digest ~ '^[a-f0-9]{64}$'),
 artifact_bytes bigint NOT NULL CHECK(artifact_bytes>0),
 signing_key_id uuid NOT NULL,signature text NOT NULL,
 claims jsonb NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT clock_timestamp(),imported_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 -- The same release is imported once, and one version means one manifest.
 UNIQUE(tenant_id,legal_entity_id,environment_id,release_id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,version));

CREATE TABLE app.update_plans (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 manifest_row_id uuid NOT NULL,
 from_version text NOT NULL CHECK(from_version ~ '^\d+\.\d+\.\d+$'),
 to_version text NOT NULL CHECK(to_version ~ '^\d+\.\d+\.\d+$'),
 state text NOT NULL DEFAULT 'APPROVED' CHECK(state IN ('APPROVED','APPLYING','INTERRUPTED','APPLIED','FAILED')),
 -- Derived from the manifest at approval time, never chosen by the operator.
 -- One irreversible migration makes the whole update forward-recovery only.
 recovery_mode text NOT NULL CHECK(recovery_mode IN ('FORWARD_RECOVERY_ONLY','REVERSIBLE')),
 approval_note text NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),approved_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,manifest_row_id) REFERENCES app.release_manifests(tenant_id,legal_entity_id,environment_id,id),
 CHECK(to_version<>from_version));
-- One update at a time. A second plan while one is in flight is a mistake, not
-- a queue.
CREATE UNIQUE INDEX one_plan_in_flight ON app.update_plans(tenant_id,legal_entity_id,environment_id) WHERE state IN ('APPROVED','APPLYING','INTERRUPTED');

-- The migration ledger. Append-only, so an interrupted run leaves its evidence
-- behind rather than being tidied away by the next attempt.
CREATE TABLE app.update_steps (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 plan_id uuid NOT NULL,
 step text NOT NULL CHECK(step IN ('VERIFY_TRUSTED_ORIGIN','VERIFY_ARTIFACT_DIGEST','UNPACK_ARTIFACT','APPLY_MIGRATIONS','RESTART_SERVICES','REVALIDATE_BOUNDARIES','RUN_CORE_REGRESSION')),
 state text NOT NULL CHECK(state IN ('RUNNING','SUCCEEDED','FAILED')),
 evidence_reference text,note text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,plan_id) REFERENCES app.update_plans(tenant_id,legal_entity_id,environment_id,id),
 -- A step that claims success names the evidence for the claim.
 CHECK(NOT(state='SUCCEEDED' AND evidence_reference IS NULL)));
CREATE INDEX steps_by_plan ON app.update_steps(tenant_id,legal_entity_id,environment_id,plan_id,recorded_at);

CREATE TABLE app.installation_versions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 version text NOT NULL CHECK(version ~ '^\d+\.\d+\.\d+$'),
 plan_id uuid,note text NOT NULL,
 applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,plan_id) REFERENCES app.update_plans(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX versions_by_time ON app.installation_versions(tenant_id,legal_entity_id,environment_id,applied_at DESC);

CREATE FUNCTION app.release_manifest_is_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'A release manifest is recorded once and never edited or removed' USING ERRCODE='23514'; END $$;
CREATE TRIGGER manifest_immutable BEFORE UPDATE OR DELETE ON app.release_manifests FOR EACH ROW EXECUTE FUNCTION app.release_manifest_is_immutable();
REVOKE ALL ON FUNCTION app.release_manifest_is_immutable FROM PUBLIC;

CREATE FUNCTION app.update_step_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'The migration ledger is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER step_append_only BEFORE UPDATE OR DELETE ON app.update_steps FOR EACH ROW EXECUTE FUNCTION app.update_step_is_append_only();
REVOKE ALL ON FUNCTION app.update_step_is_append_only FROM PUBLIC;

-- An update is applied only when the ledger says so. Marking a plan applied
-- while a step is missing, failed or still running is refused at the database,
-- so no service — and no maintenance role — can shorten the evidence.
CREATE FUNCTION app.applied_means_every_step_succeeded() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE succeeded integer; BEGIN
 IF NEW.state='APPLIED' AND OLD.state<>'APPLIED' THEN
  SELECT count(DISTINCT step) INTO succeeded FROM app.update_steps
   WHERE tenant_id=NEW.tenant_id AND legal_entity_id=NEW.legal_entity_id AND environment_id=NEW.environment_id
     AND plan_id=NEW.id AND state='SUCCEEDED';
  IF succeeded<7 THEN RAISE EXCEPTION 'An update is applied only when all seven steps have succeeded, including boundary revalidation and core regression' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM app.update_steps WHERE tenant_id=NEW.tenant_id AND legal_entity_id=NEW.legal_entity_id AND environment_id=NEW.environment_id AND plan_id=NEW.id AND state='FAILED'
    AND step NOT IN (SELECT step FROM app.update_steps WHERE tenant_id=NEW.tenant_id AND legal_entity_id=NEW.legal_entity_id AND environment_id=NEW.environment_id AND plan_id=NEW.id AND state='SUCCEEDED'))
   THEN RAISE EXCEPTION 'A step that failed and was never retried successfully blocks an applied update' USING ERRCODE='23514'; END IF;
 END IF;
 IF OLD.state IN ('APPLIED','FAILED') AND NEW.state IS DISTINCT FROM OLD.state
   THEN RAISE EXCEPTION 'A finished update plan does not change state again' USING ERRCODE='23514'; END IF;
 IF NEW.recovery_mode IS DISTINCT FROM OLD.recovery_mode
   THEN RAISE EXCEPTION 'Recovery mode is derived from the manifest and cannot be relaxed afterwards' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER plan_applied_needs_evidence BEFORE UPDATE ON app.update_plans FOR EACH ROW EXECUTE FUNCTION app.applied_means_every_step_succeeded();
REVOKE ALL ON FUNCTION app.applied_means_every_step_succeeded FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['release_manifests','update_plans','update_steps','installation_versions'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_update_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''update.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_update_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''update.approve''))',tab);
 END LOOP;
END $$;
CREATE POLICY scoped_plan_update ON app.update_plans FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('update.approve'));

GRANT SELECT,INSERT ON app.release_manifests,app.update_plans,app.update_steps,app.installation_versions TO orvia_app;
GRANT UPDATE ON app.update_plans TO orvia_app;
REVOKE ALL ON app.release_manifests,app.update_plans,app.update_steps,app.installation_versions FROM PUBLIC;
