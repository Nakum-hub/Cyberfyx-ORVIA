-- A restore older than the erasure ledger is never reported as complete (Codex round 8 cross-review, finding 5).
-- The ledger (0076) keeps a minimal row per erased person until 30 days after that system's backups age out, then the runner
-- purges it. A restore from a backup taken before a purged row's erasure brings that person back, but the row is gone, so the
-- restore cannot name them; "0 marked" would read as nothing to do. Each purge now records, per system, the latest erasure time
-- it removed. A restore whose backup was taken before that point is recorded with INCOMPLETE ledger coverage and stays in
-- Operations attention until a person records how the restored data was reviewed by hand. Nothing is invented: the restore is
-- still recorded, and the people the ledger can still name are still marked.
CREATE TABLE app.erasure_ledger_purges (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 system_id uuid NOT NULL, purged_through timestamptz NOT NULL, purged_rows integer NOT NULL CHECK (purged_rows > 0),
 purged_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, system_id) REFERENCES app.systems(tenant_id, legal_entity_id, environment_id, id));
CREATE INDEX erasure_ledger_purges_system ON app.erasure_ledger_purges(tenant_id, legal_entity_id, environment_id, system_id, purged_through DESC);
CREATE TRIGGER erasure_ledger_purges_append_only BEFORE UPDATE OR DELETE ON app.erasure_ledger_purges FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

ALTER TABLE app.system_restores
 ADD COLUMN ledger_purged_through timestamptz,
 ADD COLUMN ledger_coverage text NOT NULL DEFAULT 'COMPLETE' CHECK (ledger_coverage IN ('COMPLETE', 'INCOMPLETE'));
ALTER TABLE app.system_restores ADD CONSTRAINT system_restores_coverage_reason
 CHECK ((ledger_coverage = 'INCOMPLETE') = (ledger_purged_through IS NOT NULL AND backup_taken_at < ledger_purged_through));

-- How the restored data was reviewed by hand when the ledger could not name everyone. Append-only, one per restore.
CREATE TABLE app.restore_coverage_reviews (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, restore_id uuid NOT NULL,
 evidence_reference text NOT NULL CHECK (length(btrim(evidence_reference)) BETWEEN 3 AND 500),
 reviewed_by uuid NOT NULL, reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, restore_id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, restore_id) REFERENCES app.system_restores(tenant_id, legal_entity_id, environment_id, id));
CREATE TRIGGER restore_coverage_reviews_append_only BEFORE UPDATE OR DELETE ON app.restore_coverage_reviews FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- Only an INCOMPLETE restore takes a coverage review.
CREATE FUNCTION app.restore_coverage_review_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM app.system_restores s WHERE s.tenant_id = NEW.tenant_id AND s.legal_entity_id = NEW.legal_entity_id
   AND s.environment_id = NEW.environment_id AND s.id = NEW.restore_id AND s.ledger_coverage = 'INCOMPLETE') THEN
  RAISE EXCEPTION 'restore_ledger_coverage_is_complete' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.restore_coverage_review_guard() FROM PUBLIC;
CREATE TRIGGER restore_coverage_review_guard BEFORE INSERT ON app.restore_coverage_reviews FOR EACH ROW EXECUTE FUNCTION app.restore_coverage_review_guard();

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['erasure_ledger_purges', 'restore_coverage_reviews'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC', tab);
  EXECUTE format('CREATE POLICY read ON app.%I FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(''retention.read''))', tab);
 END LOOP;
END $$;
-- Purge records hold no personal data (a system, a time and a count): the runner writes them as it purges.
CREATE POLICY record ON app.erasure_ledger_purges FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner());
CREATE POLICY record ON app.restore_coverage_reviews FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id)
 AND current_setting('orvia.actor_domain',true) = 'STAFF' AND app.has_capability('retention.write') AND reviewed_by = current_setting('orvia.actor_id',true)::uuid);
GRANT SELECT ON app.erasure_ledger_purges TO orvia_app;
GRANT SELECT, INSERT ON app.erasure_ledger_purges TO orvia_worker;
GRANT SELECT, INSERT ON app.restore_coverage_reviews TO orvia_app;
GRANT SELECT ON app.restore_coverage_reviews TO orvia_worker;

-- How many people a restore marked, as a number only, for readers of retention records who may not read the ledger.
CREATE FUNCTION app.restore_marked_count(p_restore uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT count(*)::int FROM app.erasure_ledger l JOIN app.system_restores s
   ON s.tenant_id = l.tenant_id AND s.legal_entity_id = l.legal_entity_id AND s.environment_id = l.environment_id AND s.id = l.restore_id
  WHERE s.id = p_restore AND app.in_scope(s.tenant_id, s.legal_entity_id, s.environment_id) AND app.capability_or_runner('retention.read') $$;
REVOKE ALL ON FUNCTION app.restore_marked_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.restore_marked_count(uuid) TO orvia_app;
