-- WP11 / M10 Notification Engine.
-- Queued, sent, delivered, failed and acknowledged are rows in one append-only
-- log, not columns on a task, because they are five different facts about one
-- message and only the first is something this product did itself.

CREATE TABLE app.notification_templates (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 code text NOT NULL CHECK(code ~ '^[A-Z][A-Z0-9_]{2,60}$'),
 version integer NOT NULL CHECK(version>0),
 channel text NOT NULL CHECK(channel IN ('IN_APP','EMAIL','APPROVED_WEBHOOK')),
 recipient_scope text NOT NULL CHECK(recipient_scope IN ('CUSTOMER_STAFF','DATA_PRINCIPAL','DESIGNATED_BUSINESS_CONTACT')),
 content_digest text NOT NULL CHECK(content_digest ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 UNIQUE(tenant_id,legal_entity_id,environment_id,code,version));

CREATE TABLE app.notification_tasks (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 template_id uuid NOT NULL,
 source text NOT NULL CHECK(source IN ('COVERAGE_GAP','NOTIFICATION_OBLIGATION','ASSESSMENT_FINDING')),
 source_id uuid NOT NULL,
 recipient_reference text NOT NULL,
 -- The deadline that made this necessary. Escalation never changes it, and the
 -- trigger below makes that a guarantee rather than an intention.
 source_due_at timestamptz,
 escalated_at timestamptz,escalation_reason text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),UNIQUE(id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,template_id) REFERENCES app.notification_templates(tenant_id,legal_entity_id,environment_id,id),
 CHECK((escalated_at IS NULL)=(escalation_reason IS NULL)));
CREATE INDEX tasks_by_source ON app.notification_tasks(tenant_id,legal_entity_id,environment_id,source,source_id);
CREATE INDEX tasks_by_due ON app.notification_tasks(tenant_id,legal_entity_id,environment_id,source_due_at) WHERE escalated_at IS NULL;

CREATE TABLE app.notification_deliveries (
 tenant_id uuid NOT NULL,legal_entity_id uuid NOT NULL,environment_id uuid NOT NULL,id uuid NOT NULL,
 task_id uuid NOT NULL,
 fact text NOT NULL CHECK(fact IN ('QUEUED','SENT','DELIVERED','FAILED','ACKNOWLEDGED')),
 evidence_reference text,note text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by uuid NOT NULL,
 PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id),
 FOREIGN KEY(tenant_id,legal_entity_id,environment_id,task_id) REFERENCES app.notification_tasks(tenant_id,legal_entity_id,environment_id,id),
 -- Queueing is the one thing this product does itself; everything after it is a
 -- claim about the outside world and must name its evidence.
 CHECK(NOT(fact<>'QUEUED' AND evidence_reference IS NULL)));
CREATE INDEX deliveries_by_task ON app.notification_deliveries(tenant_id,legal_entity_id,environment_id,task_id,recorded_at);

CREATE FUNCTION app.delivery_log_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'The delivery log is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER deliveries_immutable BEFORE UPDATE OR DELETE ON app.notification_deliveries FOR EACH ROW EXECUTE FUNCTION app.delivery_log_is_append_only();
REVOKE ALL ON FUNCTION app.delivery_log_is_append_only FROM PUBLIC;

-- The guarantee this module exists to make: escalating a task raises attention
-- and does not move the deadline that caused it.
CREATE FUNCTION app.escalation_never_moves_a_deadline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.source_due_at IS DISTINCT FROM OLD.source_due_at
  THEN RAISE EXCEPTION 'A notification task cannot change the deadline that caused it' USING ERRCODE='23514'; END IF;
 IF OLD.escalated_at IS NOT NULL AND NEW.escalated_at IS DISTINCT FROM OLD.escalated_at
  THEN RAISE EXCEPTION 'An escalation is recorded once' USING ERRCODE='23514'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER escalation_preserves_deadline BEFORE UPDATE ON app.notification_tasks FOR EACH ROW EXECUTE FUNCTION app.escalation_never_moves_a_deadline();
REVOKE ALL ON FUNCTION app.escalation_never_moves_a_deadline FROM PUBLIC;

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['notification_templates','notification_tasks','notification_deliveries'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY scoped_notification_read ON app.%I FOR SELECT USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''notification.read''))',tab);
  EXECUTE format('CREATE POLICY scoped_notification_insert ON app.%I FOR INSERT WITH CHECK(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting(''orvia.actor_domain'',true)=''STAFF'' AND app.has_capability(''notification.manage''))',tab);
 END LOOP;
END $$;
CREATE POLICY scoped_task_update ON app.notification_tasks FOR UPDATE USING(app.in_scope(tenant_id,legal_entity_id,environment_id) AND current_setting('orvia.actor_domain',true)='STAFF' AND app.has_capability('notification.manage'));
GRANT SELECT,INSERT ON app.notification_templates,app.notification_tasks,app.notification_deliveries TO orvia_app;
GRANT UPDATE ON app.notification_tasks TO orvia_app;
REVOKE ALL ON app.notification_templates,app.notification_tasks,app.notification_deliveries FROM PUBLIC;
