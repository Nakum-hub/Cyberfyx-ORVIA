// WP24 / M33 Audit Administration integration suite.
// Under test: coverage is measured from the trail rather than declared, a
// category with no route in this build is not reported as an auditing gap,
// reading the trail is itself recorded, administering it is a separate
// authority from reading it, and a disputed record is corrected by appending
// while the original stays byte-for-byte as it was.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { digest } from '../../../shared/contracts/src/crypto.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
const db = connectDatabase(profile).pool;
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
let phase = 'setup';
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
  catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, { expected, actual }); throw new Error('Assertion failed: ' + name); }
}
const clients = new Map<string, ReturnType<HttpFixture['browser']>>();
const login = h.login.bind(h);
h.login = async name => { let browser = clients.get(name); if (!browser) { browser = await login(name); clients.set(name, browser); } return browser; };
const key = () => ({ 'idempotency-key': randomUUID() });
const fieldCodes = async (response: Response) =>
  ((await response.json()) as { error: { field_errors?: { code: string }[] } }).error.field_errors?.map(e => e.code) ?? [];
/** Parses a response the contract says should have succeeded, reporting the
 *  status the product actually gave when it did not. */
async function body<T>(schema: { parse: (value: unknown) => T }, response: Response, expected = 201) {
  const value: unknown = await response.json();
  if (response.status !== expected) {
    console.log(`FAIL unexpected ${response.status} where ${expected} was required:`, JSON.stringify(value).slice(0, 400));
    throw new Error('Unexpected response status');
  }
  return schema.parse(value);
}
/** A direct write as the migrator, which is superuser and bypasses row-level
 *  security. A refusal here came from a trigger or a constraint, never from a
 *  policy, which is the only way to prove the trail resists a privileged hand. */
const direct = (sql: string, values: unknown[] = []) =>
  db.query(sql, values).then(() => 'ACCEPTED').catch(() => 'REJECTED');

try {
  await h.start();
  phase = 'scenario';
  // Everything this suite measures is bounded to what happens after this
  // moment, so it is re-runnable against a trail it has already written to.
  const startedAt = new Date().toISOString();
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;   // ORG_ADMIN: audit.read, no audit.administer
  const owner = scenario.owner;    // ORG_SUPER_ADMIN: also audit.administer
  const scope = [scenario.scope.tenant_id, scenario.scope.legal_entity_id, scenario.scope.environment_id];

  const coverageNow = async (as = staff) => body(S.AuditCoverage, await as.call('/api/v1/admin/audit-coverage'), 200);
  async function events(query: Record<string, string> = {}, as = staff): Promise<S.AuditEventValue[]> {
    const items: S.AuditEventValue[] = [];
    let cursor: string | null = null;
    do {
      const search = new URLSearchParams({ ...query, limit: '100', ...cursor ? { cursor } : {} });
      const response = await as.call(`/api/v1/admin/audit-events?${search}`);
      if (response.status !== 200) throw new Error(`Reading the trail answered ${response.status}`);
      const result = S.schemas.AuditEventList.parse(await response.json());
      items.push(...result.items); cursor = result.next_cursor;
    } while (cursor);
    return items;
  }
  /** The operations a coverage entry names, plus the replay of each, which is a
   *  real event in the trail and belongs to the same category. */
  const named = (entry: S.AuditCoverageEntryValue) => [...entry.operations, ...entry.operations.map(o => `${o}.replayed`)];
  const countIn = async (operations: string[]) => Number((await db.query(
    `SELECT count(*)::int AS n FROM app.audit_events
     WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND operation = ANY($4)`, [...scope, operations])).rows[0].n);

  // --- FR-M33-01: what the trail actually contains ----------------------------
  phase = 'coverage';
  const before = await coverageNow();
  check('every category is reported exactly once and the report says it was measured',
    [before.entries.length, new Set(before.entries.map(e => e.category)).size, before.derived_from_recorded_events],
    [8, 8, true]);
  // The claim each entry makes is checkable, so this checks it: the count the
  // product reports for a category is the count of the operations it names.
  for (const entry of before.entries) {
    check(`the count reported for ${entry.category} is the count of the operations it names`,
      entry.recorded, await countIn(named(entry)));
  }
  const entryFor = (report: S.AuditCoverageValue, category: string) => report.entries.find(e => e.category === category)!;
  check('a category this build has no route for says so, rather than reading as an auditing gap',
    [entryFor(before, 'OWNER_CHANGES').has_a_path, entryFor(before, 'OWNER_CHANGES').recorded, entryFor(before, 'OWNER_CHANGES').operations],
    [false, 0, []]);
  check('the categories the scenario just exercised have recorded something',
    ['ROLE_GRANTS', 'POLICY_PUBLICATION', 'CONNECTOR_CREDENTIALS_AND_SCOPE'].map(c => entryFor(before, c).recorded > 0),
    [true, true, true]);
  check('a category with something recorded names when it first and last happened',
    before.entries.map(e => (e.recorded > 0) === (e.first_seen_at !== null)), Array<boolean>(8).fill(true));

  phase = 'coverage moves with the trail';
  // One further act of one category. Nothing else is touched, so any other
  // category that moved would mean the report was not measuring what it names.
  const extra = await body(S.System, await staff.call('/api/v1/admin/systems',
    { legal_entity_id: scenario.scope.legal_entity_id, environment_id: scenario.scope.environment_id,
      name: `audit_probe_${randomUUID().slice(0, 8)}`, connector: 'SYNTHETIC_CRM' }, key()));
  const after = await coverageNow();
  check('configuring a connector raises exactly the connector category',
    after.entries.map(e => [e.category, e.recorded > entryFor(before, e.category).recorded] as const)
      .filter(([, moved]) => moved).map(([category]) => category),
    ['CONNECTOR_CREDENTIALS_AND_SCOPE']);
  check('the raised count is still exactly the count of the operations it names',
    entryFor(after, 'CONNECTOR_CREDENTIALS_AND_SCOPE').recorded,
    await countIn(named(entryFor(after, 'CONNECTOR_CREDENTIALS_AND_SCOPE'))));
  check('the report cannot be told a category is covered',
    [Object.keys(before).includes('configured_categories'), before.limits.some(l => l.includes('measured'))], [false, true]);

  // --- FR-M33-03: reading the trail -------------------------------------------
  phase = 'trail';
  // Snapshotted immediately before the read, because a read is itself an
  // audited act and its own event is written after its rows are selected. The
  // claim under test is that the read returns everything that existed when it
  // began -- not that it can see a record that did not exist yet.
  const existing = (await db.query(
    `SELECT id FROM app.audit_events
     WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND created_at >= $4`, [...scope, startedAt]))
    .rows.map(r => r.id as string).sort();
  const mine = await events({ from: startedAt });
  check('the trail returns every scoped event that existed when the read began, and only those',
    mine.map(e => e.id).sort(), existing);
  check('every returned event carries its actor, its domain and the request that caused it',
    [mine.every(e => S.AuditActorDomain.safeParse(e.actor_domain).success),
      mine.every(e => S.Id.safeParse(e.actor_id).success && S.Id.safeParse(e.request_id).success)], [true, true]);
  // The trail is one organisation's. Proved with a real reader in another
  // organisation holding the same capability, rather than by reasoning about
  // the query: a second tenant's owner sees none of these events at all.
  const birch = await h.login('birch');
  const seenElsewhere = (await events({ from: startedAt }, birch)).map(e => e.id);
  check('an owner in another organisation holding the same capability sees none of this trail',
    seenElsewhere.filter(id => mine.some(e => e.id === id)), []);

  phase = 'filtering';
  const systemCreates = await events({ operation: 'systems.create', from: startedAt });
  check('filtering by operation returns that operation and only that one',
    [systemCreates.length > 0, systemCreates.every(e => e.operation === 'systems.create')], [true, true]);
  check('the filtered set is the whole filtered set',
    systemCreates.length, Number((await db.query(
      `SELECT count(*)::int AS n FROM app.audit_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
        AND operation=$4 AND created_at >= $5`, [...scope, 'systems.create', startedAt])).rows[0].n));
  await (await h.login('alice')).call('/api/v1/portal/me/consents?limit=1');
  const principals = await events({ actor_domain: 'PRINCIPAL', from: startedAt });
  check('a data principal acting on their own record is in the same trail, under their own domain',
    [principals.length > 0, principals.every(e => e.actor_domain === 'PRINCIPAL')], [true, true]);
  const byOwner = await events({ actor_id: h.users.owner!.id, from: startedAt });
  check('filtering by actor returns that actor and nobody else',
    [byOwner.length > 0, new Set(byOwner.map(e => e.actor_id)).size], [true, 1]);
  check('a filter key the route never declared is refused rather than ignored',
    (await staff.call(`/api/v1/admin/audit-events?where=${encodeURIComponent("1=1 OR ''=''")}`)).status, 400);
  check('a filter value outside the declared vocabulary is refused',
    (await staff.call('/api/v1/admin/audit-events?actor_domain=ROBOT')).status, 400);
  check('a time filter that is not a time is refused',
    (await staff.call('/api/v1/admin/audit-events?from=yesterday')).status, 400);

  // --- FR-M33-03: export, which is not the same permission as read -----------
  phase = 'export';
  const auditor = await h.login('auditor');   // AUDITOR: audit.read and audit.export
  const member = await h.login('member');     // MEMBER: neither
  const exportUrl = (query: Record<string, string>) => `/api/v1/admin/audit-events/export?${new URLSearchParams(query)}`;
  const exported = await body(S.AuditExport, await auditor.call(exportUrl({ operation: 'systems.create', from: startedAt })), 200);
  check('the export carries every event the filter matched and says so structurally',
    [exported.complete, exported.matched, exported.events.length], [true, systemCreates.length, systemCreates.length]);
  check('the export is the answer to a stated filter, so it cannot read as the whole trail',
    exported.filter, { operation: 'systems.create', from: startedAt });
  check('the digest covers exactly the events carried, so a recipient can check the file it holds',
    exported.digest, digest(exported.events));
  check('the file is offered as a download rather than rendered into a page',
    (await auditor.call(exportUrl({ operation: 'systems.create' }))).headers.get('content-disposition'),
    'attachment; filename="orvia-audit-trail.json"');
  check('reading the trail does not carry the authority to take it out of the installation',
    (await staff.call(exportUrl({ from: startedAt }))).status, 403);
  check('an actor who can neither read nor export is refused',
    (await member.call(exportUrl({}))).status, 403);
  // Measured immediately before the call, for the same reason as the read: the
  // export is itself an audited act and its own event lands afterwards.
  const everything = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.audit_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)).rows[0].n);
  // Either outcome is stated exactly, because the one outcome that must never
  // occur is the third: a shortened file that reads as a whole one. Which
  // branch applies depends on how much this installation has recorded, and both
  // are real -- a fresh database takes the first, one this suite has run
  // against many times takes the second.
  const whole = await auditor.call(exportUrl({}));
  check('an unfiltered export is the whole scoped trail, or a refusal to narrow the filter, and never a shortened file',
    everything > 5000
      ? [whole.status, await fieldCodes(whole)]
      : [whole.status, [S.AuditExport.parse(await whole.json()).matched]],
    everything > 5000 ? [400, ['matched_set_above_export_ceiling']] : [200, [everything]]);

  phase = 'reading is recorded';
  const reads = await events({ operation: 'list_audit_events', from: startedAt });
  check('reading the trail is itself an audited event, attributed to the reader',
    [reads.length > 0, reads.every(e => e.actor_domain === 'STAFF')], [true, true]);
  check('reading the coverage report is recorded too',
    (await events({ operation: 'audit_coverage', from: startedAt })).length > 0, true);

  // --- append-only, enforced below the application ----------------------------
  phase = 'append-only';
  const subject = systemCreates.find(e => e.resource_id === extra.id);
  if (!subject) throw new Error('The connector configured seconds ago is not in the trail');
  check('the act that was just performed is in the trail, against the record it acted on and nothing else',
    [subject.actor_domain, subject.corrections], ['STAFF', 0]);
  const original = (await db.query('SELECT * FROM app.audit_events WHERE id=$1', [subject.id])).rows[0];
  check('an audit event cannot be edited, even by a role that bypasses row-level security',
    await direct(`UPDATE app.audit_events SET operation='something.else' WHERE id=$1`, [subject.id]), 'REJECTED');
  check('an audit event cannot be removed', await direct('DELETE FROM app.audit_events WHERE id=$1', [subject.id]), 'REJECTED');

  // --- FR-M33-03: correction by appending -------------------------------------
  phase = 'correction authority';
  const correct = (eventId: string, as = owner, overrides: Record<string, unknown> = {}) =>
    as.call('/api/v1/admin/audit-corrections',
      { event_id: eventId, disputed: 'MISLEADING_WITHOUT_CONTEXT',
        correction: 'The connector was configured by the integration fixture, not by the named operator in person.', ...overrides }, key());
  check('reading the trail does not carry the authority to dispute what is in it',
    (await correct(subject.id, staff)).status, 403);
  check('an auditor may read the trail', (await auditor.call('/api/v1/admin/audit-coverage')).status, 200);
  check('an auditor who may take the trail away still may not dispute a record in it',
    (await correct(subject.id, auditor)).status, 403);
  check('an actor holding neither capability cannot read the trail at all',
    (await member.call('/api/v1/admin/audit-events')).status, 403);

  phase = 'correction';
  check('a correction naming an event that does not exist is refused, not created',
    (await correct(randomUUID())).status, 404);
  check('a correction that says nothing is refused',
    (await correct(subject.id, owner, { correction: 'wrong' })).status, 400);
  check('a dispute outside the declared vocabulary is refused',
    (await fieldCodes(await correct(subject.id, owner, { disputed: 'IT_LOOKED_WRONG' }))).length > 0, true);
  const correction = await body(S.AuditCorrection, await correct(subject.id));
  check('the correction names the event it disputes and states that the event is unchanged',
    [correction.event_id, correction.original_event_unchanged, correction.recorded_by === h.users.owner!.id], [subject.id, true, true]);
  check('the disputed event is byte-for-byte what it was before the dispute',
    (await db.query('SELECT * FROM app.audit_events WHERE id=$1', [subject.id])).rows[0], original);
  const reread = (await events({ operation: 'systems.create', from: startedAt })).find(e => e.id === subject.id)!;
  check('the event now reports that it is disputed, and reports nothing else differently',
    [reread.corrections, { ...reread, corrections: 0 }], [1, subject]);

  phase = 'correction is itself append-only';
  check('a correction cannot be edited',
    await direct(`UPDATE app.audit_corrections SET correction='Never mind.' WHERE id=$1`, [correction.id]), 'REJECTED');
  check('a correction cannot be withdrawn',
    await direct('DELETE FROM app.audit_corrections WHERE id=$1', [correction.id]), 'REJECTED');
  check('a correction cannot name an event in another organisation, because the reference carries the scope',
    await direct(`INSERT INTO app.audit_corrections(tenant_id,legal_entity_id,environment_id,id,event_id,disputed,correction,recorded_by)
      VALUES($1,$2,$3,$4,$5,'WRONG_ACTOR','Forged.',$6)`,
    [randomUUID(), scenario.scope.legal_entity_id, scenario.scope.environment_id, randomUUID(), subject.id, h.users.owner!.id]), 'REJECTED');
  check('there is no column on an audit event through which a correction could replace it',
    Number((await db.query(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='app' AND table_name='audit_events'
      AND (column_name LIKE '%supersed%' OR column_name LIKE '%correct%' OR column_name LIKE '%replac%' OR column_name LIKE '%hidden%')`)).rows[0].n), 0);

  writeEvidence('audit-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('audit-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
