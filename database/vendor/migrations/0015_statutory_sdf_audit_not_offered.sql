-- Decision D1 (docs/audit-practice/DECISIONS.md, management 2026-09-30): Cyberfyx reports only to its clients and does not offer
-- the statutory audit of a Significant Data Fiduciary, whose auditor must furnish a report to the Board under Rule 13(2).
-- New acceptances may not choose that service type. Acceptances already recorded are immutable and stay readable.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;
CREATE FUNCTION vendor.statutory_sdf_audit_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NEW.service_type = 'STATUTORY_SDF_AUDIT_CLAIM' AND (TG_OP = 'INSERT' OR OLD.service_type IS DISTINCT FROM NEW.service_type) THEN
    RAISE EXCEPTION 'statutory_sdf_audit_not_offered' USING ERRCODE = 'P0001', HINT = 'service_type'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER statutory_sdf_audit_guard BEFORE INSERT OR UPDATE OF service_type ON vendor.engagement_acceptances FOR EACH ROW EXECUTE FUNCTION vendor.statutory_sdf_audit_guard();
