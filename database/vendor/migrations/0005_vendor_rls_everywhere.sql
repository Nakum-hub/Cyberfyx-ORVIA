-- Row-level security on every table of the vendor database (revision 1.5 addendum:
-- "server-side authorisation and RLS on every vendor table"). Tables the vendor
-- business role writes get a narrow policy; installation records and the
-- commercial tables (not mounted in the vendor area) get none, so any direct
-- access by an application role is denied and only the installer, the migrator
-- and SECURITY DEFINER functions reach them.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('vendor','vendor_auth','account_auth') AND c.relkind = 'r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity) LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.nspname, t.relname);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', t.nspname, t.relname);
  END LOOP;
END $$;
-- The request audit is written for every vendor request, authenticated or not.
CREATE POLICY request_audit_insert ON vendor.request_audit FOR INSERT WITH CHECK (true);
-- The identity library works on its own tables as orvia_vendor_auth; the business role never holds grants on them.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('vendor_auth','account_auth') AND c.relkind = 'r' LOOP
    EXECUTE format('CREATE POLICY identity_library ON %I.%I FOR ALL TO orvia_vendor_auth USING (true) WITH CHECK (true)', t.nspname, t.relname);
  END LOOP;
END $$;
