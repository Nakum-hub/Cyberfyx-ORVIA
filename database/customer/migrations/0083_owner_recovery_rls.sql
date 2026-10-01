-- Every table in the app schema forces row-level security (tests/security/auth.test.ts and the scheduled control test
-- "every application table forces row security"). app.owner_recovery_codes (0074) missed it; the full battery's GRC control
-- test caught it. It is reached only through SECURITY DEFINER functions (app.owner_recovery_issue, app.owner_recovery_complete)
-- and no application role is granted it, so no policy is needed and every direct access stays denied.
ALTER TABLE app.owner_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.owner_recovery_codes FORCE ROW LEVEL SECURITY;
