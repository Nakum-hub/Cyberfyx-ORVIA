import { randomBytes, randomUUID } from 'node:crypto';
import type pg from 'pg';
import * as C from '../../../shared/contracts/src/audit-channel.ts';
import * as V from '../../../shared/contracts/src/vendor-audit.ts';
import { sha256 } from '../../../shared/contracts/src/audit-exchange.ts';
import { AccessError } from '../../authorization/src/index.ts';
import { open } from './vault.ts';
import { audit, receivePackageForDigest, type Ctx, type Keys } from './service.ts';

/**
 * Vendor side of the DPDPA audit mandate channel (revision 1.6 addendum).
 *
 * The client installation is never a login here. Every channel call carries
 * the engagement digest and an HMAC over its body with the engagement's
 * channel key; only after that verifies is the engagement bound as the actor
 * (domain CLIENT_INSTALLATION), and the definer functions of vendor migration
 * 0006 then act on that engagement alone. Everything the vendor answers is
 * signed with the audit key, so the client installation can tell a genuine
 * answer from anything else on the network.
 *
 * The engagement team issues requests and reads deliveries; leadership reads
 * counts only (vendor.overview()).
 */
type Pool = pg.Pool;
const iso = (v: unknown) => v === null || v === undefined ? null : (v as Date).toISOString();
const day = (v: unknown) => v === null || v === undefined ? null : typeof v === 'string' ? v.slice(0, 10) : new Date((v as Date).getTime() - (v as Date).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const refuse = (status: number, field: string, code: string): never => { throw new AccessError(status, status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR', [{ field, code }]); };

export type ChannelCall = { kind: 'check-in' | 'deliveries' | 'packages' | 'responses'; digest: string | null; timestamp: string | null; signature: string | null; contentType: string | null; body: Buffer };
type Bound = { engagementId: string; tx: pg.PoolClient };

async function asInstallation<T>(pool: Pool, engagementId: string | null, work: (tx: pg.PoolClient) => Promise<T>) {
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    const role = (await tx.query('SELECT current_user AS name, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    if (role?.name !== 'orvia_vendor_app' || role.rolsuper || role.rolbypassrls) throw new Error('Unsafe vendor database role');
    if (engagementId) await tx.query(`SELECT set_config('vendor.actor_id',$1,true), set_config('vendor.actor_domain','CLIENT_INSTALLATION',true), set_config('vendor.role','CLIENT_INSTALLATION',true),
      set_config('vendor.capabilities','',true), set_config('vendor.organisation_id','',true)`, [engagementId]);
    const result = await work(tx);
    await tx.query('COMMIT');
    return result;
  } catch (error) { await tx.query('ROLLBACK').catch(() => {}); throw error; } finally { tx.release(); }
}

/** Authenticates a channel call and runs it as the engagement. Refusals are recorded; no content of a refused call is kept. */
/** A check-in answer stays well under the 1 MiB the client reads; one document never takes more than the space left beside a full request list. */
const ANSWER_BUDGET = 900_000;
const DOCUMENT_BUDGET = 850_000;
export async function channelCall(pool: Pool, keys: Keys, call: ChannelCall, now = new Date()): Promise<{ status: number; body: unknown }> {
  const expectedType = call.kind === 'packages' ? 'application/vnd.orvia.audit-package+json' : C.CHANNEL_CONTENT_TYPE;
  if (call.contentType !== expectedType) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'content-type', code: 'channel_content_type_required' }]);
  if (!call.digest || !/^[a-f0-9]{64}$/.test(call.digest) || !call.timestamp || !call.signature) throw new AccessError(401, 'UNAUTHENTICATED');
  const found = await asInstallation(pool, null, async tx => (await tx.query('SELECT * FROM vendor.channel_key($1)', [call.digest])).rows[0]);
  const refused = async (engagementId: string | null, outcome: string) => asInstallation(pool, null, tx => tx.query('SELECT vendor.channel_refused($1,$2,$3)', [engagementId, 'AUTH_REFUSED', outcome]));
  if (!found) { await refused(null, 'UNKNOWN_ENGAGEMENT'); throw new AccessError(401, 'UNAUTHENTICATED'); }
  let key: Buffer;
  try { key = open(keys.vault, { ciphertext: found.key_ciphertext, nonce: found.key_nonce, tag: found.key_tag }, `channel-key:${found.engagement_id}`); }
  catch { await refused(found.engagement_id, 'KEY_UNREADABLE'); throw new AccessError(503, 'SERVICE_UNAVAILABLE'); }
  if (!C.channelSignatureValid(key, call.timestamp, call.body, call.signature, now.getTime())) { await refused(found.engagement_id, 'BAD_SIGNATURE'); throw new AccessError(401, 'UNAUTHENTICATED'); }
  if (found.state === 'CLOSED') { await refused(found.engagement_id, 'ENGAGEMENT_CLOSED'); throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'engagement', code: 'engagement_closed' }]); }
  return asInstallation(pool, found.engagement_id, async tx => {
    if (!(await tx.query('SELECT vendor.channel_rate_ok() AS ok')).rows[0].ok) {
      await tx.query('SELECT vendor.channel_refused($1,$2,$3)', [found.engagement_id, 'REFUSED', 'RATE_LIMITED']);
      throw new AccessError(429, 'RATE_LIMITED');
    }
    const b: Bound = { engagementId: found.engagement_id, tx };
    if (call.kind === 'check-in') return { status: 200, body: await checkIn(b, keys, call.body, now) };
    if (call.kind === 'deliveries') return { status: 200, body: await delivery(b, keys, call.body, now) };
    if (call.kind === 'responses') return { status: 200, body: await managementResponse(b, keys, call.body, now) };
    return { status: 200, body: await packageOverChannel(b, keys, call.digest!, call.body, now) };
  });
}
const context = async (b: Bound) => (await b.tx.query('SELECT * FROM vendor.channel_context()')).rows[0]!;
const jsonOf = (body: Buffer) => { try { return JSON.parse(body.toString('utf8')); } catch { throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'body', code: 'not_json' }]); } };
const parse = <T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; code: string }[] } } }, value: unknown): T => {
  const r = schema.safeParse(value);
  if (!r.success) throw new AccessError(400, 'VALIDATION_ERROR', r.error.issues.slice(0, 16).map(i => ({ field: i.path.map(String).join('.').slice(0, 120), code: i.code })));
  return r.data;
};

/** Mandate problems the client installation is told about in the signed instructions. */
function mandateProblem(m: C.MandateDocument, ctx: pg.QueryResultRow): string | null {
  if (m.engagement_code_digest !== ctx.code_digest) return 'MANDATE_FOR_ANOTHER_ENGAGEMENT';
  const scope = new Set<string>(ctx.scope);
  if (m.scope_requirement_ids.some(r => !scope.has(r))) return 'MANDATE_SCOPE_OUTSIDE_ENGAGEMENT';
  if (m.evidence_key_id !== ctx.installation_key_id) return 'MANDATE_NAMES_ANOTHER_KEY';
  return null;
}
async function checkIn(b: Bound, keys: Keys, raw: Buffer, now: Date) {
  const body = parse(C.CheckInBody, jsonOf(raw));
  let ctx = await context(b);
  const instructions = (mandate: { mandate_id: string; accepted: boolean; problem: string | null }, requests: unknown[], documents: C.ChannelInstructions['documents'] = []) => C.signByVendor(C.ChannelInstructions.parse({
    kind: 'CHANNEL_INSTRUCTIONS', engagement_code_digest: ctx.code_digest, issued_at: now.toISOString(), mandate, next_sequence: ctx.next_sequence, last_digest: ctx.last_digest, requests, documents }), keys.audit());
  const keyId = C.evidenceKeyId(body.installation_public_key);
  const pin = (await b.tx.query('SELECT vendor.channel_pin_key($1,$2) AS r', [body.installation_public_key, keyId])).rows[0].r as string;
  const presented = (body.signed_mandate.document as { mandate_id?: unknown })?.mandate_id;
  const mandateRef = typeof presented === 'string' && /^[0-9a-f-]{36}$/.test(presented) ? presented : randomUUID();
  if (pin === 'KEY_CHANGED') {
    await b.tx.query('SELECT vendor.channel_checked_in($1)', ['INSTALLATION_KEY_CHANGED']);
    return instructions({ mandate_id: mandateRef, accepted: false, problem: 'INSTALLATION_KEY_CHANGED' }, []);
  }
  ctx = await context(b);
  let mandate: C.MandateDocument;
  try { mandate = C.verifyInstallationSigned(body.signed_mandate, ctx.installation_public_key, C.MandateDocument); }
  catch (error) {
    const problem = (error as Error).message === 'SIGNATURE_INVALID' ? 'MANDATE_SIGNATURE_INVALID' : (error as Error).message === 'UNPINNED_INSTALLATION_KEY' ? 'MANDATE_NAMES_ANOTHER_KEY' : 'MANDATE_INVALID';
    await b.tx.query('SELECT vendor.channel_checked_in($1)', [problem]);
    return instructions({ mandate_id: mandateRef, accepted: false, problem }, []);
  }
  const problem = mandateProblem(mandate, ctx);
  if (!problem) await b.tx.query('SELECT vendor.channel_record_mandate($1,$2,$3,$4,$5,$6,$7,$8)',
    [mandate.mandate_id, mandate.kind, mandate.state, mandate.valid_from, mandate.valid_to, JSON.stringify(mandate), JSON.stringify(body.signed_mandate), C.signedDigest(body.signed_mandate)]);
  for (const a of body.acknowledgements) await b.tx.query('SELECT vendor.channel_acknowledge($1,$2,$3,$4,$5)', [a.request_id, a.outcome, a.reason, a.delivery_id, a.package_id]);
  // Requests flow only while the mandate the client signed is open: nothing is asked of a suspended, revoked or ended mandate.
  const open = !problem && C.mandateOpen(mandate, now);
  const requests = open ? (await b.tx.query('SELECT signed FROM vendor.channel_pending_requests()')).rows.map(r => r.signed) : [];
  // Signed findings, request lists and reports the client has not yet acknowledged; acknowledged ones are not offered again.
  if (!problem) for (const id of body.documents_received) await b.tx.query('SELECT vendor.channel_acknowledge_document($1)', [id]);
  const documents: C.ChannelInstructions['documents'] = [];
  if (open) {
    // The client reads at most 1 MiB of an answer, so documents are offered in order only while the whole signed answer fits the
    // budget; the rest follow at later check-ins. One document that could never fit is marked for the file route, not dropped.
    let used = Buffer.byteLength(JSON.stringify(instructions({ mandate_id: mandate.mandate_id, accepted: true, problem: null }, requests)));
    for (const d of (await b.tx.query('SELECT * FROM vendor.channel_offered_documents()')).rows) {
      const entry = { document_id: d.document_id as string, kind: d.kind as 'REQUEST_LIST' | 'FINDINGS' | 'REPORT',
        signed: { algorithm: 'Ed25519', signing_key_id: d.signing_key_id, document: d.document, signature: d.signature }, pdf_base64: d.pdf ? (d.pdf as Buffer).toString('base64') : null };
      const bytes = Buffer.byteLength(JSON.stringify(entry)) + 1;
      if (bytes > DOCUMENT_BUDGET || (entry.pdf_base64?.length ?? 0) > C.CHANNEL_PDF_MAX) { await b.tx.query('SELECT vendor.channel_document_too_large($1,$2)', [entry.document_id, bytes]); continue; }
      if (used + bytes > ANSWER_BUDGET) break;
      documents.push(entry); used += bytes;
    }
  }
  await b.tx.query('SELECT vendor.channel_checked_in($1)', [problem ?? (open ? 'OK' : `MANDATE_${mandate.state}`)]);
  ctx = await context(b);
  return instructions({ mandate_id: mandate.mandate_id, accepted: !problem, problem }, requests, documents);
}

/**
 * A management response the client installation sends (task AUDIT-PRACTICE-01): verified against the pinned installation key,
 * recorded once against a finding of this engagement, answered with a signed receipt. A repeat gets an ACCEPTED receipt again.
 */
async function managementResponse(b: Bound, keys: Keys, raw: Buffer, now: Date) {
  const body = parse(C.ResponseBody, jsonOf(raw));
  const ctx = await context(b);
  if (!ctx.installation_public_key) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'channel', code: 'check_in_required' }]);
  let d: C.ResponseDocument;
  try { d = C.verifyInstallationSigned(body.signed_response, ctx.installation_public_key, C.ResponseDocument); }
  catch (error) {
    await b.tx.query('SELECT vendor.channel_refused($1,$2,$3)', [b.engagementId, 'REFUSED', (error as Error).message === 'SIGNATURE_INVALID' ? 'RESPONSE_SIGNATURE_INVALID' : 'RESPONSE_INVALID']);
    throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'signed_response', code: 'not_a_valid_signed_response' }]);
  }
  const digest = C.signedDigest(body.signed_response);
  const receipt = (outcome: 'ACCEPTED' | 'REFUSED', reasons: string[]) => C.signByVendor(C.ResponseReceipt.parse({ kind: 'RESPONSE_RECEIPT', engagement_code_digest: ctx.code_digest, response_id: d.response_id, response_digest: digest,
    outcome, reasons, received_at: now.toISOString() }), keys.audit());
  if (d.engagement_code_digest !== ctx.code_digest) return receipt('REFUSED', ['WRONG_ENGAGEMENT']);
  const outcome = (await b.tx.query('SELECT vendor.channel_record_response($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS o', [d.response_id, d.finding_id, d.factual_accuracy, d.agreement, d.response, d.action_plan, d.owner_role,
    d.due_date, d.dependencies, d.remediation_status, d.risk_acceptance ? JSON.stringify(d.risk_acceptance) : null, JSON.stringify(body.signed_response), digest])).rows[0].o as string;
  return outcome === 'ACCEPTED' || outcome === 'DUPLICATE' ? receipt('ACCEPTED', []) : receipt('REFUSED', [outcome]);
}

async function delivery(b: Bound, keys: Keys, raw: Buffer, now: Date) {
  const body = parse(C.DeliveryBody, jsonOf(raw));
  const ctx = await context(b);
  if (!ctx.installation_public_key) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'channel', code: 'check_in_required' }]);
  let d: C.DeliveryDocument;
  try { d = C.verifyInstallationSigned(body.signed_delivery, ctx.installation_public_key, C.DeliveryDocument); }
  catch (error) {
    await b.tx.query('SELECT vendor.channel_refused($1,$2,$3)', [b.engagementId, 'REFUSED', (error as Error).message === 'SIGNATURE_INVALID' ? 'DELIVERY_SIGNATURE_INVALID' : 'DELIVERY_INVALID']);
    throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'signed_delivery', code: 'not_a_valid_signed_delivery' }]);
  }
  const digest = C.signedDigest(body.signed_delivery);
  // A retry of a delivery already received gets the original receipt, so a timeout on the client side never duplicates evidence.
  const stored = (await b.tx.query('SELECT * FROM vendor.channel_stored_delivery($1)', [d.delivery_id])).rows[0];
  if (stored) { if (stored.digest !== digest) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT'); return stored.receipt; }
  const reasons: string[] = [];
  if (d.engagement_code_digest !== ctx.code_digest) reasons.push('WRONG_ENGAGEMENT');
  const mandate = ctx.mandate_document ? C.MandateDocument.parse(ctx.mandate_document) : null;
  if (!mandate || mandate.mandate_id !== d.mandate_id) reasons.push('MANDATE_NOT_RECEIVED');
  else {
    if (!C.mandateOpen(mandate, now)) reasons.push('MANDATE_NOT_ACTIVE');
    const categories = new Set<string>(mandate.categories); const scope = new Set<string>(mandate.scope_requirement_ids);
    if (d.entries.some(e => !categories.has(e.category))) reasons.push('CATEGORY_OUTSIDE_MANDATE');
    if (d.entries.some(e => e.requirement_id !== null && !scope.has(e.requirement_id))) reasons.push('REQUIREMENT_OUTSIDE_MANDATE');
  }
  if (d.request_id && !(await b.tx.query('SELECT 1 FROM vendor.channel_pending_requests() WHERE id=$1', [d.request_id])).rowCount) reasons.push('REQUEST_NOT_PENDING');
  if (d.sequence < ctx.next_sequence) reasons.push('SEQUENCE_REUSED');
  const outcome = reasons.length ? 'REFUSED' as const : 'ACCEPTED' as const;
  const chainBroken = outcome === 'ACCEPTED' && (d.sequence !== ctx.next_sequence || d.previous_digest !== ctx.last_digest);
  const recorded = chainBroken ? ['CHAIN_BROKEN'] : reasons;
  const receipt = C.signByVendor(C.DeliveryReceipt.parse({ kind: 'DELIVERY_RECEIPT', engagement_code_digest: ctx.code_digest, delivery_id: d.delivery_id, delivery_digest: digest, sequence: d.sequence,
    outcome, reasons: recorded, received_at: now.toISOString() }), keys.audit());
  await b.tx.query('SELECT vendor.channel_record_delivery($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',
    [d.delivery_id, d.mandate_id, d.sequence, digest, d.previous_digest, d.kind, d.request_id, d.generated_at, d.period.from, d.period.to, d.entries.length,
      JSON.stringify(d), JSON.stringify(body.signed_delivery), outcome, recorded, JSON.stringify(receipt)]);
  return receipt;
}

async function packageOverChannel(b: Bound, keys: Keys, digest: string, raw: Buffer, now: Date) {
  const c: Ctx = { tx: b.tx, requestId: randomUUID(), actor: { actor_id: b.engagementId, actor_domain: 'CLIENT_INSTALLATION', role: 'CLIENT_INSTALLATION', organisation_id: null } };
  const fileSha = sha256(raw);
  let clientPackage: string | null = null;
  try { const id = JSON.parse(raw.toString('utf8'))?.manifest?.package_id; clientPackage = typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id) ? id : null; } catch { clientPackage = null; }
  const receipt = (outcome: 'ACCEPTED' | 'QUARANTINED' | 'REFUSED', reasons: string[]) => C.signByVendor(C.PackageReceipt.parse({ kind: 'PACKAGE_RECEIPT', engagement_code_digest: digest,
    client_package_id: clientPackage, file_sha256: fileSha, outcome, reasons: reasons.slice(0, 20), received_at: now.toISOString() }), keys.audit());
  // The same package sent again (after a timeout) gets the outcome it already had.
  if (clientPackage) {
    const existing = (await b.tx.query('SELECT state, file_sha256 FROM vendor.packages WHERE engagement_id=$1 AND client_package_id=$2', [b.engagementId, clientPackage])).rows[0];
    if (existing && existing.file_sha256 === fileSha) return receipt(existing.state === 'QUARANTINED' ? 'QUARANTINED' : 'ACCEPTED', existing.state === 'QUARANTINED' ? ['PERSONAL_DATA_WITHOUT_PROCESSING_AGREEMENT'] : []);
  }
  const result = await receivePackageForDigest(c, digest, raw, keys, now);
  return receipt(result.outcome, result.reasons);
}

// ---------------------------------------------------------------- engagement team
const onTeam = async (c: Ctx, id: string) => (await c.tx.query('SELECT vendor.on_team($1,NULL) AS ok', [id])).rows[0].ok === true;
async function requireTeam(c: Ctx, id: string) {
  const e = (await c.tx.query('SELECT id, state, scope_requirement_ids FROM vendor.engagements WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  if (!(await onTeam(c, id))) throw new AccessError(403, 'FORBIDDEN');
  return e;
}
const requestView = (r: pg.QueryResultRow) => V.ChannelRequestView.parse({ id: r.id, kind: r.kind, requirement_id: r.requirement_id, categories: r.categories, population: r.population, sample_size: r.sample_size,
  seed: r.seed, description: r.description, due_date: day(r.due_date), issued_by: r.issued_by, issued_at: iso(r.issued_at), status: r.status, status_reason: r.status_reason, acknowledged_at: iso(r.acknowledged_at),
  delivery_id: r.delivery_id, package_id: r.package_id, overdue: ['PENDING', 'AWAITING_CLIENT_APPROVAL'].includes(r.status) && day(r.due_date)! < new Date().toISOString().slice(0, 10) });
const deliverySummary = (d: pg.QueryResultRow) => ({ delivery_id: d.delivery_id, sequence: d.sequence, kind: d.kind, request_id: d.request_id, generated_at: iso(d.generated_at), period_from: iso(d.period_from),
  period_to: iso(d.period_to), entries: d.entries, outcome: d.outcome, reasons: d.reasons, received_at: iso(d.received_at), purged: d.purged_at !== null });
export async function channelView(c: Ctx, id: string) {
  await requireTeam(c, id);
  const ch = (await c.tx.query('SELECT * FROM vendor.channels WHERE engagement_id=$1', [id])).rows[0];
  const mandates = (await c.tx.query('SELECT * FROM vendor.channel_mandates WHERE engagement_id=$1 ORDER BY received_at DESC, id LIMIT 500', [id])).rows;
  const current = mandates[0];
  const requests = (await c.tx.query('SELECT * FROM vendor.channel_requests WHERE engagement_id=$1 ORDER BY issued_at DESC, id LIMIT 1000', [id])).rows;
  const deliveries = (await c.tx.query('SELECT delivery_id, sequence, kind, request_id, generated_at, period_from, period_to, entries, outcome, reasons, received_at, purged_at FROM vendor.channel_deliveries WHERE engagement_id=$1 ORDER BY received_at DESC LIMIT 1000', [id])).rows;
  const events = (await c.tx.query('SELECT kind, outcome, recorded_at FROM vendor.channel_events WHERE engagement_id=$1 ORDER BY recorded_at DESC LIMIT 100', [id])).rows;
  const documents = (await c.tx.query(`SELECT d.document_id, s.kind, d.offered_at, d.acknowledged_at, d.channel_state, d.encoded_bytes FROM vendor.channel_documents d JOIN vendor.signed_documents s ON s.id = d.document_id
    WHERE d.engagement_id=$1 ORDER BY d.offered_at DESC LIMIT 500`, [id])).rows;
  return V.ChannelView.parse({ engagement_id: id, available: Boolean(ch),
    health: ch ? { installation_key_id: ch.installation_key_id, pinned_at: iso(ch.pinned_at), last_check_in_at: iso(ch.last_check_in_at), check_ins: ch.check_ins, chain_state: ch.chain_state, chain_problem: ch.chain_problem, next_sequence: ch.next_sequence } : null,
    mandate: current ? { mandate_id: current.mandate_id, kind: current.kind, state: current.state, valid_from: iso(current.valid_from), valid_to: iso(current.valid_to), open: C.mandateOpen({ state: current.state, valid_from: iso(current.valid_from)!, valid_to: iso(current.valid_to)! }),
      received_at: iso(current.received_at), document: current.document } : null,
    mandate_history: mandates.map(m => ({ mandate_id: m.mandate_id, state: m.state, received_at: iso(m.received_at) })),
    requests: requests.map(requestView), deliveries: deliveries.map(deliverySummary),
    documents: documents.map(d => ({ document_id: d.document_id, kind: d.kind, offered_at: iso(d.offered_at), acknowledged_at: iso(d.acknowledged_at), channel_state: d.channel_state, encoded_bytes: d.encoded_bytes })), events: events.map(e => ({ kind: e.kind, outcome: e.outcome, recorded_at: iso(e.recorded_at) })) });
}
export async function channelDelivery(c: Ctx, deliveryId: string) {
  const d = (await c.tx.query('SELECT * FROM vendor.channel_deliveries WHERE delivery_id=$1', [deliveryId])).rows[0] ?? refuse(404, 'id', 'not_found');
  await audit(c, 'vendor.channel.delivery-viewed', deliveryId);
  return V.ChannelDeliveryDetail.parse({ ...deliverySummary(d), document: d.document, signed: d.signed, receipt: d.receipt });
}
export async function createChannelRequest(c: Ctx, id: string, input: unknown, keys: Keys) {
  const v = V.ChannelRequestCreate.parse(input); const e = await requireTeam(c, id);
  if (e.state === 'CLOSED') refuse(409, 'engagement', 'closed');
  // An auditor asks the client for evidence only on an engagement the practice has accepted (task AUDIT-PRACTICE-01).
  if (!(await c.tx.query('SELECT vendor.engagement_accepted($1) AS ok', [id])).rows[0].ok) refuse(409, 'engagement', 'engagement_not_accepted');
  if (!(await c.tx.query('SELECT 1 FROM vendor.channels WHERE engagement_id=$1', [id])).rowCount) refuse(409, 'engagement', 'channel_not_available_use_file_exchange');
  if (v.requirement_id && !(e.scope_requirement_ids as string[]).includes(v.requirement_id)) refuse(400, 'requirement_id', 'outside_scope');
  if (v.due_date < new Date().toISOString().slice(0, 10)) refuse(400, 'due_date', 'in_the_past');
  const digest = (await c.tx.query('SELECT code_digest FROM vendor.engagements WHERE id=$1', [id])).rows[0].code_digest as string;
  // The seed is drawn by the server at the auditor's request, so neither the client nor the auditor can steer which records are sampled.
  const seed = v.kind === 'SAMPLE_COUNT' ? randomBytes(16).toString('hex') : null;
  const request = C.AuditorRequest.safeParse({ request_id: randomUUID(), engagement_code_digest: digest, kind: v.kind, requirement_id: v.requirement_id, categories: v.categories,
    population: v.kind === 'SAMPLE_COUNT' ? v.population : null, sample_size: v.kind === 'SAMPLE_COUNT' ? v.sample_size : null, seed, description: v.description, due_date: v.due_date, issued_at: new Date().toISOString() });
  if (!request.success) refuse(400, String(request.error!.issues[0]?.path[0] ?? 'kind'), 'request_incomplete_for_its_kind');
  const r = request.data!;
  const signed = C.signByVendor(r, keys.audit());
  await c.tx.query(`INSERT INTO vendor.channel_requests (id, engagement_id, kind, requirement_id, categories, population, sample_size, seed, description, due_date, signed, issued_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [r.request_id, id, r.kind, r.requirement_id, r.categories, r.population, r.sample_size, r.seed, r.description, r.due_date, JSON.stringify(signed), c.actor.actor_id]);
  await audit(c, 'vendor.channel.request-issued', r.request_id);
  return channelView(c, id);
}
export async function withdrawChannelRequest(c: Ctx, requestId: string) {
  const r = (await c.tx.query('SELECT engagement_id, status FROM vendor.channel_requests WHERE id=$1', [requestId])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, r.engagement_id);
  if (r.status !== 'PENDING') refuse(409, 'request', 'only_pending_requests_can_be_withdrawn');
  await c.tx.query("UPDATE vendor.channel_requests SET status='WITHDRAWN', status_reason='WITHDRAWN_BY_AUDITOR' WHERE id=$1 AND status='PENDING'", [requestId]);
  await audit(c, 'vendor.channel.request-withdrawn', requestId);
  return channelView(c, r.engagement_id);
}

// ---------------------------------------------------------------- leadership
export async function overview(c: Ctx) {
  const r = (await c.tx.query('SELECT vendor.overview() AS o')).rows[0].o;
  return V.VendorOverview.parse(r);
}
