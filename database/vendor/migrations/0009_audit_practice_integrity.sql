-- Integrity rules for the audit practice that 0008 left to the application (task AUDIT-PRACTICE-01):
--
--   engagement configuration   use kind, criteria, methodology and the commercial and implementation
--                              owners are fixed once acceptance is decided;
--   engagement scope           the requirement list and period change only to match the latest approved
--                              scope version, never by a direct edit;
--   report binding             the snapshot and its digest are written in the same statement that records
--                              approval and never change afterwards, nor does the approved content;
--   favourable conclusions     MEETS needs a reviewed EFFECTIVE working paper on that requirement and no
--                              statutory finding still open on it.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;

CREATE FUNCTION vendor.engagement_practice_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE s record;
BEGIN
  IF (NEW.use_kind, NEW.criteria_version_id, NEW.methodology_id, NEW.commercial_owner_id, NEW.implementation_owner_id)
      IS DISTINCT FROM (OLD.use_kind, OLD.criteria_version_id, OLD.methodology_id, OLD.commercial_owner_id, OLD.implementation_owner_id)
     AND EXISTS (SELECT 1 FROM vendor.engagement_acceptances a WHERE a.engagement_id = NEW.id AND a.decision IS NOT NULL) THEN
    RAISE EXCEPTION 'engagement_configuration_fixed_after_acceptance' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
  IF (NEW.scope_requirement_ids, NEW.period_from, NEW.period_to) IS DISTINCT FROM (OLD.scope_requirement_ids, OLD.period_from, OLD.period_to) THEN
    SELECT * INTO s FROM vendor.scope_versions v WHERE v.engagement_id = NEW.id AND v.approved_by IS NOT NULL ORDER BY v.version DESC LIMIT 1;
    IF s IS NULL OR NEW.scope_requirement_ids IS DISTINCT FROM s.requirement_ids OR NEW.period_from IS DISTINCT FROM s.period_from OR NEW.period_to IS DISTINCT FROM s.period_to THEN
      RAISE EXCEPTION 'scope_changes_only_through_an_approved_scope_version' USING ERRCODE = 'P0001', HINT = 'scope'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER engagement_practice_guard BEFORE UPDATE ON vendor.engagements FOR EACH ROW EXECUTE FUNCTION vendor.engagement_practice_guard();

CREATE FUNCTION vendor.report_binding_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF (NEW.snapshot, NEW.approved_snapshot_digest) IS DISTINCT FROM (OLD.snapshot, OLD.approved_snapshot_digest) THEN
    IF OLD.approved_by IS NOT NULL OR NEW.approved_by IS NULL OR NEW.snapshot IS NULL OR NEW.approved_snapshot_digest IS NULL THEN
      RAISE EXCEPTION 'snapshot_is_bound_at_approval' USING ERRCODE = 'P0001', HINT = 'snapshot'; END IF;
  END IF;
  IF OLD.approved_by IS NOT NULL AND (NEW.opinion_as_of, NEW.method, NEW.opinion, NEW.limitations, NEW.executive_summary, NEW.supersedes_report_id, NEW.correction_reason, NEW.drafted_by)
      IS DISTINCT FROM (OLD.opinion_as_of, OLD.method, OLD.opinion, OLD.limitations, OLD.executive_summary, OLD.supersedes_report_id, OLD.correction_reason, OLD.drafted_by) THEN
    RAISE EXCEPTION 'approved_report_content_is_fixed' USING ERRCODE = 'P0001', HINT = 'report'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER report_binding_guard BEFORE UPDATE ON vendor.reports FOR EACH ROW EXECUTE FUNCTION vendor.report_binding_guard();

-- The latest version of a working paper for each procedure on a requirement.
CREATE FUNCTION vendor.requirement_supported(e uuid, req text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT EXISTS (
    SELECT 1 FROM vendor.procedures p
    JOIN LATERAL (SELECT * FROM vendor.working_papers w WHERE w.procedure_id = p.id ORDER BY w.version DESC LIMIT 1) w ON true
    WHERE p.engagement_id = e AND p.requirement_id = req AND p.retest_of_finding_id IS NULL AND w.conclusion = 'EFFECTIVE' AND w.reviewed_by IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM vendor.findings f WHERE f.engagement_id = e AND f.requirement_id = req AND f.status <> 'CLOSED' AND coalesce(f.criterion_type, 'STATUTORY') = 'STATUTORY') $$;
CREATE FUNCTION vendor.result_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NEW.result = 'MEETS' AND NOT vendor.requirement_supported(NEW.engagement_id, NEW.requirement_id) THEN
    RAISE EXCEPTION 'favourable_conclusion_needs_reviewed_effective_work_and_no_open_statutory_finding' USING ERRCODE = 'P0001', HINT = 'result'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER result_guard BEFORE INSERT ON vendor.requirement_results FOR EACH ROW EXECUTE FUNCTION vendor.result_guard();
GRANT EXECUTE ON FUNCTION vendor.requirement_supported(uuid, text) TO orvia_vendor_app;

-- A population is COMPLETE only against named completeness evidence; an auditor's seed proves the selection, never the population.
ALTER TABLE vendor.populations ADD COLUMN completeness_evidence_id uuid REFERENCES vendor.evidence(id);
ALTER TABLE vendor.populations ADD CONSTRAINT populations_complete_needs_evidence CHECK (completeness <> 'COMPLETE' OR completeness_evidence_id IS NOT NULL);

-- A signed report that a correction supersedes keeps its signed document: the old rule (a document exactly when SIGNED) made corrections impossible.
ALTER TABLE vendor.reports DROP CONSTRAINT reports_check2;
ALTER TABLE vendor.reports ADD CONSTRAINT reports_signed_document CHECK ((state <> 'SIGNED' OR signed_document_id IS NOT NULL) AND (signed_document_id IS NULL OR state IN ('SIGNED','SUPERSEDED')));
