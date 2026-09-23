-- WP07 / M14 Rights Management.
-- The lifecycle state and the five independent dimensions are stored as separate
-- columns on purpose. A request that is administratively CLOSED keeps whatever
-- its execution and response dimensions actually were, so closure can never be
-- read as "every system was reached".

CREATE TABLE app.representation_mandates (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('NOMINATION','GUARDIAN')),
 principal_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','REVOKED','EXPIRED','SUPERSEDED')),
 valid_from timestamptz NOT NULL,valid_to timestamptz,
 revoked_at timestamptz,revocation_reason text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 CHECK(valid_to IS NULL OR valid_to>valid_from),
 CHECK((state='REVOKED')=(revoked_at IS NOT NULL)),
 CHECK((revoked_at IS NULL)=(revocation_reason IS NULL)));
CREATE INDEX mandates_by_principal ON app.representation_mandates(tenant_id,legal_entity_id,environment_id,principal_id);

CREATE TABLE app.rights_requests (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 right_type text NOT NULL CHECK(right_type IN ('ACCESS','CORRECTION','ERASURE','GRIEVANCE','NOMINATION')),
 principal_id uuid NOT NULL,mandate_id uuid,
 state text NOT NULL CHECK(state IN ('RECEIVED','PENDING_VERIFICATION','VERIFIED','SCOPING','AWAITING_APPROVAL','EXECUTING','PARTIALLY_COMPLETED','COMPLETED','FAILED','ESCALATED','REJECTED','CLOSED')),
 -- Five dimensions that move independently of the lifecycle state.
 identity text NOT NULL DEFAULT 'NOT_ASSESSED' CHECK(identity IN ('NOT_ASSESSED','UNDER_REVIEW','ESTABLISHED','AMBIGUOUS','NO_MATCH')),
 identity_grade text CHECK(identity_grade IN ('EXACT','STRONG','PROBABLE','AMBIGUOUS','NO_MATCH')),
 authority text NOT NULL DEFAULT 'NOT_ESTABLISHED' CHECK(authority IN ('NOT_ESTABLISHED','SELF','MANDATED','MANDATE_EXPIRED','MANDATE_REVOKED')),
 execution text NOT NULL DEFAULT 'NOT_STARTED' CHECK(execution IN ('NOT_STARTED','RUNNING','PARTIAL','COMPLETE','FAILED','MANUAL_REQUIRED')),
 response text NOT NULL DEFAULT 'NOT_PREPARED' CHECK(response IN ('NOT_PREPARED','IN_REVIEW','RELEASED','DELIVERY_FAILED','EXPIRED','WITHHELD')),
 scope text NOT NULL DEFAULT 'NOT_DETERMINED' CHECK(scope IN ('NOT_DETERMINED','DETERMINED','UNRESOLVED_DESTINATIONS')),
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,mandate_id) REFERENCES app.representation_mandates(tenant_id,legal_entity_id,environment_id,id),
 CHECK((identity='NOT_ASSESSED')=(identity_grade IS NULL)),
 -- An unresolved identity can never have produced a disclosure.
 CHECK(NOT(response='RELEASED' AND identity_grade IN ('AMBIGUOUS','NO_MATCH'))),
 CHECK(state=document->>'state'));
CREATE INDEX rights_requests_by_principal ON app.rights_requests(tenant_id,legal_entity_id,environment_id,principal_id);

-- Every planned action names its system. A destination the plan cannot reach is
-- recorded as unresolved and is never silently dropped from the record.
CREATE TABLE app.rights_request_plan_items (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 request_id uuid NOT NULL,system_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('DISCLOSE_COPY','CORRECT_RECORD','ERASE_RECORD','RESTRICT_PROCESSING','NO_ACTION_REQUIRED')),
 automatable boolean NOT NULL,retention_exception text,note text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,request_id,system_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,request_id) REFERENCES app.rights_requests(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));

-- Append-only history. Corrections append; a recorded transition is never edited.
CREATE TABLE app.rights_request_events (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 request_id uuid NOT NULL,from_state text,to_state text NOT NULL,reason text NOT NULL,
 actor_id uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,request_id) REFERENCES app.rights_requests(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX request_events_by_request ON app.rights_request_events(tenant_id,legal_entity_id,environment_id,request_id,recorded_at);

CREATE FUNCTION app.rights_history_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Rights request history is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER request_events_immutable BEFORE UPDATE OR DELETE ON app.rights_request_events FOR EACH ROW EXECUTE FUNCTION app.rights_history_is_append_only();
REVOKE ALL ON FUNCTION app.rights_history_is_append_only FROM PUBLIC;

-- CLOSED is terminal administrative closure. It cannot be reopened, and closing
-- must not rewrite what execution actually achieved.
CREATE FUNCTION app.closed_request_is_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state='CLOSED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'A closed rights request is terminal' USING ERRCODE='23514'; END IF;
 IF NEW.state='CLOSED' AND NEW.execution IS DISTINCT FROM OLD.execution
  THEN RAISE EXCEPTION 'Closing a request cannot change what execution achieved' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER closed_request_terminal BEFORE UPDATE ON app.rights_requests FOR EACH ROW EXECUTE FUNCTION app.closed_request_is_terminal();
REVOKE ALL ON FUNCTION app.closed_request_is_terminal FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['representation_mandates','rights_requests','rights_request_plan_items','rights_request_events'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_rights_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''rights.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_rights_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''rights.write''))',tab);
 END LOOP;
END $$;
CREATE POLICY scoped_request_update ON app.rights_requests FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('rights.write'));
CREATE POLICY scoped_mandate_update ON app.representation_mandates FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('rights.write'));
-- Re-scoping replaces the plan; the append-only event log retains that it happened.
CREATE POLICY scoped_plan_delete ON app.rights_request_plan_items FOR DELETE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('rights.write'));
GRANT SELECT,INSERT ON app.representation_mandates,app.rights_requests,app.rights_request_plan_items,app.rights_request_events TO orvia_app;
GRANT UPDATE ON app.rights_requests,app.representation_mandates TO orvia_app;
GRANT DELETE ON app.rights_request_plan_items TO orvia_app;
REVOKE ALL ON app.representation_mandates,app.rights_requests,app.rights_request_plan_items,app.rights_request_events FROM PUBLIC;
