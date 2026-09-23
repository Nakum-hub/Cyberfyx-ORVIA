-- WP-M12 / M12 Notice Management, FR-M12-03 and FR-M12-04, and a vocabulary
-- correction in M16.
--
-- Three things.
--
-- A notice may be authored in English or any of the twenty-two Eighth Schedule
-- languages, which is the set Act s5 permits. The language was already inside
-- the notice document as free JSON; it becomes a real column with a closed
-- check, because a language nobody can query is a language the product cannot
-- honestly report on.
--
-- A data principal records the language they chose. English-first
-- administration must not erase that choice (FR-M12-04), and a choice that has
-- nowhere to be written is erased by definition.
--
-- A change to a notice is classified (FR-M12-03). Editorial fixes and
-- translations do not change what anybody agreed to; a material change to scope
-- does, and cannot be recorded without deciding what happens to the grants
-- already given. That decision names a counted number of affected grants and is
-- then never edited.

-- The Eighth Schedule to the Constitution, plus English. Held in one function so
-- the three places that need it cannot drift apart.
CREATE FUNCTION app.permitted_notice_language(code text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT code IN ('en','as','bn','brx','doi','gu','hi','kn','ks','kok','mai','ml',
                 'mni','mr','ne','or','pa','sa','sat','sd','ta','te','ur') $$;

-- Generated, not backfilled. A published notice version is immutable and a
-- trigger enforces that, so the first attempt at this -- add a column, then
-- UPDATE it from the document -- was correctly refused by the schema. Deriving
-- the column instead is the better answer anyway: the language cannot drift
-- from the notice it describes, because it is not stored twice.
ALTER TABLE app.notice_versions
 ADD COLUMN language text GENERATED ALWAYS AS (coalesce(document->>'language','en')) STORED;
ALTER TABLE app.notice_versions ADD CONSTRAINT notice_language_is_permitted CHECK(app.permitted_notice_language(language));
CREATE INDEX notice_versions_by_language ON app.notice_versions(tenant_id,legal_entity_id,environment_id,purpose_id,language);

-- Act s5 is the principal's choice, so it lives on the principal. English is the
-- default because it is the one language the Act always permits, not because it
-- is a preference anybody expressed -- which is why the portal reports the
-- choice and the served language as two separate facts.
ALTER TABLE app.principal_references ADD COLUMN preferred_language text NOT NULL DEFAULT 'en';
ALTER TABLE app.principal_references ADD CONSTRAINT principal_language_is_permitted CHECK(app.permitted_notice_language(preferred_language));

CREATE TABLE app.notice_revisions (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 notice_id uuid NOT NULL,version_id uuid NOT NULL,
 change_kind text NOT NULL CHECK(change_kind IN ('EDITORIAL','TRANSLATION','MATERIAL_SCOPE_CHANGE')),
 translates_version_id uuid,
 consent_decision text CHECK(consent_decision IN ('MIGRATE_EXISTING_GRANTS','REQUIRE_FRESH_CONSENT')),
 note text NOT NULL,
 affected_grants integer NOT NULL CHECK(affected_grants>=0),
 counted_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 -- One classification per version. A version whose meaning could be reclassified
 -- later is a version whose consent decision means nothing.
 UNIQUE(tenant_id,legal_entity_id,environment_id,version_id),
 -- The same two rules the contract enforces, so a direct write cannot record a
 -- translation of nothing or a scope change that decided nothing.
 CHECK((change_kind='TRANSLATION')=(translates_version_id IS NOT NULL)),
 CHECK((change_kind='MATERIAL_SCOPE_CHANGE')=(consent_decision IS NOT NULL)),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,version_id) REFERENCES app.notice_versions(tenant_id,legal_entity_id,environment_id,version_id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,translates_version_id) REFERENCES app.notice_versions(tenant_id,legal_entity_id,environment_id,version_id));
CREATE INDEX notice_revisions_by_notice ON app.notice_revisions(tenant_id,legal_entity_id,environment_id,notice_id);

-- A revision records a decision taken at a moment against a counted number of
-- grants. Editing it afterwards would silently restate what was decided and how
-- much was at stake, which is the whole value of the record.
CREATE FUNCTION app.notice_revision_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'A notice revision records a decision as it was taken and is never edited or removed' USING ERRCODE='23514'; END $$;
CREATE TRIGGER notice_revision_append_only BEFORE UPDATE OR DELETE ON app.notice_revisions FOR EACH ROW EXECUTE FUNCTION app.notice_revision_is_append_only();
REVOKE ALL ON FUNCTION app.notice_revision_is_append_only FROM PUBLIC;

ALTER TABLE app.notice_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notice_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON app.notice_revisions FOR SELECT
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.read'));
CREATE POLICY scoped_write ON app.notice_revisions FOR INSERT
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('configuration.write'));
GRANT SELECT,INSERT ON app.notice_revisions TO orvia_app;
REVOKE ALL ON app.notice_revisions FROM PUBLIC;

-- A principal may set their own language and read it back; nothing else about
-- the row is theirs to change. The existing scoped_read policy already governs
-- who can see a principal reference.
CREATE POLICY own_language ON app.principal_references FOR UPDATE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.own_principal(id) AND app.has_capability('consent.own.write'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.own_principal(id));
GRANT UPDATE(preferred_language) ON app.principal_references TO orvia_app;

-- M16 vocabulary. This product is built to the DPDP Act, which has Data
-- Fiduciaries and Data Processors and no "controller" at all. The stored values
-- are rewritten rather than left as a legacy spelling the contract no longer
-- has, because a row naming a role the product cannot parse is a row that will
-- fail to load at the worst possible moment.
ALTER TABLE app.processors DROP CONSTRAINT IF EXISTS processors_role_check;
UPDATE app.processors SET role='JOINT_FIDUCIARY' WHERE role='JOINT_CONTROLLER';
UPDATE app.processors SET role='INDEPENDENT_FIDUCIARY' WHERE role='INDEPENDENT_CONTROLLER';
UPDATE app.processors SET document=jsonb_set(document,'{role}',to_jsonb(role)) WHERE document->>'role' <> role;
ALTER TABLE app.processors ADD CONSTRAINT processors_role_check
 CHECK(role IN ('PROCESSOR','SUB_PROCESSOR','JOINT_FIDUCIARY','INDEPENDENT_FIDUCIARY'));
