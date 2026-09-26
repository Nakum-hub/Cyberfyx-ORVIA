-- EX05 data mapping and records of processing; bounded resumable exports.
-- A system's location is a reviewed declaration, versioned and never edited.
-- A record-of-processing version is an immutable snapshot of what the registry,
-- graph and observations said at the time, approved by someone other than the
-- person who recorded it. An export is produced in bounded chunks under the
-- requester's own authority, resumes from its last committed chunk, and is
-- downloadable only once its manifest proves it carries every matched row.
CREATE TABLE app.system_locations (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, system_id uuid NOT NULL,
 region text NOT NULL CHECK(region ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'),
 hosting_description text NOT NULL, basis text NOT NULL,
 valid_from timestamptz NOT NULL, valid_to timestamptz,
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK(valid_to IS NULL OR valid_to>valid_from));
CREATE UNIQUE INDEX system_location_current ON app.system_locations(tenant_id,legal_entity_id,environment_id,system_id) WHERE valid_to IS NULL;

CREATE TABLE app.ropa_versions (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, version integer NOT NULL CHECK(version>0), note text NOT NULL,
 as_of timestamptz NOT NULL, content jsonb NOT NULL, content_digest text NOT NULL CHECK(content_digest ~ '^[a-f0-9]{64}$'),
 activity_count integer NOT NULL CHECK(activity_count>=0), gap_count integer NOT NULL CHECK(gap_count>=0),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_by uuid, approved_at timestamptz, approval_note text,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id), UNIQUE(tenant_id,legal_entity_id,environment_id,version),
 CHECK(jsonb_typeof(content)='array'), CHECK((approved_by IS NULL)=(approved_at IS NULL) AND (approved_by IS NULL)=(approval_note IS NULL)),
 CHECK(approved_by IS NULL OR approved_by<>recorded_by));

CREATE TABLE app.export_jobs (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('ROPA_VERSION_CSV','AUDIT_EVENTS_JSONL')),
 source_id uuid, filter jsonb NOT NULL DEFAULT '{}', as_of timestamptz NOT NULL,
 expected_rows integer NOT NULL CHECK(expected_rows>=0 AND expected_rows<=2000000),
 state text NOT NULL DEFAULT 'RUNNING' CHECK(state IN ('RUNNING','COMPLETED','FAILED','CANCELLED')),
 cursor text, rows_written integer NOT NULL DEFAULT 0 CHECK(rows_written>=0), chunks integer NOT NULL DEFAULT 0 CHECK(chunks>=0),
 failure_code text, manifest jsonb,
 requested_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), finished_at timestamptz, expires_at timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 CHECK((kind='ROPA_VERSION_CSV')=(source_id IS NOT NULL)),
 CHECK((state='COMPLETED')=(manifest IS NOT NULL)), CHECK((state='FAILED')=(failure_code IS NOT NULL)), CHECK((state='RUNNING')=(finished_at IS NULL)));
CREATE INDEX export_jobs_by_requester ON app.export_jobs(tenant_id,legal_entity_id,environment_id,requested_by,created_at DESC);
CREATE TABLE app.export_chunks (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 job_id uuid NOT NULL, sequence integer NOT NULL CHECK(sequence>0), row_count integer NOT NULL CHECK(row_count>=0),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), content text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,job_id,sequence),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,job_id) REFERENCES app.export_jobs(tenant_id,legal_entity_id,environment_id,id));

CREATE FUNCTION app.ropa_export_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='system_locations' THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'A location declaration is never deleted' USING ERRCODE='23514'; END IF;
  IF (NEW.id,NEW.system_id,NEW.region,NEW.hosting_description,NEW.basis,NEW.valid_from,NEW.recorded_by) IS DISTINCT FROM (OLD.id,OLD.system_id,OLD.region,OLD.hosting_description,OLD.basis,OLD.valid_from,OLD.recorded_by)
     OR OLD.valid_to IS NOT NULL OR NEW.valid_to IS NULL
  THEN RAISE EXCEPTION 'A location declaration is closed once and otherwise unchanged' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='ropa_versions' THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'A processing record version is never deleted' USING ERRCODE='23514'; END IF;
  IF (NEW.id,NEW.version,NEW.note,NEW.as_of,NEW.content,NEW.content_digest,NEW.activity_count,NEW.gap_count,NEW.recorded_by)
     IS DISTINCT FROM (OLD.id,OLD.version,OLD.note,OLD.as_of,OLD.content,OLD.content_digest,OLD.activity_count,OLD.gap_count,OLD.recorded_by) OR OLD.approved_by IS NOT NULL
  THEN RAISE EXCEPTION 'A processing record version is immutable; it is approved once' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='export_jobs' THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'An export job is never deleted' USING ERRCODE='23514'; END IF;
  IF (NEW.id,NEW.kind,NEW.source_id,NEW.filter,NEW.as_of,NEW.expected_rows,NEW.requested_by,NEW.created_at,NEW.expires_at)
     IS DISTINCT FROM (OLD.id,OLD.kind,OLD.source_id,OLD.filter,OLD.as_of,OLD.expected_rows,OLD.requested_by,OLD.created_at,OLD.expires_at)
     OR OLD.state<>'RUNNING' OR NEW.rows_written<OLD.rows_written OR NEW.chunks<OLD.chunks
  THEN RAISE EXCEPTION 'An export job only advances while running and never rewinds' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='export_chunks' THEN
  -- A chunk is a copy made for a download. It is never altered; it is removed only once its job has expired.
  IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'An export chunk is never altered' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM app.export_jobs j WHERE j.tenant_id=OLD.tenant_id AND j.legal_entity_id=OLD.legal_entity_id AND j.environment_id=OLD.environment_id AND j.id=OLD.job_id AND j.expires_at<clock_timestamp())
  THEN RAISE EXCEPTION 'An export chunk is removed only after its job expires' USING ERRCODE='23514'; END IF;
  RETURN OLD;
 END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.ropa_export_guard FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['system_locations','ropa_versions','export_jobs','export_chunks'] LOOP
  EXECUTE format('CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.ropa_export_guard()',tab);
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
 END LOOP;
END $$;
-- Locations and processing records: registry readers read, registry writers declare and record.
CREATE POLICY ropa_read ON app.system_locations FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('registry.read'));
CREATE POLICY ropa_insert ON app.system_locations FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('registry.write') AND recorded_by::text=current_setting('orvia.actor_id',true));
CREATE POLICY ropa_close ON app.system_locations FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('registry.write')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY ropa_read ON app.ropa_versions FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('registry.read'));
CREATE POLICY ropa_insert ON app.ropa_versions FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('registry.write') AND recorded_by::text=current_setting('orvia.actor_id',true));
CREATE POLICY ropa_approve ON app.ropa_versions FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('operations.approve'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND approved_by::text=current_setting('orvia.actor_id',true));
-- Exports belong to the person who requested them; nobody else reads, advances or downloads them.
CREATE POLICY export_own ON app.export_jobs FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND requested_by::text=current_setting('orvia.actor_id',true));
CREATE POLICY export_create ON app.export_jobs FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND requested_by::text=current_setting('orvia.actor_id',true)
 AND ((kind='ROPA_VERSION_CSV' AND app.has_capability('evidence.export') AND app.has_capability('registry.read')) OR (kind='AUDIT_EVENTS_JSONL' AND app.has_capability('audit.export'))));
CREATE POLICY export_advance ON app.export_jobs FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND requested_by::text=current_setting('orvia.actor_id',true))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY export_machine_read ON app.export_jobs FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute') AND expires_at<clock_timestamp());
CREATE POLICY chunk_own ON app.export_chunks FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND EXISTS(SELECT 1 FROM app.export_jobs j WHERE j.tenant_id=export_chunks.tenant_id AND j.legal_entity_id=export_chunks.legal_entity_id AND j.environment_id=export_chunks.environment_id AND j.id=export_chunks.job_id));
CREATE POLICY chunk_write ON app.export_chunks FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF'
 AND EXISTS(SELECT 1 FROM app.export_jobs j WHERE j.tenant_id=export_chunks.tenant_id AND j.legal_entity_id=export_chunks.legal_entity_id AND j.environment_id=export_chunks.environment_id AND j.id=export_chunks.job_id AND j.state='RUNNING'));
-- The runner purges chunks of expired jobs; the trigger refuses anything else.
CREATE POLICY chunk_purge ON app.export_chunks FOR DELETE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute'));
GRANT SELECT,INSERT,UPDATE ON app.system_locations, app.ropa_versions, app.export_jobs TO orvia_app;
GRANT SELECT,INSERT ON app.export_chunks TO orvia_app;
GRANT SELECT ON app.export_jobs TO orvia_worker;
GRANT SELECT,DELETE ON app.export_chunks TO orvia_worker;
