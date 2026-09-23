-- WP15 / M15 Retention Management.
-- Retention attaches to a copy (a data asset from the M03 graph), never to a
-- vague "record", because a live store, a derived copy and a backup differ in
-- what can be reached and what can be verified.

CREATE TABLE app.retention_constraints (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 data_asset_id uuid NOT NULL,purpose_id uuid NOT NULL,
 trigger text NOT NULL CHECK(trigger IN ('RECORD_CREATED','LAST_INTERACTION','CONSENT_WITHDRAWN','CONTRACT_ENDED','LEGAL_EVENT')),
 basis text NOT NULL CHECK(basis IN ('STATUTORY_OBLIGATION','CONTRACTUAL_NECESSITY','REVIEWED_BUSINESS_NEED','CONSENT')),
 minimum_days integer CHECK(minimum_days IS NULL OR minimum_days BETWEEN 0 AND 36500),
 maximum_days integer CHECK(maximum_days IS NULL OR maximum_days BETWEEN 0 AND 36500),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 -- A constraint that bounds nothing is not a constraint.
 CHECK(minimum_days IS NOT NULL OR maximum_days IS NOT NULL),
 CHECK(minimum_days IS NULL OR maximum_days IS NULL OR minimum_days<=maximum_days));
CREATE INDEX constraints_by_asset ON app.retention_constraints(tenant_id,legal_entity_id,environment_id,data_asset_id);

CREATE TABLE app.legal_holds (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','RELEASED')),
 issued_at timestamptz NOT NULL,review_at timestamptz NOT NULL,
 released_at timestamptz,release_reason text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 CHECK((state='RELEASED')=(released_at IS NOT NULL)),
 CHECK((released_at IS NULL)=(release_reason IS NULL)));

-- A hold covers exactly the copies named here. There is no wildcard scope.
CREATE TABLE app.legal_hold_assets (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 hold_id uuid NOT NULL,data_asset_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,hold_id,data_asset_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,hold_id) REFERENCES app.legal_holds(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX hold_assets_by_asset ON app.legal_hold_assets(tenant_id,legal_entity_id,environment_id,data_asset_id);

-- A reviewed choice between constraints that disagree. One current decision per
-- copy; superseding it appends a new row and supersedes the old one.
CREATE TABLE app.retention_decisions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 data_asset_id uuid NOT NULL,governing_constraint_id uuid NOT NULL,reason text NOT NULL,
 decided_at timestamptz NOT NULL DEFAULT clock_timestamp(),decided_by uuid NOT NULL,superseded boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,governing_constraint_id) REFERENCES app.retention_constraints(tenant_id,legal_entity_id,environment_id,id));
CREATE UNIQUE INDEX one_current_retention_decision ON app.retention_decisions(tenant_id,legal_entity_id,environment_id,data_asset_id) WHERE NOT superseded;

CREATE TABLE app.retention_outcomes (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 data_asset_id uuid NOT NULL,copy_class text NOT NULL,
 result text NOT NULL CHECK(result IN ('SUPPRESSED','DELETED','FAILED','EFFECT_UNKNOWN','NOT_SUPPORTED','RESTORED_TO_QUARANTINE')),
 method text NOT NULL CHECK(method IN ('CONNECTOR_OPERATION','MANUAL_ATTESTATION','NONE')),
 evidence_reference text,note text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id),
 CHECK(NOT(result IN ('SUPPRESSED','DELETED') AND (method='NONE' OR evidence_reference IS NULL))),
 CHECK(NOT(result='EFFECT_UNKNOWN' AND method='NONE')),
 CHECK(NOT(result='NOT_SUPPORTED' AND (method<>'NONE' OR evidence_reference IS NOT NULL))),
 -- A backup is not reachable for verification, so it may never be reported done.
 CHECK(NOT(copy_class='BACKUP_COPY' AND result IN ('SUPPRESSED','DELETED'))));
CREATE INDEX retention_outcomes_by_asset ON app.retention_outcomes(tenant_id,legal_entity_id,environment_id,data_asset_id,recorded_at);

CREATE FUNCTION app.retention_record_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Retention outcomes and decisions are append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER retention_outcome_immutable BEFORE UPDATE OR DELETE ON app.retention_outcomes FOR EACH ROW EXECUTE FUNCTION app.retention_record_is_append_only();
CREATE TRIGGER retention_decision_immutable BEFORE DELETE ON app.retention_decisions FOR EACH ROW EXECUTE FUNCTION app.retention_record_is_append_only();
REVOKE ALL ON FUNCTION app.retention_record_is_append_only FROM PUBLIC;

-- A released hold stays released. Re-imposing one requires a new hold with its
-- own authority reference, so the reason for each period is separately recorded.
CREATE FUNCTION app.released_hold_is_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state='RELEASED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'A released legal hold is terminal' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER released_hold_terminal BEFORE UPDATE ON app.legal_holds FOR EACH ROW EXECUTE FUNCTION app.released_hold_is_terminal();
REVOKE ALL ON FUNCTION app.released_hold_is_terminal FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['retention_constraints','legal_holds','legal_hold_assets','retention_decisions','retention_outcomes'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_retention_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''retention.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_retention_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''retention.write''))',tab);
 END LOOP;
END $$;
-- Releasing a hold and superseding a reviewed decision are approval acts.
CREATE POLICY scoped_hold_release ON app.legal_holds FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('retention.approve'));
CREATE POLICY scoped_decision_supersede ON app.retention_decisions FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('retention.approve'));
GRANT SELECT,INSERT ON app.retention_constraints,app.legal_holds,app.legal_hold_assets,app.retention_decisions,app.retention_outcomes TO orvia_app;
GRANT UPDATE ON app.legal_holds,app.retention_decisions TO orvia_app;
REVOKE ALL ON app.retention_constraints,app.legal_holds,app.legal_hold_assets,app.retention_decisions,app.retention_outcomes FROM PUBLIC;
