// WP15 / M15 Retention Management integration suite.
// The three rules under test: silence is not permission to delete, conflicting
// constraints need a reviewed decision rather than longest-wins, and a backup
// copy is never reported as erased.
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
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const later = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;  // ORG_ADMIN: retention.write, no retention.approve
  const owner = scenario.owner;   // ORG_SUPER_ADMIN: also retention.approve

  const asset = async (kind: string, validFrom: string, name = 'retention_' + randomUUID().slice(0, 8)) =>
    S.DataAsset.parse(await (await staff.call('/api/v1/admin/data-assets', {
      system_id: scenario.system.id, kind, parent_id: null, name,
      description: 'Synthetic copy under retention evaluation.', provenance: 'ASSERTED',
      valid_from: validFrom, categories: [],
    }, key())).json());
  const constraint = (assetId: string, body: Record<string, unknown>) =>
    staff.call('/api/v1/admin/retention/constraints', {
      data_asset_id: assetId, purpose_id: scenario.purpose.id, trigger: 'RECORD_CREATED',
      basis: 'STATUTORY_OBLIGATION', source_reference: 'Reviewed statutory schedule.',
      minimum_days: null, maximum_days: null, permitted_use: 'Retained only for the stated obligation.',
      owner_reference: 'Records management', review_at: later(24), release_condition: 'Released when the obligation lapses.',
      ...body,
    }, key());
  const eligibility = async (assetId: string) =>
    S.Eligibility.parse(await (await staff.call(`/api/v1/admin/data-assets/${assetId}/eligibility`)).json());

  // --- FR-M15-01: silence is not permission ---------------------------------
  phase = 'no recorded basis';
  const bare = await asset('DATASET', daysAgo(1000));
  const unrecorded = await eligibility(bare.id);
  check('a copy with no recorded retention basis is not eligible for deletion', unrecorded.eligible, false);
  check('the reason names the missing basis rather than implying permission', unrecorded.blockers, ['NO_RECORDED_BASIS']);
  check('the limits say absence of a rule is not permission', unrecorded.limits[0]!.includes('cannot be seen here'), true);
  check('deleting a copy with no basis is refused',
    (await staff.call(`/api/v1/admin/data-assets/${bare.id}/retention-outcome`, { result: 'DELETED', method: 'MANUAL_ATTESTATION', evidence_reference: 'Claimed deletion.', note: 'No basis exists.' }, key())).status, 409);

  phase = 'constraint validity';
  check('a constraint that bounds nothing is rejected', (await constraint(bare.id, {})).status, 400);
  check('a minimum longer than the maximum is rejected', (await constraint(bare.id, { minimum_days: 400, maximum_days: 30 })).status, 400);

  // --- FR-M15-01: period not yet elapsed -------------------------------------
  phase = 'period not elapsed';
  const young = await asset('DATASET', daysAgo(10));
  await constraint(young.id, { minimum_days: 365, maximum_days: 2555 });
  const notYet = await eligibility(young.id);
  check('a copy inside its retention period is not eligible', notYet.eligible, false);
  check('the blocker says the minimum has not elapsed', notYet.blockers, ['MINIMUM_NOT_ELAPSED']);
  check('the earliest permissible deletion date is stated', notYet.earliest_deletion_at !== null, true);

  // --- eligible ---------------------------------------------------------------
  phase = 'eligible';
  const expired = await asset('DATASET', daysAgo(1000));
  const expiredConstraint = S.RetentionConstraint.parse(await (await constraint(expired.id, { minimum_days: 30, maximum_days: 90 })).json());
  const ready = await eligibility(expired.id);
  check('a copy past its maximum retention with nothing blocking is eligible', ready.eligible, true);
  check('an eligible copy names the constraint that permits deletion', ready.governing_constraint_id, expiredConstraint.id);
  check('an eligible copy carries no blockers', ready.blockers, []);

  // --- FR-M15-02: legal holds -------------------------------------------------
  phase = 'legal hold';
  const hold = S.LegalHold.parse(await (await staff.call('/api/v1/admin/retention/holds', {
    data_asset_ids: [expired.id], reason: 'Preserved for anticipated litigation.',
    authority_reference: 'Matter reference SYN-2026-014', issued_at: daysAgo(1), review_at: later(48),
    release_criterion: 'Released when the matter concludes or counsel confirms in writing.',
  }, key())).json());
  check('a hold names the exact copies it covers', hold.data_asset_ids, [expired.id]);
  const held = await eligibility(expired.id);
  check('an active hold makes an otherwise eligible copy ineligible', held.eligible, false);
  check('the hold that blocks is named', held.active_hold_ids, [hold.id]);
  check('a hold outranks an expired retention schedule', held.blockers, ['ACTIVE_LEGAL_HOLD']);
  check('deleting a held copy is refused',
    (await staff.call(`/api/v1/admin/data-assets/${expired.id}/retention-outcome`, { result: 'DELETED', method: 'MANUAL_ATTESTATION', evidence_reference: 'Claimed deletion.', note: 'Under hold.' }, key())).status, 409);
  check('a hold naming a copy that does not exist is refused',
    (await staff.call('/api/v1/admin/retention/holds', { data_asset_ids: [randomUUID()], reason: 'Preserving an unknown copy.', authority_reference: 'SYN-2026-015', issued_at: daysAgo(1), review_at: later(48), release_criterion: 'Released when the matter concludes.' }, key())).status, 404);

  phase = 'hold release';
  check('releasing a hold needs approval authority, not merely write access',
    (await staff.call(`/api/v1/admin/retention/holds/${hold.id}/release`, { reason: 'Matter concluded; counsel confirmed in writing.' }, key())).status, 403);
  const released = S.LegalHold.parse(await (await owner.call(`/api/v1/admin/retention/holds/${hold.id}/release`, { reason: 'Matter concluded; counsel confirmed in writing.' }, key())).json());
  check('a release records when and why', [released.state, released.released_at !== null, released.release_reason !== null], ['RELEASED', true, true]);
  check('eligibility is re-evaluated after release', (await eligibility(expired.id)).eligible, true);
  check('a released hold stays released on retry', (await owner.call(`/api/v1/admin/retention/holds/${hold.id}/release`, { reason: 'Attempting a second release.' }, key())).status, 409);
  const reopen = await db.query(`UPDATE app.legal_holds SET state='ACTIVE' WHERE id=$1`, [hold.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database refuses to reopen a released hold', reopen, 'REJECTED');

  // --- FR-M15-02: conflicting constraints -------------------------------------
  phase = 'conflict';
  const conflicted = await asset('DATASET', daysAgo(1000));
  const permitting = S.RetentionConstraint.parse(await (await constraint(conflicted.id, { minimum_days: 30, maximum_days: 90 })).json());
  await constraint(conflicted.id, { minimum_days: 3650, maximum_days: null, basis: 'REVIEWED_BUSINESS_NEED', source_reference: 'Reviewed business retention standard.' });
  const conflict = await eligibility(conflicted.id);
  check('constraints that disagree block deletion instead of picking the longest', conflict.eligible, false);
  check('the conflict is named as needing a reviewed decision', conflict.blockers, ['UNRESOLVED_CONSTRAINT_CONFLICT']);
  check('the reason says the longest duration is not applied automatically', conflict.reasons.some(reason => reason.includes('not applied automatically')), true);
  check('both constraints are listed as applicable', conflict.applicable_constraint_ids.length, 2);

  check('recording the governing constraint needs approval authority',
    (await staff.call(`/api/v1/admin/data-assets/${conflicted.id}/retention-decision`, { governing_constraint_id: permitting.id, reason: 'Statutory schedule governs this copy.' }, key())).status, 403);
  check('a decision cannot choose a constraint belonging to another copy',
    (await owner.call(`/api/v1/admin/data-assets/${conflicted.id}/retention-decision`, { governing_constraint_id: expiredConstraint.id, reason: 'Wrong copy.' }, key())).status, 400);
  const decided = S.Eligibility.parse(await (await owner.call(`/api/v1/admin/data-assets/${conflicted.id}/retention-decision`, { governing_constraint_id: permitting.id, reason: 'The statutory schedule governs; the business standard is superseded here.' }, key())).json());
  check('a reviewed decision resolves the conflict', decided.eligible, true);
  check('the reviewed decision is the recorded governing constraint', decided.governing_constraint_id, permitting.id);

  // A decision cannot invent permission where the chosen constraint still retains.
  const stillRetained = await asset('DATASET', daysAgo(10));
  const retaining = S.RetentionConstraint.parse(await (await constraint(stillRetained.id, { minimum_days: 365, maximum_days: 2555 })).json());
  const forced = S.Eligibility.parse(await (await owner.call(`/api/v1/admin/data-assets/${stillRetained.id}/retention-decision`, { governing_constraint_id: retaining.id, reason: 'Attempting to permit deletion early.' }, key())).json());
  check('a reviewed decision cannot create permission a constraint does not give', forced.eligible, false);

  // --- FR-M15-04: copy classes are recorded separately ------------------------
  phase = 'copy classes';
  const backup = await asset('BACKUP_COPY', daysAgo(1000));
  await constraint(backup.id, { minimum_days: 30, maximum_days: 90 });
  check('a backup copy is eligible in principle', (await eligibility(backup.id)).eligible, true);
  check('a backup copy cannot be reported as deleted',
    (await staff.call(`/api/v1/admin/data-assets/${backup.id}/retention-outcome`, { result: 'DELETED', method: 'MANUAL_ATTESTATION', evidence_reference: 'Backup expiry schedule.', note: 'Claimed erasure.' }, key())).status, 400);
  check('a backup copy cannot be reported as suppressed either',
    (await staff.call(`/api/v1/admin/data-assets/${backup.id}/retention-outcome`, { result: 'SUPPRESSED', method: 'MANUAL_ATTESTATION', evidence_reference: 'Backup expiry schedule.', note: 'Claimed suppression.' }, key())).status, 400);
  const backupOutcome = S.RetentionOutcome.parse(await (await staff.call(`/api/v1/admin/data-assets/${backup.id}/retention-outcome`, { result: 'EFFECT_UNKNOWN', method: 'MANUAL_ATTESTATION', evidence_reference: null, note: 'Backup rotates out on its own schedule; erasure cannot be observed.' }, key())).json());
  check('a backup outcome is recorded as an unknown effect against its copy class', [backupOutcome.result, backupOutcome.copy_class], ['EFFECT_UNKNOWN', 'BACKUP_COPY']);

  phase = 'live outcomes';
  const live = await asset('DATASET', daysAgo(1000));
  await constraint(live.id, { minimum_days: 30, maximum_days: 90 });
  check('a completed action without evidence is refused',
    (await staff.call(`/api/v1/admin/data-assets/${live.id}/retention-outcome`, { result: 'DELETED', method: 'MANUAL_ATTESTATION', evidence_reference: null, note: 'No evidence.' }, key())).status, 400);
  const deleted = S.RetentionOutcome.parse(await (await staff.call(`/api/v1/admin/data-assets/${live.id}/retention-outcome`, { result: 'DELETED', method: 'MANUAL_ATTESTATION', evidence_reference: 'Signed deletion confirmation.', note: 'Erased from the live store.' }, key())).json());
  check('a live-store deletion records its copy class, method and evidence', [deleted.copy_class, deleted.method, deleted.evidence_reference !== null], ['DATASET', 'MANUAL_ATTESTATION', true]);
  const rewrite = await db.query(`UPDATE app.retention_outcomes SET result='SUPPRESSED' WHERE data_asset_id=$1`, [live.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('a recorded retention outcome cannot be rewritten', rewrite, 'REJECTED');

  // --- FR-M15-04: restore into quarantine -------------------------------------
  phase = 'quarantine';
  const restored = await asset('DERIVED_COPY', daysAgo(1000));
  await constraint(restored.id, { minimum_days: 30, maximum_days: 90 });
  check('the restored copy is eligible before the restore', (await eligibility(restored.id)).eligible, true);
  await staff.call(`/api/v1/admin/data-assets/${restored.id}/retention-outcome`, { result: 'RESTORED_TO_QUARANTINE', method: 'MANUAL_ATTESTATION', evidence_reference: 'Restore run SYN-R-0001.', note: 'Restored from backup into quarantine.' }, key());
  const quarantined = await eligibility(restored.id);
  check('a copy restored into quarantine is not eligible until reconciled', quarantined.eligible, false);
  check('the blocker names the outstanding reconciliation', quarantined.blockers, ['AWAITING_QUARANTINE_RECONCILIATION']);

  // --- authority ---------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read retention constraints', (await auditor.call('/api/v1/admin/retention/constraints')).status, 200);
  check('an auditor cannot record a constraint', (await auditor.call('/api/v1/admin/retention/constraints', {
    data_asset_id: live.id, purpose_id: scenario.purpose.id, trigger: 'RECORD_CREATED', basis: 'CONSENT',
    source_reference: 'Auditor attempt.', minimum_days: 1, maximum_days: 2, permitted_use: 'None.',
    owner_reference: 'Auditor', review_at: later(24), release_condition: 'None.',
  }, key())).status, 403);
  const member = await h.login('member');
  check('a member without the retention capability is refused', (await member.call('/api/v1/admin/retention/constraints')).status, 403);

  writeEvidence('retention-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('retention-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
