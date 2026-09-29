-- Review findings on AUDIT-PRACTICE-01 (Codex review R2 and R6).
-- Numbered 0012: 0011 is reserved by the commerce lane's rename of its duplicate 0003 migration.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;

-- R2: a signed document too large to fit a check-in answer is never offered, dropped or treated as acknowledged; it is marked so
-- the audit team sends it to the client as a file instead.
ALTER TABLE vendor.channel_documents ADD COLUMN channel_state text NOT NULL DEFAULT 'OFFERED' CHECK (channel_state IN ('OFFERED', 'TOO_LARGE_FOR_CHANNEL')),
  ADD COLUMN encoded_bytes integer;
CREATE FUNCTION vendor.channel_document_too_large(p_document uuid, p_bytes integer) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  UPDATE vendor.channel_documents SET channel_state = 'TOO_LARGE_FOR_CHANNEL', encoded_bytes = p_bytes
  WHERE document_id = p_document AND engagement_id = vendor.channel_caller() AND acknowledged_at IS NULL $$;
CREATE OR REPLACE FUNCTION vendor.channel_offered_documents() RETURNS TABLE(document_id uuid, kind text, document jsonb, signing_key_id text, signature text, pdf bytea)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT d.document_id, s.kind, s.document, s.signing_key_id, s.signature, r.pdf
  FROM vendor.channel_documents d JOIN vendor.signed_documents s ON s.id = d.document_id
  LEFT JOIN vendor.reports r ON r.signed_document_id = d.document_id AND s.kind = 'REPORT'
  WHERE d.engagement_id = vendor.channel_caller() AND d.acknowledged_at IS NULL AND d.channel_state = 'OFFERED' AND (s.kind <> 'REPORT' OR r.pdf IS NOT NULL)
  ORDER BY d.offered_at, d.document_id LIMIT 20 $$;

-- R6: the practice helpers answer only about an engagement the caller may see (the rule of the engagements read policy); inside the
-- triggers that use them the actor is the team member making the change, so the triggers are unaffected.
CREATE OR REPLACE FUNCTION vendor.engagement_accepted(e uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT (vendor.has_capability('engagements.read') OR vendor.on_team(e))
     AND EXISTS (SELECT 1 FROM vendor.engagement_acceptances a WHERE a.engagement_id = e AND a.decision = 'ACCEPTED') $$;
CREATE OR REPLACE FUNCTION vendor.requirement_supported(e uuid, req text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT (vendor.has_capability('engagements.read') OR vendor.on_team(e)) AND EXISTS (
    SELECT 1 FROM vendor.procedures p
    JOIN LATERAL (SELECT * FROM vendor.working_papers w WHERE w.procedure_id = p.id ORDER BY w.version DESC LIMIT 1) w ON true
    WHERE p.engagement_id = e AND p.requirement_id = req AND p.retest_of_finding_id IS NULL AND w.conclusion = 'EFFECTIVE' AND w.reviewed_by IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM vendor.findings f WHERE f.engagement_id = e AND f.requirement_id = req AND f.status <> 'CLOSED' AND coalesce(f.criterion_type, 'STATUTORY') = 'STATUTORY') $$;

-- No vendor SECURITY DEFINER function is callable by PUBLIC; the application role keeps only its explicit grants. Trigger functions
-- need no EXECUTE right to fire. review_barred is used only inside definer triggers, so the application role loses it.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p WHERE p.pronamespace = 'vendor'::regnamespace AND p.prosecdef LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.sig);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION vendor.review_barred(uuid, uuid) FROM orvia_vendor_app;
GRANT EXECUTE ON FUNCTION vendor.channel_document_too_large(uuid, integer), vendor.channel_offered_documents() TO orvia_vendor_app;
