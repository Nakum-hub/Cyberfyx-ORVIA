-- Installation-local transport audit. It intentionally contains no cookies,
-- addresses, request payloads, resource selectors or customer identifiers.
-- Scoped business audit remains in app.audit_events. Runtime has insert only.
CREATE TABLE app.request_audit (
  id uuid PRIMARY KEY,
  operation text NOT NULL CHECK (operation IN ('AUTH_STAFF','AUTH_PRINCIPAL','SESSION_READ','PRINCIPAL_LIST','PRINCIPAL_CREATE')),
  status integer NOT NULL CHECK (status BETWEEN 100 AND 599),
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE app.request_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.request_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY transport_insert ON app.request_audit FOR INSERT WITH CHECK (true);
REVOKE ALL ON app.request_audit FROM PUBLIC;
