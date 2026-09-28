-- Row-level scope compared as uuids, not text (user-approved 2026-09-28).
--
-- The original predicate cast each scope column to text and compared it with
-- the session setting. That is correct, but the planner cannot estimate it: it
-- assumed one matching row, so scoped list queries chose a sequential scan and
-- sort over the whole table instead of the (scope, time, id) indexes, and their
-- cost grew with table size (EXPLAIN evidence in the expansion takeover handoff).
-- Fail-closed behaviour is kept: an unset or empty setting becomes NULL and the
-- comparison yields no rows; a malformed setting raises an error.
CREATE OR REPLACE FUNCTION app.in_scope(t uuid,l uuid,e uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT t = nullif(current_setting('orvia.tenant_id',true),'')::uuid
    AND l = nullif(current_setting('orvia.legal_entity_id',true),'')::uuid
    AND e = nullif(current_setting('orvia.environment_id',true),'')::uuid
    AND coalesce(current_setting('orvia.actor_id',true),'') <> ''
$$;
