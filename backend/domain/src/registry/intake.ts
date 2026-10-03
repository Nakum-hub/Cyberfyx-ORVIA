import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';
import { appendConsentEvent, createConsentRecord } from './consent.ts';

/**
 * Organisation website/app intake and the optional Privacy Centre (revision 1.7).
 *
 * Rule 14(1) of the DPDP Rules, 2025 requires the organisation to publish, on its own website or app, the means by which a
 * Data Principal may make a request. So the organisation's customers use the organisation's website or app, not a separate
 * ORVIA site. That application's server sends what the customer did to ORVIA with an intake key, and the work lands in the
 * Workspace like any other.
 *
 * The key can only add and read its own submissions. Applying a submission to the registry is done later by the operations
 * runner, so a leaked key cannot read or change any registry record. A submission that cannot be applied is never dropped:
 * it waits for staff with the reason. A receipt says that ORVIA received the submission, never that anything downstream changed.
 */

export const intakeKeyDigest = (key: string) => createHash('sha256').update(key, 'utf8').digest('hex');

type ClientRow = { id: string; name: string; system_id: string; system_name: string | null; authenticates_customers: boolean; accepts_consent: boolean; accepts_rights: boolean;
  created_at: Date; revoked_at: Date | null; revocation_reason: string | null; last_used_at: Date | null; submissions: number };
const CLIENT = `SELECT c.*, s.document->>'name' AS system_name,
  (SELECT count(*)::int FROM app.intake_submissions x WHERE x.tenant_id=c.tenant_id AND x.legal_entity_id=c.legal_entity_id AND x.environment_id=c.environment_id AND x.client_id=c.id) AS submissions
  FROM app.intake_clients c LEFT JOIN app.systems s ON s.tenant_id=c.tenant_id AND s.legal_entity_id=c.legal_entity_id AND s.environment_id=c.environment_id AND s.id=c.system_id
  WHERE c.tenant_id=$1 AND c.legal_entity_id=$2 AND c.environment_id=$3`;
const clientView = (r: ClientRow) => R.IntakeClient.parse({ id: r.id, name: r.name, system_id: r.system_id, system_name: r.system_name ?? 'Unnamed system',
  authenticates_customers: r.authenticates_customers, accepts_consent: r.accepts_consent, accepts_rights: r.accepts_rights, created_at: iso(r.created_at),
  revoked_at: iso(r.revoked_at), revocation_reason: r.revocation_reason, last_used_at: iso(r.last_used_at), submissions: r.submissions });
async function client(c: Context, id: string) {
  const row = (await c.tx.query(`${CLIENT} AND c.id=$4`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  return clientView(row);
}

export async function intakeClientList(c: Context, page: Page) {
  const rows = (await c.tx.query(`${CLIENT} AND ($4::uuid IS NULL OR (c.created_at,c.id) < (SELECT created_at,id FROM app.intake_clients WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4)) ORDER BY c.created_at DESC,c.id DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const p = pageOf(rows, page.limit, r => r.id);
  return { items: p.items.map(clientView), next_cursor: p.next_cursor };
}

export async function createIntakeClient(c: Context, input: unknown) {
  const value = R.IntakeClientCreate.parse(input);
  if (!(await c.tx.query(`SELECT 1 FROM app.systems WHERE ${predicate} AND id=$4`, [...scope(c), value.system_id])).rowCount) refuse(404, 'system_id', 'not_found');
  const key = randomBytes(32).toString('hex');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.intake_clients(tenant_id,legal_entity_id,environment_id,id,name,system_id,authenticates_customers,accepts_consent,accepts_rights,token_digest,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [...scope(c), id, value.name, value.system_id, value.authenticates_customers, value.accepts_consent, value.accepts_rights, intakeKeyDigest(key), c.actor.actor_id]);
  await audit(c, 'intake_client.create', id);
  return R.IntakeClientCreated.parse({ client: await client(c, id), key, shown_once: true });
}

export async function revokeIntakeClient(c: Context, id: string, input: unknown) {
  const value = R.IntakeClientRevoke.parse(input);
  const row = (await c.tx.query(`SELECT revoked_at FROM app.intake_clients WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.revoked_at) refuse(409, 'id', 'already_revoked');
  await c.tx.query(`UPDATE app.intake_clients SET revoked_at=clock_timestamp(),revoked_by=$5,revocation_reason=$6 WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id, value.reason]);
  await audit(c, 'intake_client.revoke', id);
  return client(c, id);
}

type SubmissionRow = { id: string; client_id: string; client_name: string; kind: 'CONSENT' | 'RIGHTS'; target_reference: string; payload: Record<string, unknown>; status: string;
  outcome_reason: string | null; consent_record_id: string | null; rights_request_id: string | null; received_at: Date; processed_at: Date | null; handled_note: string | null; handled_at: Date | null; activity_name?: string | null };
// A consent change is described by the activity's registered name, so staff read "Consent withdrawn: Promotional email and SMS".
const summary = (r: Pick<SubmissionRow, 'kind' | 'payload' | 'activity_name'>) => r.kind === 'CONSENT'
  ? `Consent ${r.payload.decision === 'WITHDRAWN' ? 'withdrawn' : 'given'}: ${r.activity_name ?? `activity ${String(r.payload.activity_id)}`}`
  : `${String(r.payload.right_type).charAt(0)}${String(r.payload.right_type).slice(1).toLowerCase()} request`;
const submissionView = (r: SubmissionRow) => R.IntakeSubmission.parse({ id: r.id, client_id: r.client_id, client_name: r.client_name, kind: r.kind, customer_reference: r.target_reference,
  summary: summary(r), status: r.status, outcome_reason: r.outcome_reason, consent_record_id: r.consent_record_id, rights_request_id: r.rights_request_id,
  received_at: iso(r.received_at), processed_at: iso(r.processed_at), handled_note: r.handled_note, handled_at: iso(r.handled_at) });
const SUBMISSION = `SELECT s.*, c.name AS client_name, a.name AS activity_name FROM app.intake_submissions s JOIN app.intake_clients c ON c.tenant_id=s.tenant_id AND c.legal_entity_id=s.legal_entity_id AND c.environment_id=s.environment_id AND c.id=s.client_id
  LEFT JOIN app.registry_activities a ON a.tenant_id=s.tenant_id AND a.legal_entity_id=s.legal_entity_id AND a.environment_id=s.environment_id AND s.kind='CONSENT' AND a.id=(s.payload->>'activity_id')::uuid
  WHERE s.tenant_id=$1 AND s.legal_entity_id=$2 AND s.environment_id=$3`;

export async function intakeSubmissionList(c: Context, page: Page, query: unknown) {
  const q = R.IntakeSubmissionQuery.parse(query ?? {});
  // Newest first; the cursor is the last row's id.
  const rows = (await c.tx.query(`${SUBMISSION} AND ($4::text IS NULL OR s.status=$4)
      AND ($5::uuid IS NULL OR (s.received_at,s.id) < (SELECT received_at,id FROM app.intake_submissions WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$5))
    ORDER BY s.received_at DESC, s.id DESC LIMIT $6`, [...scope(c), q.status ?? null, page.cursor, page.limit + 1])).rows;
  const p = pageOf(rows, page.limit, r => r.id);
  return { items: p.items.map(submissionView), next_cursor: p.next_cursor };
}

export async function handleIntakeSubmission(c: Context, id: string, input: unknown) {
  const value = R.IntakeSubmissionHandle.parse(input);
  const row = (await c.tx.query(`SELECT status FROM app.intake_submissions WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.status !== 'NEEDS_STAFF') refuse(409, 'id', 'only_a_submission_waiting_for_staff_can_be_marked_handled');
  await c.tx.query(`UPDATE app.intake_submissions SET status='HANDLED',handled_by=$5,handled_note=$6,handled_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id, value.note]);
  await audit(c, 'intake_submission.handled', id);
  return submissionView((await c.tx.query(`${SUBMISSION} AND s.id=$4`, [...scope(c), id])).rows[0]);
}

export async function privacyCentreSetting(c: Context) {
  const row = (await c.tx.query(`SELECT enabled,reason,changed_at,changed_by FROM app.privacy_centre_settings WHERE ${predicate} ORDER BY changed_at DESC,id DESC LIMIT 1`, scope(c))).rows[0];
  const accounts = Number((await c.tx.query(`SELECT count(*) n FROM app.principal_references WHERE ${predicate}`, scope(c)).catch(() => ({ rows: [{ n: 0 }] }))).rows[0].n);
  return R.PrivacyCentreSetting.parse({ enabled: row?.enabled ?? false, reason: row?.reason ?? null, changed_at: iso(row?.changed_at), changed_by: row?.changed_by ?? null, customer_accounts: accounts });
}

export async function changePrivacyCentre(c: Context, input: unknown) {
  const value = R.PrivacyCentreChange.parse(input);
  const current = await privacyCentreSetting(c);
  if (current.enabled === value.enabled) refuse(409, 'enabled', value.enabled ? 'already_on' : 'already_off');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.privacy_centre_settings(tenant_id,legal_entity_id,environment_id,id,enabled,reason,changed_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [...scope(c), id, value.enabled, value.reason, c.actor.actor_id]);
  await audit(c, value.enabled ? 'privacy_centre.enabled' : 'privacy_centre.disabled', id);
  return privacyCentreSetting(c);
}

// ---------------------------------------------------------------------------------------------------------------------------
// The application's side: runs as the key's own INTAKE actor. It may add and read its own submissions and nothing else.
// ---------------------------------------------------------------------------------------------------------------------------

async function receipt(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT * FROM app.intake_submissions WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] as SubmissionRow | undefined;
  if (!row) throw new AccessError(404, 'NOT_FOUND');
  const result = (await c.tx.query('SELECT consent_status, request_state FROM app.intake_result($1)', [id])).rows[0] ?? {};
  return R.IntakeReceipt.parse({ submission_id: row.id, kind: row.kind, status: row.status, received_at: iso(row.received_at), processed_at: iso(row.processed_at),
    outcome_reason: row.outcome_reason,
    consent: row.consent_record_id && result.consent_status ? { record_id: row.consent_record_id, current_status: result.consent_status } : null,
    rights_request: row.rights_request_id && result.request_state ? { id: row.rights_request_id, state: result.request_state } : null,
    receipt_is_not_completion: true });
}

export async function submitIntake(c: Context, kind: 'CONSENT' | 'RIGHTS', input: unknown, key: string, allowed: { accepts_consent: boolean; accepts_rights: boolean }) {
  if (kind === 'CONSENT' ? !allowed.accepts_consent : !allowed.accepts_rights) throw new AccessError(403, 'FORBIDDEN', [{ field: 'kind', code: 'this_key_does_not_accept_this_kind' }]);
  const value = kind === 'CONSENT' ? R.IntakeConsentSubmit.parse(input) : R.IntakeRightsSubmit.parse(input);
  const digest = createHash('sha256').update(JSON.stringify([kind, value])).digest('hex');
  const clientId = c.actor.actor_id;
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify(['intake', clientId, key])]);
  const earlier = (await c.tx.query(`SELECT id,request_digest FROM app.intake_submissions WHERE ${predicate} AND client_id=$4 AND idempotency_key=$5`, [...scope(c), clientId, key])).rows[0];
  if (earlier) {
    if (earlier.request_digest !== digest) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
    return receipt(c, earlier.id);
  }
  const id = randomUUID();
  const { customer_reference, ...payload } = value;
  await c.tx.query(`INSERT INTO app.intake_submissions(tenant_id,legal_entity_id,environment_id,id,client_id,kind,idempotency_key,request_digest,target_reference,payload)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [...scope(c), id, clientId, kind, key, digest, customer_reference, payload]);
  await c.tx.query(`UPDATE app.intake_clients SET last_used_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), clientId]);
  await audit(c, kind === 'CONSENT' ? 'intake.consent_received' : 'intake.rights_request_received', id);
  return receipt(c, id);
}

export async function intakeReceipt(c: Context, id: string) { return receipt(c, id); }

// ---------------------------------------------------------------------------------------------------------------------------
// The runner's side: applies received submissions under the local WORKER identity.
// ---------------------------------------------------------------------------------------------------------------------------

type Pending = { id: string; client_id: string; kind: 'CONSENT' | 'RIGHTS'; target_reference: string; payload: Record<string, unknown>; client_name: string; system_id: string; authenticates_customers: boolean };
type Outcome = { status: 'APPLIED' | 'NEEDS_STAFF'; reason: string | null; consent_record_id?: string | null; rights_request_id?: string | null };

/** The one Data Principal whose identifier in the key's application is this reference, or null. */
async function subjectFor(c: Context, systemId: string, reference: string) {
  const rows = (await c.tx.query(`SELECT r.subject_id, p.principal_id, p.status FROM app.data_principal_references r
      JOIN app.data_principals p ON p.tenant_id=r.tenant_id AND p.legal_entity_id=r.legal_entity_id AND p.environment_id=r.environment_id AND p.id=r.subject_id
    WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.system_id=$4 AND r.target_reference=$5`, [...scope(c), systemId, reference])).rows;
  return rows[0] as { subject_id: string; principal_id: string | null; status: string } | undefined;
}

async function applyConsent(c: Context, s: Pending): Promise<Outcome> {
  const p = s.payload as { activity_id: string; decision: 'GRANTED' | 'WITHDRAWN'; occurred_at: string; notice_version_id: string | null; evidence_reference: string };
  const subject = await subjectFor(c, s.system_id, s.target_reference);
  if (!subject) return { status: 'NEEDS_STAFF', reason: 'No Data Principal in ORVIA has this customer identifier in the application this key belongs to. Record or import the person, then record the consent change.' };
  if (subject.status === 'MERGED') return { status: 'NEEDS_STAFF', reason: 'This customer identifier belongs to a Data Principal that was merged into another. Record the consent change on the surviving record.' };
  const records = (await c.tx.query(`SELECT id FROM app.consent_records WHERE ${predicate} AND subject_id=$4 AND activity_id=$5 ORDER BY id LIMIT 2`, [...scope(c), subject.subject_id, p.activity_id])).rows;
  if (records.length > 1) return { status: 'NEEDS_STAFF', reason: 'This person has more than one consent record for this activity (one per relationship). Choose the right one and record the change there.' };
  const recordId = records[0]?.id as string | undefined
    ?? (await createConsentRecord(c, { subject_id: subject.subject_id, relationship_id: null, activity_id: p.activity_id, channel: 'ORGANISATION_APP', expiry_policy: null, v1_principal_id: null, v1_purpose_id: null })).id;
  await appendConsentEvent(c, recordId, { event: p.decision, occurred_at: p.occurred_at, evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: p.evidence_reference, notice_version_id: p.notice_version_id },
    'SOURCE_SYSTEM', { source: 'ORGANISATION_APP', intake_submission_id: s.id, intake_client_id: s.client_id, application: s.client_name });
  return { status: 'APPLIED', reason: null, consent_record_id: recordId };
}

async function applyRights(c: Context, s: Pending): Promise<Outcome> {
  const p = s.payload as { right_type: string; description: string; display_name: string; email: string };
  const subject = await subjectFor(c, s.system_id, s.target_reference);
  const email = p.email.toLowerCase();
  let principalId = subject?.principal_id ?? (await c.tx.query(`SELECT id FROM app.principal_references WHERE ${predicate} AND email=$4`, [...scope(c), email])).rows[0]?.id as string | undefined;
  if (!principalId) {
    principalId = randomUUID();
    try {
      await c.tx.query('SAVEPOINT intake_principal');
      await c.tx.query('INSERT INTO app.principal_references(tenant_id,legal_entity_id,environment_id,id,display_name,email) VALUES($1,$2,$3,$4,$5,$6)', [...scope(c), principalId, p.display_name, email]);
      await c.tx.query('RELEASE SAVEPOINT intake_principal');
    } catch (error) {
      await c.tx.query('ROLLBACK TO SAVEPOINT intake_principal');
      if ((error as { code?: string; constraint?: string }).code === '23514' && /email/.test((error as { constraint?: string }).constraint ?? '')) return { status: 'NEEDS_STAFF', reason: 'This installation accepts synthetic people only (its production installation is not yet qualified), so the requester could not be recorded. Record the request once real people can be recorded.' };
      throw error;
    }
  }
  // Identity is established only when the organisation stated that this application signs its customers in, and the
  // identifier matched exactly one Data Principal. Otherwise staff review identity as for any other request.
  const established = s.authenticates_customers && subject !== undefined;
  const basis = established
    ? `Sent by the organisation's application "${s.client_name}", which the organisation recorded as signing its customers in; the customer identifier matched one Data Principal.`
    : subject ? `Sent by the organisation's application "${s.client_name}", which is not recorded as signing its customers in. Identity needs staff review.`
      : `Sent by the organisation's application "${s.client_name}". The customer identifier matched no Data Principal in ORVIA. Identity needs staff review.`;
  const id = randomUUID();
  const document = { description: p.description, submitted_channel: 'ORGANISATION_APP', closure_note: null, unresolved_destinations: [], state: 'RECEIVED',
    identity_basis: basis, matched_reference_count: subject ? 1 : 0, intake_submission_id: s.id, intake_client_id: s.client_id };
  await c.tx.query(`INSERT INTO app.rights_requests(tenant_id,legal_entity_id,environment_id,id,right_type,principal_id,mandate_id,state,authority,document,identity,identity_grade)
    VALUES($1,$2,$3,$4,$5,$6,NULL,'RECEIVED','SELF',$7,$8,$9)`, [...scope(c), id, p.right_type, principalId, document, established ? 'ESTABLISHED' : 'NOT_ASSESSED', established ? 'EXACT' : null]);
  await c.tx.query(`INSERT INTO app.rights_request_events(tenant_id,legal_entity_id,environment_id,id,request_id,from_state,to_state,reason,actor_id)
    VALUES($1,$2,$3,$4,$5,NULL,'RECEIVED',$6,$7)`, [...scope(c), randomUUID(), id, `Received from the organisation's application "${s.client_name}" (intake).`, c.actor.actor_id]);
  await audit(c, 'rights_request.received_from_organisation_app', id);
  return { status: 'APPLIED', reason: null, rights_request_id: id };
}

/** Applies up to `limit` received submissions, oldest first, each isolated so one failure never blocks or loses another. */
export async function processIntake(c: Context, limit = 50) {
  const pending = (await c.tx.query(`SELECT s.id,s.client_id,s.kind,s.target_reference,s.payload,c.name AS client_name,c.system_id,c.authenticates_customers
      FROM app.intake_submissions s JOIN app.intake_clients c ON c.tenant_id=s.tenant_id AND c.legal_entity_id=s.legal_entity_id AND c.environment_id=s.environment_id AND c.id=s.client_id
    WHERE s.tenant_id=$1 AND s.legal_entity_id=$2 AND s.environment_id=$3 AND s.status='RECEIVED' ORDER BY s.received_at,s.id LIMIT $4 FOR UPDATE OF s SKIP LOCKED`, [...scope(c), limit])).rows as Pending[];
  const counts = { applied: 0, needs_staff: 0 };
  for (const s of pending) {
    let outcome: Outcome;
    await c.tx.query('SAVEPOINT intake_apply');
    try {
      outcome = s.kind === 'CONSENT' ? await applyConsent(c, s) : await applyRights(c, s);
      await c.tx.query('RELEASE SAVEPOINT intake_apply');
    } catch (error) {
      await c.tx.query('ROLLBACK TO SAVEPOINT intake_apply');
      const fields = error instanceof AccessError ? (error.fieldErrors ?? []).map(f => `${f.field}: ${f.code}`).join(', ') : '';
      outcome = { status: 'NEEDS_STAFF', reason: error instanceof AccessError
        ? `ORVIA could not apply this automatically (${fields || error.code}). Check the activity and the person, then record it in the Workspace.`
        : 'ORVIA could not apply this automatically because of an internal error. Record it in the Workspace.' };
    }
    await c.tx.query(`UPDATE app.intake_submissions SET status=$5,outcome_reason=$6,consent_record_id=$7,rights_request_id=$8,processed_at=clock_timestamp() WHERE ${predicate} AND id=$4`,
      [...scope(c), s.id, outcome.status, outcome.reason, outcome.consent_record_id ?? null, outcome.rights_request_id ?? null]);
    await audit(c, outcome.status === 'APPLIED' ? 'intake_submission.applied' : 'intake_submission.needs_staff', s.id);
    if (outcome.status === 'APPLIED') counts.applied++; else counts.needs_staff++;
  }
  return counts;
}
