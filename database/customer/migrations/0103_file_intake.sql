-- Owner decisions 2026-10-02 (revision 1.12, file intake): ORVIA takes in every kind of file it uses, both automatically from
-- a local inbox folder on the installation server and by manual upload in the workspace, on every plan. Every file is
-- staged; nothing it contains is applied until a staff member approves it. On approval the file is routed into the existing
-- path for its kind (licence, release, regulatory package, data inventory, existing-data onboarding) or kept as a document.
--
-- The file content lives in this customer-local database only while it is staged or kept as a document. A rejected file's
-- content is removed at rejection; the record that it arrived, its digest and who rejected it and why are kept.
CREATE TABLE app.file_intake_items (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 source text NOT NULL CHECK (source IN ('MANUAL_UPLOAD', 'INBOX_FOLDER')),
 original_name text NOT NULL CHECK (original_name ~ '^[^/\\\x00-\x1f]{1,200}$'),
 content_type text NOT NULL CHECK (length(content_type) BETWEEN 1 AND 100),
 size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
 sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
 detected_kind text NOT NULL CHECK (detected_kind IN ('LICENCE', 'RELEASE', 'REGULATORY_PACKAGE', 'DATA_ASSET_INVENTORY', 'ESTATE_ROWS', 'DOCUMENT', 'UNRECOGNISED')),
 detail text NOT NULL CHECK (length(detail) BETWEEN 1 AND 500),
 state text NOT NULL DEFAULT 'STAGED' CHECK (state IN ('STAGED', 'ROUTED', 'KEPT', 'REJECTED')),
 content bytea,
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(), received_by uuid NOT NULL,
 decided_at timestamptz, decided_by uuid, decision_reason text CHECK (decision_reason IS NULL OR length(decision_reason) BETWEEN 3 AND 500),
 routed_resource_id uuid, subject_kind text CHECK (subject_kind IS NULL OR subject_kind IN ('PROCESSOR', 'SYSTEM', 'INCIDENT', 'BREACH', 'RIGHTS_REQUEST', 'PURPOSE', 'NOTICE')),
 subject_id uuid,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id) REFERENCES app.environments(tenant_id, legal_entity_id, id),
 -- The same file dropped twice, or uploaded after it was dropped, is one item.
 UNIQUE (tenant_id, legal_entity_id, environment_id, sha256),
 CHECK ((state = 'STAGED') = (decided_at IS NULL)),
 CHECK ((decided_at IS NULL) = (decided_by IS NULL)),
 CHECK (state <> 'REJECTED' OR content IS NULL),
 CHECK (state NOT IN ('STAGED', 'KEPT') OR content IS NOT NULL),
 CHECK (state <> 'ROUTED' OR routed_resource_id IS NOT NULL),
 CHECK (state = 'KEPT' OR (subject_kind IS NULL AND subject_id IS NULL)),
 CHECK ((subject_kind IS NULL) = (subject_id IS NULL)),
 CHECK (state <> 'KEPT' OR detected_kind = 'DOCUMENT')
);
CREATE INDEX file_intake_items_recent ON app.file_intake_items (tenant_id, legal_entity_id, environment_id, received_at DESC);

-- A decision is final: a staged item is decided once and never reopened or edited afterwards.
CREATE FUNCTION app.file_intake_decided_once() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'file_intake_never_deleted' USING ERRCODE = '23514'; END IF;
  IF OLD.state <> 'STAGED' THEN RAISE EXCEPTION 'file_intake_already_decided' USING ERRCODE = '23514'; END IF;
  IF NEW.sha256 IS DISTINCT FROM OLD.sha256 OR NEW.received_at IS DISTINCT FROM OLD.received_at OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.detected_kind IS DISTINCT FROM OLD.detected_kind OR NEW.received_by IS DISTINCT FROM OLD.received_by THEN
    RAISE EXCEPTION 'file_intake_arrival_is_immutable' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.file_intake_decided_once() FROM PUBLIC;
CREATE TRIGGER file_intake_decided_once BEFORE UPDATE OR DELETE ON app.file_intake_items FOR EACH ROW EXECUTE FUNCTION app.file_intake_decided_once();

ALTER TABLE app.file_intake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.file_intake_items FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON app.file_intake_items FOR SELECT USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.read'));
CREATE POLICY staff_upload ON app.file_intake_items FOR INSERT WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.write') AND source = 'MANUAL_UPLOAD' AND state = 'STAGED');
CREATE POLICY staff_decide ON app.file_intake_items FOR UPDATE USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.write')) WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id));
-- The worker only stages what it finds in the inbox folder; it can never decide.
CREATE POLICY worker_read ON app.file_intake_items FOR SELECT USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
CREATE POLICY worker_stage ON app.file_intake_items FOR INSERT WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute') AND source = 'INBOX_FOLDER' AND state = 'STAGED');
GRANT SELECT, INSERT, UPDATE ON app.file_intake_items TO orvia_app;
GRANT SELECT, INSERT ON app.file_intake_items TO orvia_worker;
REVOKE ALL ON app.file_intake_items FROM PUBLIC;
