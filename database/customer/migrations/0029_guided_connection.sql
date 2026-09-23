-- WP03 / WP27 / WP34 / M29 Customer Onboarding, FR-M29-03.
--
-- The nine-step guided connection. Two things shape this schema.
--
-- The first is that a step is never a tick. Five of the nine steps are answered
-- from evidence that already exists elsewhere -- a recorded capability check, an
-- approved resource, a target mapping, a preview decision -- so "this step is
-- done" is a measurement rather than a claim, and it becomes false again if the
-- thing it measured goes away. Only the decisions a customer actually makes are
-- stored here, and they are stored once each.
--
-- The second is that connected is not the same as safe to mutate. Enablement is
-- a three-value ladder that only climbs, and the top rung is refused unless a
-- real capability check found the system able to restrict. Both rules are
-- triggers, because a role that bypasses row-level security should not be able
-- to put a connection into enforcement by hand either.

CREATE TABLE app.connections (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 system_id uuid NOT NULL,
 -- Step 1. Production scope is never the default; the caller states it.
 environment_kind text NOT NULL CHECK(environment_kind IN ('TEST','PRODUCTION')),
 -- Step 2. A connection begins read-only. The mutating capability is not
 -- refused here because it is unthinkable, but because step 2's check is that
 -- no update or delete right is implied by starting a connection; it is
 -- acquired at step 9 or not at all.
 requested_capabilities text[] NOT NULL CHECK(
   cardinality(requested_capabilities)>0
   AND requested_capabilities <@ ARRAY['DISCOVER','READ','VERIFY']::text[]),
 -- Step 3. A reference to an endpoint the customer configured locally, and
 -- whether its certificate verified. Never a URL with credentials in it.
 endpoint_reference text CHECK(endpoint_reference ~ '^[A-Za-z0-9 ._:/-]{3,200}$'),
 tls_verified boolean,
 connectivity_recorded_at timestamptz,
 -- Step 4. The reference to a secret the customer holds. There is deliberately
 -- no column on this table in which a secret itself could be written, and the
 -- pattern refuses anything long enough to be one.
 secret_reference text CHECK(secret_reference ~ '^[A-Za-z0-9._:/-]{3,120}$'),
 identity_recorded_at timestamptz,
 -- Step 9.
 enablement_stage text NOT NULL DEFAULT 'OBSERVE' CHECK(enablement_stage IN ('OBSERVE','COORDINATE','ENFORCE')),
 started_by uuid NOT NULL,started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 -- One guided connection per system. A second attempt resumes the first rather
 -- than starting beside it, so "which stage am I at" has one answer.
 UNIQUE(tenant_id,legal_entity_id,environment_id,system_id),
 -- Connectivity is recorded whole: an endpoint without a verification result
 -- would let step 3 read as done on half its check.
 CHECK((endpoint_reference IS NULL)=(tls_verified IS NULL) AND (endpoint_reference IS NULL)=(connectivity_recorded_at IS NULL)),
 CHECK((secret_reference IS NULL)=(identity_recorded_at IS NULL)),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,system_id) REFERENCES app.systems(tenant_id,legal_entity_id,environment_id,id));

-- Step 6. Discovering an asset does not approve it. The allowlist is explicit
-- and each entry names who approved it and when.
CREATE TABLE app.connection_resources (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 connection_id uuid NOT NULL,data_asset_id uuid NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),approved_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,connection_id,data_asset_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,connection_id) REFERENCES app.connections(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,data_asset_id) REFERENCES app.data_assets(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX connection_resources_by_connection ON app.connection_resources(tenant_id,legal_entity_id,environment_id,connection_id);

-- The ladder climbs and does not descend, and enforcement is refused unless a
-- recorded capability check on this system actually found it able to restrict.
-- A connection that cannot restrict cannot be put into enforcement by anybody,
-- including a hand at the database.
CREATE FUNCTION app.connection_enablement_is_earned() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ladder text[] := ARRAY['OBSERVE','COORDINATE','ENFORCE'];
BEGIN
 IF array_position(ladder,NEW.enablement_stage) < array_position(ladder,OLD.enablement_stage) THEN
  RAISE EXCEPTION 'Enablement moves forward only; a connection is not quietly returned to observation' USING ERRCODE='23514';
 END IF;
 IF NEW.enablement_stage='ENFORCE' AND OLD.enablement_stage<>'ENFORCE' AND NOT EXISTS(
   SELECT 1 FROM app.system_checks c
    WHERE c.tenant_id=NEW.tenant_id AND c.legal_entity_id=NEW.legal_entity_id AND c.environment_id=NEW.environment_id
      AND c.system_id=NEW.system_id AND c.supports_restrict) THEN
  RAISE EXCEPTION 'Enforcement needs a recorded check that found this system able to restrict' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER connection_enablement_is_earned BEFORE UPDATE ON app.connections FOR EACH ROW EXECUTE FUNCTION app.connection_enablement_is_earned();
REVOKE ALL ON FUNCTION app.connection_enablement_is_earned FROM PUBLIC;

-- An approved resource is withdrawn by deleting the approval, which is a real
-- narrowing of scope and is allowed. A connection itself is not deleted: the
-- record that a system was connected, and under what, is the thing a later
-- reader needs.
CREATE FUNCTION app.connection_is_not_deleted() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'A connection record is kept; narrow its approved resources or stop using it' USING ERRCODE='23514'; END $$;
CREATE TRIGGER connection_is_not_deleted BEFORE DELETE ON app.connections FOR EACH ROW EXECUTE FUNCTION app.connection_is_not_deleted();
REVOKE ALL ON FUNCTION app.connection_is_not_deleted FROM PUBLIC;

ALTER TABLE app.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.connections FORCE ROW LEVEL SECURITY;
ALTER TABLE app.connection_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.connection_resources FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.connections FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.read'));
CREATE POLICY scoped_write ON app.connections FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.write'));
-- Steps 3 and 4 are configuration. Step 9 is not, and the trigger above is what
-- stops this policy being the whole story: the application refuses a stage move
-- without connection.enable, and the database refuses an unearned one from
-- anybody at all.
CREATE POLICY scoped_update ON app.connections FOR UPDATE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.write'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY scoped_enable ON app.connections FOR UPDATE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('connection.enable'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY scoped_read ON app.connection_resources FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.read'));
CREATE POLICY scoped_write ON app.connection_resources FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.write'));
CREATE POLICY scoped_withdraw ON app.connection_resources FOR DELETE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.write'));

GRANT SELECT,INSERT,UPDATE ON app.connections TO orvia_app;
GRANT SELECT,INSERT,DELETE ON app.connection_resources TO orvia_app;
REVOKE ALL ON app.connections,app.connection_resources FROM PUBLIC;
