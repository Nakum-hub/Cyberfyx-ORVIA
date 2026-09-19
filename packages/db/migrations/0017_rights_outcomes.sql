-- WP08 / M14 execution outcomes.
-- One row per system actually acted on. The execution dimension on the request
-- is computed from these rows, so it can never claim more than was recorded.

CREATE TABLE app.rights_request_outcomes (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 request_id uuid NOT NULL,system_id uuid NOT NULL,
 result text NOT NULL CHECK(result IN ('SUCCEEDED','FAILED','EFFECT_UNKNOWN','MANUAL_REQUIRED','NOT_SUPPORTED')),
 method text NOT NULL CHECK(method IN ('CONNECTOR_OPERATION','MANUAL_ATTESTATION','NONE')),
 evidence_reference text,note text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,request_id,system_id),
 -- An outcome may only exist for a system the plan actually names.
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,request_id,system_id)
   REFERENCES app.rights_request_plan_items(tenant_id,legal_entity_id,environment_id,request_id,system_id),
 -- Success is a claim about the outside world; it must name method and evidence.
 CHECK(NOT(result='SUCCEEDED' AND (method='NONE' OR evidence_reference IS NULL))),
 CHECK(NOT(result='EFFECT_UNKNOWN' AND method<>'CONNECTOR_OPERATION')),
 CHECK(NOT(result='FAILED' AND method='NONE')),
 -- Work that has not happened yet carries no method and no evidence.
 CHECK(NOT(result IN ('MANUAL_REQUIRED','NOT_SUPPORTED') AND (method<>'NONE' OR evidence_reference IS NOT NULL))));

-- A recorded outcome is a statement about what happened. Correcting it means
-- recording a new one deliberately, not quietly editing the old claim.
CREATE FUNCTION app.outcome_is_not_rewritable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'A recorded execution outcome cannot be rewritten or deleted' USING ERRCODE='23514'; END $$;
CREATE TRIGGER outcome_immutable BEFORE UPDATE OR DELETE ON app.rights_request_outcomes FOR EACH ROW EXECUTE FUNCTION app.outcome_is_not_rewritable();
REVOKE ALL ON FUNCTION app.outcome_is_not_rewritable FROM PUBLIC;

ALTER TABLE app.rights_request_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rights_request_outcomes FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_outcome_read ON app.rights_request_outcomes FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('rights.read'));
CREATE POLICY scoped_outcome_insert ON app.rights_request_outcomes FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('rights.write') AND recorded_by::text=current_setting('orvia.actor_id',true));
GRANT SELECT,INSERT ON app.rights_request_outcomes TO orvia_app;
REVOKE ALL ON app.rights_request_outcomes FROM PUBLIC;

-- Re-scoping a request must not silently discard outcomes already recorded
-- against a system: the plan row it depends on cannot be removed while it exists.
CREATE FUNCTION app.plan_item_with_outcome_is_retained() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM app.rights_request_outcomes o WHERE o.tenant_id=OLD.tenant_id AND o.legal_entity_id=OLD.legal_entity_id
   AND o.environment_id=OLD.environment_id AND o.request_id=OLD.request_id AND o.system_id=OLD.system_id)
  THEN RAISE EXCEPTION 'A system with a recorded outcome cannot be dropped from the plan' USING ERRCODE='23514'; END IF;
 RETURN OLD; END $$;
CREATE TRIGGER plan_item_retained BEFORE DELETE ON app.rights_request_plan_items FOR EACH ROW EXECUTE FUNCTION app.plan_item_with_outcome_is_retained();
REVOKE ALL ON FUNCTION app.plan_item_with_outcome_is_retained FROM PUBLIC;
