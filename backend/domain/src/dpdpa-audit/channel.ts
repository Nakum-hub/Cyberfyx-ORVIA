import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as C from '../../../../shared/contracts/src/audit-channel.ts';
import { seal, open } from '../../../vendor/audit/vault.ts';
import type { Context } from '../shared/transaction.ts';
import { audit } from '../shared/transaction.ts';
import { predicate, scope } from '../operations/shared.ts';
import { collect, sampleCount } from './evidence.ts';

/**
 * Client side of the DPDPA audit mandate channel (revision 1.6 addendum), run
 * by the background worker. It is the only code in a customer installation
 * that calls out, and it calls exactly one address: the vendor audit service
 * named in the trust file. It does so only for mandates a client approved.
 *
 * Each cycle, per mandate:
 *  1. ends a mandate whose end date has passed;
 *  2. checks in: presents the mandate signed by the installation evidence key,
 *     acknowledges requests it has decided, and receives the vendor's pending
 *     requests, each verified against the audit key in the trust file;
 *  3. decides each new request: answered automatically when it is inside the
 *     mandate and personal-data-free, left for a client approver when it asks
 *     for a file, refused when it is outside the mandate or past its due date;
 *  4. resends any delivery whose outcome is not yet known, then generates,
 *     signs and sends the due snapshot and the automatic responses;
 *  5. sends packages a person queued for the channel.
 * Every outcome is durable. A delivery moves to ACCEPTED or REFUSED only on a
 * receipt that verifies against the audit key; a timeout is UNKNOWN and the
 * same signed delivery is sent again (the vendor answers a repeat with the
 * original receipt).
 */
type Row = QueryResultRow;
export type Transport = (url: string, init: { method: 'POST'; headers: Record<string, string>; body: Buffer }) => Promise<{ status: number; text: string }>;
export type ChannelEnv = {
  address: string | null; auditKey: { key_id: string; public: string } | null; sealKey: Buffer;
  checkInSeconds?: number; transport?: Transport; timeoutMs?: number;
};
export type ChannelReport = { mandates: number; check_ins: number; deliveries_accepted: number; deliveries_refused: number; deliveries_pending: number; requests_received: number; requests_for_approval: number; packages_sent: number; errors: string[] };
type Scoped = <T>(work: (c: Context) => Promise<T>) => Promise<T>;
type Post = { outcome: 'OK'; status: number; json: unknown } | { outcome: 'FAILED' | 'UNKNOWN'; status: number | null; error: string };
const MAX_ATTEMPTS = 20;
const MAX_RESPONSE = 1024 * 1024;

const nodeTransport: Transport = async (url, init) => {
  const response = await fetch(url, { method: 'POST', headers: init.headers, body: new Uint8Array(init.body), redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  if (reader) for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > MAX_RESPONSE) { await reader.cancel(); throw Object.assign(new Error('RESPONSE_TOO_LARGE'), { code: 'RESPONSE_TOO_LARGE' }); } chunks.push(value); }
  return { status: response.status, text: Buffer.concat(chunks).toString('utf8') };
};
/** One authenticated channel call. Any failure after the request may have left is UNKNOWN; only a clear refusal before that is FAILED. */
export async function post(env: ChannelEnv, path: string, digest: string, key: Buffer, body: Buffer, contentType: string): Promise<Post> {
  const address = C.ChannelAddress.safeParse(env.address);
  if (!address.success) return { outcome: 'FAILED', status: null, error: 'AUDIT_SERVICE_ADDRESS_INVALID' };
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers = { 'content-type': contentType, [C.CHANNEL_HEADERS.engagement]: digest, [C.CHANNEL_HEADERS.timestamp]: timestamp,
    [C.CHANNEL_HEADERS.signature]: C.channelSignature(key, timestamp, body), 'user-agent': 'ORVIA-audit-channel/1' };
  let response: { status: number; text: string };
  try { response = await (env.transport ?? nodeTransport)(new URL(path, address.data).toString(), { method: 'POST', headers, body }); }
  catch (error) {
    const code = String((error as { code?: string; name?: string }).code ?? (error as { name?: string }).name ?? 'NETWORK_ERROR').slice(0, 40);
    return { outcome: ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(code) ? 'FAILED' : 'UNKNOWN', status: null, error: code };
  }
  if (response.status >= 300 && response.status < 400) return { outcome: 'FAILED', status: response.status, error: 'REDIRECT_NOT_FOLLOWED' };
  let json: unknown; try { json = JSON.parse(response.text); } catch { json = null; }
  if (response.status >= 200 && response.status < 300 && json !== null) return { outcome: 'OK', status: response.status, json };
  const code = (json as { error?: { code?: string; field_errors?: { code: string }[] } } | null)?.error;
  return { outcome: response.status >= 500 || response.status === 429 ? 'UNKNOWN' : 'FAILED', status: response.status, error: String(code?.field_errors?.[0]?.code ?? code?.code ?? `HTTP_${response.status}`).slice(0, 80) };
}

// ---------------------------------------------------------------- installation evidence key
async function evidenceKey(c: Context, env: ChannelEnv): Promise<C.EvidenceKey> {
  const aad = `evidence-key:${c.actor.scope.environment_id}`;
  const existing = (await c.tx.query(`SELECT * FROM app.installation_evidence_keys WHERE ${predicate}`, scope(c))).rows[0];
  if (existing) return { key_id: existing.key_id, public: existing.public_key, private: open(env.sealKey, { ciphertext: existing.private_ciphertext, nonce: existing.private_nonce, tag: existing.private_tag }, aad).toString('utf8') };
  const key = C.newEvidenceKey(); const sealed = seal(env.sealKey, Buffer.from(key.private, 'utf8'), aad);
  await c.tx.query(`INSERT INTO app.installation_evidence_keys (tenant_id, legal_entity_id, environment_id, key_id, public_key, private_ciphertext, private_nonce, private_tag) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [...scope(c), key.key_id, key.public, sealed.ciphertext, sealed.nonce, sealed.tag]);
  await audit(c, 'audit_channel.evidence_key_created');
  return key;
}
const iso = (v: unknown) => (v as Date).toISOString();
function mandateDocument(m: Row, e: Row, key: C.EvidenceKey): C.MandateDocument {
  return C.MandateDocument.parse({ format: 'orvia.dpdpa-audit-mandate', format_version: 1, mandate_id: m.id, kind: m.kind, installation_id: m.installation_id, organisation_name: m.organisation_name,
    engagement_code_digest: e.code_digest, engagement_reference: e.engagement_reference, firm_name: e.firm_name, scope_requirement_ids: m.scope_requirement_ids, categories: m.categories, schedule: m.schedule,
    valid_from: iso(m.valid_from), valid_to: iso(m.valid_to), state: m.state, state_changed_at: iso(m.state_changed_at ?? m.approved_at),
    approval: { preparer_role: m.prepared_role, approver_role: m.approved_role, distinct_people: true, approved_at: iso(m.approved_at) }, evidence_key_id: key.key_id, personal_data: 'NONE_AUTOMATIC' });
}
/** What the vendor is told about each decided request. */
const ackOutcome = (r: Row): C.Acknowledgement['outcome'] | null => r.decision === 'DELIVERED' ? 'DELIVERED' : r.decision === 'REFUSED' ? 'REFUSED' : r.decision === 'AWAITING_CLIENT_APPROVAL' ? 'AWAITING_CLIENT_APPROVAL' : null;

export async function channelSweep(run: Scoped, env: ChannelEnv, now = new Date()): Promise<ChannelReport> {
  const report: ChannelReport = { mandates: 0, check_ins: 0, deliveries_accepted: 0, deliveries_refused: 0, deliveries_pending: 0, requests_received: 0, requests_for_approval: 0, packages_sent: 0, errors: [] };
  const checkInSeconds = Math.max(60, env.checkInSeconds ?? 900);
  const due = await run(async c => {
    await c.tx.query(`UPDATE app.audit_mandates SET state='ENDED', state_changed_at=clock_timestamp(), state_reason='End date reached' WHERE ${predicate} AND state IN ('ACTIVE','SUSPENDED') AND valid_to<=clock_timestamp()`, scope(c));
    return (await c.tx.query(`SELECT m.* FROM app.audit_mandates m WHERE m.tenant_id=$1 AND m.legal_entity_id=$2 AND m.environment_id=$3 AND m.approved_at IS NOT NULL AND (
        (m.state='ACTIVE' AND m.valid_from<=$4 AND (m.last_check_in_at IS NULL OR m.last_check_in_at<=$4::timestamptz-make_interval(secs=>$5) OR m.next_collection_at<=$4
          OR EXISTS (SELECT 1 FROM app.audit_channel_deliveries d WHERE d.tenant_id=m.tenant_id AND d.legal_entity_id=m.legal_entity_id AND d.environment_id=m.environment_id AND d.mandate_id=m.id AND d.state IN ('QUEUED','UNKNOWN'))
          OR EXISTS (SELECT 1 FROM app.audit_package_submissions s WHERE s.tenant_id=m.tenant_id AND s.legal_entity_id=m.legal_entity_id AND s.environment_id=m.environment_id AND s.engagement_id=m.engagement_id AND s.state IN ('QUEUED','UNKNOWN'))
          OR EXISTS (SELECT 1 FROM app.audit_channel_requests r WHERE r.tenant_id=m.tenant_id AND r.legal_entity_id=m.legal_entity_id AND r.environment_id=m.environment_id AND r.mandate_id=m.id
            AND ((r.decision='ANSWER_AUTOMATICALLY' AND r.delivery_id IS NULL) OR (r.decision<>'ANSWER_AUTOMATICALLY' AND r.acknowledged_state IS DISTINCT FROM r.decision)))))
        OR (m.state IN ('SUSPENDED','REVOKED','ENDED') AND m.reported_state IS DISTINCT FROM m.state))
      ORDER BY m.created_at, m.id`, [...scope(c), now, checkInSeconds])).rows;
  });
  if (due.length && (!env.address || !env.auditKey)) {
    // A configuration state, shown on each mandate and on the channel screen; not a failure of this cycle.
    await run(c => c.tx.query(`UPDATE app.audit_mandates SET channel_problem='AUDIT_SERVICE_NOT_CONFIGURED_IN_TRUST_FILE' WHERE ${predicate} AND id=ANY($4::uuid[])`, [...scope(c), due.map(m => m.id)]));
    return report;
  }
  for (const m of due) {
    report.mandates++;
    try { await serviceMandate(run, env, m.id, report, now); }
    catch (error) { report.errors.push(`mandate ${m.id}: ${String((error as { code?: string; message?: string }).code ?? (error as Error).message).slice(0, 80)}`); }
  }
  return report;
}

type Loaded = { m: Row; e: Row; key: Buffer; evidence: C.EvidenceKey };
async function load(run: Scoped, env: ChannelEnv, mandateId: string): Promise<Loaded> {
  return run(async c => {
    const m = (await c.tx.query(`SELECT * FROM app.audit_mandates WHERE ${predicate} AND id=$4`, [...scope(c), mandateId])).rows[0];
    const e = (await c.tx.query(`SELECT * FROM app.audit_engagements WHERE ${predicate} AND id=$4`, [...scope(c), m.engagement_id])).rows[0];
    const k = (await c.tx.query(`SELECT channel_key FROM app.audit_channel_keys WHERE ${predicate} AND engagement_id=$4`, [...scope(c), m.engagement_id])).rows[0];
    if (!e || !k) throw Object.assign(new Error('channel_not_available'), { code: 'CHANNEL_NOT_AVAILABLE' });
    return { m, e, key: k.channel_key as Buffer, evidence: await evidenceKey(c, env) };
  });
}
async function problem(run: Scoped, mandateId: string, code: string) {
  await run(c => c.tx.query(`UPDATE app.audit_mandates SET channel_problem=$5 WHERE ${predicate} AND id=$4`, [...scope(c), mandateId, code.slice(0, 80)]));
}

async function checkIn(run: Scoped, env: ChannelEnv, l: Loaded, report: ChannelReport): Promise<C.ChannelInstructions | null> {
  const signedMandate = C.signByInstallation(mandateDocument(l.m, l.e, l.evidence), l.evidence);
  const pending = await run(async c => (await c.tx.query(`SELECT * FROM app.audit_channel_requests WHERE ${predicate} AND mandate_id=$4 AND decision<>'ANSWER_AUTOMATICALLY' AND acknowledged_state IS DISTINCT FROM decision ORDER BY received_at LIMIT 200`, [...scope(c), l.m.id])).rows);
  const acknowledgements = pending.map(r => C.Acknowledgement.parse({ request_id: r.id, outcome: ackOutcome(r)!, reason: r.decision_reason, delivery_id: r.delivery_id, package_id: r.package_id }));
  const body = Buffer.from(JSON.stringify(C.CheckInBody.parse({ installation_public_key: l.evidence.public, signed_mandate: signedMandate, acknowledgements })), 'utf8');
  const result = await post(env, C.CHANNEL_PATHS.checkIn, l.e.code_digest, l.key, body, C.CHANNEL_CONTENT_TYPE);
  if (result.outcome !== 'OK') { await problem(run, l.m.id, `CHECK_IN_${result.error}`); return null; }
  let instructions: C.ChannelInstructions;
  try { instructions = C.verifyVendorSigned(result.json, env.auditKey!, C.ChannelInstructions); }
  catch { await problem(run, l.m.id, 'CHECK_IN_ANSWER_NOT_SIGNED_BY_TRUSTED_AUDIT_KEY'); return null; }
  if (instructions.engagement_code_digest !== l.e.code_digest) { await problem(run, l.m.id, 'CHECK_IN_ANSWER_FOR_ANOTHER_ENGAGEMENT'); return null; }
  report.check_ins++;
  await run(async c => {
    await c.tx.query(`UPDATE app.audit_mandates SET reported_state=state, last_check_in_at=clock_timestamp(), channel_problem=$5, vendor_next_sequence=$6, vendor_last_digest=$7 WHERE ${predicate} AND id=$4`,
      [...scope(c), l.m.id, instructions.mandate.accepted ? null : instructions.mandate.problem ?? 'MANDATE_NOT_ACCEPTED', instructions.next_sequence, instructions.last_digest]);
    for (const r of pending) await c.tx.query(`UPDATE app.audit_channel_requests SET acknowledged_state=$5 WHERE ${predicate} AND id=$4`, [...scope(c), r.id, r.decision]);
    await audit(c, 'audit_channel.checked_in', l.m.id);
  });
  return instructions;
}

/** Decides a request the vendor sent: automatic only inside the mandate and for personal-data-free categories. */
function decide(m: Row, r: C.AuditorRequest, today: string): { decision: string; reason: string | null } {
  if (r.due_date < today) return { decision: 'REFUSED', reason: 'PAST_DUE' };
  if (r.requirement_id && !(m.scope_requirement_ids as string[]).includes(r.requirement_id)) return { decision: 'REFUSED', reason: 'REQUIREMENT_OUTSIDE_MANDATE' };
  const categories = new Set<string>(m.categories);
  if (r.kind === 'EVIDENCE_FILE') return { decision: 'AWAITING_CLIENT_APPROVAL', reason: 'EVIDENCE_FILES_NEED_A_CLIENT_APPROVER' };
  if (r.kind === 'SAMPLE_COUNT') return categories.has('SAMPLE_COUNTS') ? { decision: 'ANSWER_AUTOMATICALLY', reason: null } : { decision: 'REFUSED', reason: 'SAMPLING_NOT_IN_MANDATE' };
  return r.categories.every(x => x !== 'SAMPLE_COUNTS' && categories.has(x)) ? { decision: 'ANSWER_AUTOMATICALLY', reason: null } : { decision: 'REFUSED', reason: 'CATEGORY_OUTSIDE_MANDATE' };
}
async function receiveRequests(run: Scoped, env: ChannelEnv, l: Loaded, instructions: C.ChannelInstructions, report: ChannelReport, now: Date) {
  const today = now.toISOString().slice(0, 10);
  for (const signed of instructions.requests) {
    let r: C.AuditorRequest;
    try { r = C.verifyVendorSigned(signed, env.auditKey!, C.AuditorRequest); } catch { report.errors.push('audit channel: a request did not verify against the audit key and was ignored'); continue; }
    if (r.engagement_code_digest !== l.e.code_digest) continue;
    const d = decide(l.m, r, today);
    const inserted = await run(async c => (await c.tx.query(`INSERT INTO app.audit_channel_requests (tenant_id, legal_entity_id, environment_id, id, engagement_id, mandate_id, kind, requirement_id, description, due_date, request, signed, decision, decision_reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT DO NOTHING`, [...scope(c), r.request_id, l.m.engagement_id, l.m.id, r.kind, r.requirement_id, r.description, r.due_date, JSON.stringify(r), JSON.stringify(signed), d.decision, d.reason])).rowCount);
    if (inserted) { report.requests_received++; if (d.decision === 'AWAITING_CLIENT_APPROVAL') report.requests_for_approval++; }
  }
}

type Chain = { next: number; last: string | null };
async function send(run: Scoped, env: ChannelEnv, l: Loaded, row: Row, chain: Chain, report: ChannelReport): Promise<boolean> {
  const body = Buffer.from(JSON.stringify(C.DeliveryBody.parse({ signed_delivery: row.signed })), 'utf8');
  const result = await post(env, C.CHANNEL_PATHS.deliveries, l.e.code_digest, l.key, body, C.CHANNEL_CONTENT_TYPE);
  if (result.outcome === 'OK') {
    let receipt: C.DeliveryReceipt;
    try { receipt = C.verifyVendorSigned(result.json, env.auditKey!, C.DeliveryReceipt); } catch { receipt = null as never; }
    if (!receipt || receipt.delivery_id !== row.id || receipt.delivery_digest !== row.digest) {
      await run(c => c.tx.query(`UPDATE app.audit_channel_deliveries SET state='UNKNOWN', attempts=attempts+1, last_error='RECEIPT_NOT_VERIFIED' WHERE ${predicate} AND id=$4`, [...scope(c), row.id]));
      report.deliveries_pending++; return false;
    }
    await run(async c => {
      await c.tx.query(`UPDATE app.audit_channel_deliveries SET state=$5, receipt=$6, reasons=$7, attempts=attempts+1, last_error=NULL, completed_at=clock_timestamp() WHERE ${predicate} AND id=$4`,
        [...scope(c), row.id, receipt.outcome, JSON.stringify(result.json), receipt.reasons]);
      if (row.request_id) await c.tx.query(`UPDATE app.audit_channel_requests SET decision=$5, decision_reason=$6, delivery_id=$7, acknowledged_state=$5 WHERE ${predicate} AND id=$4`,
        [...scope(c), row.request_id, receipt.outcome === 'ACCEPTED' ? 'DELIVERED' : 'REFUSED', receipt.outcome === 'ACCEPTED' ? null : `VENDOR_REFUSED_${receipt.reasons[0] ?? 'DELIVERY'}`.slice(0, 80), row.id]);
      await audit(c, `audit_channel.delivery_${receipt.outcome.toLowerCase()}`, row.id);
    });
    if (receipt.outcome === 'ACCEPTED') { chain.next = receipt.sequence + 1; chain.last = receipt.delivery_digest; report.deliveries_accepted++; } else report.deliveries_refused++;
    return true;
  }
  const final = result.outcome === 'FAILED' && result.status !== null && result.status < 500 || row.attempts + 1 >= MAX_ATTEMPTS;
  await run(c => c.tx.query(`UPDATE app.audit_channel_deliveries SET state=$5, attempts=attempts+1, last_error=$6 WHERE ${predicate} AND id=$4`,
    [...scope(c), row.id, final ? 'FAILED' : result.outcome === 'UNKNOWN' ? 'UNKNOWN' : 'QUEUED', result.error.slice(0, 80)]));
  if (!final) report.deliveries_pending++;
  return false;
}
async function generate(run: Scoped, l: Loaded, chain: Chain, kind: 'SNAPSHOT' | 'RESPONSE', request: C.AuditorRequest | null, now: Date): Promise<Row> {
  return run(async c => {
    const m = l.m;
    const lastSnapshot = (await c.tx.query(`SELECT max(period_to) AS t FROM app.audit_channel_deliveries WHERE ${predicate} AND mandate_id=$4 AND kind='SNAPSHOT' AND state='ACCEPTED'`, [...scope(c), m.id])).rows[0].t as Date | null;
    const from = kind === 'SNAPSHOT' && lastSnapshot ? lastSnapshot.toISOString() : iso(m.valid_from);
    const period = { from, to: now.toISOString() };
    let categories: C.EvidenceCategory[]; let entries: C.EvidenceEntry[]; let limits: string[]; let pkg: { version: string; kind: string } | null = null;
    if (request?.kind === 'SAMPLE_COUNT') { categories = ['SAMPLE_COUNTS']; ({ entries, limits } = await sampleCount(c, request)); }
    else {
      categories = kind === 'SNAPSHOT' ? (m.categories as C.EvidenceCategory[]).filter(x => x !== 'SAMPLE_COUNTS') : request!.categories;
      const collected = await collect(c, { categories, scope: m.scope_requirement_ids, period, requirementFilter: request?.requirement_id ?? null }, now);
      ({ entries, limits } = collected); pkg = collected.regulatory_package;
    }
    const document = C.DeliveryDocument.parse({ format: 'orvia.dpdpa-audit-delivery', format_version: 1, delivery_id: randomUUID(), mandate_id: m.id, engagement_code_digest: l.e.code_digest,
      installation_id: m.installation_id, sequence: chain.next, previous_digest: chain.next === 1 ? null : chain.last, kind, request_id: request?.request_id ?? null,
      generated_at: now.toISOString(), period, regulatory_package: pkg, entries, limits: limits.slice(0, 20) });
    const signed = C.signByInstallation(document, l.evidence);
    const digest = C.signedDigest(signed);
    const row = (await c.tx.query(`INSERT INTO app.audit_channel_deliveries (tenant_id, legal_entity_id, environment_id, id, mandate_id, engagement_id, sequence, kind, request_id, period_from, period_to, entries, categories, document, signed, digest)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`, [...scope(c), document.delivery_id, m.id, m.engagement_id, document.sequence, kind, document.request_id, period.from, period.to, entries.length, categories,
      JSON.stringify(document), JSON.stringify(signed), digest])).rows[0];
    if (request) await c.tx.query(`UPDATE app.audit_channel_requests SET delivery_id=$5 WHERE ${predicate} AND id=$4`, [...scope(c), request.request_id, document.delivery_id]);
    if (kind === 'SNAPSHOT') await c.tx.query(`UPDATE app.audit_mandates SET next_collection_at=$5::timestamptz + make_interval(secs=>$6) WHERE ${predicate} AND id=$4`, [...scope(c), m.id, now, C.scheduleSeconds(m.schedule)]);
    await audit(c, 'audit_channel.delivery_generated', document.delivery_id);
    return row;
  });
}

async function sendPackages(run: Scoped, env: ChannelEnv, l: Loaded, report: ChannelReport) {
  const queued = await run(async c => (await c.tx.query(`SELECT * FROM app.audit_package_submissions WHERE ${predicate} AND engagement_id=$4 AND state IN ('QUEUED','UNKNOWN') ORDER BY requested_at LIMIT 5`, [...scope(c), l.m.engagement_id])).rows);
  for (const s of queued) {
    const result = await post(env, C.CHANNEL_PATHS.packages, l.e.code_digest, l.key, s.package_file as Buffer, 'application/vnd.orvia.audit-package+json');
    let receipt: C.PackageReceipt | null = null;
    if (result.outcome === 'OK') { try { receipt = C.verifyVendorSigned(result.json, env.auditKey!, C.PackageReceipt); } catch { receipt = null; } }
    if (receipt && receipt.file_sha256 === s.file_sha256) {
      await run(async c => {
        await c.tx.query(`UPDATE app.audit_package_submissions SET state=$5, receipt=$6, reasons=$7, attempts=attempts+1, last_error=NULL, completed_at=clock_timestamp() WHERE ${predicate} AND id=$4`,
          [...scope(c), s.id, receipt!.outcome, JSON.stringify(result.outcome === 'OK' ? result.json : null), receipt!.reasons]);
        if (s.request_id && receipt!.outcome !== 'REFUSED') await c.tx.query(`UPDATE app.audit_channel_requests SET decision='DELIVERED', decision_reason=NULL WHERE ${predicate} AND id=$4 AND decision='AWAITING_CLIENT_APPROVAL'`, [...scope(c), s.request_id]);
        await audit(c, `audit_channel.package_${receipt!.outcome.toLowerCase()}`, s.id);
      });
      report.packages_sent++;
      continue;
    }
    const error = result.outcome === 'OK' ? 'RECEIPT_NOT_VERIFIED' : result.error;
    const final = result.outcome === 'FAILED' && result.status !== null && result.status < 500 || s.attempts + 1 >= MAX_ATTEMPTS;
    await run(c => c.tx.query(`UPDATE app.audit_package_submissions SET state=$5, attempts=attempts+1, last_error=$6 WHERE ${predicate} AND id=$4`,
      [...scope(c), s.id, final ? 'FAILED' : result.outcome === 'OK' ? 'UNKNOWN' : result.outcome === 'UNKNOWN' ? 'UNKNOWN' : 'QUEUED', error.slice(0, 80)]));
  }
}

async function serviceMandate(run: Scoped, env: ChannelEnv, mandateId: string, report: ChannelReport, now: Date) {
  const l = await load(run, env, mandateId);
  const instructions = await checkIn(run, env, l, report);
  if (!instructions) return;
  if (!instructions.mandate.accepted || !C.mandateOpen({ state: l.m.state, valid_from: iso(l.m.valid_from), valid_to: iso(l.m.valid_to) }, now)) return;
  await receiveRequests(run, env, l, instructions, report, now);
  const chain: Chain = { next: instructions.next_sequence, last: instructions.last_digest };
  // Deliveries whose outcome is not yet known go first, in order; a new one is generated only once they are settled.
  const unsettled = await run(async c => (await c.tx.query(`SELECT * FROM app.audit_channel_deliveries WHERE ${predicate} AND mandate_id=$4 AND state IN ('QUEUED','UNKNOWN') ORDER BY created_at, sequence`, [...scope(c), l.m.id])).rows);
  // Each is resent exactly as signed: if it landed, the vendor returns the original receipt; if not, its receipt now decides.
  for (const row of unsettled) if (!(await send(run, env, l, row, chain, report))) return;
  const answers = await run(async c => (await c.tx.query(`SELECT request FROM app.audit_channel_requests WHERE ${predicate} AND mandate_id=$4 AND decision='ANSWER_AUTOMATICALLY' AND delivery_id IS NULL ORDER BY received_at LIMIT 20`, [...scope(c), l.m.id])).rows);
  for (const a of answers) { const row = await generate(run, l, chain, 'RESPONSE', C.AuditorRequest.parse(a.request), now); if (!(await send(run, env, l, row, chain, report))) return; }
  const fresh = await run(async c => (await c.tx.query(`SELECT next_collection_at FROM app.audit_mandates WHERE ${predicate} AND id=$4`, [...scope(c), l.m.id])).rows[0]);
  if (fresh.next_collection_at && new Date(fresh.next_collection_at) <= now) { const row = await generate(run, l, chain, 'SNAPSHOT', null, now); if (!(await send(run, env, l, row, chain, report))) return; }
  await sendPackages(run, env, l, report);
  // Decisions made in this cycle are reported at once rather than at the next check-in.
  const unreported = await run(async c => (await c.tx.query(`SELECT 1 FROM app.audit_channel_requests WHERE ${predicate} AND mandate_id=$4 AND decision<>'ANSWER_AUTOMATICALLY' AND acknowledged_state IS DISTINCT FROM decision LIMIT 1`, [...scope(c), l.m.id])).rowCount);
  if (unreported) await checkIn(run, env, { ...l, m: (await load(run, env, mandateId)).m }, report);
}
