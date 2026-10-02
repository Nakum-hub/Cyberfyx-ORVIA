-- Withdrawal canaries ("canary trap"; DPDP Act s6(4)-(6): processing must stop when consent is withdrawn and consent must be
-- the person's own). A canary is a decoy Data Principal the organisation plants in its own systems: a synthetic person who has
-- never consented, or whose consent is withdrawn. Nobody legitimately markets to a canary or records consent for one, so any
-- such attempt is evidence that a system or a person is not honouring withdrawal. ORVIA traps three things on its own side and
-- lets staff record a fourth:
--   SEND_ADMISSION    a sender asked ORVIA to admit a message to the canary (the decision is BLOCK; the attempt is recorded);
--   OUTBOUND_MESSAGE  a message from an ORVIA transport was addressed to the canary (refused, recorded);
--   CONSENT_RECORDED  a grant was recorded for the canary, through the portal, an import, an operator or a source system;
--   REPORTED_RECEIPT  the canary's mailbox or phone received a message outside ORVIA (recorded by staff with evidence).
-- A canary is created by one person and activated by another, only while it holds no granted consent. Hits are append-only
-- except for one review. Canaries use synthetic addresses, so they work before real people can be recorded.
CREATE TABLE app.withdrawal_canaries (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 label text NOT NULL CHECK (length(btrim(label)) BETWEEN 3 AND 120),
 principal_id uuid NOT NULL, planted_in text NOT NULL CHECK (length(btrim(planted_in)) BETWEEN 3 AND 500),
 state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'ACTIVE', 'RETIRED')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 activated_by uuid, activated_at timestamptz, retired_at timestamptz,
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, principal_id) REFERENCES app.principal_references(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((state = 'PENDING') = (activated_at IS NULL)), CHECK ((activated_at IS NULL) = (activated_by IS NULL)), CHECK (activated_by IS NULL OR activated_by <> created_by),
 CHECK ((state = 'RETIRED') = (retired_at IS NOT NULL)));
CREATE UNIQUE INDEX withdrawal_canaries_one_per_principal ON app.withdrawal_canaries(tenant_id, legal_entity_id, environment_id, principal_id) WHERE state <> 'RETIRED';

CREATE TABLE app.canary_hits (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL, id uuid NOT NULL,
 canary_id uuid NOT NULL, source text NOT NULL CHECK (source IN ('SEND_ADMISSION', 'OUTBOUND_MESSAGE', 'CONSENT_RECORDED', 'REPORTED_RECEIPT')),
 actor_id uuid NOT NULL, actor_domain text NOT NULL CHECK (actor_domain IN ('STAFF', 'PRINCIPAL', 'MACHINE')),
 system_id uuid, detail text NOT NULL CHECK (length(detail) BETWEEN 3 AND 1000), evidence_reference text CHECK (evidence_reference IS NULL OR length(evidence_reference) <= 500),
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp(), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reviewed_by uuid, reviewed_at timestamptz, review_note text CHECK (review_note IS NULL OR length(btrim(review_note)) BETWEEN 3 AND 1000),
 PRIMARY KEY (tenant_id, legal_entity_id, environment_id, id), UNIQUE (id),
 FOREIGN KEY (tenant_id, legal_entity_id, environment_id, canary_id) REFERENCES app.withdrawal_canaries(tenant_id, legal_entity_id, environment_id, id),
 CHECK ((reviewed_at IS NULL) = (reviewed_by IS NULL) AND (reviewed_at IS NULL) = (review_note IS NULL)));
CREATE INDEX canary_hits_by_canary ON app.canary_hits(tenant_id, legal_entity_id, environment_id, canary_id, recorded_at DESC);

CREATE FUNCTION app.canary_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'canary_records_are_retained' USING ERRCODE = '23514'; END IF;
 IF TG_TABLE_NAME = 'withdrawal_canaries' THEN
  IF (NEW.id, NEW.label, NEW.principal_id, NEW.planted_in, NEW.created_by, NEW.created_at) IS DISTINCT FROM (OLD.id, OLD.label, OLD.principal_id, OLD.planted_in, OLD.created_by, OLD.created_at)
     OR NOT ((OLD.state = 'PENDING' AND NEW.state IN ('ACTIVE', 'RETIRED')) OR (OLD.state = 'ACTIVE' AND NEW.state = 'RETIRED'))
  THEN RAISE EXCEPTION 'canary_transition_refused' USING ERRCODE = '23514'; END IF;
 ELSE
  IF OLD.reviewed_at IS NOT NULL OR NEW.reviewed_at IS NULL OR (to_jsonb(NEW) - 'reviewed_by' - 'reviewed_at' - 'review_note') IS DISTINCT FROM (to_jsonb(OLD) - 'reviewed_by' - 'reviewed_at' - 'review_note')
  THEN RAISE EXCEPTION 'canary_hit_is_reviewed_once_and_never_edited' USING ERRCODE = '23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.withdrawal_canaries FOR EACH ROW EXECUTE FUNCTION app.canary_guard();
CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.canary_hits FOR EACH ROW EXECUTE FUNCTION app.canary_guard();
REVOKE ALL ON FUNCTION app.canary_guard() FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['withdrawal_canaries', 'canary_hits'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC', tab);
  -- Which principals are canaries is sensitive: a sender that could read it could skip them.
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting(''orvia.actor_domain'', true) = ''STAFF'' AND app.has_capability(''registry.sensitive.read''))', tab);
 END LOOP;
END $$;
CREATE POLICY staff_create ON app.withdrawal_canaries FOR INSERT WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.sensitive.write') AND state = 'PENDING');
CREATE POLICY staff_decide ON app.withdrawal_canaries FOR UPDATE USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.sensitive.write')) WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id));
CREATE POLICY staff_report ON app.canary_hits FOR INSERT WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.sensitive.write') AND source = 'REPORTED_RECEIPT');
CREATE POLICY staff_review ON app.canary_hits FOR UPDATE USING (app.in_scope(tenant_id, legal_entity_id, environment_id) AND current_setting('orvia.actor_domain', true) = 'STAFF' AND app.has_capability('registry.sensitive.write')) WITH CHECK (app.in_scope(tenant_id, legal_entity_id, environment_id));
GRANT SELECT, INSERT, UPDATE ON app.withdrawal_canaries, app.canary_hits TO orvia_app;

-- The trap. Called by send admission and outbound messages; never tells the caller whether it trapped, so a sender cannot
-- probe which people are canaries. Matches an ACTIVE canary in the caller's scope by principal or by the principal's email.
CREATE FUNCTION app.canary_trap(p_principal uuid, p_email text, p_source text, p_system uuid, p_detail text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE k record;
BEGIN
 IF p_source NOT IN ('SEND_ADMISSION', 'OUTBOUND_MESSAGE') THEN RAISE EXCEPTION 'canary_trap_source_refused' USING ERRCODE = '22023'; END IF;
 SELECT w.tenant_id, w.legal_entity_id, w.environment_id, w.id INTO k FROM app.withdrawal_canaries w JOIN app.principal_references p
   ON p.tenant_id = w.tenant_id AND p.legal_entity_id = w.legal_entity_id AND p.environment_id = w.environment_id AND p.id = w.principal_id
  WHERE w.state = 'ACTIVE' AND app.in_scope(w.tenant_id, w.legal_entity_id, w.environment_id)
    AND (w.principal_id = p_principal OR (p_email IS NOT NULL AND lower(p.email) = lower(btrim(p_email)))) LIMIT 1;
 IF k.id IS NULL THEN RETURN; END IF;
 INSERT INTO app.canary_hits(tenant_id, legal_entity_id, environment_id, id, canary_id, source, actor_id, actor_domain, system_id, detail)
  VALUES (k.tenant_id, k.legal_entity_id, k.environment_id, gen_random_uuid(), k.id, p_source, current_setting('orvia.actor_id')::uuid,
          current_setting('orvia.actor_domain'), p_system, left(p_detail, 1000));
END $$;
REVOKE ALL ON FUNCTION app.canary_trap(uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.canary_trap(uuid, text, text, uuid, text) TO orvia_app, orvia_sender, orvia_worker;

-- A grant recorded for an ACTIVE canary, by any path (portal, import, operator, source system), is itself a hit: nobody can have
-- obtained that person's consent. Covers both consent models (A00 aggregates and the DPDP registry consent records).
CREATE FUNCTION app.canary_consent_trap() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE principal uuid; k uuid; via text;
BEGIN
 IF TG_TABLE_NAME = 'consent_aggregates' THEN
  IF NEW.state <> 'GRANTED' OR (TG_OP = 'UPDATE' AND OLD.state = 'GRANTED' AND OLD.epoch = NEW.epoch) THEN RETURN NEW; END IF;
  principal := NEW.principal_id; via := 'portal or consent API';
 ELSE
  IF NEW.event <> 'GRANTED' THEN RETURN NEW; END IF;
  SELECT d.principal_id INTO principal FROM app.consent_records r JOIN app.data_principals d
    ON d.tenant_id = r.tenant_id AND d.legal_entity_id = r.legal_entity_id AND d.environment_id = r.environment_id AND d.id = r.subject_id
   WHERE r.tenant_id = NEW.tenant_id AND r.legal_entity_id = NEW.legal_entity_id AND r.environment_id = NEW.environment_id AND r.id = NEW.record_id;
  via := 'consent record (' || lower(NEW.source) || ')';
 END IF;
 IF principal IS NULL THEN RETURN NEW; END IF;
 SELECT id INTO k FROM app.withdrawal_canaries WHERE tenant_id = NEW.tenant_id AND legal_entity_id = NEW.legal_entity_id AND environment_id = NEW.environment_id
   AND principal_id = principal AND state = 'ACTIVE';
 IF k IS NULL THEN RETURN NEW; END IF;
 INSERT INTO app.canary_hits(tenant_id, legal_entity_id, environment_id, id, canary_id, source, actor_id, actor_domain, system_id, detail)
  VALUES (NEW.tenant_id, NEW.legal_entity_id, NEW.environment_id, gen_random_uuid(), k, 'CONSENT_RECORDED',
          coalesce(nullif(current_setting('orvia.actor_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
          coalesce(nullif(current_setting('orvia.actor_domain', true), ''), 'MACHINE'), NULL,
          'A consent grant was recorded for a withdrawal canary via ' || via || '. Nobody can have obtained this person''s consent.');
 RETURN NEW;
END $$;
CREATE TRIGGER canary_consent_trap AFTER INSERT OR UPDATE OF state, epoch ON app.consent_aggregates FOR EACH ROW EXECUTE FUNCTION app.canary_consent_trap();
CREATE TRIGGER canary_consent_trap AFTER INSERT ON app.consent_record_events FOR EACH ROW EXECUTE FUNCTION app.canary_consent_trap();
REVOKE ALL ON FUNCTION app.canary_consent_trap() FROM PUBLIC;

-- Counts only, for staff without sensitive access (Operations attention shows that hits exist, not who the canaries are).
CREATE FUNCTION app.canary_open_hits() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
 SELECT count(*)::int FROM app.canary_hits WHERE app.in_scope(tenant_id, legal_entity_id, environment_id) AND reviewed_at IS NULL $$;
REVOKE ALL ON FUNCTION app.canary_open_hits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.canary_open_hits() TO orvia_app;
