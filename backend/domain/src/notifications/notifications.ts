import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';
import { channelAvailable } from '../delivery/delivery.ts';

/**
 * M10 Notification Engine.
 *
 * Queued, sent, delivered, failed and acknowledged are five different facts
 * about one message, stored as rows in an append-only log rather than as a
 * status that advances. Only queueing is something ORVIA does; everything after
 * it is a claim about the outside world and has to name its evidence.
 *
 * Escalation is the reason this module exists: an overdue gap and an overdue
 * notification duty both need somebody told, and neither may have its deadline
 * quietly moved in the process. The database enforces that, not just this file.
 */

/**
 * Which channels this deployment can actually deliver on. A channel is
 * available only while an enabled customer-controlled transport serves it
 * (EX09: an SMTP relay for EMAIL, a webhook for APPROVED_WEBHOOK). There is
 * still no in-app inbox. Pretending otherwise would queue messages that
 * silently go nowhere.
 */

const time = (value: Date | null) => value?.toISOString() ?? null;

// --- templates ----------------------------------------------------------------

export async function createTemplate(c: Context, input: unknown) {
  const value = S.TemplateCreate.parse(input);
  const scope = scopeValues(c.actor);
  const latest = await c.tx.query(`SELECT max(version)::int AS v FROM app.notification_templates WHERE ${predicate} AND code=$4`, [...scope, value.code]);
  const version = Number(latest.rows[0]?.v ?? 0) + 1;
  const id = randomUUID();
  const document = S.Template.parse({ ...value, id, version, content_digest: digest(value), recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id });
  await c.tx.query(`INSERT INTO app.notification_templates(tenant_id,legal_entity_id,environment_id,id,code,version,channel,recipient_scope,content_digest,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
  [...scope, id, value.code, version, value.channel, value.recipient_scope, document.content_digest, c.actor.actor_id, document]);
  await audit(c, 'notification_template.create', id);
  return document;
}

export async function templateList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document FROM app.notification_templates WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.Template.parse(row.document)), page);
}

// --- tasks ---------------------------------------------------------------------

type TaskRow = {
  id: string; template_id: string; source: string; source_id: string; recipient_reference: string;
  source_due_at: Date | null; escalated_at: Date | null; escalation_reason: string | null; created_at: Date;
  template: { code: string; channel: string; recipient_scope: string };
};

async function assembleTask(c: Context, row: TaskRow) {
  const scope = scopeValues(c.actor);
  const deliveries = await c.tx.query(`SELECT * FROM app.notification_deliveries WHERE ${predicate} AND task_id=$4 ORDER BY recorded_at,id`, [...scope, row.id]);
  const facts = new Set(deliveries.rows.map(delivery => delivery.fact as string));
  return S.NotificationTask.parse({
    id: row.id, template_id: row.template_id, template_code: row.template.code, channel: row.template.channel,
    recipient_scope: row.template.recipient_scope, recipient_reference: row.recipient_reference,
    source: row.source, source_id: row.source_id, source_due_at: time(row.source_due_at),
    created_at: row.created_at.toISOString(),
    // Five independent booleans, not a progress bar. A failed send and a later
    // successful one both stay true, because both happened.
    queued: facts.has('QUEUED'), sent: facts.has('SENT'), delivered: facts.has('DELIVERED'),
    failed: facts.has('FAILED'), acknowledged: facts.has('ACKNOWLEDGED'),
    attempts: deliveries.rows.filter(delivery => ['SENT', 'FAILED'].includes(delivery.fact as string)).length,
    channel_available: await channelAvailable(c, row.template.channel),
    escalated_at: time(row.escalated_at), escalation_reason: row.escalation_reason,
    deliveries: deliveries.rows.map(delivery => S.Delivery.parse({
      id: delivery.id, task_id: delivery.task_id, fact: delivery.fact,
      evidence_reference: delivery.evidence_reference, note: delivery.note,
      recorded_at: delivery.recorded_at.toISOString(), recorded_by: delivery.recorded_by,
    })),
  });
}

async function readTaskRow(c: Context, id: string) {
  return requireOne((await c.tx.query(`SELECT t.*,m.document AS template FROM app.notification_tasks t
    JOIN app.notification_templates m ON m.tenant_id=t.tenant_id AND m.legal_entity_id=t.legal_entity_id AND m.environment_id=t.environment_id AND m.id=t.template_id
    WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3 AND t.id=$4`, [...scopeValues(c.actor), id])).rows) as TaskRow;
}

/** The source deadline is copied once, at creation, from the record that caused
 *  this task. Nothing afterwards may change it. */
/** The record each source points at, and its key. DPDP operations sources were added in 0.18.0. */
const SOURCE_RECORD: Record<S.NotificationSourceValue, [string, string]> = {
  COVERAGE_GAP: ['coverage_gaps', 'id'], NOTIFICATION_OBLIGATION: ['notification_obligations', 'id'], ASSESSMENT_FINDING: ['assessment_findings', 'id'],
  DPDP_BREACH_TASK: ['breach_tasks', 'id'], DPDP_RIGHTS_DEADLINE: ['rights_case_profiles', 'rights_request_id'], DPDP_ACTION_FAILURE: ['downstream_actions', 'id'],
  DPDP_REGULATORY_CHANGE: ['regulatory_impacts', 'id'], DPDP_SDF_OBLIGATION: ['sdf_obligations', 'id'],
};
export async function createNotificationTask(c: Context, input: unknown) {
  const value = S.NotificationTaskCreate.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.notification_templates WHERE ${predicate} AND id=$4`, [...scope, value.template_id])).rows);
  // A task must point at a record that exists, so a notice can never be raised
  // about something nobody can open.
  const [table, key] = SOURCE_RECORD[value.source];
  requireOne((await c.tx.query(`SELECT ${key} FROM app.${table} WHERE ${predicate} AND ${key}=$4`, [...scope, value.source_id])).rows);
  const existing = await c.tx.query(`SELECT id FROM app.notification_tasks WHERE ${predicate} AND source=$4 AND source_id=$5 AND template_id=$6`, [...scope, value.source, value.source_id, value.template_id]);
  if (existing.rowCount) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.notification_tasks(tenant_id,legal_entity_id,environment_id,id,template_id,source,source_id,recipient_reference,source_due_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [...scope, id, value.template_id, value.source, value.source_id, value.recipient_reference, value.source_due_at]);
  // Queueing is the one act ORVIA performs itself, so it is recorded immediately
  // and needs no external evidence.
  await c.tx.query(`INSERT INTO app.notification_deliveries(tenant_id,legal_entity_id,environment_id,id,task_id,fact,evidence_reference,note,recorded_by)
    VALUES($1,$2,$3,$4,$5,'QUEUED',NULL,$6,$7)`,
  [...scope, randomUUID(), id, await channelAvailable(c, (await readTaskRow(c, id)).template.channel)
    ? 'Queued; compose a reviewed message on an enabled transport to send it.'
    : 'Queued, but this deployment has no configured transport for that channel; it will not be sent.', c.actor.actor_id]);
  await audit(c, 'notification_task.create', id);
  return assembleTask(c, await readTaskRow(c, id));
}

export async function notificationTaskList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT t.*,m.document AS template FROM app.notification_tasks t
    JOIN app.notification_templates m ON m.tenant_id=t.tenant_id AND m.legal_entity_id=t.legal_entity_id AND m.environment_id=t.environment_id AND m.id=t.template_id
    WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3 AND ($4::uuid IS NULL OR t.id>$4) ORDER BY t.id LIMIT $5`,
  [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  const items = [];
  for (const row of result.rows) items.push(await assembleTask(c, row as TaskRow));
  return paged(items, page);
}

export async function readNotificationTask(c: Context, id: string) {
  return assembleTask(c, await readTaskRow(c, id));
}

/** FR-M10-03: each fact is appended, never overwritten, and nothing beyond
 *  queueing may be recorded without evidence or on a channel that cannot deliver. */
export async function recordDelivery(c: Context, id: string, input: unknown) {
  const value = S.DeliveryRecord.parse(input);
  const scope = scopeValues(c.actor);
  const row = await readTaskRow(c, id);
  const current = await assembleTask(c, row);
  if (value.fact === 'SENT' && !current.channel_available) {
    throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'fact', code: 'no_configured_transport_for_this_channel' }]);
  }
  // Delivery presupposes sending and acknowledgement presupposes delivery. The
  // point is not ceremony: claiming a later fact without the earlier one is how
  // "we notified them" comes to mean nothing.
  if (value.fact === 'DELIVERED' && !current.sent) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'fact', code: 'nothing_was_recorded_as_sent' }]);
  if (value.fact === 'ACKNOWLEDGED' && !current.delivered) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'fact', code: 'nothing_was_recorded_as_delivered' }]);
  await c.tx.query(`INSERT INTO app.notification_deliveries(tenant_id,legal_entity_id,environment_id,id,task_id,fact,evidence_reference,note,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
  [...scope, randomUUID(), id, value.fact, value.evidence_reference, value.note, c.actor.actor_id]);
  await audit(c, 'notification.' + value.fact.toLowerCase(), id);
  return assembleTask(c, await readTaskRow(c, id));
}

/**
 * FR-M10-03. Raise attention on every task whose source deadline has passed and
 * which has not yet reached the recipient. The deadline itself is untouched, and
 * the returned sweep asserts that as a literal zero rather than merely implying it.
 */
export async function escalationSweep(c: Context) {
  const scope = scopeValues(c.actor);
  const now = new Date();
  const candidates = await c.tx.query(`SELECT t.id,t.source_due_at FROM app.notification_tasks t
    WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3
      AND t.source_due_at IS NOT NULL AND t.source_due_at<$4 AND t.escalated_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM app.notification_deliveries d WHERE d.tenant_id=t.tenant_id AND d.legal_entity_id=t.legal_entity_id
        AND d.environment_id=t.environment_id AND d.task_id=t.id AND d.fact IN ('DELIVERED','ACKNOWLEDGED'))
    ORDER BY t.id`, [...scope, now]);
  let escalated = 0;
  for (const row of candidates.rows) {
    await c.tx.query(`UPDATE app.notification_tasks SET escalated_at=$4,escalation_reason=$5 WHERE ${predicate} AND id=$6`,
      [...scope, now, `The deadline of ${row.source_due_at.toISOString()} passed without this reaching its recipient. The deadline is unchanged.`, row.id]);
    escalated += 1;
  }
  await audit(c, 'notification.escalation_sweep');
  return S.EscalationSweep.parse({
    swept_at: now.toISOString(), examined: candidates.rowCount ?? 0, escalated,
    // Enforced by a database trigger as well as by this function never writing it.
    deadlines_changed: 0,
    limits: [
      'Escalation raises attention and never moves the deadline that caused it. A missed deadline stays missed.',
      'A task is escalated once. Repeated sweeps do not manufacture new escalations for the same task.',
      'Escalation is recorded locally. This deployment sends nothing outside its own boundary.',
    ],
  });
}
