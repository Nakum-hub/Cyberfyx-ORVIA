-- Signed audit documents offered to the client installation at check-in carry the report PDF with a signed report,
-- so the client can import it through the same verified import as a file (task AUDIT-PRACTICE-01).
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;
CREATE FUNCTION vendor.channel_offered_documents() RETURNS TABLE(document_id uuid, kind text, document jsonb, signing_key_id text, signature text, pdf bytea)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT d.document_id, s.kind, s.document, s.signing_key_id, s.signature, r.pdf
  FROM vendor.channel_documents d JOIN vendor.signed_documents s ON s.id = d.document_id
  LEFT JOIN vendor.reports r ON r.signed_document_id = d.document_id AND s.kind = 'REPORT'
  WHERE d.engagement_id = vendor.channel_caller() AND d.acknowledged_at IS NULL AND (s.kind <> 'REPORT' OR r.pdf IS NOT NULL)
  ORDER BY d.offered_at, d.document_id LIMIT 20 $$;
REVOKE ALL ON FUNCTION vendor.channel_offered_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vendor.channel_offered_documents() TO orvia_vendor_app;
