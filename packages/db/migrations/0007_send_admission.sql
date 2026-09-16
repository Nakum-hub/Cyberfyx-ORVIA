CREATE TABLE machine_auth.sender_systems (
 identity_id uuid NOT NULL REFERENCES machine_auth.identities(id),
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,system_id uuid NOT NULL,
 PRIMARY KEY(identity_id,system_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));
ALTER TABLE machine_auth.sender_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_auth.sender_systems FORCE ROW LEVEL SECURITY;
CREATE POLICY sender_scope ON machine_auth.sender_systems FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND identity_id::text=current_setting('orvia.actor_id',true) AND app.has_capability('send.admit'));
CREATE TABLE app.service_conditions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,principal_id uuid NOT NULL,purpose_id uuid NOT NULL,system_id uuid NOT NULL,
 policy_version_id uuid NOT NULL,order_reference text NOT NULL CHECK(order_reference ~ '^syn_order_[a-z0-9_]{1,64}$'),
 expires_at timestamptz NOT NULL,active boolean NOT NULL DEFAULT true,synthetic boolean NOT NULL DEFAULT true CHECK(synthetic),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(tenant_id,legal_entity_id,environment_id,order_reference,purpose_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,policy_version_id) REFERENCES app.policy_versions(tenant_id,legal_entity_id,environment_id,version_id));
CREATE TABLE app.processing_decisions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,actor_id uuid NOT NULL,principal_id uuid NOT NULL,purpose_id uuid NOT NULL,system_id uuid NOT NULL,
 policy_version_id uuid,consent_epoch bigint NOT NULL,target_generation bigint NOT NULL,
 decision text NOT NULL CHECK(decision IN ('ALLOW','BLOCK','INDETERMINATE')),reason_codes jsonb NOT NULL,
 preview_only boolean NOT NULL,evaluated_at timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.send_records (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,decision_id uuid NOT NULL,actor_id uuid NOT NULL,principal_id uuid NOT NULL,purpose_id uuid NOT NULL,system_id uuid NOT NULL,
 attempt_id uuid NOT NULL,message_class text NOT NULL CHECK(message_class IN ('MARKETING','ORDER_SERVICE')),
 admitted_at timestamptz NOT NULL,synthetic boolean NOT NULL DEFAULT true CHECK(synthetic),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(decision_id),UNIQUE(tenant_id,legal_entity_id,environment_id,actor_id,attempt_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,decision_id) REFERENCES app.processing_decisions(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.send_attempts (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,actor_id uuid NOT NULL,principal_id uuid NOT NULL,purpose_id uuid NOT NULL,system_id uuid NOT NULL,
 digest text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,actor_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id));
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['service_conditions','processing_decisions','send_records','send_attempts'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''evidence.read''))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['purpose_versions','policy_versions','target_mappings','consent_aggregates','workflows','service_conditions','send_attempts'] LOOP
  EXECUTE format('CREATE POLICY sender_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability(''send.admit''))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['processing_decisions','send_records','send_attempts'] LOOP
  EXECUTE format('CREATE POLICY sender_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability(''send.admit'') AND actor_id::text=current_setting(''orvia.actor_id'',true))',tab);
 END LOOP;
END $$;
CREATE POLICY staff_preview ON app.processing_decisions FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('policy.preview') AND preview_only AND actor_id::text=current_setting('orvia.actor_id',true));
CREATE TABLE app.send_queue (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,actor_id uuid NOT NULL,request jsonb NOT NULL,digest text NOT NULL,result jsonb,
 queued_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,actor_id,id));
ALTER TABLE app.send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.send_queue FORCE ROW LEVEL SECURITY;
CREATE POLICY own_sender_queue ON app.send_queue FOR ALL USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('send.admit') AND actor_id::text=current_setting('orvia.actor_id',true)) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('send.admit') AND actor_id::text=current_setting('orvia.actor_id',true));
REVOKE ALL ON machine_auth.sender_systems FROM PUBLIC;
REVOKE ALL ON app.service_conditions,app.processing_decisions,app.send_records,app.send_attempts FROM PUBLIC;
REVOKE ALL ON app.send_queue FROM PUBLIC;
