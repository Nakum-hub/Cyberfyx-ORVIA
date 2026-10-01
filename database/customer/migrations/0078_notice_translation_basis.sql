-- Eighth Schedule language drift (Act s5(3); Rule 3). A notice is published per locale, each with its own version history, so
-- nothing previously noticed when one language moved on and another did not: a Tamil notice could keep describing purposes and
-- data categories the English one had replaced, while people reading Tamil consented to the new scope. A translation may now
-- record the version it translates; the drift report (backend/domain/src/registry/notice-drift.ts) compares every current
-- locale's scope and says which locale is behind. No locale is assumed to be the original: the Act allows English or any
-- Eighth Schedule language. The column is covered by the existing content-immutability trigger (0038).
ALTER TABLE app.registry_notice_versions ADD COLUMN translates_version_id uuid;
ALTER TABLE app.registry_notice_versions ADD CONSTRAINT registry_notice_translates_fk
  FOREIGN KEY (tenant_id, legal_entity_id, environment_id, translates_version_id) REFERENCES app.registry_notice_versions(tenant_id, legal_entity_id, environment_id, id);
CREATE FUNCTION app.registry_notice_translation_basis() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
DECLARE s record;
BEGIN
 IF NEW.translates_version_id IS NULL THEN RETURN NEW; END IF;
 SELECT notice_id, locale INTO s FROM app.registry_notice_versions
  WHERE tenant_id = NEW.tenant_id AND legal_entity_id = NEW.legal_entity_id AND environment_id = NEW.environment_id AND id = NEW.translates_version_id;
 IF s.notice_id IS DISTINCT FROM NEW.notice_id OR s.locale = NEW.locale THEN
  RAISE EXCEPTION 'a translation translates another locale of the same notice' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER registry_notice_translation_basis BEFORE INSERT ON app.registry_notice_versions FOR EACH ROW EXECUTE FUNCTION app.registry_notice_translation_basis();
REVOKE ALL ON FUNCTION app.registry_notice_translation_basis() FROM PUBLIC;
