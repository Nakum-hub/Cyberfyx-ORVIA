// M29 typed local import invariants (FR-M29-04). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImportBatch, ImportKind, ImportPurge, ImportRowPreview, ImportSubmit, routes, schemas,
} from '../../packages/contracts/src/index.ts';
import { example, uuid, sampleTime } from '../../packages/contracts/src/examples.ts';

const batch = () => structuredClone(example('ImportBatch')) as Record<string, unknown>;
const rows = () => batch().rows as Record<string, unknown>[];
const clean = () => rows()[0];
const conflicting = () => rows()[1];
const row = { line_number: 1, system_id: uuid(860), kind: 'DATASET' as const,
  name: 'Marketing contact list', description: 'Contact rows used for promotional sends.', categories: [] };

test('there is exactly one approved typed import path, and no general upload', () => {
  // OPEN-11 permits one typed path built fully before another parser exists.
  // A second kind is a contract change that fails this test, which is the
  // review that rule is asking for.
  assert.deepEqual([...ImportKind.options], ['DATA_ASSET_INVENTORY']);
  // The schema is the parser. There is no field through which a file, a blob or
  // a format name could arrive, so there is nothing to parse loosely.
  const submit = { kind: 'DATA_ASSET_INVENTORY' as const, source_reference: 'Exported from the CRM console.',
    captured_at: sampleTime, rows: [row] };
  assert.equal(ImportSubmit.parse(submit).rows.length, 1);
  for (const smuggled of [
    { file: 'inventory.csv' }, { body_base64: 'aGVsbG8=' }, { format: 'CSV' },
    { delimiter: ',' }, { raw: 'a,b,c' }, { table: 'data_assets' },
  ]) {
    assert.throws(() => ImportSubmit.parse({ ...submit, ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto an import`);
  }
  // And a row is the declared shape and nothing else.
  assert.throws(() => ImportSubmit.parse({ ...submit, rows: [{ ...row, extra_column: 'x' }] }));
});

test('an import must say what it is a snapshot of, and when', () => {
  const submit = { kind: 'DATA_ASSET_INVENTORY' as const, source_reference: 'Exported from the CRM console.',
    captured_at: sampleTime, rows: [row] };
  assert.equal(ImportSubmit.parse(submit).captured_at, sampleTime);
  // A snapshot with no moment is not a snapshot, and a source nobody named is
  // provenance in name only.
  assert.throws(() => ImportSubmit.parse({ ...submit, captured_at: undefined }));
  assert.throws(() => ImportSubmit.parse({ ...submit, source_reference: '' }));
  assert.throws(() => ImportSubmit.parse({ ...submit, rows: [] }));
  // Two rows claiming the same line cannot both be previewed or decided.
  assert.throws(() => ImportSubmit.parse({ ...submit, rows: [row, { ...row, name: 'Other' }] }));
});

test('a source snapshot is never evidence that a control is in force', () => {
  const parsed = ImportBatch.parse(batch());
  assert.equal(parsed.imported_rows_are_asserted_never_observed, true);
  assert.equal(parsed.a_source_snapshot_is_not_evidence_that_any_control_is_in_force, true);
  // Neither can be flipped, so no build can start presenting imported rows as
  // something this product observed.
  assert.throws(() => ImportBatch.parse({ ...batch(), imported_rows_are_asserted_never_observed: false }));
  assert.throws(() => ImportBatch.parse({ ...batch(), a_source_snapshot_is_not_evidence_that_any_control_is_in_force: false }));
  // There is no field on a row through which an observation could be claimed.
  for (const smuggled of [
    { provenance: 'OBSERVED' }, { last_seen_at: sampleTime }, { fresh_until: sampleTime },
    { verified: true }, { in_force: true },
  ]) {
    assert.throws(() => ImportRowPreview.parse({ ...clean(), ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto an import row`);
  }
});

test('a preview names what each row would collide with, or that it collides with nothing', () => {
  const parsed = ImportBatch.parse(batch());
  assert.deepEqual(parsed.rows.map(r => r.conflict), ['NEW', 'CONFLICTS_WITH_EXISTING']);
  assert.equal(parsed.rows[0]!.existing_asset_id, null);
  assert.notEqual(parsed.rows[1]!.existing_asset_id, null);
  // "There is a conflict somewhere" is not a preview: a conflicting row names
  // what it conflicts with, and a clean one names nothing.
  assert.throws(() => ImportRowPreview.parse({ ...clean(), conflict: 'CONFLICTS_WITH_EXISTING' }));
  assert.throws(() => ImportRowPreview.parse({ ...conflicting(), conflict: 'NEW' }));
});

test('a decided row names who decided it, and a skipped row created nothing', () => {
  const undecided = ImportRowPreview.parse(conflicting());
  assert.deepEqual([undecided.decision, undecided.decided_by, undecided.decided_at], [null, null, null]);
  const decided = { ...conflicting(), decision: 'IMPORT_AS_NEW', decided_by: uuid(861), decided_at: sampleTime };
  assert.equal(ImportRowPreview.parse(decided).decision, 'IMPORT_AS_NEW');
  assert.throws(() => ImportRowPreview.parse({ ...decided, decided_by: null }));
  assert.throws(() => ImportRowPreview.parse({ ...conflicting(), decision: 'IMPORT_AS_NEW' }));
  // A row somebody chose to skip cannot also have become an asset.
  assert.throws(() => ImportRowPreview.parse({
    ...conflicting(), decision: 'SKIP_ROW', decided_by: uuid(861), decided_at: sampleTime, created_asset_id: uuid(862),
  }));
});

test('nothing becomes inventory while a conflict is undecided', () => {
  const parsed = ImportBatch.parse(batch());
  assert.deepEqual([parsed.state, parsed.undecided_conflicts], ['QUARANTINED', 1]);
  // The count is the undecided conflicts and cannot be set to a comfortable
  // number while the rows say otherwise.
  assert.throws(() => ImportBatch.parse({ ...batch(), undecided_conflicts: 0 }));
  // Applying with anything outstanding is refused by the schema, before any
  // code is reached.
  assert.throws(() => ImportBatch.parse({ ...batch(), state: 'APPLIED', settled_at: sampleTime, settled_by: uuid(863) }));
  // A settled import says when, and a quarantined one does not.
  assert.throws(() => ImportBatch.parse({ ...batch(), settled_at: sampleTime }));
});

test('a purge removes the rows and keeps the record that they arrived', () => {
  assert.equal(ImportBatch.parse(batch()).purging_removes_the_rows_and_keeps_this_record, true);
  assert.throws(() => ImportBatch.parse({ ...batch(), purging_removes_the_rows_and_keeps_this_record: false }));
  const purged = { ...batch(), state: 'PURGED', settled_at: sampleTime, settled_by: uuid(864),
    purge_reason: 'Exported from the wrong environment by mistake.', rows: [], undecided_conflicts: 0 };
  assert.equal(ImportBatch.parse(purged).state, 'PURGED');
  // A purge states its reason, and a purged batch keeps no rows -- if it kept
  // them the purge would not have happened.
  assert.throws(() => ImportBatch.parse({ ...purged, purge_reason: null }));
  assert.throws(() => ImportBatch.parse({ ...purged, rows: rows(), undecided_conflicts: 1 }));
  // And a reason nobody wrote is not a reason.
  assert.throws(() => ImportPurge.parse({ reason: 'oops' }));
  assert.equal(ImportPurge.parse({ reason: 'Exported from the wrong environment by mistake.' }).reason.length > 10, true);
});

test('importing is a write to the graph, and previewing is a read', () => {
  const byId = (id: string) => routes.find(r => r.id === id)!;
  for (const id of ['list_imports', 'import_batch']) {
    assert.equal(byId(id).method, 'get', `${id} is not a read`);
    assert.equal(byId(id).capability, 'graph.read');
  }
  for (const id of ['submit_import', 'decide_import_row', 'apply_import', 'purge_import']) {
    const route = byId(id);
    assert.equal(route.method, 'post', `${id} is not a write`);
    assert.equal(route.capability, 'graph.write', `${id} is not held by the graph write authority`);
    assert.equal(route.authority, 'STAFF', `${id} is not staff-only`);
    assert.equal(route.idempotency, true, `${id} is not idempotent`);
    assert.ok(schemas[route.response], `${id} has no registered response schema`);
  }
  // Six routes and no seventh: there is no route that uploads a file, and none
  // that writes inventory without passing through quarantine first.
  assert.deepEqual(routes.filter(r => /\/imports/.test(r.path)).map(r => r.id).sort(),
    ['apply_import', 'decide_import_row', 'import_batch', 'list_imports', 'purge_import', 'submit_import']);
  assert.ok(!routes.some(r => ['upload', 'ingest_file', 'bulk_insert'].some(word => r.id.includes(word))));
});
