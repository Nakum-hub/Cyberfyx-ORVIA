-- Owner decision 2026-10-01 (revision 1.10, decision A): an ACTIVE withdrawal canary is never admitted for marketing, even after
-- someone records a consent grant for it. Nobody can have obtained a decoy's consent, so the grant is itself a hit (0079) and
-- must not open marketing. Order and service messages follow the ordinary rules.
--
-- Serialisation: activation and retirement change the hold for every purpose of the principal, so they take an exclusive
-- principal-wide lock, and the admission check takes the same lock shared. An admission therefore sees the canary state as it
-- was either wholly before or wholly after a transition, never a half-applied one. The purpose-level consent lock alone would
-- not cover a principal across purposes.
CREATE FUNCTION app.canary_lock_key(p_tenant uuid, p_entity uuid, p_environment uuid, p_principal uuid) RETURNS bigint
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
 SELECT hashtextextended(concat_ws(':', 'withdrawal-canary', p_tenant, p_entity, p_environment, p_principal), 0) $$;
REVOKE ALL ON FUNCTION app.canary_lock_key(uuid, uuid, uuid, uuid) FROM PUBLIC;

CREATE FUNCTION app.canary_transition_lock() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
 IF NEW.state IS DISTINCT FROM OLD.state THEN
  PERFORM pg_advisory_xact_lock(app.canary_lock_key(OLD.tenant_id, OLD.legal_entity_id, OLD.environment_id, OLD.principal_id));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.canary_transition_lock() FROM PUBLIC;
CREATE TRIGGER transition_lock BEFORE UPDATE OF state ON app.withdrawal_canaries FOR EACH ROW EXECUTE FUNCTION app.canary_transition_lock();

-- Called by send admission and its preview, inside their transaction, before any decision or send record is written. It answers
-- only for the caller's own scope. The caller turns a hold into a BLOCK with a generic reason that does not name canaries; the
-- hold itself is not reported anywhere else to the sender. A sender that already controls every other admission prerequisite
-- can still infer a difference from the BLOCK; that limit is recorded in the revision 1.10 addendum.
CREATE FUNCTION app.canary_marketing_hold(p_principal uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE t uuid; e uuid; v uuid;
BEGIN
 t := nullif(current_setting('orvia.tenant_id', true), '')::uuid;
 e := nullif(current_setting('orvia.legal_entity_id', true), '')::uuid;
 v := nullif(current_setting('orvia.environment_id', true), '')::uuid;
 IF t IS NULL OR e IS NULL OR v IS NULL OR p_principal IS NULL THEN RAISE EXCEPTION 'canary_hold_scope_required' USING ERRCODE = '22023'; END IF;
 PERFORM pg_advisory_xact_lock_shared(app.canary_lock_key(t, e, v, p_principal));
 RETURN EXISTS (SELECT 1 FROM app.withdrawal_canaries w
  WHERE w.tenant_id = t AND w.legal_entity_id = e AND w.environment_id = v AND w.principal_id = p_principal AND w.state = 'ACTIVE');
END $$;
REVOKE ALL ON FUNCTION app.canary_marketing_hold(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.canary_marketing_hold(uuid) TO orvia_app, orvia_sender;
-- Installations whose role set-up already granted every app function to every runtime role keep the hold narrow.
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['orvia_worker', 'orvia_agent_control', 'orvia_machine_auth'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN EXECUTE format('REVOKE ALL ON FUNCTION app.canary_marketing_hold(uuid) FROM %I', r); END IF;
 END LOOP;
END $$;
