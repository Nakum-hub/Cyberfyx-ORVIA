-- Independent of 0100, so clean installs and upgrades get the same ordering.
-- BEFORE triggers run by name: this lock precedes licence_import_guard's history reads.
CREATE FUNCTION app.serialize_licence_import() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('licence-import:' || NEW.tenant_id::text || ':' || NEW.legal_entity_id::text || ':' || NEW.environment_id::text,0));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.serialize_licence_import() FROM PUBLIC;
CREATE TRIGGER a_serialize_licence_import BEFORE INSERT ON app.licences FOR EACH ROW EXECUTE FUNCTION app.serialize_licence_import();

-- Only active may change to supersede a pre-sequence licence. All signed and identity fields stay immutable,
-- including lifecycle fields added by later migrations (compare the whole record, rather than a stale field list).
CREATE OR REPLACE FUNCTION app.licence_is_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'A licence record is never deleted' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-'active') IS DISTINCT FROM (to_jsonb(OLD)-'active') THEN
  RAISE EXCEPTION 'A licence cannot be edited after import' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.licence_is_immutable() FROM PUBLIC;
