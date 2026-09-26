-- EX01 communication preferences. Staff define topics (what a principal may be
-- contacted about, on which channels, and which consented purpose, if any, a
-- topic depends on). A principal records their own choice per topic and channel
-- in the portal; every choice is an append-only event carrying the time the
-- principal made it. A choice older than the latest one already recorded for
-- the same topic and channel is kept as evidence but is not effective, so a
-- replayed or delayed event cannot re-enable contact. Whether contact is
-- permitted is decided at the time of use: an effective opt-in, an active topic
-- offering that channel, and, where the topic depends on a purpose, consent to
-- that purpose currently granted. Withdrawing consent therefore stops contact
-- whatever the preference says. There is no default opt-in.
CREATE TABLE app.preference_topics (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, code text NOT NULL CHECK(code ~ '^[a-z][a-z0-9_]{2,40}$'), name text NOT NULL CHECK(length(name) BETWEEN 3 AND 120),
 description text NOT NULL CHECK(length(description) BETWEEN 10 AND 500),
 channels text[] NOT NULL CHECK(cardinality(channels) BETWEEN 1 AND 5 AND channels <@ ARRAY['EMAIL','SMS','PHONE','POST','PUSH']),
 purpose_id uuid, state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','RETIRED')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), retired_at timestamptz, retired_by uuid,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id), UNIQUE(tenant_id,legal_entity_id,environment_id,code),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,purpose_id) REFERENCES app.purpose_versions(tenant_id,legal_entity_id,environment_id,id),
 CHECK((state='RETIRED')=(retired_at IS NOT NULL AND retired_by IS NOT NULL)));
CREATE TABLE app.preference_events (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, principal_id uuid NOT NULL, topic_id uuid NOT NULL,
 channel text NOT NULL CHECK(channel IN ('EMAIL','SMS','PHONE','POST','PUSH')), choice text NOT NULL CHECK(choice IN ('OPTED_IN','OPTED_OUT')),
 source text NOT NULL CHECK(source IN ('PORTAL')), observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_by uuid NOT NULL, effective boolean NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,principal_id) REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,topic_id) REFERENCES app.preference_topics(tenant_id,legal_entity_id,environment_id,id),
 CHECK(observed_at <= recorded_at + interval '5 minutes'));
CREATE INDEX preference_events_latest ON app.preference_events(tenant_id,legal_entity_id,environment_id,principal_id,topic_id,channel,observed_at DESC,recorded_at DESC);

CREATE FUNCTION app.preference_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='preference_events' THEN RAISE EXCEPTION 'Preference events are append-only' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Preference topics are not deleted' USING ERRCODE='23514'; END IF;
 IF OLD.state='RETIRED' OR (to_jsonb(NEW)-'state'-'retired_at'-'retired_by') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'retired_at'-'retired_by') THEN
  RAISE EXCEPTION 'A topic changes only by being retired once' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.preference_guard FROM PUBLIC;
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.preference_topics FOR EACH ROW EXECUTE FUNCTION app.preference_guard();
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.preference_events FOR EACH ROW EXECUTE FUNCTION app.preference_guard();

ALTER TABLE app.preference_topics ENABLE ROW LEVEL SECURITY; ALTER TABLE app.preference_topics FORCE ROW LEVEL SECURITY;
ALTER TABLE app.preference_events ENABLE ROW LEVEL SECURITY; ALTER TABLE app.preference_events FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON app.preference_topics FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND (app.has_capability('configuration.read') OR app.has_capability('principals.read')));
CREATE POLICY staff_write ON app.preference_topics FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.write') AND state='ACTIVE');
CREATE POLICY staff_retire ON app.preference_topics FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.write')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY portal_read ON app.preference_topics FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='PRINCIPAL' AND (app.has_capability('consent.own.read') OR app.has_capability('consent.own.write')));
CREATE POLICY staff_read ON app.preference_events FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('principals.read'));
CREATE POLICY own_read ON app.preference_events FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.own_principal(principal_id) AND (app.has_capability('consent.own.read') OR app.has_capability('consent.own.write')));
CREATE POLICY own_insert ON app.preference_events FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.own_principal(principal_id) AND app.has_capability('consent.own.write') AND source='PORTAL' AND recorded_by::text=current_setting('orvia.actor_id',true));
GRANT SELECT,INSERT,UPDATE ON app.preference_topics TO orvia_app;
GRANT SELECT,INSERT ON app.preference_events TO orvia_app;
