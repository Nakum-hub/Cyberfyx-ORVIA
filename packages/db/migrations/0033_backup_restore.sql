-- WP29 / WP32 / M32 Monitoring, FR-M32-03.
--
-- The privacy failure a backup subsystem exists to prevent is a restore that
-- quietly reinstates consent somebody has since withdrawn. An archive taken on
-- Monday and restored on Friday carries Monday's answers, and a system that
-- resumes processing from it is acting on permission that no longer exists.
--
-- So this is deliberately not a backup tool. ORVIA does not create, encrypt,
-- store or move an archive -- that is the customer's own database tooling and
-- their own key, and pretending otherwise would be the sort of claim this
-- product refuses to make. What ORVIA owns is the part only it can do: record a
-- verifiable statement of what the state was when the snapshot was taken, and
-- then refuse to let a restore resume until every consent decision that has
-- changed since has been looked at by a person.
--
-- Nothing bulk is stored to make that work. app.consent_events is already an
-- append-only history with timestamps, so the state as at any moment is a
-- query, not a copy.

CREATE TABLE app.backup_snapshots (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 taken_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 -- A reference to the key the customer holds. There is no column here in which
 -- a key, or anything long enough to be one, could be written.
 key_reference text NOT NULL CHECK(key_reference ~ '^[A-Za-z0-9._:/-]{3,120}$'),
 covers text[] NOT NULL CHECK(
   cardinality(covers)>0 AND covers <@ ARRAY['CONFIGURATION','WORKFLOW','EVIDENCE','DOMAIN_RECORDS']::text[]),
 -- What ORVIA actually saw when the snapshot was declared, so the record is
 -- checkable rather than a note that somebody took a backup.
 state_digest text NOT NULL CHECK(state_digest ~ '^[a-f0-9]{64}$'),
 counts jsonb NOT NULL,
 note text NOT NULL,
 taken_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id));
CREATE INDEX snapshots_by_time ON app.backup_snapshots(tenant_id,legal_entity_id,environment_id,taken_at DESC);

CREATE TABLE app.restore_runs (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 snapshot_id uuid NOT NULL,
 -- A restore begins in quarantine. There is no third value and no way to start
 -- anywhere else.
 state text NOT NULL DEFAULT 'QUARANTINED' CHECK(state IN ('QUARANTINED','RELEASED')),
 note text NOT NULL,
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),started_by uuid NOT NULL,
 released_at timestamptz,released_by uuid,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 -- Release is recorded whole or not at all.
 CHECK((state='RELEASED')=(released_at IS NOT NULL) AND (released_at IS NULL)=(released_by IS NULL)),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,snapshot_id) REFERENCES app.backup_snapshots(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX restores_by_snapshot ON app.restore_runs(tenant_id,legal_entity_id,environment_id,snapshot_id);

-- Each consent decision that changed between the snapshot and now, looked at by
-- a named person. Append-only: an acknowledgement is the record that somebody
-- accepted responsibility for a specific resurrection, and withdrawing it later
-- would remove exactly the evidence that matters.
CREATE TABLE app.restore_acknowledgements (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 restore_id uuid NOT NULL,principal_id uuid NOT NULL,purpose_id uuid NOT NULL,
 state_at_snapshot text NOT NULL CHECK(state_at_snapshot IN ('GRANTED','WITHDRAWN')),
 state_now text NOT NULL CHECK(state_now IN ('NOT_GIVEN','GRANTED','WITHDRAWN')),
 decision text NOT NULL CHECK(decision IN ('CURRENT_STATE_PREVAILS','RESTORED_STATE_PREVAILS')),
 basis text NOT NULL,
 acknowledged_at timestamptz NOT NULL DEFAULT clock_timestamp(),acknowledged_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,restore_id,principal_id,purpose_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,restore_id) REFERENCES app.restore_runs(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX acknowledgements_by_restore ON app.restore_acknowledgements(tenant_id,legal_entity_id,environment_id,restore_id);

CREATE FUNCTION app.backup_record_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'A snapshot statement and a restore acknowledgement are recorded once and never changed' USING ERRCODE='23514'; END $$;
CREATE TRIGGER snapshot_append_only BEFORE UPDATE OR DELETE ON app.backup_snapshots FOR EACH ROW EXECUTE FUNCTION app.backup_record_is_append_only();
CREATE TRIGGER acknowledgement_append_only BEFORE UPDATE OR DELETE ON app.restore_acknowledgements FOR EACH ROW EXECUTE FUNCTION app.backup_record_is_append_only();
REVOKE ALL ON FUNCTION app.backup_record_is_append_only FROM PUBLIC;

-- Quarantine is a one-way door in the safe direction only. A restore that could
-- be returned to quarantine after release would make the released state mean
-- nothing, and one that could be released twice would hide the first.
CREATE FUNCTION app.restore_leaves_quarantine_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state='RELEASED' THEN
  RAISE EXCEPTION 'A released restore is terminal' USING ERRCODE='23514';
 END IF;
 IF NEW.snapshot_id<>OLD.snapshot_id OR NEW.started_at<>OLD.started_at OR NEW.started_by<>OLD.started_by THEN
  RAISE EXCEPTION 'A restore run does not change which snapshot it came from' USING ERRCODE='23514';
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER restore_leaves_quarantine_once BEFORE UPDATE ON app.restore_runs FOR EACH ROW EXECUTE FUNCTION app.restore_leaves_quarantine_once();
CREATE FUNCTION app.restore_run_is_not_deleted() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'A restore run is kept, so what was restored and what was decided stays answerable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER restore_run_is_not_deleted BEFORE DELETE ON app.restore_runs FOR EACH ROW EXECUTE FUNCTION app.restore_run_is_not_deleted();
REVOKE ALL ON FUNCTION app.restore_leaves_quarantine_once,app.restore_run_is_not_deleted FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['backup_snapshots','restore_runs','restore_acknowledgements'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''health.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''configuration.write''))',tab);
 END LOOP;
END $$;
-- Leaving quarantine is its own authority. Recording that a restore happened
-- and deciding that it may resume are different acts by potentially different
-- people, which is the whole point of the quarantine.
CREATE POLICY scoped_release ON app.restore_runs FOR UPDATE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('restore.release'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));

GRANT SELECT,INSERT ON app.backup_snapshots,app.restore_acknowledgements TO orvia_app;
GRANT SELECT,INSERT,UPDATE ON app.restore_runs TO orvia_app;
REVOKE ALL ON app.backup_snapshots,app.restore_runs,app.restore_acknowledgements FROM PUBLIC;
