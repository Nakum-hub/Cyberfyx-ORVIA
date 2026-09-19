-- WP13 / M18 Coverage and Failure Center.
-- Coverage itself is computed, never stored, so it cannot go stale behind a
-- cached number. Gaps are stored, because an owner, a severity, a deadline and
-- a closure are decisions people make and must be auditable.

CREATE TABLE app.coverage_gaps (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 source text NOT NULL CHECK(source IN ('NO_RETENTION_BASIS','NEVER_OBSERVED','STALE_OBSERVATION','UNREVIEWED_INVENTORY','UNRESOLVED_DESTINATION','FAILED_EXECUTION')),
 subject_kind text NOT NULL CHECK(subject_kind IN ('DATA_ASSET','RIGHTS_REQUEST')),
 subject_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','IN_PROGRESS','RESOLVED','ACCEPTED_RISK')),
 severity text NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 owner_reference text,due_at timestamptz,
 evidence_reference text,resolution_note text,description text NOT NULL,
 detected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 -- A gap is closed by evidence, or by an owned and reasoned acceptance of risk.
 CHECK(NOT(state='RESOLVED' AND evidence_reference IS NULL)),
 CHECK(NOT(state='ACCEPTED_RISK' AND (owner_reference IS NULL OR resolution_note IS NULL))),
 CHECK(last_seen_at>=detected_at));
-- One open gap per real finding. Re-deriving refreshes it instead of stacking
-- duplicates, so a long-standing problem keeps its original detection date.
CREATE UNIQUE INDEX one_open_gap_per_finding ON app.coverage_gaps(tenant_id,legal_entity_id,environment_id,source,subject_kind,subject_id)
 WHERE state IN ('OPEN','IN_PROGRESS');
CREATE INDEX gaps_by_state ON app.coverage_gaps(tenant_id,legal_entity_id,environment_id,state,severity);

-- Closure is terminal. A finding that recurs opens a new gap with its own
-- detection date, so "we fixed that once" cannot hide a recurrence.
CREATE FUNCTION app.closed_gap_is_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state IN ('RESOLVED','ACCEPTED_RISK') AND NEW IS DISTINCT FROM OLD
  THEN RAISE EXCEPTION 'A closed gap is terminal; a recurrence opens a new one' USING ERRCODE='23514'; END IF;
 IF NEW.detected_at IS DISTINCT FROM OLD.detected_at
  THEN RAISE EXCEPTION 'A gap keeps its original detection date' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER closed_gap_terminal BEFORE UPDATE ON app.coverage_gaps FOR EACH ROW EXECUTE FUNCTION app.closed_gap_is_terminal();
REVOKE ALL ON FUNCTION app.closed_gap_is_terminal FROM PUBLIC;

ALTER TABLE app.coverage_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.coverage_gaps FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_gap_read ON app.coverage_gaps FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('coverage.read'));
CREATE POLICY scoped_gap_insert ON app.coverage_gaps FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('coverage.manage'));
CREATE POLICY scoped_gap_update ON app.coverage_gaps FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('coverage.manage'));
GRANT SELECT,INSERT,UPDATE ON app.coverage_gaps TO orvia_app;
REVOKE ALL ON app.coverage_gaps FROM PUBLIC;
