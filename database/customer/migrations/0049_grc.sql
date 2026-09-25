-- Framework versions and control/evidence history are immutable. Nothing in
-- these tables constitutes certification or an observed external effect.
CREATE TABLE app.grc_frameworks (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 CHECK(document->>'id'=id::text));
CREATE UNIQUE INDEX grc_framework_version ON app.grc_frameworks
 (tenant_id,legal_entity_id,environment_id,(document->>'name'),(document->>'version'));
CREATE TABLE app.grc_controls (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 CHECK(document->>'id'=id::text));
CREATE TABLE app.grc_evidence (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, control_id uuid NOT NULL, sequence bigint GENERATED ALWAYS AS IDENTITY,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,control_id) REFERENCES app.grc_controls(tenant_id,legal_entity_id,environment_id,id),
 CHECK(document->>'id'=id::text AND document->>'control_id'=control_id::text));
CREATE INDEX grc_evidence_latest ON app.grc_evidence(tenant_id,legal_entity_id,environment_id,control_id,sequence DESC);
CREATE TABLE app.grc_reviews (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, evidence_id uuid NOT NULL, document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,evidence_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,evidence_id) REFERENCES app.grc_evidence(tenant_id,legal_entity_id,environment_id,id),
 CHECK(document->>'id'=id::text AND document->>'evidence_id'=evidence_id::text));
CREATE TABLE app.grc_risks (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 CHECK(document->>'id'=id::text));
CREATE TABLE app.grc_risk_treatments (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, risk_id uuid NOT NULL, sequence bigint GENERATED ALWAYS AS IDENTITY,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,risk_id) REFERENCES app.grc_risks(tenant_id,legal_entity_id,environment_id,id),
 CHECK(document->>'id'=id::text AND document->>'risk_id'=risk_id::text));
CREATE INDEX grc_treatment_latest ON app.grc_risk_treatments(tenant_id,legal_entity_id,environment_id,risk_id,sequence DESC);
CREATE TABLE app.grc_risk_reviews (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, treatment_id uuid NOT NULL, document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,treatment_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,treatment_id) REFERENCES app.grc_risk_treatments(tenant_id,legal_entity_id,environment_id,id),
 CHECK(document->>'id'=id::text AND document->>'treatment_id'=treatment_id::text));
CREATE FUNCTION app.grc_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'GRC history is append-only' USING ERRCODE='23514'; END $$;
REVOKE ALL ON FUNCTION app.grc_immutable FROM PUBLIC;
DO $$ DECLARE tab text; cap text; BEGIN
 FOREACH tab IN ARRAY ARRAY['grc_frameworks','grc_controls','grc_evidence','grc_reviews','grc_risks','grc_risk_treatments','grc_risk_reviews'] LOOP
  cap := CASE WHEN tab IN ('grc_reviews','grc_risk_reviews') THEN 'grc.approve' ELSE 'grc.write' END;
  EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.grc_immutable()',tab);
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY grc_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''grc.read''))',tab);
  EXECUTE format('CREATE POLICY grc_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(%L))',tab,cap);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
  EXECUTE format('GRANT SELECT,INSERT ON app.%I TO orvia_app',tab);
 END LOOP;
END $$;
GRANT USAGE ON SEQUENCE app.grc_evidence_sequence_seq TO orvia_app;
GRANT USAGE ON SEQUENCE app.grc_risk_treatments_sequence_seq TO orvia_app;
