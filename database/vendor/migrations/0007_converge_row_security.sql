-- Converge row-level security on every vendor table, whatever order the
-- migrations were applied in. Migration file names sort 0003_licence_fulfilment
-- before 0003_vendor_service, so a fresh database creates the licence tables
-- before 0005 forces row-level security; a database upgraded from 0006 applies
-- 0003_licence_fulfilment afterwards and would leave those tables unforced.
-- Forcing again here makes both paths identical. Tables without a policy deny
-- the business role; only the migrator and SECURITY DEFINER functions reach them.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('vendor','vendor_auth','account_auth') AND c.relkind = 'r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity) LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.nspname, t.relname);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', t.nspname, t.relname);
  END LOOP;
END $$;
