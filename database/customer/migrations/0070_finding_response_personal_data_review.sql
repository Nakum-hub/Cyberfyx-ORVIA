-- Management responses over the audit channel (Codex review R1, task AUDIT-PRACTICE-01).
-- Revision 1.6 allows only personal-data-free material over the channel; personal data still needs the revision 1.5 per-item
-- exception and a processing agreement recorded by the vendor, which only the sealed package route carries. A response is therefore
-- approved for the channel only when its approver records that they read it and it contains no personal data. The contact-detail
-- screening at drafting stays as a safety net; it is not a substitute for this review.
ALTER TABLE app.audit_finding_responses ADD COLUMN personal_data_review text CHECK (personal_data_review IS NULL OR personal_data_review = 'NONE_CONFIRMED');

DROP FUNCTION app.audit_finding_response_approve(uuid);
CREATE FUNCTION app.audit_finding_response_approve(p_response uuid, p_personal_data text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE c app.exchange_ctx := app.exchange_caller('audit_exchange.approve'); r record;
BEGIN
 IF c.role NOT IN ('ORG_SUPER_ADMIN','ORG_ADMIN') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
 IF p_personal_data IS DISTINCT FROM 'NONE_CONFIRMED' THEN RAISE EXCEPTION 'confirm_the_response_contains_no_personal_data' USING ERRCODE = 'P0001', HINT = 'personal_data'; END IF;
 SELECT * INTO r FROM app.audit_finding_responses WHERE tenant_id = c.t AND legal_entity_id = c.l AND environment_id = c.e AND id = p_response FOR UPDATE;
 IF r IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002', HINT = 'id'; END IF;
 IF r.state <> 'DRAFT' THEN RAISE EXCEPTION 'response_not_a_draft' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
 IF r.prepared_by = c.actor THEN RAISE EXCEPTION 'approver_must_differ_from_preparer' USING ERRCODE = 'P0001', HINT = 'approved_by'; END IF;
 IF NOT EXISTS (SELECT 1 FROM app.audit_channel_keys k WHERE k.tenant_id = c.t AND k.legal_entity_id = c.l AND k.environment_id = c.e AND k.engagement_id = r.engagement_id) THEN
  RAISE EXCEPTION 'channel_not_available_for_this_engagement' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
 UPDATE app.audit_finding_responses SET state = 'QUEUED', approved_by = c.actor, approved_role = c.role, approved_at = clock_timestamp(), personal_data_review = 'NONE_CONFIRMED'
  WHERE id = p_response;
END $$;
REVOKE ALL ON FUNCTION app.audit_finding_response_approve(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.audit_finding_response_approve(uuid, text) TO orvia_app;

-- The review is part of the approval: it is set with it and never changes afterwards.
CREATE OR REPLACE FUNCTION app.audit_finding_response_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.content IS DISTINCT FROM OLD.content OR NEW.finding_id IS DISTINCT FROM OLD.finding_id OR NEW.import_id IS DISTINCT FROM OLD.import_id OR NEW.prepared_by IS DISTINCT FROM OLD.prepared_by
   OR (OLD.approved_by IS NOT NULL AND (NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.personal_data_review IS DISTINCT FROM OLD.personal_data_review)) THEN
  RAISE EXCEPTION 'finding_response_sealed' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
 IF OLD.signed IS NOT NULL AND (NEW.signed IS DISTINCT FROM OLD.signed OR NEW.digest IS DISTINCT FROM OLD.digest) THEN
  RAISE EXCEPTION 'finding_response_signed_once' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
 IF OLD.state IN ('ACCEPTED','REFUSED','WITHDRAWN') THEN RAISE EXCEPTION 'finding_response_final' USING ERRCODE = 'P0001', HINT = 'response'; END IF;
 RETURN NEW;
END $$;
