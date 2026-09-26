-- EX08 third-party lifecycle: processor agreements with restrictions, risk
-- tiers driving reassessment, and scoped supplier questionnaire links.
-- An agreement records what was agreed; whether processing stays inside it is
-- derived from recorded engagements, never assumed. A supplier's answer is an
-- attestation until a staff member confirms it.
CREATE TABLE app.processor_agreements (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, processor_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('DPA','MSA','SCC','NDA','OTHER')),
 reference text NOT NULL, signed_at timestamptz NOT NULL, effective_from timestamptz NOT NULL, expires_at timestamptz,
 allowed_purpose_ids uuid[] NOT NULL DEFAULT '{}', allowed_regions text[] NOT NULL DEFAULT '{}',
 subprocessors_allowed boolean NOT NULL, onward_transfer_allowed boolean NOT NULL,
 evidence_reference text NOT NULL, supersedes_id uuid,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','TERMINATED')), terminated_at timestamptz, termination_reason text,
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processor_id) REFERENCES app.processors(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,supersedes_id) REFERENCES app.processor_agreements(tenant_id,legal_entity_id,environment_id,id),
 CHECK(expires_at IS NULL OR expires_at>effective_from), CHECK((status='TERMINATED')=(terminated_at IS NOT NULL)));
CREATE UNIQUE INDEX processor_agreement_superseded_once ON app.processor_agreements(tenant_id,legal_entity_id,environment_id,supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE TABLE app.processor_tiers (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, processor_id uuid NOT NULL, sequence bigint GENERATED ALWAYS AS IDENTITY,
 tier text NOT NULL CHECK(tier IN ('LOW','MEDIUM','HIGH','CRITICAL')), reassessment_interval_days integer NOT NULL CHECK(reassessment_interval_days BETWEEN 30 AND 1095),
 reason text NOT NULL, recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,processor_id) REFERENCES app.processors(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX processor_tier_latest ON app.processor_tiers(tenant_id,legal_entity_id,environment_id,processor_id,sequence DESC);
CREATE TABLE app.supplier_links (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, assessment_id uuid NOT NULL, token_digest text NOT NULL UNIQUE CHECK(token_digest ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL, revoked_at timestamptz, revoked_by uuid, revocation_reason text, last_used_at timestamptz,
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,assessment_id) REFERENCES app.impact_assessments(tenant_id,legal_entity_id,environment_id,id),
 CHECK(expires_at<=created_at+interval '31 days'), CHECK((revoked_at IS NULL)=(revoked_by IS NULL)));

ALTER TABLE app.impact_answers ADD COLUMN respondent text NOT NULL DEFAULT 'STAFF' CHECK(respondent IN ('STAFF','SUPPLIER'));

-- Agreements change only by termination; tiers and links are otherwise fixed.
CREATE FUNCTION app.third_party_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Third-party records are never deleted' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='processor_agreements' THEN
  IF (NEW.id,NEW.processor_id,NEW.kind,NEW.reference,NEW.signed_at,NEW.effective_from,NEW.expires_at,NEW.allowed_purpose_ids,NEW.allowed_regions,NEW.subprocessors_allowed,NEW.onward_transfer_allowed,NEW.evidence_reference,NEW.supersedes_id,NEW.recorded_by)
     IS DISTINCT FROM (OLD.id,OLD.processor_id,OLD.kind,OLD.reference,OLD.signed_at,OLD.effective_from,OLD.expires_at,OLD.allowed_purpose_ids,OLD.allowed_regions,OLD.subprocessors_allowed,OLD.onward_transfer_allowed,OLD.evidence_reference,OLD.supersedes_id,OLD.recorded_by)
     OR NOT (OLD.status='ACTIVE' AND NEW.status='TERMINATED')
  THEN RAISE EXCEPTION 'An agreement is changed only by terminating it' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='supplier_links' THEN
  IF (NEW.id,NEW.assessment_id,NEW.token_digest,NEW.expires_at,NEW.created_by) IS DISTINCT FROM (OLD.id,OLD.assessment_id,OLD.token_digest,OLD.expires_at,OLD.created_by)
     OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
  THEN RAISE EXCEPTION 'A supplier link is fixed once issued; it can only be used or revoked' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'Third-party history is append-only' USING ERRCODE='23514';
 END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.third_party_guard FROM PUBLIC;
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.processor_agreements FOR EACH ROW EXECUTE FUNCTION app.third_party_guard();
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.processor_tiers FOR EACH ROW EXECUTE FUNCTION app.third_party_guard();
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.supplier_links FOR EACH ROW EXECUTE FUNCTION app.third_party_guard();

-- Resolves an active link from its token digest before any scope exists. It
-- returns only what is needed to scope the supplier's transaction.
CREATE FUNCTION app.resolve_supplier_link(digest text) RETURNS TABLE(id uuid, tenant_id uuid, legal_entity_id uuid, environment_id uuid, assessment_id uuid, expires_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT l.id,l.tenant_id,l.legal_entity_id,l.environment_id,l.assessment_id,l.expires_at FROM app.supplier_links l
 WHERE l.token_digest=digest AND l.revoked_at IS NULL AND l.expires_at>clock_timestamp() $$;
REVOKE ALL ON FUNCTION app.resolve_supplier_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.resolve_supplier_link(text) TO orvia_app;
-- The assessment the current supplier actor may see, or null.
CREATE FUNCTION app.supplier_assessment() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT l.assessment_id FROM app.supplier_links l
 WHERE current_setting('orvia.actor_domain',true)='MACHINE' AND current_setting('orvia.role',true)='SUPPLIER'
   AND l.id=nullif(current_setting('orvia.actor_id',true),'')::uuid AND l.revoked_at IS NULL AND l.expires_at>clock_timestamp()
   AND l.tenant_id=nullif(current_setting('orvia.tenant_id',true),'')::uuid AND l.legal_entity_id=nullif(current_setting('orvia.legal_entity_id',true),'')::uuid
   AND l.environment_id=nullif(current_setting('orvia.environment_id',true),'')::uuid $$;
REVOKE ALL ON FUNCTION app.supplier_assessment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.supplier_assessment() TO orvia_app;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['processor_agreements','processor_tiers','supplier_links'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY third_party_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''processor.read''))',tab);
  EXECUTE format('CREATE POLICY third_party_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''processor.write''))',tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
  EXECUTE format('GRANT SELECT,INSERT ON app.%I TO orvia_app',tab);
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['processor_agreements','supplier_links'] LOOP
  EXECUTE format('CREATE POLICY third_party_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''processor.write'')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id))',tab);
  EXECUTE format('GRANT UPDATE ON app.%I TO orvia_app',tab);
 END LOOP;
END $$;
GRANT USAGE ON SEQUENCE app.processor_tiers_sequence_seq TO orvia_app;
-- The supplier actor records its use of the link, and nothing else about it.
CREATE POLICY supplier_link_use ON app.supplier_links FOR UPDATE USING(id=nullif(current_setting('orvia.actor_id',true),'')::uuid AND app.supplier_assessment()=assessment_id) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY supplier_link_self ON app.supplier_links FOR SELECT USING(id=nullif(current_setting('orvia.actor_id',true),'')::uuid AND app.supplier_assessment()=assessment_id);

-- A supplier sees exactly one draft assessment, its template, and only the answers it gave.
CREATE POLICY supplier_assessment ON app.impact_assessments FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND id=app.supplier_assessment());
CREATE POLICY supplier_template ON app.impact_templates FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
 AND id=(SELECT a.template_id FROM app.impact_assessments a WHERE a.id=app.supplier_assessment()));
CREATE POLICY supplier_answers_read ON app.impact_answers FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND assessment_id=app.supplier_assessment() AND respondent='SUPPLIER');
CREATE POLICY supplier_answers_write ON app.impact_answers FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND assessment_id=app.supplier_assessment() AND respondent='SUPPLIER' AND answered_by=nullif(current_setting('orvia.actor_id',true),'')::uuid);
-- An answer is labelled SUPPLIER exactly when a supplier link actor wrote it: staff cannot forge an attestation.
CREATE POLICY answer_respondent_matches_actor ON app.impact_answers AS RESTRICTIVE FOR INSERT
 WITH CHECK((respondent='SUPPLIER')=(current_setting('orvia.role',true)='SUPPLIER'));
