-- The upgrade boundary for migration 0090 (Codex round 8 review of revision 1.10).
-- 0090 records each purge from now on, but erasures the ledger purged before 0090 left no record. On an installation that ran
-- before the upgrade, a restore from an old backup would otherwise read as COMPLETE even though the ledger may already have
-- forgotten people that backup brings back. That is the false all-clear 0090 exists to prevent.
--
-- What is known: the purge (0076) removes only rows whose backups cleared more than 30 days earlier, and a row's backups clear
-- after its erasure. So any erasure purged before the upgrade happened more than 30 days before the upgrade, and only on a system
-- that already had a backup treatment then (every ledger row names its treatment). For each such system one boundary row is
-- recorded at the upgrade: erasures before upgrade time minus 30 days may no longer be in the ledger. It is conservative: it may
-- flag a restore for manual review when nothing was in fact purged, and it never reports one as complete when something may
-- have been.
ALTER TABLE app.erasure_ledger_purges ADD COLUMN basis text NOT NULL DEFAULT 'PURGE' CHECK (basis IN ('PURGE', 'BEFORE_UPGRADE'));
DO $$
DECLARE old_check text;
BEGIN
  SELECT conname INTO STRICT old_check FROM pg_constraint
  WHERE conrelid = 'app.erasure_ledger_purges'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%purged_rows > 0%';
  EXECUTE format('ALTER TABLE app.erasure_ledger_purges DROP CONSTRAINT %I', old_check);
END $$;
ALTER TABLE app.erasure_ledger_purges ADD CONSTRAINT erasure_ledger_purges_rows
  CHECK ((basis = 'PURGE' AND purged_rows > 0) OR (basis = 'BEFORE_UPGRADE' AND purged_rows = 0));

-- Records the boundary once per system. Run by this migration; safe to run again (it adds nothing for a system that has one).
CREATE FUNCTION app.record_ledger_upgrade_boundary() RETURNS integer LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
DECLARE n integer;
BEGIN
  INSERT INTO app.erasure_ledger_purges(tenant_id, legal_entity_id, environment_id, id, system_id, purged_through, purged_rows, basis)
  SELECT t.tenant_id, t.legal_entity_id, t.environment_id, gen_random_uuid(), t.system_id, clock_timestamp() - interval '30 days', 0, 'BEFORE_UPGRADE'
    FROM (SELECT DISTINCT tenant_id, legal_entity_id, environment_id, system_id FROM app.backup_treatments
           WHERE recorded_at < clock_timestamp() - interval '30 days') t
   WHERE NOT EXISTS (SELECT 1 FROM app.erasure_ledger_purges p WHERE p.tenant_id = t.tenant_id AND p.legal_entity_id = t.legal_entity_id
                       AND p.environment_id = t.environment_id AND p.system_id = t.system_id AND p.basis = 'BEFORE_UPGRADE');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION app.record_ledger_upgrade_boundary() FROM PUBLIC;
SELECT app.record_ledger_upgrade_boundary();
