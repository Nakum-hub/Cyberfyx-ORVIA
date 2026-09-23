import { randomUUID, createHash } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { digest, canonicalJson } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M30 Support Bundle System.
 *
 * The minimisation here is structural rather than procedural. A diagnostic
 * report is assembled entirely from enums, integers, timestamps, versions and
 * digests, so there is no field in which a log line or an operational summary
 * could be placed even by mistake. A forbidden-content scan runs anyway, because
 * the schema is a statement about today and the scan is a statement about every
 * change after it.
 *
 * Approval is bound to one payload digest and carries no authority to generate.
 * A retry may resend exactly what was approved; it can never produce something
 * newer under the same approval.
 *
 * This product has no support transport. Nothing here sends anything. What it
 * records is that an operator carried an approved payload somewhere, which is a
 * different and much weaker claim, and the response says so in as many words.
 */

/** The largest body a vendor ingress would accept. Chosen so a fixed-schema
 *  report fits comfortably and a log dump does not. */
const MAXIMUM_SUBMISSION_BYTES = 8192;

const time = (value: Date) => value.toISOString();

/** A stable reference a vendor can correlate two reports by, that does not
 *  disclose the installation it belongs to. */
const installationReference = (installationId: string) =>
  createHash('sha256').update(`orvia-support-reference:${installationId}`, 'utf8').digest('hex');

// --- cases -----------------------------------------------------------------

export async function createSupportCase(c: Context, input: unknown) {
  const value = S.SupportCaseCreate.parse(input);
  const scope = scopeValues(c.actor);
  if (value.gap_id) {
    const gap = await c.tx.query(`SELECT 1 FROM app.coverage_gaps WHERE ${predicate} AND id=$4`, [...scope, value.gap_id]);
    if (!gap.rowCount) throw new AccessError(404, 'NOT_FOUND');
  }
  const id = randomUUID();
  const row = requireOne((await c.tx.query(
    `INSERT INTO app.support_cases(tenant_id,legal_entity_id,environment_id,id,subject,gap_id,opened_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [...scope, id, value.subject, value.gap_id, c.actor.actor_id])).rows);
  await audit(c, 'support_case.create', id);
  return supportCase(row);
}

type CaseRow = { id: string; subject: string; state: string; gap_id: string | null; vendor_case_reference: string | null; vendor_case_state: string; opened_at: Date; opened_by: string };

const supportCase = (row: CaseRow) => S.SupportCase.parse({
  id: row.id, subject: row.subject, state: row.state, gap_id: row.gap_id,
  vendor_case_reference: row.vendor_case_reference, opened_at: time(row.opened_at), opened_by: row.opened_by,
});

export async function supportCaseList(c: Context, page: Page) {
  const rows = await c.tx.query(`SELECT * FROM app.support_cases WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,
    [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(rows.rows.map(supportCase), page);
}

/** The gap state is read here, every time, rather than copied into the case.
 *  Nothing a vendor reports can reach it. */
async function localControl(c: Context, gapId: string | null): Promise<S.LocalControlStateValue> {
  if (!gapId) return 'NO_LINKED_GAP';
  const gap = (await c.tx.query(`SELECT state FROM app.coverage_gaps WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), gapId])).rows[0];
  if (!gap) return 'NO_LINKED_GAP';
  return ({ OPEN: 'GAP_OPEN', IN_PROGRESS: 'GAP_IN_PROGRESS', RESOLVED: 'GAP_RESOLVED', ACCEPTED_RISK: 'GAP_RISK_ACCEPTED' } as const)[gap.state as 'OPEN'];
}

async function standing(c: Context, row: CaseRow) {
  const scope = scopeValues(c.actor);
  const drafts = await c.tx.query(`SELECT * FROM app.diagnostic_drafts WHERE ${predicate} AND case_id=$4 ORDER BY generated_at,id`, [...scope, row.id]);
  const state = await localControl(c, row.gap_id);
  return S.SupportCaseStanding.parse({
    support_case: supportCase(row),
    vendor_case_state: row.vendor_case_state,
    local_control_state: state,
    // An accepted risk is a decision somebody made, not a control somebody
    // verified, so only a resolved gap counts here.
    local_control_verified: state === 'GAP_RESOLVED',
    drafts: drafts.rows.map(draft),
    vendor_resolution_closes_local_gaps: false,
    limits: [
      'The vendor case state and the local control state are separate facts. Closing the first does not close the second.',
      'A local control is verified only by a coverage gap resolved with recorded evidence, never by a vendor reporting a fix.',
      'This product has no support transport. Any transfer recorded here was performed by an operator.',
    ],
  });
}

export async function readSupportCase(c: Context, id: string) {
  const row = requireOne((await c.tx.query(`SELECT * FROM app.support_cases WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows);
  return standing(c, row);
}

/**
 * FR-M30-04. The vendor's answer is recorded against the vendor's case. There
 * is deliberately no parameter here that could mark the local control verified.
 */
export async function recordResolution(c: Context, id: string, input: unknown) {
  const value = S.SupportResolution.parse(input);
  const scope = scopeValues(c.actor);
  const existing = requireOne((await c.tx.query(`SELECT * FROM app.support_cases WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  if (existing.state === 'CLOSED') throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'state', code: 'case_already_closed' }]);
  const row = requireOne((await c.tx.query(
    `UPDATE app.support_cases SET vendor_case_state=$5,vendor_case_reference=$6,resolution_kind=$7,resolution_reference=$8,state=$9
     WHERE ${predicate} AND id=$4 RETURNING *`,
    [...scope, id, value.vendor_case_state, value.vendor_case_reference, value.kind, value.reference,
      value.vendor_case_state === 'VENDOR_CLOSED' ? 'CLOSED' : 'AWAITING_CUSTOMER'])).rows);
  await audit(c, 'support_case.resolution', id);
  return standing(c, row);
}

// --- canaries ----------------------------------------------------------------

export async function registerCanary(c: Context, input: unknown) {
  const value = S.CanaryRegister.parse(input);
  const scope = scopeValues(c.actor);
  const id = randomUUID();
  const tokenDigest = digest(value.token);
  const exists = await c.tx.query(`SELECT 1 FROM app.support_canaries WHERE ${predicate} AND token_digest=$4`, [...scope, tokenDigest]);
  if (exists.rowCount) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'token', code: 'already_registered' }]);
  const row = requireOne((await c.tx.query(
    `INSERT INTO app.support_canaries(tenant_id,legal_entity_id,environment_id,id,token,token_digest,note,registered_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...scope, id, value.token, tokenDigest, value.note, c.actor.actor_id])).rows);
  await audit(c, 'support_canary.register', id);
  return canary(row);
}

type CanaryRow = { id: string; token_digest: string; note: string; registered_at: Date; registered_by: string };
const canary = (row: CanaryRow) => S.Canary.parse({
  id: row.id, token_digest: row.token_digest, note: row.note, registered_at: time(row.registered_at), registered_by: row.registered_by,
});

export async function canaryList(c: Context, page: Page) {
  const rows = await c.tx.query(`SELECT * FROM app.support_canaries WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,
    [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(rows.rows.map(canary), page);
}

// --- report generation ---------------------------------------------------------

async function count(c: Context, sql: string, extra: unknown[] = []) {
  const result = await c.tx.query(sql, [...scopeValues(c.actor), ...extra]);
  return Number(result.rows[0]?.n ?? 0);
}

/**
 * FR-M30-01. Assembled from the closed vocabulary only. Every observation is a
 * code and a count taken from local state; nothing here reads a log, a message
 * body, a principal reference or a free-text field.
 */
async function assembleReport(c: Context, row: CaseRow, installationId: string) {
  const scope = scopeValues(c.actor);
  const observations: S.DiagnosticObservationValue[] = [];
  const add = async (code: string, sql: string) => {
    const result = await c.tx.query(sql, scope);
    const found = result.rows[0];
    if (!found || Number(found.n) === 0) return;
    observations.push(S.DiagnosticObservation.parse({
      code, occurrences: Number(found.n),
      first_seen_at: time(found.first as Date), last_seen_at: time(found.last as Date),
    }));
  };
  await add('WORKFLOW_NEEDS_ATTENTION', `SELECT count(*)::int AS n,min(accepted_at) AS first,max(updated_at) AS last FROM app.workflows WHERE ${predicate} AND state='NEEDS_ATTENTION'`);
  await add('STALE_OBSERVATION_BACKLOG', `SELECT count(*)::int AS n,min(detected_at) AS first,max(last_seen_at) AS last FROM app.coverage_gaps WHERE ${predicate} AND source='STALE_OBSERVATION' AND state IN ('OPEN','IN_PROGRESS')`);
  await add('OPEN_CRITICAL_GAP', `SELECT count(*)::int AS n,min(detected_at) AS first,max(last_seen_at) AS last FROM app.coverage_gaps WHERE ${predicate} AND severity='CRITICAL' AND state IN ('OPEN','IN_PROGRESS')`);
  await add('RIGHTS_EXECUTION_FAILED', `SELECT count(*)::int AS n,min(recorded_at) AS first,max(recorded_at) AS last FROM app.rights_request_outcomes WHERE ${predicate} AND result='FAILED'`);
  await add('NOTIFICATION_DELIVERY_FAILED', `SELECT count(*)::int AS n,min(recorded_at) AS first,max(recorded_at) AS last FROM app.notification_deliveries WHERE ${predicate} AND fact='FAILED'`);
  await add('RETENTION_DELETION_UNVERIFIED', `SELECT count(*)::int AS n,min(recorded_at) AS first,max(recorded_at) AS last FROM app.retention_outcomes WHERE ${predicate} AND result='NOT_VERIFIABLE'`);
  await add('UPDATE_STEP_INTERRUPTED', `SELECT count(*)::int AS n,min(approved_at) AS first,max(approved_at) AS last FROM app.update_plans WHERE ${predicate} AND state='INTERRUPTED'`);
  // A count and nothing else. The application role cannot read the ledger
  // itself; see 0026_schema_revision.
  const revision = await c.tx.query('SELECT revision AS n FROM app.schema_revision');
  return S.DiagnosticReport.parse({
    report_id: randomUUID(), generated_at: new Date().toISOString(),
    installation_reference: installationReference(installationId),
    product_version: S.PRODUCT_VERSION, contract_version: S.CONTRACT_VERSION, command_schema_version: S.COMMAND_SCHEMA_VERSION,
    deployment_profile: 'CUSTOMER_LOCAL_SYNTHETIC',
    schema_revision: Number(revision.rows[0].n),
    subject: row.subject,
    observations,
    counts: {
      systems_configured: await count(c, `SELECT count(*)::int AS n FROM app.systems WHERE ${predicate}`),
      open_gaps: await count(c, `SELECT count(*)::int AS n FROM app.coverage_gaps WHERE ${predicate} AND state IN ('OPEN','IN_PROGRESS')`),
      workflows_needing_attention: await count(c, `SELECT count(*)::int AS n FROM app.workflows WHERE ${predicate} AND state='NEEDS_ATTENTION'`),
      failed_notification_deliveries: await count(c, `SELECT count(*)::int AS n FROM app.notification_deliveries WHERE ${predicate} AND fact='FAILED'`),
    },
  });
}

/**
 * The scan the schema should already make unnecessary. It runs over the exact
 * canonical bytes that would be transferred, so it reaches every field including
 * ones added later, and a hit refuses the generation rather than redacting it:
 * a report nobody can explain is not a report worth sending.
 */
export function scanForForbiddenContent(payload: unknown, canaries: { token: string; note: string }[]) {
  const bytes = canonicalJson(payload);
  return canaries.filter(item => bytes.includes(item.token)).map(item => item.note);
}

export async function generateDiagnostic(c: Context, id: string, installationId: string) {
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.support_cases WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  if (row.state === 'CLOSED') throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'state', code: 'case_already_closed' }]);
  const report = await assembleReport(c, row, installationId);
  const canaries = (await c.tx.query(`SELECT token,note FROM app.support_canaries WHERE ${predicate}`, scope)).rows as { token: string; note: string }[];
  const findings = scanForForbiddenContent(report, canaries);
  // Refused, and named: the operator is told which registered canary matched,
  // because "something was wrong" is not something anybody can act on.
  if (findings.length) throw new AccessError(409, 'VALIDATION_ERROR', findings.slice(0, 4).map(note => ({ field: 'report', code: `forbidden_content:${note}`.slice(0, 64) })));
  // A new draft supersedes the previous one, so an approval that named the old
  // payload cannot be used to transfer the new one.
  await c.tx.query(`UPDATE app.diagnostic_drafts SET superseded=true WHERE ${predicate} AND case_id=$4 AND NOT superseded`, [...scope, id]);
  const draftId = randomUUID();
  const inserted = requireOne((await c.tx.query(
    `INSERT INTO app.diagnostic_drafts(tenant_id,legal_entity_id,environment_id,id,case_id,payload,payload_digest,canaries_checked,generated_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [...scope, draftId, id, report, digest(report), canaries.length, c.actor.actor_id])).rows);
  await audit(c, 'diagnostic.generate', draftId);
  return draft(inserted);
}

type DraftRow = { id: string; case_id: string; payload: unknown; payload_digest: string; canaries_checked: number; superseded: boolean; generated_at: Date; generated_by: string };
const draft = (row: DraftRow) => S.DiagnosticDraft.parse({
  id: row.id, case_id: row.case_id, report: row.payload, payload_digest: row.payload_digest,
  generated_at: time(row.generated_at), generated_by: row.generated_by, superseded: row.superseded,
  forbidden_content_scan: { ran: true, canaries_checked: row.canaries_checked, findings: 0 },
});

// --- approval and transfer -------------------------------------------------------

/**
 * FR-M30-02. The approver names the digest they previewed. If the stored payload
 * has a different digest the approval is refused, not reconciled, and the
 * database refuses it a second time independently.
 */
export async function approveDiagnostic(c: Context, id: string, input: unknown) {
  const value = S.DiagnosticApprovalCreate.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.diagnostic_drafts WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  if (row.superseded) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'draft_id', code: 'superseded_draft' }]);
  if (row.payload_digest !== value.approved_digest) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'approved_digest', code: 'payload_changed_since_preview' }]);
  const existing = await c.tx.query(`SELECT 1 FROM app.diagnostic_approvals WHERE ${predicate} AND draft_id=$4`, [...scope, id]);
  if (existing.rowCount) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'draft_id', code: 'already_approved' }]);
  const approvalId = randomUUID();
  const inserted = requireOne((await c.tx.query(
    `INSERT INTO app.diagnostic_approvals(tenant_id,legal_entity_id,environment_id,id,draft_id,approved_digest,destination,purpose,retention_days,approved_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [...scope, approvalId, id, value.approved_digest, value.destination, value.purpose, value.retention_days, c.actor.actor_id])).rows);
  await audit(c, 'diagnostic.approve', approvalId);
  return S.DiagnosticApproval.parse({
    id: inserted.id, draft_id: inserted.draft_id, approved_digest: inserted.approved_digest,
    destination: inserted.destination, purpose: inserted.purpose, retention_days: inserted.retention_days,
    approved_at: time(inserted.approved_at), approved_by: inserted.approved_by,
    authorises_generation: false,
    limits: [
      'This approval covers one payload that already exists. It cannot cause another to be generated.',
      'A changed report is a new payload and needs its own approval.',
      `The destination and purpose recorded here are the only ones this approval covers, for ${value.retention_days} days.`,
    ],
  });
}

/** FR-M30-02 again, at the moment of transfer: the approved digest is
 *  revalidated against the stored draft before anything is recorded. */
export async function recordTransfer(c: Context, id: string, input: unknown) {
  const value = S.TransferRecord.parse(input);
  const scope = scopeValues(c.actor);
  const approval = requireOne((await c.tx.query(`SELECT * FROM app.diagnostic_approvals WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  const source = requireOne((await c.tx.query(`SELECT payload_digest,superseded FROM app.diagnostic_drafts WHERE ${predicate} AND id=$4`, [...scope, approval.draft_id])).rows);
  if (source.payload_digest !== approval.approved_digest) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'approval_id', code: 'payload_changed_since_approval' }]);
  if (source.superseded) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'approval_id', code: 'superseded_draft' }]);
  const transferId = randomUUID();
  const row = requireOne((await c.tx.query(
    `INSERT INTO app.diagnostic_transfers(tenant_id,legal_entity_id,environment_id,id,approval_id,digest_at_transfer,method,outcome,rejection_code,evidence_reference,note,recorded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [...scope, transferId, id, approval.approved_digest, value.method, value.outcome, value.rejection_code, value.evidence_reference, value.note, c.actor.actor_id])).rows);
  await c.tx.query(`UPDATE app.support_cases SET state='AWAITING_VENDOR',vendor_case_state='SUBMITTED'
     WHERE ${predicate} AND id=(SELECT case_id FROM app.diagnostic_drafts WHERE ${predicate} AND id=$4) AND state='OPEN'`,
  [...scope, approval.draft_id]);
  await audit(c, 'diagnostic.transfer', transferId);
  return S.DiagnosticTransfer.parse({
    id: row.id, approval_id: row.approval_id, digest_at_transfer: row.digest_at_transfer,
    method: row.method, outcome: row.outcome, rejection_code: row.rejection_code,
    evidence_reference: row.evidence_reference, note: row.note,
    recorded_at: time(row.recorded_at), recorded_by: row.recorded_by,
    transported_by_orvia: false,
  });
}

// --- ingress validation ------------------------------------------------------------

/**
 * FR-M30-03. The check a vendor ingress would run, available locally so a
 * customer learns whether a payload would be refused before they carry it
 * anywhere. Pure, so it is unit-testable without a database.
 */
export function validateSubmission(body: Buffer, canaries: { token: string }[]): { accepted: boolean; rejection_code: string | null } {
  const reject = (rejection_code: string) => ({ accepted: false, rejection_code });
  if (body.byteLength > MAXIMUM_SUBMISSION_BYTES) return reject('OVERSIZED');
  const text = body.toString('utf8');
  for (const item of canaries) if (text.includes(item.token)) return reject('FORBIDDEN_CONTENT');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return reject('MALFORMED_JSON'); }
  const result = S.DiagnosticReport.safeParse(parsed);
  if (result.success) return { accepted: true, rejection_code: null };
  // An unrecognised key is reported as exactly that, because it is the failure
  // that means somebody sent more than the schema allows.
  return reject(result.error.issues.some(issue => issue.code === 'unrecognized_keys') ? 'UNKNOWN_FIELD' : 'SCHEMA_MISMATCH');
}

export async function validateIngressSubmission(c: Context, input: unknown) {
  const value = S.IngressSubmission.parse(input);
  const scope = scopeValues(c.actor);
  const body = Buffer.from(value.body_base64, 'base64');
  const known = await c.tx.query(`SELECT 1 FROM app.support_cases WHERE ${predicate} AND vendor_case_reference=$4`, [...scope, value.case_reference]);
  const canaries = (await c.tx.query(`SELECT token FROM app.support_canaries WHERE ${predicate}`, scope)).rows as { token: string }[];
  const outcome = known.rowCount ? validateSubmission(body, canaries) : { accepted: false, rejection_code: 'UNKNOWN_CASE_REFERENCE' };
  const id = randomUUID();
  // Only the size and the reason are written. There is no column for the body,
  // so a rejected submission cannot be retained even by a future mistake.
  const row = requireOne((await c.tx.query(
    `INSERT INTO app.support_ingress_validations(tenant_id,legal_entity_id,environment_id,id,accepted,rejection_code,byte_length,validated_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...scope, id, outcome.accepted, outcome.rejection_code, body.byteLength, c.actor.actor_id])).rows);
  await audit(c, 'support_ingress.validate', id);
  return S.IngressValidation.parse({
    validated_at: time(row.validated_at), accepted: row.accepted, rejection_code: row.rejection_code,
    byte_length: row.byte_length, body_persisted: false,
    limits: [
      'The submitted body is never stored. Only its size and the reason it was refused are kept.',
      'This is the check a vendor ingress would run. Running it here does not transfer anything.',
      `A submission above ${MAXIMUM_SUBMISSION_BYTES} bytes is refused without being parsed.`,
    ],
  });
}
