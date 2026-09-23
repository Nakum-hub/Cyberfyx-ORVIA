-- Corrects an ineffective grant made by 0024.
--
-- 0024 granted SELECT on the migration ledger to orvia_app so a diagnostic
-- report could state which schema revision an installation is on. The grant
-- succeeded and did nothing: the ledger lives in public, and orvia_app has no
-- USAGE on public, so to that role the table does not exist at all. The report
-- therefore failed with a relation error rather than a refusal, which is the
-- worst of both outcomes.
--
-- Widening orvia_app to the whole public schema to fix one integer would be a
-- much larger change than the requirement needs. Instead the application gets
-- exactly the fact it needs and nothing else: a count, with no migration names,
-- no filenames, no checksums and no arguments. The view runs with its owner's
-- privileges, which is the whole point -- it is the only thing orvia_app is
-- allowed to learn about the ledger.

REVOKE SELECT ON bootstrap_migrations FROM orvia_app;
CREATE VIEW app.schema_revision AS SELECT count(*)::integer AS revision FROM bootstrap_migrations;
GRANT SELECT ON app.schema_revision TO orvia_app;
REVOKE ALL ON app.schema_revision FROM PUBLIC;
