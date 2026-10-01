-- Independent recovery requires fresh, server-stamped transaction proof.
-- Historical evidence remains immutable and cannot qualify for this exception.
ALTER TABLE app.action_verifications ADD COLUMN verification_transaction xid8;
ALTER TABLE app.action_verifications ALTER COLUMN verification_transaction SET DEFAULT pg_current_xact_id();
CREATE FUNCTION app.stamp_verification_transaction() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.verification_transaction := pg_current_xact_id();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.stamp_verification_transaction() FROM PUBLIC;
CREATE TRIGGER verification_transaction_stamp BEFORE INSERT ON app.action_verifications
 FOR EACH ROW EXECUTE FUNCTION app.stamp_verification_transaction();
ALTER TABLE app.evidence_records ADD COLUMN recorded_transaction xid8;
ALTER TABLE app.evidence_records ALTER COLUMN recorded_transaction SET DEFAULT pg_current_xact_id();
CREATE FUNCTION app.stamp_evidence_transaction() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.recorded_transaction := pg_current_xact_id();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.stamp_evidence_transaction() FROM PUBLIC;
CREATE TRIGGER evidence_transaction_stamp BEFORE INSERT ON app.evidence_records
 FOR EACH ROW EXECUTE FUNCTION app.stamp_evidence_transaction();

CREATE OR REPLACE FUNCTION app.downstream_action_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'state'-'target_result'-'verification'-'block_reason'-'hold_ids'-'attempts'-'last_error_code'-'target_response_reference'-'requested_at'-'updated_at'-'v1_outcome_synced')
   IS DISTINCT FROM (to_jsonb(OLD)-'state'-'target_result'-'verification'-'block_reason'-'hold_ids'-'attempts'-'last_error_code'-'target_response_reference'-'requested_at'-'updated_at'-'v1_outcome_synced')
  THEN RAISE EXCEPTION 'An action keeps its identity, target and idempotency key' USING ERRCODE='23514'; END IF;
 IF OLD.state IN ('verified','cancelled','not_supported') AND NEW.state IS DISTINCT FROM OLD.state
  THEN RAISE EXCEPTION 'A terminal action state is final' USING ERRCODE='23514'; END IF;
 -- A failed verification is never turned into a pass by editing the row.
 IF OLD.verification IN ('FAILED','INCONCLUSIVE') AND NEW.verification='VERIFIED' AND NEW.attempts=OLD.attempts
  AND NOT (
   OLD.state='inconclusive' AND OLD.verification='INCONCLUSIVE'
   AND OLD.target_result IN ('ACCEPTED_BY_TARGET','COMPLETED_BY_TARGET','TIMEOUT_EFFECT_UNKNOWN')
   AND NEW.state='verified' AND NEW.target_result=OLD.target_result
   AND EXISTS (
    SELECT 1 FROM app.action_verifications v JOIN app.evidence_records e
     ON e.tenant_id=v.tenant_id AND e.legal_entity_id=v.legal_entity_id AND e.environment_id=v.environment_id AND e.id=v.evidence_id
    WHERE v.tenant_id=OLD.tenant_id AND v.legal_entity_id=OLD.legal_entity_id AND v.environment_id=OLD.environment_id
      AND v.action_id=OLD.id AND v.method='INDEPENDENT_READ_BACK' AND v.result='PASS'
      AND v.verification_transaction=pg_current_xact_id()
      AND e.entity_kind='downstream_action' AND e.entity_id=OLD.id
      AND e.origin='CONNECTOR' AND e.method='INDEPENDENT_READ_BACK'
      AND e.integrity_state='DIGEST_RECORDED' AND e.content_digest IS NOT NULL
      AND e.recorded_transaction=pg_current_xact_id()
   )
  )
  THEN RAISE EXCEPTION 'Verification can only pass through a new, recorded verification' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.downstream_action_guard FROM PUBLIC;
