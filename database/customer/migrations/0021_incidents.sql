-- WP17 / M17 Privacy Incident Explorer.
-- Occurrence, detection and awareness are three separate columns because
-- obligations run from different ones. Deadlines come from customer-activated
-- rule packs; this product ships no universal notification hours.

CREATE TABLE app.obligation_rules (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 runs_from text NOT NULL CHECK(runs_from IN ('OCCURRED_AT','DETECTED_AT','BECAME_AWARE_AT')),
 hours integer NOT NULL CHECK(hours BETWEEN 1 AND 8760),
 minimum_severity text NOT NULL CHECK(minimum_severity IN ('NEGLIGIBLE','LOW','MEDIUM','HIGH','SEVERE')),
 applies_when_scope_uncertain boolean NOT NULL,
 active boolean NOT NULL DEFAULT true,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id));

CREATE TABLE app.incidents (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','CONTAINED','CLOSED')),
 severity text NOT NULL CHECK(severity IN ('NEGLIGIBLE','LOW','MEDIUM','HIGH','SEVERE')),
 occurred_at timestamptz,detected_at timestamptz NOT NULL,became_aware_at timestamptz,
 principal_scope_certain boolean NOT NULL,
 contained_at timestamptz,closed_at timestamptz,closure_note text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 -- These orderings are the reason the three moments are kept apart at all.
 CHECK(occurred_at IS NULL OR detected_at>=occurred_at),
 CHECK(became_aware_at IS NULL OR became_aware_at>=detected_at),
 CHECK((state='CLOSED')=(closed_at IS NOT NULL)),
 CHECK((closed_at IS NULL)=(closure_note IS NULL)),
 CHECK(NOT(state='OPEN' AND contained_at IS NOT NULL)));

CREATE TABLE app.incident_scope (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 incident_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('SYSTEM','PURPOSE','PROCESSOR')),subject_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,incident_id,kind,subject_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,incident_id) REFERENCES app.incidents(tenant_id,legal_entity_id,environment_id,id));

-- Corrections append. The original value is preserved beside the new one, and
-- the obligations whose deadlines moved are named, so a clock never shifts
-- quietly.
CREATE TABLE app.incident_corrections (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 incident_id uuid NOT NULL,
 field text NOT NULL CHECK(field IN ('OCCURRED_AT','BECAME_AWARE_AT','SEVERITY','PRINCIPAL_SCOPE')),
 previous_value text,new_value text NOT NULL,reason text NOT NULL,reviewer_reference text NOT NULL,
 affected_deadlines uuid[] NOT NULL DEFAULT '{}',
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,incident_id) REFERENCES app.incidents(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX corrections_by_incident ON app.incident_corrections(tenant_id,legal_entity_id,environment_id,incident_id,recorded_at);

CREATE TABLE app.notification_obligations (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 incident_id uuid NOT NULL,rule_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(state IN ('NOT_APPLICABLE','PENDING_REVIEW','DRAFTED','APPROVED','DISPATCHED','DELIVERY_UNCONFIRMED','MANUAL_PACKAGE_REQUIRED')),
 clock_started_at timestamptz,due_at timestamptz,
 dispatch_evidence text,unavailable_reason text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,incident_id,rule_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,incident_id) REFERENCES app.incidents(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,rule_id) REFERENCES app.obligation_rules(tenant_id,legal_entity_id,environment_id,id),
 -- A deadline exists exactly when its clock has started.
 CHECK((clock_started_at IS NULL)=(due_at IS NULL)),
 CHECK(NOT(state='DISPATCHED' AND dispatch_evidence IS NULL)),
 CHECK(NOT(state='MANUAL_PACKAGE_REQUIRED' AND unavailable_reason IS NULL)));
CREATE INDEX obligations_by_incident ON app.notification_obligations(tenant_id,legal_entity_id,environment_id,incident_id);

CREATE FUNCTION app.incident_history_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Incident corrections are append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER corrections_immutable BEFORE UPDATE OR DELETE ON app.incident_corrections FOR EACH ROW EXECUTE FUNCTION app.incident_history_is_append_only();
REVOKE ALL ON FUNCTION app.incident_history_is_append_only FROM PUBLIC;

-- A dispatched notification is a thing that left the building. It cannot be
-- un-dispatched, and closing an incident cannot rewrite what was sent.
CREATE FUNCTION app.dispatched_notification_is_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state='DISPATCHED' AND NEW.state<>'DISPATCHED'
  THEN RAISE EXCEPTION 'A dispatched notification cannot be withdrawn' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER dispatched_terminal BEFORE UPDATE ON app.notification_obligations FOR EACH ROW EXECUTE FUNCTION app.dispatched_notification_is_terminal();
CREATE FUNCTION app.closed_incident_is_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state='CLOSED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'A closed incident is terminal' USING ERRCODE='23514'; END IF;
 IF NEW.detected_at IS DISTINCT FROM OLD.detected_at THEN RAISE EXCEPTION 'A detection time is never rewritten; record a correction' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER closed_incident_terminal BEFORE UPDATE ON app.incidents FOR EACH ROW EXECUTE FUNCTION app.closed_incident_is_terminal();
REVOKE ALL ON FUNCTION app.dispatched_notification_is_terminal,app.closed_incident_is_terminal FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['obligation_rules','incidents','incident_scope','incident_corrections','notification_obligations'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_incident_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''incident.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_incident_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''incident.write''))',tab);
 END LOOP;
END $$;
-- Activating a rule pack and closing an incident are approval acts.
CREATE POLICY scoped_rule_activate ON app.obligation_rules FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('incident.approve'));
CREATE POLICY scoped_incident_update ON app.incidents FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('incident.write'));
CREATE POLICY scoped_obligation_update ON app.notification_obligations FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('incident.write'));
GRANT SELECT,INSERT ON app.obligation_rules,app.incidents,app.incident_scope,app.incident_corrections,app.notification_obligations TO orvia_app;
GRANT UPDATE ON app.obligation_rules,app.incidents,app.notification_obligations TO orvia_app;
REVOKE ALL ON app.obligation_rules,app.incidents,app.incident_scope,app.incident_corrections,app.notification_obligations FROM PUBLIC;
