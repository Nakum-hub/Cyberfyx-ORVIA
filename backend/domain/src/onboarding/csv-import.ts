import type * as O from '../../../../shared/contracts/src/operations.ts';
import { predicate, scopeValues, type Context } from '../shared/transaction.ts';
import { createRequest } from '../rights/rights.ts';

/**
 * CSV imports for data staff export from their own systems (owner request 2026-10-03): a manual alternative to, and a
 * cross-check of, what the organisation's website or app sends automatically. Two formats are recognised by their header
 * row, in any column order and case:
 *
 *   Consent export        customer_reference, system, activity, decision [, email, occurred_at, evidence]
 *                         one row per consent event. Rows are grouped per person into existing-data rows, so on approval
 *                         each person lands in Data Principals and each event on their consent record in Consent records,
 *                         next to anything the website already sent for them (with its own provenance).
 *   Privacy requests      email, name, right_type, description [, customer_reference, received_at]
 *                         one row per request. On approval each becomes a privacy request recorded by staff.
 *
 * System and activity are given by their registered names, never by internal identifiers, so an ordinary export can be
 * used. Names are resolved when the file is staged, and the reviewer sees exactly which rows will be applied and which
 * cannot be, and why, before approving. Nothing is guessed: an unknown name, decision or right is reported, not mapped.
 */
export type CsvKind = 'CONSENT_EXPORT' | 'PRIVACY_REQUESTS';
type Line = { line: number; values: Record<string, string> };
export type CsvDetection = { kind: CsvKind; lines: Line[] };

const CONSENT_REQUIRED = ['customer_reference', 'system', 'activity', 'decision'];
const REQUESTS_REQUIRED = ['email', 'name', 'right_type', 'description'];
const MAX_ROWS = 5000;

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF. Returns rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

/** The CSV formats ORVIA reads, by header. Null when the header is neither (the file is then kept as a document). */
export function detectCsv(text: string): CsvDetection | { error: string } | null {
  const rows = parseCsv(text);
  if (!rows.length) return null;
  const header = rows[0]!.map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  const has = (cols: string[]) => cols.every(c => header.includes(c));
  const kind: CsvKind | null = has(CONSENT_REQUIRED) ? 'CONSENT_EXPORT' : has(REQUESTS_REQUIRED) ? 'PRIVACY_REQUESTS' : null;
  if (!kind) return null;
  if (rows.length - 1 > MAX_ROWS) return { error: `More than ${MAX_ROWS} rows; split the export into smaller files.` };
  const lines = rows.slice(1).map((cells, i) => ({ line: i + 2, values: Object.fromEntries(header.map((h, j) => [h, (cells[j] ?? '').trim()])) }));
  if (!lines.length) return { error: 'The file has a header but no rows.' };
  return { kind, lines };
}

const DECISION: Record<string, O.EstateRowValue['consent'][number]['event']> = {
  granted: 'GRANTED', given: 'GRANTED', yes: 'GRANTED', 'opt-in': 'GRANTED', opt_in: 'GRANTED', opted_in: 'GRANTED', consented: 'GRANTED',
  withdrawn: 'WITHDRAWN', withdraw: 'WITHDRAWN', 'opt-out': 'WITHDRAWN', opt_out: 'WITHDRAWN', opted_out: 'WITHDRAWN', revoked: 'WITHDRAWN',
  declined: 'DECLINED', no: 'DECLINED', refused: 'DECLINED',
};
const RIGHT: Record<string, string> = { access: 'ACCESS', correction: 'CORRECTION', correct: 'CORRECTION', erasure: 'ERASURE', erase: 'ERASURE', delete: 'ERASURE', deletion: 'ERASURE', grievance: 'GRIEVANCE', complaint: 'GRIEVANCE', nomination: 'NOMINATION', nominate: 'NOMINATION' };
const REF = /^[A-Za-z0-9_.:-]{1,120}$/;
const iso = (v: string) => { if (!v) return null; const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : undefined; };

export type Resolution<T> = { apply: T[]; skipped: { line: number; reason: string }[]; summary: string };

/** Consent export: names to registered systems and activities; events grouped per person into existing-data rows. */
export async function resolveConsentExport(c: Context, lines: Line[], fileName: string): Promise<Resolution<O.EstateRowValue>> {
  const s = scopeValues(c.actor);
  const systems = new Map<string, string>(); const activities = new Map<string, string>();
  for (const r of (await c.tx.query(`SELECT id, document->>'name' AS name FROM app.systems WHERE ${predicate}`, s)).rows) if (r.name) systems.set(String(r.name).toLowerCase(), r.id);
  for (const r of (await c.tx.query(`SELECT id, name FROM app.registry_activities WHERE ${predicate} AND status='ACTIVE'`, s)).rows) activities.set(String(r.name).toLowerCase(), r.id);
  const skipped: Resolution<O.EstateRowValue>['skipped'] = [];
  const people = new Map<string, O.EstateRowValue>();
  for (const { line, values: v } of lines) {
    const ref = v.customer_reference ?? ''; const system = systems.get((v.system ?? '').toLowerCase()); const activity = activities.get((v.activity ?? '').toLowerCase());
    const event = DECISION[(v.decision ?? '').toLowerCase()]; const at = iso(v.occurred_at ?? '');
    const reason = !REF.test(ref) ? `customer_reference "${ref.slice(0, 40)}" is empty or has characters other than letters, digits and . _ : -`
      : !system ? `system "${(v.system ?? '').slice(0, 60)}" is not a registered system` : !activity ? `activity "${(v.activity ?? '').slice(0, 60)}" is not a registered processing activity`
      : !event ? `decision "${(v.decision ?? '').slice(0, 30)}" is not one of granted, withdrawn or declined` : at === undefined ? `occurred_at "${(v.occurred_at ?? '').slice(0, 40)}" is not a date` : null;
    if (reason) { skipped.push({ line, reason }); continue; }
    const key = `${system}:${ref}`;
    const person = people.get(key) ?? { row_key: `${ref}`.slice(0, 200), source_key: v.email ? v.email.toLowerCase().slice(0, 320) : null, references: [{ system_id: system!, target_reference: ref }], relationships: [], consent: [], notice_deliveries: [] };
    if (person.consent.length >= 20) { skipped.push({ line, reason: 'more than 20 consent events for one person in one file' }); continue; }
    person.consent.push({ activity_id: activity!, event: event!, occurred_at: at ?? null, evidence_state: v.evidence ? 'EVIDENCE_AVAILABLE' : 'EVIDENCE_MISSING',
      evidence_reference: v.evidence ? v.evidence.slice(0, 500) : null, source_reference: `${fileName.slice(0, 200)} line ${line}` });
    people.set(key, person);
  }
  const apply = [...people.values()];
  const events = apply.reduce((n, p) => n + p.consent.length, 0);
  return { apply, skipped, summary: `Consent export: ${events} event(s) for ${apply.length} person(s) will go to Data Principals and Consent records${skipped.length ? `; ${skipped.length} row(s) cannot be applied` : ''}.` };
}

type Request = { line: number; email: string; name: string; right: string; description: string };
/** Privacy requests export: each row checked; the person is found by email or recorded on approval. */
export function resolvePrivacyRequests(lines: Line[]): Resolution<Request> {
  const skipped: Resolution<Request>['skipped'] = []; const apply: Request[] = [];
  for (const { line, values: v } of lines) {
    const email = (v.email ?? '').toLowerCase(); const right = RIGHT[(v.right_type ?? '').toLowerCase()];
    const received = v.received_at ? iso(v.received_at) : null;
    const description = `${v.description ?? ''}${received ? ` (received ${received.slice(0, 10)}, recorded from an imported file)` : ' (recorded from an imported file)'}`;
    const reason = !/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,63}$/.test(email) ? `email "${email.slice(0, 60)}" is not an email address` : !(v.name ?? '').trim() ? 'name is empty'
      : !right ? `right_type "${(v.right_type ?? '').slice(0, 30)}" is not one of access, correction, erasure, grievance or nomination`
      : (v.description ?? '').trim().length < 10 ? 'description is shorter than 10 characters' : received === undefined ? `received_at "${(v.received_at ?? '').slice(0, 40)}" is not a date` : null;
    if (reason) { skipped.push({ line, reason }); continue; }
    apply.push({ line, email, name: v.name!.trim().slice(0, 100), right: right!, description: description.slice(0, 2000) });
  }
  return { apply, skipped, summary: `Privacy requests: ${apply.length} request(s) will go to Privacy requests${skipped.length ? `; ${skipped.length} row(s) cannot be applied` : ''}.` };
}

/** On approval: each request recorded by staff; the requester found by email, or recorded (the synthetic-only rule still applies). */
export async function applyPrivacyRequests(c: Context, requests: Request[]) {
  const s = scopeValues(c.actor); const created: string[] = []; const refused: { line: number; reason: string }[] = [];
  for (const r of requests) {
    await c.tx.query('SAVEPOINT csv_request');
    try {
      let principal = (await c.tx.query(`SELECT id FROM app.principal_references WHERE ${predicate} AND email=$4`, [...s, r.email])).rows[0]?.id as string | undefined;
      if (!principal) {
        principal = crypto.randomUUID();
        await c.tx.query('INSERT INTO app.principal_references(tenant_id,legal_entity_id,environment_id,id,display_name,email) VALUES($1,$2,$3,$4,$5,$6)', [...s, principal, r.name, r.email]);
      }
      const request = await createRequest(c, { right_type: r.right, principal_id: principal, submitted_channel: 'RECORDED_MANUAL_INTAKE', mandate_id: null, description: r.description }) as { id: string };
      created.push(request.id);
      await c.tx.query('RELEASE SAVEPOINT csv_request');
    } catch (error) {
      await c.tx.query('ROLLBACK TO SAVEPOINT csv_request');
      const synthetic = (error as { code?: string; constraint?: string }).code === '23514';
      refused.push({ line: r.line, reason: synthetic ? 'this installation accepts synthetic people only, so this requester could not be recorded' : 'the request was refused by the privacy requests checks' });
    }
  }
  return { created, refused };
}

export const reviewDetail = (r: Resolution<unknown>) =>
  `${r.summary}${r.skipped.length ? ` Not applied: ${r.skipped.slice(0, 3).map(x => `line ${x.line}: ${x.reason}`).join('; ')}${r.skipped.length > 3 ? `; and ${r.skipped.length - 3} more` : ''}.` : ''}`.slice(0, 500);
