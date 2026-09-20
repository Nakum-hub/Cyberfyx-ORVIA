-- WP26 / M30 Support Bundle System.
-- Three structural guarantees live here rather than in application code:
--  * a diagnostic draft is immutable, so the payload an approver previewed is
--    the payload that exists afterwards;
--  * an approval names one draft and one digest, so it cannot travel to another
--    report and can never cause one to be generated;
--  * the ingress validation table has no column in which a submitted body could
--    be kept, so "rejected bodies are not persisted" is a fact about the schema
--    rather than a promise about a code path.

CREATE TABLE app.support_cases (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 subject text NOT NULL CHECK(subject IN ('INSTALLATION_FAILURE','MIGRATION_FAILURE','POLICY_DECISION_UNAVAILABLE','CONNECTOR_OBSERVATION_FAILURE','EVIDENCE_EXPORT_FAILURE','LICENCE_VERIFICATION_FAILURE','UPDATE_FAILURE','PERFORMANCE_DEGRADATION')),
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','AWAITING_VENDOR','AWAITING_CUSTOMER','CLOSED')),
 -- The recorded coverage gap this case is about. The gap is what closes
 -- locally. There is deliberately no column here for local verification: it is
 -- read from the gap every time it is reported, so a vendor's answer can never
 -- be written into it.
 gap_id uuid,
 vendor_case_reference text CHECK(vendor_case_reference ~ '^[A-Z_][A-Z0-9_-]{3,39}$'),
 vendor_case_state text NOT NULL DEFAULT 'NOT_SUBMITTED' CHECK(vendor_case_state IN ('NOT_SUBMITTED','SUBMITTED','VENDOR_RESOLVED','VENDOR_CLOSED')),
 resolution_kind text CHECK(resolution_kind IN ('REVIEWED_INSTRUCTIONS','SIGNED_CUSTOMER_APPLIED_PATCH','NO_FIX_REQUIRED')),
 resolution_reference text,
 opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),opened_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,gap_id) REFERENCES app.coverage_gaps(tenant_id,legal_entity_id,environment_id,id),
 CHECK((resolution_kind IS NULL)=(resolution_reference IS NULL)),
 -- A vendor case cannot be resolved or closed without a reference to the case
 -- that was resolved, so "the vendor sorted it" always names which case.
 CHECK(NOT(vendor_case_state IN ('VENDOR_RESOLVED','VENDOR_CLOSED') AND vendor_case_reference IS NULL)));
CREATE INDEX support_cases_by_gap ON app.support_cases(tenant_id,legal_entity_id,environment_id,gap_id) WHERE gap_id IS NOT NULL;

CREATE TABLE app.support_canaries (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 token text NOT NULL,token_digest text NOT NULL CHECK(token_digest ~ '^[a-f0-9]{64}$'),
 note text NOT NULL,
 registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),registered_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,token_digest));

CREATE TABLE app.diagnostic_drafts (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 case_id uuid NOT NULL,
 payload jsonb NOT NULL,payload_digest text NOT NULL CHECK(payload_digest ~ '^[a-f0-9]{64}$'),
 canaries_checked integer NOT NULL CHECK(canaries_checked>=0),
 superseded boolean NOT NULL DEFAULT false,
 generated_at timestamptz NOT NULL DEFAULT clock_timestamp(),generated_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,case_id) REFERENCES app.support_cases(tenant_id,legal_entity_id,environment_id,id));
CREATE INDEX drafts_by_case ON app.diagnostic_drafts(tenant_id,legal_entity_id,environment_id,case_id,generated_at);

CREATE TABLE app.diagnostic_approvals (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 draft_id uuid NOT NULL,
 approved_digest text NOT NULL CHECK(approved_digest ~ '^[a-f0-9]{64}$'),
 destination text NOT NULL CHECK(destination IN ('VENDOR_SUPPORT_INGRESS','MANUAL_OFFLINE_TRANSFER')),
 purpose text NOT NULL CHECK(purpose='DIAGNOSE_REPORTED_FAILURE'),
 retention_days integer NOT NULL CHECK(retention_days BETWEEN 1 AND 365),
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),approved_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,draft_id) REFERENCES app.diagnostic_drafts(tenant_id,legal_entity_id,environment_id,id),
 -- One approval per draft. Approving twice is not a stronger approval; a second
 -- payload needs its own.
 UNIQUE(tenant_id,legal_entity_id,environment_id,draft_id));

CREATE TABLE app.diagnostic_transfers (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 approval_id uuid NOT NULL,
 digest_at_transfer text NOT NULL CHECK(digest_at_transfer ~ '^[a-f0-9]{64}$'),
 method text NOT NULL CHECK(method='MANUAL_OFFLINE_TRANSFER'),
 outcome text NOT NULL CHECK(outcome IN ('NOT_ATTEMPTED','ACCEPTED','REJECTED')),
 rejection_code text,evidence_reference text,note text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,approval_id) REFERENCES app.diagnostic_approvals(tenant_id,legal_entity_id,environment_id,id),
 -- A rejection names its reason. "It bounced" is not a record.
 CHECK((outcome='REJECTED')=(rejection_code IS NOT NULL)),
 CHECK(NOT(outcome='ACCEPTED' AND evidence_reference IS NULL)));

-- Deliberately six columns and no seventh. A submitted body has nowhere to go,
-- so the promise that rejected bodies are not persisted is kept by the schema.
CREATE TABLE app.support_ingress_validations (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 accepted boolean NOT NULL,
 rejection_code text CHECK(rejection_code IN ('MALFORMED_JSON','UNKNOWN_FIELD','SCHEMA_MISMATCH','OVERSIZED','FORBIDDEN_CONTENT','UNKNOWN_CASE_REFERENCE')),
 byte_length integer NOT NULL CHECK(byte_length>=0),
 validated_at timestamptz NOT NULL DEFAULT clock_timestamp(),validated_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 CHECK(accepted=(rejection_code IS NULL)));

-- A draft is the thing an approver looked at. It never changes afterwards; the
-- only permitted update is being marked superseded by a later draft, and even
-- that is one-way.
CREATE FUNCTION app.diagnostic_draft_is_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'A diagnostic draft is never deleted' USING ERRCODE='23514'; END IF;
 IF NEW.payload IS DISTINCT FROM OLD.payload OR NEW.payload_digest IS DISTINCT FROM OLD.payload_digest
   OR NEW.case_id IS DISTINCT FROM OLD.case_id OR NEW.generated_at IS DISTINCT FROM OLD.generated_at
   THEN RAISE EXCEPTION 'A diagnostic draft cannot be edited after it was previewed' USING ERRCODE='23514'; END IF;
 IF OLD.superseded AND NOT NEW.superseded
   THEN RAISE EXCEPTION 'A superseded draft does not become current again' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER draft_immutable BEFORE UPDATE OR DELETE ON app.diagnostic_drafts FOR EACH ROW EXECUTE FUNCTION app.diagnostic_draft_is_immutable();
REVOKE ALL ON FUNCTION app.diagnostic_draft_is_immutable FROM PUBLIC;

-- An approval is bound to the exact bytes that were previewed. Approving a
-- digest that is not this draft's is refused rather than corrected, because the
-- mismatch means the approver and the payload have parted company.
CREATE FUNCTION app.approval_is_bound_to_its_payload() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual text; stale boolean; BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'An approval is recorded once and never edited' USING ERRCODE='23514'; END IF;
 SELECT payload_digest,superseded INTO actual,stale FROM app.diagnostic_drafts
  WHERE tenant_id=NEW.tenant_id AND legal_entity_id=NEW.legal_entity_id AND environment_id=NEW.environment_id AND id=NEW.draft_id;
 IF actual IS DISTINCT FROM NEW.approved_digest
   THEN RAISE EXCEPTION 'An approval must name the exact payload that was previewed' USING ERRCODE='23514'; END IF;
 IF stale THEN RAISE EXCEPTION 'A superseded draft cannot be approved' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER approval_bound BEFORE INSERT OR UPDATE OR DELETE ON app.diagnostic_approvals FOR EACH ROW EXECUTE FUNCTION app.approval_is_bound_to_its_payload();
REVOKE ALL ON FUNCTION app.approval_is_bound_to_its_payload FROM PUBLIC;

-- A retry may resend the approved payload. It may not send a different one, and
-- it may not cause a fresh one to exist.
CREATE FUNCTION app.transfer_carries_the_approved_payload() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE approved text; BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'A transfer record is append-only' USING ERRCODE='23514'; END IF;
 SELECT approved_digest INTO approved FROM app.diagnostic_approvals
  WHERE tenant_id=NEW.tenant_id AND legal_entity_id=NEW.legal_entity_id AND environment_id=NEW.environment_id AND id=NEW.approval_id;
 IF approved IS DISTINCT FROM NEW.digest_at_transfer
   THEN RAISE EXCEPTION 'A transfer must carry exactly the approved payload' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER transfer_bound BEFORE INSERT OR UPDATE OR DELETE ON app.diagnostic_transfers FOR EACH ROW EXECUTE FUNCTION app.transfer_carries_the_approved_payload();
REVOKE ALL ON FUNCTION app.transfer_carries_the_approved_payload FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['support_cases','support_canaries','diagnostic_drafts','diagnostic_approvals','diagnostic_transfers','support_ingress_validations'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_support_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''support.read''))',tab);
 END LOOP;
END $$;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['support_cases','support_canaries','diagnostic_drafts','diagnostic_transfers','support_ingress_validations'] LOOP
  EXECUTE format('CREATE POLICY scoped_support_write ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''support.manage''))',tab);
 END LOOP;
END $$;
-- Approving a payload for release outside the installation needs its own
-- authority, which no amount of support.manage grants.
CREATE POLICY scoped_support_approve ON app.diagnostic_approvals FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('support.approve'));
CREATE POLICY scoped_case_update ON app.support_cases FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('support.manage'));
CREATE POLICY scoped_draft_supersede ON app.diagnostic_drafts FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('support.manage'));

GRANT SELECT,INSERT ON app.support_cases,app.support_canaries,app.diagnostic_drafts,app.diagnostic_approvals,app.diagnostic_transfers,app.support_ingress_validations TO orvia_app;
GRANT UPDATE ON app.support_cases,app.diagnostic_drafts TO orvia_app;
REVOKE ALL ON app.support_cases,app.support_canaries,app.diagnostic_drafts,app.diagnostic_approvals,app.diagnostic_transfers,app.support_ingress_validations FROM PUBLIC;

-- A diagnostic report states which schema revision this installation is on. The
-- ledger names migrations and nothing else, so reading it discloses no customer
-- data and saves the report from having to guess.
GRANT SELECT ON bootstrap_migrations TO orvia_app;
