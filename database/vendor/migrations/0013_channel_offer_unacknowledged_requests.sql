-- Codex review of 0.46.0: a check-in answer must stay readable however many requests are pending. The vendor now offers only
-- requests the client has not yet acknowledged. A request the client acknowledged as awaiting its approver is stored on the client,
-- which reports the later decision from its own copy; offering it again at every check-in only filled the answer and, with a large
-- backlog, kept newer requests from ever being offered.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;
CREATE OR REPLACE FUNCTION vendor.channel_pending_requests() RETURNS TABLE(id uuid, signed jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT r.id, r.signed FROM vendor.channel_requests r WHERE r.engagement_id = vendor.channel_caller() AND r.status = 'PENDING' ORDER BY r.issued_at, r.id LIMIT 200 $$;
REVOKE EXECUTE ON FUNCTION vendor.channel_pending_requests() FROM PUBLIC;
