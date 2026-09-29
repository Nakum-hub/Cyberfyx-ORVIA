-- DPDPA external audits on the vendor's VENDOR_SERVICE installation (revision 1.5 addendum).
--
-- Engagements with independence, conflict check and processing-agreement
-- status; an evidence inbox of client-uploaded packages whose files are
-- encrypted at rest with a key per package; per-item review; per-requirement
-- results; auditor requests; findings; reports drafted by the lead auditor and
-- approved by a different reviewer before signing; an access log of every view
-- and download; and a retention purge recorded for each engagement.
--
-- Access: engagement metadata is visible to holders of engagements.read;
-- package contents, reviews, results, findings and reports are visible and
-- writable only by members of the engagement team. Client accounts see only
-- their own organisation's uploads.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;

CREATE TABLE vendor.engagements (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES vendor.organisations(id),
  reference text NOT NULL CHECK (reference ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]{0,79}$'),
  code_digest text NOT NULL UNIQUE CHECK (code_digest ~ '^[a-f0-9]{64}$'),
  scope_requirement_ids text[] NOT NULL CHECK (cardinality(scope_requirement_ids) BETWEEN 1 AND 200),
  period_from date NOT NULL, period_to date NOT NULL CHECK (period_to >= period_from),
  state text NOT NULL DEFAULT 'PLANNING' CHECK (state IN ('PLANNING','FIELDWORK','REPORTING','CLOSED')),
  processing_agreement_reference text CHECK (processing_agreement_reference IS NULL OR length(processing_agreement_reference) BETWEEN 3 AND 200),
  processing_agreement_recorded_by uuid, processing_agreement_recorded_at timestamptz,
  independence_statement text CHECK (independence_statement IS NULL OR length(independence_statement) BETWEEN 20 AND 2000),
  independence_declared_by uuid, independence_declared_at timestamptz,
  conflict_check text CHECK (conflict_check IN ('NO_CONFLICT','CONFLICT_MITIGATED')),
  conflict_note text CHECK (conflict_note IS NULL OR length(conflict_note) <= 2000),
  empanelment_reference text CHECK (empanelment_reference IS NULL OR length(empanelment_reference) BETWEEN 1 AND 120),
  retention_days integer NOT NULL DEFAULT 90 CHECK (retention_days BETWEEN 1 AND 3650),
  closed_at timestamptz, purged_at timestamptz,
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organisation_id, reference),
  CHECK ((state = 'CLOSED') = (closed_at IS NOT NULL)),
  CHECK ((processing_agreement_reference IS NULL) = (processing_agreement_recorded_at IS NULL)),
  CHECK ((independence_statement IS NULL) = (independence_declared_at IS NULL)),
  CHECK (conflict_check IS DISTINCT FROM 'CONFLICT_MITIGATED' OR conflict_note IS NOT NULL));
CREATE TABLE vendor.engagement_team (
  engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), user_id uuid NOT NULL REFERENCES vendor_auth.authority(user_id),
  engagement_role text NOT NULL CHECK (engagement_role IN ('LEAD','AUDITOR','REVIEWER')),
  added_by uuid NOT NULL, added_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (engagement_id, user_id));
CREATE UNIQUE INDEX engagement_single_lead ON vendor.engagement_team(engagement_id) WHERE engagement_role = 'LEAD';

-- Whether the current actor is on the engagement team (optionally in a given role).
CREATE FUNCTION vendor.on_team(e uuid, r text DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT vendor.actor_domain() = 'VENDOR_STAFF' AND EXISTS (SELECT 1 FROM vendor.engagement_team t JOIN vendor_auth.authority a ON a.user_id = t.user_id AND a.active
    WHERE t.engagement_id = e AND t.user_id = vendor.actor() AND (r IS NULL OR t.engagement_role = r)) $$;

-- Team members of an engagement with names and roles, for anyone who may see the engagement.
CREATE FUNCTION vendor.engagement_members(e uuid) RETURNS TABLE(user_id uuid, name text, role text, engagement_role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NOT (vendor.has_capability('engagements.read') OR vendor.on_team(e)) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT t.user_id, u.name, a.role, t.engagement_role FROM vendor.engagement_team t JOIN vendor_auth.authority a ON a.user_id = t.user_id JOIN vendor_auth."user" u ON u.id = t.user_id
    WHERE t.engagement_id = e ORDER BY t.added_at, t.user_id;
END $$;

CREATE TABLE vendor.packages (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id),
  client_package_id uuid NOT NULL, uploaded_by uuid NOT NULL, uploaded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[a-f0-9]{64}$'), manifest jsonb NOT NULL, manifest_fingerprint text NOT NULL CHECK (manifest_fingerprint ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL, contains_personal_data boolean NOT NULL,
  state text NOT NULL CHECK (state IN ('ACCEPTED','QUARANTINED','REVOKED','PURGED')),
  quarantine_reason text CHECK (quarantine_reason IN ('PERSONAL_DATA_WITHOUT_PROCESSING_AGREEMENT')),
  scan_engine text NOT NULL, scan_result text NOT NULL CHECK (scan_result = 'CLEAN'),
  wrapped_key bytea, key_nonce bytea, key_tag bytea,
  revoked_at timestamptz, purged_at timestamptz,
  UNIQUE (engagement_id, client_package_id),
  CHECK ((state = 'QUARANTINED') = (quarantine_reason IS NOT NULL)),
  CHECK ((state = 'PURGED') = (purged_at IS NOT NULL)),
  CHECK (state = 'PURGED' OR wrapped_key IS NOT NULL));
CREATE TABLE vendor.package_items (
  package_id uuid NOT NULL REFERENCES vendor.packages(id), item_id uuid NOT NULL,
  requirement_id text NOT NULL, kind text NOT NULL CHECK (kind IN ('FILE','INDICATOR','STATEMENT')), title text NOT NULL,
  file_name text, media_type text NOT NULL, size_bytes integer NOT NULL, sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  contains_personal_data boolean NOT NULL,
  ciphertext bytea, nonce bytea, tag bytea,
  PRIMARY KEY (package_id, item_id));
-- Refused uploads are recorded without keeping any of their content.
CREATE TABLE vendor.package_refusals (
  id uuid PRIMARY KEY, engagement_id uuid REFERENCES vendor.engagements(id), uploaded_by uuid NOT NULL,
  file_sha256 text NOT NULL, reasons text[] NOT NULL CHECK (cardinality(reasons) BETWEEN 1 AND 20),
  refused_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE vendor.upload_attempts (account_id uuid NOT NULL, attempted_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX upload_attempts_recent ON vendor.upload_attempts(account_id, attempted_at);
CREATE TABLE vendor.evidence_access_log (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), package_id uuid NOT NULL,
  item_id uuid, actor_id uuid NOT NULL, action text NOT NULL CHECK (action IN ('VIEW_MANIFEST','VIEW_ITEM','DOWNLOAD_ITEM')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER evidence_access_log_immutable BEFORE UPDATE OR DELETE ON vendor.evidence_access_log FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();

CREATE TABLE vendor.item_reviews (
  id uuid PRIMARY KEY, package_id uuid NOT NULL, item_id uuid NOT NULL, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id),
  decision text NOT NULL CHECK (decision IN ('ACCEPT','REJECT','REQUEST_MORE')),
  note text NOT NULL CHECK (length(note) BETWEEN 1 AND 2000), sampling text CHECK (sampling IS NULL OR length(sampling) <= 2000),
  reviewer_id uuid NOT NULL, reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (package_id, item_id) REFERENCES vendor.package_items(package_id, item_id));
CREATE TRIGGER item_reviews_immutable BEFORE UPDATE OR DELETE ON vendor.item_reviews FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TABLE vendor.requirement_results (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), requirement_id text NOT NULL,
  result text NOT NULL CHECK (result IN ('MEETS','PARTIALLY_MEETS','DOES_NOT_MEET','NOT_APPLICABLE','NOT_TESTED')),
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 1 AND 2000),
  recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER requirement_results_immutable BEFORE UPDATE OR DELETE ON vendor.requirement_results FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TABLE vendor.audit_requests (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), requirement_id text NOT NULL,
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 2000), due_date date NOT NULL,
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE vendor.findings (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), requirement_id text NOT NULL,
  provision_ids text[] NOT NULL DEFAULT '{}' CHECK (cardinality(provision_ids) <= 10),
  severity text NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200), observation text NOT NULL CHECK (length(observation) BETWEEN 1 AND 4000),
  recommendation text NOT NULL CHECK (length(recommendation) BETWEEN 1 AND 4000), due_date date NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLIENT_RESPONDED','RETEST_PASSED','RETEST_FAILED','CLOSED')),
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE vendor.finding_events (
  id uuid PRIMARY KEY, finding_id uuid NOT NULL REFERENCES vendor.findings(id),
  event text NOT NULL CHECK (event IN ('CLIENT_RESPONSE','RETEST_PASSED','RETEST_FAILED','CLOSED')),
  note text NOT NULL CHECK (length(note) BETWEEN 1 AND 4000), actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER finding_events_immutable BEFORE UPDATE OR DELETE ON vendor.finding_events FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TABLE vendor.signed_documents (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id),
  kind text NOT NULL CHECK (kind IN ('REQUEST_LIST','FINDINGS','REPORT')), document jsonb NOT NULL,
  signing_key_id text NOT NULL, signature text NOT NULL, signed_by uuid NOT NULL, signed_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER signed_documents_immutable BEFORE UPDATE OR DELETE ON vendor.signed_documents FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TABLE vendor.reports (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), version integer NOT NULL CHECK (version >= 1),
  state text NOT NULL CHECK (state IN ('DRAFT','APPROVED','SIGNED','SUPERSEDED')),
  opinion_as_of date NOT NULL, method text NOT NULL, opinion text NOT NULL, limitations text[] NOT NULL,
  drafted_by uuid NOT NULL, drafted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  approved_by uuid, approved_at timestamptz, signed_document_id uuid REFERENCES vendor.signed_documents(id), pdf bytea, pdf_sha256 text,
  UNIQUE (engagement_id, version),
  CHECK (approved_by IS NULL OR approved_by <> drafted_by),
  CHECK ((state IN ('APPROVED','SIGNED')) <= (approved_by IS NOT NULL)),
  CHECK ((state = 'SIGNED') = (signed_document_id IS NOT NULL)));
CREATE TABLE vendor.retention_purges (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id),
  packages integer NOT NULL, items integer NOT NULL, bytes bigint NOT NULL, purged_at timestamptz NOT NULL DEFAULT clock_timestamp(), actor_id uuid NOT NULL);
CREATE TRIGGER retention_purges_immutable BEFORE UPDATE OR DELETE ON vendor.retention_purges FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TABLE vendor.support_cases (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES vendor.organisations(id),
  category text NOT NULL CHECK (category IN ('INSTALLATION','LICENCE','UPGRADE','AUDIT_EXCHANGE','OTHER')),
  summary text NOT NULL CHECK (length(summary) BETWEEN 3 AND 500), urgency text NOT NULL CHECK (urgency IN ('LOW','NORMAL','HIGH')),
  state text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN','WAITING_ON_CLIENT','RESOLVED')),
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE vendor.licence_issues (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES vendor.organisations(id), installation_id uuid NOT NULL,
  licence_id uuid NOT NULL UNIQUE, plan_option text NOT NULL, member_seats integer NOT NULL, valid_from timestamptz NOT NULL, valid_to timestamptz NOT NULL,
  licence jsonb NOT NULL, issued_by uuid NOT NULL, issued_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER licence_issues_immutable BEFORE UPDATE OR DELETE ON vendor.licence_issues FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();

-- Row-level security. Every vendor table is forced; the business role never bypasses it.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['engagements','engagement_team','packages','package_items','package_refusals','upload_attempts','evidence_access_log','item_reviews',
    'requirement_results','audit_requests','findings','finding_events','signed_documents','reports','retention_purges','support_cases','licence_issues'] LOOP
    EXECUTE format('ALTER TABLE vendor.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE vendor.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
CREATE POLICY read_engagements ON vendor.engagements FOR SELECT USING (vendor.has_capability('engagements.read') OR id IN (SELECT engagement_id FROM vendor.engagement_team WHERE user_id = vendor.actor()));
CREATE POLICY create_engagements ON vendor.engagements FOR INSERT WITH CHECK (vendor.has_capability('engagements.manage') AND created_by = vendor.actor());
CREATE POLICY update_engagements ON vendor.engagements FOR UPDATE USING (vendor.has_capability('engagements.manage') OR vendor.on_team(id)) WITH CHECK (vendor.has_capability('engagements.manage') OR vendor.on_team(id));
CREATE POLICY read_team ON vendor.engagement_team FOR SELECT USING (vendor.has_capability('engagements.read'));
CREATE POLICY manage_team ON vendor.engagement_team FOR INSERT WITH CHECK (vendor.has_capability('engagements.manage') AND added_by = vendor.actor());
CREATE POLICY team_packages ON vendor.packages FOR SELECT USING (vendor.on_team(engagement_id) OR (vendor.account_organisation() IS NOT NULL AND uploaded_by = vendor.actor()));
CREATE POLICY team_packages_update ON vendor.packages FOR UPDATE USING (vendor.on_team(engagement_id)) WITH CHECK (vendor.on_team(engagement_id));
CREATE POLICY team_items ON vendor.package_items FOR SELECT USING (EXISTS (SELECT 1 FROM vendor.packages p WHERE p.id = package_id AND vendor.on_team(p.engagement_id)));
CREATE POLICY team_items_update ON vendor.package_items FOR UPDATE USING (EXISTS (SELECT 1 FROM vendor.packages p WHERE p.id = package_id AND vendor.on_team(p.engagement_id)));
CREATE POLICY refusals_read ON vendor.package_refusals FOR SELECT USING ((engagement_id IS NOT NULL AND vendor.on_team(engagement_id)) OR vendor.has_capability('vendor.audit.read') OR uploaded_by = vendor.actor());
CREATE POLICY own_attempts ON vendor.upload_attempts FOR SELECT USING (account_id = vendor.actor());
CREATE POLICY own_attempts_insert ON vendor.upload_attempts FOR INSERT WITH CHECK (account_id = vendor.actor() AND vendor.account_organisation() IS NOT NULL);
CREATE POLICY access_log_insert ON vendor.evidence_access_log FOR INSERT WITH CHECK (actor_id = vendor.actor() AND vendor.on_team(engagement_id));
CREATE POLICY access_log_read ON vendor.evidence_access_log FOR SELECT USING (vendor.on_team(engagement_id) OR vendor.has_capability('vendor.audit.read'));
CREATE POLICY team_reviews ON vendor.item_reviews FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY team_reviews_insert ON vendor.item_reviews FOR INSERT WITH CHECK (vendor.on_team(engagement_id) AND reviewer_id = vendor.actor() AND vendor.has_capability('audit.fieldwork'));
CREATE POLICY team_results ON vendor.requirement_results FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY team_results_insert ON vendor.requirement_results FOR INSERT WITH CHECK (vendor.on_team(engagement_id) AND recorded_by = vendor.actor() AND vendor.has_capability('audit.fieldwork'));
CREATE POLICY team_requests ON vendor.audit_requests FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY team_requests_insert ON vendor.audit_requests FOR INSERT WITH CHECK (vendor.on_team(engagement_id) AND created_by = vendor.actor() AND vendor.has_capability('audit.fieldwork'));
CREATE POLICY team_findings ON vendor.findings FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY team_findings_insert ON vendor.findings FOR INSERT WITH CHECK (vendor.on_team(engagement_id) AND created_by = vendor.actor() AND vendor.has_capability('audit.fieldwork'));
CREATE POLICY team_findings_update ON vendor.findings FOR UPDATE USING (vendor.on_team(engagement_id)) WITH CHECK (vendor.on_team(engagement_id));
CREATE POLICY team_finding_events ON vendor.finding_events FOR SELECT USING (EXISTS (SELECT 1 FROM vendor.findings f WHERE f.id = finding_id AND vendor.on_team(f.engagement_id)));
CREATE POLICY team_finding_events_insert ON vendor.finding_events FOR INSERT WITH CHECK (actor_id = vendor.actor() AND EXISTS (SELECT 1 FROM vendor.findings f WHERE f.id = finding_id AND vendor.on_team(f.engagement_id)));
CREATE POLICY team_documents ON vendor.signed_documents FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY team_documents_insert ON vendor.signed_documents FOR INSERT WITH CHECK (vendor.on_team(engagement_id) AND signed_by = vendor.actor());
CREATE POLICY team_reports ON vendor.reports FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY lead_reports_insert ON vendor.reports FOR INSERT WITH CHECK (vendor.on_team(engagement_id, 'LEAD') AND drafted_by = vendor.actor() AND vendor.has_capability('audit.report.draft'));
CREATE POLICY team_reports_update ON vendor.reports FOR UPDATE USING (vendor.on_team(engagement_id)) WITH CHECK (vendor.on_team(engagement_id));
CREATE POLICY purges_read ON vendor.retention_purges FOR SELECT USING (vendor.has_capability('engagements.read'));
CREATE POLICY support_read ON vendor.support_cases FOR SELECT USING (vendor.has_capability('support.read'));
CREATE POLICY support_write ON vendor.support_cases FOR INSERT WITH CHECK (vendor.has_capability('support.manage') AND created_by = vendor.actor());
CREATE POLICY support_update ON vendor.support_cases FOR UPDATE USING (vendor.has_capability('support.manage')) WITH CHECK (vendor.has_capability('support.manage'));
CREATE POLICY licences_read ON vendor.licence_issues FOR SELECT USING (vendor.has_capability('licences.read'));
CREATE POLICY licences_write ON vendor.licence_issues FOR INSERT WITH CHECK (vendor.has_capability('licences.issue') AND issued_by = vendor.actor());

-- A report is approved only by the engagement's reviewer, a different person from the lead who drafted it.
CREATE FUNCTION vendor.report_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF OLD.state IN ('SIGNED','SUPERSEDED') AND NEW.state IS DISTINCT FROM 'SUPERSEDED' THEN RAISE EXCEPTION 'report_immutable' USING ERRCODE = 'P0001', HINT = 'report'; END IF;
  IF OLD.state = 'SIGNED' AND NEW.state = 'SUPERSEDED' AND (NEW.pdf IS DISTINCT FROM OLD.pdf OR NEW.signed_document_id IS DISTINCT FROM OLD.signed_document_id) THEN RAISE EXCEPTION 'report_immutable' USING ERRCODE = 'P0001', HINT = 'report'; END IF;
  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    IF OLD.approved_by IS NOT NULL OR NEW.approved_by <> vendor.actor() OR NOT vendor.on_team(NEW.engagement_id, 'REVIEWER') OR NOT vendor.has_capability('audit.report.approve')
    THEN RAISE EXCEPTION 'reviewer_required' USING ERRCODE = 'P0001', HINT = 'approved_by'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER report_guard BEFORE UPDATE ON vendor.reports FOR EACH ROW EXECUTE FUNCTION vendor.report_guard();

-- Uploads: at most 10 attempts per account per 10 minutes, counted under a lock.
CREATE FUNCTION vendor.record_upload_attempt() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE recent integer;
BEGIN
  IF vendor.account_organisation() IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('vendor-upload:' || vendor.actor()::text));
  SELECT count(*) INTO recent FROM vendor.upload_attempts WHERE account_id = vendor.actor() AND attempted_at > clock_timestamp() - interval '10 minutes';
  IF recent >= 10 THEN RETURN false; END IF;
  INSERT INTO vendor.upload_attempts(account_id) VALUES (vendor.actor());
  RETURN true;
END $$;
-- A client account finds the engagement its code belongs to, only within its own organisation.
CREATE FUNCTION vendor.engagement_for_code(p_digest text) RETURNS TABLE(id uuid, state text, processing_agreement boolean, organisation_name text, reference text, scope text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT e.id, e.state, e.processing_agreement_reference IS NOT NULL, o.name, e.reference, e.scope_requirement_ids FROM vendor.engagements e JOIN vendor.organisations o ON o.id = e.organisation_id
  WHERE e.code_digest = p_digest AND e.organisation_id = vendor.account_organisation() $$;
-- Stores an uploaded package already verified and encrypted by the server; only client accounts, only into their own open engagement.
CREATE FUNCTION vendor.store_package(p_id uuid, p_engagement uuid, p_client_package uuid, p_file_sha256 text, p_manifest jsonb, p_fingerprint text, p_expires timestamptz,
  p_personal boolean, p_scan_engine text, p_wrapped bytea, p_key_nonce bytea, p_key_tag bytea, p_items jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e record; st text; q text; i jsonb;
BEGIN
  SELECT * INTO e FROM vendor.engagements WHERE id = p_engagement FOR UPDATE;
  IF e IS NULL OR e.organisation_id IS DISTINCT FROM vendor.account_organisation() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF e.state = 'CLOSED' THEN RAISE EXCEPTION 'engagement_closed' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
  IF EXISTS (SELECT 1 FROM vendor.packages WHERE engagement_id = p_engagement AND client_package_id = p_client_package) THEN RAISE EXCEPTION 'package_already_received' USING ERRCODE = 'P0001', HINT = 'package'; END IF;
  IF p_personal AND e.processing_agreement_reference IS NULL THEN st := 'QUARANTINED'; q := 'PERSONAL_DATA_WITHOUT_PROCESSING_AGREEMENT'; ELSE st := 'ACCEPTED'; END IF;
  INSERT INTO vendor.packages(id, engagement_id, client_package_id, uploaded_by, file_sha256, manifest, manifest_fingerprint, expires_at, contains_personal_data, state, quarantine_reason,
    scan_engine, scan_result, wrapped_key, key_nonce, key_tag)
  VALUES (p_id, p_engagement, p_client_package, vendor.actor(), p_file_sha256, p_manifest, p_fingerprint, p_expires, p_personal, st, q, p_scan_engine, 'CLEAN', p_wrapped, p_key_nonce, p_key_tag);
  FOR i IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO vendor.package_items VALUES (p_id, (i->>'item_id')::uuid, i->>'requirement_id', i->>'kind', i->>'title', i->>'file_name', i->>'media_type', (i->>'size_bytes')::integer, i->>'sha256',
      (i->>'contains_personal_data')::boolean, decode(i->>'ciphertext', 'base64'), decode(i->>'nonce', 'base64'), decode(i->>'tag', 'base64'));
  END LOOP;
  -- Packages the client has revoked since are withdrawn from use here too.
  UPDATE vendor.packages SET state = 'REVOKED', revoked_at = clock_timestamp(), quarantine_reason = NULL
    WHERE engagement_id = p_engagement AND state IN ('ACCEPTED','QUARANTINED') AND client_package_id IN (SELECT (x)::uuid FROM jsonb_array_elements_text(p_manifest->'revoked_package_ids') x);
  INSERT INTO vendor.audit_events(id, actor_id, actor_domain, operation, resource_id, request_id) VALUES (gen_random_uuid(), vendor.actor(), 'CLIENT_ACCOUNT', 'audit.package.received', p_id, gen_random_uuid());
  IF e.state = 'PLANNING' THEN UPDATE vendor.engagements SET state = 'FIELDWORK' WHERE id = p_engagement; END IF;
  RETURN st;
END $$;
CREATE FUNCTION vendor.refuse_package(p_engagement uuid, p_file_sha256 text, p_reasons text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF vendor.account_organisation() IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_engagement IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vendor.engagements WHERE id = p_engagement AND organisation_id = vendor.account_organisation()) THEN p_engagement := NULL; END IF;
  INSERT INTO vendor.package_refusals(id, engagement_id, uploaded_by, file_sha256, reasons) VALUES (gen_random_uuid(), p_engagement, vendor.actor(), p_file_sha256, p_reasons);
END $$;
CREATE FUNCTION vendor.own_uploads() RETURNS TABLE(id uuid, engagement_reference text, client_package_id uuid, state text, uploaded_at timestamptz, outcome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT p.id, e.reference, p.client_package_id, p.state, p.uploaded_at, 'RECEIVED' FROM vendor.packages p JOIN vendor.engagements e ON e.id = p.engagement_id WHERE p.uploaded_by = vendor.actor() AND vendor.account_organisation() IS NOT NULL
  UNION ALL SELECT r.id, e.reference, NULL, 'REFUSED', r.refused_at, array_to_string(r.reasons, ',') FROM vendor.package_refusals r LEFT JOIN vendor.engagements e ON e.id = r.engagement_id WHERE r.uploaded_by = vendor.actor() AND vendor.account_organisation() IS NOT NULL
  ORDER BY 5 DESC LIMIT 100 $$;

-- Recording the processing agreement (the vendor as the client's Data Processor, s.8(2)) releases packages held only for its absence.
CREATE FUNCTION vendor.record_processing_agreement(p_engagement uuid, p_reference text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE released integer;
BEGIN
  IF NOT vendor.has_capability('engagements.manage') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE vendor.engagements SET processing_agreement_reference = p_reference, processing_agreement_recorded_by = vendor.actor(), processing_agreement_recorded_at = clock_timestamp()
    WHERE id = p_engagement AND processing_agreement_reference IS NULL AND state <> 'CLOSED';
  IF NOT FOUND THEN RAISE EXCEPTION 'processing_agreement_not_recordable' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
  UPDATE vendor.packages SET state = 'ACCEPTED', quarantine_reason = NULL WHERE engagement_id = p_engagement AND state = 'QUARANTINED' AND expires_at > clock_timestamp();
  GET DIAGNOSTICS released = ROW_COUNT;
  RETURN released;
END $$;

-- Retention: evidence content of engagements closed longer ago than their retention period is destroyed; reports and findings stay.
CREATE FUNCTION vendor.retention_sweep(p_actor uuid) RETURNS TABLE(engagement_id uuid, packages integer, items integer, bytes bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e record; np integer; ni integer; nb bigint;
BEGIN
  IF p_actor IS DISTINCT FROM vendor.actor() OR NOT vendor.has_capability('engagements.manage') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  FOR e IN SELECT * FROM vendor.engagements WHERE state = 'CLOSED' AND purged_at IS NULL AND closed_at + make_interval(days => retention_days) <= clock_timestamp() FOR UPDATE LOOP
    SELECT count(*), coalesce(sum(i.size_bytes), 0) INTO ni, nb FROM vendor.package_items i JOIN vendor.packages p ON p.id = i.package_id WHERE p.engagement_id = e.id AND i.ciphertext IS NOT NULL;
    UPDATE vendor.package_items i SET ciphertext = NULL, nonce = NULL, tag = NULL FROM vendor.packages p WHERE p.id = i.package_id AND p.engagement_id = e.id;
    UPDATE vendor.packages SET state = 'PURGED', purged_at = clock_timestamp(), wrapped_key = NULL, key_nonce = NULL, key_tag = NULL, quarantine_reason = NULL WHERE vendor.packages.engagement_id = e.id AND state <> 'PURGED';
    GET DIAGNOSTICS np = ROW_COUNT;
    UPDATE vendor.engagements SET purged_at = clock_timestamp() WHERE id = e.id;
    INSERT INTO vendor.retention_purges(id, engagement_id, packages, items, bytes, actor_id) VALUES (gen_random_uuid(), e.id, np, ni, nb, p_actor);
    engagement_id := e.id; packages := np; items := ni; bytes := nb; RETURN NEXT;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON vendor.engagements, vendor.findings, vendor.reports, vendor.support_cases TO orvia_vendor_app;
GRANT SELECT, INSERT ON vendor.engagement_team, vendor.item_reviews, vendor.requirement_results, vendor.audit_requests, vendor.finding_events,
  vendor.signed_documents, vendor.evidence_access_log, vendor.licence_issues TO orvia_vendor_app;
GRANT SELECT, UPDATE ON vendor.packages, vendor.package_items TO orvia_vendor_app;
GRANT SELECT ON vendor.package_refusals, vendor.retention_purges, vendor.upload_attempts TO orvia_vendor_app;
GRANT EXECUTE ON FUNCTION vendor.on_team(uuid, text), vendor.engagement_members(uuid), vendor.record_upload_attempt(), vendor.engagement_for_code(text),
  vendor.store_package(uuid,uuid,uuid,text,jsonb,text,timestamptz,boolean,text,bytea,bytea,bytea,jsonb), vendor.refuse_package(uuid,text,text[]),
  vendor.own_uploads(), vendor.retention_sweep(uuid), vendor.record_processing_agreement(uuid, text) TO orvia_vendor_app;
