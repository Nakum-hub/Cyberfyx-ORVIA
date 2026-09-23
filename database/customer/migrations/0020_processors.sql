-- WP16 / M16 Processor and Vendor Management.
-- Notification, acknowledgement and verification are stored as separate rows of
-- one coordination log rather than as flags on a processor, because they are
-- three different facts and only the third is evidence that anything happened.

CREATE TABLE app.processors (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 role text NOT NULL CHECK(role IN ('PROCESSOR','SUB_PROCESSOR','JOINT_CONTROLLER','INDEPENDENT_CONTROLLER')),
 subprocessors_permitted boolean NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id));

-- Which purposes this processor is authorised for. An authorisation is declared
-- and reviewed; it is never inferred from the fact that data reached them.
CREATE TABLE app.processor_purposes (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 processor_id uuid NOT NULL,purpose_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,processor_id,purpose_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processor_id) REFERENCES app.processors(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id));

CREATE TABLE app.processor_systems (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 processor_id uuid NOT NULL,system_id uuid NOT NULL,basis text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,processor_id,system_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processor_id) REFERENCES app.processors(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));

-- Append-only coordination log. Each row is one fact of one kind.
CREATE TABLE app.processor_coordination (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 processor_id uuid NOT NULL,
 fact text NOT NULL CHECK(fact IN ('NOTIFIED','ACKNOWLEDGED','VERIFIED')),
 method text NOT NULL CHECK(method IN ('RECORDED_MESSAGE','RECORDED_REPLY','INDEPENDENT_CHECK','ATTRIBUTED_STATEMENT')),
 subject text NOT NULL,evidence_reference text,note text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processor_id) REFERENCES app.processors(tenant_id,legal_entity_id,environment_id,id),
 -- A processor's own statement is an attributable claim, never verification.
 CHECK(NOT(fact='VERIFIED' AND (method<>'INDEPENDENT_CHECK' OR evidence_reference IS NULL))),
 CHECK(NOT(fact='NOTIFIED' AND method<>'RECORDED_MESSAGE')),
 CHECK(NOT(fact='ACKNOWLEDGED' AND method NOT IN ('RECORDED_REPLY','ATTRIBUTED_STATEMENT'))));
CREATE INDEX coordination_by_processor ON app.processor_coordination(tenant_id,legal_entity_id,environment_id,processor_id,recorded_at);

CREATE TABLE app.assessments (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 processor_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('DATA_PROTECTION_IMPACT','TRANSFER_RISK','SECTOR_SPECIFIC','VENDOR_DUE_DILIGENCE')),
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','COMPLETED','SUPERSEDED')),
 due_at timestamptz NOT NULL,completed_at timestamptz,conclusion text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processor_id) REFERENCES app.processors(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='COMPLETED')=(completed_at IS NOT NULL)),
 CHECK((completed_at IS NULL)=(conclusion IS NULL)));

CREATE TABLE app.assessment_findings (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 assessment_id uuid NOT NULL,
 severity text NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','REMEDIATED','ACCEPTED_RISK')),
 owner_reference text NOT NULL,due_at timestamptz NOT NULL,
 closed_at timestamptz,closure_evidence text,retest_reference text,closure_note text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,assessment_id) REFERENCES app.assessments(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='OPEN')=(closed_at IS NULL)),
 -- Closure needs defined evidence or a retest. Neither is optional.
 CHECK(NOT(state='REMEDIATED' AND closure_evidence IS NULL AND retest_reference IS NULL)),
 CHECK(NOT(state='ACCEPTED_RISK' AND closure_note IS NULL)));
CREATE INDEX findings_by_assessment ON app.assessment_findings(tenant_id,legal_entity_id,environment_id,assessment_id,state);

CREATE FUNCTION app.processor_record_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Processor coordination history is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER coordination_immutable BEFORE UPDATE OR DELETE ON app.processor_coordination FOR EACH ROW EXECUTE FUNCTION app.processor_record_is_append_only();
REVOKE ALL ON FUNCTION app.processor_record_is_append_only FROM PUBLIC;

CREATE FUNCTION app.closed_finding_is_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state<>'OPEN' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'A closed finding is terminal' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER closed_finding_terminal BEFORE UPDATE ON app.assessment_findings FOR EACH ROW EXECUTE FUNCTION app.closed_finding_is_terminal();
CREATE FUNCTION app.completed_assessment_is_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state='COMPLETED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'A completed assessment is terminal' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER completed_assessment_terminal BEFORE UPDATE ON app.assessments FOR EACH ROW EXECUTE FUNCTION app.completed_assessment_is_terminal();
REVOKE ALL ON FUNCTION app.closed_finding_is_terminal,app.completed_assessment_is_terminal FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['processors','processor_purposes','processor_systems','processor_coordination','assessments','assessment_findings'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_processor_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''processor.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_processor_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''processor.write''))',tab);
 END LOOP;
END $$;
CREATE POLICY scoped_assessment_update ON app.assessments FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('processor.write'));
CREATE POLICY scoped_finding_update ON app.assessment_findings FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('processor.write'));
GRANT SELECT,INSERT ON app.processors,app.processor_purposes,app.processor_systems,app.processor_coordination,app.assessments,app.assessment_findings TO orvia_app;
GRANT UPDATE ON app.assessments,app.assessment_findings TO orvia_app;
REVOKE ALL ON app.processors,app.processor_purposes,app.processor_systems,app.processor_coordination,app.assessments,app.assessment_findings FROM PUBLIC;
