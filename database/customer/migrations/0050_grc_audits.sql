CREATE TABLE app.grc_audits (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),CHECK(document->>'id'=id::text));
CREATE TABLE app.grc_audit_requests (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,audit_id uuid NOT NULL,document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,audit_id) REFERENCES app.grc_audits(tenant_id,legal_entity_id,environment_id,id),
 CHECK(document->>'id'=id::text AND document->>'audit_id'=audit_id::text));
CREATE INDEX grc_audit_requests_parent ON app.grc_audit_requests(tenant_id,legal_entity_id,environment_id,audit_id,id);
CREATE TABLE app.grc_audit_responses (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,request_id uuid NOT NULL,evidence_id uuid NOT NULL,document jsonb NOT NULL,sequence bigint GENERATED ALWAYS AS IDENTITY,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,request_id) REFERENCES app.grc_audit_requests(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,evidence_id) REFERENCES app.grc_evidence(tenant_id,legal_entity_id,environment_id,id),
 CHECK(document->>'id'=id::text AND document->>'request_id'=request_id::text AND document->>'evidence_id'=evidence_id::text));
CREATE INDEX grc_audit_response_latest ON app.grc_audit_responses(tenant_id,legal_entity_id,environment_id,request_id,sequence DESC);
CREATE TABLE app.grc_audit_response_reviews (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,response_id uuid NOT NULL,document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),UNIQUE(tenant_id,legal_entity_id,environment_id,response_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,response_id) REFERENCES app.grc_audit_responses(tenant_id,legal_entity_id,environment_id,id),
 CHECK(document->>'id'=id::text AND document->>'response_id'=response_id::text));
CREATE TABLE app.grc_audit_closures (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,audit_id uuid NOT NULL,document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),UNIQUE(tenant_id,legal_entity_id,environment_id,audit_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,audit_id) REFERENCES app.grc_audits(tenant_id,legal_entity_id,environment_id,id),
 CHECK(document->>'id'=id::text AND document->>'audit_id'=audit_id::text));
DO $$ DECLARE tab text;cap text;BEGIN
 FOREACH tab IN ARRAY ARRAY['grc_audits','grc_audit_requests','grc_audit_responses','grc_audit_response_reviews','grc_audit_closures'] LOOP
  cap:=CASE WHEN tab IN ('grc_audit_response_reviews','grc_audit_closures') THEN 'grc.approve' ELSE 'grc.write' END;
  EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.grc_immutable()',tab);
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY grc_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''grc.read''))',tab);
  EXECUTE format('CREATE POLICY grc_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(%L))',tab,cap);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
  EXECUTE format('GRANT SELECT,INSERT ON app.%I TO orvia_app',tab);
 END LOOP;
END $$;
GRANT USAGE ON SEQUENCE app.grc_audit_responses_sequence_seq TO orvia_app;
