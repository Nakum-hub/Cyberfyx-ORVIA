// M29 typed local import integration suite (FR-M29-04).
// Under test: one typed path driven end to end — rows land in quarantine, the
// preview names what each would collide with, a conflict blocks the apply until
// a named person decides it, and what reaches the inventory is asserted and
// unreviewed rather than anything this product observed. A second batch is
// purged instead, and the record that it arrived survives.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../packages/testing/src/evidence.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import * as S from '../../../packages/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/rehearsal permitted');
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
const direct = (sql: string, values: unknown[] = []) =>
  db.query(sql, values).then(() => 'accepted').catch((error: { code?: string }) => error.code ?? 'rejected');
async function body<T>(schema: { parse: (value: unknown) => T }, response: Response, expected = 201) {
  const value: unknown = await response.json();
  if (response.status !== expected) throw new Error(`Expected ${expected}, got ${response.status}: ${JSON.stringify(value).slice(0, 400)}`);
  return schema.parse(value);
}

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;
  const scope = [scenario.scope.tenant_id, scenario.scope.legal_entity_id, scenario.scope.environment_id];
  const unique = randomUUID().slice(0, 8);
  const captured = new Date().toISOString();
  const submit = (rows: unknown[], source = 'Inventory exported from the CRM administration console by the data owner.') =>
    staff.call('/api/v1/admin/imports', { kind: 'DATA_ASSET_INVENTORY', source_reference: source, captured_at: captured, rows }, key());
  const line = (n: number, name: string, kind = 'DATASET', description = 'Contact rows used for promotional sends.') =>
    ({ line_number: n, system_id: scenario.system.id, kind, name, description, categories: [] });

  // --- one typed path, and nothing outside it -----------------------------------
  phase = 'typed only';
  const unknownSystem = await submit([{ ...line(1, `Asset ${unique}`), system_id: randomUUID() }]);
  check('an import naming a system this installation has never configured is refused',
    [unknownSystem.status, await fieldCodes(unknownSystem)], [400, ['unknown_system_in_import']]);
  check('a row outside the declared shape is refused rather than partially stored',
    (await submit([{ ...line(1, `Asset ${unique}`), extra_column: 'x' }])).status, 400);
  check('and an import that will not say when it is a snapshot of is refused',
    (await staff.call('/api/v1/admin/imports',
      { kind: 'DATA_ASSET_INVENTORY', source_reference: 'Somewhere.', rows: [line(1, `Asset ${unique}`)] }, key())).status, 400);

  // --- quarantine and preview -----------------------------------------------------
  phase = 'quarantine';
  const first = await body(S.ImportBatch, await submit([line(1, `Fresh asset ${unique}`), line(2, `Second asset ${unique}`)]));
  check('rows land in quarantine and nothing is applied yet',
    [first.state, first.settled_at, first.rows.length], ['QUARANTINED', null, 2]);
  check('neither row collides with anything in this inventory',
    [first.rows.map(r => r.conflict), first.undecided_conflicts], [['NEW', 'NEW'], 0]);
  check('nothing has reached the inventory from quarantine',
    Number((await db.query(
      `SELECT count(*)::int AS n FROM app.data_assets WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
        AND document->>'name' LIKE $4`, [...scope, `%asset ${unique}`])).rows[0].n), 0);

  // --- applying, and what actually gets written -----------------------------------
  phase = 'apply';
  const applied = await body(S.ImportBatch, await staff.call(`/api/v1/admin/imports/${first.id}/apply`, {}, key()), 200);
  check('the import settles as applied and says when and by whom',
    [applied.state, applied.settled_at !== null, applied.settled_by !== null], ['APPLIED', true, true]);
  check('every row names the asset it became',
    applied.rows.every(r => r.created_asset_id !== null), true);
  // The clause the whole path exists to honour, checked against the row that
  // was actually written rather than against the response.
  const written = (await db.query(
    `SELECT provenance,review_state,last_seen_at,fresh_until FROM app.data_assets
      WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4`,
    [...scope, applied.rows[0]!.created_asset_id])).rows[0];
  check('an imported asset is asserted, unreviewed, and carries no observation at all',
    [written.provenance, written.review_state, written.last_seen_at, written.fresh_until],
    ['ASSERTED', 'UNREVIEWED', null, null]);
  check('and the batch says so structurally rather than only in its limits',
    [applied.imported_rows_are_asserted_never_observed,
      applied.a_source_snapshot_is_not_evidence_that_any_control_is_in_force], [true, true]);
  check('applying twice is refused rather than silently creating the inventory again',
    (await staff.call(`/api/v1/admin/imports/${first.id}/apply`, {}, key())).status, 409);
  check('and the database refuses to move a settled import back to quarantine',
    await direct(`UPDATE app.import_batches SET state='QUARANTINED',settled_at=NULL,settled_by=NULL
      WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4`, [...scope, first.id]), '23514');

  // --- conflict handling ------------------------------------------------------------
  phase = 'conflict';
  // The same name in the same system, described differently. This is the
  // collision that matters: applied blindly it would create a second record of
  // one stored thing, and nobody would know which their retention decisions hit.
  const second = await body(S.ImportBatch, await submit([
    line(1, `Fresh asset ${unique}`, 'DERIVED_COPY', 'A nightly extract the source calls by the same name.'),
    line(2, `Third asset ${unique}`),
  ]));
  check('a row that disagrees with an existing asset is reported as a conflict, naming it',
    [second.rows[0]!.conflict, second.rows[0]!.existing_asset_id === applied.rows[0]!.created_asset_id,
      second.rows[1]!.conflict], ['CONFLICTS_WITH_EXISTING', true, 'NEW']);
  check('and the undecided count is what stands between quarantine and inventory',
    second.undecided_conflicts, 1);
  const blocked = await staff.call(`/api/v1/admin/imports/${second.id}/apply`, {}, key());
  check('the import will not apply while a conflict is undecided',
    [blocked.status, await fieldCodes(blocked)], [400, ['conflicting_rows_are_undecided']]);
  const notAConflict = await staff.call(`/api/v1/admin/imports/${second.id}/decisions`,
    { line_number: 2, decision: 'IMPORT_AS_NEW' }, key());
  check('a row that collides with nothing cannot be decided to clear the queue',
    [notAConflict.status, await fieldCodes(notAConflict)], [400, ['row_is_not_in_conflict']]);

  const decided = await body(S.ImportBatch, await staff.call(`/api/v1/admin/imports/${second.id}/decisions`,
    { line_number: 1, decision: 'SKIP_ROW' }, key()), 200);
  check('deciding names who decided it and when, and clears the blocker',
    [decided.rows[0]!.decision, decided.rows[0]!.decided_by !== null, decided.undecided_conflicts],
    ['SKIP_ROW', true, 0]);
  check('a decision already taken cannot be quietly replaced',
    (await staff.call(`/api/v1/admin/imports/${second.id}/decisions`,
      { line_number: 1, decision: 'IMPORT_AS_NEW' }, key())).status, 409);

  const settled = await body(S.ImportBatch, await staff.call(`/api/v1/admin/imports/${second.id}/apply`, {}, key()), 200);
  check('the skipped row became nothing and the clean row became an asset',
    [settled.rows[0]!.created_asset_id, settled.rows[1]!.created_asset_id !== null], [null, true]);
  check('so the duplicate was never created',
    Number((await db.query(
      `SELECT count(*)::int AS n FROM app.data_assets WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
        AND document->>'name'=$4`, [...scope, `Fresh asset ${unique}`])).rows[0].n), 1);

  // --- purge -------------------------------------------------------------------------
  phase = 'purge';
  const third = await body(S.ImportBatch, await submit([line(1, `Mistaken asset ${unique}`)],
    'Inventory exported from the wrong environment by the data owner.'));
  const quarantinedRows = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.import_rows WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND batch_id=$4`,
    [...scope, third.id])).rows[0].n);
  check('the third batch is in quarantine with its rows stored', [third.state, quarantinedRows], ['QUARANTINED', 1]);
  const thin = await staff.call(`/api/v1/admin/imports/${third.id}/purge`, { reason: 'oops' }, key());
  check('a purge that will not say why is refused', thin.status, 400);
  const purged = await body(S.ImportBatch, await staff.call(`/api/v1/admin/imports/${third.id}/purge`,
    { reason: 'Exported from the wrong environment; these rows describe another installation.' }, key()), 200);
  check('purging removes the rows and states its reason',
    [purged.state, purged.rows.length, purged.purge_reason !== null], ['PURGED', 0, true]);
  check('the rows really are gone from the database',
    Number((await db.query(
      `SELECT count(*)::int AS n FROM app.import_rows WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND batch_id=$4`,
      [...scope, third.id])).rows[0].n), 0);
  check('nothing from the purged batch reached the inventory',
    Number((await db.query(
      `SELECT count(*)::int AS n FROM app.data_assets WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
        AND document->>'name'=$4`, [...scope, `Mistaken asset ${unique}`])).rows[0].n), 0);
  // The whole point of keeping the envelope: a purge stays distinguishable from
  // an import nobody ever submitted.
  check('but the record that the import arrived survives, and cannot be deleted',
    [(await body(S.ImportBatch, await staff.call(`/api/v1/admin/imports/${third.id}`), 200)).state,
      await direct(`DELETE FROM app.import_batches WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4`, [...scope, third.id])],
    ['PURGED', '23514']);
  check('a purged import cannot then be applied', (await staff.call(`/api/v1/admin/imports/${third.id}/apply`, {}, key())).status, 409);

  // --- provenance and authority -------------------------------------------------------
  phase = 'authority';
  const listed = S.schemas.ImportBatchList.parse(await (await staff.call('/api/v1/admin/imports?limit=100')).json());
  check('every batch is listed with the source the customer named and the moment it describes',
    [listed.items.some(i => i.id === first.id), listed.items.some(i => i.id === third.id),
      listed.items.find(i => i.id === third.id)!.source_reference.includes('wrong environment')], [true, true, true]);
  const auditor = await h.login('auditor');
  check('an auditor holding graph.read may review what was imported',
    (await auditor.call(`/api/v1/admin/imports/${first.id}`)).status, 200);
  check('but may not submit one', (await auditor.call('/api/v1/admin/imports',
    { kind: 'DATA_ASSET_INVENTORY', source_reference: 'An auditor should not be able to do this.', captured_at: captured, rows: [line(1, `Nope ${unique}`)] }, key())).status, 403);
  check('and may not apply or purge one',
    [(await auditor.call(`/api/v1/admin/imports/${second.id}/apply`, {}, key())).status,
      (await auditor.call(`/api/v1/admin/imports/${second.id}/purge`, { reason: 'An auditor should not be able to do this.' }, key())).status],
    [403, 403]);

  writeEvidence('imports-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('imports-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
