-- Owner decision 2026-10-01 (revision 1.10, real-person decoys): a real person's record may be designated as a withdrawal
-- canary, but ORVIA never transmits anything to that person's mailbox. A message addressed to a real-person decoy is still
-- accepted from its author and recorded as a hit (0079); when it is due, it is WITHHELD instead of sent. Synthetic decoys
-- (organisation-owned decoy mailboxes) keep their existing behaviour.
--
-- A decoy counts while PENDING or ACTIVE. A retired decoy is an ordinary person again.
ALTER TABLE app.outbound_messages DROP CONSTRAINT outbound_messages_outcome_check;
ALTER TABLE app.outbound_messages ADD CONSTRAINT outbound_messages_outcome_check
  CHECK (outcome IS NULL OR outcome IN ('SENT', 'EXHAUSTED', 'CANCELLED', 'WITHHELD'));

CREATE FUNCTION app.real_decoy_recipient(p_tenant uuid, p_entity uuid, p_environment uuid, p_recipient text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT EXISTS (SELECT 1 FROM app.withdrawal_canaries w JOIN app.principal_references p
   ON p.tenant_id = w.tenant_id AND p.legal_entity_id = w.legal_entity_id AND p.environment_id = w.environment_id AND p.id = w.principal_id
  WHERE w.tenant_id = p_tenant AND w.legal_entity_id = p_entity AND w.environment_id = p_environment
    AND w.state IN ('PENDING', 'ACTIVE') AND NOT p.synthetic AND lower(p.email) = lower(btrim(p_recipient))) $$;
REVOKE ALL ON FUNCTION app.real_decoy_recipient(uuid, uuid, uuid, text) FROM PUBLIC;

-- The database refuses to start a delivery attempt to a real-person decoy, whatever code path claims the message.
CREATE FUNCTION app.real_decoy_delivery_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
BEGIN
 IF NEW.attempts > OLD.attempts AND app.real_decoy_recipient(OLD.tenant_id, OLD.legal_entity_id, OLD.environment_id, OLD.recipient) THEN
  RAISE EXCEPTION 'real_decoy_delivery_refused' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.real_decoy_delivery_guard() FROM PUBLIC;
CREATE TRIGGER real_decoy_delivery_guard BEFORE UPDATE OF attempts ON app.outbound_messages FOR EACH ROW EXECUTE FUNCTION app.real_decoy_delivery_guard();

-- Called by the delivery runner before it claims a due message. Marks the message WITHHELD and returns true when its recipient
-- is a real-person decoy in the caller's scope; otherwise changes nothing and returns false.
CREATE FUNCTION app.withhold_real_decoy_message(p_message uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE m record;
BEGIN
 SELECT tenant_id, legal_entity_id, environment_id, id, recipient INTO m FROM app.outbound_messages
  WHERE id = p_message AND app.in_scope(tenant_id, legal_entity_id, environment_id) AND review_state = 'APPROVED' AND outcome IS NULL;
 IF m.id IS NULL OR NOT app.real_decoy_recipient(m.tenant_id, m.legal_entity_id, m.environment_id, m.recipient) THEN RETURN false; END IF;
 UPDATE app.outbound_messages SET outcome = 'WITHHELD', outcome_at = clock_timestamp(), lease_until = NULL
  WHERE tenant_id = m.tenant_id AND legal_entity_id = m.legal_entity_id AND environment_id = m.environment_id AND id = m.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION app.withhold_real_decoy_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.withhold_real_decoy_message(uuid) TO orvia_worker;
-- Neither helper may tell any other runtime role who the real-person decoys are.
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['orvia_app', 'orvia_worker', 'orvia_agent_control', 'orvia_machine_auth', 'orvia_sender'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
   EXECUTE format('REVOKE ALL ON FUNCTION app.real_decoy_recipient(uuid, uuid, uuid, text) FROM %I', r);
   IF r <> 'orvia_worker' THEN EXECUTE format('REVOKE ALL ON FUNCTION app.withhold_real_decoy_message(uuid) FROM %I', r); END IF;
  END IF;
 END LOOP;
END $$;
