-- Authentication stores are separate trust domains. Their narrowly privileged
-- roles can operate library records, but cannot read business tables or grant scope.
CREATE SCHEMA staff_auth;
CREATE SCHEMA principal_auth;
CREATE SCHEMA app;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
DO $$
DECLARE domain text;
BEGIN
  FOREACH domain IN ARRAY ARRAY['staff_auth','principal_auth'] LOOP
    EXECUTE format('CREATE TABLE %I."user" (
      id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      "emailVerified" boolean NOT NULL DEFAULT false, image text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "twoFactorEnabled" boolean NOT NULL DEFAULT false)', domain);
    EXECUTE format('CREATE TABLE %I.session (
      id uuid PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "ipAddress" text, "userAgent" text, "userId" uuid NOT NULL REFERENCES %I."user"(id) ON DELETE CASCADE)', domain, domain);
    EXECUTE format('CREATE INDEX ON %I.session ("userId")', domain);
    EXECUTE format('CREATE TABLE %I.account (
      id uuid PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
      "userId" uuid NOT NULL REFERENCES %I."user"(id) ON DELETE CASCADE,
      "accessToken" text, "refreshToken" text, "idToken" text,
      "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("providerId", "accountId"))', domain, domain);
    EXECUTE format('CREATE INDEX ON %I.account ("userId")', domain);
    EXECUTE format('CREATE TABLE %I.verification (
      id uuid PRIMARY KEY, identifier text NOT NULL UNIQUE, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())', domain);
    EXECUTE format('CREATE TABLE %I."twoFactor" (
      id uuid PRIMARY KEY, secret text NOT NULL, "backupCodes" text NOT NULL,
      "userId" uuid NOT NULL UNIQUE REFERENCES %I."user"(id) ON DELETE CASCADE,
      verified boolean NOT NULL DEFAULT false, "failedVerificationCount" integer NOT NULL DEFAULT 0,
      "lockedUntil" timestamptz)', domain, domain);
    EXECUTE format('CREATE TABLE %I."rateLimit" (
      id uuid PRIMARY KEY, key text NOT NULL UNIQUE, count integer NOT NULL, "lastRequest" bigint NOT NULL)', domain);
    EXECUTE format('CREATE TABLE %I.auth_audit (
      id uuid PRIMARY KEY, request_id uuid NOT NULL, operation text NOT NULL,
      status integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now())', domain);
  END LOOP;
END $$;

CREATE TABLE app.organisations (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE app.legal_entities (
  tenant_id uuid NOT NULL REFERENCES app.organisations(id), id uuid NOT NULL,
  name text NOT NULL, PRIMARY KEY (tenant_id,id));
CREATE TABLE app.environments (
  tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, id uuid NOT NULL, name text NOT NULL,
  PRIMARY KEY (tenant_id,legal_entity_id,id),
  FOREIGN KEY (tenant_id,legal_entity_id) REFERENCES app.legal_entities(tenant_id,id));
CREATE TABLE app.principal_references (
  tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
  id uuid NOT NULL, display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (email ~ '@(aster|birch)\.example$'), synthetic boolean NOT NULL DEFAULT true CHECK(synthetic),
  PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id),
  UNIQUE (tenant_id,legal_entity_id,environment_id,email),
  FOREIGN KEY (tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));
CREATE TABLE staff_auth.authority (
  user_id uuid PRIMARY KEY REFERENCES staff_auth."user"(id),
  tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('ORG_SUPER_ADMIN','ORG_ADMIN','MEMBER','AUDITOR')),
  active boolean NOT NULL DEFAULT true,
  FOREIGN KEY (tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));
CREATE TABLE principal_auth.authority (
  user_id uuid PRIMARY KEY REFERENCES principal_auth."user"(id),
  tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, principal_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  FOREIGN KEY (tenant_id,legal_entity_id,environment_id,principal_id)
    REFERENCES app.principal_references(tenant_id,legal_entity_id,environment_id,id));
CREATE TABLE staff_auth.mfa_sessions (
  session_id uuid PRIMARY KEY REFERENCES staff_auth.session(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE app.audit_events (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
  actor_id uuid NOT NULL, actor_domain text NOT NULL CHECK (actor_domain IN ('STAFF','PRINCIPAL','MACHINE')),
  operation text NOT NULL, resource_id uuid, request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));
CREATE TABLE app.idempotency_records (
  tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, actor_id uuid NOT NULL,
  operation text NOT NULL, key text NOT NULL CHECK(length(key) BETWEEN 16 AND 100), digest text NOT NULL,
  response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,legal_entity_id,environment_id,actor_id,operation,key),
  FOREIGN KEY (tenant_id,legal_entity_id,environment_id) REFERENCES app.environments(tenant_id,legal_entity_id,id));

-- SQL functions use only transaction-local settings supplied by the server after
-- validation. They are invoker functions, not privileged SECURITY DEFINER bypasses.
CREATE FUNCTION app.in_scope(t uuid,l uuid,e uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT t::text = current_setting('orvia.tenant_id',true)
    AND l::text = current_setting('orvia.legal_entity_id',true)
    AND e::text = current_setting('orvia.environment_id',true)
    AND coalesce(current_setting('orvia.actor_id',true),'') <> ''
$$;
CREATE FUNCTION app.has_capability(c text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT c = ANY(string_to_array(current_setting('orvia.capabilities',true),','))
$$;
ALTER TABLE app.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organisations FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.organisations FOR SELECT USING (id::text=current_setting('orvia.tenant_id',true));
ALTER TABLE app.legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.legal_entities FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.legal_entities FOR SELECT USING
 (tenant_id::text=current_setting('orvia.tenant_id',true) AND id::text=current_setting('orvia.legal_entity_id',true));
ALTER TABLE app.environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.environments FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.environments FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,id));
ALTER TABLE app.principal_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.principal_references FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.principal_references FOR SELECT USING (
 app.in_scope(tenant_id,legal_entity_id,environment_id) AND
 ((current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('principals.read')) OR
  (current_setting('orvia.actor_domain',true)='PRINCIPAL' AND id::text=current_setting('orvia.principal_id',true))));
CREATE POLICY scoped_insert ON app.principal_references FOR INSERT WITH CHECK (
 app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF'
 AND app.has_capability('principals.create'));
ALTER TABLE app.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_insert ON app.audit_events FOR INSERT WITH CHECK (
 app.in_scope(tenant_id,legal_entity_id,environment_id) AND actor_id::text=current_setting('orvia.actor_id',true)
 AND actor_domain=current_setting('orvia.actor_domain',true));
CREATE POLICY scoped_read ON app.audit_events FOR SELECT USING
 (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.has_capability('evidence.read'));
ALTER TABLE app.idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.idempotency_records FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.idempotency_records FOR SELECT USING
 (app.in_scope(tenant_id,legal_entity_id,environment_id) AND actor_id::text=current_setting('orvia.actor_id',true));
CREATE POLICY scoped_insert ON app.idempotency_records FOR INSERT WITH CHECK
 (app.in_scope(tenant_id,legal_entity_id,environment_id) AND actor_id::text=current_setting('orvia.actor_id',true));
REVOKE ALL ON ALL TABLES IN SCHEMA app,staff_auth,principal_auth FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
