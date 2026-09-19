-- WP25 / M27 Licensing and M28 Entitlements.
-- A licence is stored exactly as it was signed. It is never edited, and its
-- entitlements are recorded as rows so a query can ask what was licensed rather
-- than parsing a document.

CREATE TABLE app.licences (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 licence_id uuid NOT NULL,installation_id uuid NOT NULL,
 edition text NOT NULL CHECK(edition IN ('FOUNDATION','CONTROL','ENTERPRISE')),
 valid_from timestamptz NOT NULL,valid_to timestamptz NOT NULL,
 signing_key_id uuid NOT NULL,signature text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 imported_at timestamptz NOT NULL DEFAULT clock_timestamp(),imported_by uuid NOT NULL,
 claims jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 -- The same licence cannot be imported twice; a replay is refused, not stacked.
 UNIQUE(tenant_id,legal_entity_id,environment_id,licence_id),
 CHECK(valid_to>valid_from));
CREATE UNIQUE INDEX one_active_licence_per_scope ON app.licences(tenant_id,legal_entity_id,environment_id) WHERE active;

CREATE TABLE app.licence_entitlements (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 licence_row_id uuid NOT NULL,code text NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,licence_row_id,code),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,licence_row_id) REFERENCES app.licences(tenant_id,legal_entity_id,environment_id,id),
 -- Belt and braces against the one thing a licence must never carry.
 CHECK(code NOT IN ('AI_COPILOT','AI_DISCOVERY','AI_POLICY_BUILDER','VENDOR_REMOTE_ACCESS','STAFF_DIRECTORY_SYNC','PROACTIVE_DIAGNOSTICS','CUSTOMER_RUNTIME_REPLICATION')));

-- A licence is a record of what was bought. It is never edited after import;
-- a change of terms is a new licence with its own identity and signature.
CREATE FUNCTION app.licence_is_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'A licence record is never deleted' USING ERRCODE='23514'; END IF;
 IF NEW.claims IS DISTINCT FROM OLD.claims OR NEW.signature IS DISTINCT FROM OLD.signature
   OR NEW.licence_id IS DISTINCT FROM OLD.licence_id OR NEW.valid_to IS DISTINCT FROM OLD.valid_to
   THEN RAISE EXCEPTION 'A licence cannot be edited after import' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER licence_immutable BEFORE UPDATE OR DELETE ON app.licences FOR EACH ROW EXECUTE FUNCTION app.licence_is_immutable();
REVOKE ALL ON FUNCTION app.licence_is_immutable FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['licences','licence_entitlements'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_licence_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''licence.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_licence_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''licence.manage''))',tab);
 END LOOP;
END $$;
CREATE POLICY scoped_licence_supersede ON app.licences FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('licence.manage'));
GRANT SELECT,INSERT ON app.licences,app.licence_entitlements TO orvia_app;
GRANT UPDATE ON app.licences TO orvia_app;
REVOKE ALL ON app.licences,app.licence_entitlements FROM PUBLIC;
