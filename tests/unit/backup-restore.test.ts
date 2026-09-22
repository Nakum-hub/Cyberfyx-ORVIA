// M32 backup declaration and restore reconciliation invariants (FR-M32-03). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BackupSnapshot, BackupSnapshotCreate, ConsentConflict, RestoreReconciliation, routes, schemas,
} from '../../packages/contracts/src/index.ts';
import { example } from '../../packages/contracts/src/examples.ts';

// The scanner in scripts/local-hygiene.mjs looks for a literal PEM header, and
// it should: a private key in a source file is exactly what it exists to catch.
// This fixture needs that shape as *input* to prove the field refuses it, so it
// is assembled here rather than written out, and the scanner stays strict.
const pemHeader = ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' ');

const snapshot = () => structuredClone(example('BackupSnapshot')) as Record<string, unknown>;
const restore = () => structuredClone(example('RestoreReconciliation')) as Record<string, unknown>;
const conflict = () => (restore().conflicts as Record<string, unknown>[])[0];

test('a declared snapshot never claims this product made, held or verified the archive', () => {
  const parsed = BackupSnapshot.parse(snapshot());
  assert.equal(parsed.archive_is_held_by_the_customer, true);
  assert.equal(parsed.encryption_was_not_verified_by_this_product, true);
  // Neither statement can be flipped, so no installation can report a snapshot
  // while implying ORVIA took it or checked the cipher behind it.
  assert.throws(() => BackupSnapshot.parse({ ...snapshot(), archive_is_held_by_the_customer: false }));
  assert.throws(() => BackupSnapshot.parse({ ...snapshot(), encryption_was_not_verified_by_this_product: false }));
  // And there is no field in which the archive itself, or a claim about it,
  // could be recorded.
  for (const smuggled of [
    { archive_path: '/mnt/backups/nightly.tar.gz' }, { archive_bytes: 4096 }, { verified: true },
    { restorable: true }, { encryption_algorithm: 'AES-256-GCM' }, { key: 'AKIA0000000000000000' },
  ]) {
    assert.throws(() => BackupSnapshot.parse({ ...snapshot(), ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto a snapshot`);
  }
});

test('the key reference is a reference, and the shape of a key does not fit in it', () => {
  const base = { key_reference: 'vault://synthetic/backup-key', covers: ['CONFIGURATION' as const], note: 'Nightly archive.' };
  assert.equal(BackupSnapshotCreate.parse(base).key_reference, 'vault://synthetic/backup-key');
  // A pasted secret is the failure this field exists to prevent. Whitespace,
  // the PEM envelope and base64 padding are all refused by the pattern.
  for (const pasted of [
    `${pemHeader} MIIEvQIBADANBg`, 'aGVsbG8gd29ybGQ=', 'my backup key',
    'a'.repeat(121), 'ab',
  ]) {
    assert.throws(() => BackupSnapshotCreate.parse({ ...base, key_reference: pasted }), new RegExp('.'),
      `${pasted.slice(0, 20)} was accepted as a key reference`);
  }
});

test('a snapshot counts exactly the domains it says it covers', () => {
  const parsed = BackupSnapshot.parse(snapshot());
  assert.deepEqual(parsed.counts.map(c => c.domain).sort(), parsed.covers.slice().sort());
  // Claiming coverage of a domain nothing was counted for, and counting a
  // domain the snapshot does not claim to cover, are the same lie in two
  // directions: both make the digest describe a different set than the record.
  assert.throws(() => BackupSnapshot.parse({ ...snapshot(), covers: ['CONFIGURATION', 'WORKFLOW', 'EVIDENCE', 'DOMAIN_RECORDS'] }));
  assert.throws(() => BackupSnapshot.parse({ ...snapshot(), counts: (snapshot().counts as unknown[]).slice(0, 1) }));
  // And a domain cannot be covered twice to inflate what was captured.
  assert.throws(() => BackupSnapshotCreate.parse({ key_reference: 'vault://k', covers: ['WORKFLOW', 'WORKFLOW'], note: 'x' }));
});

test('a conflict is a decision that changed, and it names who decided it or nobody', () => {
  const parsed = ConsentConflict.parse(conflict());
  assert.notEqual(parsed.state_at_snapshot, parsed.state_now);
  // An unchanged decision is not a conflict and cannot be listed as one, which
  // is what stops a reconciliation padding its list to look thorough.
  assert.throws(() => ConsentConflict.parse({ ...conflict(), state_at_snapshot: 'WITHDRAWN', state_now: 'WITHDRAWN' }));
  // Decided and undecided are complete shapes. There is no half-acknowledged
  // conflict that carries a decision nobody is named for.
  assert.equal(parsed.decision, null);
  assert.deepEqual([parsed.acknowledged_by, parsed.acknowledged_at], [null, null]);
  assert.throws(() => ConsentConflict.parse({ ...conflict(), decision: 'CURRENT_STATE_PREVAILS' }));
  const decided = { ...conflict(), decision: 'CURRENT_STATE_PREVAILS', acknowledged_by: parsed.principal_id, acknowledged_at: (restore() as { reconciled_at: string }).reconciled_at };
  assert.equal(ConsentConflict.parse(decided).decision, 'CURRENT_STATE_PREVAILS');
  assert.throws(() => ConsentConflict.parse({ ...decided, acknowledged_by: null }));
  assert.throws(() => ConsentConflict.parse({ ...decided, acknowledged_at: null }));
});

test('a restore leaves quarantine only when nothing is outstanding', () => {
  const parsed = RestoreReconciliation.parse(restore());
  assert.deepEqual([parsed.state, parsed.outstanding, parsed.released_at], ['QUARANTINED', 1, null]);
  // The count is the undecided conflicts. It cannot be set to a comfortable
  // number while the list says otherwise.
  assert.throws(() => RestoreReconciliation.parse({ ...restore(), outstanding: 0 }));
  // Releasing with work outstanding is the failure this module exists to
  // refuse, and the schema refuses it before any code is reached.
  assert.throws(() => RestoreReconciliation.parse({ ...restore(), state: 'RELEASED' }));
  // A released restore says when, and a quarantined one does not.
  assert.throws(() => RestoreReconciliation.parse({ ...restore(), released_at: (restore() as { reconciled_at: string }).reconciled_at }));
  const clean = { ...restore(), conflicts: [], outstanding: 0 };
  assert.equal(RestoreReconciliation.parse(clean).state, 'QUARANTINED');
  const released = { ...clean, state: 'RELEASED', released_at: (restore() as { reconciled_at: string }).reconciled_at };
  assert.equal(RestoreReconciliation.parse(released).state, 'RELEASED');
  assert.throws(() => RestoreReconciliation.parse({ ...released, released_at: null }));
});

test('releasing a restore never reinstates a withdrawal, and cannot say it did', () => {
  assert.equal(RestoreReconciliation.parse(restore()).releasing_never_reinstates_a_withdrawal, true);
  assert.throws(() => RestoreReconciliation.parse({ ...restore(), releasing_never_reinstates_a_withdrawal: false }));
  // Nor is there any field in which a restore could report having re-granted,
  // reapplied or reinstated anything.
  for (const smuggled of [
    { reinstated: 1 }, { consents_restored: 4 }, { reapplied: true }, { overwrote_current_state: true },
  ]) {
    assert.throws(() => RestoreReconciliation.parse({ ...restore(), ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto a reconciliation`);
  }
});

test('releasing a restore is a separate authority from carrying one out', () => {
  const byId = (id: string) => routes.find(r => r.id === id)!;
  // Anyone who may write configuration can declare a snapshot and start a
  // restore. Only the release -- the act that lets restored data back into use
  // -- sits behind its own capability, so the person who ran the restore is not
  // automatically the person who signs it off.
  assert.equal(byId('declare_snapshot').capability, 'configuration.write');
  assert.equal(byId('start_restore').capability, 'configuration.write');
  assert.equal(byId('acknowledge_conflict').capability, 'configuration.write');
  assert.equal(byId('release_restore').capability, 'restore.release');
  for (const id of ['declare_snapshot', 'start_restore', 'acknowledge_conflict', 'release_restore']) {
    const route = byId(id);
    assert.equal(route.method, 'post', `${id} is not a write`);
    assert.equal(route.authority, 'STAFF', `${id} is not staff-only`);
    assert.equal(route.idempotency, true, `${id} is not idempotent`);
    assert.ok(schemas[route.response], `${id} has no registered response schema`);
  }
  // Reading the record is a read, and these six are the whole surface: there is
  // no route that deletes, purges or rewrites a restore run or a snapshot, so
  // what was restored and what was decided stays answerable.
  assert.equal(byId('restore_run').method, 'get');
  assert.equal(byId('list_backup_snapshots').method, 'get');
  assert.deepEqual(routes.filter(r => /restore-runs|backup-snapshots/.test(r.path)).map(r => r.id).sort(),
    ['acknowledge_conflict', 'declare_snapshot', 'list_backup_snapshots', 'list_restore_runs', 'release_restore', 'restore_run', 'start_restore']);
});
