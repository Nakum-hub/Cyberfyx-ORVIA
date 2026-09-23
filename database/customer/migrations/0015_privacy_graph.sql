-- WP04 / M03 Privacy Control Graph.
-- Relational inventory over PostgreSQL, not a second graph database. Every edge
-- is a typed, foreign-key-backed row inside one tenant scope; there is no
-- arbitrary JSON edge that could reference a node outside the caller's scope.

CREATE TABLE app.data_assets (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 system_id uuid NOT NULL,parent_id uuid,
 kind text NOT NULL CHECK(kind IN ('DATASET','FIELD','DERIVED_COPY','EXPORT','BACKUP_COPY')),
 provenance text NOT NULL CHECK(provenance IN ('ASSERTED','OBSERVED')),
 review_state text NOT NULL DEFAULT 'UNREVIEWED' CHECK(review_state IN ('UNREVIEWED','IN_REVIEW','ACCEPTED','REJECTED')),
 owner_actor_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 valid_from timestamptz NOT NULL,valid_to timestamptz,
 last_seen_at timestamptz,fresh_until timestamptz,
 tombstoned_at timestamptz,tombstone_reason text,
 document jsonb NOT NULL,
 search tsvector,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,parent_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id),
 CHECK(parent_id IS NULL OR parent_id<>id),
 -- Only a real reading carries an observation time and a freshness bound.
 CHECK((provenance='OBSERVED')=(last_seen_at IS NOT NULL AND fresh_until IS NOT NULL)),
 CHECK(fresh_until IS NULL OR fresh_until>last_seen_at),
 CHECK(valid_to IS NULL OR valid_to>valid_from),
 -- A tombstone must always carry its justification; neither half may stand alone.
 CHECK((tombstoned_at IS NULL)=(tombstone_reason IS NULL)));
CREATE INDEX data_assets_by_system ON app.data_assets(tenant_id,legal_entity_id,environment_id,system_id);
CREATE INDEX data_assets_search ON app.data_assets USING GIN(search);

-- Category assignment is an explicit reviewed relationship. A field name alone
-- never implies a category, and a category never implies a purpose.
CREATE TABLE app.data_asset_categories (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,asset_id uuid NOT NULL,
 code text NOT NULL CHECK(code IN ('CONTACT_DETAILS','IDENTIFIERS','MARKETING_PREFERENCES','ORDER_RECORDS','SUPPORT_NOTES')),
 basis text NOT NULL,
 review_state text NOT NULL DEFAULT 'UNREVIEWED' CHECK(review_state IN ('UNREVIEWED','IN_REVIEW','ACCEPTED','REJECTED')),
 assigned_by uuid NOT NULL,assigned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,asset_id,code),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id));

CREATE TABLE app.processing_activities (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 purpose_id uuid NOT NULL,
 lawful_condition text NOT NULL CHECK(lawful_condition IN ('AFFIRMATIVE_MARKETING_CONSENT','APPROVED_SYNTHETIC_ORDER_SERVICE')),
 review_state text NOT NULL DEFAULT 'UNREVIEWED' CHECK(review_state IN ('UNREVIEWED','IN_REVIEW','ACCEPTED','REJECTED')),
 owner_actor_id uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 document jsonb NOT NULL,search tsvector,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX activities_by_purpose ON app.processing_activities(tenant_id,legal_entity_id,environment_id,purpose_id);
CREATE INDEX activities_search ON app.processing_activities USING GIN(search);

-- Typed edges. Each relationship_type fixes which endpoint columns are present,
-- and every endpoint column is a scope-composite foreign key, so an edge cannot
-- silently point at another tenant's node or at a node that does not exist.
CREATE TABLE app.graph_relationships (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 relationship_type text NOT NULL CHECK(relationship_type IN ('ASSET_STORED_IN_SYSTEM','ASSET_PROCESSED_BY_ACTIVITY','ACTIVITY_SERVES_PURPOSE','ASSET_COPIED_TO')),
 from_asset_id uuid,from_activity_id uuid,
 to_asset_id uuid,to_activity_id uuid,to_system_id uuid,to_purpose_id uuid,
 provenance text NOT NULL CHECK(provenance IN ('ASSERTED','OBSERVED')),
 review_state text NOT NULL DEFAULT 'UNREVIEWED' CHECK(review_state IN ('UNREVIEWED','IN_REVIEW','ACCEPTED','REJECTED')),
 confidence_basis text NOT NULL,owner_actor_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 valid_from timestamptz NOT NULL,valid_to timestamptz,last_seen_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,from_asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,from_activity_id) REFERENCES app.processing_activities(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,to_asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,to_activity_id) REFERENCES app.processing_activities(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,to_system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,to_purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 CHECK((provenance='OBSERVED')=(last_seen_at IS NOT NULL)),
 CHECK(valid_to IS NULL OR valid_to>valid_from),
 CHECK(CASE relationship_type
  WHEN 'ASSET_STORED_IN_SYSTEM' THEN from_asset_id IS NOT NULL AND from_activity_id IS NULL AND to_system_id IS NOT NULL AND to_asset_id IS NULL AND to_activity_id IS NULL AND to_purpose_id IS NULL
  WHEN 'ASSET_PROCESSED_BY_ACTIVITY' THEN from_asset_id IS NOT NULL AND from_activity_id IS NULL AND to_activity_id IS NOT NULL AND to_asset_id IS NULL AND to_system_id IS NULL AND to_purpose_id IS NULL
  WHEN 'ACTIVITY_SERVES_PURPOSE' THEN from_activity_id IS NOT NULL AND from_asset_id IS NULL AND to_purpose_id IS NOT NULL AND to_asset_id IS NULL AND to_activity_id IS NULL AND to_system_id IS NULL
  WHEN 'ASSET_COPIED_TO' THEN from_asset_id IS NOT NULL AND from_activity_id IS NULL AND to_asset_id IS NOT NULL AND to_asset_id<>from_asset_id AND to_activity_id IS NULL AND to_system_id IS NULL AND to_purpose_id IS NULL
  END));
CREATE INDEX relationships_from_asset ON app.graph_relationships(tenant_id,legal_entity_id,environment_id,from_asset_id) WHERE from_asset_id IS NOT NULL;
CREATE INDEX relationships_from_activity ON app.graph_relationships(tenant_id,legal_entity_id,environment_id,from_activity_id) WHERE from_activity_id IS NOT NULL;
CREATE INDEX relationships_to_asset ON app.graph_relationships(tenant_id,legal_entity_id,environment_id,to_asset_id) WHERE to_asset_id IS NOT NULL;
CREATE INDEX relationships_to_activity ON app.graph_relationships(tenant_id,legal_entity_id,environment_id,to_activity_id) WHERE to_activity_id IS NOT NULL;
CREATE INDEX relationships_to_system ON app.graph_relationships(tenant_id,legal_entity_id,environment_id,to_system_id) WHERE to_system_id IS NOT NULL;
CREATE INDEX relationships_to_purpose ON app.graph_relationships(tenant_id,legal_entity_id,environment_id,to_purpose_id) WHERE to_purpose_id IS NOT NULL;

-- Historical links stay resolvable after a justified payload deletion. The row,
-- its identity and its edges survive; only the personal payload is cleared, and
-- the tombstone states why. This is deliberate erasure, not an invisible rewrite.
CREATE FUNCTION app.tombstone_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.tombstoned_at IS NOT NULL AND (NEW.tombstoned_at IS DISTINCT FROM OLD.tombstoned_at OR NEW.tombstone_reason IS DISTINCT FROM OLD.tombstone_reason)
  THEN RAISE EXCEPTION 'A recorded tombstone cannot be rewritten or lifted' USING ERRCODE='23514'; END IF;
 IF NEW.tombstoned_at IS NOT NULL AND NEW.document->>'name' IS DISTINCT FROM '[REDACTED]'
  THEN RAISE EXCEPTION 'A tombstoned asset must not retain its personal payload' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER tombstone_append_only BEFORE UPDATE ON app.data_assets FOR EACH ROW EXECUTE FUNCTION app.tombstone_is_append_only();
REVOKE ALL ON FUNCTION app.tombstone_is_append_only FROM PUBLIC;

-- Relationships outlive the payload they described, so old evidence still resolves.
CREATE FUNCTION app.graph_edges_are_not_deletable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Graph history is closed by valid_to, never deleted' USING ERRCODE='23514'; END $$;
CREATE TRIGGER relationships_not_deletable BEFORE DELETE ON app.graph_relationships FOR EACH ROW EXECUTE FUNCTION app.graph_edges_are_not_deletable();
CREATE TRIGGER assets_not_deletable BEFORE DELETE ON app.data_assets FOR EACH ROW EXECUTE FUNCTION app.graph_edges_are_not_deletable();
REVOKE ALL ON FUNCTION app.graph_edges_are_not_deletable FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['data_assets','data_asset_categories','processing_activities','graph_relationships'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_graph_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''graph.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_graph_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''graph.write''))',tab);
 END LOOP;
END $$;
CREATE POLICY scoped_graph_update ON app.data_assets FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.write'));
CREATE POLICY scoped_relationship_update ON app.graph_relationships FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.write'));
-- Category assignments describe the payload, so a justified erasure removes them.
-- Assets and edges are never deletable; only this attribute table is.
CREATE POLICY scoped_category_delete ON app.data_asset_categories FOR DELETE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.write'));
GRANT SELECT,INSERT ON app.data_assets,app.data_asset_categories,app.processing_activities,app.graph_relationships TO orvia_app;
GRANT UPDATE ON app.data_assets,app.graph_relationships TO orvia_app;
GRANT DELETE ON app.data_asset_categories TO orvia_app;
REVOKE ALL ON app.data_assets,app.data_asset_categories,app.processing_activities,app.graph_relationships FROM PUBLIC;
