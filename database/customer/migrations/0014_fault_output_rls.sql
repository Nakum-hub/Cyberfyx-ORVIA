-- Test-only output is operator-written, but follows the same forced-RLS
-- invariant as all app tables. No application-role policy or grant is added.
ALTER TABLE app.test_fixture_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.test_fixture_sends FORCE ROW LEVEL SECURITY;
