ALTER TABLE machine_auth.identities DROP CONSTRAINT identities_kind_check;
ALTER TABLE machine_auth.identities ADD CHECK(kind IN ('AGENT','WORKER','SENDER','OBSERVER'));
ALTER TABLE app.observations ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE TABLE app.reconciliations (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,action_id uuid NOT NULL,principal_id uuid NOT NULL,requester_id uuid NOT NULL,
 document jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),dispatched_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,action_id) REFERENCES app.action_plans(tenant_id,legal_entity_id,environment_id,id));
CREATE UNIQUE INDEX active_reconciliation ON app.reconciliations(action_id) WHERE document->>'state' IN ('PENDING','RECONCILING');
CREATE TABLE app.system_checks (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 id uuid NOT NULL,system_id uuid NOT NULL,checked_at timestamptz NOT NULL,supports_read boolean NOT NULL,supports_restrict boolean NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.workflow_assignments (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,workflow_id uuid NOT NULL,staff_actor_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,workflow_id,staff_actor_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,workflow_id) REFERENCES app.workflows(tenant_id,legal_entity_id,environment_id,id));
ALTER TABLE app.workflow_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.workflow_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY own_assignment ON app.workflow_assignments FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND staff_actor_id::text=current_setting('orvia.actor_id',true));
CREATE FUNCTION app.allowed_workflow(w uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT coalesce(current_setting('orvia.role',true),'')<>'MEMBER' OR EXISTS(SELECT 1 FROM app.workflow_assignments a WHERE a.workflow_id=w) $$;
CREATE POLICY assigned_only ON app.workflows AS RESTRICTIVE USING(app.allowed_workflow(id));
CREATE POLICY assigned_only ON app.action_plans AS RESTRICTIVE USING(app.allowed_workflow(workflow_id));
CREATE POLICY assigned_only ON app.obligations AS RESTRICTIVE USING(app.allowed_workflow(workflow_id));
CREATE POLICY assigned_only ON app.consent_events AS RESTRICTIVE USING(coalesce(current_setting('orvia.role',true),'')<>'MEMBER' OR EXISTS(SELECT 1 FROM app.workflows w WHERE w.event_id=consent_events.id));
CREATE POLICY assigned_only ON app.consent_aggregates AS RESTRICTIVE USING(coalesce(current_setting('orvia.role',true),'')<>'MEMBER' OR EXISTS(SELECT 1 FROM app.workflows w WHERE w.principal_id=consent_aggregates.principal_id AND w.purpose_id=consent_aggregates.purpose_id));
CREATE POLICY assigned_mapping ON app.target_mappings FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.role',true)='MEMBER' AND EXISTS(SELECT 1 FROM app.action_plans p WHERE p.resource_id=target_mappings.id));
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['agent_commands','command_receipts','observations'] LOOP
  EXECUTE format('CREATE POLICY assigned_only ON app.%I AS RESTRICTIVE USING(coalesce(current_setting(''orvia.role'',true),'''')<>''MEMBER'' OR EXISTS(SELECT 1 FROM app.action_plans p WHERE p.id=action_id))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['reconciliations','system_checks'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND (app.has_capability(''workflow.read'') OR app.has_capability(''configuration.read'')))',tab);
 END LOOP;
END $$;
CREATE POLICY assigned_only ON app.reconciliations AS RESTRICTIVE USING(coalesce(current_setting('orvia.role',true),'')<>'MEMBER' OR EXISTS(SELECT 1 FROM app.action_plans p WHERE p.id=action_id));
CREATE POLICY request_reconciliation ON app.reconciliations FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('action.reconcile') AND requester_id::text=current_setting('orvia.actor_id',true));
CREATE POLICY worker_reconciliation ON app.reconciliations FOR ALL USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY check_system ON app.system_checks FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.has_capability('systems.check'));
CREATE POLICY attest ON app.obligations FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.has_capability('manual.attest')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY manual_finish ON app.workflows FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.has_capability('manual.attest')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
GRANT SELECT ON app.workflow_assignments,app.reconciliations,app.system_checks TO orvia_app;
GRANT SELECT ON app.workflow_assignments TO orvia_worker,orvia_agent_control;
GRANT INSERT ON app.reconciliations,app.system_checks TO orvia_app;
GRANT UPDATE ON app.obligations,app.workflows TO orvia_app;
GRANT SELECT,UPDATE ON app.reconciliations TO orvia_worker;
GRANT EXECUTE ON FUNCTION app.allowed_workflow TO orvia_app,orvia_worker,orvia_agent_control;
REVOKE ALL ON FUNCTION app.allowed_workflow FROM PUBLIC;
REVOKE ALL ON app.workflow_assignments,app.reconciliations,app.system_checks FROM PUBLIC;
