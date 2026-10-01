-- Real people as Data Principals (owner decision 2026-10-01, revision 1.9 addendum; production installation qualification,
-- docs/engineering/PRODUCTION_READINESS.md). Until now app.principal_references accepted only the synthetic @aster.example /
-- @birch.example addresses by a fixed CHECK (migration 0001), so no installation could ever record a real person. That rule
-- stays the default. It is lifted for one installation only by a protected server command
-- (`pnpm run principals:admit-real confirm:<profile> "<qualification reference>"`), run by someone with administrator access to
-- the installation's server once the installation is qualified; never through the application. The act is one-way: returning
-- to synthetic-only would strand the real records. Synthetic addresses stay accepted afterwards and are always labelled
-- synthetic; every other address is labelled real. The development and test profiles can never admit real people.
-- Identifiers are email only (owner decision 2026-10-01): no phone-number principals.
CREATE TABLE app.principal_admission (
  singleton smallint PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  real_permitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  qualification_reference text NOT NULL CHECK (length(btrim(qualification_reference)) BETWEEN 8 AND 500),
  recorded_by text NOT NULL CHECK (length(btrim(recorded_by)) BETWEEN 1 AND 200));
CREATE FUNCTION app.principal_admission_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN RAISE EXCEPTION 'principal_admission_is_permanent' USING ERRCODE = 'P0001'; END $$;
CREATE TRIGGER principal_admission_guard BEFORE UPDATE OR DELETE ON app.principal_admission FOR EACH ROW EXECUTE FUNCTION app.principal_admission_guard();
REVOKE ALL ON app.principal_admission FROM PUBLIC;
-- Every app table forces row security; it is reached only through the SECURITY DEFINER functions below, so no policy is needed.
ALTER TABLE app.principal_admission ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.principal_admission FORCE ROW LEVEL SECURITY;
REVOKE ALL ON FUNCTION app.principal_admission_guard() FROM PUBLIC;

CREATE FUNCTION app.real_principals_permitted() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT EXISTS (SELECT 1 FROM app.principal_admission) $$;
CREATE FUNCTION app.principal_admission_state() RETURNS TABLE(real_permitted boolean, real_permitted_at timestamptz, qualification_reference text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT true, a.real_permitted_at, a.qualification_reference FROM app.principal_admission a
  UNION ALL SELECT false, NULL::timestamptz, NULL::text WHERE NOT EXISTS (SELECT 1 FROM app.principal_admission) $$;
REVOKE ALL ON FUNCTION app.real_principals_permitted(), app.principal_admission_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.real_principals_permitted(), app.principal_admission_state() TO orvia_app, orvia_worker;

-- The fixed CHECKs become a trigger that consults the admission. The refusal keeps SQLSTATE 23514 and names a constraint
-- containing "email", so callers that already explain the synthetic-only refusal (organisation intake) keep doing so.
ALTER TABLE app.principal_references DROP CONSTRAINT principal_references_email_check;
ALTER TABLE app.principal_references DROP CONSTRAINT principal_references_synthetic_check;
ALTER TABLE app.principal_references ADD CONSTRAINT principal_references_email_shape
  CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND length(email) <= 254);
CREATE FUNCTION app.principal_reference_admission() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF NEW.email ~ '@(aster|birch)\.example$' THEN NEW.synthetic := true; RETURN NEW; END IF;
  IF NOT app.real_principals_permitted() THEN
    RAISE EXCEPTION 'synthetic_principals_only' USING ERRCODE = '23514', CONSTRAINT = 'principal_references_email_synthetic_only',
      HINT = 'This installation is not yet qualified for real people; see docs/engineering/PRODUCTION_READINESS.md';
  END IF;
  NEW.synthetic := false; RETURN NEW;
END $$;
CREATE TRIGGER principal_reference_admission BEFORE INSERT OR UPDATE OF email, synthetic ON app.principal_references
  FOR EACH ROW EXECUTE FUNCTION app.principal_reference_admission();
REVOKE ALL ON FUNCTION app.principal_reference_admission() FROM PUBLIC;

-- Run only by the protected local command (the migration/operator connection); not granted to any application role.
CREATE FUNCTION app.admit_real_principals(p_reference text, p_recorded_by text) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE at timestamptz; e record; b record;
BEGIN
  PERFORM pg_advisory_xact_lock(728141);
  SELECT installation_id, profile INTO b FROM public.bootstrap_profile WHERE singleton = 1;
  -- The development and test profiles hold synthetic fixtures by design; they never admit real people.
  IF b IS NULL OR b.profile IN ('codex-a00', 'ui-b00') THEN RAISE EXCEPTION 'test_profile_cannot_admit_real_principals' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM app.principal_admission) THEN RAISE EXCEPTION 'real_principals_already_admitted' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO app.principal_admission(qualification_reference, recorded_by) VALUES (btrim(p_reference), btrim(p_recorded_by)) RETURNING real_permitted_at INTO at;
  FOR e IN SELECT tenant_id, legal_entity_id, id FROM app.environments LOOP
    INSERT INTO app.audit_events(id, tenant_id, legal_entity_id, environment_id, actor_id, actor_domain, operation, resource_id, request_id)
      VALUES (gen_random_uuid(), e.tenant_id, e.legal_entity_id, e.id, b.installation_id, 'MACHINE', 'principals.real-admitted-on-server', e.id, gen_random_uuid());
  END LOOP;
  RETURN at;
END $$;
REVOKE ALL ON FUNCTION app.admit_real_principals(text, text) FROM PUBLIC;
