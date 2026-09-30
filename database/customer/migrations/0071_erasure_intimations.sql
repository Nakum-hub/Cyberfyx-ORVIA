-- Rule 8(2) of the DPDP Rules, 2025 (official G.S.R. 846(E), checked 2026-09-30): "At least forty-eight hours before completion of
-- the time period for erasure of personal data under this rule, the Data Fiduciary shall inform the Data Principal that such personal
-- data shall be erased upon completion of such period, unless she logs into her user account or otherwise initiates contact with the
-- Data Fiduciary for the specified purpose or exercises her rights in relation to the processing of such personal data."
-- For a retention rule that cites the Third Schedule, a person is scheduled for erasure only after an intimation recorded here at
-- least 48 hours earlier, and never after she re-engaged. Recording is by staff with the intimation's evidence; ORVIA does not send it.
CREATE TABLE app.erasure_intimations (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 subject_id uuid NOT NULL, rule_id uuid NOT NULL,
 erasure_due_at timestamptz NOT NULL,
 intimated_at timestamptz NOT NULL,
 channel text NOT NULL CHECK (channel IN ('USER_ACCOUNT','EMAIL','SMS','POSTAL','OTHER')),
 evidence_reference text NOT NULL CHECK (length(evidence_reference) BETWEEN 3 AND 500),
 re_engaged_at timestamptz, re_engagement_basis text CHECK (re_engagement_basis IN ('LOGGED_IN','INITIATED_CONTACT','EXERCISED_RIGHTS')),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,rule_id) REFERENCES app.retention_rules(tenant_id,legal_entity_id,environment_id,id),
 CHECK ((re_engaged_at IS NULL) = (re_engagement_basis IS NULL)),
 CHECK (re_engaged_at IS NULL OR re_engaged_at >= intimated_at),
 CHECK (intimated_at <= recorded_at + interval '5 minutes'));
CREATE INDEX erasure_intimations_by_subject ON app.erasure_intimations(tenant_id,legal_entity_id,environment_id,subject_id,rule_id,intimated_at DESC);
-- Only the re-engagement may be recorded later, once; the intimation itself is immutable.
CREATE FUNCTION app.erasure_intimation_update_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF OLD.re_engaged_at IS NOT NULL OR NEW.re_engaged_at IS NULL
     OR (NEW.tenant_id, NEW.legal_entity_id, NEW.environment_id, NEW.id, NEW.subject_id, NEW.rule_id, NEW.erasure_due_at, NEW.intimated_at, NEW.channel, NEW.evidence_reference, NEW.recorded_by, NEW.recorded_at)
        IS DISTINCT FROM (OLD.tenant_id, OLD.legal_entity_id, OLD.environment_id, OLD.id, OLD.subject_id, OLD.rule_id, OLD.erasure_due_at, OLD.intimated_at, OLD.channel, OLD.evidence_reference, OLD.recorded_by, OLD.recorded_at)
  THEN RAISE EXCEPTION 'intimation_is_immutable' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER erasure_intimation_update_guard BEFORE UPDATE ON app.erasure_intimations FOR EACH ROW EXECUTE FUNCTION app.erasure_intimation_update_guard();
CREATE TRIGGER erasure_intimation_no_delete BEFORE DELETE ON app.erasure_intimations FOR EACH ROW EXECUTE FUNCTION app.append_only_history();
REVOKE ALL ON FUNCTION app.erasure_intimation_update_guard FROM PUBLIC;
ALTER TABLE app.erasure_intimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.erasure_intimations FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.erasure_intimations FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.read'));
CREATE POLICY scoped_insert ON app.erasure_intimations FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.write'));
CREATE POLICY scoped_update ON app.erasure_intimations FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.write')) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
GRANT SELECT, INSERT, UPDATE ON app.erasure_intimations TO orvia_app, orvia_worker;
REVOKE ALL ON app.erasure_intimations FROM PUBLIC;
