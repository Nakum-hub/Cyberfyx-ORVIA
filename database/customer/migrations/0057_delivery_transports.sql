-- EX09 customer-controlled delivery: SMTP relays and webhooks the customer owns.
-- A transport's destination is fixed when it is recorded and it sends nothing
-- until someone other than its author enables it. A message is reviewed by
-- someone other than its author before it is queued, or comes from an alert
-- routing whose content was reviewed that way. Each delivery attempt is
-- leased, recorded with its outcome and receipt, and retried with backoff; a
-- timeout is recorded as an unknown effect, never as failure or success.
-- Credentials never enter the database: an SMTP password is read from a named
-- environment variable on the customer's host, and a webhook signing key is
-- derived from this installation's secret.
CREATE TABLE app.delivery_transports (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('SMTP','WEBHOOK')), name text NOT NULL,
 host text, port integer CHECK(port IS NULL OR port BETWEEN 1 AND 65535), security text CHECK(security IS NULL OR security IN ('TLS','NONE')), from_address text,
 credential_env text CHECK(credential_env IS NULL OR credential_env ~ '^ORVIA_TRANSPORT_[A-Z0-9_]{1,60}$'),
 url text, state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','ENABLED','DISABLED')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_by uuid, approved_at timestamptz, disabled_by uuid, disabled_at timestamptz, disable_reason text, secret_revealed_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 CHECK((kind='SMTP')=(host IS NOT NULL AND port IS NOT NULL AND security IS NOT NULL AND from_address IS NOT NULL AND url IS NULL)),
 CHECK((kind='WEBHOOK')=(url IS NOT NULL AND host IS NULL)),
 CHECK(approved_by IS NULL OR approved_by<>created_by),
 CHECK((state='DISABLED')=(disabled_at IS NOT NULL)));
CREATE TABLE app.alert_routings (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, transport_id uuid NOT NULL, recipient text NOT NULL, kinds text[] NOT NULL CHECK(kinds <@ ARRAY['DRIFT_TO_FAIL','RECOVERED','ERROR']::text[] AND cardinality(kinds)>0),
 subject_prefix text NOT NULL, state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','ENABLED','DISABLED')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), approved_by uuid, approved_at timestamptz, disabled_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,transport_id) REFERENCES app.delivery_transports(tenant_id,legal_entity_id,environment_id,id),
 CHECK(approved_by IS NULL OR approved_by<>created_by));
CREATE TABLE app.outbound_messages (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, transport_id uuid NOT NULL, source_kind text NOT NULL CHECK(source_kind IN ('NOTIFICATION_TASK','COMPLIANCE_ALERT','MANUAL')), source_id uuid,
 routing_id uuid, recipient text NOT NULL, subject text NOT NULL, body text NOT NULL, content_digest text NOT NULL CHECK(content_digest ~ '^[a-f0-9]{64}$'),
 review_state text NOT NULL DEFAULT 'DRAFT' CHECK(review_state IN ('DRAFT','APPROVED','REJECTED')),
 authored_by uuid NOT NULL, authored_at timestamptz NOT NULL DEFAULT clock_timestamp(), reviewed_by uuid, reviewed_at timestamptz, review_note text,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5), next_attempt_at timestamptz, lease_until timestamptz,
 outcome text CHECK(outcome IS NULL OR outcome IN ('SENT','EXHAUSTED','CANCELLED')), outcome_at timestamptz,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,transport_id) REFERENCES app.delivery_transports(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,routing_id) REFERENCES app.alert_routings(tenant_id,legal_entity_id,environment_id,id),
 CHECK((source_kind='MANUAL')=(source_id IS NULL)),
 -- A message is approved by a second person, or by the reviewed routing it came from.
 CHECK(review_state<>'APPROVED' OR (reviewed_by IS NOT NULL AND reviewed_by<>authored_by) OR routing_id IS NOT NULL),
 CHECK(outcome IS NULL OR review_state='APPROVED'));
CREATE UNIQUE INDEX outbound_alert_once ON app.outbound_messages(tenant_id,legal_entity_id,environment_id,routing_id,source_id) WHERE routing_id IS NOT NULL;
CREATE INDEX outbound_due ON app.outbound_messages(tenant_id,legal_entity_id,environment_id,next_attempt_at) WHERE review_state='APPROVED' AND outcome IS NULL;
CREATE TABLE app.outbound_attempts (
 tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL, environment_id uuid NOT NULL,
 id uuid NOT NULL, message_id uuid NOT NULL, attempt integer NOT NULL CHECK(attempt BETWEEN 1 AND 5),
 started_at timestamptz NOT NULL, finished_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 outcome text NOT NULL CHECK(outcome IN ('SENT','FAILED','UNKNOWN')), response_code text, receipt text, error_code text, possible_duplicate boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id), UNIQUE(tenant_id,legal_entity_id,environment_id,message_id,attempt),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,message_id) REFERENCES app.outbound_messages(tenant_id,legal_entity_id,environment_id,id));

CREATE FUNCTION app.delivery_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Delivery records are never deleted' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='outbound_attempts' THEN RAISE EXCEPTION 'A delivery attempt is never altered' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='delivery_transports' THEN
  IF (NEW.id,NEW.kind,NEW.name,NEW.host,NEW.port,NEW.security,NEW.from_address,NEW.credential_env,NEW.url,NEW.created_by) IS DISTINCT FROM (OLD.id,OLD.kind,OLD.name,OLD.host,OLD.port,OLD.security,OLD.from_address,OLD.credential_env,OLD.url,OLD.created_by)
     OR OLD.state='DISABLED' OR (OLD.state='ENABLED' AND NEW.state NOT IN ('ENABLED','DISABLED')) OR (OLD.secret_revealed_at IS NOT NULL AND NEW.secret_revealed_at IS DISTINCT FROM OLD.secret_revealed_at)
  THEN RAISE EXCEPTION 'A transport keeps its destination; it is enabled once and disabled once' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='alert_routings' THEN
  IF (NEW.id,NEW.transport_id,NEW.recipient,NEW.kinds,NEW.subject_prefix,NEW.created_by) IS DISTINCT FROM (OLD.id,OLD.transport_id,OLD.recipient,OLD.kinds,OLD.subject_prefix,OLD.created_by) OR OLD.state='DISABLED'
  THEN RAISE EXCEPTION 'A routing keeps its content; it is enabled once and disabled once' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.transport_id,NEW.source_kind,NEW.source_id,NEW.routing_id,NEW.recipient,NEW.subject,NEW.body,NEW.content_digest,NEW.authored_by) IS DISTINCT FROM
     (OLD.id,OLD.transport_id,OLD.source_kind,OLD.source_id,OLD.routing_id,OLD.recipient,OLD.subject,OLD.body,OLD.content_digest,OLD.authored_by)
     OR OLD.outcome IS NOT NULL OR (OLD.review_state<>'DRAFT' AND NEW.review_state<>OLD.review_state) OR NEW.attempts<OLD.attempts
  THEN RAISE EXCEPTION 'A message keeps its reviewed content and moves forward only' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION app.delivery_guard FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['delivery_transports','alert_routings','outbound_messages','outbound_attempts'] LOOP
  EXECUTE format('CREATE TRIGGER guard BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.delivery_guard()',tab);
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC',tab);
  EXECUTE format('CREATE POLICY staff_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''notification.read''))',tab);
  EXECUTE format('CREATE POLICY machine_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''MACHINE'' AND app.has_capability(''operations.execute''))',tab);
 END LOOP;
END $$;
CREATE POLICY staff_write ON app.delivery_transports FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('notification.manage') AND state='PENDING');
CREATE POLICY staff_decide ON app.delivery_transports FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND (app.has_capability('connection.enable') OR app.has_capability('notification.manage')))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY staff_write ON app.alert_routings FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('notification.manage') AND state='PENDING');
CREATE POLICY staff_decide ON app.alert_routings FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('notification.manage'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY staff_write ON app.outbound_messages FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('notification.manage') AND review_state='DRAFT' AND routing_id IS NULL);
CREATE POLICY staff_review ON app.outbound_messages FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('notification.manage'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY machine_alert ON app.outbound_messages FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute') AND routing_id IS NOT NULL AND review_state='APPROVED');
CREATE POLICY machine_deliver ON app.outbound_messages FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute'))
 WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id));
CREATE POLICY machine_attempt ON app.outbound_attempts FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='MACHINE' AND app.has_capability('operations.execute'));
GRANT SELECT,INSERT,UPDATE ON app.delivery_transports, app.alert_routings, app.outbound_messages TO orvia_app;
GRANT SELECT ON app.outbound_attempts TO orvia_app;
GRANT SELECT ON app.delivery_transports, app.alert_routings TO orvia_worker;
GRANT SELECT,INSERT,UPDATE ON app.outbound_messages TO orvia_worker;
GRANT SELECT,INSERT ON app.outbound_attempts TO orvia_worker;
-- A notification task sent through a transport records the send as a fact on its own log, with the transport's receipt as evidence.
CREATE POLICY runner_transport_delivery_insert ON app.notification_deliveries FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND app.operations_runner() AND fact IN ('SENT','FAILED')
 AND EXISTS(SELECT 1 FROM app.outbound_messages m WHERE m.tenant_id=notification_deliveries.tenant_id AND m.legal_entity_id=notification_deliveries.legal_entity_id AND m.environment_id=notification_deliveries.environment_id
  AND m.source_kind='NOTIFICATION_TASK' AND m.source_id=notification_deliveries.task_id));
