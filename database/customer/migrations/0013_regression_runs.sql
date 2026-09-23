CREATE TABLE app.test_fixture_profiles (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 installation_id uuid NOT NULL,profile text NOT NULL CHECK(profile IN ('codex-a00','ui-b00','rehearsal')),
 fixture_id text NOT NULL CHECK(fixture_id='aster-birch-v1'),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));
CREATE TABLE app.test_runs (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 requester_id uuid NOT NULL,state text NOT NULL CHECK(state IN ('NOT_RUN','RUNNING','PASS','FAIL','ERROR','SKIPPED')),
 document jsonb NOT NULL,context jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 CHECK(state=document->>'state'),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id) REFERENCES app.test_fixture_profiles(tenant_id,legal_entity_id,environment_id));
CREATE UNIQUE INDEX one_active_test_per_scope ON app.test_runs(tenant_id,legal_entity_id,environment_id) WHERE state IN ('NOT_RUN','RUNNING');
CREATE TABLE app.test_case_results (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,run_id uuid NOT NULL,
 assertion_id text NOT NULL,document jsonb NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,run_id,assertion_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,run_id) REFERENCES app.test_runs(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.test_run_links (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,run_id uuid NOT NULL,workflow_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,run_id,workflow_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,run_id) REFERENCES app.test_runs(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,workflow_id) REFERENCES app.workflows(tenant_id,legal_entity_id,environment_id,id));
-- Isolated test-only transport output. No application role can write it or
-- enable its deliberately buggy sender. It never sends an external message.
CREATE TABLE app.test_fixture_sends (
 run_id uuid NOT NULL REFERENCES app.test_runs(id),attempt_id uuid PRIMARY KEY,
 resource_id uuid NOT NULL,queued_epoch bigint NOT NULL,sent_at timestamptz NOT NULL DEFAULT clock_timestamp());
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['test_fixture_profiles','test_runs','test_case_results','test_run_links'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_test_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND (app.has_capability(''tests.read'') OR app.has_capability(''evidence.read'')))',tab);
 END LOOP;
END $$;
CREATE POLICY test_request ON app.test_runs FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('tests.run') AND requester_id::text=current_setting('orvia.actor_id',true) AND state='NOT_RUN');
GRANT SELECT ON app.test_fixture_profiles,app.test_runs,app.test_case_results,app.test_run_links TO orvia_app;
GRANT INSERT ON app.test_runs TO orvia_app;
REVOKE ALL ON app.test_fixture_profiles,app.test_runs,app.test_case_results,app.test_run_links,app.test_fixture_sends FROM PUBLIC;
CREATE FUNCTION app.immutable_test_result() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state IN ('PASS','FAIL','ERROR','SKIPPED') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Terminal test result is immutable' USING ERRCODE='23514'; END IF; RETURN NEW; END $$;
CREATE TRIGGER terminal_test BEFORE UPDATE ON app.test_runs FOR EACH ROW EXECUTE FUNCTION app.immutable_test_result();
REVOKE ALL ON FUNCTION app.immutable_test_result FROM PUBLIC;
