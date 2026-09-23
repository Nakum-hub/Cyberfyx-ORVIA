-- Scope is carried in every reference; no cross-environment consent sharing.
CREATE TABLE app.purpose_versions (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, version_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 code text NOT NULL CHECK(code IN ('promotional_marketing','order_service_demo')),
 status text NOT NULL CHECK(status IN ('DRAFT','PUBLISHED','SUPERSEDED')), document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(version_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));
CREATE TABLE app.notice_versions (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, version_id uuid NOT NULL, purpose_id uuid NOT NULL, document jsonb NOT NULL,
 published_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(tenant_id,legal_entity_id,environment_id,version_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.systems (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 connector text NOT NULL CHECK(connector IN ('SYNTHETIC_CRM','ORVIA_REST_SIMULATOR','LEGACY_MANUAL')),
 document jsonb NOT NULL, PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));
CREATE TABLE app.policy_versions (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, version_id uuid NOT NULL, purpose_id uuid NOT NULL, notice_version_id uuid NOT NULL,
 author_id uuid NOT NULL, digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 status text NOT NULL CHECK(status IN ('DRAFT','PUBLISHED','SUPERSEDED')), document jsonb NOT NULL, published_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(tenant_id,legal_entity_id,environment_id,version_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,notice_version_id) REFERENCES app.notice_versions(tenant_id,legal_entity_id,environment_id,version_id));
CREATE UNIQUE INDEX one_current_policy ON app.policy_versions(tenant_id,legal_entity_id,environment_id,purpose_id) WHERE status='PUBLISHED';
CREATE TABLE app.policy_systems (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, policy_version_id uuid NOT NULL, system_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(tenant_id,legal_entity_id,environment_id,policy_version_id,system_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,policy_version_id) REFERENCES app.policy_versions(tenant_id,legal_entity_id,environment_id,version_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.target_mappings (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, principal_id uuid NOT NULL, purpose_id uuid NOT NULL, system_id uuid NOT NULL,
 target_subject_reference text NOT NULL CHECK(target_subject_reference ~ '^syn_[a-z0-9_]{1,80}$'),
 target_generation bigint NOT NULL DEFAULT 1 CHECK(target_generation>0),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id,system_id),
 UNIQUE(system_id,target_subject_reference),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.publication_proofs (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, actor_id uuid NOT NULL, session_id uuid NOT NULL, policy_id uuid NOT NULL,
 version_id uuid NOT NULL, digest text NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,policy_id) REFERENCES app.policy_versions(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.policy_approvals (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, policy_version_id uuid NOT NULL, author_id uuid NOT NULL, reviewer_id uuid NOT NULL,
 digest text NOT NULL, proof_id uuid NOT NULL, decided_at timestamptz NOT NULL DEFAULT now(), CHECK(author_id<>reviewer_id),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(policy_version_id), UNIQUE(proof_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,policy_version_id) REFERENCES app.policy_versions(tenant_id,legal_entity_id,environment_id,version_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,proof_id) REFERENCES app.publication_proofs(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.consent_aggregates (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 principal_id uuid NOT NULL, purpose_id uuid NOT NULL, epoch bigint NOT NULL DEFAULT 0 CHECK(epoch BETWEEN 0 AND 9007199254740991),
 state text NOT NULL DEFAULT 'NOT_GIVEN' CHECK(state IN ('NOT_GIVEN','GRANTED','WITHDRAWN')),
 notice_version_id uuid, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,legal_entity_id,principal_id,purpose_id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,notice_version_id) REFERENCES app.notice_versions(tenant_id,legal_entity_id,environment_id,version_id));
CREATE TABLE app.consent_interactions (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, principal_id uuid NOT NULL, purpose_id uuid NOT NULL, actor_id uuid NOT NULL,
 expected_epoch bigint NOT NULL, notice_version_id uuid NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.consent_events (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, principal_id uuid NOT NULL, purpose_id uuid NOT NULL, actor_id uuid NOT NULL,
 epoch bigint NOT NULL CHECK(epoch>0), state text NOT NULL CHECK(state IN ('GRANTED','WITHDRAWN')),
 interaction_id uuid NOT NULL, notice_version_id uuid, policy_version_id uuid NOT NULL,
 receipt_id uuid NOT NULL, receipt jsonb NOT NULL, accepted_at timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id,epoch),
 UNIQUE(receipt_id), UNIQUE(interaction_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id) REFERENCES app.consent_aggregates(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,policy_version_id) REFERENCES app.policy_versions(tenant_id,legal_entity_id,environment_id,version_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,interaction_id) REFERENCES app.consent_interactions(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.workflows (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, event_id uuid NOT NULL, principal_id uuid NOT NULL, purpose_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'ACCEPTED' CHECK(state IN ('ACCEPTED','RUNNING','NEEDS_ATTENTION','COMPLETED')),
 accepted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(event_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,event_id) REFERENCES app.consent_events(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE app.outbox_events (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, event_id uuid NOT NULL, principal_id uuid NOT NULL, purpose_id uuid NOT NULL,
 workflow_id uuid NOT NULL, created_at timestamptz NOT NULL, dispatched_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(event_id), UNIQUE(workflow_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,event_id) REFERENCES app.consent_events(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,workflow_id) REFERENCES app.workflows(tenant_id,legal_entity_id,environment_id,id));

-- Publication can change status/timestamp, never the version content or bindings.
CREATE FUNCTION app.immutable_configuration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'status'-'published_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'published_at') THEN
  RAISE EXCEPTION 'Configuration version is immutable' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='policy_versions' AND NOT(OLD.status='DRAFT' AND NEW.status='PUBLISHED' OR OLD.status='PUBLISHED' AND NEW.status='SUPERSEDED') THEN
  RAISE EXCEPTION 'Invalid publication transition' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER immutable BEFORE UPDATE ON app.purpose_versions FOR EACH ROW EXECUTE FUNCTION app.immutable_configuration();
CREATE TRIGGER immutable BEFORE UPDATE ON app.notice_versions FOR EACH ROW EXECUTE FUNCTION app.immutable_configuration();
CREATE TRIGGER immutable BEFORE UPDATE ON app.policy_versions FOR EACH ROW EXECUTE FUNCTION app.immutable_configuration();
CREATE FUNCTION app.own_principal(p uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT current_setting('orvia.actor_domain',true)='PRINCIPAL' AND p::text=current_setting('orvia.principal_id',true) $$;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['purpose_versions','notice_versions','systems','policy_versions','policy_systems','target_mappings','publication_proofs','policy_approvals','consent_aggregates','consent_interactions','consent_events','workflows','outbox_events'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['purpose_versions','notice_versions','systems','policy_versions','policy_systems','target_mappings','policy_approvals'] LOOP
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''configuration.read''))',tab);
  EXECUTE format('CREATE POLICY staff_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(%L))',tab,CASE WHEN tab='policy_approvals' THEN 'policy.publish' ELSE 'configuration.write' END);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['purpose_versions','notice_versions','policy_versions'] LOOP
  EXECUTE format('CREATE POLICY publish_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''policy.publish'')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id))',tab);
  EXECUTE format('CREATE POLICY portal_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''PRINCIPAL'' AND (app.has_capability(''consent.own.read'') OR app.has_capability(''consent.own.write'')) AND %s)',tab,CASE WHEN tab='notice_versions' THEN 'published_at IS NOT NULL' ELSE 'status IN (''PUBLISHED'',''SUPERSEDED'')' END);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['consent_aggregates','consent_interactions','consent_events','workflows','outbox_events'] LOOP
  EXECUTE format('CREATE POLICY scoped_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND ((app.own_principal(principal_id) AND app.has_capability(''consent.own.read'')) OR (current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''workflow.read''))))',tab);
  EXECUTE format('CREATE POLICY principal_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.own_principal(principal_id) AND app.has_capability(''consent.own.write''))',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['consent_aggregates','consent_interactions'] LOOP
  EXECUTE format('CREATE POLICY principal_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.own_principal(principal_id) AND app.has_capability(''consent.own.write'')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.own_principal(principal_id))',tab);
 END LOOP;
END $$;
CREATE POLICY own_proofs ON app.publication_proofs FOR ALL USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND actor_id::text=current_setting('orvia.actor_id',true) AND app.has_capability('policy.publish')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND actor_id::text=current_setting('orvia.actor_id',true) AND app.has_capability('policy.publish'));
ALTER TABLE app.request_audit DROP CONSTRAINT request_audit_operation_check;
ALTER TABLE app.request_audit ADD CHECK(operation IN ('AUTH_STAFF','AUTH_PRINCIPAL','SESSION_READ','PRINCIPAL_LIST','PRINCIPAL_CREATE','BUSINESS'));
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
