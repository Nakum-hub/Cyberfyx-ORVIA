-- DPDPA external audit exchange, client side (revision 1.5 addendum,
-- docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md).
--
--   evidence_files          local evidence files attached to GRC evidence, with a
--                           personal-data flag set by the submitter and confirmed
--                           by a different person;
--   audit_engagements       the external engagement the vendor's auditors run,
--                           entered from the engagement code the vendor supplied
--                           (only its digest is kept);
--   audit_packages / items  the evidence package: prepared by one person, approved
--                           by a different owner or administrator, then sealed;
--   audit_imports           signed request lists, findings and reports from the
--                           vendor, verified before import and kept immutably;
--   audit_finding_links     imported findings linked to GRC issues for remediation.
--
-- The application role can insert drafts and read in scope; every state change
-- that matters (confirmation, exception approval, package approval, revocation)
-- goes through the SECURITY DEFINER functions below, which check the caller's
-- capability and the separation of duties themselves.
CREATE TABLE app.evidence_files (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 control_id uuid NOT NULL, grc_evidence_id uuid NOT NULL,
 file_name text NOT NULL CHECK (file_name ~ '^[A-Za-z0-9 ._()-]{1,200}$'),
 media_type text NOT NULL CHECK (media_type IN ('application/pdf','image/png','image/jpeg','text/plain','text/csv',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
 size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 20971520), sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'), content bytea NOT NULL,
 contains_personal_data text NOT NULL CHECK (contains_personal_data IN ('YES','NO','UNKNOWN')),
 personal_data_confirmed text CHECK (personal_data_confirmed IN ('YES','NO')), confirmed_by uuid, confirmed_at timestamptz,
 uploaded_by uuid NOT NULL, uploaded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, grc_evidence_id) REFERENCES app.grc_evidence(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((personal_data_confirmed IS NULL) = (confirmed_by IS NULL) AND (confirmed_by IS NULL) = (confirmed_at IS NULL)),
 CHECK (confirmed_by IS NULL OR confirmed_by <> uploaded_by),
 CHECK (octet_length(content) = size_bytes));
CREATE TABLE app.audit_engagements (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 code_digest text NOT NULL CHECK (code_digest ~ '^[a-f0-9]{64}$'),
 firm_name text NOT NULL CHECK (length(firm_name) BETWEEN 2 AND 160), engagement_reference text NOT NULL CHECK (engagement_reference ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]{0,79}$'),
 scope_requirement_ids text[] NOT NULL CHECK (cardinality(scope_requirement_ids) BETWEEN 1 AND 200),
 period_from date NOT NULL, period_to date NOT NULL CHECK (period_to >= period_from),
 processing_agreement_reference text CHECK (processing_agreement_reference IS NULL OR length(processing_agreement_reference) BETWEEN 3 AND 200),
 independence_statement text CHECK (independence_statement IS NULL OR length(independence_statement) BETWEEN 20 AND 2000),
 empanelment_reference text CHECK (empanelment_reference IS NULL OR length(empanelment_reference) BETWEEN 1 AND 120),
 state text NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE','CLOSED')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 UNIQUE (tenant_id, legal_entity_id, environment_id, code_digest));
CREATE TABLE app.audit_packages (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 engagement_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','APPROVED','REVOKED')),
 expires_at timestamptz NOT NULL,
 prepared_by uuid NOT NULL, prepared_role text NOT NULL CHECK (prepared_role IN ('ORG_SUPER_ADMIN','ORG_ADMIN','MEMBER')), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_by uuid, approved_role text CHECK (approved_role IN ('ORG_SUPER_ADMIN','ORG_ADMIN')), approved_at timestamptz,
 manifest jsonb, manifest_fingerprint text CHECK (manifest_fingerprint ~ '^[a-f0-9]{64}$'), file_sha256 text CHECK (file_sha256 ~ '^[a-f0-9]{64}$'),
 revoked_by uuid, revoked_at timestamptz, revoke_reason text,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, engagement_id) REFERENCES app.audit_engagements(tenant_id, legal_entity_id, environment_id, id),
 CHECK (approved_by IS NULL OR approved_by <> prepared_by),
 CHECK ((state = 'DRAFT') = (approved_at IS NULL)),
 CHECK ((approved_at IS NULL) = (manifest IS NULL) AND (manifest IS NULL) = (manifest_fingerprint IS NULL) AND (manifest IS NULL) = (file_sha256 IS NULL) AND (approved_at IS NULL) = (approved_by IS NULL)),
 CHECK ((state = 'REVOKED') = (revoked_at IS NOT NULL)));
CREATE TABLE app.audit_package_items (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 package_id uuid NOT NULL, item_id uuid NOT NULL, requirement_id text NOT NULL CHECK (requirement_id ~ '^DPDP-[A-Z0-9-]{2,60}$'),
 kind text NOT NULL CHECK (kind IN ('FILE','INDICATOR','STATEMENT')), title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
 evidence_file_id uuid, indicator jsonb, statement text CHECK (statement IS NULL OR length(statement) BETWEEN 1 AND 20000),
 contains_personal_data text NOT NULL CHECK (contains_personal_data IN ('YES','NO')),
 exception_justification text CHECK (exception_justification IS NULL OR length(exception_justification) BETWEEN 20 AND 1000),
 exception_approved_by uuid, exception_approved_role text CHECK (exception_approved_role IN ('ORG_SUPER_ADMIN','ORG_ADMIN')),
 added_by uuid NOT NULL, added_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, package_id, item_id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, package_id) REFERENCES app.audit_packages(tenant_id, legal_entity_id, environment_id, id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, evidence_file_id) REFERENCES app.evidence_files(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((kind = 'FILE') = (evidence_file_id IS NOT NULL) AND (kind = 'INDICATOR') = (indicator IS NOT NULL) AND (kind = 'STATEMENT') = (statement IS NOT NULL)),
 CHECK ((contains_personal_data = 'YES') = (exception_approved_by IS NOT NULL) AND (exception_approved_by IS NULL) = (exception_justification IS NULL) AND (exception_approved_by IS NULL) = (exception_approved_role IS NULL)),
 CHECK (exception_approved_by IS NULL OR exception_approved_by <> added_by));
CREATE TABLE app.audit_imports (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 engagement_id uuid NOT NULL, kind text NOT NULL CHECK (kind IN ('REQUEST_LIST','FINDINGS','REPORT')),
 document jsonb NOT NULL, document_digest text NOT NULL CHECK (document_digest ~ '^[a-f0-9]{64}$'),
 signing_key_id text NOT NULL, signature text NOT NULL, pdf bytea, pdf_sha256 text CHECK (pdf_sha256 ~ '^[a-f0-9]{64}$'),
 imported_by uuid NOT NULL, imported_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 UNIQUE (tenant_id, legal_entity_id, environment_id, engagement_id, document_digest),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, engagement_id) REFERENCES app.audit_engagements(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((kind = 'REPORT') = (pdf IS NOT NULL) AND (pdf IS NULL) = (pdf_sha256 IS NULL)));
CREATE TABLE app.audit_finding_links (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 import_id uuid NOT NULL, finding_id uuid NOT NULL, grc_issue_id uuid NOT NULL, linked_by uuid NOT NULL, linked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, finding_id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, import_id) REFERENCES app.audit_imports(tenant_id, legal_entity_id, environment_id, id));
-- A GRC issue may now be raised from an external audit finding (only by importing a verified findings file).
ALTER TABLE app.grc_issues DROP CONSTRAINT grc_issues_source_kind_check;
ALTER TABLE app.grc_issues ADD CONSTRAINT grc_issues_source_kind_check CHECK (source_kind IN ('MANUAL','AUDIT_REQUEST','CONTROL_TEST','IMPACT_FINDING','POLICY_REVIEW','EXTERNAL_AUDIT_FINDING'));
-- Every export of a sealed package is recorded; vendor-visibility lists them with everything else that left.
CREATE TABLE app.audit_package_exports (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 package_id uuid NOT NULL, file_sha256 text NOT NULL, exported_by uuid NOT NULL, exported_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, package_id) REFERENCES app.audit_packages(tenant_id, legal_entity_id, environment_id, id));

CREATE FUNCTION app.audit_exchange_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_exchange_history_is_append_only' USING ERRCODE = '23514'; END $$;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.audit_imports FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.audit_finding_links FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.audit_package_exports FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE DELETE ON app.evidence_files FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
CREATE TRIGGER immutable BEFORE DELETE ON app.audit_packages FOR EACH ROW EXECUTE FUNCTION app.audit_exchange_immutable();
-- Items change only while their package is a draft.
CREATE FUNCTION app.audit_items_draft_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT state FROM app.audit_packages p WHERE p.id = coalesce(NEW.package_id, OLD.package_id)) IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'package_not_a_draft' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
 RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER draft_only BEFORE INSERT OR UPDATE OR DELETE ON app.audit_package_items FOR EACH ROW EXECUTE FUNCTION app.audit_items_draft_only();

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['evidence_files','audit_engagements','audit_packages','audit_package_items','audit_imports','audit_finding_links','audit_package_exports'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
  EXECUTE format('CREATE POLICY exchange_read ON app.%I FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND (app.has_capability(''audit_exchange.read'') OR app.has_capability(''grc.read'')))', tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC', tab);
 END LOOP;
END $$;
CREATE POLICY files_insert ON app.evidence_files FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('grc.write')
  AND uploaded_by::text = current_setting('orvia.actor_id',true) AND personal_data_confirmed IS NULL);
CREATE POLICY engagements_insert ON app.audit_engagements FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit_exchange.prepare')
  AND created_by::text = current_setting('orvia.actor_id',true));
CREATE POLICY packages_insert ON app.audit_packages FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit_exchange.prepare')
  AND state = 'DRAFT' AND prepared_by::text = current_setting('orvia.actor_id',true) AND prepared_role = current_setting('orvia.role',true));
CREATE POLICY items_insert ON app.audit_package_items FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit_exchange.prepare')
  AND added_by::text = current_setting('orvia.actor_id',true) AND contains_personal_data = 'NO');
CREATE POLICY items_delete ON app.audit_package_items FOR DELETE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.has_capability('audit_exchange.prepare'));
CREATE POLICY imports_insert ON app.audit_imports FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('audit_exchange.prepare')
  AND imported_by::text = current_setting('orvia.actor_id',true));
CREATE POLICY links_insert ON app.audit_finding_links FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.has_capability('audit_exchange.prepare') AND linked_by::text = current_setting('orvia.actor_id',true));
CREATE POLICY exports_insert ON app.audit_package_exports FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.has_capability('audit_exchange.approve') AND exported_by::text = current_setting('orvia.actor_id',true));
GRANT SELECT, INSERT ON app.evidence_files, app.audit_engagements, app.audit_packages, app.audit_imports, app.audit_finding_links, app.audit_package_exports TO orvia_app;
GRANT SELECT, INSERT, DELETE ON app.audit_package_items TO orvia_app;

-- The installation's random reference, named in a package manifest so the vendor can tell installations apart.
CREATE FUNCTION app.installation_reference() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT installation_id FROM public.bootstrap_profile WHERE singleton = 1 $$;
REVOKE ALL ON FUNCTION app.installation_reference() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.installation_reference() TO orvia_app;

-- Caller context shared by the functions below.
CREATE TYPE app.exchange_ctx AS (t uuid, l uuid, e uuid, actor uuid, role text);
CREATE FUNCTION app.exchange_caller(p_capability text) RETURNS app.exchange_ctx LANGUAGE plpgsql STABLE AS $$
DECLARE r app.exchange_ctx;
BEGIN
 IF current_setting('orvia.actor_domain', true) IS DISTINCT FROM 'STAFF' OR NOT app.has_capability(p_capability) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 SELECT current_setting('orvia.tenant_id')::uuid AS t, current_setting('orvia.legal_entity_id')::uuid AS l, current_setting('orvia.environment_id')::uuid AS e,
   current_setting('orvia.actor_id')::uuid AS actor, current_setting('orvia.role', true) AS role INTO r.t, r.l, r.e, r.actor, r.role;
 RETURN r;
END $$;
-- A different person confirms (or corrects) the personal-data flag of an evidence file.
CREATE FUNCTION app.evidence_file_confirm(p_file uuid, p_value text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.prepare'); f record;
BEGIN
 IF p_value NOT IN ('YES','NO') THEN RAISE EXCEPTION 'invalid_value' USING ERRCODE = 'P0001', HINT = 'personal_data'; END IF;
 SELECT * INTO f FROM app.evidence_files WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_file FOR UPDATE;
 IF f IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
 IF f.uploaded_by = c.actor THEN RAISE EXCEPTION 'confirmer_must_differ_from_submitter' USING ERRCODE = 'P0001', HINT = 'personal_data'; END IF;
 IF f.personal_data_confirmed IS NOT NULL THEN RAISE EXCEPTION 'already_confirmed' USING ERRCODE = 'P0001', HINT = 'personal_data'; END IF;
 UPDATE app.evidence_files SET personal_data_confirmed = p_value, confirmed_by = c.actor, confirmed_at = clock_timestamp() WHERE id = p_file;
END $$;
-- An owner or administrator, other than the person who added the item, approves a personal-data exception with its justification.
CREATE FUNCTION app.audit_item_add_exception(p_package uuid, p_item uuid, p_requirement text, p_kind text, p_title text, p_file uuid, p_indicator jsonb, p_statement text, p_added_by uuid, p_justification text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve');
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 IF p_added_by = c.actor THEN RAISE EXCEPTION 'exception_approver_must_differ' USING ERRCODE = 'P0001', HINT = 'exception'; END IF;
 IF NOT EXISTS (SELECT 1 FROM app.audit_packages WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_package AND state = 'DRAFT') THEN RAISE EXCEPTION 'package_not_a_draft' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
 INSERT INTO app.audit_package_items (tenant_id, legal_entity_id, environment_id, package_id, item_id, requirement_id, kind, title, evidence_file_id, indicator, statement, contains_personal_data,
   exception_justification, exception_approved_by, exception_approved_role, added_by)
 VALUES (c.t, c.l, c.e, p_package, p_item, p_requirement, p_kind, p_title, p_file, p_indicator, p_statement, 'YES', p_justification, c.actor, c.role, p_added_by);
END $$;
-- Approval seals the package: a different owner or administrator, the manifest computed by the server, recorded once.
CREATE FUNCTION app.audit_package_approve(p_package uuid, p_manifest jsonb, p_fingerprint text, p_file_sha256 text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve'); p record;
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 SELECT * INTO p FROM app.audit_packages WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_package FOR UPDATE;
 IF p IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
 IF p.state <> 'DRAFT' THEN RAISE EXCEPTION 'package_not_a_draft' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
 IF p.prepared_by = c.actor THEN RAISE EXCEPTION 'approver_must_differ_from_preparer' USING ERRCODE = 'P0001', HINT = 'approved_by'; END IF;
 IF p.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'package_expired' USING ERRCODE = 'P0001', HINT = 'expires_at'; END IF;
 IF NOT EXISTS (SELECT 1 FROM app.audit_package_items WHERE package_id = p_package) THEN RAISE EXCEPTION 'package_empty' USING ERRCODE = 'P0001', HINT = 'items'; END IF;
 -- Every file in the package must still be shareable at the moment of approval.
 IF EXISTS (SELECT 1 FROM app.audit_package_items i JOIN app.evidence_files f ON f.id = i.evidence_file_id WHERE i.package_id = p_package
   AND (f.personal_data_confirmed IS NULL OR (f.personal_data_confirmed = 'YES' AND i.contains_personal_data <> 'YES'))) THEN RAISE EXCEPTION 'personal_data_screening_failed' USING ERRCODE = 'P0001', HINT = 'items'; END IF;
 UPDATE app.audit_packages SET state = 'APPROVED', approved_by = c.actor, approved_role = c.role, approved_at = clock_timestamp(), manifest = p_manifest, manifest_fingerprint = p_fingerprint, file_sha256 = p_file_sha256 WHERE id = p_package;
END $$;
CREATE FUNCTION app.audit_package_revoke(p_package uuid, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve');
BEGIN
 IF length(coalesce(p_reason, '')) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001', HINT = 'reason'; END IF;
 UPDATE app.audit_packages SET state = 'REVOKED', revoked_by = c.actor, revoked_at = clock_timestamp(), revoke_reason = p_reason
  WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_package AND state IN ('APPROVED','DRAFT');
 IF NOT FOUND THEN RAISE EXCEPTION 'not_revocable' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
END $$;
-- Package state never moves any other way.
CREATE FUNCTION app.audit_package_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.state = 'REVOKED' THEN RAISE EXCEPTION 'package_revoked' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
 IF OLD.state = 'APPROVED' AND (NEW.state <> 'REVOKED' OR NEW.manifest IS DISTINCT FROM OLD.manifest OR NEW.approved_by IS DISTINCT FROM OLD.approved_by) THEN RAISE EXCEPTION 'package_sealed' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
 IF NEW.prepared_by IS DISTINCT FROM OLD.prepared_by OR NEW.engagement_id IS DISTINCT FROM OLD.engagement_id OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN RAISE EXCEPTION 'package_immutable_fields' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE UPDATE ON app.audit_packages FOR EACH ROW EXECUTE FUNCTION app.audit_package_guard();
REVOKE ALL ON FUNCTION app.exchange_caller(text), app.evidence_file_confirm(uuid,text), app.audit_item_add_exception(uuid,uuid,text,text,text,uuid,jsonb,text,uuid,text),
  app.audit_package_approve(uuid,jsonb,text,text), app.audit_package_revoke(uuid,text), app.audit_package_guard(), app.audit_items_draft_only(), app.audit_exchange_immutable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.exchange_caller(text), app.evidence_file_confirm(uuid,text), app.audit_item_add_exception(uuid,uuid,text,text,text,uuid,jsonb,text,uuid,text),
  app.audit_package_approve(uuid,jsonb,text,text), app.audit_package_revoke(uuid,text) TO orvia_app;
