-- Keep scope columns typed so PostgreSQL can use composite scope indexes.
-- Missing/empty context yields NULL (RLS denies); malformed UUID context errors.
-- No roles, grants, policies or actor requirements change. 0062 was used for
-- staff deletion after this performance correction was originally proposed.
CREATE OR REPLACE FUNCTION app.in_scope(t uuid, l uuid, e uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT t = nullif(current_setting('orvia.tenant_id', true), '')::uuid
     AND l = nullif(current_setting('orvia.legal_entity_id', true), '')::uuid
     AND e = nullif(current_setting('orvia.environment_id', true), '')::uuid
     AND coalesce(current_setting('orvia.actor_id', true), '') <> ''
$$;
