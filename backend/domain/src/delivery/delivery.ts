import { createHash, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { exists, iso, pageOf, predicate, refuse, scope, type OperationsEnv } from '../operations/shared.ts';
import { isLoopback, sendSmtp, sendWebhook, validEmail, type SendResult } from './clients.ts';

/**
 * EX09 customer-controlled delivery.
 *
 * Transports are the customer's own SMTP relay or webhook. A transport sends
 * nothing until someone other than its author enables it; its destination
 * cannot change afterwards. A message is reviewed by someone other than its
 * author, or comes from an alert routing whose content was reviewed that
 * way. The operations runner claims due messages under a lease, sends outside
 * the database transaction, and records each attempt with its receipt: a
 * permanent rejection ends the message, a temporary failure is retried with
 * backoff, and a timeout after hand-over is recorded as unknown and retried as
 * a possible duplicate. After five attempts a message is exhausted.
 */
type Row = QueryResultRow;
const MAX_ATTEMPTS = 5;
const LEASE_SECONDS = 60;
/** Seconds before the next attempt: 5, 10, 20, 40. Short enough for an operator to see, long enough to let a relay recover. */
export const backoffSeconds = (attempt: number) => 5 * 2 ** (attempt - 1);
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const HOSTNAME = /^(?=.{1,253}$)([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

// ---------------------------------------------------------------- transports
const transportView = (r: Row) => X.DeliveryTransport.parse({
  id: r.id, kind: r.kind, name: r.name, host: r.host, port: r.port, security: r.security, from_address: r.from_address, credential_env: r.credential_env, url: r.url, state: r.state,
  created_by: r.created_by, created_at: iso(r.created_at), approved_by: r.approved_by, approved_at: iso(r.approved_at), disabled_at: iso(r.disabled_at), disable_reason: r.disable_reason, secret_revealed: r.secret_revealed_at !== null,
});
async function transportRow(c: Context, id: string, lock = false) {
  const r = (await c.tx.query(`SELECT * FROM app.delivery_transports WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
export async function createTransport(c: Context, input: unknown) {
  const v = X.DeliveryTransportCreate.parse(input);
  if (v.kind === 'SMTP') {
    if (!HOSTNAME.test(v.host!) && !isLoopback(v.host!)) refuse(400, 'host', 'not_a_hostname');
    if (v.security === 'NONE' && !isLoopback(v.host!)) refuse(400, 'security', 'plaintext_only_to_loopback');
    if (!validEmail(v.from_address!)) refuse(400, 'from_address', 'not_an_email_address');
  } else {
    const url = new URL(v.url!);
    if (url.username || url.password) refuse(400, 'url', 'credentials_in_url');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback(url.hostname.replace(/^\[|\]$/g, '')))) refuse(400, 'url', 'https_required');
  }
  const row = (await c.tx.query(`INSERT INTO app.delivery_transports(tenant_id,legal_entity_id,environment_id,id,kind,name,host,port,security,from_address,credential_env,url,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [...scope(c), randomUUID(), v.kind, v.name, v.host ?? null, v.port ?? null, v.security ?? null, v.from_address ?? null, v.credential_env ?? null, v.url ?? null, c.actor.actor_id])).rows[0];
  await audit(c, 'delivery_transport.create', row.id);
  return transportView(row);
}
export async function enableTransport(c: Context, id: string) {
  const t = await transportRow(c, id, true);
  if (t.state !== 'PENDING') refuse(409, 'state', 'only_a_pending_transport_is_enabled');
  if (t.created_by === c.actor.actor_id) refuse(409, 'approved_by', 'author_cannot_enable');
  const row = (await c.tx.query(`UPDATE app.delivery_transports SET state='ENABLED', approved_by=$5, approved_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id])).rows[0];
  await audit(c, 'delivery_transport.enable', id);
  return transportView(row);
}
export async function disableTransport(c: Context, id: string, input: unknown) {
  const v = X.TransportDisable.parse(input);
  const t = await transportRow(c, id, true);
  if (t.state === 'DISABLED') refuse(409, 'state', 'already_disabled');
  const row = (await c.tx.query(`UPDATE app.delivery_transports SET state='DISABLED', disabled_by=$5, disabled_at=clock_timestamp(), disable_reason=$6 WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id, v.reason])).rows[0];
  await audit(c, 'delivery_transport.disable', id);
  return transportView(row);
}
/** The receiving side needs the key to check signatures. It is shown once, to someone with connection authority. */
export async function revealSigningSecret(c: Context, env: OperationsEnv, id: string) {
  const t = await transportRow(c, id, true);
  if (t.kind !== 'WEBHOOK') refuse(409, 'kind', 'only_a_webhook_is_signed');
  if (t.secret_revealed_at) refuse(409, 'secret_revealed', 'already_shown_once');
  await c.tx.query(`UPDATE app.delivery_transports SET secret_revealed_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id]);
  await audit(c, 'delivery_transport.reveal_secret', id);
  return X.SigningSecret.parse({ transport_id: id, secret: env.webhookSecret(id), algorithm: 'HMAC-SHA256', signed_content: 'X-Orvia-Timestamp + "." + request body', header: 'X-Orvia-Signature' });
}
export async function transportList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.delivery_transports WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(transportView), next_cursor: paged.next_cursor };
}
/** Whether an enabled transport exists for a notification channel. */
export async function channelAvailable(c: Context, channel: string) {
  const kind = channel === 'EMAIL' ? 'SMTP' : channel === 'APPROVED_WEBHOOK' ? 'WEBHOOK' : null;
  if (!kind) return false;
  return Boolean((await c.tx.query(`SELECT 1 FROM app.delivery_transports WHERE ${predicate} AND kind=$4 AND state='ENABLED' LIMIT 1`, [...scope(c), kind])).rowCount);
}

// ---------------------------------------------------------------- routings
const routingView = (r: Row) => X.AlertRouting.parse({ id: r.id, transport_id: r.transport_id, recipient: r.recipient, kinds: r.kinds, subject_prefix: r.subject_prefix, state: r.state,
  created_by: r.created_by, created_at: iso(r.created_at), approved_by: r.approved_by, approved_at: iso(r.approved_at), disabled_at: iso(r.disabled_at) });
export async function createRouting(c: Context, input: unknown) {
  const v = X.AlertRoutingCreate.parse(input);
  const t = await transportRow(c, v.transport_id);
  if (t.kind === 'SMTP' && !validEmail(v.recipient)) refuse(400, 'recipient', 'not_an_email_address');
  const row = (await c.tx.query(`INSERT INTO app.alert_routings(tenant_id,legal_entity_id,environment_id,id,transport_id,recipient,kinds,subject_prefix,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [...scope(c), randomUUID(), v.transport_id, v.recipient, v.kinds, v.subject_prefix, c.actor.actor_id])).rows[0];
  await audit(c, 'alert_routing.create', row.id);
  return routingView(row);
}
export async function decideRouting(c: Context, id: string, input: unknown) {
  const v = X.RoutingDecision.parse(input);
  const r = (await c.tx.query(`SELECT * FROM app.alert_routings WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  if (v.action === 'ENABLE') {
    if (r.state !== 'PENDING') refuse(409, 'state', 'only_a_pending_routing_is_enabled');
    if (r.created_by === c.actor.actor_id) refuse(409, 'approved_by', 'author_cannot_enable');
    const row = (await c.tx.query(`UPDATE app.alert_routings SET state='ENABLED', approved_by=$5, approved_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id])).rows[0];
    await audit(c, 'alert_routing.enable', id);
    return routingView(row);
  }
  if (r.state === 'DISABLED') refuse(409, 'state', 'already_disabled');
  const row = (await c.tx.query(`UPDATE app.alert_routings SET state='DISABLED', disabled_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id])).rows[0];
  await audit(c, 'alert_routing.disable', id);
  return routingView(row);
}
export async function routingList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.alert_routings WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(routingView), next_cursor: paged.next_cursor };
}

// ---------------------------------------------------------------- messages
function deliveryState(r: Row, attempts: Row[]): ReturnType<typeof X.OutboundDeliveryState.parse> {
  if (r.review_state === 'DRAFT') return 'AWAITING_REVIEW';
  if (r.review_state === 'REJECTED') return 'REJECTED';
  if (r.outcome) return r.outcome;
  return attempts.length ? 'RETRYING' : 'QUEUED';
}
async function messageView(c: Context, r: Row) {
  const attempts = (await c.tx.query(`SELECT * FROM app.outbound_attempts WHERE ${predicate} AND message_id=$4 ORDER BY attempt`, [...scope(c), r.id])).rows;
  return X.OutboundMessage.parse({
    id: r.id, transport_id: r.transport_id, source_kind: r.source_kind, source_id: r.source_id, routing_id: r.routing_id, recipient: r.recipient, subject: r.subject, body: r.body, content_digest: r.content_digest,
    review_state: r.review_state, authored_by: r.authored_by, authored_at: iso(r.authored_at), reviewed_by: r.reviewed_by, reviewed_at: iso(r.reviewed_at), review_note: r.review_note,
    delivery_state: deliveryState(r, attempts), next_attempt_at: r.outcome ? null : iso(r.next_attempt_at), outcome_at: iso(r.outcome_at),
    attempts: attempts.map(a => ({ attempt: a.attempt, started_at: iso(a.started_at), finished_at: iso(a.finished_at), outcome: a.outcome, response_code: a.response_code, receipt: a.receipt, error_code: a.error_code, possible_duplicate: a.possible_duplicate })),
  });
}
async function messageRow(c: Context, id: string, lock = false) {
  const r = (await c.tx.query(`SELECT * FROM app.outbound_messages WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
const SOURCE_TABLE: Record<string, string> = { NOTIFICATION_TASK: 'notification_tasks', COMPLIANCE_ALERT: 'compliance_alerts' };
export async function composeMessage(c: Context, input: unknown) {
  const v = X.OutboundMessageCreate.parse(input);
  const t = await transportRow(c, v.transport_id);
  if (t.state !== 'ENABLED') refuse(409, 'transport_id', 'transport_not_enabled');
  if (t.kind === 'SMTP' && !validEmail(v.recipient)) refuse(400, 'recipient', 'not_an_email_address');
  if (v.source_id) await exists(c, SOURCE_TABLE[v.source_kind]!, v.source_id, 'source_id');
  const row = (await c.tx.query(`INSERT INTO app.outbound_messages(tenant_id,legal_entity_id,environment_id,id,transport_id,source_kind,source_id,recipient,subject,body,content_digest,authored_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [...scope(c), randomUUID(), v.transport_id, v.source_kind, v.source_id, v.recipient, v.subject, v.body, sha(JSON.stringify([v.recipient, v.subject, v.body])), c.actor.actor_id])).rows[0];
  await audit(c, 'outbound_message.compose', row.id);
  return messageView(c, row);
}
export async function reviewMessage(c: Context, id: string, input: unknown) {
  const v = X.OutboundMessageReview.parse(input);
  const m = await messageRow(c, id, true);
  if (m.review_state !== 'DRAFT') refuse(409, 'review_state', 'only_a_draft_is_reviewed');
  if (m.authored_by === c.actor.actor_id) refuse(409, 'reviewed_by', 'author_cannot_review');
  if (v.decision === 'APPROVE') {
    const t = await transportRow(c, m.transport_id);
    if (t.state !== 'ENABLED') refuse(409, 'transport_id', 'transport_not_enabled');
  }
  const row = (await c.tx.query(`UPDATE app.outbound_messages SET review_state=$5, reviewed_by=$6, reviewed_at=clock_timestamp(), review_note=$7, next_attempt_at=CASE WHEN $5='APPROVED' THEN clock_timestamp() ELSE NULL END
    WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, v.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', c.actor.actor_id, v.note])).rows[0];
  await audit(c, `outbound_message.${v.decision.toLowerCase()}`, id);
  return messageView(c, row);
}
export async function cancelMessage(c: Context, id: string) {
  const m = await messageRow(c, id, true);
  if (m.outcome || m.review_state !== 'APPROVED') refuse(409, 'outcome', 'only_a_queued_message_is_withdrawn');
  if (m.lease_until && Date.parse(m.lease_until) > Date.now()) refuse(409, 'lease', 'an_attempt_is_in_progress');
  const row = (await c.tx.query(`UPDATE app.outbound_messages SET outcome='CANCELLED', outcome_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id])).rows[0];
  await audit(c, 'outbound_message.withdraw', id);
  return messageView(c, row);
}
export async function messageDetail(c: Context, id: string) { return messageView(c, await messageRow(c, id)); }
export async function messageList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.outbound_messages x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3
    AND ($4::uuid IS NULL OR (x.authored_at, x.id) < (SELECT k.authored_at, k.id FROM app.outbound_messages k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$4))
    ORDER BY x.authored_at DESC, x.id DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = []; for (const r of paged.items) items.push(await messageView(c, r));
  return { items, next_cursor: paged.next_cursor };
}
/** Delivery state of the latest message raised for a compliance alert. */
export async function alertDelivery(c: Context, alertIds: string[]) {
  if (!alertIds.length) return new Map<string, string>();
  const rows = (await c.tx.query(`SELECT DISTINCT ON (m.source_id) m.source_id, m.outcome, (SELECT count(*) FROM app.outbound_attempts a WHERE a.tenant_id=m.tenant_id AND a.legal_entity_id=m.legal_entity_id AND a.environment_id=m.environment_id AND a.message_id=m.id) AS attempts
    FROM app.outbound_messages m WHERE m.tenant_id=$1 AND m.legal_entity_id=$2 AND m.environment_id=$3 AND m.source_kind='COMPLIANCE_ALERT' AND m.source_id=ANY($4::uuid[]) ORDER BY m.source_id, m.authored_at DESC`, [...scope(c), alertIds])).rows;
  return new Map(rows.map(r => [r.source_id as string, r.outcome === 'SENT' ? 'SENT' : r.outcome ? 'FAILED' : 'QUEUED']));
}

// ---------------------------------------------------------------- runner
export type Claim = { message: Row; transport: Row; attempt: number; possibleDuplicate: boolean; claimedAt: string };
/** Raises one reviewed-by-routing message for each new alert an enabled routing covers. */
export async function raiseAlertMessages(c: Context) {
  const r = await c.tx.query(`WITH due AS (
      SELECT s.tenant_id,s.legal_entity_id,s.environment_id,s.transport_id,a.id AS alert_id,s.id AS routing_id,s.recipient,
        left(s.subject_prefix||' '||replace(a.kind,'_',' ')||': '||a.detail,300) AS subject,
        a.detail||E'\n\nRaised '||to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI "UTC"')||' by an ORVIA control test. Review it in Continuous compliance.' AS body
      FROM app.alert_routings s JOIN app.delivery_transports t ON t.tenant_id=s.tenant_id AND t.legal_entity_id=s.legal_entity_id AND t.environment_id=s.environment_id AND t.id=s.transport_id AND t.state='ENABLED'
      JOIN app.compliance_alerts a ON a.tenant_id=s.tenant_id AND a.legal_entity_id=s.legal_entity_id AND a.environment_id=s.environment_id AND a.kind=ANY(s.kinds) AND a.created_at>=s.approved_at
      WHERE s.tenant_id=$1 AND s.legal_entity_id=$2 AND s.environment_id=$3 AND s.state='ENABLED'
        AND NOT EXISTS(SELECT 1 FROM app.outbound_messages m WHERE m.tenant_id=s.tenant_id AND m.legal_entity_id=s.legal_entity_id AND m.environment_id=s.environment_id AND m.routing_id=s.id AND m.source_id=a.id)
      LIMIT 200)
    INSERT INTO app.outbound_messages(tenant_id,legal_entity_id,environment_id,id,transport_id,source_kind,source_id,routing_id,recipient,subject,body,content_digest,review_state,authored_by,next_attempt_at)
    SELECT tenant_id,legal_entity_id,environment_id,gen_random_uuid(),transport_id,'COMPLIANCE_ALERT',alert_id,routing_id,recipient,subject,body,
      encode(sha256(convert_to(json_build_array(recipient,subject,body)::text,'UTF8')),'hex'),'APPROVED',$4,clock_timestamp() FROM due`, [...scope(c), c.actor.actor_id]);
  return r.rowCount ?? 0;
}
/** Claims due messages under a lease. An expired lease with no recorded attempt means a send may have happened: it is recorded as unknown. */
export async function claimDue(c: Context, limit = 20): Promise<Claim[]> {
  const rows = (await c.tx.query(`SELECT m.* FROM app.outbound_messages m WHERE m.tenant_id=$1 AND m.legal_entity_id=$2 AND m.environment_id=$3 AND m.review_state='APPROVED' AND m.outcome IS NULL
    AND m.next_attempt_at<=clock_timestamp() AND (m.lease_until IS NULL OR m.lease_until<clock_timestamp()) ORDER BY m.next_attempt_at LIMIT $4 FOR UPDATE SKIP LOCKED`, [...scope(c), limit])).rows;
  const claims: Claim[] = [];
  for (const m of rows) {
    let possibleDuplicate = false;
    if (m.lease_until && m.attempts > 0) {
      const recorded = (await c.tx.query(`SELECT 1 FROM app.outbound_attempts WHERE ${predicate} AND message_id=$4 AND attempt=$5`, [...scope(c), m.id, m.attempts])).rowCount;
      if (!recorded) {
        await c.tx.query(`INSERT INTO app.outbound_attempts(tenant_id,legal_entity_id,environment_id,id,message_id,attempt,started_at,outcome,error_code) VALUES($1,$2,$3,$4,$5,$6,$7,'UNKNOWN','LEASE_EXPIRED_WITHOUT_RESULT')`,
          [...scope(c), randomUUID(), m.id, m.attempts, m.lease_until]);
        possibleDuplicate = true;
      }
    }
    const previousUnknown = (await c.tx.query(`SELECT 1 FROM app.outbound_attempts WHERE ${predicate} AND message_id=$4 AND outcome='UNKNOWN'`, [...scope(c), m.id])).rowCount;
    if (m.attempts >= MAX_ATTEMPTS) {
      await c.tx.query(`UPDATE app.outbound_messages SET outcome='EXHAUSTED', outcome_at=clock_timestamp(), lease_until=NULL WHERE ${predicate} AND id=$4`, [...scope(c), m.id]);
      continue;
    }
    const transport = (await c.tx.query(`SELECT * FROM app.delivery_transports WHERE ${predicate} AND id=$4`, [...scope(c), m.transport_id])).rows[0]!;
    const attempt = m.attempts + 1;
    await c.tx.query(`UPDATE app.outbound_messages SET attempts=$5, lease_until=clock_timestamp()+make_interval(secs=>${LEASE_SECONDS}) WHERE ${predicate} AND id=$4`, [...scope(c), m.id, attempt]);
    claims.push({ message: m, transport, attempt, possibleDuplicate: possibleDuplicate || Boolean(previousUnknown), claimedAt: new Date().toISOString() });
  }
  return claims;
}
/** Sends one claimed message. Runs outside any database transaction. */
export async function sendClaim(env: OperationsEnv, claim: Claim, credentialLookup: (name: string) => string | undefined = name => process.env[name]): Promise<SendResult> {
  const { message: m, transport: t } = claim;
  if (t.state !== 'ENABLED') return { outcome: 'FAILED', retryable: false, response_code: null, receipt: null, error_code: 'TRANSPORT_NOT_ENABLED' };
  const payload = { id: m.id, recipient: m.recipient, subject: m.subject, body: m.body, attempt: claim.attempt };
  if (t.kind === 'SMTP') {
    let credential: { username: string; password: string } | null = null;
    if (t.credential_env) {
      const value = credentialLookup(t.credential_env);
      const split = value?.indexOf(':') ?? -1;
      if (!value || split < 1) return { outcome: 'FAILED', retryable: false, response_code: null, receipt: null, error_code: 'CREDENTIAL_NOT_CONFIGURED' };
      credential = { username: value.slice(0, split), password: value.slice(split + 1) };
    }
    return sendSmtp({ host: t.host, port: t.port, security: t.security, from_address: t.from_address, credential }, payload);
  }
  return sendWebhook(t.url, env.webhookSecret(t.id), payload, { kind: m.source_kind, id: m.source_id });
}
export async function recordResult(c: Context, claim: Claim, result: SendResult) {
  const m = claim.message;
  await c.tx.query(`INSERT INTO app.outbound_attempts(tenant_id,legal_entity_id,environment_id,id,message_id,attempt,started_at,outcome,response_code,receipt,error_code,possible_duplicate) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT DO NOTHING`, [...scope(c), randomUUID(), m.id, claim.attempt, claim.claimedAt, result.outcome, result.response_code, result.receipt, result.error_code, claim.possibleDuplicate]);
  const exhausted = result.outcome !== 'SENT' && (!result.retryable || claim.attempt >= MAX_ATTEMPTS);
  if (result.outcome === 'SENT') await c.tx.query(`UPDATE app.outbound_messages SET outcome='SENT', outcome_at=clock_timestamp(), lease_until=NULL WHERE ${predicate} AND id=$4`, [...scope(c), m.id]);
  else if (exhausted) await c.tx.query(`UPDATE app.outbound_messages SET outcome='EXHAUSTED', outcome_at=clock_timestamp(), lease_until=NULL WHERE ${predicate} AND id=$4`, [...scope(c), m.id]);
  else await c.tx.query(`UPDATE app.outbound_messages SET next_attempt_at=clock_timestamp()+make_interval(secs=>$5), lease_until=NULL WHERE ${predicate} AND id=$4`, [...scope(c), m.id, backoffSeconds(claim.attempt)]);
  if (m.source_kind === 'NOTIFICATION_TASK' && (result.outcome === 'SENT' || exhausted))
    await c.tx.query(`INSERT INTO app.notification_deliveries(tenant_id,legal_entity_id,environment_id,id,task_id,fact,evidence_reference,note,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [...scope(c), randomUUID(), m.source_id, result.outcome === 'SENT' ? 'SENT' : 'FAILED', `Transport ${claim.transport.name}: ${result.receipt ?? result.error_code}`.slice(0, 500),
        result.outcome === 'SENT' ? `Sent to ${m.recipient} on attempt ${claim.attempt}.` : `Not sent after ${claim.attempt} attempt(s).`, c.actor.actor_id]);
  await audit(c, `outbound_message.attempt.${result.outcome.toLowerCase()}`, m.id);
  return exhausted ? 'EXHAUSTED' : result.outcome;
}
