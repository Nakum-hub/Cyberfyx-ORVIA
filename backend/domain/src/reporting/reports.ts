import * as S from '../../../../shared/contracts/src/index.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { predicate, scopeValues, type Context } from '../shared/transaction.ts';

/**
 * Reporting (§133): "Users should be able to export evidence: JSON, CSV where
 * appropriate, PDF reports, signed evidence packages. Exports themselves must
 * be audited."
 *
 * A report is a period, a scope and an ordered set of sections. Each section is
 * a table built from records this installation already keeps -- nothing is
 * computed here that is not computed somewhere else, because a report that
 * derived its own numbers would be a second source of truth that could disagree
 * with the screens.
 *
 * It is rendered print-ready and the operator saves it as PDF from the browser.
 * No PDF is generated server-side. That keeps the delivered lockfile unchanged,
 * keeps everything inside the customer's own installation, and avoids this
 * product having to promise that a binary it rendered faithfully represents the
 * records behind it.
 *
 * Two refusals shape the design, and both exist because of how a report is
 * actually used -- handed to a board, an auditor or a regulator by somebody who
 * did not assemble it:
 *
 *   - A report cannot present a flattering subset in silence. Every section this
 *     installation could have produced and did not is named on the cover, with
 *     whether it was not selected or withheld.
 *   - A section the reader may not see is reported as withheld, not dropped. A
 *     report that quietly shrinks to fit the permissions of whoever generated it
 *     misleads whoever is handed it, and they have no way to tell.
 */

/**
 * What each section reads, and therefore the authority it needs. A reader
 * holding `evidence.export` can ask for a report; whether a given section is in
 * it depends on whether they may read that section's data at all.
 */
const SECTION_CAPABILITY: Record<S.ReportSectionKindValue, string> = {
  PURPOSES_AND_NOTICES: 'configuration.read',
  CONSENT_DECISIONS: 'evidence.read',
  RIGHTS_REQUESTS: 'rights.read',
  DATA_INVENTORY: 'graph.read',
  COVERAGE_GAPS: 'coverage.read',
  PROCESSORS: 'processor.read',
  INCIDENTS_AND_INTIMATIONS: 'incident.read',
  AUDIT_TRAIL: 'audit.export',
  AUDIT_RETENTION: 'audit.read',
  OPERATIONAL_READINESS: 'health.read',
};

/** The order sections appear in when a caller does not choose one. It reads as
 *  an argument: what we process and why, what people decided, what they asked
 *  for, where the data is, what is not covered, who else touches it, what went
 *  wrong, and what we can show about all of it. */
const DEFAULT_ORDER: S.ReportSectionKindValue[] = [
  'PURPOSES_AND_NOTICES', 'CONSENT_DECISIONS', 'RIGHTS_REQUESTS', 'DATA_INVENTORY',
  'COVERAGE_GAPS', 'PROCESSORS', 'INCIDENTS_AND_INTIMATIONS', 'AUDIT_TRAIL',
  'AUDIT_RETENTION', 'OPERATIONAL_READINESS',
];

const REPORT_LIMITS = [
  'Every section is a table of what this installation recorded. None of it is an opinion about whether an obligation has been met, and there is no field in which this report could say that it had.',
  'Sections left out are named on the cover with why. A report assembled from a subset is still a report about a subset, and the reader is told which one.',
  'A section withheld for authority was not read. It is not empty, and it is not evidence that there was nothing to show.',
  'Figures are read when the report is generated. A record created after that moment appears the next time it is run.',
  'This product renders the report; the operator saves it as PDF from the browser. Nothing here produced or signed a binary file.',
  'A section above 2,000 rows is refused rather than silently shortened. Narrow the period where the section supports one; larger complete exports need a separate supported path.',
];

const text = (value: unknown) => (value === null || value === undefined ? '—' : String(value));
const when = (value: unknown) => (value ? new Date(value as string | Date).toISOString() : '—');

/** A period clause both halves of which are optional, as parameters. */
function window(from: string | undefined, to: string | undefined, column: string, next: number) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (from) { clauses.push(`AND ${column} >= $${next + values.length}`); values.push(from); }
  if (to) { clauses.push(`AND ${column} <= $${next + values.length}`); values.push(to); }
  return { sql: clauses.join(' '), values };
}

type Built = Omit<S.ReportSectionValue, 'kind'>;

export function requireCompleteSection<T>(rows: T[]): T[] {
  if (rows.length > 2000) throw new AccessError(400, 'VALIDATION_ERROR',
    [{ field: 'sections', code: 'report_section_above_print_limit' }]);
  return rows;
}

async function build(c: Context, kind: S.ReportSectionKindValue, from?: string, to?: string): Promise<Built> {
  const scope = scopeValues(c.actor);
  const q = async (sql: string, values: unknown[] = []) => requireCompleteSection((await c.tx.query(sql, [...scope, ...values])).rows);

  if (kind === 'PURPOSES_AND_NOTICES') {
    const rows = await q(
      `SELECT p.document->>'name' AS purpose, p.status,
              n.document->>'language' AS language, n.document->>'title' AS title,
              n.published_at, n.document->'data_categories' AS categories
         FROM app.purpose_versions p
         LEFT JOIN app.notice_versions n ON n.tenant_id=p.tenant_id AND n.legal_entity_id=p.legal_entity_id
          AND n.environment_id=p.environment_id AND n.purpose_id=p.id
        WHERE ${predicate.replaceAll('tenant_id', 'p.tenant_id').replaceAll('legal_entity_id', 'p.legal_entity_id').replaceAll('environment_id', 'p.environment_id')}
        ORDER BY p.document->>'name', n.published_at NULLS LAST LIMIT 2001`);
    return {
      heading: 'Purposes and published notices',
      covers: 'Every purpose this installation processes for, the notice version published against it, and the personal data that notice itemises.',
      columns: ['Purpose', 'Status', 'Notice', 'Language', 'Published', 'Personal data itemised'],
      rows: rows.map(r => [text(r.purpose), text(r.status), text(r.title), text(r.language), when(r.published_at),
        r.categories ? (r.categories as string[]).join(', ') : 'Not itemised — notice predates itemisation']),
      counted: `${rows.length} purpose-and-notice pairing(s) recorded in this scope.`,
      limits: [
        'A published notice is the exact version a person was shown. A notice showing no itemisation was published before this product recorded it, and its items were never captured rather than being empty.',
        'This lists what was published. It does not assess whether the wording of any notice is adequate.',
      ],
    };
  }

  if (kind === 'CONSENT_DECISIONS') {
    const w = window(from, to, 'e.accepted_at', 4);
    const rows = await q(
      `SELECT e.accepted_at, e.state, e.epoch, p.document->>'name' AS purpose
         FROM app.consent_events e
         JOIN app.purpose_versions p ON p.tenant_id=e.tenant_id AND p.legal_entity_id=e.legal_entity_id
          AND p.environment_id=e.environment_id AND p.id=e.purpose_id
        WHERE ${predicate.replaceAll('tenant_id', 'e.tenant_id').replaceAll('legal_entity_id', 'e.legal_entity_id').replaceAll('environment_id', 'e.environment_id')} ${w.sql}
        ORDER BY e.accepted_at DESC LIMIT 2001`, w.values);
    const granted = rows.filter(r => r.state === 'GRANTED').length;
    return {
      heading: 'Consent decisions',
      covers: 'Every consent decision a data principal made in the period, as recorded at the moment it was accepted.',
      columns: ['Accepted', 'Purpose', 'Decision', 'Epoch'],
      rows: rows.map(r => [when(r.accepted_at), text(r.purpose), text(r.state), text(r.epoch)]),
      counted: `${rows.length} decision(s) in the period: ${granted} grant(s) and ${rows.length - granted} withdrawal(s). Principals are counted by decision, not by person.`,
      limits: [
        'A decision is recorded once and never edited. A later decision supersedes an earlier one without removing it, so the same person may appear more than once.',
        'Identifiers of the people who decided are deliberately not printed. This is a record of decisions, not a list of individuals.',
      ],
    };
  }

  if (kind === 'RIGHTS_REQUESTS') {
    const w = window(from, to, 'received_at', 4);
    const rows = await q(
      `SELECT received_at, right_type, state, updated_at FROM app.rights_requests
        WHERE ${predicate} ${w.sql} ORDER BY received_at DESC LIMIT 2001`, w.values);
    const open = rows.filter(r => r.state !== 'CLOSED').length;
    return {
      heading: 'Rights requests',
      covers: 'Requests data principals made under the rights this Act provides, and where each one stands.',
      columns: ['Received', 'Right', 'State', 'Last moved'],
      rows: rows.map(r => [when(r.received_at), text(r.right_type), text(r.state), when(r.updated_at)]),
      counted: `${rows.length} request(s) in the period, of which ${open} are still open.`,
      limits: [
        'The rights listed are the ones this Act provides: access, correction, erasure, grievance and nomination. A right from another regime would not appear because this product does not record one.',
        'A response window is whatever the organisation configured with its stated source. This product ships no statutory deadline of its own.',
      ],
    };
  }

  if (kind === 'DATA_INVENTORY') {
    const rows = await q(
      `SELECT s.document->>'name' AS system, a.document->>'name' AS asset, a.kind, a.provenance, a.review_state
         FROM app.data_assets a
         JOIN app.systems s ON s.tenant_id=a.tenant_id AND s.legal_entity_id=a.legal_entity_id
          AND s.environment_id=a.environment_id AND s.id=a.system_id
        WHERE ${predicate.replaceAll('tenant_id', 'a.tenant_id').replaceAll('legal_entity_id', 'a.legal_entity_id').replaceAll('environment_id', 'a.environment_id')}
          AND a.tombstoned_at IS NULL ORDER BY s.document->>'name', a.document->>'name' LIMIT 2001`);
    const asserted = rows.filter(r => r.provenance === 'ASSERTED').length;
    return {
      heading: 'Personal data inventory',
      covers: 'Where personal data is held, according to this installation, and whether each record was observed or stated by the organisation.',
      columns: ['System', 'Asset', 'Kind', 'Provenance', 'Review'],
      rows: rows.map(r => [text(r.system), text(r.asset), text(r.kind), text(r.provenance), text(r.review_state)]),
      counted: `${rows.length} live asset(s), of which ${asserted} are asserted rather than observed.`,
      limits: [
        'An asserted asset is what somebody told this product. It is not evidence that the data is there, and it is not something ORVIA observed.',
        'This is what has been recorded. Personal data in a system nobody has declared does not appear, and its absence here is not evidence that it does not exist.',
      ],
    };
  }

  if (kind === 'COVERAGE_GAPS') {
    const rows = await q(
      `SELECT description, state, severity, detected_at, owner_reference FROM app.coverage_gaps
        WHERE ${predicate} ORDER BY detected_at DESC LIMIT 2001`);
    const openGaps = rows.filter(r => r.state !== 'GAP_RESOLVED').length;
    return {
      heading: 'Coverage gaps',
      covers: 'What this installation records as not covered, not verified, or outside what it can act on.',
      columns: ['Detected', 'Gap', 'State', 'Severity', 'Owner'],
      rows: rows.map(r => [when(r.detected_at), text(r.description), text(r.state), text(r.severity), text(r.owner_reference)]),
      counted: `${rows.length} recorded gap(s), of which ${openGaps} are not resolved.`,
      limits: [
        'A gap is recorded when somebody notices it. An empty section means none has been recorded, which is a different fact from full coverage.',
        'A gap accepted as a risk is a decision somebody took. It is not a gap that was closed.',
      ],
    };
  }

  if (kind === 'PROCESSORS') {
    const rows = await q(
      `SELECT document->>'name' AS name, role, document->>'region' AS region,
              subprocessors_permitted, recorded_at
         FROM app.processors WHERE ${predicate} ORDER BY document->>'name' LIMIT 2001`);
    return {
      heading: 'Processors and other fiduciaries',
      covers: 'Who else handles personal data on this organisation’s behalf, and in what role.',
      columns: ['Name', 'Role', 'Region', 'Sub-processors permitted', 'Recorded'],
      rows: rows.map(r => [text(r.name), text(r.role), text(r.region), r.subprocessors_permitted ? 'Yes' : 'No', when(r.recorded_at)]),
      counted: `${rows.length} recorded processor relationship(s).`,
      limits: [
        'Roles are those this Act recognises. There is no controller here, because this regime does not have one.',
        'A recorded relationship is a declaration by the organisation. This product does not verify what any processor actually does.',
      ],
    };
  }

  if (kind === 'INCIDENTS_AND_INTIMATIONS') {
    const w = window(from, to, 'i.detected_at', 4);
    const rows = await q(
      `SELECT i.detected_at, i.severity, i.state, r.document->>'recipient' AS recipient,
              n.state AS intimation, n.due_at
         FROM app.incidents i
         LEFT JOIN app.notification_obligations n ON n.tenant_id=i.tenant_id AND n.legal_entity_id=i.legal_entity_id
          AND n.environment_id=i.environment_id AND n.incident_id=i.id
         LEFT JOIN app.obligation_rules r ON r.tenant_id=n.tenant_id AND r.legal_entity_id=n.legal_entity_id
          AND r.environment_id=n.environment_id AND r.id=n.rule_id
        WHERE ${predicate.replaceAll('tenant_id', 'i.tenant_id').replaceAll('legal_entity_id', 'i.legal_entity_id').replaceAll('environment_id', 'i.environment_id')} ${w.sql}
        ORDER BY i.detected_at DESC LIMIT 2001`, w.values);
    return {
      heading: 'Incidents and intimations',
      covers: 'Personal data incidents detected in the period, and the intimations owed for each under the rules the organisation configured.',
      columns: ['Detected', 'Severity', 'Incident state', 'Recipient', 'Intimation', 'Due'],
      rows: rows.map(r => [when(r.detected_at), text(r.severity), text(r.state), text(r.recipient), text(r.intimation), when(r.due_at)]),
      counted: `${rows.length} incident-and-intimation row(s) in the period.`,
      limits: [
        'Occurred, detected and became-aware are three different moments and each clock runs from the one its rule names. This product ships no deadline of its own.',
        'An intimation recorded as sent is a record that somebody sent it. This product has no transport and did not observe it arrive.',
      ],
    };
  }

  if (kind === 'AUDIT_TRAIL') {
    const w = window(from, to, 'created_at', 4);
    const rows = await q(
      `SELECT operation, actor_domain, count(*)::int AS n, min(created_at) AS first, max(created_at) AS last
         FROM app.audit_events WHERE ${predicate} ${w.sql}
        GROUP BY operation, actor_domain ORDER BY count(*) DESC LIMIT 2001`, w.values);
    const total = rows.reduce((sum, r) => sum + Number(r.n), 0);
    return {
      heading: 'Audit trail',
      covers: 'What was recorded in the audit trail during the period, grouped by the operation and the kind of actor that performed it.',
      columns: ['Operation', 'Actor', 'Events', 'First', 'Last'],
      rows: rows.map(r => [text(r.operation), text(r.actor_domain), text(r.n), when(r.first), when(r.last)]),
      counted: `${total} audited event(s) across ${rows.length} operation(s) in the period.`,
      limits: [
        'An audit record is an envelope: who did what, to which resource, under which request, and when. It carries no payload, so nothing about the content of any record appears here.',
        'The trail is append-only against every role, so a count here cannot have been reduced.',
      ],
    };
  }

  if (kind === 'AUDIT_RETENTION') {
    const rules = await q(
      `SELECT DISTINCT ON (purpose) purpose, days, source_reference, recorded_at
         FROM app.audit_retention_rules WHERE ${predicate}
        ORDER BY purpose, recorded_at DESC LIMIT 100`);
    const byPurpose = new Map(rules.map(r => [r.purpose as string, r]));
    const rows = S.AuditRetentionPurpose.options.map(purpose => {
      const rule = byPurpose.get(purpose);
      return [purpose, rule ? `${rule.days} days` : 'No period configured',
        rule ? text(rule.source_reference) : 'Nothing is assumed in place of a configured period',
        rule ? when(rule.recorded_at) : '—'];
    });
    return {
      heading: 'Audit retention',
      covers: 'How long the audit trail is kept for each stated purpose, and what each period rests on.',
      columns: ['Purpose', 'Period', 'What the period rests on', 'Recorded'],
      rows,
      counted: `${rules.length} of ${S.AuditRetentionPurpose.options.length} purpose(s) have a configured period.`,
      limits: [
        'No retention period ships with this product. A purpose with none configured is an omission to fix, not a decision to keep records indefinitely.',
        'This is a schedule. Nothing deletes an audit record: a period elapsing is reported and never acted on.',
      ],
    };
  }

  // OPERATIONAL_READINESS
  const published = await q(`SELECT count(*)::int AS n FROM app.policy_versions WHERE ${predicate} AND status='PUBLISHED'`);
  const systems = await q(`SELECT count(*)::int AS n FROM app.systems WHERE ${predicate}`);
  const restrict = await q(`SELECT count(*)::int AS n FROM app.system_checks WHERE ${predicate} AND supports_restrict`);
  return {
    heading: 'Operational readiness',
    covers: 'Whether this installation could carry a privacy decision through to a system able to act on it, reported as separate facts rather than one status.',
    columns: ['Question', 'Answer'],
    rows: [
      ['Policies published', text(published[0]?.n)],
      ['Systems configured', text(systems[0]?.n)],
      ['Systems observed able to restrict', text(restrict[0]?.n)],
    ],
    counted: 'Three counts read from this installation at the moment the report was generated.',
    limits: [
      'These are three separate facts and are deliberately not combined into a single status. A live installation with configured systems can still be unable to carry out a decision.',
      'A system observed able to restrict was checked at some point. This does not predict that any particular decision will succeed.',
    ],
  };
}

export async function report(c: Context, query: unknown): Promise<unknown> {
  const value = S.ReportQuery.parse(query);
  const held = new Set(c.actor.capabilities);

  const requested = value.sections
    ? value.sections.split(',').map(part => part.trim()).filter(Boolean)
    : [...DEFAULT_ORDER];
  const unknown = requested.filter(kind => !(S.ReportSectionKind.options as readonly string[]).includes(kind));
  if (unknown.length) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'sections', code: 'unknown_report_section' }]);
  if (new Set(requested).size !== requested.length) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'sections', code: 'duplicate_report_section' }]);

  const chosen = requested as S.ReportSectionKindValue[];
  const sections: S.ReportSectionValue[] = [];
  const omitted: { kind: S.ReportSectionKindValue; reason: 'NOT_SELECTED' | 'WITHHELD_FOR_AUTHORITY' }[] = [];

  for (const kind of S.ReportSectionKind.options) {
    if (!chosen.includes(kind)) { omitted.push({ kind, reason: 'NOT_SELECTED' }); continue; }
    // A section the reader may not read is named as withheld. Dropping it would
    // hand somebody a report that had silently shrunk to the generator's
    // permissions, which they would have no way to detect.
    if (!held.has(SECTION_CAPABILITY[kind] as never)) { omitted.push({ kind, reason: 'WITHHELD_FOR_AUTHORITY' }); }
  }
  for (const kind of chosen) {
    if (omitted.some(o => o.kind === kind)) continue;
    sections.push({ kind, ...(await build(c, kind, value.from, value.to)) });
  }
  if (!sections.length) throw new AccessError(403, 'FORBIDDEN', [{ field: 'sections', code: 'no_requested_section_is_readable' }]);

  const scopeRow = (await c.tx.query(
    `SELECT e.name AS environment, l.name AS legal_entity FROM app.environments e
       JOIN app.legal_entities l ON l.tenant_id=e.tenant_id AND l.id=e.legal_entity_id
      WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.id=$3`, scopeValues(c.actor))).rows[0];

  const body = {
    title: value.title ?? 'Privacy record',
    profile: S.PROFILE,
    scope_label: scopeRow ? `${scopeRow.legal_entity} · ${scopeRow.environment}` : 'This installation',
    period_from: value.from ?? null, period_to: value.to ?? null,
    sections, omitted,
  };
  return S.Report.parse({
    ...body,
    generated_at: new Date().toISOString(),
    content_digest: digest(body),
    this_report_is_not_a_compliance_certificate: true,
    every_section_left_out_is_named: true,
    limits: REPORT_LIMITS,
  });
}
