-- V1 non-model governance of customer AI uses. These are declared inventory and
-- review records; none is a model runtime or an independently verified effect.
CREATE TABLE app.ai_systems (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, name text NOT NULL, use_case text NOT NULL,
 owner_actor_id uuid NOT NULL, purpose_id uuid NOT NULL, processing_activity_id uuid NOT NULL,
 input_asset_id uuid NOT NULL, output_system_id uuid NOT NULL, processor_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processing_activity_id) REFERENCES app.processing_activities(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,input_asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,output_system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processor_id) REFERENCES app.processors(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX ai_systems_owner ON app.ai_systems(tenant_id,legal_entity_id,environment_id,owner_actor_id);

-- Append-only assessment, policy/control, approval, evidence, monitoring and
-- incident records. A record states what a person entered; it never asserts
-- that an external action was verified. Typed references bind local records.
CREATE TABLE app.ai_governance_events (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, ai_system_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('RISK_ASSESSMENT','POLICY','CONTROL','APPROVAL','EVIDENCE','MONITORING','INCIDENT')),
 state text NOT NULL CHECK(state IN ('RECORDED','NEEDS_REVIEW','APPROVED','REJECTED','FINDING')),
 title text NOT NULL, detail text NOT NULL, source_reference text,
 policy_version_id uuid, incident_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,ai_system_id) REFERENCES app.ai_systems(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,policy_version_id) REFERENCES app.policy_versions(tenant_id,legal_entity_id,environment_id,version_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,incident_id) REFERENCES app.incidents(tenant_id,legal_entity_id,environment_id,id),
 CHECK((kind='POLICY')=(policy_version_id IS NOT NULL)),
 CHECK((kind='INCIDENT')=(incident_id IS NOT NULL)),
 CHECK(kind='APPROVAL' OR state NOT IN ('APPROVED','REJECTED')),
 CHECK(kind='MONITORING' OR state<>'FINDING'));
CREATE INDEX ai_events_by_system ON app.ai_governance_events(tenant_id,legal_entity_id,environment_id,ai_system_id,recorded_at,id);

CREATE FUNCTION app.ai_governance_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'AI governance history is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER ai_system_immutable BEFORE UPDATE OR DELETE ON app.ai_systems FOR EACH ROW EXECUTE FUNCTION app.ai_governance_immutable();
CREATE TRIGGER ai_event_immutable BEFORE UPDATE OR DELETE ON app.ai_governance_events FOR EACH ROW EXECUTE FUNCTION app.ai_governance_immutable();
REVOKE ALL ON FUNCTION app.ai_governance_immutable FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['ai_systems','ai_governance_events'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_ai_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''ai_governance.read''))',tab);
  IF tab='ai_systems' THEN
   EXECUTE format('CREATE POLICY scoped_ai_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''ai_governance.write''))',tab);
  ELSE
   EXECUTE format('CREATE POLICY scoped_ai_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''ai_governance.write'') AND (kind <> ''APPROVAL'' OR app.has_capability(''ai_governance.approve'')))',tab);
  END IF;
 END LOOP;
END $$;
GRANT SELECT,INSERT ON app.ai_systems,app.ai_governance_events TO orvia_app;
REVOKE ALL ON app.ai_systems,app.ai_governance_events FROM PUBLIC;
