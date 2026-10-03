-- Owner decision 2026-10-01 (revision 1.10, decision B; vendor contract 0.6.0): before production criteria are approved, the
-- approver sees the retained evidence (sources, hashes, signed package identity and open verification items) and records a
-- review reference and an acknowledgement bound to the digest of the open items shown. A signature proves the package came
-- from the release key; it does not prove that anyone checked the sources. The review reference is a human statement and is
-- recorded as one, never as system verification.
ALTER TABLE vendor.criteria_versions
  ADD COLUMN review_reference text CHECK (review_reference IS NULL OR length(btrim(review_reference)) BETWEEN 8 AND 500),
  ADD COLUMN acknowledged_open_items_digest text CHECK (acknowledged_open_items_digest IS NULL OR acknowledged_open_items_digest ~ '^[a-f0-9]{64}$');

-- Recorded content never changes; approval happens once; a production approval made from now on carries its review.
-- Rows approved before this migration keep their history and show their review as not recorded.
CREATE FUNCTION vendor.criteria_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF (NEW.id, NEW.version, NEW.distribution, NEW.sources, NEW.requirements, NEW.digest, NEW.recorded_by, NEW.created_at)
     IS DISTINCT FROM (OLD.id, OLD.version, OLD.distribution, OLD.sources, OLD.requirements, OLD.digest, OLD.recorded_by, OLD.created_at) THEN
    RAISE EXCEPTION 'criteria_content_is_immutable' USING ERRCODE = 'P0001', HINT = 'criteria'; END IF;
  IF OLD.approved_by IS NOT NULL AND (NEW.approved_by, NEW.approved_at, NEW.review_reference, NEW.acknowledged_open_items_digest)
     IS DISTINCT FROM (OLD.approved_by, OLD.approved_at, OLD.review_reference, OLD.acknowledged_open_items_digest) THEN
    RAISE EXCEPTION 'criteria_already_approved' USING ERRCODE = 'P0001', HINT = 'criteria'; END IF;
  IF OLD.approved_by IS NULL AND NEW.approved_by IS NOT NULL AND NEW.distribution = 'PRODUCTION'
     AND (NEW.review_reference IS NULL OR NEW.acknowledged_open_items_digest IS NULL) THEN
    RAISE EXCEPTION 'production_criteria_review_required' USING ERRCODE = 'P0001', HINT = 'review_reference'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vendor.criteria_version_guard() FROM PUBLIC;
CREATE TRIGGER criteria_version_guard BEFORE UPDATE ON vendor.criteria_versions FOR EACH ROW EXECUTE FUNCTION vendor.criteria_version_guard();
