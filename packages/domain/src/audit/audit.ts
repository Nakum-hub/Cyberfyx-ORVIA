import { randomUUID } from 'node:crypto';
import * as S from '../../../contracts/src/index.ts';
import { digest } from '../../../contracts/src/crypto.ts';
import { AccessError } from '../../../authz/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M33 Audit Administration, FR-M33-01 and FR-M33-03.
 *
 * Coverage is measured from the trail rather than declared. A category that has
 * never recorded anything says so, and a category that no route in this build
 * could ever produce says something different again — "nothing has happened" and
 * "nothing here can happen" are separate facts and never share a shape.
 *
 * Correction is by appending. A disputed event is never edited, hidden or
 * superseded: a correction names it, states what is disputed and what the
 * recorder believes, and sits beside it. The database enforces this with
 * triggers as well, so a privileged role cannot shorten the trail either.
 *
 * Reading the trail is itself audited, which happens for free because this is an
 * ordinary business route and every one of those records its own event. That is
 * the point: an audit read that left no trace would be the one gap worth having.
 */

/**
 * FR-M33-01's eight categories, each mapped to the operation names that actually
 * constitute it. The map is here rather than in a table so a reader can check
 * the claim against the code that makes it, and so adding a route that belongs
 * to a category is a visible change rather than a silent omission.
 *
 * Both names appear for most categories because two things record an event: the
 * dispatcher writes the route id, and the domain writes its own operation name.
 * Listing both is what the trail actually contains.
 */
const CATEGORY_OPERATIONS: Record<S.AuditCategoryValue, string[]> = {
  ROLE_GRANTS: ['protected-bootstrap.identity-checked'],
  OWNER_CHANGES: [],
  POLICY_PUBLICATION: ['policy.publish', 'publish_policy', 'policy.reauthenticate', 'reauthenticate_policy'],
  CONNECTOR_CREDENTIALS_AND_SCOPE: ['system.check', 'check_system', 'systems.create', 'create_systems'],
  SUPPORT_APPROVAL: ['diagnostic.approve', 'approve_diagnostic', 'diagnostic.transfer', 'record_transfer'],
  EXPORTS: ['evidence.export', 'export'],
  LICENCES: ['licence.import', 'import_licence'],
  UPDATES: ['release.import', 'import_release', 'update_plan.approve', 'plan_update', 'update_step.record', 'record_update_step'],
};

/**
 * What an operator is told about a category beyond its count. The two with no
 * in-product route are the reason this field exists: reporting them as simply
 * uncovered would suggest somebody had forgotten to audit something, when in
 * fact there is nothing here to audit.
 */
const CATEGORY_NOTES: Record<S.AuditCategoryValue, string> = {
  ROLE_GRANTS: 'A role is granted only by the protected local setup, which records its own event. There is no route in this build through which a role could be granted, so nothing else can produce one.',
  OWNER_CHANGES: 'This build creates one primary owner during protected local setup and has no ownership-transfer route at all. There is nothing to audit rather than something unaudited, and an entry here would appear the moment such a route existed.',
  POLICY_PUBLICATION: 'Publication and the reviewer re-authentication that precedes it are both recorded, so an approval is traceable to the person who re-proved their identity for it.',
  CONNECTOR_CREDENTIALS_AND_SCOPE: 'Configuring a system and checking what it can actually do are both recorded. The credential itself is never written to the trail; only that a scope check happened and what it concluded.',
  SUPPORT_APPROVAL: 'Approving a diagnostic payload for release and recording that an operator carried it are separate events, because they are separate acts by potentially different people.',
  EXPORTS: 'Every evidence export is recorded. This is the category where reading is itself the sensitive act, so the read is the audited event.',
  LICENCES: 'Importing a licence is recorded. A licence carries no authority grant, so there is nothing else here to audit.',
  UPDATES: 'Importing a release, approving a plan and recording each step are separate events, so an interrupted update leaves a trail of what had actually been done.',
};

/** A replay is a real event in the trail and belongs to the same category. */
const withReplays = (operations: string[]) => operations.flatMap(name => [name, `${name}.replayed`]);

/**
 * Every operation name that constitutes a category, replays included. Exported
 * so FR-M33-04's retention report counts the same events this coverage report
 * does: two reports disagreeing about what an operation is would make both
 * worthless.
 */
export const operationsFor = (category: S.AuditCategoryValue) => withReplays(CATEGORY_OPERATIONS[category]);

type EventRow = {
  id: string; operation: string; actor_id: string; actor_domain: string;
  resource_id: string | null; request_id: string; created_at: Date; corrections: string | number;
};

const auditEvent = (row: EventRow) => S.AuditEvent.parse({
  id: row.id, operation: row.operation, actor_id: row.actor_id, actor_domain: row.actor_domain,
  resource_id: row.resource_id, request_id: row.request_id,
  created_at: row.created_at.toISOString(), corrections: Number(row.corrections),
});

/**
 * The declared filter keys, and only those, turned into parameters. Nothing a
 * caller supplies reaches the statement as text, so there is no predicate to
 * smuggle anything into: the shape of the SQL is fixed by this function and the
 * values are bound.
 */
function filterClauses(filter: S.AuditQueryValue, values: unknown[]) {
  const conditions: string[] = [];
  const add = (sql: string, value: unknown) => { values.push(value); conditions.push(sql.replace('$n', `$${values.length}`)); };
  if (filter.operation) add('operation = $n', filter.operation);
  if (filter.actor_id) add('actor_id = $n', filter.actor_id);
  if (filter.actor_domain) add('actor_domain = $n', filter.actor_domain);
  if (filter.from) add('created_at >= $n', filter.from);
  if (filter.to) add('created_at <= $n', filter.to);
  return conditions.length ? ' AND ' + conditions.join(' AND ') : '';
}

/** The count of corrections appended against each event, as a correlated
 *  subquery so an event with none reports none rather than disappearing. */
const withCorrections = `(SELECT count(*) FROM app.audit_corrections k
   WHERE k.tenant_id=e.tenant_id AND k.legal_entity_id=e.legal_entity_id AND k.environment_id=e.environment_id AND k.event_id=e.id) AS corrections`;

/**
 * FR-M33-03. Scoped by the same predicate as everything else, filtered by
 * declared keys only, and paginated by id so a page boundary cannot hide a row.
 */
export async function auditEventList(c: Context, page: Page, query: unknown) {
  const filter = S.AuditQuery.parse(query ?? {});
  const values: unknown[] = [...scopeValues(c.actor), page.cursor, page.limit + 1];
  const rows = await c.tx.query(
    `SELECT e.*, ${withCorrections}
     FROM app.audit_events e
     WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3
       AND ($4::uuid IS NULL OR e.id>$4)${filterClauses(filter, values)}
     ORDER BY e.id LIMIT $5`, values);
  return paged(rows.rows.map(auditEvent), page);
}

/**
 * FR-M33-03's export, which is a separate permission from reading because it is
 * the act that takes the trail out of the installation.
 *
 * An export is everything the filter matched or it is nothing. Returning the
 * first few thousand rows of a larger match would produce a file that reads as
 * a complete record of a period and is not one, and no field on the artifact
 * could undo that for a reader who did not look. So a match beyond the ceiling
 * is refused, naming the count and the ceiling, and the caller narrows the
 * filter instead.
 */
const EXPORT_CEILING = 5000;
export async function exportAuditEvents(c: Context, query: unknown) {
  const filter = S.AuditQuery.parse(query ?? {});
  const counting: unknown[] = [...scopeValues(c.actor)];
  const matched = Number((await c.tx.query(
    `SELECT count(*)::int AS n FROM app.audit_events e WHERE ${predicate}${filterClauses(filter, counting)}`, counting)).rows[0].n);
  // The code is closed on purpose. Putting the count inside it would make the
  // field-error vocabulary unbounded and therefore impossible to group, filter
  // or translate, for the sake of a number the operator does not need: what
  // they need to know is that the filter has to be narrower.
  if (matched > EXPORT_CEILING) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'filter', code: 'matched_set_above_export_ceiling' }]);
  const values: unknown[] = [...scopeValues(c.actor)];
  const rows = await c.tx.query(
    `SELECT e.*, ${withCorrections} FROM app.audit_events e WHERE ${predicate}${filterClauses(filter, values)} ORDER BY e.id`, values);
  const events = rows.rows.map(auditEvent);
  return S.AuditExport.parse({
    exported_at: new Date().toISOString(), filter, events, matched: events.length, complete: true,
    digest: digest(events),
    limits: [
      'This artifact carries every event the stated filter matched. A match larger than the export ceiling is refused rather than shortened, so a partial export cannot be mistaken for a whole one.',
      'The digest covers exactly the events carried here, so a recipient can tell whether the file they hold is the one this installation produced.',
      'Producing this export is itself an audited event, recorded against the person who produced it.',
      'This is the local operational trail. It is not sent anywhere by this product, and nothing in it is mirrored into a vendor record.',
    ],
  });
}

/**
 * FR-M33-01. Every figure comes from the trail. Nothing here reads a list of
 * what somebody intended to audit, so a category cannot be reported as covered
 * because a configuration said it was.
 */
export async function auditCoverage(c: Context) {
  const scope = scopeValues(c.actor);
  const entries: S.AuditCoverageEntryValue[] = [];
  for (const category of S.AuditCategory.options) {
    const operations = CATEGORY_OPERATIONS[category];
    const names = operationsFor(category);
    const found = names.length
      ? (await c.tx.query(
        `SELECT count(*)::int AS n, min(created_at) AS first, max(created_at) AS last
         FROM app.audit_events WHERE ${predicate} AND operation = ANY($4)`, [...scope, names])).rows[0]
      : { n: 0, first: null, last: null };
    const recorded = Number(found.n);
    entries.push(S.AuditCoverageEntry.parse({
      category, operations, recorded,
      first_seen_at: recorded ? (found.first as Date).toISOString() : null,
      last_seen_at: recorded ? (found.last as Date).toISOString() : null,
      has_a_path: operations.length > 0,
      note: CATEGORY_NOTES[category],
    }));
  }
  return S.AuditCoverage.parse({
    as_of: new Date().toISOString(), entries,
    derived_from_recorded_events: true,
    limits: [
      'Every count here was measured from the recorded trail. A category cannot be reported as covered because something declared that it was.',
      'A category with no recorded events and no path is a statement that this build has no route which could produce one, not that auditing was omitted.',
      'This report says what was recorded, not whether what was recorded is complete. An action nobody built a route for leaves no trace here or anywhere.',
      'Reading this page is itself an audited event, so the trail includes who examined it.',
    ],
  });
}

/**
 * FR-M33-03. Appending, never amending. The disputed event is read first so a
 * correction cannot name an event that does not exist or belongs elsewhere, and
 * the database refuses every UPDATE and DELETE on both tables independently.
 */
export async function correctAuditEvent(c: Context, input: unknown) {
  const value = S.AuditCorrectionCreate.parse(input);
  const scope = scopeValues(c.actor);
  const event = requireOne((await c.tx.query(
    `SELECT id FROM app.audit_events WHERE ${predicate} AND id=$4`, [...scope, value.event_id])).rows);
  const id = randomUUID();
  const row = requireOne((await c.tx.query(
    `INSERT INTO app.audit_corrections(tenant_id,legal_entity_id,environment_id,id,event_id,disputed,correction,recorded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...scope, id, event.id, value.disputed, value.correction, c.actor.actor_id])).rows);
  await audit(c, 'audit_correction.record', id);
  return S.AuditCorrection.parse({
    id: row.id, event_id: row.event_id, disputed: row.disputed, correction: row.correction,
    recorded_at: (row.recorded_at as Date).toISOString(), recorded_by: row.recorded_by,
    original_event_unchanged: true,
    limits: [
      'The disputed event is unchanged. This correction sits beside it and neither replaces nor hides it.',
      'A correction is itself append-only. It cannot be withdrawn, so disputing a record is a decision that stays on the record.',
      'This records what somebody believes to be true. It is not a finding, and nothing re-derives state from it.',
    ],
  });
}
