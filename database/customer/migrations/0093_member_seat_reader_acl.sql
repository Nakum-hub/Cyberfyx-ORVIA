-- Limit the staff seat reader, independently of the immutable lifecycle migration.
REVOKE ALL ON FUNCTION app.member_seats() FROM PUBLIC;
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE starts_with(rolname,'orvia_') AND rolname<>'orvia_app' AND NOT rolsuper LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION app.member_seats() FROM %I',r.rolname);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION app.member_seats() TO orvia_app;
