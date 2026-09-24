-- DPDP Operations extension, part 1: the Regulatory Core.
--
-- Executable DPDP behaviour is read from an approved, signed regulatory package,
-- never from loose sources. A package is vendor/product content: it carries no
-- customer personal data. What a customer decides about it (approval, its
-- applicability to their facts, the impact review) is customer-local and scoped
-- like every other business record.
--
-- V1 mapping (data/EXISTING_DATA_MIGRATION_AND_BACKFILL.md s3). V1 has no
-- regulatory-source model: M17 obligation rules are customer-activated rule
-- packs with hours but no official citation, and nothing in V1 records a source
-- artifact, a provision, a commencement date or an applicability decision. These
-- tables are therefore new. V1 obligation rules are left exactly as they were;
-- they are not relabelled as DPDP requirements.

-- One predicate for every DPDP table: staff holding the named capability, or
-- the local DPDP runner (a MACHINE WORKER identity holding operations.execute).
CREATE FUNCTION app.capability_or_runner(cap text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT (current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability(cap))
     OR (current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute')) $$;
REVOKE ALL ON FUNCTION app.capability_or_runner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.capability_or_runner TO orvia_app,orvia_worker;

-- Shared append-only guard for evidence-bearing history.
CREATE FUNCTION app.append_only_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION '% is append-only; record a new row that supersedes it', TG_TABLE_NAME USING ERRCODE='23514'; END $$;
REVOKE ALL ON FUNCTION app.append_only_history FROM PUBLIC;

CREATE TABLE app.regulatory_packages (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 package_id uuid NOT NULL,version text NOT NULL CHECK(version ~ '^\d+\.\d+\.\d+$'),
 previous_version text CHECK(previous_version IS NULL OR previous_version ~ '^\d+\.\d+\.\d+$'),
 distribution text NOT NULL CHECK(distribution IN ('PRODUCTION','TEST_FIXTURE')),
 effective_from timestamptz NOT NULL,
 signing_key_id uuid NOT NULL,signature text NOT NULL,package_digest text NOT NULL CHECK(package_digest ~ '^[a-f0-9]{64}$'),
 claims jsonb NOT NULL,diff jsonb NOT NULL,
 state text NOT NULL DEFAULT 'IMPORTED' CHECK(state IN ('IMPORTED','APPROVED','REJECTED')),
 imported_at timestamptz NOT NULL DEFAULT clock_timestamp(),imported_by uuid NOT NULL,
 decided_at timestamptz,decided_by uuid,decision_note text,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,version),
 UNIQUE(tenant_id,legal_entity_id,environment_id,package_digest),
 CHECK((state='IMPORTED')=(decided_at IS NULL)),
 CHECK((decided_at IS NULL)=(decided_by IS NULL) AND (decided_at IS NULL)=(decision_note IS NULL)),
 -- The importer cannot approve its own import: maker-checker on legal behaviour.
 CHECK(decided_by IS NULL OR decided_by<>imported_by));
-- A package's signed content is fixed; only the approval decision is recorded, once.
CREATE FUNCTION app.regulatory_package_decision_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'state'-'decided_at'-'decided_by'-'decision_note') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'decided_at'-'decided_by'-'decision_note')
  THEN RAISE EXCEPTION 'A regulatory package is immutable once imported' USING ERRCODE='23514'; END IF;
 IF OLD.state<>'IMPORTED' THEN RAISE EXCEPTION 'A package decision is recorded once' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER package_decision_only BEFORE UPDATE ON app.regulatory_packages FOR EACH ROW EXECUTE FUNCTION app.regulatory_package_decision_once();
CREATE TRIGGER package_not_deletable BEFORE DELETE ON app.regulatory_packages FOR EACH ROW EXECUTE FUNCTION app.append_only_history();
REVOKE ALL ON FUNCTION app.regulatory_package_decision_once FROM PUBLIC;

-- Normalised, queryable projections of the signed claims. Written once at import.
CREATE TABLE app.regulatory_sources (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 package_row_id uuid NOT NULL,source_id text NOT NULL CHECK(source_id ~ '^[A-Z0-9][A-Z0-9_.-]{1,80}$'),
 source_type text NOT NULL,publisher text NOT NULL,title text NOT NULL,official_url text NOT NULL,
 notification_reference text,publication_date date,artifact_digest text CHECK(artifact_digest IS NULL OR artifact_digest ~ '^[a-f0-9]{64}$'),
 retrieved_at timestamptz,verification text NOT NULL CHECK(verification IN ('ARTIFACT_HASHED','NOT_RETRIEVED','TEST_FIXTURE')),
 supersedes text,corrects text,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,package_row_id,source_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id),
 CHECK((verification='ARTIFACT_HASHED')=(artifact_digest IS NOT NULL AND retrieved_at IS NOT NULL)));

CREATE TABLE app.regulatory_provisions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 package_row_id uuid NOT NULL,provision_id text NOT NULL CHECK(provision_id ~ '^[A-Z0-9][A-Za-z0-9_.()-]{1,80}$'),
 source_id text NOT NULL,reference text NOT NULL,version integer NOT NULL CHECK(version>0),
 published_on date,commences_on date,
 status text NOT NULL CHECK(status IN ('PUBLISHED','NOT_COMMENCED','IN_FORCE','AMENDED','SUPERSEDED')),
 commencement_basis text NOT NULL,text_digest text CHECK(text_digest IS NULL OR text_digest ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,package_row_id,provision_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id,source_id) REFERENCES app.regulatory_sources(tenant_id,legal_entity_id,environment_id,package_row_id,source_id));

CREATE TABLE app.regulatory_requirements (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 package_row_id uuid NOT NULL,requirement_id text NOT NULL CHECK(requirement_id ~ '^DPDP-[A-Z0-9-]{2,60}$'),
 version integer NOT NULL CHECK(version>0),title text NOT NULL,
 provision_ids text[] NOT NULL CHECK(cardinality(provision_ids)>0),
 effective_from date NOT NULL,modules text[] NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,package_row_id,requirement_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX requirements_by_id ON app.regulatory_requirements(tenant_id,legal_entity_id,environment_id,requirement_id,version);

-- Applicability is a recorded decision with its inputs and trace, never a
-- computed boolean nobody can explain afterwards.
CREATE TABLE app.applicability_decisions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 package_row_id uuid NOT NULL,requirement_id text NOT NULL,requirement_version integer NOT NULL,
 scope_kind text NOT NULL CHECK(scope_kind IN ('ORGANISATION','ACTIVITY')),scope_id uuid,
 result text NOT NULL CHECK(result IN ('APPLICABLE','NOT_APPLICABLE','UNRESOLVED','NOT_YET_IN_FORCE','SUPERSEDED','EXEMPT_WITH_RECORDED_BASIS')),
 inputs jsonb NOT NULL,trace jsonb NOT NULL,expression_digest text NOT NULL CHECK(expression_digest ~ '^[a-f0-9]{64}$'),
 as_of timestamptz NOT NULL,evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp(),actor_id uuid NOT NULL,
 override_of uuid,override_basis text,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id,requirement_id) REFERENCES app.regulatory_requirements(tenant_id,legal_entity_id,environment_id,package_row_id,requirement_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,override_of) REFERENCES app.applicability_decisions(tenant_id,legal_entity_id,environment_id,id),
 CHECK((scope_kind='ORGANISATION')=(scope_id IS NULL)),
 -- An override is only ever an exemption with its basis stated.
 CHECK((override_of IS NULL)=(override_basis IS NULL)),
 CHECK(override_of IS NULL OR result='EXEMPT_WITH_RECORDED_BASIS'));
CREATE INDEX decisions_by_requirement ON app.applicability_decisions(tenant_id,legal_entity_id,environment_id,requirement_id,evaluated_at);
CREATE TRIGGER decisions_append_only BEFORE UPDATE OR DELETE ON app.applicability_decisions FOR EACH ROW EXECUTE FUNCTION app.append_only_history();

-- Impact review items produced when a package is imported against the prior one.
CREATE TABLE app.regulatory_impacts (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 package_row_id uuid NOT NULL,requirement_id text NOT NULL,
 change text NOT NULL CHECK(change IN ('ADDED','CHANGED','REMOVED')),
 affected_kind text NOT NULL CHECK(affected_kind IN ('ACTIVITY','NOTICE','CONDITION','CONSENT','RIGHTS','RETENTION','PROCESSOR','SAFEGUARD','BREACH','SDF','CHILD','ORGANISATION','UNRESOLVED')),
 affected_id uuid,reason text NOT NULL,
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','ACTIONED','NOT_AFFECTED')),
 reviewed_at timestamptz,reviewed_by uuid,review_note text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_row_id) REFERENCES app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='OPEN')=(reviewed_at IS NULL)),
 CHECK((reviewed_at IS NULL)=(reviewed_by IS NULL) AND (reviewed_at IS NULL)=(review_note IS NULL)));
CREATE FUNCTION app.regulatory_impact_review_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'state'-'reviewed_at'-'reviewed_by'-'review_note') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'reviewed_at'-'reviewed_by'-'review_note')
  OR OLD.state<>'OPEN' THEN RAISE EXCEPTION 'An impact item is reviewed once and never rewritten' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER impact_review_once BEFORE UPDATE ON app.regulatory_impacts FOR EACH ROW EXECUTE FUNCTION app.regulatory_impact_review_once();
REVOKE ALL ON FUNCTION app.regulatory_impact_review_once FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['regulatory_packages','regulatory_sources','regulatory_provisions','regulatory_requirements','applicability_decisions','regulatory_impacts'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(''registry.read''))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['regulatory_packages','regulatory_sources','regulatory_provisions','regulatory_requirements'] LOOP
  EXECUTE format('CREATE POLICY scoped_import ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''regulatory.manage''))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['applicability_decisions','regulatory_impacts'] LOOP
  EXECUTE format('CREATE POLICY scoped_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(''registry.write''))',tab);
 END LOOP;
END $$;
CREATE POLICY scoped_decide ON app.regulatory_packages FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('regulatory.manage'));
CREATE POLICY scoped_review ON app.regulatory_impacts FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.write'));
GRANT SELECT,INSERT ON app.regulatory_packages,app.regulatory_sources,app.regulatory_provisions,app.regulatory_requirements,app.applicability_decisions,app.regulatory_impacts TO orvia_app;
GRANT UPDATE ON app.regulatory_packages,app.regulatory_impacts TO orvia_app;
GRANT USAGE ON SCHEMA app TO orvia_worker;
GRANT SELECT ON app.regulatory_packages,app.regulatory_sources,app.regulatory_provisions,app.regulatory_requirements,app.applicability_decisions,app.regulatory_impacts TO orvia_worker;
GRANT INSERT ON app.regulatory_impacts TO orvia_worker;
REVOKE ALL ON app.regulatory_packages,app.regulatory_sources,app.regulatory_provisions,app.regulatory_requirements,app.applicability_decisions,app.regulatory_impacts FROM PUBLIC;
