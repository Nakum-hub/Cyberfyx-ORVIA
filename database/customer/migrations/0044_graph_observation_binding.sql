-- A new OBSERVED graph asset must be bound to a real, scoped catalog read.
-- Historical observation-shaped rows remain readable but are not backfilled or
-- silently promoted; their provenance lacks this binding.
ALTER TABLE app.data_assets ADD COLUMN source_observation_id uuid;
ALTER TABLE app.data_assets ADD CONSTRAINT data_asset_catalog_source_fk
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,source_observation_id)
 REFERENCES app.catalog_discovery_observations(tenant_id,legal_entity_id,environment_id,id);
CREATE UNIQUE INDEX data_asset_catalog_source_once ON app.data_assets
 (tenant_id,legal_entity_id,environment_id,source_observation_id)
 WHERE source_observation_id IS NOT NULL;

CREATE FUNCTION app.graph_observation_binding_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_row record;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (NEW.provenance,NEW.source_observation_id,NEW.last_seen_at,NEW.fresh_until)
   IS DISTINCT FROM (OLD.provenance,OLD.source_observation_id,OLD.last_seen_at,OLD.fresh_until)
   THEN RAISE EXCEPTION 'Graph provenance and source are immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.provenance='ASSERTED' THEN
  IF NEW.source_observation_id IS NOT NULL THEN
   RAISE EXCEPTION 'A declaration cannot borrow an observation' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.source_observation_id IS NULL THEN
  RAISE EXCEPTION 'Observed asset requires an independent source read' USING ERRCODE='23514'; END IF;
 SELECT o.state,o.observed_at,o.digest,t.system_id,t.state AS target_state,j.state AS job_state,j.next_run_at
  INTO source_row FROM app.catalog_discovery_observations o
  JOIN app.catalog_discovery_targets t ON (t.tenant_id,t.legal_entity_id,t.environment_id,t.id)=
   (o.tenant_id,o.legal_entity_id,o.environment_id,o.target_id)
  JOIN app.catalog_discovery_jobs j ON (j.tenant_id,j.legal_entity_id,j.environment_id,j.target_id)=
   (o.tenant_id,o.legal_entity_id,o.environment_id,o.target_id)
  WHERE (o.tenant_id,o.legal_entity_id,o.environment_id,o.id)=
   (NEW.tenant_id,NEW.legal_entity_id,NEW.environment_id,NEW.source_observation_id);
 IF NOT FOUND OR source_row.state<>'OBSERVED_METADATA' OR source_row.digest IS NULL
  OR source_row.system_id<>NEW.system_id OR source_row.target_state<>'APPROVED'
  OR source_row.job_state<>'READY' OR source_row.next_run_at<=clock_timestamp()
  OR source_row.observed_at+interval '1 hour'<=clock_timestamp()
  OR NEW.last_seen_at IS DISTINCT FROM source_row.observed_at
  OR NEW.fresh_until>source_row.next_run_at
  OR NEW.fresh_until>source_row.observed_at+interval '1 hour'
 THEN RAISE EXCEPTION 'Catalog source is not a current matching read' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER data_asset_observation_binding BEFORE INSERT OR UPDATE ON app.data_assets
 FOR EACH ROW EXECUTE FUNCTION app.graph_observation_binding_guard();
REVOKE ALL ON FUNCTION app.graph_observation_binding_guard FROM PUBLIC;

CREATE FUNCTION app.graph_edge_observation_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' AND NEW.provenance='OBSERVED' THEN
  RAISE EXCEPTION 'Observed relationship requires a source read path' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND (NEW.provenance,NEW.last_seen_at) IS DISTINCT FROM (OLD.provenance,OLD.last_seen_at) THEN
  RAISE EXCEPTION 'Relationship provenance is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER graph_edge_observation_guard BEFORE INSERT OR UPDATE ON app.graph_relationships
 FOR EACH ROW EXECUTE FUNCTION app.graph_edge_observation_guard();
REVOKE ALL ON FUNCTION app.graph_edge_observation_guard FROM PUBLIC;
