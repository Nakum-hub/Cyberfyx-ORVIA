// M32 backup declaration and restore reconciliation integration suite (FR-M32-03).
// Under test: the one failure a backup subsystem exists to prevent in a privacy
// product -- a restore that quietly reinstates consent somebody has since
// withdrawn. The archive is the customer's; the refusal is ORVIA's.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
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
async function body<T>(schema: { parse: (value: unknown) => T }, response: Response, expected = 201) {
  const value: unknown = await response.json();
  if (response.status !== expected) throw new Error(`Expected ${expected}, got ${response.status}: ${JSON.stringify(value).slice(0, 400)}`);
  return schema.parse(value);
}

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const admin = scenario.author;           // ORG_ADMIN: may record, may not release.
  const owner = scenario.owner;            // ORG_SUPER_ADMIN: holds restore.release.
  const scope = [scenario.scope.tenant_id, scenario.scope.legal_entity_id, scenario.scope.environment_id];
  const principalId = h.users.alice!.principal_id!;

  // --- FR-M32-03: the snapshot is a statement, never an archive ------------------
  phase = 'declaration';
  // The scanner in scripts/local-hygiene.mjs looks for a literal PEM header, and
  // it should: a private key in a source file is exactly what it exists to catch.
  // This fixture needs that shape as *input* to prove the field refuses it, so it
  // is assembled here rather than written out, and the scanner stays strict.
  const pemHeader = ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' ');

  // A key would be the worst thing that could end up in this field, so the
  // pattern refuses anything shaped like one before the row is written.
  for (const [what, pasted] of [
    ['a PEM body', `${pemHeader} MIIEvQIBADANBg`],
    ['a base64 blob', 'c3VwZXItc2VjcmV0LWJhY2t1cC1rZXk='],
    ['a sentence', 'the key is in the safe'],
  ] as const) {
    const refused = await admin.call('/api/v1/admin/backup-snapshots',
      { key_reference: pasted, covers: ['CONFIGURATION'], note: 'Nightly archive.' }, key());
    check(`the key reference refuses ${what} rather than storing it`, refused.status, 400);
  }

  const declared = await body(S.BackupSnapshot, await admin.call('/api/v1/admin/backup-snapshots',
    { key_reference: 'vault://synthetic/backup-key', covers: ['CONFIGURATION', 'DOMAIN_RECORDS'], note: 'Nightly archive taken by the customer’s own tooling.' }, key()));
  check('the snapshot never claims this product made, holds or verified the archive',
    [declared.archive_is_held_by_the_customer, declared.encryption_was_not_verified_by_this_product], [true, true]);
  check('it counts exactly the domains it says it covers',
    [declared.counts.map(c => c.domain).sort(), declared.covers.slice().sort()],
    [['CONFIGURATION', 'DOMAIN_RECORDS'], ['CONFIGURATION', 'DOMAIN_RECORDS']]);
  // The counts are what this installation read, not what the caller asserted.
  const actual = (await db.query(
    `SELECT (SELECT count(*)::int FROM app.policy_versions WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3) AS configuration,
            (SELECT count(*)::int FROM app.consent_aggregates WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3) AS records`, scope)).rows[0];
  check('the counts are read from this installation rather than supplied by the caller',
    declared.counts.map(c => [c.domain, c.rows]),
    [['CONFIGURATION', Number(actual.configuration)], ['DOMAIN_RECORDS', Number(actual.records)]]);
  check('and the statement carries a digest over what was read',
    /^[a-f0-9]{64}$/.test(declared.state_digest), true);

  // A declared snapshot is a record of a moment. Changing it afterwards would
  // let the moment be rewritten to match whatever the restore turned out to be.
  const tamper = await db.query(
    `UPDATE app.backup_snapshots SET note='rewritten' WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4`,
    [...scope, declared.id]).then(() => 'accepted').catch((error: { code?: string }) => error.code);
  check('the database itself refuses to let a declared snapshot be changed', tamper, '23514');

  // --- the case the module exists for --------------------------------------------
  phase = 'a decision changes after the snapshot';
  // Granted before the snapshot, withdrawn after it. An archive taken between
  // the two carries the grant; resuming from it would act on permission that no
  // longer exists.
  await scenario.change('grant');
  const snapshot = await body(S.BackupSnapshot, await admin.call('/api/v1/admin/backup-snapshots',
    { key_reference: 'vault://synthetic/backup-key', covers: ['DOMAIN_RECORDS'], note: 'Archive taken while the grant stood.' }, key()));
  await scenario.change('withdraw');

  const started = await body(S.RestoreReconciliation, await admin.call('/api/v1/admin/restore-runs',
    { snapshot_id: snapshot.id, note: 'Restored into an isolated environment from the nightly archive.' }, key()));
  check('a restore begins in quarantine and says so', [started.state, started.released_at], ['QUARANTINED', null]);
  const mine = (r: S.RestoreReconciliationValue) =>
    r.conflicts.find(x => x.principal_id === principalId && x.purpose_id === scenario.purpose.id);
  check('the withdrawal made after the snapshot is reported as a conflict',
    [mine(started)?.state_at_snapshot, mine(started)?.state_now, (mine(started)?.decisions_since_snapshot ?? 0) >= 1],
    ['GRANTED', 'WITHDRAWN', true]);
  check('the outstanding count is the conflicts nobody has decided, not a summary',
    started.outstanding, started.conflicts.filter(c => c.decision === null).length);
  check('and nothing is attributed to anyone yet',
    [mine(started)?.decision, mine(started)?.acknowledged_by, mine(started)?.acknowledged_at], [null, null, null]);

  // --- the refusal ------------------------------------------------------------------
  phase = 'refusal';
  const early = await owner.call(`/api/v1/admin/restore-runs/${started.id}/release`, {}, key());
  check('a restore cannot leave quarantine while a changed decision is outstanding',
    [early.status, await fieldCodes(early)],
    [400, ['consent_decisions_changed_since_snapshot_are_outstanding']]);
  // Releasing is a separate authority from carrying the restore out, so the
  // person who ran it is not automatically the person who signs it off.
  const byAdmin = await admin.call(`/api/v1/admin/restore-runs/${started.id}/release`, {}, key());
  check('an administrator who may record a restore may not release one', byAdmin.status, 403);
  const auditor = await h.login('auditor');
  check('an auditor may read the reconciliation', (await auditor.call(`/api/v1/admin/restore-runs/${started.id}`)).status, 200);
  check('but may not release it', (await auditor.call(`/api/v1/admin/restore-runs/${started.id}/release`, {}, key())).status, 403);

  // --- a named person takes responsibility, one decision at a time ------------------
  phase = 'acknowledgement';
  const unrelated = await admin.call(`/api/v1/admin/restore-runs/${started.id}/acknowledgements`,
    { principal_id: h.users.bob!.principal_id, purpose_id: scenario.purpose.id, decision: 'CURRENT_STATE_PREVAILS', basis: 'Nothing changed for this pair.' }, key());
  check('a pair whose decision never changed cannot be acknowledged to clear the queue',
    [unrelated.status, await fieldCodes(unrelated)], [404, ['no_such_conflict_in_this_restore']]);

  let current = started;
  for (const conflict of started.conflicts) {
    current = await body(S.RestoreReconciliation, await admin.call(`/api/v1/admin/restore-runs/${started.id}/acknowledgements`,
      { principal_id: conflict.principal_id, purpose_id: conflict.purpose_id, decision: 'CURRENT_STATE_PREVAILS',
        basis: 'The person withdrew after the archive was taken and their withdrawal stands.' }, key()), 200);
  }
  check('every conflict now names who decided it and when',
    [current.outstanding, current.conflicts.every(c => c.decision !== null && c.acknowledged_by !== null && c.acknowledged_at !== null)],
    [0, true]);
  const twice = await admin.call(`/api/v1/admin/restore-runs/${started.id}/acknowledgements`,
    { principal_id: principalId, purpose_id: scenario.purpose.id, decision: 'RESTORED_STATE_PREVAILS', basis: 'Second thoughts.' }, key());
  check('a decision already taken cannot be quietly replaced with a different one',
    [twice.status, await fieldCodes(twice)], [409, ['conflict_already_decided']]);

  // --- leaving quarantine ------------------------------------------------------------
  phase = 'release';
  const released = await body(S.RestoreReconciliation,
    await owner.call(`/api/v1/admin/restore-runs/${started.id}/release`, {}, key()), 200);
  check('the restore leaves quarantine only once nothing is outstanding, and says when',
    [released.state, released.outstanding, released.released_at !== null], ['RELEASED', 0, true]);
  check('and it never claims to have reinstated anything',
    released.releasing_never_reinstates_a_withdrawal, true);
  check('releasing twice is refused rather than silently repeated',
    (await owner.call(`/api/v1/admin/restore-runs/${started.id}/release`, {}, key())).status, 409);
  const backwards = await db.query(
    `UPDATE app.restore_runs SET state='QUARANTINED',released_at=NULL,released_by=NULL
      WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4`, [...scope, started.id])
    .then(() => 'accepted').catch((error: { code?: string }) => error.code);
  check('the database refuses to return a released restore to quarantine', backwards, '23514');

  // --- the claim that matters ---------------------------------------------------------
  phase = 'the withdrawal still stands';
  // The whole point. A restore ran, it was reconciled, it was released -- and
  // the person who withdrew is still withdrawn. Nothing in this flow re-grants.
  const aggregate = (await db.query(
    `SELECT state FROM app.consent_aggregates WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND principal_id=$4 AND purpose_id=$5`, [...scope, principalId, scenario.purpose.id])).rows[0];
  check('the withdrawal stands after the restore was released', aggregate.state, 'WITHDRAWN');
  check('and the principal is still shown as withdrawn in their own portal',
    (await scenario.choice()).consent_status, 'WITHDRAWN');
  check('deciding that the current state prevails is recorded as such, not as a restoration',
    (await db.query(
      `SELECT decision FROM app.restore_acknowledgements WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
        AND restore_id=$4 AND principal_id=$5 AND purpose_id=$6`, [...scope, started.id, principalId, scenario.purpose.id])).rows[0].decision,
    'CURRENT_STATE_PREVAILS');

  // --- what this record makes measurable elsewhere ------------------------------------
  phase = 'measurable elsewhere';
  // Two places reported an absence before this requirement existed. Both are
  // now answered from the record, and neither is answered from the archive.
  const readiness = S.OperationalReadiness.parse(await (await owner.call('/api/v1/admin/readiness')).json());
  const backupStatus = readiness.signals.find(s => s.signal === 'BACKUP_STATUS')!;
  check('backup status is now a measurement rather than an absence',
    [backupStatus.measured, backupStatus.unit, backupStatus.value !== null], [true, 'SECONDS', true]);
  check('and it says what a declaration is not evidence of',
    backupStatus.counted.includes('not evidence that the archive exists'), true);
  const preflight = S.PreflightReport.parse(await (await owner.call('/api/v1/admin/preflight')).json());
  const gate = preflight.gates.find(g => g.kind === 'BACKUP_TARGET')!;
  check('the preflight backup gate is earned by a reconciled restore, not asserted',
    [gate.verdict, gate.remedy, preflight.failing.includes('BACKUP_TARGET')], ['PASSED', null, false]);
  check('the gate still states that this product cannot see the archive',
    gate.checked.includes('does not make, hold or read the archive'), true);

  // --- minimisation --------------------------------------------------------------------
  phase = 'minimisation';
  check('the snapshot list is a read of statements and carries no archive content',
    Object.keys(declared).sort(),
    ['archive_is_held_by_the_customer', 'counts', 'covers', 'encryption_was_not_verified_by_this_product',
      'id', 'key_reference', 'limits', 'note', 'state_digest', 'taken_at', 'taken_by']);
  const list = S.schemas.BackupSnapshotList.parse(await (await owner.call('/api/v1/admin/backup-snapshots?limit=100')).json());
  check('both declared snapshots are listed for a reader holding health.read',
    [list.items.some(i => i.id === declared.id), list.items.some(i => i.id === snapshot.id)], [true, true]);
  check('a member without the capability is refused the list',
    (await (await h.login('member')).call('/api/v1/admin/backup-snapshots')).status, 403);

  writeEvidence('restore-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('restore-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
