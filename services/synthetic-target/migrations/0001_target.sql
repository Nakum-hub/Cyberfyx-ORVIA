CREATE TABLE IF NOT EXISTS target_identity(installation_id uuid PRIMARY KEY,profile text NOT NULL);
CREATE TABLE target_migrations(id text PRIMARY KEY,checksum text NOT NULL);
CREATE TABLE IF NOT EXISTS marketing_memberships (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,
 resource_id uuid PRIMARY KEY,principal_id uuid NOT NULL,purpose_id uuid NOT NULL,system_id uuid NOT NULL,
 subject_reference text NOT NULL CHECK(subject_reference ~ '^syn_[a-z0-9_]{1,80}$'),
 connector text NOT NULL CHECK(connector IN ('SYNTHETIC_CRM','ORVIA_REST_SIMULATOR')),
 generation bigint NOT NULL CHECK(generation>0),last_applied_epoch bigint NOT NULL DEFAULT 0,
 marketing_restricted boolean NOT NULL DEFAULT false,quarantined boolean NOT NULL DEFAULT false,
 changed_at timestamptz NOT NULL DEFAULT now(),UNIQUE(system_id,subject_reference));
CREATE TABLE IF NOT EXISTS command_ledger (
 command_id uuid PRIMARY KEY,command_digest text NOT NULL,nonce text NOT NULL UNIQUE,
 resource_id uuid NOT NULL REFERENCES marketing_memberships(resource_id),receipt jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON target_identity,marketing_memberships,command_ledger FROM PUBLIC;
CREATE FUNCTION target_scope(t uuid,l uuid,e uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT t::text=current_setting('orvia.tenant_id',true) AND l::text=current_setting('orvia.legal_entity_id',true)
 AND e::text=current_setting('orvia.environment_id',true) AND coalesce(current_setting('orvia.actor_id',true),'')<>'' $$;
ALTER TABLE marketing_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_target ON marketing_memberships FOR ALL USING(target_scope(tenant_id,legal_entity_id,environment_id)) WITH CHECK(target_scope(tenant_id,legal_entity_id,environment_id));
ALTER TABLE command_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_ledger FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_ledger ON command_ledger FOR ALL USING(EXISTS(SELECT 1 FROM marketing_memberships m WHERE m.resource_id=command_ledger.resource_id)) WITH CHECK(EXISTS(SELECT 1 FROM marketing_memberships m WHERE m.resource_id=command_ledger.resource_id));
REVOKE ALL ON FUNCTION target_scope FROM PUBLIC;
