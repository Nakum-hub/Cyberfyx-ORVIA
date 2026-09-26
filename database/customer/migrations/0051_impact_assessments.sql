-- EX06 general impact assessments (PIA, DPIA, SDF DPIA, AI and vendor due
-- diligence). Templates are versioned and published by someone other than their
-- author. Answers, findings and finding events are append-only history; an
-- assessment's current answers are the latest per question. Nothing here is a
-- legal conclusion: an approved assessment records a reviewed decision.
CREATE TABLE app.impact_templates (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, template_key uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 kind text NOT NULL CHECK(kind IN ('PIA','DPIA','SDF_DPIA','AI','VENDOR_DUE_DILIGENCE','OTHER')),
 name text NOT NULL, description text NOT NULL, questions jsonb NOT NULL CHECK(jsonb_typeof(questions)='array' AND jsonb_array_length(questions) BETWEEN 1 AND 100),
 requirement_ids text[] NOT NULL DEFAULT '{}', review_interval_days integer NOT NULL CHECK(review_interval_days BETWEEN 1 AND 1095),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','RETIRED')),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 published_by uuid, published_at timestamptz, retired_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,template_key,version),
 CHECK((status='DRAFT')=(published_at IS NULL)), CHECK(published_by IS NULL OR published_by<>recorded_by));
CREATE TABLE app.impact_assessments (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, template_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0), previous_id uuid,
 subject_kind text NOT NULL CHECK(subject_kind IN ('ORGANISATION','ACTIVITY','SYSTEM','PROCESSOR','PROCESSOR_ENGAGEMENT','AI_SYSTEM')),
 subject_id uuid, title text NOT NULL, owner_reference text NOT NULL, due_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','SUPERSEDED')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 submitted_by uuid, submitted_at timestamptz, decided_by uuid, decided_at timestamptz, decision_note text, next_review_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,template_id) REFERENCES app.impact_templates(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,previous_id) REFERENCES app.impact_assessments(tenant_id,legal_entity_id,environment_id,id),
 CHECK((subject_kind='ORGANISATION')=(subject_id IS NULL)),
 CHECK(decided_by IS NULL OR (decided_by<>created_by AND decided_by<>submitted_by)));
-- A revision supersedes exactly one predecessor, once.
CREATE UNIQUE INDEX impact_one_successor ON app.impact_assessments(tenant_id,legal_entity_id,environment_id,previous_id) WHERE previous_id IS NOT NULL;
CREATE INDEX impact_assessment_subject ON app.impact_assessments(tenant_id,legal_entity_id,environment_id,subject_kind,subject_id);
CREATE TABLE app.impact_answers (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, assessment_id uuid NOT NULL, sequence bigint GENERATED ALWAYS AS IDENTITY,
 question_key text NOT NULL, value text NOT NULL, evidence_reference text, carried_forward boolean NOT NULL DEFAULT false,
 answered_by uuid NOT NULL, answered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,assessment_id) REFERENCES app.impact_assessments(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX impact_answer_latest ON app.impact_answers(tenant_id,legal_entity_id,environment_id,assessment_id,question_key,sequence DESC);
CREATE TABLE app.impact_findings (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, assessment_id uuid NOT NULL, question_key text,
 source text NOT NULL CHECK(source IN ('ANSWER_RULE','REVIEWER','MANUAL')),
 title text NOT NULL, severity text NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 owner_reference text NOT NULL, due_at timestamptz NOT NULL, grc_risk_id uuid, grc_control_id uuid,
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,assessment_id) REFERENCES app.impact_assessments(tenant_id,legal_entity_id,environment_id,id));
-- An answer rule raises one finding per question per assessment, however often it is re-evaluated.
CREATE UNIQUE INDEX impact_rule_finding_once ON app.impact_findings(tenant_id,legal_entity_id,environment_id,assessment_id,question_key) WHERE source='ANSWER_RULE';
CREATE TABLE app.impact_finding_events (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, finding_id uuid NOT NULL, sequence bigint GENERATED ALWAYS AS IDENTITY,
 kind text NOT NULL CHECK(kind IN ('REMEDIATION_PLANNED','RESOLVED','RISK_ACCEPTED','ESCALATED','REOPENED')),
 note text NOT NULL, evidence_reference text, acceptance_expires_at timestamptz,
 actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,finding_id) REFERENCES app.impact_findings(tenant_id,legal_entity_id,environment_id,id),
 CHECK((kind='RISK_ACCEPTED')=(acceptance_expires_at IS NOT NULL)),
 CHECK(kind<>'RESOLVED' OR evidence_reference IS NOT NULL));
CREATE INDEX impact_finding_event_latest ON app.impact_finding_events(tenant_id,legal_entity_id,environment_id,finding_id,sequence DESC);
-- Escalation is recorded once per overdue finding and due date.
CREATE UNIQUE INDEX impact_escalated_once ON app.impact_finding_events(tenant_id,legal_entity_id,environment_id,finding_id,(note)) WHERE kind='ESCALATED';

CREATE FUNCTION app.impact_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Assessment history is append-only' USING ERRCODE='23514'; END $$;
REVOKE ALL ON FUNCTION app.impact_history_immutable FROM PUBLIC;
-- Templates and assessments change only along their lifecycle; nothing is deleted.
CREATE FUNCTION app.impact_lifecycle_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Assessment records are never deleted' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='impact_templates' THEN
  IF (NEW.id,NEW.template_key,NEW.version,NEW.kind,NEW.name,NEW.description,NEW.questions,NEW.requirement_ids,NEW.review_interval_days,NEW.recorded_by)
     IS DISTINCT FROM (OLD.id,OLD.template_key,OLD.version,OLD.kind,OLD.name,OLD.description,OLD.questions,OLD.requirement_ids,OLD.review_interval_days,OLD.recorded_by)
     OR NOT ((OLD.status='DRAFT' AND NEW.status='PUBLISHED') OR (OLD.status='PUBLISHED' AND NEW.status='RETIRED'))
  THEN RAISE EXCEPTION 'A template version is immutable once recorded' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.template_id,NEW.revision,NEW.previous_id,NEW.subject_kind,NEW.subject_id,NEW.created_by) IS DISTINCT FROM (OLD.id,OLD.template_id,OLD.revision,OLD.previous_id,OLD.subject_kind,OLD.subject_id,OLD.created_by)
     OR NOT ((OLD.status='DRAFT' AND NEW.status IN ('DRAFT','SUBMITTED')) OR (OLD.status='SUBMITTED' AND NEW.status IN ('APPROVED','REJECTED')) OR (OLD.status='APPROVED' AND NEW.status='SUPERSEDED'))
  THEN RAISE EXCEPTION 'An assessment moves only along its lifecycle' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.impact_lifecycle_guard FROM PUBLIC;
CREATE TRIGGER lifecycle BEFORE UPDATE OR DELETE ON app.impact_templates FOR EACH ROW EXECUTE FUNCTION app.impact_lifecycle_guard();
CREATE TRIGGER lifecycle BEFORE UPDATE OR DELETE ON app.impact_assessments FOR EACH ROW EXECUTE FUNCTION app.impact_lifecycle_guard();

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['impact_answers','impact_findings','impact_finding_events'] LOOP
  EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.impact_history_immutable()',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['impact_templates','impact_assessments','impact_answers','impact_findings','impact_finding_events'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY impact_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true) IN (''STAFF'',''MACHINE'') AND (app.has_capability(''grc.read'') OR app.has_capability(''operations.execute'')))',tab);
  EXECUTE format('CREATE POLICY impact_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true) IN (''STAFF'',''MACHINE'') AND (app.has_capability(''grc.write'') OR app.has_capability(''grc.approve'') OR app.has_capability(''operations.execute'')))',tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
  EXECUTE format('GRANT SELECT,INSERT ON app.%I TO orvia_app,orvia_worker',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['impact_templates','impact_assessments'] LOOP
  EXECUTE format('CREATE POLICY impact_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND (app.has_capability(''grc.write'') OR app.has_capability(''grc.approve''))) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id))',tab);
  EXECUTE format('GRANT UPDATE ON app.%I TO orvia_app',tab);
 END LOOP;
END $$;
GRANT USAGE ON SEQUENCE app.impact_answers_sequence_seq, app.impact_finding_events_sequence_seq TO orvia_app, orvia_worker;
