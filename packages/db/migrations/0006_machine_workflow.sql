CREATE SCHEMA machine_auth;
CREATE TABLE machine_auth.identities (
 id uuid PRIMARY KEY, installation_id uuid NOT NULL, tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('AGENT','WORKER','SENDER')), token_digest text UNIQUE, expires_at timestamptz NOT NULL,
 active boolean NOT NULL DEFAULT true,
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));
REVOKE ALL ON SCHEMA machine_auth FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA machine_auth FROM PUBLIC;
ALTER TABLE machine_auth.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_auth.identities FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_identity ON machine_auth.identities FOR SELECT USING(current_user='orvia_machine_auth' OR
 (id::text=current_setting('orvia.actor_id',true) AND app.in_scope(tenant_id,legal_entity_id,environment_id)));
CREATE TABLE app.action_plans (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, workflow_id uuid NOT NULL, principal_id uuid NOT NULL, system_id uuid NOT NULL, resource_id uuid NOT NULL,
 binding jsonb NOT NULL, plan_digest text NOT NULL, execution_state text NOT NULL DEFAULT 'PENDING'
 CHECK(execution_state IN ('PENDING','RUNNING','ACKNOWLEDGED','EFFECT_UNKNOWN','FAILED','MANUAL_REQUIRED','SKIPPED')),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(workflow_id,system_id,resource_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,workflow_id) REFERENCES app.workflows(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,resource_id) REFERENCES app.target_mappings(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.agent_commands (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, action_id uuid NOT NULL, principal_id uuid NOT NULL, agent_id uuid NOT NULL REFERENCES machine_auth.identities(id),
 command jsonb NOT NULL, command_digest text NOT NULL, created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(action_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,action_id) REFERENCES app.action_plans(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.command_receipts (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, action_id uuid NOT NULL, principal_id uuid NOT NULL, command_id uuid NOT NULL, receipt jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(command_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,command_id) REFERENCES app.agent_commands(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.observations (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, action_id uuid NOT NULL, principal_id uuid NOT NULL, observation jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,action_id) REFERENCES app.action_plans(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.obligations (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, workflow_id uuid NOT NULL, principal_id uuid NOT NULL, action_id uuid, system_id uuid NOT NULL,
 required boolean NOT NULL, criterion text NOT NULL CHECK(criterion IN ('CURRENT_SCOPED_OBSERVATION','ATTRIBUTED_MANUAL_ATTESTATION')),
 manual_version bigint NOT NULL DEFAULT 0, attestation jsonb,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(workflow_id,system_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,workflow_id) REFERENCES app.workflows(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,action_id) REFERENCES app.action_plans(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));
CREATE FUNCTION app.machine_scope() RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT current_setting('orvia.actor_domain',true)='MACHINE' $$;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['action_plans','agent_commands','command_receipts','observations','obligations'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''workflow.read''))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['purpose_versions','notice_versions','policy_versions','policy_systems','policy_approvals','systems','target_mappings','consent_aggregates','consent_events','workflows','outbox_events','action_plans','agent_commands','command_receipts','observations','obligations'] LOOP
  EXECUTE format('CREATE POLICY worker_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability(''workflow.execute''))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['action_plans','agent_commands','observations','obligations'] LOOP
  EXECUTE format('CREATE POLICY worker_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability(''workflow.execute''))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['action_plans','workflows','outbox_events'] LOOP
  EXECUTE format('CREATE POLICY worker_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability(''workflow.execute'')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['policy_versions','policy_approvals','target_mappings','consent_aggregates','systems'] LOOP
  EXECUTE format('CREATE POLICY agent_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability(''target.execute''))',tab);
 END LOOP;
END $$;
CREATE POLICY agent_poll ON app.agent_commands FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND agent_id::text=current_setting('orvia.actor_id',true) AND app.has_capability('target.execute'));
CREATE POLICY agent_receipt_read ON app.command_receipts FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('target.execute') AND EXISTS(SELECT 1 FROM app.agent_commands c WHERE c.id=command_id AND c.agent_id::text=current_setting('orvia.actor_id',true)));
CREATE POLICY agent_receipt_insert ON app.command_receipts FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('target.execute') AND EXISTS(SELECT 1 FROM app.agent_commands c WHERE c.id=command_id AND c.agent_id::text=current_setting('orvia.actor_id',true)));
CREATE FUNCTION app.immutable_plan() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'execution_state') IS DISTINCT FROM (to_jsonb(OLD)-'execution_state') THEN
  RAISE EXCEPTION 'Action plan is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER immutable BEFORE UPDATE ON app.action_plans FOR EACH ROW EXECUTE FUNCTION app.immutable_plan();
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
