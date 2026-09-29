-- Every table in the app schema forces row-level security (tests/security/auth.test.ts,
-- "protected tables force RLS"). Two installation records missed it:
--   app.installation_setup     (0064) first-run setup code digest;
--   app.installation_identity  (0065) the installation kind.
-- Both are reached only through SECURITY DEFINER functions (app.first_run_state,
-- app.first_run_complete, app.installation_kind) and by the protected installer;
-- no application role is granted either table, so no policy is needed and every
-- direct access stays denied.
ALTER TABLE app.installation_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.installation_setup FORCE ROW LEVEL SECURITY;
ALTER TABLE app.installation_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.installation_identity FORCE ROW LEVEL SECURITY;
