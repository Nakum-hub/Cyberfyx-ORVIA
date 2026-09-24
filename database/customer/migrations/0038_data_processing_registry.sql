-- DPDP Operations extension, part 2: the Data & Processing Registry.
--
-- V1 mapping, decided per object (data/EXISTING_DATA_MIGRATION_AND_BACKFILL.md s3):
--   Systems            -> REUSED. app.systems is the target; capability declarations attach to it.
--   Processors         -> REUSED. app.processors is the vendor; engagements attach to it.
--   Mandates           -> REUSED. app.representation_mandates stays the portal authority; a
--                         representative record for a subject with a portal identity must cite one.
--   Rights requests    -> REUSED (part 3 attaches a DPDP case profile to app.rights_requests).
--   Incidents          -> REUSED (part 3 attaches a breach profile to app.incidents).
--   V1 purposes/notices/processing activities/data categories -> NOT extended. They are closed
--     vocabularies of the synthetic sprint (two purpose codes, two lawful conditions, five data
--     category codes) wired into the consent machinery. Widening them in place would overload
--     their meaning, so the customer-configurable registry objects below are new and carry an
--     optional link to the V1 object they correspond to.
--   Data principal     -> NEW pseudonymous reference (data_principals). app.principal_references is the
--     authenticated portal identity and stores a raw e-mail address; most people in an existing
--     estate never have a portal account, so a subject links to a principal only where one exists.
-- Every fact that cannot be known is stored as unknown (NULL plus an explicit state), never defaulted.

CREATE TABLE app.organisation_profile_versions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 version integer NOT NULL CHECK(version>0),
 sdf_status text NOT NULL CHECK(sdf_status IN ('UNKNOWN','NOT_DESIGNATED','DESIGNATED')),
 sdf_designation_reference text,dpo_contact text,grievance_contact text,independent_auditor_reference text,
 facts jsonb NOT NULL,effective_from timestamptz NOT NULL,reason text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(tenant_id,legal_entity_id,environment_id,version),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id),
 -- A designation is a Central Government act; it is recorded only with its reference.
 CHECK(sdf_status<>'DESIGNATED' OR sdf_designation_reference IS NOT NULL));

CREATE TABLE app.data_principal_categories (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 name text NOT NULL,description text NOT NULL,active boolean NOT NULL DEFAULT true,
 regulatory_tags text[] NOT NULL DEFAULT '{}',
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(tenant_id,legal_entity_id,environment_id,name));

CREATE TABLE app.personal_data_categories (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 name text NOT NULL,description text NOT NULL,active boolean NOT NULL DEFAULT true,
 legacy_code text CHECK(legacy_code IN ('CONTACT_DETAILS','IDENTIFIERS','MARKETING_PREFERENCES','ORDER_RECORDS','SUPPORT_NOTES')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(tenant_id,legal_entity_id,environment_id,name));

CREATE TABLE app.data_principals (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 principal_id uuid,status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE','MERGED')),
 merged_into uuid,provenance jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,principal_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,merged_into) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 CHECK((status='MERGED')=(merged_into IS NOT NULL)),CHECK(merged_into IS NULL OR merged_into<>id));

-- A subject's key in one system. Only the target's own record key is held (it is
-- what an action must address); a source identifier such as an e-mail address is
-- never stored, only its keyed digest, so deduplication does not copy raw data.
CREATE TABLE app.data_principal_references (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 subject_id uuid NOT NULL,system_id uuid NOT NULL,
 target_reference text NOT NULL CHECK(target_reference ~ '^[A-Za-z0-9_.:-]{1,120}$'),
 source_key_digest text CHECK(source_key_digest IS NULL OR source_key_digest ~ '^[a-f0-9]{64}$'),
 provenance jsonb NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,system_id,target_reference),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX subject_refs_by_subject ON app.data_principal_references(tenant_id,legal_entity_id,environment_id,subject_id);
CREATE UNIQUE INDEX subject_refs_source_key ON app.data_principal_references(tenant_id,legal_entity_id,environment_id,system_id,source_key_digest) WHERE source_key_digest IS NOT NULL;

-- One person can be a patient and an employee: each context is its own row.
CREATE TABLE app.data_principal_relationships (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 subject_id uuid NOT NULL,category_id uuid NOT NULL,
 effective_from timestamptz,effective_to timestamptz,
 status text NOT NULL CHECK(status IN ('ACTIVE','ENDED','UNKNOWN')),
 source_system_id uuid,source_reference text,
 evidence_state text NOT NULL CHECK(evidence_state IN ('KNOWN','UNKNOWN','EVIDENCE_AVAILABLE','EVIDENCE_MISSING','NEEDS_VERIFICATION','NEEDS_REMEDIATION','NOT_APPLICABLE','EXCEPTION_RECORDED')),
 evidence_reference text,provenance jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,category_id) REFERENCES app.data_principal_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,source_system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK(effective_to IS NULL OR effective_from IS NULL OR effective_to>=effective_from),
 CHECK(status<>'ACTIVE' OR effective_to IS NULL),
 CHECK(evidence_state<>'EVIDENCE_AVAILABLE' OR evidence_reference IS NOT NULL));
CREATE INDEX relationships_by_subject ON app.data_principal_relationships(tenant_id,legal_entity_id,environment_id,subject_id);
CREATE INDEX relationships_by_category ON app.data_principal_relationships(tenant_id,legal_entity_id,environment_id,category_id,subject_id);

-- Representatives, guardians and nominees. Identity/authority artefacts are
-- referenced, never stored, and are readable only with registry.sensitive.read.
CREATE TABLE app.data_principal_representatives (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 subject_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('GUARDIAN','NOMINEE','AUTHORISED_REPRESENTATIVE')),
 representative_reference text NOT NULL,authority_evidence_reference text NOT NULL,
 mandate_id uuid,effective_from timestamptz NOT NULL,effective_to timestamptz,
 verification text NOT NULL DEFAULT 'UNVERIFIED' CHECK(verification IN ('UNVERIFIED','VERIFIED','REJECTED')),
 verified_at timestamptz,verified_by uuid,verification_evidence_reference text,
 restrictions text[] NOT NULL DEFAULT '{}',
 activated_at timestamptz,activation_basis text CHECK(activation_basis IN ('DEATH','INCAPACITY')),activation_evidence_reference text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,mandate_id) REFERENCES app.representation_mandates(tenant_id,legal_entity_id,environment_id,id),
 CHECK(effective_to IS NULL OR effective_to>effective_from),
 CHECK((verification='UNVERIFIED')=(verified_at IS NULL)),
 CHECK((verified_at IS NULL)=(verified_by IS NULL) AND (verified_at IS NULL)=(verification_evidence_reference IS NULL)),
 CHECK(verified_by IS NULL OR verified_by<>recorded_by),
 -- Only a nomination is activated, and only with its basis and evidence.
 CHECK(activated_at IS NULL OR kind='NOMINEE'),
 CHECK((activated_at IS NULL)=(activation_basis IS NULL) AND (activated_at IS NULL)=(activation_evidence_reference IS NULL)));

CREATE TABLE app.child_status_records (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 subject_id uuid NOT NULL,child_status text NOT NULL CHECK(child_status IN ('UNKNOWN','CHILD','NOT_CHILD','PERSON_WITH_DISABILITY_WITH_GUARDIAN')),
 basis text NOT NULL,evidence_reference text,guardian_id uuid,
 verifiable_consent text NOT NULL CHECK(verifiable_consent IN ('NOT_REQUIRED_RECORDED','NOT_ESTABLISHED','ESTABLISHED','UNKNOWN')),
 verifiable_consent_evidence_reference text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,guardian_id) REFERENCES app.data_principal_representatives(tenant_id,legal_entity_id,environment_id,id),
 CHECK(verifiable_consent<>'ESTABLISHED' OR (verifiable_consent_evidence_reference IS NOT NULL AND guardian_id IS NOT NULL)),
 CHECK(child_status IN ('UNKNOWN') OR evidence_reference IS NOT NULL));
CREATE TRIGGER child_contexts_append_only BEFORE UPDATE OR DELETE ON app.child_status_records FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

CREATE TABLE app.registry_purposes (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 name text NOT NULL,owner_reference text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(tenant_id,legal_entity_id,environment_id,name));
CREATE TABLE app.registry_purpose_versions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 purpose_id uuid NOT NULL,version integer NOT NULL CHECK(version>0),description text NOT NULL,
 status text NOT NULL CHECK(status IN ('ACTIVE','RETIRED')),
 effective_from timestamptz NOT NULL,effective_to timestamptz,change_reason text NOT NULL,evidence_reference text,
 v1_purpose_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,purpose_id,version),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.registry_purposes(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,v1_purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 CHECK(effective_to IS NULL OR effective_to>effective_from));
-- Content is fixed; the only later change is closing the effective period.
CREATE FUNCTION app.version_close_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'effective_to'-'status'-'superseded_by') IS DISTINCT FROM (to_jsonb(OLD)-'effective_to'-'status'-'superseded_by')
  THEN RAISE EXCEPTION 'A recorded version is immutable; create a new version' USING ERRCODE='23514'; END IF;
 IF OLD.effective_to IS NOT NULL AND NEW.effective_to IS DISTINCT FROM OLD.effective_to
  THEN RAISE EXCEPTION 'A closed effective period is never reopened' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.version_close_only FROM PUBLIC;
CREATE TRIGGER purpose_versions_close_only BEFORE UPDATE ON app.registry_purpose_versions FOR EACH ROW EXECUTE FUNCTION app.version_close_only();

CREATE TABLE app.processing_conditions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 code text NOT NULL CHECK(code ~ '^[A-Z0-9_]{2,40}$'),label text NOT NULL,
 requirement_ids text[] NOT NULL DEFAULT '{}',package_row_id uuid,
 effective_from timestamptz NOT NULL,effective_to timestamptz,
 unresolved boolean NOT NULL,unresolved_reason text,
 evidence_requirements text NOT NULL,justification_reference text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id),
 CHECK(unresolved=(unresolved_reason IS NOT NULL)),
 -- A resolved condition is traceable to the package whose vocabulary defined it.
 CHECK(unresolved OR (package_row_id IS NOT NULL AND cardinality(requirement_ids)>0)),
 CHECK(effective_to IS NULL OR effective_to>effective_from));

CREATE TABLE app.security_safeguards (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('ACCESS_CONTROL','ENCRYPTION','OBFUSCATION_MASKING','TOKENISATION','LOGGING_MONITORING','BACKUP_AVAILABILITY','PROCESSOR_SAFEGUARD','ORGANISATIONAL_MEASURE')),
 description text NOT NULL,control_reference text,
 evidence_state text NOT NULL CHECK(evidence_state IN ('EVIDENCE_AVAILABLE','EVIDENCE_MISSING','NEEDS_VERIFICATION')),
 evidence_reference text,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 CHECK((evidence_state='EVIDENCE_AVAILABLE')=(evidence_reference IS NOT NULL)));

CREATE TABLE app.registry_notices (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 name text NOT NULL,audience_category_ids uuid[] NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id));
CREATE TABLE app.registry_notice_versions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 notice_id uuid NOT NULL,version integer NOT NULL CHECK(version>0),
 locale text NOT NULL CHECK(locale IN ('en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml','mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur')),
 title text NOT NULL,content text NOT NULL,content_digest text NOT NULL CHECK(content_digest ~ '^[a-f0-9]{64}$'),
 purpose_version_ids uuid[] NOT NULL CHECK(cardinality(purpose_version_ids)>0),
 data_category_ids uuid[] NOT NULL CHECK(cardinality(data_category_ids)>0),
 channels jsonb NOT NULL,template_reference text,v1_notice_version_id uuid,
 status text NOT NULL CHECK(status IN ('DRAFT','PUBLISHED','SUPERSEDED')),
 effective_from timestamptz,effective_to timestamptz,published_at timestamptz,published_by uuid,superseded_by uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,notice_id,locale,version),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,notice_id) REFERENCES app.registry_notices(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,superseded_by) REFERENCES app.registry_notice_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,v1_notice_version_id) REFERENCES app.notice_versions(tenant_id,legal_entity_id,environment_id,version_id),
 CHECK((status='DRAFT')=(published_at IS NULL)),CHECK((published_at IS NULL)=(effective_from IS NULL) AND (published_at IS NULL)=(published_by IS NULL)),
 CHECK((status='SUPERSEDED')=(superseded_by IS NOT NULL)),
 CHECK(effective_to IS NULL OR effective_to>effective_from));
CREATE FUNCTION app.registry_notice_publication_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'status'-'effective_from'-'effective_to'-'published_at'-'published_by'-'superseded_by') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'effective_from'-'effective_to'-'published_at'-'published_by'-'superseded_by')
  THEN RAISE EXCEPTION 'Notice content is immutable; create a new version' USING ERRCODE='23514'; END IF;
 IF NOT((OLD.status='DRAFT' AND NEW.status='PUBLISHED') OR (OLD.status='PUBLISHED' AND NEW.status='SUPERSEDED'))
  THEN RAISE EXCEPTION 'Invalid notice publication transition' USING ERRCODE='23514'; END IF;
 IF OLD.published_at IS NOT NULL AND (NEW.published_at IS DISTINCT FROM OLD.published_at OR NEW.effective_from IS DISTINCT FROM OLD.effective_from)
  THEN RAISE EXCEPTION 'A publication time is never rewritten' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.registry_notice_publication_only FROM PUBLIC;
CREATE TRIGGER notice_versions_publication_only BEFORE UPDATE ON app.registry_notice_versions FOR EACH ROW EXECUTE FUNCTION app.registry_notice_publication_only();
CREATE UNIQUE INDEX one_published_notice_version ON app.registry_notice_versions(tenant_id,legal_entity_id,environment_id,notice_id,locale) WHERE status='PUBLISHED';

-- Delivery evidence exists only where a source record says it happened.
CREATE TABLE app.notice_delivery_evidence (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 notice_version_id uuid NOT NULL,subject_id uuid,relationship_id uuid,population_reference text,
 channel text NOT NULL,presented_at timestamptz NOT NULL,source_system_id uuid,source_reference text NOT NULL,
 evidence_reference text,result text NOT NULL CHECK(result IN ('PRESENTED','DELIVERED','FAILED','UNKNOWN')),
 provenance jsonb NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,notice_version_id) REFERENCES app.registry_notice_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,relationship_id) REFERENCES app.data_principal_relationships(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,source_system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK((subject_id IS NULL)<>(population_reference IS NULL)));
CREATE TRIGGER deliveries_append_only BEFORE UPDATE OR DELETE ON app.notice_delivery_evidence FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

CREATE TABLE app.processor_engagements (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 processor_id uuid NOT NULL,service_description text NOT NULL,subprocessor_of uuid,
 effective_from timestamptz NOT NULL,effective_to timestamptz,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','TERMINATED')),
 contract_evidence_reference text,safeguard_evidence_reference text,
 disposition_state text NOT NULL DEFAULT 'NOT_APPLICABLE' CHECK(disposition_state IN ('NOT_APPLICABLE','PENDING','PROCESSOR_CONFIRMED','VERIFIED','UNKNOWN')),
 terminated_at timestamptz,termination_reason text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processor_id) REFERENCES app.processors(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subprocessor_of) REFERENCES app.processor_engagements(tenant_id,legal_entity_id,environment_id,id),
 CHECK((status='TERMINATED')=(terminated_at IS NOT NULL)),CHECK((terminated_at IS NULL)=(termination_reason IS NULL)),
 CHECK(status='TERMINATED' OR disposition_state='NOT_APPLICABLE'),
 CHECK(effective_to IS NULL OR effective_to>=effective_from));
CREATE FUNCTION app.processor_engagement_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'status'-'effective_to'-'terminated_at'-'termination_reason'-'disposition_state') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'effective_to'-'terminated_at'-'termination_reason'-'disposition_state')
  THEN RAISE EXCEPTION 'An engagement is immutable apart from its termination and disposition' USING ERRCODE='23514'; END IF;
 IF OLD.status='TERMINATED' AND (NEW.status<>'TERMINATED' OR NEW.terminated_at IS DISTINCT FROM OLD.terminated_at)
  THEN RAISE EXCEPTION 'A terminated engagement is never revived' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.processor_engagement_history FROM PUBLIC;
CREATE TRIGGER engagement_history BEFORE UPDATE ON app.processor_engagements FOR EACH ROW EXECUTE FUNCTION app.processor_engagement_history();

CREATE TABLE app.retention_rules (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 rule_key uuid NOT NULL,version integer NOT NULL CHECK(version>0),name text NOT NULL,
 activity_id uuid,principal_category_id uuid,data_category_id uuid,system_id uuid,
 trigger text NOT NULL CHECK(trigger IN ('RELATIONSHIP_ENDED','CONSENT_WITHDRAWN','PURPOSE_RETIRED')),
 duration_days integer CHECK(duration_days IS NULL OR duration_days BETWEEN 0 AND 36500),
 duration_source text CHECK(duration_source IN ('CUSTOMER_CONFIGURATION','REGULATORY_REQUIREMENT','EXTERNAL_LAW_REFERENCE')),
 source_reference text,requirement_id text,
 approval_required boolean NOT NULL,erasure_action text NOT NULL CHECK(erasure_action IN ('ERASE','ANONYMISE','SUPPRESS')),
 effective_from timestamptz NOT NULL,effective_to timestamptz,status text NOT NULL CHECK(status IN ('ACTIVE','RETIRED')),superseded_by uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,rule_key,version),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_category_id) REFERENCES app.data_principal_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_category_id) REFERENCES app.personal_data_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 -- A period is never invented: a duration exists only with the source that set it.
 CHECK((duration_days IS NULL)=(duration_source IS NULL) AND (duration_days IS NULL OR source_reference IS NOT NULL)),
 CHECK(duration_source IS DISTINCT FROM 'REGULATORY_REQUIREMENT' OR requirement_id IS NOT NULL),
 CHECK(principal_category_id IS NOT NULL),
 CHECK(effective_to IS NULL OR effective_to>effective_from));
CREATE TRIGGER retention_rules_close_only BEFORE UPDATE ON app.retention_rules FOR EACH ROW EXECUTE FUNCTION app.version_close_only();

CREATE TABLE app.registry_activities (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 name text NOT NULL,description text NOT NULL,owner_reference text NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','RETIRED')),
 processes_child_data text NOT NULL DEFAULT 'UNKNOWN' CHECK(processes_child_data IN ('UNKNOWN','YES','NO')),
 graph_activity_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,graph_activity_id) REFERENCES app.processing_activities(tenant_id,legal_entity_id,environment_id,id));
ALTER TABLE app.retention_rules ADD FOREIGN KEY(tenant_id,legal_entity_id,environment_id,activity_id) REFERENCES app.registry_activities(tenant_id,legal_entity_id,environment_id,id);

-- The material configuration of an activity, version by version.
CREATE TABLE app.registry_activity_versions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 activity_id uuid NOT NULL,version integer NOT NULL CHECK(version>0),
 purpose_version_id uuid NOT NULL,condition_id uuid,notice_version_ids uuid[] NOT NULL DEFAULT '{}',
 requirement_ids text[] NOT NULL DEFAULT '{}',
 evidence_state text NOT NULL CHECK(evidence_state IN ('KNOWN','UNKNOWN','EVIDENCE_AVAILABLE','EVIDENCE_MISSING','NEEDS_VERIFICATION','NEEDS_REMEDIATION','NOT_APPLICABLE','EXCEPTION_RECORDED')),
 effective_from timestamptz NOT NULL,effective_to timestamptz,change_reason text NOT NULL,
 status text NOT NULL DEFAULT 'CURRENT' CHECK(status IN ('CURRENT','SUPERSEDED')),superseded_by uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,activity_id,version),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,activity_id) REFERENCES app.registry_activities(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_version_id) REFERENCES app.registry_purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,condition_id) REFERENCES app.processing_conditions(tenant_id,legal_entity_id,environment_id,id),
 CHECK(effective_to IS NULL OR effective_to>effective_from));
CREATE TRIGGER activity_versions_close_only BEFORE UPDATE ON app.registry_activity_versions FOR EACH ROW EXECUTE FUNCTION app.version_close_only();
CREATE UNIQUE INDEX one_current_activity_version ON app.registry_activity_versions(tenant_id,legal_entity_id,environment_id,activity_id) WHERE status='CURRENT';

-- Typed, effective-dated edges. Closed by valid_to, never deleted.
CREATE TABLE app.registry_activity_links (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 activity_id uuid NOT NULL,
 link_kind text NOT NULL CHECK(link_kind IN ('PRINCIPAL_CATEGORY','DATA_CATEGORY','SYSTEM','PROCESSOR_ENGAGEMENT','CHANNEL','RETENTION_RULE','SAFEGUARD')),
 principal_category_id uuid,data_category_id uuid,system_id uuid,engagement_id uuid,retention_rule_id uuid,safeguard_id uuid,channel text,
 basis text NOT NULL,valid_from timestamptz NOT NULL,valid_to timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,activity_id) REFERENCES app.registry_activities(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_category_id) REFERENCES app.data_principal_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_category_id) REFERENCES app.personal_data_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,engagement_id) REFERENCES app.processor_engagements(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,retention_rule_id) REFERENCES app.retention_rules(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,safeguard_id) REFERENCES app.security_safeguards(tenant_id,legal_entity_id,environment_id,id),
 CHECK(valid_to IS NULL OR valid_to>valid_from),
 CHECK(num_nonnulls(principal_category_id,data_category_id,system_id,engagement_id,retention_rule_id,safeguard_id,channel)=1),
 CHECK(CASE link_kind WHEN 'PRINCIPAL_CATEGORY' THEN principal_category_id IS NOT NULL WHEN 'DATA_CATEGORY' THEN data_category_id IS NOT NULL
  WHEN 'SYSTEM' THEN system_id IS NOT NULL WHEN 'PROCESSOR_ENGAGEMENT' THEN engagement_id IS NOT NULL WHEN 'CHANNEL' THEN channel IS NOT NULL
  WHEN 'RETENTION_RULE' THEN retention_rule_id IS NOT NULL WHEN 'SAFEGUARD' THEN safeguard_id IS NOT NULL END));
CREATE INDEX activity_links_by_activity ON app.registry_activity_links(tenant_id,legal_entity_id,environment_id,activity_id,link_kind);
CREATE INDEX activity_links_by_system ON app.registry_activity_links(tenant_id,legal_entity_id,environment_id,system_id) WHERE system_id IS NOT NULL;
CREATE INDEX activity_links_by_category ON app.registry_activity_links(tenant_id,legal_entity_id,environment_id,principal_category_id) WHERE principal_category_id IS NOT NULL;
CREATE FUNCTION app.registry_edge_close_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Registry history is closed by valid_to, never deleted' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-'valid_to') IS DISTINCT FROM (to_jsonb(OLD)-'valid_to') OR OLD.valid_to IS NOT NULL
  THEN RAISE EXCEPTION 'A registry edge is only ever closed, once' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.registry_edge_close_only FROM PUBLIC;
CREATE TRIGGER activity_links_close_only BEFORE UPDATE OR DELETE ON app.registry_activity_links FOR EACH ROW EXECUTE FUNCTION app.registry_edge_close_only();

-- What a processor engagement touches, beyond the activities that use it.
CREATE TABLE app.processor_engagement_links (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 engagement_id uuid NOT NULL,link_kind text NOT NULL CHECK(link_kind IN ('DATA_CATEGORY','PRINCIPAL_CATEGORY','SYSTEM')),
 data_category_id uuid,principal_category_id uuid,system_id uuid,
 valid_from timestamptz NOT NULL,valid_to timestamptz,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,engagement_id) REFERENCES app.processor_engagements(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_category_id) REFERENCES app.personal_data_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_category_id) REFERENCES app.data_principal_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK(num_nonnulls(data_category_id,principal_category_id,system_id)=1),
 CHECK(valid_to IS NULL OR valid_to>valid_from));
CREATE TRIGGER engagement_links_close_only BEFORE UPDATE OR DELETE ON app.processor_engagement_links FOR EACH ROW EXECUTE FUNCTION app.registry_edge_close_only();

-- The data-sharing register: what goes to whom, for which purpose, on what evidence.
CREATE TABLE app.data_sharing_links (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 activity_id uuid NOT NULL,data_category_id uuid NOT NULL,principal_category_id uuid,
 engagement_id uuid,recipient_reference text,purpose_version_id uuid NOT NULL,system_id uuid,
 valid_from timestamptz NOT NULL,valid_to timestamptz,evidence_reference text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,activity_id) REFERENCES app.registry_activities(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_category_id) REFERENCES app.personal_data_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_category_id) REFERENCES app.data_principal_categories(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,engagement_id) REFERENCES app.processor_engagements(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_version_id) REFERENCES app.registry_purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 CHECK((engagement_id IS NULL)<>(recipient_reference IS NULL)),
 CHECK(valid_to IS NULL OR valid_to>valid_from));
CREATE TRIGGER sharing_links_close_only BEFORE UPDATE OR DELETE ON app.data_sharing_links FOR EACH ROW EXECUTE FUNCTION app.registry_edge_close_only();

-- Consent where consent is the configured condition. The record's status is a
-- projection of the append-only event history, never set directly.
CREATE TABLE app.consent_records (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 subject_id uuid NOT NULL,relationship_id uuid,activity_id uuid NOT NULL,purpose_version_id uuid NOT NULL,
 current_status text NOT NULL DEFAULT 'UNKNOWN' CHECK(current_status IN ('UNKNOWN','REQUESTED','PRESENTED','GRANTED','DECLINED','WITHDRAWN','EXPIRED')),
 notice_version_id uuid,channel text NOT NULL,
 expiry_policy text,v1_principal_id uuid,v1_purpose_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,subject_id,activity_id,relationship_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,relationship_id) REFERENCES app.data_principal_relationships(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,activity_id) REFERENCES app.registry_activities(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_version_id) REFERENCES app.registry_purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,notice_version_id) REFERENCES app.registry_notice_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,v1_principal_id,v1_purpose_id) REFERENCES app.consent_aggregates(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id),
 CHECK((v1_principal_id IS NULL)=(v1_purpose_id IS NULL)));
CREATE INDEX consent_records_by_activity ON app.consent_records(tenant_id,legal_entity_id,environment_id,activity_id);

CREATE TABLE app.consent_record_events (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 record_id uuid NOT NULL,event text NOT NULL CHECK(event IN ('REQUESTED','PRESENTED','GRANTED','DECLINED','MODIFIED','WITHDRAWN','EXPIRED')),
 occurred_at timestamptz,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),actor_id uuid NOT NULL,
 source text NOT NULL CHECK(source IN ('OPERATOR','IMPORT','V1_PORTAL','SOURCE_SYSTEM')),
 evidence_state text NOT NULL CHECK(evidence_state IN ('EVIDENCE_AVAILABLE','EVIDENCE_MISSING','NEEDS_VERIFICATION')),
 evidence_reference text,notice_version_id uuid,package_row_id uuid,run_id uuid,v1_event_id uuid,provenance jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,record_id,v1_event_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,record_id) REFERENCES app.consent_records(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,notice_version_id) REFERENCES app.registry_notice_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id),
 CHECK((evidence_state='EVIDENCE_AVAILABLE')=(evidence_reference IS NOT NULL)),
 -- A historical timestamp is only ever what a source said; missing proof stays missing.
 CHECK(occurred_at IS NOT NULL OR evidence_state='EVIDENCE_MISSING'));
CREATE INDEX consent_events_by_record ON app.consent_record_events(tenant_id,legal_entity_id,environment_id,record_id,recorded_at);
CREATE TRIGGER consent_events_append_only BEFORE UPDATE OR DELETE ON app.consent_record_events FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- Typed holds: an official exemption, a customer-recorded other-law retention,
-- or an operational hold. Other-law holds are customer supplied, never inferred.
CREATE TABLE app.retention_holds (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 hold_type text NOT NULL CHECK(hold_type IN ('OFFICIAL_EXEMPTION','OTHER_LAW_RETENTION','OPERATIONAL_HOLD')),
 authority_reference text NOT NULL,reason text NOT NULL,
 subject_id uuid,activity_id uuid,system_id uuid,data_category_id uuid,
 starts_at timestamptz NOT NULL,ends_at timestamptz,review_at timestamptz NOT NULL,owner_reference text NOT NULL,evidence_reference text,
 requirement_id text,v1_legal_hold_id uuid,
 state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','RELEASED')),
 released_at timestamptz,released_by uuid,release_reason text,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,subject_id) REFERENCES app.data_principals(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,activity_id) REFERENCES app.registry_activities(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_category_id) REFERENCES app.personal_data_categories(tenant_id,legal_entity_id,environment_id,id),
 CHECK(num_nonnulls(subject_id,activity_id,system_id,data_category_id)>=1),
 CHECK(ends_at IS NULL OR ends_at>starts_at),
 CHECK(hold_type<>'OFFICIAL_EXEMPTION' OR requirement_id IS NOT NULL),
 CHECK((state='RELEASED')=(released_at IS NOT NULL)),
 CHECK((released_at IS NULL)=(released_by IS NULL) AND (released_at IS NULL)=(release_reason IS NULL)));
CREATE FUNCTION app.retention_hold_release_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'state'-'released_at'-'released_by'-'release_reason') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'released_at'-'released_by'-'release_reason')
  OR OLD.state<>'ACTIVE' THEN RAISE EXCEPTION 'A hold is immutable and released once' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.retention_hold_release_once FROM PUBLIC;
CREATE TRIGGER holds_release_only BEFORE UPDATE ON app.retention_holds FOR EACH ROW EXECUTE FUNCTION app.retention_hold_release_once();
CREATE TRIGGER holds_not_deletable BEFORE DELETE ON app.retention_holds FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- Registry history with no update path: a change is a new row, so the rows are
-- protected against rewrite even by a role that bypasses the application grants.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['organisation_profile_versions','data_principal_references','registry_purposes','processing_conditions','security_safeguards','registry_notices'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.append_only_history()',tab||'_append_only',tab);
 END LOOP;
END $$;

-- Connector capability declarations. The capabilities themselves come from the
-- adapter's code; the customer only binds a system to an adapter and declares
-- which data categories that system is the system of record for.
CREATE TABLE app.connector_bindings (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 system_id uuid NOT NULL,adapter text NOT NULL CHECK(adapter IN ('SYNTHETIC_RECORDS_TEST_ADAPTER','MANUAL_ONLY')),
 capabilities jsonb NOT NULL,capability_version text NOT NULL,
 system_of_record_for uuid[] NOT NULL DEFAULT '{}',holds_data_categories uuid[] NOT NULL DEFAULT '{}',
 valid_from timestamptz NOT NULL DEFAULT clock_timestamp(),valid_to timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));
CREATE UNIQUE INDEX one_current_binding ON app.connector_bindings(tenant_id,legal_entity_id,environment_id,system_id) WHERE valid_to IS NULL;
CREATE TRIGGER target_bindings_close_only BEFORE UPDATE OR DELETE ON app.connector_bindings FOR EACH ROW EXECUTE FUNCTION app.registry_edge_close_only();

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['organisation_profile_versions','data_principal_categories','personal_data_categories','data_principals','data_principal_references','data_principal_relationships','data_principal_representatives','child_status_records','registry_purposes','registry_purpose_versions','processing_conditions','security_safeguards','registry_notices','registry_notice_versions','notice_delivery_evidence','processor_engagements','retention_rules','registry_activities','registry_activity_versions','registry_activity_links','processor_engagement_links','data_sharing_links','consent_records','consent_record_events','retention_holds','connector_bindings'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(%L))',tab,
   CASE WHEN tab IN ('data_principal_representatives','child_status_records') THEN 'registry.sensitive.read' ELSE 'registry.read' END);
  EXECUTE format('CREATE POLICY scoped_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(%L))',tab,
   CASE WHEN tab='organisation_profile_versions' THEN 'sdf.manage' WHEN tab IN ('data_principal_representatives','child_status_records') THEN 'registry.sensitive.write' ELSE 'registry.write' END);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['data_principals','data_principal_relationships','data_principal_representatives','registry_purpose_versions','registry_notice_versions','processor_engagements','retention_rules','registry_activities','registry_activity_versions','registry_activity_links','processor_engagement_links','data_sharing_links','consent_records','retention_holds','connector_bindings','data_principal_categories','personal_data_categories'] LOOP
  EXECUTE format('CREATE POLICY scoped_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(%L)) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id))',tab,
   CASE WHEN tab='data_principal_representatives' THEN 'registry.sensitive.write' ELSE 'registry.write' END);
 END LOOP;
 EXECUTE 'GRANT SELECT,INSERT ON app.organisation_profile_versions,app.data_principal_categories,app.personal_data_categories,app.data_principals,app.data_principal_references,app.data_principal_relationships,app.data_principal_representatives,app.child_status_records,app.registry_purposes,app.registry_purpose_versions,app.processing_conditions,app.security_safeguards,app.registry_notices,app.registry_notice_versions,app.notice_delivery_evidence,app.processor_engagements,app.retention_rules,app.registry_activities,app.registry_activity_versions,app.registry_activity_links,app.processor_engagement_links,app.data_sharing_links,app.consent_records,app.consent_record_events,app.retention_holds,app.connector_bindings TO orvia_app,orvia_worker';
 EXECUTE 'GRANT UPDATE ON app.data_principals,app.data_principal_relationships,app.data_principal_representatives,app.registry_purpose_versions,app.registry_notice_versions,app.processor_engagements,app.retention_rules,app.registry_activities,app.registry_activity_versions,app.registry_activity_links,app.processor_engagement_links,app.data_sharing_links,app.consent_records,app.retention_holds,app.connector_bindings,app.data_principal_categories,app.personal_data_categories TO orvia_app,orvia_worker';
END $$;
-- The published notice is what a Data Principal is shown in the Privacy Centre.
CREATE POLICY portal_notice_read ON app.registry_notice_versions FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
 AND current_setting('orvia.actor_domain',true)='PRINCIPAL' AND app.has_capability('consent.own.read') AND status IN ('PUBLISHED','SUPERSEDED'));
CREATE POLICY portal_notice_parent ON app.registry_notices FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
 AND current_setting('orvia.actor_domain',true)='PRINCIPAL' AND app.has_capability('consent.own.read'));
REVOKE ALL ON app.organisation_profile_versions,app.data_principal_categories,app.personal_data_categories,app.data_principals,app.data_principal_references,app.data_principal_relationships,app.data_principal_representatives,app.child_status_records,app.registry_purposes,app.registry_purpose_versions,app.processing_conditions,app.security_safeguards,app.registry_notices,app.registry_notice_versions,app.notice_delivery_evidence,app.processor_engagements,app.retention_rules,app.registry_activities,app.registry_activity_versions,app.registry_activity_links,app.processor_engagement_links,app.data_sharing_links,app.consent_records,app.consent_record_events,app.retention_holds,app.connector_bindings FROM PUBLIC;
