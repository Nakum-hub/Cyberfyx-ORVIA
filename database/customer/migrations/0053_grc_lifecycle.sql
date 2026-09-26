-- EX10 policy lifecycle and issue management; EX11 scheduled control tests,
-- drift alerts and auditor reporting. A control test examines records this
-- installation holds; it is evidence about ORVIA's recorded state, never a
-- claim about a system ORVIA cannot read. Nothing here is a certification.
CREATE TABLE app.grc_policies (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, policy_key uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 title text NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 20 AND 50000), owner_reference text NOT NULL,
 review_interval_days integer NOT NULL CHECK(review_interval_days BETWEEN 30 AND 1095),
 control_ids uuid[] NOT NULL DEFAULT '{}', requirement_ids text[] NOT NULL DEFAULT '{}', change_summary text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','RETIRED')),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_by uuid, published_at timestamptz, retired_at timestamptz, next_review_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,policy_key,version),
 CHECK((status='DRAFT')=(published_at IS NULL)), CHECK(approved_by IS NULL OR approved_by<>recorded_by));
CREATE TABLE app.grc_policy_acknowledgements (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, policy_id uuid NOT NULL, actor_id uuid NOT NULL, acknowledged_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id), UNIQUE(tenant_id,legal_entity_id,environment_id,policy_id,actor_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,policy_id) REFERENCES app.grc_policies(tenant_id,legal_entity_id,environment_id,id));

CREATE TABLE app.control_tests (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, control_id uuid NOT NULL, name text NOT NULL,
 check_kind text NOT NULL CHECK(check_kind IN ('SYSTEMS_HAVE_CONNECTOR_BINDING','CONSENT_EVENTS_HAVE_EVIDENCE','RETENTION_RULES_SOURCED','PROCESSORS_HAVE_AGREEMENT',
   'WITHDRAWALS_PROPAGATED','ASSESSMENTS_CURRENT','FORCED_ROW_SECURITY','AUDIT_TRAIL_APPEND_ONLY','GRC_EVIDENCE_CURRENT')),
 maximum_violations integer NOT NULL DEFAULT 0 CHECK(maximum_violations BETWEEN 0 AND 100000),
 interval_minutes integer NOT NULL CHECK(interval_minutes BETWEEN 5 AND 43200), enabled boolean NOT NULL DEFAULT true,
 next_run_at timestamptz NOT NULL, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,control_id) REFERENCES app.grc_controls(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX control_tests_due ON app.control_tests(tenant_id,legal_entity_id,environment_id,next_run_at) WHERE enabled;
CREATE TABLE app.control_test_runs (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, test_id uuid NOT NULL, sequence bigint GENERATED ALWAYS AS IDENTITY,
 trigger text NOT NULL CHECK(trigger IN ('SCHEDULE','MANUAL')), result text NOT NULL CHECK(result IN ('PASS','FAIL','ERROR')),
 violations integer, sample jsonb NOT NULL DEFAULT '[]', error_code text, observation_digest text,
 actor_id uuid NOT NULL, observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,test_id) REFERENCES app.control_tests(tenant_id,legal_entity_id,environment_id,id),
 CHECK((result='ERROR')=(error_code IS NOT NULL)), CHECK((result='ERROR')=(violations IS NULL)));
CREATE INDEX control_test_runs_latest ON app.control_test_runs(tenant_id,legal_entity_id,environment_id,test_id,sequence DESC);

CREATE TABLE app.grc_issues (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, source_kind text NOT NULL CHECK(source_kind IN ('MANUAL','AUDIT_REQUEST','CONTROL_TEST','IMPACT_FINDING','POLICY_REVIEW')),
 source_id uuid, title text NOT NULL, severity text NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 owner_reference text NOT NULL, due_at timestamptz NOT NULL, control_id uuid, risk_id uuid,
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id), CHECK((source_kind='MANUAL')=(source_id IS NULL)));
CREATE TABLE app.grc_issue_events (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, issue_id uuid NOT NULL, sequence bigint GENERATED ALWAYS AS IDENTITY,
 kind text NOT NULL CHECK(kind IN ('REMEDIATION_PLANNED','REMEDIATED','VERIFIED','RISK_ACCEPTED','REOPENED','ESCALATED','RECURRED')),
 note text NOT NULL, evidence_reference text, verification_method text CHECK(verification_method IN ('CONTROL_TEST','INDEPENDENT_REVIEW')),
 control_test_run_id uuid, acceptance_expires_at timestamptz, actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,issue_id) REFERENCES app.grc_issues(tenant_id,legal_entity_id,environment_id,id),
 CHECK((kind='VERIFIED')=(verification_method IS NOT NULL)), CHECK(verification_method<>'CONTROL_TEST' OR control_test_run_id IS NOT NULL),
 CHECK((kind='RISK_ACCEPTED')=(acceptance_expires_at IS NOT NULL)), CHECK(kind NOT IN ('REMEDIATED') OR evidence_reference IS NOT NULL));
CREATE INDEX grc_issue_events_latest ON app.grc_issue_events(tenant_id,legal_entity_id,environment_id,issue_id,sequence DESC);
-- One open issue per control test: repeated failures are recorded against it, not as new issues.
CREATE UNIQUE INDEX grc_issue_per_test ON app.grc_issues(tenant_id,legal_entity_id,environment_id,source_id) WHERE source_kind='CONTROL_TEST';
CREATE TABLE app.compliance_alerts (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, test_id uuid NOT NULL, run_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('DRIFT_TO_FAIL','RECOVERED','ERROR')),
 detail text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), delivery_state text NOT NULL DEFAULT 'NOT_DELIVERED' CHECK(delivery_state IN ('NOT_DELIVERED')),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id), UNIQUE(tenant_id,legal_entity_id,environment_id,run_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,run_id) REFERENCES app.control_test_runs(tenant_id,legal_entity_id,environment_id,id));

CREATE FUNCTION app.grc_lifecycle_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Governance records are never deleted' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='grc_policies' THEN
  IF (NEW.id,NEW.policy_key,NEW.version,NEW.title,NEW.body,NEW.owner_reference,NEW.review_interval_days,NEW.control_ids,NEW.requirement_ids,NEW.change_summary,NEW.recorded_by)
     IS DISTINCT FROM (OLD.id,OLD.policy_key,OLD.version,OLD.title,OLD.body,OLD.owner_reference,OLD.review_interval_days,OLD.control_ids,OLD.requirement_ids,OLD.change_summary,OLD.recorded_by)
     OR NOT ((OLD.status='DRAFT' AND NEW.status='PUBLISHED') OR (OLD.status='PUBLISHED' AND NEW.status='RETIRED'))
  THEN RAISE EXCEPTION 'A policy version is immutable; it is published or retired' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='control_tests' THEN
  IF (NEW.id,NEW.control_id,NEW.check_kind,NEW.maximum_violations,NEW.created_by) IS DISTINCT FROM (OLD.id,OLD.control_id,OLD.check_kind,OLD.maximum_violations,OLD.created_by)
  THEN RAISE EXCEPTION 'A control test keeps what it checks; create a new test to change it' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'Governance history is append-only' USING ERRCODE='23514';
 END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.grc_lifecycle_guard FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['grc_policies','grc_policy_acknowledgements','control_tests','control_test_runs','grc_issues','grc_issue_events','compliance_alerts'] LOOP
  EXECUTE format('CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.grc_lifecycle_guard()',tab);
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY lifecycle_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND ((current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''grc.read'')) OR (current_setting(''orvia.actor_domain'',true)=''MACHINE'' AND app.has_capability(''operations.execute''))))',tab);
  EXECUTE format('CREATE POLICY lifecycle_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND ((current_setting(''orvia.actor_domain'',true)=''STAFF'' AND (app.has_capability(''grc.write'') OR app.has_capability(''grc.approve'') OR app.has_capability(''grc.read''))) OR (current_setting(''orvia.actor_domain'',true)=''MACHINE'' AND app.has_capability(''operations.execute''))))',tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
  EXECUTE format('GRANT SELECT,INSERT ON app.%I TO orvia_app,orvia_worker',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['grc_policies','control_tests'] LOOP
  EXECUTE format('CREATE POLICY lifecycle_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND ((current_setting(''orvia.actor_domain'',true)=''STAFF'' AND (app.has_capability(''grc.write'') OR app.has_capability(''grc.approve''))) OR (current_setting(''orvia.actor_domain'',true)=''MACHINE'' AND app.has_capability(''operations.execute'')))) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id))',tab);
  EXECUTE format('GRANT UPDATE ON app.%I TO orvia_app,orvia_worker',tab);
 END LOOP;
END $$;
-- Acknowledgement is the only insert a reader may make, and only for themselves.
CREATE POLICY acknowledgement_self ON app.grc_policy_acknowledgements AS RESTRICTIVE FOR INSERT WITH CHECK(actor_id::text=current_setting('orvia.actor_id',true));
-- Everything else a reader cannot write.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['grc_policies','control_tests','control_test_runs','grc_issues','grc_issue_events','compliance_alerts'] LOOP
  EXECUTE format('CREATE POLICY writers_only ON app.%I AS RESTRICTIVE FOR INSERT WITH CHECK(current_setting(''orvia.actor_domain'',true)=''MACHINE'' OR app.has_capability(''grc.write'') OR app.has_capability(''grc.approve''))',tab);
 END LOOP;
END $$;
GRANT USAGE ON SEQUENCE app.control_test_runs_sequence_seq, app.grc_issue_events_sequence_seq TO orvia_app, orvia_worker;

-- Deterministic checks over the caller's scope. They bypass row security so a
-- worker and a staff member get the same answer, but they read only the scope
-- set for the current transaction and return counts and a bounded sample.
CREATE FUNCTION app.run_control_check(kind text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE t uuid := nullif(current_setting('orvia.tenant_id',true),'')::uuid; l uuid := nullif(current_setting('orvia.legal_entity_id',true),'')::uuid; e uuid := nullif(current_setting('orvia.environment_id',true),'')::uuid;
 n integer; sample jsonb;
BEGIN
 IF t IS NULL OR l IS NULL OR e IS NULL THEN RAISE EXCEPTION 'No scope for a control check' USING ERRCODE='42501'; END IF;
 IF NOT (current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('grc.write')) AND NOT (current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute'))
 THEN RAISE EXCEPTION 'Not permitted to run control checks' USING ERRCODE='42501'; END IF;
 IF kind='SYSTEMS_HAVE_CONNECTOR_BINDING' THEN
  SELECT count(*), coalesce(jsonb_agg(x.system_id) FILTER (WHERE x.rn<=10),'[]') INTO n, sample FROM (
   SELECT u.system_id, row_number() OVER (ORDER BY u.system_id) rn FROM (
    SELECT DISTINCT k.system_id FROM app.registry_activity_links k
    WHERE k.tenant_id=t AND k.legal_entity_id=l AND k.environment_id=e AND k.link_kind='SYSTEM' AND k.valid_to IS NULL
      AND NOT EXISTS(SELECT 1 FROM app.connector_bindings b WHERE b.tenant_id=t AND b.legal_entity_id=l AND b.environment_id=e AND b.system_id=k.system_id AND b.valid_to IS NULL)) u) x;
 ELSIF kind='CONSENT_EVENTS_HAVE_EVIDENCE' THEN
  SELECT count(*), coalesce(jsonb_agg(x.id) FILTER (WHERE x.rn<=10),'[]') INTO n, sample FROM (SELECT id, row_number() OVER (ORDER BY recorded_at) rn FROM app.consent_record_events
   WHERE tenant_id=t AND legal_entity_id=l AND environment_id=e AND evidence_state<>'EVIDENCE_AVAILABLE') x;
 ELSIF kind='RETENTION_RULES_SOURCED' THEN
  SELECT count(*), coalesce(jsonb_agg(x.id) FILTER (WHERE x.rn<=10),'[]') INTO n, sample FROM (SELECT id, row_number() OVER (ORDER BY recorded_at) rn FROM app.retention_rules
   WHERE tenant_id=t AND legal_entity_id=l AND environment_id=e AND status='ACTIVE' AND duration_days IS NULL) x;
 ELSIF kind='PROCESSORS_HAVE_AGREEMENT' THEN
  SELECT count(*), coalesce(jsonb_agg(x.processor_id) FILTER (WHERE x.rn<=10),'[]') INTO n, sample FROM (
   SELECT u.processor_id, row_number() OVER (ORDER BY u.processor_id) rn FROM (SELECT DISTINCT g.processor_id FROM app.processor_engagements g
   WHERE g.tenant_id=t AND g.legal_entity_id=l AND g.environment_id=e AND g.status='ACTIVE'
     AND NOT EXISTS(SELECT 1 FROM app.processor_agreements a WHERE a.tenant_id=t AND a.legal_entity_id=l AND a.environment_id=e AND a.processor_id=g.processor_id AND a.status='ACTIVE'
       AND a.effective_from<=clock_timestamp() AND (a.expires_at IS NULL OR a.expires_at>clock_timestamp())
       AND NOT EXISTS(SELECT 1 FROM app.processor_agreements s WHERE s.tenant_id=t AND s.legal_entity_id=l AND s.environment_id=e AND s.supersedes_id=a.id))) u) x;
 ELSIF kind='WITHDRAWALS_PROPAGATED' THEN
  SELECT count(*), coalesce(jsonb_agg(x.record_id) FILTER (WHERE x.rn<=10),'[]') INTO n, sample FROM (
   SELECT r.id record_id, row_number() OVER (ORDER BY r.id) rn FROM app.consent_records r
   JOIN LATERAL (SELECT ev.id, ev.event, ev.source FROM app.consent_record_events ev WHERE ev.tenant_id=r.tenant_id AND ev.legal_entity_id=r.legal_entity_id AND ev.environment_id=r.environment_id AND ev.record_id=r.id AND ev.event<>'MODIFIED'
     ORDER BY ev.occurred_at DESC NULLS LAST, ev.recorded_at DESC LIMIT 1) last ON true
   WHERE r.tenant_id=t AND r.legal_entity_id=l AND r.environment_id=e AND r.current_status='WITHDRAWN' AND last.event='WITHDRAWN' AND last.source<>'IMPORT'
     AND NOT EXISTS(SELECT 1 FROM app.workflow_runs w WHERE w.tenant_id=t AND w.legal_entity_id=l AND w.environment_id=e AND w.consent_event_id=last.id)) x;
 ELSIF kind='ASSESSMENTS_CURRENT' THEN
  SELECT count(*), coalesce(jsonb_agg(x.id) FILTER (WHERE x.rn<=10),'[]') INTO n, sample FROM (SELECT id, row_number() OVER (ORDER BY next_review_at) rn FROM app.impact_assessments
   WHERE tenant_id=t AND legal_entity_id=l AND environment_id=e AND status='APPROVED' AND next_review_at<clock_timestamp()) x;
 ELSIF kind='FORCED_ROW_SECURITY' THEN
  SELECT count(*), coalesce(jsonb_agg(x.relname) FILTER (WHERE x.rn<=10),'[]') INTO n, sample FROM (SELECT c.relname, row_number() OVER (ORDER BY c.relname) rn FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
   WHERE ns.nspname='app' AND c.relkind='r' AND NOT (c.relrowsecurity AND c.relforcerowsecurity)) x;
 ELSIF kind='AUDIT_TRAIL_APPEND_ONLY' THEN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM pg_trigger g JOIN pg_class c ON c.oid=g.tgrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace
   WHERE ns.nspname='app' AND c.relname='audit_events' AND g.tgname='audit_append_only' AND g.tgenabled<>'D') THEN 0 ELSE 1 END, '["app.audit_events"]'::jsonb INTO n, sample;
  IF n=0 THEN sample := '[]'; END IF;
 ELSIF kind='GRC_EVIDENCE_CURRENT' THEN
  SELECT count(*), coalesce(jsonb_agg(x.control_id) FILTER (WHERE x.rn<=10),'[]') INTO n, sample FROM (
   SELECT c.id control_id, row_number() OVER (ORDER BY c.id) rn FROM app.grc_controls c
   LEFT JOIN LATERAL (SELECT v.document FROM app.grc_evidence v WHERE v.tenant_id=c.tenant_id AND v.legal_entity_id=c.legal_entity_id AND v.environment_id=c.environment_id AND v.control_id=c.id ORDER BY v.sequence DESC LIMIT 1) ev ON true
   WHERE c.tenant_id=t AND c.legal_entity_id=l AND c.environment_id=e AND (ev.document IS NULL OR (ev.document->>'valid_until')::timestamptz<clock_timestamp())) x;
 ELSE RAISE EXCEPTION 'Unknown control check' USING ERRCODE='22023';
 END IF;
 RETURN jsonb_build_object('violations', n, 'sample', sample);
END $$;
REVOKE ALL ON FUNCTION app.run_control_check(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.run_control_check(text) TO orvia_app, orvia_worker;
