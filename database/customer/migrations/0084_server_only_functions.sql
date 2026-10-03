-- Server-only functions stay server-only (security fix, 2026-10-01). The role set-up scripts (scripts/machine-init.ts,
-- scripts/auth-init.ts) granted EXECUTE on every app function to the runtime roles, which silently re-granted the functions
-- that only the protected server commands may call: owner recovery code issue (revision 1.8) and admitting real people
-- (revision 1.9). The scripts now revoke them straight after that grant (database/customer/src/server-only.ts); this
-- migration corrects installations enrolled before the fix. The owner-recovery and real-principals suites assert the refusal.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['orvia_app', 'orvia_worker', 'orvia_agent_control', 'orvia_machine_auth', 'orvia_sender'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION app.owner_recovery_issue(text, text) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION app.admit_real_principals(text, text) FROM %I', r);
    END IF;
  END LOOP;
END $$;
