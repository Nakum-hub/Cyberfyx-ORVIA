-- EX03 rights response packages: a copy of the principal's records read from
-- the supported systems, reviewed and redacted by someone other than the
-- preparer, and delivered to the authenticated principal through the portal
-- until it expires, is revoked or its download allowance is spent.
-- What was read is fixed when the package is prepared; what is disclosed is
-- fixed when it is reviewed; the content is purged some time after delivery
-- ends, leaving the digest and the receipts as the record of disclosure.
CREATE TABLE app.rights_response_packages (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, request_id uuid NOT NULL, principal_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 state text NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','REVIEWED','RELEASED','WITHDRAWN')),
 sections jsonb NOT NULL, suggestions jsonb NOT NULL DEFAULT '[]',
 redactions jsonb, kept jsonb, released_content jsonb, content_digest text CHECK(content_digest IS NULL OR content_digest ~ '^[a-f0-9]{64}$'),
 unreadable_acknowledged boolean,
 prepared_by uuid NOT NULL, prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reviewed_by uuid, reviewed_at timestamptz,
 released_by uuid, released_at timestamptz, delivery_expires_at timestamptz, max_downloads integer CHECK(max_downloads IS NULL OR max_downloads BETWEEN 1 AND 10),
 downloads integer NOT NULL DEFAULT 0 CHECK(downloads>=0),
 revoked_by uuid, revoked_at timestamptz, revocation_reason text,
 purged_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id), UNIQUE(tenant_id,legal_entity_id,environment_id,request_id,version),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,request_id) REFERENCES app.rights_requests(tenant_id,legal_entity_id,environment_id,id),
 CHECK(jsonb_typeof(sections)='array'),
 CHECK((state IN ('REVIEWED','RELEASED'))=(reviewed_by IS NOT NULL AND content_digest IS NOT NULL) OR (state='WITHDRAWN')),
 CHECK(reviewed_by IS NULL OR reviewed_by<>prepared_by),
 CHECK((state='RELEASED')=(released_by IS NOT NULL AND delivery_expires_at IS NOT NULL AND max_downloads IS NOT NULL)),
 CHECK(downloads<=coalesce(max_downloads,0)),
 CHECK((revoked_at IS NULL)=(revoked_by IS NULL) AND (revoked_at IS NULL)=(revocation_reason IS NULL)),
 CHECK(revoked_at IS NULL OR state='RELEASED'));
-- At most one unreleased package per request. Whether a released one is still being
-- delivered depends on time, so that is checked under the request's lock instead.
CREATE UNIQUE INDEX rights_response_package_unreleased ON app.rights_response_packages(tenant_id,legal_entity_id,environment_id,request_id) WHERE state IN ('DRAFT','REVIEWED');
CREATE TABLE app.rights_response_downloads (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, package_id uuid NOT NULL, principal_id uuid NOT NULL, content_digest text NOT NULL, downloaded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,package_id) REFERENCES app.rights_response_packages(tenant_id,legal_entity_id,environment_id,id));

CREATE FUNCTION app.response_package_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Response package records are never deleted' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='rights_response_downloads' THEN RAISE EXCEPTION 'A download receipt is never altered' USING ERRCODE='23514'; END IF;
 IF (NEW.id,NEW.request_id,NEW.principal_id,NEW.version,NEW.prepared_by,NEW.prepared_at,NEW.suggestions) IS DISTINCT FROM (OLD.id,OLD.request_id,OLD.principal_id,OLD.version,OLD.prepared_by,OLD.prepared_at,OLD.suggestions)
 THEN RAISE EXCEPTION 'A response package keeps its identity' USING ERRCODE='23514'; END IF;
 IF OLD.purged_at IS NOT NULL THEN RAISE EXCEPTION 'A purged package is final' USING ERRCODE='23514'; END IF;
 -- Purge: content is removed once delivery has ended; the digest and receipts remain.
 IF NEW.purged_at IS NOT NULL THEN
  IF NOT (OLD.state IN ('RELEASED','WITHDRAWN') AND NEW.state=OLD.state AND NEW.sections='[]'::jsonb AND NEW.released_content IS NULL
     AND (OLD.state='WITHDRAWN' OR OLD.revoked_at IS NOT NULL OR OLD.delivery_expires_at<clock_timestamp() OR OLD.downloads>=OLD.max_downloads)
     AND (NEW.content_digest,NEW.redactions,NEW.kept,NEW.reviewed_by,NEW.released_by,NEW.delivery_expires_at,NEW.downloads,NEW.revoked_at) IS NOT DISTINCT FROM (OLD.content_digest,OLD.redactions,OLD.kept,OLD.reviewed_by,OLD.released_by,OLD.delivery_expires_at,OLD.downloads,OLD.revoked_at))
  THEN RAISE EXCEPTION 'Content is purged only after delivery has ended' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.sections IS DISTINCT FROM OLD.sections THEN RAISE EXCEPTION 'What was read is fixed when the package is prepared' USING ERRCODE='23514'; END IF;
 IF OLD.state='DRAFT' AND NEW.state IN ('REVIEWED','WITHDRAWN') THEN RETURN NEW; END IF;
 IF OLD.state='REVIEWED' AND NEW.state IN ('RELEASED','WITHDRAWN') AND (NEW.redactions,NEW.kept,NEW.released_content,NEW.content_digest,NEW.reviewed_by,NEW.reviewed_at) IS NOT DISTINCT FROM (OLD.redactions,OLD.kept,OLD.released_content,OLD.content_digest,OLD.reviewed_by,OLD.reviewed_at) THEN RETURN NEW; END IF;
 IF OLD.state='RELEASED' AND NEW.state='RELEASED'
    AND (NEW.redactions,NEW.kept,NEW.released_content,NEW.content_digest,NEW.reviewed_by,NEW.released_by,NEW.released_at,NEW.delivery_expires_at,NEW.max_downloads)
        IS NOT DISTINCT FROM (OLD.redactions,OLD.kept,OLD.released_content,OLD.content_digest,OLD.reviewed_by,OLD.released_by,OLD.released_at,OLD.delivery_expires_at,OLD.max_downloads)
    AND OLD.revoked_at IS NULL
    AND ((NEW.downloads=OLD.downloads+1 AND NEW.revoked_at IS NULL AND OLD.delivery_expires_at>clock_timestamp()) OR (NEW.downloads=OLD.downloads AND NEW.revoked_at IS NOT NULL))
 THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'A response package moves forward once: reviewed, released, downloaded within its allowance, revoked or purged' USING ERRCODE='23514';
END $$;
REVOKE ALL ON FUNCTION app.response_package_guard FROM PUBLIC;
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.rights_response_packages FOR EACH ROW EXECUTE FUNCTION app.response_package_guard();
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.rights_response_downloads FOR EACH ROW EXECUTE FUNCTION app.response_package_guard();
ALTER TABLE app.rights_response_packages ENABLE ROW LEVEL SECURITY; ALTER TABLE app.rights_response_packages FORCE ROW LEVEL SECURITY;
ALTER TABLE app.rights_response_downloads ENABLE ROW LEVEL SECURITY; ALTER TABLE app.rights_response_downloads FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.rights_response_packages, app.rights_response_downloads FROM PUBLIC;
CREATE POLICY staff_read ON app.rights_response_packages FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('rights.read'));
CREATE POLICY staff_prepare ON app.rights_response_packages FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('rights.write') AND prepared_by::text=current_setting('orvia.actor_id',true));
CREATE POLICY staff_decide ON app.rights_response_packages FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND (app.has_capability('rights.release') OR app.has_capability('rights.write')))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
-- The principal sees only their own released package and may only count a download against it.
CREATE POLICY principal_read ON app.rights_response_packages FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='PRINCIPAL'
 AND principal_id::text=current_setting('orvia.principal_id',true) AND state='RELEASED');
CREATE POLICY principal_download ON app.rights_response_packages FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='PRINCIPAL'
 AND principal_id::text=current_setting('orvia.principal_id',true) AND state='RELEASED') WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND principal_id::text=current_setting('orvia.principal_id',true));
CREATE POLICY machine_purge ON app.rights_response_packages FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute'));
CREATE POLICY machine_purge_update ON app.rights_response_packages FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND purged_at IS NOT NULL);
CREATE POLICY staff_read ON app.rights_response_downloads FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('rights.read'));
CREATE POLICY principal_receipt ON app.rights_response_downloads FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='PRINCIPAL' AND principal_id::text=current_setting('orvia.principal_id',true));
CREATE POLICY principal_own ON app.rights_response_downloads FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='PRINCIPAL' AND principal_id::text=current_setting('orvia.principal_id',true));
GRANT SELECT,INSERT,UPDATE ON app.rights_response_packages TO orvia_app;
GRANT SELECT,INSERT ON app.rights_response_downloads TO orvia_app;
GRANT SELECT,UPDATE ON app.rights_response_packages TO orvia_worker;
