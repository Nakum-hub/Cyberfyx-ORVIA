-- WP03 / WP34 / M29 Customer Onboarding, FR-M29-04.
--
-- One typed import path, built fully. OPEN-11's interim rule is explicit:
-- implement one approved typed path before writing another parser, and no
-- arbitrary upload-to-table tool. So there is exactly one import kind here, its
-- rows are validated against a declared schema before anything is stored, and
-- there is no column anywhere that would accept a free-form file.
--
-- The line this exists to hold is the last clause of the requirement: a source
-- snapshot is never live control evidence. An inventory a customer exports from
-- their CRM says what that CRM's operator believed at the moment of export. It
-- is not an observation ORVIA made, and it is certainly not evidence that any
-- restriction is in force. So everything applied from an import is written with
-- provenance ASSERTED and review_state UNREVIEWED, and the graph schema already
-- refuses to let an ASSERTED record carry an observation time or a freshness
-- window at all.
--
-- Quarantine is the default and the only entry state. Rows land, are previewed
-- with their conflicts, and then either become asserted inventory or are purged.
-- Purge really deletes the rows, because quarantined input that was never
-- accepted is exactly the thing a customer should be able to take back; the
-- batch envelope survives saying that it was purged, when, and by whom, so a
-- purged import is never indistinguishable from an import that never happened.

CREATE TABLE app.import_batches (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 -- One approved typed path. Adding a second is a migration and a contract
 -- change, which is the review OPEN-11 asks for.
 kind text NOT NULL CHECK(kind='DATA_ASSET_INVENTORY'),
 -- Where the customer says this came from. A description of a source, never the
 -- source file: there is no column here that could hold one.
 source_reference text NOT NULL CHECK(length(btrim(source_reference))>=3 AND length(source_reference)<=200),
 -- What the customer states the rows describe as at. A snapshot is of a moment,
 -- and an import that would not say which moment is not a snapshot.
 captured_at timestamptz NOT NULL,
 row_count integer NOT NULL CHECK(row_count BETWEEN 1 AND 500),
 content_digest text NOT NULL CHECK(content_digest ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'QUARANTINED' CHECK(state IN ('QUARANTINED','APPLIED','PURGED')),
 submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),submitted_by uuid NOT NULL,
 settled_at timestamptz,settled_by uuid,
 purge_reason text,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 -- Settled whole or not at all, and a purge says why.
 CHECK((state='QUARANTINED')=(settled_at IS NULL) AND (settled_at IS NULL)=(settled_by IS NULL)),
 CHECK((state='PURGED')=(purge_reason IS NOT NULL)));
CREATE INDEX import_batches_by_state ON app.import_batches(tenant_id,legal_entity_id,environment_id,state,submitted_at DESC);

CREATE TABLE app.import_rows (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 batch_id uuid NOT NULL,
 line_number integer NOT NULL CHECK(line_number>=1),
 -- Already parsed and validated against the declared row schema before it got
 -- here. Nothing unvalidated is ever stored.
 parsed jsonb NOT NULL,
 -- What this row would do to the inventory as it stands. Computed at preview
 -- and recomputed at apply, because the inventory can change in between.
 conflict text NOT NULL CHECK(conflict IN ('NEW','MATCHES_EXISTING','CONFLICTS_WITH_EXISTING')),
 -- Which existing asset it matched or conflicts with, when there is one.
 existing_asset_id uuid,
 -- What a person decided to do about a conflict. Null while undecided.
 decision text CHECK(decision IN ('IMPORT_AS_NEW','SKIP_ROW')),
 decided_at timestamptz,decided_by uuid,
 -- The asset this row became, once applied.
 created_asset_id uuid,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,batch_id,line_number),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,batch_id)
   REFERENCES app.import_batches(tenant_id,legal_entity_id,environment_id,id) ON DELETE CASCADE,
 CHECK((decision IS NULL)=(decided_at IS NULL) AND (decided_at IS NULL)=(decided_by IS NULL)),
 -- A row that matched nothing has nothing to point at, and one that conflicts
 -- must name what with. "There is a conflict somewhere" is not a preview.
 CHECK((conflict='NEW')=(existing_asset_id IS NULL)));
CREATE INDEX import_rows_by_batch ON app.import_rows(tenant_id,legal_entity_id,environment_id,batch_id,line_number);

-- A batch settles once, in one of two directions, and never moves again. A
-- batch that could return to quarantine after being applied would make the
-- applied state mean nothing, and one that could be applied twice would create
-- the inventory twice.
CREATE FUNCTION app.import_batch_settles_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state<>'QUARANTINED' THEN
  RAISE EXCEPTION 'A settled import is terminal' USING ERRCODE='23514';
 END IF;
 IF NEW.kind<>OLD.kind OR NEW.content_digest<>OLD.content_digest OR NEW.row_count<>OLD.row_count
    OR NEW.captured_at<>OLD.captured_at OR NEW.submitted_by<>OLD.submitted_by THEN
  RAISE EXCEPTION 'What an import was and what it contained do not change after submission' USING ERRCODE='23514';
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER import_batch_settles_once BEFORE UPDATE ON app.import_batches
 FOR EACH ROW EXECUTE FUNCTION app.import_batch_settles_once();

-- The envelope survives a purge. Deleting the batch as well would leave no
-- record that anything was ever submitted, which is the difference between
-- purging quarantined input and quietly erasing that it arrived.
CREATE FUNCTION app.import_batch_is_not_deleted() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'An import batch is kept, so a purge stays distinguishable from an import that never happened' USING ERRCODE='23514'; END $$;
CREATE TRIGGER import_batch_is_not_deleted BEFORE DELETE ON app.import_batches
 FOR EACH ROW EXECUTE FUNCTION app.import_batch_is_not_deleted();
REVOKE ALL ON FUNCTION app.import_batch_settles_once,app.import_batch_is_not_deleted FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['import_batches','import_rows'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''graph.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''graph.write''))',tab);
  EXECUTE format('CREATE POLICY scoped_update ON app.%I FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''graph.write'')) WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id))',tab);
 END LOOP;
END $$;
-- Purging quarantined rows is the safe direction: it discards input that never
-- became inventory. Applying is the direction that asserts something, and both
-- are held by the authority that writes to the graph.
CREATE POLICY scoped_purge ON app.import_rows FOR DELETE
 USING(app.in_scope(tenant_id,legal_entity_id,environment_id)
   AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('graph.write'));

GRANT SELECT,INSERT,UPDATE ON app.import_batches TO orvia_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON app.import_rows TO orvia_app;
REVOKE ALL ON app.import_batches,app.import_rows FROM PUBLIC;
