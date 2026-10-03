-- Custom-model version governance for the organisation's own AI systems (EX12; master §§ AI governance). ORVIA records and gates
-- the organisation's model versions; it never trains, runs or evaluates a model (ORVIA's own model functions remain V2).
-- A version records the datasets it was trained on, the purpose and basis for that training, when the training data was taken,
-- its evaluation evidence and known limitations. One person records it; a different person with approval authority approves it,
-- only when every training dataset is mapped to an activity serving the training purpose and the AI use has no open finding.
-- Only an approved version can be deployed; deploying one retires the version previously deployed for the same AI system.
-- After deployment, consent withdrawn for the training purpose after the data cut-off is reported for a retraining decision:
-- ORVIA never claims a model has "forgotten" anyone (master §52: machine-unlearning claims are outside supported coverage).
CREATE TABLE app.ai_model_versions (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 ai_system_id uuid NOT NULL, version_label text NOT NULL CHECK (length(btrim(version_label)) BETWEEN 1 AND 80),
 model_kind text NOT NULL CHECK (model_kind IN ('CUSTOM_TRAINED', 'FINE_TUNED', 'THIRD_PARTY_HOSTED', 'RULE_BASED')),
 training_asset_ids uuid[] NOT NULL CHECK (cardinality(training_asset_ids) BETWEEN 0 AND 50),
 training_purpose_id uuid NOT NULL, training_basis text NOT NULL CHECK (length(btrim(training_basis)) BETWEEN 10 AND 1000),
 training_data_as_of timestamptz NOT NULL,
 evaluation_reference text NOT NULL CHECK (length(btrim(evaluation_reference)) BETWEEN 3 AND 500),
 evaluation_summary text NOT NULL CHECK (length(btrim(evaluation_summary)) BETWEEN 10 AND 2000),
 known_limitations text NOT NULL CHECK (length(btrim(known_limitations)) BETWEEN 10 AND 2000),
 state text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT', 'APPROVED', 'DEPLOYED', 'RETIRED')),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_by uuid, approved_at timestamptz, deployed_by uuid, deployed_at timestamptz, retired_at timestamptz,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 UNIQUE (tenant_id, legal_entity_id, environment_id, ai_system_id, version_label),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, ai_system_id) REFERENCES app.ai_systems(tenant_id, legal_entity_id, environment_id, id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, training_purpose_id) REFERENCES app.purpose_versions(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((approved_at IS NULL) = (approved_by IS NULL)), CHECK (approved_by IS NULL OR approved_by <> recorded_by),
 CHECK ((deployed_at IS NULL) = (deployed_by IS NULL)), CHECK (deployed_at IS NULL OR approved_at IS NOT NULL),
 CHECK (state = 'DRAFT' OR approved_at IS NOT NULL), CHECK ((state = 'RETIRED') = (retired_at IS NOT NULL)));
CREATE UNIQUE INDEX ai_model_versions_one_deployed ON app.ai_model_versions(tenant_id, legal_entity_id, environment_id, ai_system_id) WHERE state = 'DEPLOYED';

CREATE FUNCTION app.ai_model_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'model_version_is_retained' USING ERRCODE = '23514'; END IF;
 IF (to_jsonb(NEW) - 'state' - 'approved_by' - 'approved_at' - 'deployed_by' - 'deployed_at' - 'retired_at')
    IS DISTINCT FROM (to_jsonb(OLD) - 'state' - 'approved_by' - 'approved_at' - 'deployed_by' - 'deployed_at' - 'retired_at')
    OR NOT ((OLD.state = 'DRAFT' AND NEW.state IN ('APPROVED', 'RETIRED')) OR (OLD.state = 'APPROVED' AND NEW.state IN ('DEPLOYED', 'RETIRED')) OR (OLD.state = 'DEPLOYED' AND NEW.state = 'RETIRED'))
    OR (OLD.approved_at IS NOT NULL AND (NEW.approved_at, NEW.approved_by) IS DISTINCT FROM (OLD.approved_at, OLD.approved_by))
 THEN RAISE EXCEPTION 'model_version_transition_refused' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.ai_model_versions FOR EACH ROW EXECUTE FUNCTION app.ai_model_version_guard();
REVOKE ALL ON FUNCTION app.ai_model_version_guard() FROM PUBLIC;

ALTER TABLE app.ai_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_model_versions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.ai_model_versions FROM PUBLIC;
CREATE POLICY scoped_read ON app.ai_model_versions FOR SELECT USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('ai_governance.read'));
CREATE POLICY scoped_record ON app.ai_model_versions FOR INSERT WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('ai_governance.write') AND state = 'DRAFT');
CREATE POLICY scoped_decide ON app.ai_model_versions FOR UPDATE USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF'
  AND (app.has_capability('ai_governance.approve') OR app.has_capability('ai_governance.write'))) WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id));
GRANT SELECT, INSERT, UPDATE ON app.ai_model_versions TO orvia_app;
