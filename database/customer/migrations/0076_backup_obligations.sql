-- EX07 backup-copy obligations (master §§50 "Deletion, derived copies and restoration safety", 52, 91).
--   "For backups that cannot be selectively edited, record the technical restriction, isolation controls, retention schedule,
--    restore procedure and customer-approved legal treatment. Maintain a minimal, protected suppression/deletion ledger only to
--    the extent needed and justified. It can itself contain personal data and therefore needs its own access and retention policy."
--   "A future backup-expiry date is not present-tense proof of erasure."  "An unknown backup remains visibly unverified."
--
-- 1. backup_treatments: per system, the five facts above; recorded by one person, approved by another; one current per system.
-- 2. erasure_ledger: when an erasure or anonymisation is verified on a system that has a current treatment, one row records the
--    person, the system and the date the system's backups will have aged out under that treatment. It proves nothing about the
--    backups; it exists so a restore can be answered. Rows are purged 30 days after that date (the ledger's own retention).
-- 3. system_restores: staff record that a system was restored from a backup taken at a given time. Every person erased on that
--    system after that time is marked for re-erasure, which stays visible until someone records that it was re-applied.
CREATE TABLE app.backup_treatments (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 system_id uuid NOT NULL,
 technical_restriction text NOT NULL CHECK (length(technical_restriction) BETWEEN 10 AND 1000),
 isolation_controls text NOT NULL CHECK (length(isolation_controls) BETWEEN 10 AND 1000),
 retention_days integer NOT NULL CHECK (retention_days BETWEEN 1 AND 3650),
 restore_procedure_reference text NOT NULL CHECK (length(restore_procedure_reference) BETWEEN 3 AND 500),
 legal_treatment text NOT NULL CHECK (length(legal_treatment) BETWEEN 10 AND 1000),
 status text NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','CURRENT','SUPERSEDED')),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_by uuid, approved_at timestamptz, superseded_at timestamptz,
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK ((approved_by IS NULL) = (approved_at IS NULL)), CHECK (approved_by IS NULL OR approved_by <> recorded_by),
 CHECK (status = 'PROPOSED' OR approved_by IS NOT NULL), CHECK ((status = 'SUPERSEDED') = (superseded_at IS NOT NULL)));
CREATE UNIQUE INDEX backup_treatments_one_current ON app.backup_treatments(tenant_id,legal_entity_id,environment_id,system_id) WHERE status = 'CURRENT';
-- The recorded facts never change; only PROPOSED -> CURRENT (with approval) and CURRENT -> SUPERSEDED move.
CREATE FUNCTION app.backup_treatment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'backup_treatment_is_retained' USING ERRCODE = 'P0001'; END IF;
  IF (NEW.tenant_id,NEW.legal_entity_id,NEW.environment_id,NEW.id,NEW.system_id,NEW.technical_restriction,NEW.isolation_controls,NEW.retention_days,NEW.restore_procedure_reference,NEW.legal_treatment,NEW.recorded_by,NEW.recorded_at)
     IS DISTINCT FROM (OLD.tenant_id,OLD.legal_entity_id,OLD.environment_id,OLD.id,OLD.system_id,OLD.technical_restriction,OLD.isolation_controls,OLD.retention_days,OLD.restore_procedure_reference,OLD.legal_treatment,OLD.recorded_by,OLD.recorded_at)
     OR NOT ((OLD.status = 'PROPOSED' AND NEW.status = 'CURRENT') OR (OLD.status = 'CURRENT' AND NEW.status = 'SUPERSEDED'))
     OR (OLD.status = 'CURRENT' AND (NEW.approved_by, NEW.approved_at) IS DISTINCT FROM (OLD.approved_by, OLD.approved_at))
  THEN RAISE EXCEPTION 'backup_treatment_transition_refused' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER backup_treatment_guard BEFORE UPDATE OR DELETE ON app.backup_treatments FOR EACH ROW EXECUTE FUNCTION app.backup_treatment_guard();

CREATE TABLE app.system_restores (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 system_id uuid NOT NULL, backup_taken_at timestamptz NOT NULL, restored_at timestamptz NOT NULL,
 evidence_reference text NOT NULL CHECK (length(evidence_reference) BETWEEN 3 AND 500),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK (backup_taken_at <= restored_at), CHECK (restored_at <= recorded_at + interval '5 minutes'));
CREATE TRIGGER system_restores_append_only BEFORE UPDATE OR DELETE ON app.system_restores FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

CREATE TABLE app.erasure_ledger (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 subject_id uuid NOT NULL, system_id uuid NOT NULL, action_id uuid NOT NULL, treatment_id uuid NOT NULL,
 erased_at timestamptz NOT NULL, backups_clear_after timestamptz NOT NULL,
 state text NOT NULL DEFAULT 'IN_BACKUPS' CHECK (state IN ('IN_BACKUPS','BACKUPS_AGED_OUT','REAPPLY_REQUIRED','REAPPLIED')),
 restore_id uuid, reapplied_by uuid, reapplied_at timestamptz, reapplied_evidence text,
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 UNIQUE (tenant_id,legal_entity_id,environment_id,action_id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,action_id) REFERENCES app.downstream_actions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,treatment_id) REFERENCES app.backup_treatments(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,restore_id) REFERENCES app.system_restores(tenant_id,legal_entity_id,environment_id,id),
 CHECK (backups_clear_after > erased_at),
 CHECK ((state IN ('REAPPLY_REQUIRED','REAPPLIED')) = (restore_id IS NOT NULL)),
 CHECK ((state = 'REAPPLIED') = (reapplied_at IS NOT NULL) AND (reapplied_at IS NULL) = (reapplied_by IS NULL) AND (reapplied_at IS NULL) = (reapplied_evidence IS NULL)));
CREATE INDEX erasure_ledger_by_system ON app.erasure_ledger(tenant_id,legal_entity_id,environment_id,system_id,erased_at);
-- Only the state moves: IN_BACKUPS -> BACKUPS_AGED_OUT | REAPPLY_REQUIRED; BACKUPS_AGED_OUT -> REAPPLY_REQUIRED (a restore from an
-- older backup than recorded still needs re-erasure); REAPPLY_REQUIRED -> REAPPLIED; REAPPLIED -> REAPPLY_REQUIRED (a later restore).
-- A row is deleted only by the ledger's own retention: aged out, never needing re-erasure, 30 days past its clear date.
CREATE FUNCTION app.erasure_ledger_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state = 'BACKUPS_AGED_OUT' AND OLD.backups_clear_after < clock_timestamp() - interval '30 days' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'erasure_ledger_row_is_retained' USING ERRCODE = 'P0001';
  END IF;
  IF (NEW.tenant_id,NEW.legal_entity_id,NEW.environment_id,NEW.id,NEW.subject_id,NEW.system_id,NEW.action_id,NEW.treatment_id,NEW.erased_at,NEW.backups_clear_after)
     IS DISTINCT FROM (OLD.tenant_id,OLD.legal_entity_id,OLD.environment_id,OLD.id,OLD.subject_id,OLD.system_id,OLD.action_id,OLD.treatment_id,OLD.erased_at,OLD.backups_clear_after)
     OR NOT ((OLD.state = 'IN_BACKUPS' AND NEW.state IN ('BACKUPS_AGED_OUT','REAPPLY_REQUIRED')) OR (OLD.state = 'BACKUPS_AGED_OUT' AND NEW.state = 'REAPPLY_REQUIRED')
       OR (OLD.state = 'REAPPLY_REQUIRED' AND NEW.state = 'REAPPLIED') OR (OLD.state = 'REAPPLIED' AND NEW.state = 'REAPPLY_REQUIRED'))
  THEN RAISE EXCEPTION 'erasure_ledger_transition_refused' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER erasure_ledger_guard BEFORE UPDATE OR DELETE ON app.erasure_ledger FOR EACH ROW EXECUTE FUNCTION app.erasure_ledger_guard();
REVOKE ALL ON FUNCTION app.backup_treatment_guard, app.erasure_ledger_guard FROM PUBLIC;

-- Access. Treatments and restores are ordinary retention records. The ledger names people, so reading it needs the sensitive
-- registry capability; it is written by the verification step (staff or the local runner) and by restore handling.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['backup_treatments','system_restores','erasure_ledger'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
 END LOOP;
END $$;
CREATE POLICY read ON app.backup_treatments FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('retention.read'));
CREATE POLICY record ON app.backup_treatments FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true) = 'STAFF' AND app.has_capability('retention.write'));
CREATE POLICY approve ON app.backup_treatments FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true) = 'STAFF' AND app.has_capability('retention.approve')) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY read ON app.system_restores FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('retention.read'));
CREATE POLICY record ON app.system_restores FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true) = 'STAFF' AND app.has_capability('retention.write'));
CREATE POLICY read ON app.erasure_ledger FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.sensitive.read'));
CREATE POLICY record ON app.erasure_ledger FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('operations.execute'));
CREATE POLICY move ON app.erasure_ledger FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND (app.capability_or_runner('retention.write') OR app.capability_or_runner('operations.execute'))) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY purge ON app.erasure_ledger FOR DELETE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner());
GRANT SELECT, INSERT, UPDATE ON app.backup_treatments, app.system_restores TO orvia_app;
GRANT SELECT, INSERT, UPDATE ON app.erasure_ledger TO orvia_app;
GRANT SELECT ON app.backup_treatments, app.system_restores TO orvia_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.erasure_ledger TO orvia_worker;
REVOKE ALL ON app.backup_treatments, app.system_restores, app.erasure_ledger FROM PUBLIC;
-- Recording a restore marks re-erasure without letting the recorder read the ledger: people erased on that system after the
-- restored backup was taken are marked REAPPLY_REQUIRED, and only the count comes back. Only the ledger's readers see who.
CREATE FUNCTION app.mark_reerasure_after_restore(p_restore uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE r record; n integer;
BEGIN
  SELECT * INTO r FROM app.system_restores s WHERE s.id = p_restore AND app.in_scope(s.tenant_id,s.legal_entity_id,s.environment_id)
    AND current_setting('orvia.actor_domain',true) = 'STAFF' AND app.has_capability('retention.write');
  IF r IS NULL THEN RAISE EXCEPTION 'restore_not_found' USING ERRCODE = 'P0001', HINT = 'id'; END IF;
  UPDATE app.erasure_ledger l SET state = 'REAPPLY_REQUIRED', restore_id = r.id, reapplied_by = NULL, reapplied_at = NULL, reapplied_evidence = NULL
   WHERE l.tenant_id = r.tenant_id AND l.legal_entity_id = r.legal_entity_id AND l.environment_id = r.environment_id
     AND l.system_id = r.system_id AND l.erased_at > r.backup_taken_at AND l.state IN ('IN_BACKUPS','BACKUPS_AGED_OUT','REAPPLIED');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION app.mark_reerasure_after_restore(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.mark_reerasure_after_restore(uuid) TO orvia_app;
-- Coverage counts for readers of retention records who may not read the ledger itself: numbers only, never who.
CREATE FUNCTION app.erasure_ledger_counts(p_system uuid) RETURNS TABLE(in_backups integer, reapply_required integer, earliest_clear_after timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT count(*) FILTER (WHERE l.state = 'IN_BACKUPS')::int, count(*) FILTER (WHERE l.state = 'REAPPLY_REQUIRED')::int, min(l.backups_clear_after) FILTER (WHERE l.state = 'IN_BACKUPS')
  FROM app.erasure_ledger l
  WHERE l.system_id = p_system AND app.in_scope(l.tenant_id,l.legal_entity_id,l.environment_id) AND app.capability_or_runner('retention.read') $$;
REVOKE ALL ON FUNCTION app.erasure_ledger_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.erasure_ledger_counts(uuid) TO orvia_app, orvia_worker;
