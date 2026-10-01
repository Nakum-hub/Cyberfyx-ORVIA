-- Production criteria from the signed official regulatory package (vendor contract 0.5.0).
-- 0008 required a PRODUCTION criteria row to be approved in the same statement that inserted it, and an approver must differ
-- from the recorder, so no two-person flow could ever create one: the production-criteria activation gate could not be met.
-- A production row may now be recorded unapproved and approved later by a different person (approveCriteria). What the old
-- check guaranteed implicitly is now explicit: a REAL engagement can be accepted only on approved production criteria.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;
ALTER TABLE vendor.criteria_versions DROP CONSTRAINT criteria_versions_check2;
CREATE FUNCTION vendor.real_acceptance_needs_approved_criteria() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, vendor AS $$
DECLARE e record;
BEGIN
  IF NEW.decision = 'ACCEPTED' THEN
    SELECT use_kind, criteria_version_id INTO e FROM vendor.engagements WHERE id = NEW.engagement_id;
    IF e.use_kind = 'REAL' AND NOT EXISTS (SELECT 1 FROM vendor.criteria_versions v WHERE v.id = e.criteria_version_id AND v.distribution = 'PRODUCTION' AND v.approved_by IS NOT NULL) THEN
      RAISE EXCEPTION 'production_criteria_not_approved' USING ERRCODE = 'P0001', HINT = 'criteria'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER real_acceptance_needs_approved_criteria BEFORE INSERT OR UPDATE ON vendor.engagement_acceptances FOR EACH ROW EXECUTE FUNCTION vendor.real_acceptance_needs_approved_criteria();
REVOKE ALL ON FUNCTION vendor.real_acceptance_needs_approved_criteria FROM PUBLIC;
