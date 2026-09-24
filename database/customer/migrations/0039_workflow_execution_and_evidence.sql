-- DPDP Operations extension, part 3: workflows, downstream actions,
-- independent verification, evidence, bulk jobs and the V1 attachments.
--
-- The execution invariant (integrations/CONNECTORS_EXECUTION_AND_VERIFICATION.md s1):
--   decision -> workflow run -> downstream action -> target result
--   -> independent verification -> evidence -> final state.
-- Each arrow is its own row, so no later state can be claimed without the earlier one.

CREATE TABLE app.operational_events (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 event_type text NOT NULL CHECK(event_type IN ('data_principal_context_created','data_principal_context_updated','processing_activity_created','processing_activity_updated',
  'purpose_changed','notice_version_published','consent_granted','consent_withdrawn','consent_changed','rights_request_received','rights_request_updated','rights_request_closed',
  'retention_trigger_reached','erasure_action_requested','erasure_action_executed','erasure_action_verified','erasure_action_failed','processor_relationship_changed',
  'personal_data_breach_created','personal_data_breach_updated','regulatory_package_imported','regulatory_package_activated','requirement_applicability_changed',
  'verification_failed','evidence_recorded','sdf_status_changed','bulk_job_completed')),
 subject_kind text NOT NULL,subject_id uuid,payload jsonb NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),actor_id uuid NOT NULL,correlation_id uuid,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX events_by_time ON app.operational_events(tenant_id,legal_entity_id,environment_id,occurred_at);
CREATE TRIGGER events_append_only BEFORE UPDATE OR DELETE ON app.operational_events FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- WorkflowExecution. Every run pins its workflow version, regulatory package and
-- the configuration versions it used, so a historical run stays explainable.
CREATE TABLE app.workflow_runs (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('CONSENT_WITHDRAWAL','RIGHTS_EXECUTION','CORRECTION','RETENTION_ERASURE','PROCESSOR_DISPOSITION')),
 workflow_version text NOT NULL,package_row_id uuid NOT NULL,configuration jsonb NOT NULL,
 trigger jsonb NOT NULL,subject_id uuid,rights_request_id uuid,retention_rule_id uuid,engagement_id uuid,consent_event_id uuid,
 status text NOT NULL CHECK(status IN ('EVALUATING','DRY_RUN_READY','AWAITING_APPROVAL','APPROVED','RUNNING','COMPLETED_VERIFIED','COMPLETED_WITH_EXCEPTIONS','PARTIALLY_FAILED','CANCELLED','BLOCKED')),
 approval_required boolean NOT NULL,scope_hash text CHECK(scope_hash IS NULL OR scope_hash ~ '^[a-f0-9]{64}$'),
 evaluation_cursor uuid,evaluation_complete boolean NOT NULL DEFAULT false,
 counts jsonb NOT NULL DEFAULT '{}'::jsonb,block_reason text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),created_by uuid NOT NULL,
 started_at timestamptz,ended_at timestamptz,updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,rights_request_id) REFERENCES app.rights_requests(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,retention_rule_id) REFERENCES app.retention_rules(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,engagement_id) REFERENCES app.processor_engagements(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,consent_event_id) REFERENCES app.consent_record_events(tenant_id,legal_entity_id,environment_id,id),
 CHECK((status='BLOCKED')=(block_reason IS NOT NULL)));
CREATE INDEX runs_by_status ON app.workflow_runs(tenant_id,legal_entity_id,environment_id,status);
CREATE UNIQUE INDEX one_run_per_consent_event ON app.workflow_runs(tenant_id,legal_entity_id,environment_id,consent_event_id) WHERE consent_event_id IS NOT NULL;
-- What a run was pinned to is never re-pointed afterwards.
CREATE FUNCTION app.workflow_run_pins_fixed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.package_row_id IS DISTINCT FROM OLD.package_row_id OR NEW.workflow_version IS DISTINCT FROM OLD.workflow_version
  OR NEW.configuration IS DISTINCT FROM OLD.configuration OR NEW.trigger IS DISTINCT FROM OLD.trigger OR NEW.kind IS DISTINCT FROM OLD.kind
  OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN RAISE EXCEPTION 'A workflow run keeps the versions it was pinned to' USING ERRCODE='23514'; END IF;
 IF OLD.scope_hash IS NOT NULL AND NEW.scope_hash IS DISTINCT FROM OLD.scope_hash AND OLD.status NOT IN ('EVALUATING','DRY_RUN_READY')
  THEN RAISE EXCEPTION 'An approved scope cannot change' USING ERRCODE='23514'; END IF;
 IF OLD.status IN ('COMPLETED_VERIFIED','CANCELLED') AND NEW.status IS DISTINCT FROM OLD.status
  THEN RAISE EXCEPTION 'A terminal run is not reopened' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.workflow_run_pins_fixed FROM PUBLIC;
CREATE TRIGGER run_pins_fixed BEFORE UPDATE ON app.workflow_runs FOR EACH ROW EXECUTE FUNCTION app.workflow_run_pins_fixed();
CREATE TRIGGER runs_not_deletable BEFORE DELETE ON app.workflow_runs FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- Maker-checker. The approver is never the person who created the run, and an
-- approval binds the exact scope it saw.
CREATE TABLE app.workflow_run_approvals (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 run_id uuid NOT NULL,scope_hash text NOT NULL CHECK(scope_hash ~ '^[a-f0-9]{64}$'),
 decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED')),note text NOT NULL,
 approver_id uuid NOT NULL,run_creator_id uuid NOT NULL,decided_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(tenant_id,legal_entity_id,environment_id,run_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,run_id) REFERENCES app.workflow_runs(tenant_id,legal_entity_id,environment_id,id),
 CHECK(approver_id<>run_creator_id));
CREATE TRIGGER approvals_append_only BEFORE UPDATE OR DELETE ON app.workflow_run_approvals FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

CREATE TABLE app.downstream_actions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 run_id uuid NOT NULL,ordinal integer NOT NULL CHECK(ordinal>=0),
 subject_id uuid,system_id uuid,engagement_id uuid,target_reference text,
 action_type text NOT NULL CHECK(action_type IN ('SUPPRESS','ERASE','ANONYMISE','CORRECT','READ_REFERENCE','DISPOSITION_CONFIRMATION')),
 idempotency_key text NOT NULL CHECK(idempotency_key ~ '^[a-f0-9]{64}$'),
 payload_digest text CHECK(payload_digest IS NULL OR payload_digest ~ '^[a-f0-9]{64}$'),
 state text NOT NULL CHECK(state IN ('pending','awaiting_approval','blocked','executing','succeeded_unverified','verified','failed','inconclusive','cancelled','not_supported')),
 target_result text NOT NULL DEFAULT 'NONE' CHECK(target_result IN ('NONE','ACCEPTED_BY_TARGET','COMPLETED_BY_TARGET','FAILED','TIMEOUT_EFFECT_UNKNOWN','NOT_SUPPORTED','NOT_FOUND')),
 verification text NOT NULL DEFAULT 'NOT_VERIFIED' CHECK(verification IN ('NOT_VERIFIED','VERIFIED','FAILED','INCONCLUSIVE','NOT_POSSIBLE')),
 block_reason text,hold_ids uuid[] NOT NULL DEFAULT '{}',attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 20),
 last_error_code text,target_response_reference text,requested_at timestamptz,
 v1_outcome_synced boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,run_id,ordinal),
 UNIQUE(tenant_id,legal_entity_id,environment_id,idempotency_key),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,run_id) REFERENCES app.workflow_runs(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,engagement_id) REFERENCES app.processor_engagements(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='blocked')=(block_reason IS NOT NULL)),
 -- verified requires an independent verification that passed; nothing else.
 CHECK((state='verified')=(verification='VERIFIED')),
 CHECK(state<>'succeeded_unverified' OR target_result IN ('ACCEPTED_BY_TARGET','COMPLETED_BY_TARGET')),
 CHECK(state<>'not_supported' OR target_result='NOT_SUPPORTED'));
CREATE INDEX actions_by_state ON app.downstream_actions(tenant_id,legal_entity_id,environment_id,run_id,state,ordinal);
CREATE FUNCTION app.downstream_action_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'state'-'target_result'-'verification'-'block_reason'-'hold_ids'-'attempts'-'last_error_code'-'target_response_reference'-'requested_at'-'updated_at'-'v1_outcome_synced')
   IS DISTINCT FROM (to_jsonb(OLD)-'state'-'target_result'-'verification'-'block_reason'-'hold_ids'-'attempts'-'last_error_code'-'target_response_reference'-'requested_at'-'updated_at'-'v1_outcome_synced')
  THEN RAISE EXCEPTION 'An action keeps its identity, target and idempotency key' USING ERRCODE='23514'; END IF;
 IF OLD.state IN ('verified','cancelled','not_supported') AND NEW.state IS DISTINCT FROM OLD.state
  THEN RAISE EXCEPTION 'A terminal action state is final' USING ERRCODE='23514'; END IF;
 -- A failed verification is never turned into a pass by editing the row.
 IF OLD.verification IN ('FAILED','INCONCLUSIVE') AND NEW.verification='VERIFIED' AND NEW.attempts=OLD.attempts
  THEN RAISE EXCEPTION 'Verification can only pass through a new, recorded verification' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.downstream_action_guard FROM PUBLIC;
CREATE TRIGGER action_guard BEFORE UPDATE ON app.downstream_actions FOR EACH ROW EXECUTE FUNCTION app.downstream_action_guard();
CREATE TRIGGER actions_not_deletable BEFORE DELETE ON app.downstream_actions FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- Protected request payloads (for example a corrected value). Held only until the
-- action is settled, then purged; the digest on the action remains.
CREATE TABLE app.downstream_action_payloads (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,action_id uuid NOT NULL,
 payload jsonb NOT NULL,PRIMARY KEY(tenant_id,legal_entity_id,environment_id,action_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,action_id) REFERENCES app.downstream_actions(tenant_id,legal_entity_id,environment_id,id));

CREATE TABLE app.downstream_action_attempts (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 action_id uuid NOT NULL,attempt integer NOT NULL CHECK(attempt>0),
 dispatched_at timestamptz NOT NULL,completed_at timestamptz,
 target_result text NOT NULL CHECK(target_result IN ('DISPATCHED','ACCEPTED_BY_TARGET','COMPLETED_BY_TARGET','FAILED','TIMEOUT_EFFECT_UNKNOWN','NOT_SUPPORTED','NOT_FOUND')),
 replayed boolean NOT NULL DEFAULT false,error_code text,target_response_digest text,actor_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,action_id,attempt,target_result),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,action_id) REFERENCES app.downstream_actions(tenant_id,legal_entity_id,environment_id,id));
CREATE TRIGGER attempts_append_only BEFORE UPDATE OR DELETE ON app.downstream_action_attempts FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

CREATE TABLE app.action_verifications (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 action_id uuid NOT NULL,method text NOT NULL CHECK(method IN ('INDEPENDENT_READ_BACK','TARGET_AUDIT_EVIDENCE','AUTHORITATIVE_COMPLETION_EVENT','AUTHORITATIVE_OPERATION_RESPONSE','NONE_AVAILABLE')),
 verifier text NOT NULL,expected jsonb NOT NULL,observed jsonb NOT NULL,
 result text NOT NULL CHECK(result IN ('PASS','FAIL','INCONCLUSIVE')),failure_reason text,
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),evidence_id uuid,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,action_id) REFERENCES app.downstream_actions(tenant_id,legal_entity_id,environment_id,id),
 CHECK(result='PASS' OR failure_reason IS NOT NULL),
 CHECK(method<>'NONE_AVAILABLE' OR result='INCONCLUSIVE'));
CREATE TRIGGER verifications_append_only BEFORE UPDATE OR DELETE ON app.action_verifications FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- Immutable evidence references. A correction is a new row that supersedes.
CREATE TABLE app.evidence_records (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 entity_kind text NOT NULL,entity_id uuid NOT NULL,
 origin text NOT NULL CHECK(origin IN ('SYSTEM','CONNECTOR','OPERATOR','IMPORT','REGULATORY_PACKAGE')),
 method text NOT NULL,actor_id uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 content_digest text CHECK(content_digest IS NULL OR content_digest ~ '^[a-f0-9]{64}$'),
 integrity_state text NOT NULL CHECK(integrity_state IN ('DIGEST_RECORDED','NO_CONTROLLED_BYTES')),
 package_row_id uuid,requirement_ids text[] NOT NULL DEFAULT '{}',summary jsonb NOT NULL,supersedes uuid,
 fixture boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,supersedes) REFERENCES app.evidence_records(tenant_id,legal_entity_id,environment_id,id),
 CHECK((integrity_state='DIGEST_RECORDED')=(content_digest IS NOT NULL)));
CREATE INDEX evidence_by_entity ON app.evidence_records(tenant_id,legal_entity_id,environment_id,entity_kind,entity_id);
CREATE INDEX evidence_by_requirement ON app.evidence_records USING GIN(requirement_ids);
CREATE TRIGGER evidence_append_only BEFORE UPDATE OR DELETE ON app.evidence_records FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- Per subject and rule, the latest evaluated retention position.
CREATE TABLE app.retention_states (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 subject_id uuid NOT NULL,rule_id uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('UNRESOLVED','NOT_TRIGGERED','NOT_YET_ELIGIBLE','PURPOSE_ACTIVE','BLOCKED_BY_HOLD','ELIGIBLE','SCHEDULED','ERASED','FAILED')),
 trigger_at timestamptz,eligible_at timestamptz,hold_ids uuid[] NOT NULL DEFAULT '{}',
 purpose_still_active text NOT NULL CHECK(purpose_still_active IN ('KNOWN_TRUE','KNOWN_FALSE','UNKNOWN')),
 unresolved_reason text,run_id uuid,last_evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,subject_id,rule_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,rule_id) REFERENCES app.retention_rules(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='UNRESOLVED')=(unresolved_reason IS NOT NULL)),
 CHECK(state<>'BLOCKED_BY_HOLD' OR cardinality(hold_ids)>0));

-- Bulk jobs: checkpointed, resumable, row-isolated.
CREATE TABLE app.bulk_jobs (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('ESTATE_IMPORT')),source_label text NOT NULL,mapping_version text NOT NULL,
 status text NOT NULL CHECK(status IN ('RECEIVING','PROCESSING','COMPLETED','COMPLETED_WITH_ERRORS')),
 cursor integer NOT NULL DEFAULT -1,counts jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),created_by uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id));
CREATE TABLE app.bulk_job_rows (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 job_id uuid NOT NULL,ordinal integer NOT NULL CHECK(ordinal>=0),
 payload jsonb,row_digest text NOT NULL CHECK(row_digest ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','APPLIED','DUPLICATE','ERROR')),
 error_code text,subject_id uuid,attempts integer NOT NULL DEFAULT 0,processed_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,job_id,ordinal),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,job_id) REFERENCES app.bulk_jobs(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='ERROR')=(error_code IS NOT NULL)));
CREATE INDEX job_rows_pending ON app.bulk_job_rows(tenant_id,legal_entity_id,environment_id,job_id,state,ordinal);

-- V1 rights request -> DPDP case profile (package pin and requirement-derived due time).
CREATE TABLE app.rights_case_profiles (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 rights_request_id uuid NOT NULL,package_row_id uuid,subject_id uuid,
 due_at timestamptz,due_basis text NOT NULL,legal_status text NOT NULL CHECK(legal_status IN ('APPLICABLE','NOT_YET_IN_FORCE','UNRESOLVED','NO_ACTIVE_PACKAGE')),
 requirement_id text,requirement_version integer,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,rights_request_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,rights_request_id) REFERENCES app.rights_requests(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 CHECK((legal_status='NO_ACTIVE_PACKAGE')=(package_row_id IS NULL)));
CREATE TRIGGER case_profiles_append_only BEFORE UPDATE OR DELETE ON app.rights_case_profiles FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- V1 incident -> personal-data breach subtype. Only an incident explicitly
-- classified here becomes a breach; every other V1 incident is untouched.
CREATE TABLE app.personal_data_breaches (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 incident_id uuid NOT NULL,package_row_id uuid NOT NULL,pinned_at timestamptz NOT NULL,
 affected_count integer CHECK(affected_count IS NULL OR affected_count>=0),
 affected_count_state text NOT NULL CHECK(affected_count_state IN ('UNKNOWN','ESTIMATED','ESTABLISHED')),
 data_category_ids uuid[] NOT NULL DEFAULT '{}',activity_ids uuid[] NOT NULL DEFAULT '{}',system_ids uuid[] NOT NULL DEFAULT '{}',engagement_ids uuid[] NOT NULL DEFAULT '{}',
 facts jsonb NOT NULL,mitigation text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,incident_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,incident_id) REFERENCES app.incidents(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id),
 -- An unknown count stays unknown until it is established.
 CHECK((affected_count_state='UNKNOWN')=(affected_count IS NULL)));
CREATE FUNCTION app.breach_pin_fixed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.package_row_id IS DISTINCT FROM OLD.package_row_id OR NEW.pinned_at IS DISTINCT FROM OLD.pinned_at OR NEW.incident_id IS DISTINCT FROM OLD.incident_id
  THEN RAISE EXCEPTION 'A breach stays pinned to the package active when it was recorded' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.breach_pin_fixed FROM PUBLIC;
CREATE TRIGGER breach_pin_fixed BEFORE UPDATE ON app.personal_data_breaches FOR EACH ROW EXECUTE FUNCTION app.breach_pin_fixed();
CREATE TABLE app.breach_tasks (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 incident_id uuid NOT NULL,package_row_id uuid NOT NULL,requirement_id text NOT NULL,requirement_version integer NOT NULL,
 kind text NOT NULL CHECK(kind IN ('PRINCIPAL_INTIMATION','BOARD_INTIMATION','BOARD_DETAILED_REPORT','PROCESSOR_COORDINATION','CONTAINMENT','REMEDIATION')),
 timer_rule text NOT NULL,due_at timestamptz,legal_status text NOT NULL CHECK(legal_status IN ('APPLICABLE','NOT_YET_IN_FORCE','UNRESOLVED')),
 unresolved_reason text,state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','COMPLETED','NOT_APPLICABLE')),
 completed_at timestamptz,completed_by uuid,communication_evidence_reference text,completion_note text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,incident_id,requirement_id,kind),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,incident_id) REFERENCES app.personal_data_breaches(tenant_id,legal_entity_id,environment_id,incident_id),
 CHECK((legal_status='UNRESOLVED')=(unresolved_reason IS NOT NULL)),
 CHECK((state='COMPLETED')=(completed_at IS NOT NULL)),
 CHECK(state<>'COMPLETED' OR communication_evidence_reference IS NOT NULL));
CREATE FUNCTION app.breach_task_complete_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'state'-'completed_at'-'completed_by'-'communication_evidence_reference'-'completion_note') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'completed_at'-'completed_by'-'communication_evidence_reference'-'completion_note')
  OR OLD.state<>'OPEN' THEN RAISE EXCEPTION 'A breach task keeps its deadline and is completed once' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.breach_task_complete_once FROM PUBLIC;
CREATE TRIGGER breach_task_complete_once BEFORE UPDATE ON app.breach_tasks FOR EACH ROW EXECUTE FUNCTION app.breach_task_complete_once();

-- SDF obligations appear only while a designation is recorded.
CREATE TABLE app.sdf_obligations (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 profile_version_id uuid NOT NULL,package_row_id uuid NOT NULL,requirement_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('DPO_APPOINTMENT','INDEPENDENT_AUDITOR_APPOINTMENT','PERIODIC_DPIA','PERIODIC_AUDIT','ALGORITHMIC_DUE_DILIGENCE','TRANSFER_RESTRICTION_REVIEW')),
 period_start timestamptz NOT NULL,due_at timestamptz,legal_status text NOT NULL CHECK(legal_status IN ('APPLICABLE','NOT_YET_IN_FORCE')),
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','COMPLETED','NOT_APPLICABLE')),
 completed_at timestamptz,evidence_reference text,closure_reason text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,profile_version_id,requirement_id,kind,period_start),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,profile_version_id) REFERENCES app.organisation_profile_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='COMPLETED')=(completed_at IS NOT NULL AND evidence_reference IS NOT NULL)),
 CHECK((state='NOT_APPLICABLE')=(closure_reason IS NOT NULL)));
CREATE FUNCTION app.sdf_obligation_close_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'state'-'completed_at'-'evidence_reference'-'closure_reason') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'completed_at'-'evidence_reference'-'closure_reason')
  OR OLD.state<>'OPEN' THEN RAISE EXCEPTION 'An SDF obligation is closed once and never deleted' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.sdf_obligation_close_once FROM PUBLIC;
CREATE TRIGGER sdf_close_once BEFORE UPDATE ON app.sdf_obligations FOR EACH ROW EXECUTE FUNCTION app.sdf_obligation_close_once();
CREATE TRIGGER sdf_not_deletable BEFORE DELETE ON app.sdf_obligations FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- V1 notification engine gains DPDP sources; existing values keep their meaning.
ALTER TABLE app.notification_tasks DROP CONSTRAINT notification_tasks_source_check;
ALTER TABLE app.notification_tasks ADD CONSTRAINT notification_tasks_source_check CHECK(source IN ('COVERAGE_GAP','NOTIFICATION_OBLIGATION','ASSESSMENT_FINDING','DPDP_BREACH_TASK','DPDP_RIGHTS_DEADLINE','DPDP_ACTION_FAILURE','DPDP_REGULATORY_CHANGE','DPDP_SDF_OBLIGATION'));
CREATE UNIQUE INDEX one_task_per_operations_source ON app.notification_tasks(tenant_id,legal_entity_id,environment_id,source,source_id) WHERE source LIKE 'DPDP_%';

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['operational_events','workflow_runs','workflow_run_approvals','downstream_actions','downstream_action_payloads','downstream_action_attempts','action_verifications','evidence_records','retention_states','bulk_jobs','bulk_job_rows','rights_case_profiles','personal_data_breaches','breach_tasks','sdf_obligations'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(%L))',tab,
   CASE WHEN tab='downstream_action_payloads' THEN 'operations.execute' WHEN tab IN ('personal_data_breaches','breach_tasks') THEN 'incident.read' ELSE 'registry.read' END);
  EXECUTE format('CREATE POLICY scoped_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(%L))',tab,
   CASE WHEN tab='workflow_run_approvals' THEN 'operations.approve' WHEN tab IN ('personal_data_breaches','breach_tasks') THEN 'incident.write' WHEN tab='sdf_obligations' THEN 'sdf.manage'
        WHEN tab IN ('workflow_runs','downstream_actions','downstream_action_payloads','downstream_action_attempts','action_verifications') THEN 'operations.execute' ELSE 'registry.write' END);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['workflow_runs','downstream_actions','retention_states','bulk_jobs','bulk_job_rows'] LOOP
  EXECUTE format('CREATE POLICY scoped_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(''operations.execute'')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id))',tab);
 END LOOP;
END $$;
-- Import jobs are registry writes; an admin who may write the registry may run them.
CREATE POLICY scoped_job_update_by_writer ON app.bulk_jobs FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.write')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY scoped_job_row_update_by_writer ON app.bulk_job_rows FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.write')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY scoped_retention_state_update_by_writer ON app.retention_states FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.write')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY scoped_payload_purge ON app.downstream_action_payloads FOR DELETE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('operations.execute'));
CREATE POLICY scoped_breach_update ON app.personal_data_breaches FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('incident.write')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY scoped_breach_task_update ON app.breach_tasks FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('incident.write')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY scoped_sdf_update ON app.sdf_obligations FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('sdf.manage')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
GRANT SELECT,INSERT ON app.operational_events,app.workflow_runs,app.workflow_run_approvals,app.downstream_actions,app.downstream_action_payloads,app.downstream_action_attempts,app.action_verifications,app.evidence_records,app.retention_states,app.bulk_jobs,app.bulk_job_rows,app.rights_case_profiles,app.personal_data_breaches,app.breach_tasks,app.sdf_obligations TO orvia_app,orvia_worker;
GRANT UPDATE ON app.workflow_runs,app.downstream_actions,app.retention_states,app.bulk_jobs,app.bulk_job_rows,app.personal_data_breaches,app.breach_tasks,app.sdf_obligations TO orvia_app,orvia_worker;
GRANT DELETE ON app.downstream_action_payloads TO orvia_app,orvia_worker;

-- The background runner raises DPDP deadline alerts through V1 notifications.
-- Its access is narrow: only the DPDP alert template, only DPDP_* tasks and their
-- deliveries, and only the identifying and state columns of rights requests.
CREATE FUNCTION app.operations_runner() RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute') $$;
REVOKE ALL ON FUNCTION app.operations_runner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.operations_runner TO orvia_app,orvia_worker;
CREATE POLICY runner_alert_template_read ON app.notification_templates FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner() AND code='DPDP_OPERATIONS_ALERT');
CREATE POLICY runner_alert_task_read ON app.notification_tasks FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner() AND source LIKE 'DPDP_%');
CREATE POLICY runner_alert_task_insert ON app.notification_tasks FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner() AND source LIKE 'DPDP_%');
CREATE POLICY runner_alert_delivery_read ON app.notification_deliveries FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner()
 AND EXISTS(SELECT 1 FROM app.notification_tasks t WHERE t.tenant_id=notification_deliveries.tenant_id AND t.legal_entity_id=notification_deliveries.legal_entity_id AND t.environment_id=notification_deliveries.environment_id AND t.id=notification_deliveries.task_id AND t.source LIKE 'DPDP_%'));
CREATE POLICY runner_alert_delivery_insert ON app.notification_deliveries FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner() AND fact='QUEUED');
CREATE POLICY runner_rights_state_read ON app.rights_requests FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner());
GRANT SELECT ON app.notification_templates,app.notification_tasks,app.notification_deliveries TO orvia_worker;
GRANT INSERT ON app.notification_tasks,app.notification_deliveries TO orvia_worker;
GRANT SELECT(tenant_id,legal_entity_id,environment_id,id,state) ON app.rights_requests TO orvia_worker;
REVOKE ALL ON app.operational_events,app.workflow_runs,app.workflow_run_approvals,app.downstream_actions,app.downstream_action_payloads,app.downstream_action_attempts,app.action_verifications,app.evidence_records,app.retention_states,app.bulk_jobs,app.bulk_job_rows,app.rights_case_profiles,app.personal_data_breaches,app.breach_tasks,app.sdf_obligations FROM PUBLIC;
