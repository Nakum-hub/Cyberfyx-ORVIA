-- Revision 1.11 (owner decisions 2026-10-02): tiers, subscriptions and the licence lifecycle.
-- Tier migrations use the 0100-0119 range so they cannot collide with Codex round 9 (0092 onwards).
--
-- A commercial change on the vendor website (renewal, upgrade, downgrade, seat change, period change, trial) arrives as a new
-- signed licence. The installation keeps every licence it imported (they are never edited or deleted, 0023) and decides which
-- one is in force:
--   * a trial (term TRIAL) overlays the paid licence while its window is open, then falls back to it with no action;
--   * the paid licence stays in force through the grace days of its term after valid_to (7 monthly, 15 quarterly, 30 annual
--     and contract); after that it is EXPIRED: new premium work stops, the legal floor, protective controls, reading and
--     export continue (FR-M28-03; AGENTS: a licence state never reactivates marketing);
--   * a sequenced licence may be imported before its valid_from (a downgrade or period change effective at renewal); it takes
--     force at valid_from, and until then the current licence stays in force;
--   * sequence increases with every licence the vendor issues to this installation; a lower or equal sequence is refused, so
--     an old Enterprise licence cannot be re-imported after a downgrade (anti-rollback). Licences issued before 1.11 carry
--     no sequence; once a sequenced licence is imported, an unsequenced one is refused too.
ALTER TABLE app.licences DROP CONSTRAINT licences_edition_check;
ALTER TABLE app.licences ADD CONSTRAINT licences_edition_check CHECK (edition IN ('FOUNDATION', 'CONTROL', 'ENTERPRISE', 'CUSTOM'));
ALTER TABLE app.licences
  ADD COLUMN term text NOT NULL DEFAULT 'CONTRACT' CHECK (term IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'TRIAL', 'CONTRACT')),
  ADD COLUMN sequence integer CHECK (sequence IS NULL OR sequence >= 1),
  ADD COLUMN trial boolean NOT NULL DEFAULT false;
ALTER TABLE app.licences ADD CONSTRAINT licences_trial_term CHECK (trial = (term = 'TRIAL'));
ALTER TABLE app.licences ADD CONSTRAINT licences_trial_length CHECK (NOT trial OR valid_to - valid_from <= interval '30 days');
ALTER TABLE app.licences ADD CONSTRAINT licences_trial_tier CHECK (NOT trial OR edition <> 'FOUNDATION');
-- Several licences can now be active in one scope (a trial over a paid licence, a downgrade waiting for its start date, the
-- sequenced licences it outranks); app.effective_licence decides which is in force. Unsequenced (pre-1.11) licences keep
-- the old rule: importing one supersedes the previous one.
DROP INDEX app.one_active_licence_per_scope;
CREATE UNIQUE INDEX one_active_unsequenced_licence_per_scope ON app.licences(tenant_id, legal_entity_id, environment_id) WHERE active AND sequence IS NULL;

CREATE FUNCTION app.licence_grace_days(p_term text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT CASE p_term WHEN 'MONTHLY' THEN 7 WHEN 'QUARTERLY' THEN 15 WHEN 'ANNUAL' THEN 30 WHEN 'TRIAL' THEN 0 ELSE 30 END $$;
REVOKE ALL ON FUNCTION app.licence_grace_days(text) FROM PUBLIC;

-- Anti-rollback and one trial per edition, enforced by the database whatever code path imports.
CREATE FUNCTION app.licence_import_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
DECLARE top integer; sequenced boolean;
BEGIN
  SELECT max(sequence), bool_or(sequence IS NOT NULL) INTO top, sequenced FROM app.licences
   WHERE tenant_id = NEW.tenant_id AND legal_entity_id = NEW.legal_entity_id AND environment_id = NEW.environment_id;
  IF NEW.sequence IS NULL AND coalesce(sequenced, false) THEN RAISE EXCEPTION 'stale_sequence' USING ERRCODE = '23514', HINT = 'licence'; END IF;
  IF NEW.sequence IS NOT NULL AND top IS NOT NULL AND NEW.sequence <= top THEN RAISE EXCEPTION 'stale_sequence' USING ERRCODE = '23514', HINT = 'licence'; END IF;
  IF NEW.trial AND EXISTS (SELECT 1 FROM app.licences WHERE tenant_id = NEW.tenant_id AND legal_entity_id = NEW.legal_entity_id
       AND environment_id = NEW.environment_id AND trial AND edition = NEW.edition) THEN
    RAISE EXCEPTION 'trial_already_used' USING ERRCODE = '23514', HINT = 'licence'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.licence_import_guard() FROM PUBLIC;
CREATE TRIGGER licence_import_guard BEFORE INSERT ON app.licences FOR EACH ROW EXECUTE FUNCTION app.licence_import_guard();

-- The licence in force for a scope, with its lifecycle. One resolver for the application, the seat check and preflight.
CREATE FUNCTION app.effective_licence(p_tenant uuid, p_entity uuid, p_environment uuid)
RETURNS TABLE(id uuid, licence_id uuid, edition text, term text, trial boolean, sequence integer, valid_from timestamptz, valid_to timestamptz,
              grace_until timestamptz, lifecycle text, claims jsonb, fallback_id uuid)
LANGUAGE sql STABLE SET search_path = pg_catalog, app AS $$
  WITH rows AS (
    SELECT l.*, l.valid_to + make_interval(days => app.licence_grace_days(l.term)) AS grace_until FROM app.licences l
     WHERE l.tenant_id = p_tenant AND l.legal_entity_id = p_entity AND l.environment_id = p_environment AND l.active),
  -- A licence imported ahead of its start (a downgrade or period change effective at renewal) waits until valid_from.
  paid AS (SELECT * FROM rows WHERE NOT trial AND valid_from <= clock_timestamp() ORDER BY coalesce(sequence, 0) DESC, imported_at DESC LIMIT 1),
  overlay AS (SELECT * FROM rows WHERE trial AND valid_from <= clock_timestamp() AND valid_to > clock_timestamp() ORDER BY sequence DESC LIMIT 1),
  chosen AS (SELECT o.*, (SELECT p.id FROM paid p) AS fallback_id FROM overlay o
             UNION ALL SELECT p.*, NULL::uuid FROM paid p WHERE NOT EXISTS (SELECT 1 FROM overlay))
  SELECT c.id, c.licence_id, c.edition, c.term, c.trial, c.sequence, c.valid_from, c.valid_to, c.grace_until,
         CASE WHEN clock_timestamp() < c.valid_to THEN 'ACTIVE' WHEN clock_timestamp() < c.grace_until THEN 'GRACE' ELSE 'EXPIRED' END,
         c.claims, c.fallback_id
    FROM chosen c LIMIT 1 $$;
REVOKE ALL ON FUNCTION app.effective_licence(uuid, uuid, uuid) FROM PUBLIC;

-- Seats follow the effective licence and its grace (they used to read "the" active row, which a trial overlay makes ambiguous).
CREATE OR REPLACE FUNCTION app.member_seats() RETURNS TABLE(licence_state text, licensed integer, used integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE l record; t uuid; le uuid; e uuid;
BEGIN
  PERFORM app.staff_manager_check();
  t := current_setting('orvia.tenant_id')::uuid; le := current_setting('orvia.legal_entity_id')::uuid; e := current_setting('orvia.environment_id')::uuid;
  SELECT x.lifecycle, x.claims INTO l FROM app.effective_licence(t, le, e) x;
  used := (SELECT count(*)::integer FROM staff_auth.authority a WHERE a.tenant_id=t AND a.legal_entity_id=le AND a.environment_id=e AND a.active AND a.role IN ('MEMBER', 'AUDITOR'));
  IF l IS NULL THEN licence_state := 'NO_LICENCE'; licensed := NULL;
  ELSIF l.lifecycle = 'EXPIRED' THEN licence_state := 'EXPIRED'; licensed := NULL;
  ELSIF l.claims->'licensed_limits'->'member_seats' IS NULL THEN licence_state := 'NO_MEMBER_SEATS'; licensed := NULL;
  ELSE licence_state := 'ACTIVE'; licensed := (l.claims->'licensed_limits'->>'member_seats')::integer; END IF;
  RETURN NEXT;
END $$;
