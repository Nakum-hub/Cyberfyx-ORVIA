-- The evidence-based DPDPA audit practice on the vendor's VENDOR_SERVICE installation
-- (task AUDIT-PRACTICE-01). Builds on the engagement, evidence inbox, review,
-- findings and report tables of 0004 and the channel of 0006:
--
--   practice level   criteria versions (TEST_FIXTURE or PRODUCTION), risk
--                    methodology versions, real-use activation records;
--   acceptance       service type, objectives, users, responsibilities, terms,
--                    restrictions, competence; conflicts and prior work with
--                    safeguards; an independent acceptance decision;
--   planning         versioned understanding of the organisation, provision-level
--                    applicability, versioned scope with change impact, risk
--                    assessments, the work programme and its approval;
--   fieldwork        evidence register and evaluations, request lifecycle events,
--                    working papers with review notes, populations and samples;
--   outcomes         management responses, structured retests, risk acceptance,
--                    report snapshot binding and corrections, legal holds.
--
-- Separation of duties that must never depend on the application is enforced
-- here: the acceptance decider, the plan approver, working-paper reviewers and
-- retest reviewers are other people, and a commercial or implementation owner of
-- an engagement can never hold its review authority.
DO $$ BEGIN
  IF to_regnamespace('app') IS NOT NULL OR to_regnamespace('vendor_auth') IS NULL THEN RAISE EXCEPTION 'Wrong vendor boundary' USING ERRCODE = '42501'; END IF;
END $$;

-- ---------------------------------------------------------------- practice level
CREATE TABLE vendor.criteria_versions (
  id uuid PRIMARY KEY, version text NOT NULL CHECK (version ~ '^[0-9A-Za-z._-]{1,40}$'),
  distribution text NOT NULL CHECK (distribution IN ('TEST_FIXTURE','PRODUCTION')),
  sources jsonb NOT NULL, requirements jsonb NOT NULL, digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  recorded_by uuid NOT NULL, approved_by uuid, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (version, distribution),
  CHECK (approved_by IS NULL OR approved_by <> recorded_by),
  CHECK ((approved_by IS NULL) = (approved_at IS NULL)),
  CHECK (distribution = 'TEST_FIXTURE' OR approved_by IS NOT NULL));
CREATE TABLE vendor.methodologies (
  id uuid PRIMARY KEY, version text NOT NULL UNIQUE CHECK (version ~ '^[0-9A-Za-z._-]{1,40}$'),
  likelihood_scale jsonb NOT NULL, impact_scale jsonb NOT NULL, matrix jsonb NOT NULL, severity_rules text NOT NULL CHECK (length(severity_rules) BETWEEN 20 AND 8000),
  factors jsonb NOT NULL, digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  recorded_by uuid NOT NULL, approved_by uuid, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (approved_by IS NULL OR approved_by <> recorded_by), CHECK ((approved_by IS NULL) = (approved_at IS NULL)));
-- Evidence that the practice may take a real client: each gate recorded by a super administrator with its reference.
CREATE TABLE vendor.practice_activations (
  id uuid PRIMARY KEY, gate text NOT NULL CHECK (gate IN ('LEGAL_REVIEW_ENGAGEMENT_LETTER','LEGAL_REVIEW_PROCESSING_AGREEMENT','PRODUCTION_CRITERIA','PRODUCTION_AUDIT_KEY')),
  reference text NOT NULL CHECK (length(reference) BETWEEN 3 AND 300), recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER criteria_versions_immutable BEFORE DELETE ON vendor.criteria_versions FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER methodologies_immutable BEFORE DELETE ON vendor.methodologies FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER practice_activations_immutable BEFORE UPDATE OR DELETE ON vendor.practice_activations FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE FUNCTION vendor.practice_gates_missing() RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT coalesce(array_agg(g ORDER BY g), '{}') FROM unnest(ARRAY['LEGAL_REVIEW_ENGAGEMENT_LETTER','LEGAL_REVIEW_PROCESSING_AGREEMENT','PRODUCTION_CRITERIA','PRODUCTION_AUDIT_KEY']) g
  WHERE NOT EXISTS (SELECT 1 FROM vendor.practice_activations a WHERE a.gate = g) $$;

-- ---------------------------------------------------------------- acceptance and independence
ALTER TABLE vendor.engagements
  ADD COLUMN use_kind text NOT NULL DEFAULT 'SYNTHETIC' CHECK (use_kind IN ('SYNTHETIC','REAL')),
  ADD COLUMN criteria_version_id uuid REFERENCES vendor.criteria_versions(id),
  ADD COLUMN methodology_id uuid REFERENCES vendor.methodologies(id),
  ADD COLUMN commercial_owner_id uuid, ADD COLUMN implementation_owner_id uuid;
CREATE TABLE vendor.engagement_acceptances (
  engagement_id uuid PRIMARY KEY REFERENCES vendor.engagements(id),
  service_type text NOT NULL CHECK (service_type IN ('READINESS_ADVISORY','EVIDENCE_AUDIT','STATUTORY_SDF_AUDIT_CLAIM')),
  objectives text NOT NULL CHECK (length(objectives) BETWEEN 10 AND 4000), intended_users text NOT NULL CHECK (length(intended_users) BETWEEN 3 AND 2000),
  client_responsibilities text NOT NULL CHECK (length(client_responsibilities) BETWEEN 10 AND 4000), auditor_responsibilities text NOT NULL CHECK (length(auditor_responsibilities) BETWEEN 10 AND 4000),
  confidentiality text NOT NULL CHECK (length(confidentiality) BETWEEN 10 AND 4000), evidence_handling text NOT NULL CHECK (length(evidence_handling) BETWEEN 10 AND 4000),
  scope_restrictions text CHECK (scope_restrictions IS NULL OR length(scope_restrictions) <= 4000), competence text NOT NULL CHECK (length(competence) BETWEEN 10 AND 4000),
  sdf_applicability_basis text CHECK (sdf_applicability_basis IS NULL OR length(sdf_applicability_basis) BETWEEN 10 AND 4000),
  eligibility_evidence text CHECK (eligibility_evidence IS NULL OR length(eligibility_evidence) BETWEEN 10 AND 4000),
  licence_independence boolean NOT NULL CHECK (licence_independence),
  prepared_by uuid NOT NULL, prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  decision text CHECK (decision IN ('ACCEPTED','DECLINED')), decided_by uuid, decided_at timestamptz, decision_rationale text CHECK (decision_rationale IS NULL OR length(decision_rationale) BETWEEN 10 AND 4000),
  CHECK ((decision IS NULL) = (decided_by IS NULL) AND (decided_by IS NULL) = (decided_at IS NULL) AND (decided_at IS NULL) = (decision_rationale IS NULL)),
  CHECK (service_type <> 'STATUTORY_SDF_AUDIT_CLAIM' OR (sdf_applicability_basis IS NOT NULL AND eligibility_evidence IS NOT NULL)));
CREATE TABLE vendor.engagement_conflicts (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id),
  kind text NOT NULL CHECK (kind IN ('PRIOR_IMPLEMENTATION','PRIOR_CONSULTING','COMMERCIAL_RELATIONSHIP','PERSONAL_RELATIONSHIP','FINANCIAL_INTEREST','OTHER')),
  person_id uuid, description text NOT NULL CHECK (length(description) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','SAFEGUARDED','DISQUALIFYING')),
  safeguard text CHECK (safeguard IS NULL OR length(safeguard) BETWEEN 10 AND 4000), reviewed_by uuid, reviewed_at timestamptz,
  recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (status = 'OPEN' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK (status <> 'SAFEGUARDED' OR safeguard IS NOT NULL),
  CHECK (reviewed_by IS NULL OR (reviewed_by <> recorded_by AND reviewed_by IS DISTINCT FROM person_id)));

CREATE FUNCTION vendor.engagement_accepted(e uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT EXISTS (SELECT 1 FROM vendor.engagement_acceptances a WHERE a.engagement_id = e AND a.decision = 'ACCEPTED') $$;
-- People who can never hold independent review authority on this engagement: its commercial and implementation owners,
-- and anyone with a prior-implementation, prior-consulting or commercial conflict recorded against them.
CREATE FUNCTION vendor.review_barred(e uuid, p uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT EXISTS (SELECT 1 FROM vendor.engagements x WHERE x.id = e AND (x.commercial_owner_id = p OR x.implementation_owner_id = p))
      OR EXISTS (SELECT 1 FROM vendor.engagement_conflicts c WHERE c.engagement_id = e AND c.person_id = p AND c.status <> 'SAFEGUARDED' OR
                 c.engagement_id = e AND c.person_id = p AND c.kind IN ('PRIOR_IMPLEMENTATION','PRIOR_CONSULTING','COMMERCIAL_RELATIONSHIP')) $$;
CREATE FUNCTION vendor.acceptance_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e record;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.decision IS NOT NULL THEN RAISE EXCEPTION 'acceptance_decided' USING ERRCODE = 'P0001', HINT = 'acceptance'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.service_type, NEW.objectives, NEW.intended_users, NEW.client_responsibilities, NEW.auditor_responsibilities, NEW.confidentiality, NEW.evidence_handling, NEW.scope_restrictions,
      NEW.competence, NEW.sdf_applicability_basis, NEW.eligibility_evidence, NEW.prepared_by) IS DISTINCT FROM (OLD.service_type, OLD.objectives, OLD.intended_users, OLD.client_responsibilities,
      OLD.auditor_responsibilities, OLD.confidentiality, OLD.evidence_handling, OLD.scope_restrictions, OLD.competence, OLD.sdf_applicability_basis, OLD.eligibility_evidence, OLD.prepared_by)
    THEN RAISE EXCEPTION 'acceptance_terms_are_fixed_once_prepared' USING ERRCODE = 'P0001', HINT = 'acceptance'; END IF;
  IF NEW.decision IS NOT NULL THEN
    SELECT * INTO e FROM vendor.engagements WHERE id = NEW.engagement_id;
    IF NEW.decided_by IS DISTINCT FROM vendor.actor() OR NOT vendor.has_capability('engagement.accept') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    IF NEW.decided_by = NEW.prepared_by THEN RAISE EXCEPTION 'decider_must_differ_from_preparer' USING ERRCODE = 'P0001', HINT = 'decided_by'; END IF;
    IF vendor.review_barred(NEW.engagement_id, NEW.decided_by) THEN RAISE EXCEPTION 'decider_holds_a_commercial_or_implementation_role_or_conflict' USING ERRCODE = 'P0001', HINT = 'decided_by'; END IF;
    IF EXISTS (SELECT 1 FROM vendor.engagement_team t WHERE t.engagement_id = NEW.engagement_id AND t.user_id = NEW.decided_by AND t.engagement_role = 'LEAD') THEN
      RAISE EXCEPTION 'decider_must_not_lead_the_engagement' USING ERRCODE = 'P0001', HINT = 'decided_by'; END IF;
    IF NEW.decision = 'ACCEPTED' THEN
      IF EXISTS (SELECT 1 FROM vendor.engagement_conflicts c WHERE c.engagement_id = NEW.engagement_id AND c.status IN ('OPEN','DISQUALIFYING')) THEN
        RAISE EXCEPTION 'open_or_disqualifying_conflict' USING ERRCODE = 'P0001', HINT = 'conflicts'; END IF;
      IF e.criteria_version_id IS NULL OR e.methodology_id IS NULL THEN RAISE EXCEPTION 'criteria_and_methodology_required' USING ERRCODE = 'P0001', HINT = 'engagement'; END IF;
      IF NOT EXISTS (SELECT 1 FROM vendor.methodologies m WHERE m.id = e.methodology_id AND m.approved_by IS NOT NULL) THEN RAISE EXCEPTION 'methodology_not_approved' USING ERRCODE = 'P0001', HINT = 'methodology'; END IF;
      IF e.use_kind = 'REAL' AND cardinality(vendor.practice_gates_missing()) > 0 THEN RAISE EXCEPTION 'practice_not_activated_for_real_engagements' USING ERRCODE = 'P0001', HINT = 'use_kind'; END IF;
      IF e.use_kind = 'REAL' AND NOT EXISTS (SELECT 1 FROM vendor.criteria_versions v WHERE v.id = e.criteria_version_id AND v.distribution = 'PRODUCTION') THEN
        RAISE EXCEPTION 'real_engagement_needs_production_criteria' USING ERRCODE = 'P0001', HINT = 'criteria'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER acceptance_guard BEFORE INSERT OR UPDATE ON vendor.engagement_acceptances FOR EACH ROW EXECUTE FUNCTION vendor.acceptance_guard();
CREATE TRIGGER acceptances_no_delete BEFORE DELETE ON vendor.engagement_acceptances FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
-- Review authority on a team is never held by a commercial or implementation owner, or by someone with such a conflict.
CREATE FUNCTION vendor.team_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF NEW.engagement_role = 'REVIEWER' AND vendor.review_barred(NEW.engagement_id, NEW.user_id) THEN
    RAISE EXCEPTION 'reviewer_holds_a_commercial_or_implementation_role_or_conflict' USING ERRCODE = 'P0001', HINT = 'user_id'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER team_guard BEFORE INSERT OR UPDATE ON vendor.engagement_team FOR EACH ROW EXECUTE FUNCTION vendor.team_guard();
-- A conflict recorded later against a sitting reviewer is refused until the reviewer is replaced.
CREATE FUNCTION vendor.conflict_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.kind, NEW.person_id, NEW.description, NEW.recorded_by) IS DISTINCT FROM (OLD.kind, OLD.person_id, OLD.description, OLD.recorded_by) THEN
    RAISE EXCEPTION 'conflict_facts_are_fixed' USING ERRCODE = 'P0001', HINT = 'conflict'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by AND NEW.reviewed_by IS DISTINCT FROM vendor.actor() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.reviewed_by IS NOT NULL AND NOT vendor.has_capability('engagement.accept') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER conflict_guard BEFORE UPDATE ON vendor.engagement_conflicts FOR EACH ROW EXECUTE FUNCTION vendor.conflict_guard();
CREATE TRIGGER conflicts_no_delete BEFORE DELETE ON vendor.engagement_conflicts FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();

-- ---------------------------------------------------------------- understanding, applicability, scope, risk, plan
CREATE TABLE vendor.understanding_versions (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), version integer NOT NULL CHECK (version >= 1),
  content jsonb NOT NULL, redactions integer NOT NULL DEFAULT 0, prepared_by uuid NOT NULL, prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reviewed_by uuid, reviewed_at timestamptz, UNIQUE (engagement_id, version),
  CHECK (reviewed_by IS NULL OR reviewed_by <> prepared_by), CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)));
CREATE TABLE vendor.applicability_decisions (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), criteria_version_id uuid NOT NULL REFERENCES vendor.criteria_versions(id),
  requirement_id text NOT NULL, provision_ids text[] NOT NULL DEFAULT '{}', criterion_type text NOT NULL CHECK (criterion_type IN ('STATUTORY','CONTRACTUAL','ADVISORY')),
  applicability text NOT NULL CHECK (applicability IN ('APPLICABLE','NOT_APPLICABLE','UNRESOLVED')), effective_from date,
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 10 AND 4000), evidence_refs text[] NOT NULL DEFAULT '{}',
  unresolved_question text CHECK (unresolved_question IS NULL OR length(unresolved_question) BETWEEN 10 AND 2000),
  decided_by uuid NOT NULL, decided_at timestamptz NOT NULL DEFAULT clock_timestamp(), reviewed_by uuid, reviewed_at timestamptz,
  CHECK ((applicability = 'UNRESOLVED') = (unresolved_question IS NOT NULL)),
  CHECK (reviewed_by IS NULL OR reviewed_by <> decided_by), CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)));
CREATE TABLE vendor.scope_versions (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), version integer NOT NULL CHECK (version >= 1),
  entities text[] NOT NULL, processes text[] NOT NULL, systems text[] NOT NULL, locations text[] NOT NULL,
  period_from date NOT NULL, period_to date NOT NULL CHECK (period_to >= period_from), requirement_ids text[] NOT NULL CHECK (cardinality(requirement_ids) BETWEEN 1 AND 200),
  exclusions text[] NOT NULL DEFAULT '{}', limitations text[] NOT NULL DEFAULT '{}',
  change_reason text CHECK (change_reason IS NULL OR length(change_reason) BETWEEN 10 AND 4000), impact_assessment text CHECK (impact_assessment IS NULL OR length(impact_assessment) BETWEEN 10 AND 4000),
  prepared_by uuid NOT NULL, prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(), approved_by uuid, approved_at timestamptz,
  UNIQUE (engagement_id, version),
  CHECK (version = 1 OR (change_reason IS NOT NULL AND impact_assessment IS NOT NULL)),
  CHECK (approved_by IS NULL OR approved_by <> prepared_by), CHECK ((approved_by IS NULL) = (approved_at IS NULL)));
CREATE TABLE vendor.risk_assessments (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), methodology_id uuid NOT NULL REFERENCES vendor.methodologies(id),
  requirement_id text NOT NULL, risk text NOT NULL CHECK (length(risk) BETWEEN 10 AND 2000),
  likelihood integer NOT NULL CHECK (likelihood BETWEEN 1 AND 5), impact integer NOT NULL CHECK (impact BETWEEN 1 AND 5),
  affected_people text NOT NULL CHECK (length(affected_people) BETWEEN 3 AND 1000), affected_scope text NOT NULL CHECK (length(affected_scope) BETWEEN 3 AND 1000),
  duration text NOT NULL CHECK (length(duration) BETWEEN 3 AND 500), uncertainty text NOT NULL CHECK (length(uncertainty) BETWEEN 3 AND 1000),
  control_reference text CHECK (control_reference IS NULL OR length(control_reference) <= 300),
  control_effectiveness text NOT NULL CHECK (control_effectiveness IN ('NOT_ASSESSED','EFFECTIVE','PARTIALLY_EFFECTIVE','INEFFECTIVE')),
  inherent_rating text NOT NULL CHECK (inherent_rating IN ('LOW','MEDIUM','HIGH','CRITICAL')), residual_rating text NOT NULL CHECK (residual_rating IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 10 AND 4000),
  assessed_by uuid NOT NULL, assessed_at timestamptz NOT NULL DEFAULT clock_timestamp(), reviewed_by uuid, reviewed_at timestamptz,
  CHECK (reviewed_by IS NULL OR reviewed_by <> assessed_by), CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)));
CREATE TABLE vendor.procedures (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), requirement_id text NOT NULL, provision_ids text[] NOT NULL DEFAULT '{}',
  risk_assessment_id uuid REFERENCES vendor.risk_assessments(id), control_reference text CHECK (control_reference IS NULL OR length(control_reference) <= 300),
  objective text NOT NULL CHECK (length(objective) BETWEEN 10 AND 2000),
  procedure_type text NOT NULL CHECK (procedure_type IN ('INSPECTION','OBSERVATION','WALKTHROUGH','INQUIRY','RECONCILIATION','REPERFORMANCE','ANALYTICAL')),
  test_nature text NOT NULL CHECK (test_nature IN ('DESIGN','IMPLEMENTATION','OPERATING_EFFECTIVENESS')), requires_record_level boolean NOT NULL,
  owner_id uuid NOT NULL, planned_start date NOT NULL, planned_end date NOT NULL CHECK (planned_end >= planned_start), depends_on uuid[] NOT NULL DEFAULT '{}',
  evidence_expectation text NOT NULL CHECK (length(evidence_expectation) BETWEEN 10 AND 2000), completion_criteria text NOT NULL CHECK (length(completion_criteria) BETWEEN 10 AND 2000),
  retest_of_finding_id uuid, state text NOT NULL DEFAULT 'PLANNED' CHECK (state IN ('PLANNED','IN_PROGRESS','COMPLETED','NOT_PERFORMED')),
  not_performed_reason text CHECK (not_performed_reason IS NULL OR length(not_performed_reason) BETWEEN 10 AND 2000),
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((state = 'NOT_PERFORMED') = (not_performed_reason IS NOT NULL)));
CREATE TABLE vendor.plan_approvals (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), procedures_digest text NOT NULL CHECK (procedures_digest ~ '^[a-f0-9]{64}$'),
  prepared_by uuid NOT NULL, approved_by uuid NOT NULL, approved_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK (approved_by <> prepared_by));

-- ---------------------------------------------------------------- evidence, requests, working papers, sampling
CREATE TABLE vendor.evidence (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id),
  source text NOT NULL CHECK (source IN ('PACKAGE_ITEM','CHANNEL_ENTRY','AUDITOR_RECORD')),
  package_id uuid, item_id uuid, delivery_id uuid, entry_key text,
  evidence_type text NOT NULL CHECK (evidence_type IN ('MANAGEMENT_ASSERTION','DOCUMENT','SYSTEM_GENERATED','OBSERVATION','REPERFORMANCE','INDEPENDENT_CORROBORATION')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 300), description text CHECK (description IS NULL OR length(description) <= 4000), redactions integer NOT NULL DEFAULT 0,
  period_from timestamptz, period_to timestamptz, collection_method text NOT NULL CHECK (length(collection_method) BETWEEN 3 AND 500),
  collected_at timestamptz NOT NULL, valid_until timestamptz, sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'), provenance text NOT NULL CHECK (length(provenance) BETWEEN 3 AND 1000),
  registered_by uuid NOT NULL, registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((source = 'PACKAGE_ITEM') = (package_id IS NOT NULL AND item_id IS NOT NULL)),
  CHECK ((source = 'CHANNEL_ENTRY') = (delivery_id IS NOT NULL)),
  CHECK (source <> 'AUDITOR_RECORD' OR evidence_type IN ('OBSERVATION','REPERFORMANCE','INDEPENDENT_CORROBORATION','MANAGEMENT_ASSERTION')));
CREATE UNIQUE INDEX evidence_package_item_once ON vendor.evidence(engagement_id, package_id, item_id) WHERE source = 'PACKAGE_ITEM';
CREATE UNIQUE INDEX evidence_channel_entry_once ON vendor.evidence(engagement_id, delivery_id, entry_key) WHERE source = 'CHANNEL_ENTRY';
CREATE TABLE vendor.evidence_evaluations (
  id uuid PRIMARY KEY, evidence_id uuid NOT NULL REFERENCES vendor.evidence(id), procedure_id uuid NOT NULL REFERENCES vendor.procedures(id),
  relevance text NOT NULL CHECK (relevance IN ('RELEVANT','PARTIALLY_RELEVANT','NOT_RELEVANT')), reliability text NOT NULL CHECK (reliability IN ('HIGH','MEDIUM','LOW')),
  sufficiency text NOT NULL CHECK (sufficiency IN ('SUFFICIENT','INSUFFICIENT')), contradicts boolean NOT NULL,
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 10 AND 2000), evaluated_by uuid NOT NULL, evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp());
ALTER TABLE vendor.audit_requests
  ADD COLUMN procedure_id uuid REFERENCES vendor.procedures(id), ADD COLUMN owner_role text CHECK (owner_role IS NULL OR length(owner_role) BETWEEN 2 AND 120),
  ADD COLUMN status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLARIFICATION_REQUESTED','RESPONDED','ACCEPTED','RESUBMISSION_REQUESTED','UNABLE_TO_OBTAIN','WITHDRAWN')),
  ADD COLUMN escalated_at timestamptz;
CREATE TABLE vendor.request_events (
  id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES vendor.audit_requests(id),
  event text NOT NULL CHECK (event IN ('CLARIFICATION_REQUESTED','CLARIFICATION_GIVEN','RESPONSE_RECEIVED','ACCEPTED','RESUBMISSION_REQUESTED','UNABLE_TO_OBTAIN','ESCALATED','WITHDRAWN')),
  note text NOT NULL CHECK (length(note) BETWEEN 3 AND 4000), redactions integer NOT NULL DEFAULT 0, evidence_id uuid REFERENCES vendor.evidence(id),
  actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE vendor.populations (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), procedure_id uuid NOT NULL REFERENCES vendor.procedures(id),
  definition text NOT NULL CHECK (length(definition) BETWEEN 10 AND 2000), source text NOT NULL CHECK (length(source) BETWEEN 3 AND 1000),
  source_kind text NOT NULL CHECK (source_kind IN ('CHANNEL_SAMPLE','CLIENT_LISTING','PACKAGE_ITEM','AUDITOR_OBSERVED')),
  period_from date, period_to date, population_size integer CHECK (population_size IS NULL OR population_size >= 0),
  completeness text NOT NULL CHECK (completeness IN ('COMPLETE','INCOMPLETE','UNVERIFIED')), completeness_basis text NOT NULL CHECK (length(completeness_basis) BETWEEN 10 AND 2000),
  sample_method text NOT NULL CHECK (sample_method IN ('SEEDED_RANDOM','JUDGEMENTAL','ALL_ITEMS')), sample_size integer NOT NULL CHECK (sample_size >= 0),
  size_rationale text NOT NULL CHECK (length(size_rationale) BETWEEN 10 AND 2000), selection_digest text, seed text, exclusions text CHECK (exclusions IS NULL OR length(exclusions) <= 2000),
  tested integer NOT NULL CHECK (tested >= 0), passed integer NOT NULL CHECK (passed >= 0), exceptions integer NOT NULL CHECK (exceptions >= 0),
  evidence_id uuid REFERENCES vendor.evidence(id), recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (passed + exceptions = tested), CHECK (tested <= sample_size), CHECK (population_size IS NULL OR sample_size <= population_size),
  CHECK (sample_method <> 'SEEDED_RANDOM' OR seed IS NOT NULL));
CREATE TABLE vendor.working_papers (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), procedure_id uuid NOT NULL REFERENCES vendor.procedures(id), version integer NOT NULL CHECK (version >= 1),
  performed text NOT NULL CHECK (length(performed) BETWEEN 10 AND 8000), criteria text NOT NULL CHECK (length(criteria) BETWEEN 3 AND 2000),
  population_id uuid REFERENCES vendor.populations(id), results text NOT NULL CHECK (length(results) BETWEEN 3 AND 8000),
  exceptions integer NOT NULL DEFAULT 0 CHECK (exceptions >= 0), exception_details text CHECK (exception_details IS NULL OR length(exception_details) <= 8000),
  conclusion text NOT NULL CHECK (conclusion IN ('EFFECTIVE','EXCEPTIONS_NOTED','INEFFECTIVE','NOT_TESTED','UNABLE_TO_TEST')),
  evidence_ids uuid[] NOT NULL DEFAULT '{}', redactions integer NOT NULL DEFAULT 0, digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  prepared_by uuid NOT NULL, prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reviewed_by uuid, reviewed_at timestamptz, UNIQUE (procedure_id, version),
  CHECK (reviewed_by IS NULL OR reviewed_by <> prepared_by), CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)),
  CHECK (exceptions = 0 OR exception_details IS NOT NULL), CHECK (conclusion <> 'EFFECTIVE' OR cardinality(evidence_ids) > 0));
CREATE TABLE vendor.review_notes (
  id uuid PRIMARY KEY, working_paper_id uuid NOT NULL REFERENCES vendor.working_papers(id), note text NOT NULL CHECK (length(note) BETWEEN 3 AND 4000),
  raised_by uuid NOT NULL, raised_at timestamptz NOT NULL DEFAULT clock_timestamp(), response text CHECK (response IS NULL OR length(response) BETWEEN 3 AND 4000),
  resolved_by uuid, resolved_at timestamptz, CHECK ((resolved_by IS NULL) = (resolved_at IS NULL)), CHECK (resolved_by IS NULL OR response IS NOT NULL));

-- ---------------------------------------------------------------- findings, responses, retests, acceptance of risk
ALTER TABLE vendor.findings
  ADD COLUMN affected_scope text CHECK (affected_scope IS NULL OR length(affected_scope) <= 2000), ADD COLUMN cause text CHECK (cause IS NULL OR length(cause) <= 4000),
  ADD COLUMN consequence text CHECK (consequence IS NULL OR length(consequence) <= 4000), ADD COLUMN severity_rationale text CHECK (severity_rationale IS NULL OR length(severity_rationale) <= 4000),
  ADD COLUMN methodology_id uuid REFERENCES vendor.methodologies(id), ADD COLUMN working_paper_ids uuid[] NOT NULL DEFAULT '{}', ADD COLUMN evidence_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN criterion_type text CHECK (criterion_type IN ('STATUTORY','CONTRACTUAL','ADVISORY')), ADD COLUMN orvia_guidance text CHECK (orvia_guidance IS NULL OR length(orvia_guidance) <= 4000),
  ADD COLUMN closure_type text CHECK (closure_type IN ('VERIFIED_REMEDIATION','RISK_ACCEPTED','ENGAGEMENT_WITHDRAWN','ADMINISTRATIVE')),
  ADD COLUMN closure_reason text CHECK (closure_reason IS NULL OR length(closure_reason) BETWEEN 10 AND 2000), ADD COLUMN closed_by uuid, ADD COLUMN closed_at timestamptz;
ALTER TABLE vendor.findings ADD CONSTRAINT findings_closure_consistent CHECK ((status = 'CLOSED') = (closure_type IS NOT NULL) AND (closure_type IS NULL) = (closed_at IS NULL));
CREATE TABLE vendor.management_responses (
  id uuid PRIMARY KEY, finding_id uuid NOT NULL REFERENCES vendor.findings(id), source text NOT NULL CHECK (source IN ('CHANNEL','RECORDED_BY_AUDITOR')),
  factual_accuracy text NOT NULL CHECK (factual_accuracy IN ('AGREED','DISPUTED')), agreement text NOT NULL CHECK (agreement IN ('AGREE','PARTIALLY_AGREE','DISAGREE')),
  response text NOT NULL CHECK (length(response) BETWEEN 3 AND 4000), action_plan text CHECK (action_plan IS NULL OR length(action_plan) <= 4000),
  owner_role text CHECK (owner_role IS NULL OR length(owner_role) BETWEEN 2 AND 120), due_date date, dependencies text CHECK (dependencies IS NULL OR length(dependencies) <= 2000),
  remediation_status text NOT NULL CHECK (remediation_status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED_CLAIMED','RISK_ACCEPTANCE_PROPOSED')),
  risk_acceptance jsonb, reference text CHECK (reference IS NULL OR length(reference) <= 300), signed jsonb, digest text,
  recorded_by uuid, received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (source <> 'RECORDED_BY_AUDITOR' OR (recorded_by IS NOT NULL AND reference IS NOT NULL)), CHECK (source <> 'CHANNEL' OR (signed IS NOT NULL AND digest IS NOT NULL)));
CREATE UNIQUE INDEX management_responses_digest_once ON vendor.management_responses(digest) WHERE digest IS NOT NULL;
CREATE TABLE vendor.retests (
  id uuid PRIMARY KEY, finding_id uuid NOT NULL REFERENCES vendor.findings(id), working_paper_id uuid NOT NULL REFERENCES vendor.working_papers(id),
  evidence_ids uuid[] NOT NULL CHECK (cardinality(evidence_ids) > 0), result text NOT NULL CHECK (result IN ('PASSED','FAILED')),
  performed_by uuid NOT NULL, reviewed_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK (reviewed_by <> performed_by));
CREATE TABLE vendor.risk_acceptances (
  id uuid PRIMARY KEY, finding_id uuid NOT NULL REFERENCES vendor.findings(id), management_response_id uuid NOT NULL REFERENCES vendor.management_responses(id),
  accepting_authority text NOT NULL CHECK (length(accepting_authority) BETWEEN 3 AND 300), justification text NOT NULL CHECK (length(justification) BETWEEN 20 AND 4000),
  expires_on date NOT NULL, review_on date NOT NULL, recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK (review_on <= expires_on));

-- ---------------------------------------------------------------- report binding and holds
ALTER TABLE vendor.reports
  ADD COLUMN executive_summary text CHECK (executive_summary IS NULL OR length(executive_summary) <= 8000),
  ADD COLUMN snapshot jsonb, ADD COLUMN approved_snapshot_digest text CHECK (approved_snapshot_digest IS NULL OR approved_snapshot_digest ~ '^[a-f0-9]{64}$'),
  ADD COLUMN supersedes_report_id uuid REFERENCES vendor.reports(id), ADD COLUMN correction_reason text CHECK (correction_reason IS NULL OR length(correction_reason) BETWEEN 10 AND 2000);
CREATE TABLE vendor.legal_holds (
  id uuid PRIMARY KEY, engagement_id uuid NOT NULL REFERENCES vendor.engagements(id), reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 2000),
  authorised_by uuid NOT NULL, authorised_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_on date,
  released_by uuid, released_at timestamptz, release_reason text CHECK (release_reason IS NULL OR length(release_reason) BETWEEN 10 AND 2000),
  CHECK ((released_by IS NULL) = (released_at IS NULL) AND (released_at IS NULL) = (release_reason IS NULL)));

-- Separation of duties for reviews and approvals, checked against the bound actor.
CREATE FUNCTION vendor.independent_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE reviewer uuid; eng uuid;
BEGIN
  IF TG_TABLE_NAME = 'working_papers' THEN
    IF TG_OP = 'UPDATE' AND (NEW.performed, NEW.criteria, NEW.population_id, NEW.results, NEW.exceptions, NEW.exception_details, NEW.conclusion, NEW.evidence_ids, NEW.digest, NEW.prepared_by)
        IS DISTINCT FROM (OLD.performed, OLD.criteria, OLD.population_id, OLD.results, OLD.exceptions, OLD.exception_details, OLD.conclusion, OLD.evidence_ids, OLD.digest, OLD.prepared_by)
      THEN RAISE EXCEPTION 'working_paper_versions_are_immutable' USING ERRCODE = 'P0001', HINT = 'working_paper'; END IF;
    IF TG_OP = 'UPDATE' AND OLD.reviewed_by IS NOT NULL THEN RAISE EXCEPTION 'working_paper_already_reviewed' USING ERRCODE = 'P0001', HINT = 'working_paper'; END IF;
    reviewer := NEW.reviewed_by; eng := NEW.engagement_id;
    IF reviewer IS NOT NULL AND EXISTS (SELECT 1 FROM vendor.review_notes n WHERE n.working_paper_id = NEW.id AND n.resolved_at IS NULL) THEN
      RAISE EXCEPTION 'open_review_notes' USING ERRCODE = 'P0001', HINT = 'review_notes'; END IF;
  ELSIF TG_TABLE_NAME = 'plan_approvals' THEN reviewer := NEW.approved_by; eng := NEW.engagement_id;
  ELSIF TG_TABLE_NAME = 'retests' THEN reviewer := NEW.reviewed_by; SELECT engagement_id INTO eng FROM vendor.findings WHERE id = NEW.finding_id;
  ELSE reviewer := NEW.reviewed_by; eng := NEW.engagement_id; END IF;
  IF reviewer IS NOT NULL THEN
    IF reviewer IS DISTINCT FROM vendor.actor() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    IF NOT vendor.on_team(eng, 'REVIEWER') THEN RAISE EXCEPTION 'engagement_reviewer_required' USING ERRCODE = 'P0001', HINT = 'reviewed_by'; END IF;
    IF vendor.review_barred(eng, reviewer) THEN RAISE EXCEPTION 'reviewer_holds_a_commercial_or_implementation_role_or_conflict' USING ERRCODE = 'P0001', HINT = 'reviewed_by'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER review_guard BEFORE INSERT OR UPDATE ON vendor.working_papers FOR EACH ROW EXECUTE FUNCTION vendor.independent_review_guard();
CREATE TRIGGER review_guard BEFORE INSERT ON vendor.plan_approvals FOR EACH ROW EXECUTE FUNCTION vendor.independent_review_guard();
CREATE TRIGGER review_guard BEFORE INSERT ON vendor.retests FOR EACH ROW EXECUTE FUNCTION vendor.independent_review_guard();
CREATE TRIGGER review_guard BEFORE INSERT OR UPDATE ON vendor.understanding_versions FOR EACH ROW EXECUTE FUNCTION vendor.independent_review_guard();
CREATE TRIGGER review_guard BEFORE INSERT OR UPDATE ON vendor.applicability_decisions FOR EACH ROW EXECUTE FUNCTION vendor.independent_review_guard();
CREATE TRIGGER review_guard BEFORE INSERT OR UPDATE ON vendor.risk_assessments FOR EACH ROW EXECUTE FUNCTION vendor.independent_review_guard();
-- Scope approval: the engagement reviewer, someone other than the preparer.
CREATE FUNCTION vendor.scope_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.approved_by IS NOT NULL THEN RAISE EXCEPTION 'scope_version_approved' USING ERRCODE = 'P0001', HINT = 'scope'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.entities, NEW.processes, NEW.systems, NEW.locations, NEW.period_from, NEW.period_to, NEW.requirement_ids, NEW.exclusions, NEW.limitations, NEW.prepared_by)
      IS DISTINCT FROM (OLD.entities, OLD.processes, OLD.systems, OLD.locations, OLD.period_from, OLD.period_to, OLD.requirement_ids, OLD.exclusions, OLD.limitations, OLD.prepared_by)
    THEN RAISE EXCEPTION 'scope_versions_are_immutable' USING ERRCODE = 'P0001', HINT = 'scope'; END IF;
  IF NEW.approved_by IS NOT NULL THEN
    IF NEW.approved_by IS DISTINCT FROM vendor.actor() OR NOT vendor.on_team(NEW.engagement_id, 'REVIEWER') OR vendor.review_barred(NEW.engagement_id, NEW.approved_by) THEN
      RAISE EXCEPTION 'engagement_reviewer_required' USING ERRCODE = 'P0001', HINT = 'approved_by'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER scope_guard BEFORE INSERT OR UPDATE ON vendor.scope_versions FOR EACH ROW EXECUTE FUNCTION vendor.scope_guard();
-- A finding reaches RETEST_PASSED only through a reviewed passing retest, and closes as verified remediation only after one.
CREATE FUNCTION vendor.finding_status_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE latest record;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.closure_type IS DISTINCT FROM OLD.closure_type THEN
    SELECT * INTO latest FROM vendor.retests WHERE finding_id = NEW.id ORDER BY recorded_at DESC, id DESC LIMIT 1;
    IF NEW.status = 'RETEST_PASSED' AND (latest IS NULL OR latest.result <> 'PASSED') THEN RAISE EXCEPTION 'retest_passed_requires_a_reviewed_passing_retest' USING ERRCODE = 'P0001', HINT = 'status'; END IF;
    IF NEW.status = 'RETEST_FAILED' AND (latest IS NULL OR latest.result <> 'FAILED') THEN RAISE EXCEPTION 'retest_failed_requires_a_recorded_failing_retest' USING ERRCODE = 'P0001', HINT = 'status'; END IF;
    IF NEW.closure_type = 'VERIFIED_REMEDIATION' AND (latest IS NULL OR latest.result <> 'PASSED') THEN RAISE EXCEPTION 'verified_remediation_requires_a_passing_retest' USING ERRCODE = 'P0001', HINT = 'closure_type'; END IF;
    IF NEW.closure_type = 'RISK_ACCEPTED' AND NOT EXISTS (SELECT 1 FROM vendor.risk_acceptances a WHERE a.finding_id = NEW.id AND a.expires_on >= current_date) THEN
      RAISE EXCEPTION 'risk_acceptance_record_required' USING ERRCODE = 'P0001', HINT = 'closure_type'; END IF;
    IF OLD.status = 'CLOSED' THEN RAISE EXCEPTION 'finding_closed' USING ERRCODE = 'P0001', HINT = 'status'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER finding_status_guard BEFORE UPDATE ON vendor.findings FOR EACH ROW EXECUTE FUNCTION vendor.finding_status_guard();

-- Append-only history.
CREATE TRIGGER plan_approvals_immutable BEFORE UPDATE OR DELETE ON vendor.plan_approvals FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER evidence_evaluations_immutable BEFORE UPDATE OR DELETE ON vendor.evidence_evaluations FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER request_events_immutable BEFORE UPDATE OR DELETE ON vendor.request_events FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER populations_immutable BEFORE UPDATE OR DELETE ON vendor.populations FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER management_responses_immutable BEFORE UPDATE OR DELETE ON vendor.management_responses FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER retests_immutable BEFORE UPDATE OR DELETE ON vendor.retests FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER risk_acceptances_immutable BEFORE UPDATE OR DELETE ON vendor.risk_acceptances FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER evidence_no_delete BEFORE DELETE ON vendor.evidence FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();
CREATE TRIGGER working_papers_no_delete BEFORE DELETE ON vendor.working_papers FOR EACH ROW EXECUTE FUNCTION vendor.immutable_row();

-- Row-level security: practice-level tables are visible to staff; engagement tables to the engagement team.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['criteria_versions','methodologies','practice_activations','engagement_acceptances','engagement_conflicts','understanding_versions','applicability_decisions',
    'scope_versions','risk_assessments','procedures','plan_approvals','evidence','evidence_evaluations','request_events','populations','working_papers','review_notes',
    'management_responses','retests','risk_acceptances','legal_holds'] LOOP
    EXECUTE format('ALTER TABLE vendor.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE vendor.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
CREATE POLICY staff_read ON vendor.criteria_versions FOR SELECT USING (vendor.actor_domain() = 'VENDOR_STAFF');
CREATE POLICY record ON vendor.criteria_versions FOR INSERT WITH CHECK (vendor.has_capability('practice.manage') AND recorded_by = vendor.actor());
CREATE POLICY approve ON vendor.criteria_versions FOR UPDATE USING (vendor.has_capability('practice.approve')) WITH CHECK (vendor.has_capability('practice.approve') AND approved_by = vendor.actor());
CREATE POLICY staff_read ON vendor.methodologies FOR SELECT USING (vendor.actor_domain() = 'VENDOR_STAFF');
CREATE POLICY record ON vendor.methodologies FOR INSERT WITH CHECK (vendor.has_capability('practice.manage') AND recorded_by = vendor.actor());
CREATE POLICY approve ON vendor.methodologies FOR UPDATE USING (vendor.has_capability('practice.approve')) WITH CHECK (vendor.has_capability('practice.approve') AND approved_by = vendor.actor());
CREATE POLICY staff_read ON vendor.practice_activations FOR SELECT USING (vendor.actor_domain() = 'VENDOR_STAFF');
CREATE POLICY record ON vendor.practice_activations FOR INSERT WITH CHECK (vendor.has_capability('practice.activate') AND recorded_by = vendor.actor());
-- Acceptance and conflicts: prepared by engagement managers, decided and reviewed by holders of engagement.accept; read by staff who may see the engagement.
CREATE POLICY read ON vendor.engagement_acceptances FOR SELECT USING (vendor.has_capability('engagements.read') OR vendor.on_team(engagement_id));
CREATE POLICY prepare ON vendor.engagement_acceptances FOR INSERT WITH CHECK (vendor.has_capability('engagements.manage') AND prepared_by = vendor.actor() AND decision IS NULL);
CREATE POLICY decide ON vendor.engagement_acceptances FOR UPDATE USING (vendor.has_capability('engagement.accept')) WITH CHECK (vendor.has_capability('engagement.accept'));
CREATE POLICY read ON vendor.engagement_conflicts FOR SELECT USING (vendor.has_capability('engagements.read') OR vendor.on_team(engagement_id));
CREATE POLICY record ON vendor.engagement_conflicts FOR INSERT WITH CHECK ((vendor.has_capability('engagements.manage') OR vendor.on_team(engagement_id)) AND recorded_by = vendor.actor() AND status = 'OPEN');
CREATE POLICY review ON vendor.engagement_conflicts FOR UPDATE USING (vendor.has_capability('engagement.accept')) WITH CHECK (vendor.has_capability('engagement.accept'));
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['understanding_versions','applicability_decisions','scope_versions','risk_assessments','procedures','plan_approvals','evidence','populations','working_papers'] LOOP
    EXECUTE format('CREATE POLICY team_read ON vendor.%I FOR SELECT USING (vendor.on_team(engagement_id))', t);
    EXECUTE format('CREATE POLICY team_insert ON vendor.%I FOR INSERT WITH CHECK (vendor.on_team(engagement_id) AND vendor.has_capability(''audit.fieldwork''))', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['understanding_versions','applicability_decisions','scope_versions','risk_assessments','procedures','working_papers'] LOOP
    EXECUTE format('CREATE POLICY team_update ON vendor.%I FOR UPDATE USING (vendor.on_team(engagement_id)) WITH CHECK (vendor.on_team(engagement_id))', t);
  END LOOP;
END $$;
CREATE POLICY team_read ON vendor.evidence_evaluations FOR SELECT USING (EXISTS (SELECT 1 FROM vendor.evidence e WHERE e.id = evidence_id AND vendor.on_team(e.engagement_id)));
CREATE POLICY team_insert ON vendor.evidence_evaluations FOR INSERT WITH CHECK (evaluated_by = vendor.actor() AND EXISTS (SELECT 1 FROM vendor.evidence e WHERE e.id = evidence_id AND vendor.on_team(e.engagement_id)));
CREATE POLICY team_read ON vendor.request_events FOR SELECT USING (EXISTS (SELECT 1 FROM vendor.audit_requests r WHERE r.id = request_id AND vendor.on_team(r.engagement_id)));
CREATE POLICY team_insert ON vendor.request_events FOR INSERT WITH CHECK (actor_id = vendor.actor() AND EXISTS (SELECT 1 FROM vendor.audit_requests r WHERE r.id = request_id AND vendor.on_team(r.engagement_id)));
CREATE POLICY team_update ON vendor.audit_requests FOR UPDATE USING (vendor.on_team(engagement_id)) WITH CHECK (vendor.on_team(engagement_id));
CREATE POLICY team_read ON vendor.review_notes FOR SELECT USING (EXISTS (SELECT 1 FROM vendor.working_papers w WHERE w.id = working_paper_id AND vendor.on_team(w.engagement_id)));
CREATE POLICY team_insert ON vendor.review_notes FOR INSERT WITH CHECK (raised_by = vendor.actor() AND EXISTS (SELECT 1 FROM vendor.working_papers w WHERE w.id = working_paper_id AND vendor.on_team(w.engagement_id, 'REVIEWER')));
CREATE POLICY team_update ON vendor.review_notes FOR UPDATE USING (EXISTS (SELECT 1 FROM vendor.working_papers w WHERE w.id = working_paper_id AND vendor.on_team(w.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM vendor.working_papers w WHERE w.id = working_paper_id AND vendor.on_team(w.engagement_id)));
CREATE POLICY team_read ON vendor.management_responses FOR SELECT USING (EXISTS (SELECT 1 FROM vendor.findings f WHERE f.id = finding_id AND vendor.on_team(f.engagement_id)));
CREATE POLICY team_insert ON vendor.management_responses FOR INSERT WITH CHECK (source = 'RECORDED_BY_AUDITOR' AND recorded_by = vendor.actor() AND EXISTS (SELECT 1 FROM vendor.findings f WHERE f.id = finding_id AND vendor.on_team(f.engagement_id)));
CREATE POLICY team_read ON vendor.retests FOR SELECT USING (EXISTS (SELECT 1 FROM vendor.findings f WHERE f.id = finding_id AND vendor.on_team(f.engagement_id)));
CREATE POLICY team_insert ON vendor.retests FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM vendor.findings f WHERE f.id = finding_id AND vendor.on_team(f.engagement_id)));
CREATE POLICY team_read ON vendor.risk_acceptances FOR SELECT USING (EXISTS (SELECT 1 FROM vendor.findings f WHERE f.id = finding_id AND vendor.on_team(f.engagement_id)));
CREATE POLICY team_insert ON vendor.risk_acceptances FOR INSERT WITH CHECK (recorded_by = vendor.actor() AND EXISTS (SELECT 1 FROM vendor.findings f WHERE f.id = finding_id AND vendor.on_team(f.engagement_id)));
CREATE POLICY read ON vendor.legal_holds FOR SELECT USING (vendor.has_capability('engagements.read') OR vendor.on_team(engagement_id));
CREATE POLICY authorise ON vendor.legal_holds FOR INSERT WITH CHECK (vendor.has_capability('practice.activate') AND authorised_by = vendor.actor());
CREATE POLICY release ON vendor.legal_holds FOR UPDATE USING (vendor.has_capability('practice.activate')) WITH CHECK (vendor.has_capability('practice.activate') AND released_by = vendor.actor());

-- A management response sent by the client installation over the channel (revision 1.6), recorded for its own engagement only.
CREATE FUNCTION vendor.channel_record_response(p_id uuid, p_finding uuid, p_factual text, p_agreement text, p_response text, p_plan text, p_owner text, p_due date, p_dependencies text,
  p_status text, p_risk jsonb, p_signed jsonb, p_digest text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e uuid := vendor.channel_caller(); f record;
BEGIN
  IF EXISTS (SELECT 1 FROM vendor.management_responses WHERE digest = p_digest) THEN RETURN 'DUPLICATE'; END IF;
  SELECT * INTO f FROM vendor.findings WHERE id = p_finding AND engagement_id = e;
  IF f IS NULL THEN RETURN 'UNKNOWN_FINDING'; END IF;
  IF f.status = 'CLOSED' THEN RETURN 'FINDING_CLOSED'; END IF;
  INSERT INTO vendor.management_responses(id, finding_id, source, factual_accuracy, agreement, response, action_plan, owner_role, due_date, dependencies, remediation_status, risk_acceptance, signed, digest)
  VALUES (p_id, p_finding, 'CHANNEL', p_factual, p_agreement, p_response, p_plan, p_owner, p_due, p_dependencies, p_status, p_risk, p_signed, p_digest);
  IF f.status = 'OPEN' THEN UPDATE vendor.findings SET status = 'CLIENT_RESPONDED' WHERE id = p_finding; END IF;
  INSERT INTO vendor.channel_events(id, engagement_id, kind, outcome) VALUES (gen_random_uuid(), e, 'DELIVERY', 'RESPONSE_ACCEPTED');
  INSERT INTO vendor.audit_events(id, actor_id, actor_domain, operation, resource_id, request_id) VALUES (gen_random_uuid(), e, 'CLIENT_INSTALLATION', 'audit.channel.management-response', p_id, gen_random_uuid());
  RETURN 'ACCEPTED';
END $$;
-- Signed audit documents (findings, request lists, reports) the client installation has not yet acknowledged, offered at check-in.
CREATE TABLE vendor.channel_documents (document_id uuid NOT NULL REFERENCES vendor.signed_documents(id), engagement_id uuid NOT NULL REFERENCES vendor.engagements(id),
  offered_at timestamptz NOT NULL DEFAULT clock_timestamp(), acknowledged_at timestamptz, PRIMARY KEY (document_id));
ALTER TABLE vendor.channel_documents ENABLE ROW LEVEL SECURITY; ALTER TABLE vendor.channel_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY team_read ON vendor.channel_documents FOR SELECT USING (vendor.on_team(engagement_id));
CREATE POLICY team_insert ON vendor.channel_documents FOR INSERT WITH CHECK (vendor.on_team(engagement_id));
CREATE FUNCTION vendor.channel_pending_documents() RETURNS TABLE(document_id uuid, kind text, document jsonb, signing_key_id text, signature text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  SELECT d.document_id, s.kind, s.document, s.signing_key_id, s.signature FROM vendor.channel_documents d JOIN vendor.signed_documents s ON s.id = d.document_id
  WHERE d.engagement_id = vendor.channel_caller() AND d.acknowledged_at IS NULL ORDER BY d.offered_at, d.document_id LIMIT 20 $$;
CREATE FUNCTION vendor.channel_acknowledge_document(p_document uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
  UPDATE vendor.channel_documents SET acknowledged_at = clock_timestamp() WHERE document_id = p_document AND engagement_id = vendor.channel_caller() AND acknowledged_at IS NULL $$;

-- Retention also respects authorised legal holds: an engagement under an active hold is not purged.
CREATE OR REPLACE FUNCTION vendor.retention_sweep(p_actor uuid) RETURNS TABLE(engagement_id uuid, packages integer, items integer, bytes bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vendor AS $$
DECLARE e record; np integer; ni integer; nb bigint;
BEGIN
  IF p_actor IS DISTINCT FROM vendor.actor() OR NOT vendor.has_capability('engagements.manage') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  FOR e IN SELECT * FROM vendor.engagements x WHERE x.state = 'CLOSED' AND x.purged_at IS NULL AND x.closed_at + make_interval(days => x.retention_days) <= clock_timestamp()
      AND NOT EXISTS (SELECT 1 FROM vendor.legal_holds h WHERE h.engagement_id = x.id AND h.released_at IS NULL AND (h.expires_on IS NULL OR h.expires_on >= current_date)) FOR UPDATE LOOP
    SELECT count(*), coalesce(sum(i.size_bytes), 0) INTO ni, nb FROM vendor.package_items i JOIN vendor.packages p ON p.id = i.package_id WHERE p.engagement_id = e.id AND i.ciphertext IS NOT NULL;
    UPDATE vendor.package_items i SET ciphertext = NULL, nonce = NULL, tag = NULL FROM vendor.packages p WHERE p.id = i.package_id AND p.engagement_id = e.id;
    UPDATE vendor.packages SET state = 'PURGED', purged_at = clock_timestamp(), wrapped_key = NULL, key_nonce = NULL, key_tag = NULL, quarantine_reason = NULL WHERE vendor.packages.engagement_id = e.id AND state <> 'PURGED';
    GET DIAGNOSTICS np = ROW_COUNT;
    UPDATE vendor.channel_deliveries SET document = NULL, signed = NULL, purged_at = clock_timestamp() WHERE vendor.channel_deliveries.engagement_id = e.id AND purged_at IS NULL;
    UPDATE vendor.engagements SET purged_at = clock_timestamp() WHERE id = e.id;
    INSERT INTO vendor.retention_purges(id, engagement_id, packages, items, bytes, actor_id) VALUES (gen_random_uuid(), e.id, np, ni, nb, p_actor);
    engagement_id := e.id; packages := np; items := ni; bytes := nb; RETURN NEXT;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON vendor.criteria_versions, vendor.methodologies, vendor.engagement_acceptances, vendor.engagement_conflicts, vendor.understanding_versions,
  vendor.applicability_decisions, vendor.scope_versions, vendor.risk_assessments, vendor.procedures, vendor.working_papers, vendor.review_notes, vendor.legal_holds TO orvia_vendor_app;
GRANT SELECT, INSERT ON vendor.practice_activations, vendor.plan_approvals, vendor.evidence, vendor.evidence_evaluations, vendor.request_events, vendor.populations,
  vendor.management_responses, vendor.retests, vendor.risk_acceptances, vendor.channel_documents TO orvia_vendor_app;
GRANT UPDATE ON vendor.audit_requests TO orvia_vendor_app;
GRANT EXECUTE ON FUNCTION vendor.practice_gates_missing(), vendor.engagement_accepted(uuid), vendor.review_barred(uuid, uuid),
  vendor.channel_record_response(uuid,uuid,text,text,text,text,text,date,text,text,jsonb,jsonb,text), vendor.channel_pending_documents(), vendor.channel_acknowledge_document(uuid) TO orvia_vendor_app;
