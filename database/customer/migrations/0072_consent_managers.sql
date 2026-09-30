-- Consent Managers (DPDP Act s.6(7)-(9), Rules rule 4 and First Schedule; official texts checked 2026-09-30). The Data Fiduciary's
-- duty under s.6(7)-(8) commences 13 May 2027; registration of Consent Managers under s.6(9) and rule 4 from 13 November 2026.
-- A Data Principal may give, manage, review or withdraw consent through a Consent Manager registered with the Board. ORVIA keeps
-- a register of the Consent Managers the organisation accepts (with the Board registration and its evidence), links a consent
-- record to the Consent Manager and its consent artefact, and honours a withdrawal a Consent Manager relays exactly like any
-- other withdrawal. A withdrawal is honoured even if the Consent Manager was later suspended; linking new consent needs an active one.
CREATE TABLE app.consent_managers (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 name text NOT NULL CHECK (length(name) BETWEEN 2 AND 200),
 board_registration_number text NOT NULL CHECK (length(board_registration_number) BETWEEN 3 AND 80),
 registered_on date NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','CANCELLED')),
 status_reason text, evidence_reference text NOT NULL CHECK (length(evidence_reference) BETWEEN 3 AND 500),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), status_changed_at timestamptz,
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 UNIQUE (tenant_id,legal_entity_id,environment_id,board_registration_number),
 CHECK ((status = 'ACTIVE') = (status_reason IS NULL)));
CREATE TABLE app.consent_manager_links (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 record_id uuid NOT NULL, consent_manager_id uuid NOT NULL,
 artefact_reference text NOT NULL CHECK (length(artefact_reference) BETWEEN 3 AND 200),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id,legal_entity_id,environment_id,id), UNIQUE (id),
 UNIQUE (tenant_id,legal_entity_id,environment_id,record_id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,record_id) REFERENCES app.consent_records(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY (tenant_id,legal_entity_id,environment_id,consent_manager_id) REFERENCES app.consent_managers(tenant_id,legal_entity_id,environment_id,id));
-- A consent event relayed by a Consent Manager says so.
ALTER TABLE app.consent_record_events DROP CONSTRAINT consent_record_events_source_check;
ALTER TABLE app.consent_record_events ADD CONSTRAINT consent_record_events_source_check CHECK (source IN ('OPERATOR','IMPORT','V1_PORTAL','SOURCE_SYSTEM','CONSENT_MANAGER'));
CREATE TRIGGER consent_manager_links_append_only BEFORE UPDATE OR DELETE ON app.consent_manager_links FOR EACH ROW EXECUTE FUNCTION app.append_only_history();
CREATE TRIGGER consent_managers_no_delete BEFORE DELETE ON app.consent_managers FOR EACH ROW EXECUTE FUNCTION app.append_only_history();
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['consent_managers','consent_manager_links'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
  EXECUTE format('CREATE POLICY scoped_read ON app.%I FOR SELECT USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(''registry.read''))', tab);
  EXECUTE format('CREATE POLICY scoped_insert ON app.%I FOR INSERT WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner(''registry.write''))', tab);
 END LOOP;
END $$;
CREATE POLICY scoped_status ON app.consent_managers FOR UPDATE USING (app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.capability_or_runner('registry.write')) WITH CHECK (app.in_scope(tenant_id,legal_entity_id,environment_id));
GRANT SELECT, INSERT, UPDATE ON app.consent_managers TO orvia_app, orvia_worker;
GRANT SELECT, INSERT ON app.consent_manager_links TO orvia_app, orvia_worker;
REVOKE ALL ON app.consent_managers, app.consent_manager_links FROM PUBLIC;
