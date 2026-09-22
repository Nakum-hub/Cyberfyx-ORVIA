-- WP02 / WP14 / M33 Audit Administration, FR-M33-04.
--
-- Purpose-based retention for the audit trail. Three things shape what this can
-- honestly be in V1.
--
-- First, app.audit_events has no payload column. It never had one: the record is
-- an envelope -- who, what operation, on which resource, under which request,
-- when -- and nothing else. So payload minimisation here is not a policy that
-- could lapse, it is the absence of a place to put anything, and "justified
-- payload deletion" cannot occur because there is no payload to delete. The
-- report measures that rather than asserting it, and refuses to render at all if
-- a payload column ever appears.
--
-- Second, migration 0027 made the trail append-only with a trigger that refuses
-- UPDATE and DELETE even to the migrator. Retention here is therefore a
-- schedule and a disclosure, not an automatic purge. A product that quietly
-- deleted its own audit trail on a timer would be the exact failure the trigger
-- exists to prevent, and expiry is not a justification that outranks it.
--
-- Third, OPEN-10 forbids universal statutory retention numbers. So no period is
-- shipped. Each purpose gets a period only when somebody configures one and
-- names where it comes from, and a purpose with no configured period says so
-- rather than defaulting to a comfortable number or to forever.

CREATE TABLE app.audit_retention_rules (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 -- Why the record is kept. Closed, so a retention reason can never become prose
 -- and every audited category maps to exactly one of these in the domain.
 purpose text NOT NULL CHECK(purpose IN
   ('SECURITY_INVESTIGATION','REGULATORY_ACCOUNTABILITY','COMMERCIAL_OBLIGATION','CHANGE_TRACEABILITY')),
 days integer NOT NULL CHECK(days BETWEEN 1 AND 3650),
 -- Where the number came from. OPEN-10's interim rule forbids universal
 -- statutory retention numbers, so there is no default and no way to record a
 -- period without saying what it is based on.
 source_reference text NOT NULL CHECK(length(btrim(source_reference))>=10),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id));
-- Versions, not edits. The current rule for a purpose is the most recent one.
-- Shortening a retention period is exactly the change somebody would make to
-- clear a backlog, so the previous period has to stay visible.
CREATE INDEX retention_rules_by_purpose
 ON app.audit_retention_rules(tenant_id,legal_entity_id,environment_id,purpose,recorded_at DESC);

CREATE FUNCTION app.audit_retention_rule_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'A retention rule is superseded by recording a new one, never edited or removed' USING ERRCODE='23514'; END $$;
CREATE TRIGGER retention_rule_append_only BEFORE UPDATE OR DELETE ON app.audit_retention_rules
 FOR EACH ROW EXECUTE FUNCTION app.audit_retention_rule_is_append_only();
REVOKE ALL ON FUNCTION app.audit_retention_rule_is_append_only FROM PUBLIC;

ALTER TABLE app.audit_retention_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_retention_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.audit_retention_rules FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
   AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit.read'));
-- Setting how long the trail is kept is audit administration, not audit reading.
CREATE POLICY scoped_write ON app.audit_retention_rules FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id)
   AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit.administer'));

GRANT SELECT,INSERT ON app.audit_retention_rules TO orvia_app;
REVOKE ALL ON app.audit_retention_rules FROM PUBLIC;
