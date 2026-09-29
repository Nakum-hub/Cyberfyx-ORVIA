-- Audit channel round trip and hardening (task AUDIT-PRACTICE-01, revision 1.6):
--
--   lease               one worker at a time services a mandate; a crashed worker's lease lapses;
--   channel documents   signed findings, request lists and reports the vendor offers at check-in,
--                       staged here until a person imports them through the verified import;
--   finding responses   a management response to an audit finding, prepared by one person,
--                       approved by a different owner or administrator, then signed by the
--                       installation evidence key and sent by the worker while a mandate is open.
--
-- Nothing here lets the vendor reach the installation: documents arrive only in the answer to a
-- check-in the worker made, and are verified against the audit key in the trust file.
DO $$ BEGIN
  IF to_regnamespace('vendor') IS NOT NULL THEN RAISE EXCEPTION 'Wrong customer boundary' USING ERRCODE = '42501'; END IF;
END $$;

ALTER TABLE app.audit_mandates ADD COLUMN channel_lease_until timestamptz, ADD COLUMN channel_lease_owner uuid;

CREATE TABLE app.audit_channel_documents (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 engagement_id uuid NOT NULL, kind text NOT NULL CHECK (kind IN ('REQUEST_LIST','FINDINGS','REPORT')),
 signed jsonb NOT NULL, pdf bytea, received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 import_id uuid, imported_by uuid, imported_at timestamptz, acknowledged_at timestamptz,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, engagement_id) REFERENCES app.audit_engagements(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((import_id IS NULL) = (imported_at IS NULL) AND (imported_at IS NULL) = (imported_by IS NULL)),
 CHECK (kind = 'REPORT' OR pdf IS NULL));

CREATE TABLE app.audit_finding_responses (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 engagement_id uuid NOT NULL, import_id uuid NOT NULL, finding_id uuid NOT NULL,
 content jsonb NOT NULL, redactions integer NOT NULL DEFAULT 0,
 prepared_by uuid NOT NULL, prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(), approved_by uuid, approved_role text, approved_at timestamptz,
 state text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','QUEUED','UNKNOWN','ACCEPTED','REFUSED','FAILED','WITHDRAWN')),
 signed jsonb, digest text CHECK (digest IS NULL OR digest ~ '^[a-f0-9]{64}$'), receipt jsonb, outcome text, attempts integer NOT NULL DEFAULT 0, last_error text CHECK (last_error IS NULL OR length(last_error) <= 80),
 completed_at timestamptz,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, engagement_id) REFERENCES app.audit_engagements(tenant_id, legal_entity_id, environment_id, id),
 CHECK (approved_by IS NULL OR approved_by <> prepared_by),
 CHECK ((approved_by IS NULL) = (approved_at IS NULL)),
 CHECK (state IN ('DRAFT','WITHDRAWN') OR approved_by IS NOT NULL),
 CHECK ((signed IS NULL) = (digest IS NULL)));

-- Content and approval never change once approved; only sending state, the signed copy (set once) and the receipt do.
CREATE FUNCTION app.audit_finding_response_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.content IS DISTINCT FROM OLD.content OR NEW.finding_id IS DISTINCT FROM OLD.finding_id OR NEW.import_id IS DISTINCT FROM OLD.import_id OR NEW.prepared_by IS DISTINCT FROM OLD.prepared_by
   OR (OLD.approved_by IS NOT NULL AND NEW.approved_by IS DISTINCT FROM OLD.approved_by) THEN
  RAISE EXCEPTION 'finding_response_sealed' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
 IF OLD.signed IS NOT NULL AND (NEW.signed IS DISTINCT FROM OLD.signed OR NEW.digest IS DISTINCT FROM OLD.digest) THEN
  RAISE EXCEPTION 'finding_response_signed_once' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
 IF OLD.state IN ('ACCEPTED','REFUSED','WITHDRAWN') THEN RAISE EXCEPTION 'finding_response_final' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE UPDATE ON app.audit_finding_responses FOR EACH ROW EXECUTE FUNCTION app.audit_finding_response_guard();
CREATE TRIGGER immutable BEFORE DELETE ON app.audit_finding_responses FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE FUNCTION app.audit_channel_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.signed IS DISTINCT FROM OLD.signed OR NEW.pdf IS DISTINCT FROM OLD.pdf OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.engagement_id IS DISTINCT FROM OLD.engagement_id
   OR (OLD.import_id IS NOT NULL AND NEW.import_id IS DISTINCT FROM OLD.import_id) OR (OLD.acknowledged_at IS NOT NULL AND NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at) THEN
  RAISE EXCEPTION 'channel_document_sealed' USING ERRCODE = 'P0001', HINT = 'document'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE UPDATE ON app.audit_channel_documents FOR EACH ROW EXECUTE FUNCTION app.audit_channel_document_guard();
CREATE TRIGGER immutable BEFORE DELETE ON app.audit_channel_documents FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['audit_channel_documents','audit_finding_responses'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC', tab);
  EXECUTE format('CREATE POLICY channel_worker_read ON app.%I FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker())', tab);
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''audit_exchange.read''))', tab);
 END LOOP;
END $$;
CREATE POLICY document_worker_insert ON app.audit_channel_documents FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker() AND import_id IS NULL);
CREATE POLICY response_draft ON app.audit_finding_responses FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF'
  AND app.has_capability('audit_exchange.prepare') AND state = 'DRAFT' AND approved_by IS NULL AND prepared_by::text = current_setting('orvia.actor_id',true));
CREATE POLICY response_worker_update ON app.audit_finding_responses FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker() AND state IN ('QUEUED','UNKNOWN'))
  WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
GRANT SELECT ON app.audit_channel_documents, app.audit_finding_responses TO orvia_app;
GRANT INSERT ON app.audit_finding_responses TO orvia_app;
GRANT SELECT, INSERT ON app.audit_channel_documents TO orvia_worker;
GRANT UPDATE (acknowledged_at) ON app.audit_channel_documents TO orvia_worker;
CREATE POLICY document_worker_ack ON app.audit_channel_documents FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.channel_worker()) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
GRANT SELECT, UPDATE ON app.audit_finding_responses TO orvia_worker;

-- Approval: an owner or administrator other than the preparer; the response is then queued for the worker.
CREATE FUNCTION app.audit_finding_response_approve(p_response uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve'); r record;
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 SELECT * INTO r FROM app.audit_finding_responses WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_response FOR UPDATE;
 IF r IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
 IF r.state <> 'DRAFT' THEN RAISE EXCEPTION 'response_not_a_draft' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
 IF r.prepared_by = c.actor THEN RAISE EXCEPTION 'approver_must_differ_from_preparer' USING ERRCODE = 'P0001', HINT = 'approved_by'; END IF;
 IF NOT EXISTS (SELECT 1 FROM app.audit_channel_keys k WHERE k.tenant_id = c.t AND k.legal_entity_id = c.l AND k.environment_id = c.e AND k.engagement_id = r.engagement_id) THEN
  RAISE EXCEPTION 'channel_not_available_for_this_engagement' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
 UPDATE app.audit_finding_responses SET state = 'QUEUED', approved_by = c.actor, approved_role = c.role, approved_at = clock_timestamp() WHERE id = p_response;
END $$;
-- A draft may be withdrawn by an approver; an approved response is sent or fails, never silently dropped.
CREATE FUNCTION app.audit_finding_response_withdraw(p_response uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve');
BEGIN
 UPDATE app.audit_finding_responses SET state = 'WITHDRAWN' WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_response AND state = 'DRAFT';
 IF NOT FOUND THEN RAISE EXCEPTION 'response_not_a_draft' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
END $$;
-- Records that a person imported a staged channel document through the verified import.
CREATE FUNCTION app.audit_channel_document_imported(p_document uuid, p_import uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.prepare');
BEGIN
 IF NOT EXISTS (SELECT 1 FROM app.audit_imports i WHERE i.tenant_id = c.t AND i.legal_entity_id = c.l AND i.environment_id = c.e AND i.id = p_import) THEN
  RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'import_id'; END IF;
 UPDATE app.audit_channel_documents SET import_id = p_import, imported_by = c.actor, imported_at = clock_timestamp()
  WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_document AND import_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'document_already_imported_or_missing' USING ERRCODE = 'P0001', HINT = 'document'; END IF;
END $$;
REVOKE ALL ON FUNCTION app.audit_finding_response_approve(uuid), app.audit_finding_response_withdraw(uuid), app.audit_channel_document_imported(uuid,uuid),
  app.audit_finding_response_guard(), app.audit_channel_document_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.audit_finding_response_approve(uuid), app.audit_finding_response_withdraw(uuid), app.audit_channel_document_imported(uuid,uuid) TO orvia_app;
