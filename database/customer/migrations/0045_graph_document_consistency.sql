-- Keep the JSON read model bound to the protected relational provenance.
-- Existing historical rows remain readable; every new write/update must agree.
CREATE FUNCTION app.graph_document_consistency_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.document->>'id' IS DISTINCT FROM NEW.id::text
  OR NEW.document->>'system_id' IS DISTINCT FROM NEW.system_id::text
  OR NEW.document->>'provenance' IS DISTINCT FROM NEW.provenance
  OR NULLIF(NEW.document->>'source_observation_id','') IS DISTINCT FROM NEW.source_observation_id::text
  OR (NEW.document->>'last_seen_at')::timestamptz IS DISTINCT FROM NEW.last_seen_at
  OR (NEW.document->>'fresh_until')::timestamptz IS DISTINCT FROM NEW.fresh_until
 THEN RAISE EXCEPTION 'Graph document disagrees with protected provenance columns' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER graph_document_consistency BEFORE INSERT OR UPDATE ON app.data_assets
 FOR EACH ROW EXECUTE FUNCTION app.graph_document_consistency_guard();
REVOKE ALL ON FUNCTION app.graph_document_consistency_guard FROM PUBLIC;
