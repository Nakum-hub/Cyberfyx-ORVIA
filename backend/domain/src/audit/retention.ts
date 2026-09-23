import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { audit, predicate, scopeValues, requireOne, type Context } from '../shared/transaction.ts';
import { operationsFor } from './audit.ts';

/**
 * M33 Audit Administration, FR-M33-04.
 *
 * The requirement asks for purpose-based retention with payload minimisation and
 * tested backup handling, and for a truthful envelope history when a justified
 * payload deletion occurs. Three facts about this build decide what an honest
 * answer looks like.
 *
 * There is no payload. `app.audit_events` records who did what, to which
 * resource, under which request, and when -- and has no column for anything
 * else. So payload minimisation here is not a policy that could lapse; it is the
 * absence of a place to put anything, and justified payload deletion cannot
 * occur because there is nothing to delete. The envelope history the requirement
 * asks to preserve is the entire record, and it is preserved absolutely.
 *
 * That claim is measured rather than asserted. The report counts payload-shaped
 * columns on the audit table at read time, and the contract permits only zero,
 * so if one is ever added this endpoint fails loudly instead of continuing to
 * describe a trail that now carries content it says it does not.
 *
 * Retention is a schedule, not a purge. Migration 0027 made the trail
 * append-only against the migrator itself. A product that deleted its own audit
 * trail on a timer would be the exact failure that trigger exists to prevent, so
 * an expired period is reported and never acted on. Deleting audit envelopes at
 * all would need the record-class decision OPEN-10 leaves open.
 *
 * And no period ships. OPEN-10's interim rule forbids universal statutory
 * retention numbers, so a purpose with nothing configured reports that it has no
 * period rather than defaulting to a number or to forever.
 */

/**
 * Why each audited category is kept. Every one of FR-M33-01's eight categories
 * appears exactly once, which the contract checks, so no part of the trail is
 * retained for a reason nobody stated. The map is here rather than in a table
 * for the same reason the category map is: a reader can check the claim against
 * the code that makes it.
 */
const PURPOSE_CATEGORIES: Record<S.AuditRetentionPurposeValue, S.AuditCategoryValue[]> = {
  SECURITY_INVESTIGATION: ['ROLE_GRANTS', 'OWNER_CHANGES', 'CONNECTOR_CREDENTIALS_AND_SCOPE'],
  REGULATORY_ACCOUNTABILITY: ['POLICY_PUBLICATION', 'EXPORTS'],
  COMMERCIAL_OBLIGATION: ['LICENCES', 'SUPPORT_APPROVAL'],
  CHANGE_TRACEABILITY: ['UPDATES'],
};

const LIMITS = [
  'This is a schedule and a disclosure. Nothing here deletes anything: the audit trail is append-only against every role including the migrator, and a period elapsing is not authority to shorten it.',
  'No retention period ships with this product. A purpose with none configured reports that, rather than defaulting to a number nobody chose or to keeping records forever.',
  'The audit record has no payload column, so there is nothing to minimise away and no justified payload deletion that an envelope would have to survive. The report measures this rather than promising it.',
  'A snapshot the customer declared may contain audit records. Their archive is outside this product, so nothing described here reaches a copy held in it.',
  'Events counted as beyond their period are counted against the period configured now. Changing a period changes this number, which is why every rule is kept rather than edited.',
];

/**
 * Payload-shaped columns on the audit table, counted at read time. The names are
 * the ones a payload would plausibly arrive under; the point is not to be
 * exhaustive about naming but to fail if the table stops being an envelope.
 */
async function payloadColumns(c: Context): Promise<number> {
  const row = (await c.tx.query(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_schema='app' AND table_name='audit_events'
        AND column_name IN ('payload','body','detail','details','document','content','context','metadata','note','message','before','after')`)).rows[0];
  return Number(row.n);
}

/** The most recently recorded rule for each purpose. Earlier ones are kept. */
async function currentRules(c: Context) {
  const rows = await c.tx.query(
    `SELECT DISTINCT ON (purpose) purpose,days,source_reference,recorded_at,recorded_by
       FROM app.audit_retention_rules WHERE ${predicate}
      ORDER BY purpose,recorded_at DESC,id DESC`, scopeValues(c.actor));
  return new Map(rows.rows.map(row => [row.purpose as string, {
    purpose: row.purpose, days: Number(row.days), source_reference: row.source_reference,
    recorded_at: (row.recorded_at as Date).toISOString(), recorded_by: row.recorded_by,
  }]));
}

export async function auditRetention(c: Context): Promise<unknown> {
  const scope = scopeValues(c.actor);
  const rules = await currentRules(c);

  const lines = [];
  for (const purpose of S.AuditRetentionPurpose.options) {
    const categories = PURPOSE_CATEGORIES[purpose];
    // Every operation name that constitutes this purpose, replays included,
    // read from the same map FR-M33-01's coverage report uses. Two reports
    // disagreeing about what an operation is would make both worthless.
    const operations = categories.flatMap(category => operationsFor(category));
    const rule = rules.get(purpose) ?? null;
    const held = (await c.tx.query(
      `SELECT count(*)::int AS n,min(created_at) AS oldest FROM app.audit_events
        WHERE ${predicate} AND operation = ANY($4)`, [...scope, operations])).rows[0];
    const overdue = rule
      ? (await c.tx.query(
        `SELECT count(*)::int AS n FROM app.audit_events
          WHERE ${predicate} AND operation = ANY($4) AND created_at < now() - ($5 || ' days')::interval`,
        [...scope, operations, String(rule.days)])).rows[0]
      : { n: 0 };
    lines.push({
      purpose, categories, rule,
      events_held: Number(held.n),
      oldest_event_at: held.oldest ? (held.oldest as Date).toISOString() : null,
      beyond_period: Number(overdue.n),
      period_is_not_configured_here: rule === null,
    });
  }

  // Tested backup handling: a declared snapshot covering the trail is a copy
  // this product cannot reach. Read from FR-M32-03's record rather than assumed.
  const snapshots = (await c.tx.query(
    `SELECT count(*)::int AS n FROM app.backup_snapshots
      WHERE ${predicate} AND 'EVIDENCE' = ANY(covers)`, scope)).rows[0];

  return S.AuditRetentionReport.parse({
    as_of: new Date().toISOString(), profile: S.PROFILE, lines,
    payload_columns_found: await payloadColumns(c),
    payload_is_not_recorded_so_none_can_be_deleted: true,
    envelopes_are_never_deleted_by_this_product: true,
    snapshots_covering_evidence: Number(snapshots.n),
    a_declared_snapshot_is_not_reached_by_anything_here: true,
    limits: LIMITS,
  });
}

/**
 * Recording a period. Superseding rather than editing, because shortening a
 * retention period is exactly the change somebody would make to clear a backlog,
 * and the previous period has to stay visible for that to be noticeable.
 */
export async function setAuditRetention(c: Context, input: unknown) {
  const value = S.AuditRetentionRuleCreate.parse(input);
  const scope = scopeValues(c.actor);
  const id = randomUUID();
  const row = requireOne((await c.tx.query(
    `INSERT INTO app.audit_retention_rules(tenant_id,legal_entity_id,environment_id,id,purpose,days,source_reference,recorded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...scope, id, value.purpose, value.days, value.source_reference, c.actor.actor_id])).rows);
  await audit(c, 'audit_retention.set', id);
  return S.AuditRetentionRule.parse({
    purpose: row.purpose, days: Number(row.days), source_reference: row.source_reference,
    recorded_at: (row.recorded_at as Date).toISOString(), recorded_by: row.recorded_by,
  });
}
