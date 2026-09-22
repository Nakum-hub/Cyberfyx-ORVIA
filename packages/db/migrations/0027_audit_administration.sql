-- WP02 / WP14 / M33 Audit Administration, FR-M33-03.
--
-- Two guarantees live here rather than in application code.
--
-- The first: an audit event is never edited or removed. Policy and grants
-- already stopped the application role from trying, but a policy is a statement
-- about one role. The migrator is superuser and bypasses row-level security, so
-- without a trigger the only thing standing between the audit trail and a
-- privileged rewrite was that nobody had written the UPDATE. Now nothing can.
--
-- The second: a disputed record is corrected by appending, never by amending.
-- A correction names the event it disputes and states what is disputed and what
-- the recorder believes to be true. The original stays exactly as it was, which
-- is the only reason reading the trail later means anything.

CREATE FUNCTION app.audit_event_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'An audit event is recorded once and is never edited or removed' USING ERRCODE='23514'; END $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON app.audit_events FOR EACH ROW EXECUTE FUNCTION app.audit_event_is_append_only();
REVOKE ALL ON FUNCTION app.audit_event_is_append_only FROM PUBLIC;

-- The trail was keyed on id alone, which is unique but says nothing about
-- scope. A correction must reference the event *and* the scope it belongs to,
-- so that a correction can never name an event in another organisation's trail
-- even if an id leaked. This is the constraint the foreign key below needs.
ALTER TABLE app.audit_events ADD CONSTRAINT audit_events_scoped_id UNIQUE(tenant_id,legal_entity_id,environment_id,id);

CREATE TABLE app.audit_corrections (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 -- The event this disputes. It is a reference, never a replacement.
 event_id uuid NOT NULL,
 disputed text NOT NULL CHECK(disputed IN ('WRONG_ACTOR','WRONG_RESOURCE','WRONG_OPERATION','DUPLICATE_RECORD','MISLEADING_WITHOUT_CONTEXT')),
 correction text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,event_id) REFERENCES app.audit_events(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX corrections_by_event ON app.audit_corrections(tenant_id,legal_entity_id,environment_id,event_id);

-- A correction is itself part of the trail, so it is append-only too. A
-- correction that could be withdrawn would let somebody dispute a record, have
-- the dispute noticed, and then remove the evidence that they had disputed it.
CREATE FUNCTION app.audit_correction_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'An audit correction is appended once and is never edited or removed' USING ERRCODE='23514'; END $$;
CREATE TRIGGER correction_append_only BEFORE UPDATE OR DELETE ON app.audit_corrections FOR EACH ROW EXECUTE FUNCTION app.audit_correction_is_append_only();
REVOKE ALL ON FUNCTION app.audit_correction_is_append_only FROM PUBLIC;

ALTER TABLE app.audit_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_corrections FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_correction_read ON app.audit_corrections FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit.read'));
-- Recording a correction is audit administration and needs its own authority.
-- Reading the trail, however widely granted, never carries it.
CREATE POLICY scoped_correction_write ON app.audit_corrections FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit.administer'));

-- The audit trail became readable through the product in this migration, so the
-- read is gated on its own capability rather than inheriting one. Row-level
-- policies for the same command are ORed, and the existing scoped_read already
-- admits anyone holding evidence.read, so this does not narrow anything -- it
-- lets an operator read the trail on audit.read alone, without being given
-- authority over exports as the price of it.
CREATE POLICY scoped_audit_administration_read ON app.audit_events FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit.read'));

GRANT SELECT,INSERT ON app.audit_corrections TO orvia_app;
REVOKE ALL ON app.audit_corrections FROM PUBLIC;
