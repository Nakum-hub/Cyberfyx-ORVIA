-- The worker polls durable, tenant-scoped AI governance checks. A crash leaves
-- the due row in PostgreSQL. Each successful check advances the schedule in the
-- same transaction as its append-only monitoring event.
CREATE TABLE app.ai_monitor_jobs (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 ai_system_id uuid NOT NULL,
 next_run_at timestamptz NOT NULL DEFAULT clock_timestamp(),last_run_at timestamptz,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 state text NOT NULL DEFAULT 'READY' CHECK(state IN ('READY','RETRY','EXHAUSTED')),
 last_error_code text,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,ai_system_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,ai_system_id)
   REFERENCES app.ai_systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='EXHAUSTED')=(attempts=3)),
 CHECK((state='READY')=(attempts=0)),
 CHECK((state='READY')=(last_error_code IS NULL)));
CREATE INDEX ai_monitor_due ON app.ai_monitor_jobs(tenant_id,legal_entity_id,environment_id,next_run_at)
 WHERE state<>'EXHAUSTED';
INSERT INTO app.ai_monitor_jobs(tenant_id,legal_entity_id,environment_id,ai_system_id)
 SELECT tenant_id,legal_entity_id,environment_id,id FROM app.ai_systems;

ALTER TABLE app.ai_monitor_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_monitor_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_job_staff_insert ON app.ai_monitor_jobs FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id)
  AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('ai_governance.write'));
CREATE POLICY ai_job_staff_read ON app.ai_monitor_jobs FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
  AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('ai_governance.read'));
CREATE POLICY ai_job_worker_read ON app.ai_monitor_jobs FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute'));
CREATE POLICY ai_job_worker_update ON app.ai_monitor_jobs FOR UPDATE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope());
CREATE POLICY ai_system_worker_read ON app.ai_systems FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute'));
CREATE POLICY ai_event_worker_read ON app.ai_governance_events FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute'));
CREATE POLICY ai_event_worker_insert ON app.ai_governance_events FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute') AND kind='MONITORING'
  AND state IN ('RECORDED','FINDING'));
CREATE POLICY ai_asset_worker_read ON app.data_assets FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope()
  AND app.has_capability('workflow.execute'));
GRANT SELECT,INSERT ON app.ai_monitor_jobs TO orvia_app;
GRANT SELECT,UPDATE ON app.ai_monitor_jobs TO orvia_worker;
GRANT SELECT ON app.ai_systems,app.ai_governance_events,app.data_assets TO orvia_worker;
GRANT INSERT ON app.ai_governance_events TO orvia_worker;
REVOKE ALL ON app.ai_monitor_jobs FROM PUBLIC;
