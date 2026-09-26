-- EX02 website consent management. The banner script is served by this
-- installation, not a CDN, and posts each visitor's choice back here; nothing
-- goes to a vendor. A site's origins are approved by someone other than the
-- person who added it, and only an approved origin may record consent or be
-- scanned. A banner configuration is versioned, published by someone other
-- than its author, and carries the regulatory basis of its rule. Visitor
-- consent records are pseudonymous (a random identifier held in a first-party
-- cookie) and append-only; withdrawal is a new record. They are written only
-- through a narrow function that checks the site, origin, version and choices.
CREATE TABLE app.cmp_sites (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, site_key uuid NOT NULL UNIQUE, name text NOT NULL,
 origins text[] NOT NULL CHECK(cardinality(origins) BETWEEN 1 AND 10),
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','ENABLED','DISABLED')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), approved_by uuid, approved_at timestamptz, disabled_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id), CHECK(approved_by IS NULL OR approved_by<>created_by));
CREATE TABLE app.cmp_configs (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, site_id uuid NOT NULL, version integer NOT NULL CHECK(version>0), document jsonb NOT NULL, content_digest text NOT NULL CHECK(content_digest ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','PUBLISHED','RETIRED')),
 authored_by uuid NOT NULL, authored_at timestamptz NOT NULL DEFAULT clock_timestamp(), published_by uuid, published_at timestamptz, retired_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id), UNIQUE(tenant_id,legal_entity_id,environment_id,site_id,version),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,site_id) REFERENCES app.cmp_sites(tenant_id,legal_entity_id,environment_id,id),
 CHECK(published_by IS NULL OR published_by<>authored_by));
CREATE UNIQUE INDEX cmp_config_published ON app.cmp_configs(tenant_id,legal_entity_id,environment_id,site_id) WHERE state='PUBLISHED';
CREATE TABLE app.cmp_consents (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, site_id uuid NOT NULL, visitor_id uuid NOT NULL, config_version integer NOT NULL, choices jsonb NOT NULL, gpc boolean NOT NULL,
 language text NOT NULL CHECK(language ~ '^[a-z]{2}(-[A-Z]{2})?$'), origin text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,site_id) REFERENCES app.cmp_sites(tenant_id,legal_entity_id,environment_id,id), CHECK(jsonb_typeof(choices)='object'));
CREATE INDEX cmp_consent_visitor ON app.cmp_consents(site_id,visitor_id,recorded_at DESC);
CREATE TABLE app.cmp_scans (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, site_id uuid NOT NULL, url text NOT NULL, state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','COMPLETED','FAILED')),
 requested_by uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT clock_timestamp(), attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 observed_at timestamptz, config_version integer, results jsonb, failure_code text, recorded_by uuid,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,site_id) REFERENCES app.cmp_sites(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='COMPLETED')=(results IS NOT NULL AND observed_at IS NOT NULL)), CHECK((state='FAILED')=(failure_code IS NOT NULL)));

CREATE FUNCTION app.cmp_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Website consent records are never deleted' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='cmp_consents' THEN RAISE EXCEPTION 'A consent record is never altered; withdrawal is a new record' USING ERRCODE='23514';
 ELSIF TG_TABLE_NAME='cmp_sites' THEN
  IF (NEW.id,NEW.site_key,NEW.name,NEW.origins,NEW.created_by) IS DISTINCT FROM (OLD.id,OLD.site_key,OLD.name,OLD.origins,OLD.created_by) OR OLD.state='DISABLED' OR (OLD.state='ENABLED' AND NEW.state='PENDING')
  THEN RAISE EXCEPTION 'A site keeps its origins; it is enabled once and disabled once' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='cmp_configs' THEN
  IF (NEW.id,NEW.site_id,NEW.version,NEW.document,NEW.content_digest,NEW.authored_by) IS DISTINCT FROM (OLD.id,OLD.site_id,OLD.version,OLD.document,OLD.content_digest,OLD.authored_by)
     OR NOT ((OLD.state='DRAFT' AND NEW.state='PUBLISHED') OR (OLD.state='PUBLISHED' AND NEW.state='RETIRED'))
  THEN RAISE EXCEPTION 'A banner configuration version is immutable; it is published or retired' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.site_id,NEW.url,NEW.requested_by,NEW.requested_at) IS DISTINCT FROM (OLD.id,OLD.site_id,OLD.url,OLD.requested_by,OLD.requested_at) OR OLD.state<>'QUEUED' OR NEW.attempts<OLD.attempts
  THEN RAISE EXCEPTION 'A scan is completed or failed once' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.cmp_guard FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['cmp_sites','cmp_configs','cmp_consents','cmp_scans'] LOOP
  EXECUTE format('CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.cmp_guard()',tab);
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''registry.read''))',tab);
 END LOOP;
END $$;
CREATE POLICY staff_write ON app.cmp_sites FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('registry.write') AND state='PENDING');
CREATE POLICY staff_decide ON app.cmp_sites FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND (app.has_capability('connection.enable') OR app.has_capability('registry.write'))) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY staff_write ON app.cmp_configs FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('registry.write') AND state='DRAFT');
CREATE POLICY staff_decide ON app.cmp_configs FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('operations.approve')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY staff_write ON app.cmp_scans FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('registry.write') AND state='QUEUED');
CREATE POLICY worker_read ON app.cmp_scans FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
CREATE POLICY worker_complete ON app.cmp_scans FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY worker_read ON app.cmp_sites FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
CREATE POLICY worker_read ON app.cmp_configs FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.machine_scope() AND app.has_capability('workflow.execute'));
GRANT SELECT,INSERT,UPDATE ON app.cmp_sites, app.cmp_configs, app.cmp_scans TO orvia_app;
GRANT SELECT ON app.cmp_consents TO orvia_app;
GRANT SELECT ON app.cmp_sites, app.cmp_configs TO orvia_worker;
GRANT SELECT,UPDATE ON app.cmp_scans TO orvia_worker;

-- The published banner for a site key, and the origins it may run on. Nothing else about the site is exposed.
CREATE FUNCTION app.cmp_published(key uuid) RETURNS TABLE(site_id uuid, origins text[], version integer, document jsonb, content_digest text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT s.id, s.origins, c.version, c.document, c.content_digest FROM app.cmp_sites s JOIN app.cmp_configs c ON c.tenant_id=s.tenant_id AND c.legal_entity_id=s.legal_entity_id AND c.environment_id=s.environment_id AND c.site_id=s.id AND c.state='PUBLISHED'
 WHERE s.site_key=key AND s.state='ENABLED' $$;
-- Records one visitor choice after checking the site, the calling origin, the version and every choice. Returns the receipt.
CREATE FUNCTION app.cmp_record_consent(key uuid, visitor uuid, cfg_version integer, choice jsonb, signal boolean, lang text, caller_origin text) RETURNS TABLE(receipt_id uuid, recorded_at timestamptz)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE s record; c record; k text; recent integer; rid uuid := gen_random_uuid(); at timestamptz;
BEGIN
 SELECT * INTO s FROM app.cmp_sites WHERE site_key=key AND state='ENABLED';
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown or disabled site' USING ERRCODE='P0002'; END IF;
 IF NOT (caller_origin = ANY(s.origins)) THEN RAISE EXCEPTION 'Origin not approved for this site' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM app.cmp_configs WHERE tenant_id=s.tenant_id AND legal_entity_id=s.legal_entity_id AND environment_id=s.environment_id AND site_id=s.id AND version=cfg_version AND state IN ('PUBLISHED','RETIRED');
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown banner version' USING ERRCODE='22023'; END IF;
 FOR k IN SELECT jsonb_object_keys(choice) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.document->'categories') cat WHERE cat->>'key'=k) THEN RAISE EXCEPTION 'Unknown category' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(choice->k)<>'boolean' THEN RAISE EXCEPTION 'A choice is true or false' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(c.document->'categories') cat WHERE NOT (choice ? (cat->>'key'))) THEN RAISE EXCEPTION 'Every category needs a choice' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(c.document->'categories') cat WHERE (cat->>'required')::boolean AND (choice->>(cat->>'key'))::boolean IS DISTINCT FROM true) THEN RAISE EXCEPTION 'A required category cannot be refused' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO recent FROM app.cmp_consents WHERE site_id=s.id AND visitor_id=visitor AND cmp_consents.recorded_at>clock_timestamp()-interval '1 minute';
 IF recent>=20 THEN RAISE EXCEPTION 'Too many choices from one visitor' USING ERRCODE='53400'; END IF;
 INSERT INTO app.cmp_consents(tenant_id,legal_entity_id,environment_id,id,site_id,visitor_id,config_version,choices,gpc,language,origin)
  VALUES(s.tenant_id,s.legal_entity_id,s.environment_id,rid,s.id,visitor,cfg_version,choice,signal,lang,caller_origin) RETURNING cmp_consents.recorded_at INTO at;
 RETURN QUERY SELECT rid, at;
END $$;
REVOKE ALL ON FUNCTION app.cmp_published(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.cmp_record_consent(uuid,uuid,integer,jsonb,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.cmp_published(uuid), app.cmp_record_consent(uuid,uuid,integer,jsonb,boolean,text,text) TO orvia_app;
