import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as D from '../../../../shared/contracts/src/dpdpa-audit.ts';
import { mandateOpen, MAX_MANDATE_DAYS } from '../../../../shared/contracts/src/audit-channel.ts';
import { AuditPackageManifest, packageFileBytes, sha256 } from '../../../../shared/contracts/src/audit-exchange.ts';
import { canonicalJson } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, type Context } from '../shared/transaction.ts';
import { iso, predicate, refuse, scope } from '../operations/shared.ts';
import { engagement, importDocument } from './exchange.ts';
import { redactContactDetails } from '../../../../shared/contracts/src/redaction.ts';

/**
 * Client staff side of the DPDPA audit mandate (revision 1.6 addendum): the
 * one authorisation a client signs for an engagement, the channel view that
 * shows everything the background worker sent and received, and the two
 * decisions a person still makes — declining an auditor request ORVIA could
 * not answer by itself, or answering it with a sealed package.
 *
 * Separation of duties is checked again in the SECURITY DEFINER functions of
 * migration 0068 (approver differs from preparer; owner or administrator only).
 */
type Row = QueryResultRow;
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) {
    const e = error as { code?: string; message?: string; hint?: string; constraint?: string };
    if (e.code === '42501') throw new AccessError(403, 'FORBIDDEN');
    if (e.code === 'P0002') refuse(404, e.hint ?? 'id', 'not_found');
    if (e.code === 'P0001') refuse(409, e.hint ?? 'request', e.message ?? 'refused');
    if (e.code === '23505') refuse(409, e.constraint ?? 'request', 'already_exists');
    if (e.code === '23514') refuse(400, e.constraint ?? 'request', 'constraint_violated');
    throw error;
  }
}
const today = () => new Date().toISOString().slice(0, 10);
const day = (v: unknown) => v instanceof Date ? new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : String(v).slice(0, 10);
const mandateView = (m: Row) => D.AuditMandate.parse({ id: m.id, engagement_id: m.engagement_id, kind: m.kind, scope_requirement_ids: m.scope_requirement_ids, categories: m.categories, schedule: m.schedule,
  valid_from: iso(m.valid_from), valid_to: iso(m.valid_to), state: m.state, open: mandateOpen({ state: m.state, valid_from: iso(m.valid_from)!, valid_to: iso(m.valid_to)! }),
  prepared_by: m.prepared_by, prepared_role: m.prepared_role, approved_by: m.approved_by, approved_role: m.approved_role, approved_at: iso(m.approved_at), state_changed_at: iso(m.state_changed_at),
  state_reason: m.state_reason, reported_state: m.reported_state, last_check_in_at: iso(m.last_check_in_at), next_collection_at: iso(m.next_collection_at), channel_problem: m.channel_problem, created_at: iso(m.created_at) });
const deliveryView = (d: Row) => ({ id: d.id, mandate_id: d.mandate_id, sequence: d.sequence, kind: d.kind, request_id: d.request_id, period_from: iso(d.period_from), period_to: iso(d.period_to), entries: d.entries,
  categories: d.categories, digest: d.digest, state: d.state, attempts: d.attempts, last_error: d.last_error, reasons: d.reasons, created_at: iso(d.created_at), completed_at: iso(d.completed_at) });
const requestView = (r: Row) => D.ChannelRequest.parse({ id: r.id, mandate_id: r.mandate_id, kind: r.kind, requirement_id: r.requirement_id, description: r.description, due_date: day(r.due_date), received_at: iso(r.received_at),
  decision: r.decision, decision_reason: r.decision_reason, decided_by: r.decided_by, decided_at: iso(r.decided_at), delivery_id: r.delivery_id, package_id: r.package_id,
  reported_to_auditor: r.decision === 'ANSWER_AUTOMATICALLY' ? false : r.acknowledged_state === r.decision, overdue: ['ANSWER_AUTOMATICALLY', 'AWAITING_CLIENT_APPROVAL'].includes(r.decision) && day(r.due_date) < today(), request: r.request });
const submissionView = (s: Row) => D.PackageSubmission.parse({ id: s.id, package_id: s.package_id, engagement_id: s.engagement_id, request_id: s.request_id, file_sha256: s.file_sha256, state: s.state, attempts: s.attempts,
  last_error: s.last_error, reasons: s.reasons, requested_by: s.requested_by, requested_at: iso(s.requested_at), completed_at: iso(s.completed_at) });
async function mandateRow(c: Context, id: string) {
  return (await c.tx.query(`SELECT * FROM app.audit_mandates WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
}
async function engagementRow(c: Context, id: string) {
  return (await c.tx.query(`SELECT * FROM app.audit_engagements WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
}

export async function auditChannel(c: Context, engagementId: string) {
  await engagementRow(c, engagementId);
  const available = (await c.tx.query('SELECT app.audit_channel_available($1) AS ok', [engagementId])).rows[0].ok === true;
  const mandates = (await c.tx.query(`SELECT * FROM app.audit_mandates WHERE ${predicate} AND engagement_id=$4 ORDER BY created_at DESC LIMIT 100`, [...scope(c), engagementId])).rows;
  const requests = (await c.tx.query(`SELECT * FROM app.audit_channel_requests WHERE ${predicate} AND engagement_id=$4 ORDER BY received_at DESC LIMIT 500`, [...scope(c), engagementId])).rows;
  const deliveries = (await c.tx.query(`SELECT id, mandate_id, sequence, kind, request_id, period_from, period_to, entries, categories, digest, state, attempts, last_error, reasons, created_at, completed_at
    FROM app.audit_channel_deliveries WHERE ${predicate} AND engagement_id=$4 ORDER BY created_at DESC LIMIT 500`, [...scope(c), engagementId])).rows;
  const submissions = (await c.tx.query(`SELECT id, package_id, engagement_id, request_id, file_sha256, state, attempts, last_error, reasons, requested_by, requested_at, completed_at
    FROM app.audit_package_submissions WHERE ${predicate} AND engagement_id=$4 ORDER BY requested_at DESC LIMIT 200`, [...scope(c), engagementId])).rows;
  const keyId = (await c.tx.query('SELECT app.installation_evidence_key_id() AS k')).rows[0].k as string | null;
  const address = process.env.ORVIA_AUDIT_SERVICE_URL ?? null;
  const limits: string[] = [];
  if (!available) limits.push('This engagement was registered before the audit channel existed; evidence for it moves only as files.');
  if (!address || !process.env.ORVIA_AUDIT_KEY_ID) limits.push('The trust file names no audit service address or audit key, so nothing is sent; evidence moves only as files until the vendor supplies an updated trust file.');
  const documents = (await c.tx.query(`SELECT id, kind, received_at, pdf IS NOT NULL AS has_pdf, import_id, imported_at, signed FROM app.audit_channel_documents WHERE ${predicate} AND engagement_id=$4 ORDER BY received_at DESC LIMIT 200`, [...scope(c), engagementId])).rows;
  const responses = (await c.tx.query(`SELECT * FROM app.audit_finding_responses WHERE ${predicate} AND engagement_id=$4 ORDER BY prepared_at DESC LIMIT 500`, [...scope(c), engagementId])).rows;
  return D.AuditChannel.parse({ engagement_id: engagementId, available, audit_service: { configured: Boolean(address && process.env.ORVIA_AUDIT_KEY_ID), address }, evidence_key_id: keyId,
    mandates: mandates.map(mandateView), requests: requests.map(requestView), deliveries: deliveries.map(deliveryView), submissions: submissions.map(submissionView),
    documents: documents.map(documentView), responses: await Promise.all(responses.map(r => responseView(c, r))), limits });
}

export async function createMandate(c: Context, engagementId: string, input: unknown) {
  const v = D.AuditMandateCreate.parse(input); const e = await engagementRow(c, engagementId);
  if (e.state !== 'ACTIVE') refuse(409, 'engagement', 'closed');
  const scopeSet = new Set<string>(e.scope_requirement_ids);
  if (v.scope_requirement_ids.some(r => !scopeSet.has(r))) refuse(400, 'scope_requirement_ids', 'outside_engagement_scope');
  if (new Set(v.categories).size !== v.categories.length) refuse(400, 'categories', 'duplicate');
  const from = Date.parse(v.valid_from); const to = Date.parse(v.valid_to);
  if (to <= from) refuse(400, 'valid_to', 'before_valid_from');
  if (to <= Date.now()) refuse(400, 'valid_to', 'in_the_past');
  if (to - from > MAX_MANDATE_DAYS * 86_400_000) refuse(400, 'valid_to', `at_most_${MAX_MANDATE_DAYS}_days`);
  // An engagement mandate lasts no longer than the audit needs: its period plus 120 days for fieldwork and reporting.
  if (v.kind === 'ENGAGEMENT' && to > Date.parse(`${day(e.period_to)}T23:59:59.999Z`) + 120 * 86_400_000) refuse(400, 'valid_to', 'engagement_mandate_ends_within_120_days_of_the_audit_period');
  const org = (await c.tx.query('SELECT name FROM app.organisations WHERE id=$1', [c.actor.scope.tenant_id])).rows[0]?.name ?? 'Organisation';
  const installation = (await c.tx.query('SELECT app.installation_reference() AS id')).rows[0].id as string;
  const id = randomUUID();
  await guarded(() => c.tx.query(`INSERT INTO app.audit_mandates (tenant_id, legal_entity_id, environment_id, id, engagement_id, kind, scope_requirement_ids, categories, schedule, valid_from, valid_to, organisation_name, installation_id, prepared_by, prepared_role)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [...scope(c), id, engagementId, v.kind, [...new Set(v.scope_requirement_ids)], v.categories, v.schedule, v.valid_from, v.valid_to, String(org).slice(0, 160), installation, c.actor.actor_id, c.actor.role]));
  await audit(c, 'audit_mandate.drafted', id);
  return mandateView(await mandateRow(c, id));
}
export async function approveMandate(c: Context, id: string) {
  await mandateRow(c, id);
  await guarded(() => c.tx.query('SELECT app.audit_mandate_approve($1)', [id]));
  await audit(c, 'audit_mandate.approved', id);
  return mandateView(await mandateRow(c, id));
}
export async function changeMandateState(c: Context, id: string, input: unknown) {
  const v = D.AuditMandateStateChange.parse(input); await mandateRow(c, id);
  await guarded(() => c.tx.query('SELECT app.audit_mandate_change($1,$2,$3)', [id, v.state, v.reason]));
  await audit(c, `audit_mandate.${v.state.toLowerCase()}`, id);
  return mandateView(await mandateRow(c, id));
}
export async function closeEngagement(c: Context, id: string, input: unknown) {
  const v = D.AuditEngagementClose.parse(input); await engagementRow(c, id);
  await guarded(() => c.tx.query('SELECT app.audit_engagement_close($1,$2)', [id, v.reason]));
  await audit(c, 'audit_engagement.closed', id);
  return engagement(c, id);
}
export async function channelDelivery(c: Context, id: string) {
  const d = (await c.tx.query(`SELECT * FROM app.audit_channel_deliveries WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
  await audit(c, 'audit_channel.delivery_read', id);
  return D.ChannelDeliveryContent.parse({ ...deliveryView(d), document: d.document, signed: d.signed, receipt: d.receipt });
}

/** Re-creates the approved package bytes exactly (they are checked against the sealed hash in the database too). */
async function approvedBytes(c: Context, packageId: string) {
  const p = (await c.tx.query(`SELECT * FROM app.audit_packages WHERE ${predicate} AND id=$4`, [...scope(c), packageId])).rows[0] ?? refuse(404, 'id', 'not_found');
  if (p.state !== 'APPROVED') refuse(409, 'package', p.state === 'REVOKED' ? 'revoked' : 'approval_required');
  if (Date.parse(p.expires_at) <= Date.now()) refuse(409, 'package', 'expired');
  const manifest = AuditPackageManifest.parse(p.manifest); const contents = new Map<string, Buffer>();
  for (const i of (await c.tx.query(`SELECT * FROM app.audit_package_items WHERE ${predicate} AND package_id=$4`, [...scope(c), packageId])).rows) {
    if (i.kind === 'FILE') { const f = (await c.tx.query(`SELECT content FROM app.evidence_files WHERE ${predicate} AND id=$4`, [...scope(c), i.evidence_file_id])).rows[0]!; contents.set(i.item_id, f.content as Buffer); }
    else contents.set(i.item_id, Buffer.from(i.kind === 'INDICATOR' ? canonicalJson(i.indicator) : i.statement as string, 'utf8'));
  }
  const bytes = packageFileBytes(manifest, contents);
  if (sha256(bytes) !== p.file_sha256) throw new Error('Package content changed after approval');
  return { p, bytes };
}
async function queueSubmission(c: Context, packageId: string, requestId: string | null) {
  const { bytes } = await approvedBytes(c, packageId);
  const id = randomUUID();
  await guarded(() => c.tx.query('SELECT app.audit_package_queue_submission($1,$2,$3,$4)', [id, packageId, requestId, bytes]));
  await audit(c, 'audit_package.channel_submission_queued', id);
  return submissionView((await c.tx.query(`SELECT * FROM app.audit_package_submissions WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0]);
}
export const submitPackageOverChannel = (c: Context, packageId: string) => queueSubmission(c, packageId, null);
export async function decideRequest(c: Context, id: string, input: unknown) {
  const v = D.ChannelRequestDecision.parse(input);
  if (v.decision === 'REFUSED' && !v.reason) refuse(400, 'reason', 'required');
  if (v.decision === 'PACKAGE' && !v.package_id) refuse(400, 'package_id', 'required');
  await guarded(() => c.tx.query('SELECT app.audit_request_decide($1,$2,$3,$4)', [id, v.decision, v.reason, v.package_id]));
  if (v.decision === 'PACKAGE') await queueSubmission(c, v.package_id!, id);
  await audit(c, `audit_channel.request_${v.decision.toLowerCase()}`, id);
  return requestView((await c.tx.query(`SELECT * FROM app.audit_channel_requests WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found'));
}

// ---------------------------------------------------------------- channel round trip (task AUDIT-PRACTICE-01)
const documentView = (d: Row) => {
  const doc = (d.signed as { document?: { findings?: unknown[]; version?: number; requests?: unknown[] } }).document ?? {};
  const summary = d.kind === 'FINDINGS' ? `${doc.findings?.length ?? 0} finding(s)` : d.kind === 'REPORT' ? `Report version ${doc.version ?? '?'}` : `${doc.requests?.length ?? 0} request(s)`;
  return D.ChannelDocumentView.parse({ id: d.id, kind: d.kind, received_at: iso(d.received_at), has_pdf: d.has_pdf, import_id: d.import_id, imported_at: iso(d.imported_at), summary });
};
async function responseView(c: Context, r: Row) {
  const imp = (await c.tx.query(`SELECT document FROM app.audit_imports WHERE ${predicate} AND id=$4`, [...scope(c), r.import_id])).rows[0];
  const finding = ((imp?.document?.findings ?? []) as { finding_id: string; title: string }[]).find(f => f.finding_id === r.finding_id);
  return D.FindingResponse.parse({ id: r.id, engagement_id: r.engagement_id, import_id: r.import_id, finding_id: r.finding_id, finding_title: finding?.title ?? null, content: r.content, redactions: r.redactions,
    prepared_by: r.prepared_by, prepared_at: iso(r.prepared_at), approved_by: r.approved_by, approved_at: iso(r.approved_at), state: r.state, attempts: r.attempts, last_error: r.last_error, outcome: r.outcome, completed_at: iso(r.completed_at),
    personal_data_review: r.personal_data_review ?? null });
}
/** A person imports a signed document the worker staged: the same signature, engagement and PDF checks as a file import. */
export async function importChannelDocument(c: Context, id: string) {
  const d = (await c.tx.query(`SELECT * FROM app.audit_channel_documents WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
  if (d.import_id) refuse(409, 'document', 'already_imported');
  const imported = await importDocument(c, d.engagement_id, { signed: d.signed, pdf_base64: d.pdf ? (d.pdf as Buffer).toString('base64') : null });
  await guarded(() => c.tx.query('SELECT app.audit_channel_document_imported($1,$2)', [id, imported.id]));
  await audit(c, 'audit_channel.document_imported', id);
  return imported;
}
/**
 * A management response to one finding of an imported, signed findings file. Free text is screened for contact
 * details before storage; a different owner or administrator approves it before the worker signs and sends it.
 */
export async function createFindingResponse(c: Context, engagementId: string, input: unknown) {
  const v = D.FindingResponseCreate.parse(input); const e = await engagementRow(c, engagementId);
  if (e.state !== 'ACTIVE') refuse(409, 'engagement', 'closed');
  const imp = (await c.tx.query(`SELECT * FROM app.audit_imports WHERE ${predicate} AND id=$4 AND engagement_id=$5`, [...scope(c), v.import_id, engagementId])).rows[0] ?? refuse(404, 'import_id', 'not_found');
  if (imp.kind !== 'FINDINGS') refuse(409, 'import_id', 'not_a_findings_import');
  if (!((imp.document.findings ?? []) as { finding_id: string }[]).some(f => f.finding_id === v.finding_id)) refuse(404, 'finding_id', 'not_in_this_findings_file');
  let redactions = 0;
  const clean = (t: string | null) => { if (t === null) return null; const r = redactContactDetails(t); redactions += r.redactions; return r.text; };
  // The client's own remediation state travels as a reference only: whether a GRC issue tracks it and its state, never its content.
  const link = (await c.tx.query(`SELECT coalesce((SELECT e.kind FROM app.grc_issue_events e WHERE e.tenant_id=l.tenant_id AND e.legal_entity_id=l.legal_entity_id AND e.environment_id=l.environment_id AND e.issue_id=l.grc_issue_id
      ORDER BY e.sequence DESC LIMIT 1), 'OPEN') AS state FROM app.audit_finding_links l WHERE l.tenant_id=$1 AND l.legal_entity_id=$2 AND l.environment_id=$3 AND l.finding_id=$4`, [...scope(c), v.finding_id])).rows[0];
  const content = { factual_accuracy: v.factual_accuracy, agreement: v.agreement, response: clean(v.response), action_plan: clean(v.action_plan), owner_role: clean(v.owner_role), due_date: v.due_date,
    dependencies: clean(v.dependencies), remediation_status: v.remediation_status,
    risk_acceptance: v.risk_acceptance ? { accepting_authority: clean(v.risk_acceptance.accepting_authority), justification: clean(v.risk_acceptance.justification), proposed_until: v.risk_acceptance.proposed_until } : null,
    remediation_reference: link ? { kind: 'GRC_ISSUE', state: String(link.state).slice(0, 40) } : null };
  const id = randomUUID();
  await guarded(() => c.tx.query(`INSERT INTO app.audit_finding_responses (tenant_id, legal_entity_id, environment_id, id, engagement_id, import_id, finding_id, content, redactions, prepared_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [...scope(c), id, engagementId, v.import_id, v.finding_id, JSON.stringify(content), redactions, c.actor.actor_id]));
  await audit(c, 'audit_finding_response.drafted', id);
  return responseView(c, (await c.tx.query(`SELECT * FROM app.audit_finding_responses WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0]);
}
async function responseRow(c: Context, id: string) { return (await c.tx.query(`SELECT * FROM app.audit_finding_responses WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found'); }
export async function approveFindingResponse(c: Context, id: string, input: unknown) {
  const v = D.FindingResponseApproval.parse(input);
  await responseRow(c, id);
  await guarded(() => c.tx.query('SELECT app.audit_finding_response_approve($1,$2)', [id, v.personal_data]));
  await audit(c, 'audit_finding_response.approved', id);
  return responseView(c, await responseRow(c, id));
}
export async function withdrawFindingResponse(c: Context, id: string) {
  await responseRow(c, id);
  await guarded(() => c.tx.query('SELECT app.audit_finding_response_withdraw($1)', [id]));
  await audit(c, 'audit_finding_response.withdrawn', id);
  return responseView(c, await responseRow(c, id));
}
