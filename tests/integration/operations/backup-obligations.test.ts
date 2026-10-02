import { allPageList } from '../../../shared/testing/src/all-pages.ts';
// EX07 backup-copy obligations (master §§50, 52, 91; migration 0076; contract 0.50.0).
// Under test: a backup treatment records the five required facts and needs a second person's approval (the recorder, an
// administrator without approval rights and a read-only role cannot); when erasures are verified, only the system with a current
// treatment gets erasure-ledger rows, each with the date its backups age out, and nothing reports a backup as erased; coverage
// gives true counts to a reader who may not read the ledger, and names a system with verified erasures but no treatment as unknown
// backup handling (also in Operations attention); the ledger itself needs sensitive access; recording a restore from a backup older
// than the erasures marks exactly those people for re-erasure (a restore from a newer backup marks none) and raises attention
// until staff confirm it; the database refuses to rewrite a treatment or delete a live ledger row; and the runner ages rows out
// and purges them 30 days past their clear date (the ledger's own retention). A restore from a backup older than erasures already
// purged is recorded with INCOMPLETE ledger coverage and stays in Operations attention until a manual review is recorded (0090).
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';
import { operationsRunner } from '../../../services/worker/src/operations-runner.ts';

const t = operationsSuite('backup-obligations');
const { h, check, ok, codes, db } = t;
const target = recordsTarget();
const DAY = 24; const N = 3;

await t.run(async () => {
  const runner = operationsRunner();
  try {
    await t.ensurePackage();
    const admin = await h.login('admin'); const reviewer = await h.login('reviewer'); const owner = await h.login('owner'); const auditor = await h.login('auditor');
    const s = t.scope();
    const withBackups = await t.boundSystem('Customer CRM with nightly backups');
    const noTreatment = await t.boundSystem('Marketing store, backups unknown');
    const { activity, category } = await t.activity({ condition: 'CONSENT', systems: [withBackups.id, noTreatment.id], categoryName: 'Lapsed customer' });
    const run = randomUUID().slice(0, 8);
    const ref = (i: number) => `bo_${run}_${i}`;
    const rows = Array.from({ length: N }, (_, i) => ({ row_key: `bo-${run}-${i}`, source_key: null, references: [{ system_id: withBackups.id, target_reference: ref(i) }, { system_id: noTreatment.id, target_reference: ref(i) }],
      relationships: [{ category_id: category.id, status: 'ENDED', effective_from: hoursFromNow(-DAY * 900), effective_to: hoursFromNow(-DAY * 400), source_reference: `crm row ${i}`, evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: `crm-export:${i}` }],
      consent: [], notice_deliveries: [] }));
    const job = await ok(admin.call('/api/v1/admin/bulk-jobs', { source_label: 'Lapsed customer export', mapping_version: 'bo-map-1' }, key()), S.schemas.BulkJob);
    await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/rows`, { first_ordinal: 0, rows }, key()), S.schemas.BulkJob);
    let imported = job;
    while (imported.status !== 'COMPLETED' && imported.status !== 'COMPLETED_WITH_ERRORS') imported = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/processing`, { limit: 50 }, key()), S.schemas.BulkJob);
    for (const sys of [withBackups, noTreatment]) await target.seed(s, sys.id, rows.map((_, i) => ({ reference: ref(i), fields: { name: `Synthetic ${i}`, email: `bo${i}@records.example` } })));

    t.setPhase('backup treatment');
    const treatment = { system_id: withBackups.id, technical_restriction: 'Nightly full database images; a single record cannot be removed (synthetic).', isolation_controls: 'Encrypted, restore only by two named DBAs, separate network (synthetic).',
      retention_days: 35, restore_procedure_reference: 'Runbook DBA-7 (synthetic)', legal_treatment: 'Management accepts erased people remaining in backups until they age out at 35 days (synthetic).' };
    check('a read-only role cannot record a backup treatment', (await auditor.call('/api/v1/admin/backup-treatments', treatment, key())).status, 403);
    const proposed = await ok(admin.call('/api/v1/admin/backup-treatments', treatment, key()), S.schemas.BackupTreatment);
    check('a recorded treatment waits for approval', proposed.status, 'PROPOSED');
    check('an administrator without approval rights cannot approve it', (await admin.call(`/api/v1/admin/backup-treatments/${proposed.id}/approval`, {}, key())).status, 403);
    const approved = await ok(reviewer.call(`/api/v1/admin/backup-treatments/${proposed.id}/approval`, {}, key()), S.schemas.BackupTreatment);
    check('a second person approves it and it becomes current', [approved.status, approved.approved_by !== null], ['CURRENT', true]);
    const second = await ok(reviewer.call('/api/v1/admin/backup-treatments', { ...treatment, retention_days: 30 }, key()), S.schemas.BackupTreatment);
    check('the recorder cannot approve their own treatment', (await codes(reviewer.call(`/api/v1/admin/backup-treatments/${second.id}/approval`, {}, key()))).codes, ['approver_must_differ_from_recorder']);

    t.setPhase('erasure');
    const rule = await ok(admin.call('/api/v1/admin/retention-rules', { name: `Lapsed customers ${run}`, activity_id: activity.id, principal_category_id: category.id, data_category_id: null, system_id: null,
      trigger: 'RELATIONSHIP_ENDED', duration_days: 365, duration_source: 'CUSTOMER_CONFIGURATION', source_reference: 'Records policy RP-12 (synthetic)', requirement_id: null,
      approval_required: true, erasure_action: 'ERASE', effective_from: hoursFromNow(-DAY) }, key()), S.schemas.RetentionRule);
    let evaluation = await ok(admin.call('/api/v1/admin/workflow-runs/retention', { retention_rule_id: rule.id }, key()), S.schemas.WorkflowRun);
    while (evaluation.status === 'EVALUATING') evaluation = await ok(admin.call(`/api/v1/admin/workflow-runs/${evaluation.id}/evaluation`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    await ok(reviewer.call(`/api/v1/admin/workflow-runs/${evaluation.id}/decision`, { decision: 'APPROVED', note: 'Lapsed customer erasure reviewed and approved.', scope_hash: evaluation.scope_hash }, key()), S.schemas.WorkflowRun);
    let executed = await ok(admin.call(`/api/v1/admin/workflow-runs/${evaluation.id}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    while (executed.status === 'RUNNING') executed = await ok(admin.call(`/api/v1/admin/workflow-runs/${evaluation.id}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    check('the erasures are verified on both systems', [executed.status, (await db.query(`SELECT count(*)::int n FROM app.downstream_actions WHERE run_id=$1 AND action_type='ERASE' AND verification='VERIFIED'`, [evaluation.id])).rows[0].n], ['COMPLETED_VERIFIED', 2 * N]);
    const ledger = (await db.query(`SELECT system_id, state, round(extract(epoch FROM backups_clear_after - erased_at)/86400) days FROM app.erasure_ledger l
      WHERE l.action_id IN (SELECT id FROM app.downstream_actions WHERE run_id=$1)`, [evaluation.id])).rows;
    check('only the system with a current treatment gets ledger rows, one per person, ageing out after 35 days', [ledger.length, ledger.every(r => r.system_id === withBackups.id && r.state === 'IN_BACKUPS' && r.days === '35')], [N, true]);

    t.setPhase('coverage and access');
    const coverage = await ok(admin.call('/api/v1/admin/backup-coverage'), S.schemas.BackupCoverage);
    const a = coverage.systems.find(x => x.system_id === withBackups.id)!; const b = coverage.systems.find(x => x.system_id === noTreatment.id)!;
    check('an administrator who may not read the ledger still sees true counts', [a.treatment, a.in_backups >= N, a.earliest_clear_after !== null], ['CURRENT', true, true]);
    check('the system without a treatment is unknown backup handling', [b.treatment, b.verified_erasures >= N, b.in_backups, coverage.unknown_backup_handling >= 1, coverage.a_backup_expiry_date_is_not_proof_of_erasure], ['NONE', true, 0, true, true]);
    const attention = await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention);
    // Attention lists at most 50 systems of a kind and says so in `limits`; a long-lived profile accumulates more than 50 such
    // systems, so this system is either listed or covered by the stated limit (and named in backup coverage above).
    const listedUnknown = attention.items.some(i => i.kind === 'BACKUP_HANDLING_UNKNOWN' && i.entity_id === noTreatment.id);
    const statedLimit = attention.limits.some(l => l.includes('systems with unknown backup handling'));
    check('Operations attention names the unknown backup handling, or states that more systems exist than it lists', listedUnknown || statedLimit, true);
    check('the ledger itself needs sensitive access', (await admin.call(`/api/v1/admin/erasure-ledger?system_id=${withBackups.id}&limit=10`)).status, 403);
    const listed = await allPageList(p => owner.call(p), `/api/v1/admin/erasure-ledger?system_id=${withBackups.id}`, value => S.schemas.ErasureLedgerList.parse(value));
    check('the owner reads the ledger', listed.items.filter(e => e.state === 'IN_BACKUPS').length >= N, true);

    t.setPhase('restore');
    const now = new Date().toISOString();
    const newer = await ok(admin.call('/api/v1/admin/system-restores', { system_id: withBackups.id, backup_taken_at: now, restored_at: now, evidence_reference: 'Change CHG-1 (synthetic)' }, key()), S.schemas.SystemRestore);
    check('a restore from a backup taken after the erasures marks nobody', newer.marked_for_reerasure, 0);
    const older = await ok(admin.call('/api/v1/admin/system-restores', { system_id: withBackups.id, backup_taken_at: hoursFromNow(-DAY * 2), restored_at: hoursFromNow(0), evidence_reference: 'Incident INC-4 restore (synthetic)' }, key()), S.schemas.SystemRestore);
    check('a restore from a backup older than the erasures marks everyone erased since', older.marked_for_reerasure >= N, true);
    const attention2 = await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention);
    check('Operations attention shows the re-erasure', attention2.items.some(i => i.kind === 'REERASURE_AFTER_RESTORE' && i.entity_id === withBackups.id && i.count >= N), true);
    const toErase = (await allPageList(p => owner.call(p), `/api/v1/admin/erasure-ledger?system_id=${withBackups.id}&state=REAPPLY_REQUIRED`, value => S.schemas.ErasureLedgerList.parse(value))).items;
    check('an administrator cannot confirm re-erasure (sensitive)', (await admin.call(`/api/v1/admin/erasure-ledger/${toErase[0]!.id}/reapplied`, { evidence_reference: 'CRM delete log (synthetic)' }, key())).status, 403);
    const confirmed = await ok(owner.call(`/api/v1/admin/erasure-ledger/${toErase[0]!.id}/reapplied`, { evidence_reference: 'CRM delete log DL-9 (synthetic)' }, key()), S.schemas.ErasureLedgerEntry);
    check('the owner confirms one re-erasure with evidence', [confirmed.state, confirmed.reapplied_evidence], ['REAPPLIED', 'CRM delete log DL-9 (synthetic)']);
    check('confirming it twice is refused', (await owner.call(`/api/v1/admin/erasure-ledger/${toErase[0]!.id}/reapplied`, { evidence_reference: 'Again' }, key())).status, 409);

    t.setPhase('database guards and retention');
    const refused = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'changed', (e: Error) => e.message);
    check('a treatment\'s recorded facts cannot be rewritten', await refused('UPDATE app.backup_treatments SET retention_days=1 WHERE id=$1', [approved.id]), 'backup_treatment_transition_refused');
    check('a live ledger row cannot be deleted', await refused('DELETE FROM app.erasure_ledger WHERE id=$1', [toErase[1]!.id]), 'erasure_ledger_row_is_retained');
    // A ledger row whose backups aged out long ago (inserted directly, as history would leave it) is aged and purged by the runner.
    const spare = (await db.query(`SELECT id, subject_id FROM app.downstream_actions WHERE run_id=$1 AND system_id=$2 LIMIT 1`, [evaluation.id, noTreatment.id])).rows[0];
    const oldRow = randomUUID();
    await db.query(`INSERT INTO app.erasure_ledger(tenant_id,legal_entity_id,environment_id,id,subject_id,system_id,action_id,treatment_id,erased_at,backups_clear_after)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,now() - interval '400 days', now() - interval '60 days')`, [s.tenant_id, s.legal_entity_id, s.environment_id, oldRow, spare.subject_id, withBackups.id, spare.id, approved.id]);
    const report = (await runner.once()).find(r => r.scope === s.environment_id)!;
    check('the runner ages out and purges a row 30 days past its clear date', [report.backup_ledger_purged >= 1, (await db.query('SELECT count(*)::int n FROM app.erasure_ledger WHERE id=$1', [oldRow])).rows[0].n], [true, 0]);
    check('rows still within their backups are untouched by the sweep', (await db.query(`SELECT count(*)::int n FROM app.erasure_ledger WHERE system_id=$1 AND state IN ('IN_BACKUPS','REAPPLY_REQUIRED','REAPPLIED') AND erased_at > now() - interval '1 day'`, [withBackups.id])).rows[0].n >= N, true);

    t.setPhase('a restore older than the ledger (migration 0090)');
    const mark = (await db.query(`SELECT purged_through, purged_rows FROM app.erasure_ledger_purges WHERE system_id=$1 ORDER BY purged_at DESC LIMIT 1`, [withBackups.id])).rows[0];
    check('the purge records the latest erasure it removed for that system, without naming anyone', [!!mark, mark && Math.abs(new Date(mark.purged_through).getTime() - (Date.now() - 400 * 864e5)) < 864e5, mark?.purged_rows >= 1], [true, true, true]);
    const ancient = await ok(admin.call('/api/v1/admin/system-restores', { system_id: withBackups.id, backup_taken_at: hoursFromNow(-24 * 500), restored_at: hoursFromNow(0), evidence_reference: 'Archive restore ARC-9 (synthetic)' }, key()), S.schemas.SystemRestore);
    check('a restore from a backup older than purged erasures is recorded, with INCOMPLETE ledger coverage and the purge point', [ancient.ledger_coverage, ancient.ledger_purged_through !== null, ancient.coverage_review], ['INCOMPLETE', true, null]);
    // The earlier restore already marked these people; the one whose re-erasure was confirmed is marked again by this older restore.
    check('the person whose re-erasure was confirmed is marked again', ancient.marked_for_reerasure, 1);
    check('everyone the ledger can still name is marked for re-erasure', (await db.query(`SELECT count(*)::int n FROM app.erasure_ledger WHERE system_id=$1 AND state='REAPPLY_REQUIRED' AND erased_at > now() - interval '1 day'`, [withBackups.id])).rows[0].n >= N, true);
    const recent = await ok(admin.call('/api/v1/admin/system-restores', { system_id: withBackups.id, backup_taken_at: hoursFromNow(-24 * 300), restored_at: hoursFromNow(0), evidence_reference: 'Change CHG-2 (synthetic)' }, key()), S.schemas.SystemRestore);
    check('a restore from a backup taken after the purged erasures keeps COMPLETE coverage', [recent.ledger_coverage, recent.ledger_purged_through], ['COMPLETE', null]);
    const flagged = await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention);
    check('Operations attention names the restore for a manual review', flagged.items.some(i => i.kind === 'RESTORE_PREDATES_LEDGER' && i.entity_id === ancient.id), true);
    check('the complete restore is not flagged', flagged.items.some(i => i.kind === 'RESTORE_PREDATES_LEDGER' && i.entity_id === recent.id), false);
    const restores = await ok(admin.call('/api/v1/admin/system-restores?coverage=INCOMPLETE&unreviewed=true&limit=100'), S.schemas.SystemRestoreList);
    check('the restore list shows it among unreviewed INCOMPLETE restores', restores.items.some(r => r.id === ancient.id) && restores.items.every(r => r.ledger_coverage === 'INCOMPLETE' && r.coverage_review === null), true);
    const reviewPath = (id: string) => `/api/v1/admin/system-restores/${id}/coverage-review`;
    check('an auditor cannot record the review', (await auditor.call(reviewPath(ancient.id), { evidence_reference: 'Synthetic attempt.' }, key())).status, 403);
    check('a complete restore takes no review', await admin.call(reviewPath(recent.id), { evidence_reference: 'Synthetic attempt.' }, key()).then(async r => [r.status, ((await r.json()) as { error?: { field_errors?: { code: string }[] } }).error?.field_errors?.[0]?.code]), [409, 'restore_ledger_coverage_is_complete']);
    check('an unknown restore is 404', (await admin.call(reviewPath(randomUUID()), { evidence_reference: 'Synthetic attempt.' }, key())).status, 404);
    const reviewed = await ok(admin.call(reviewPath(ancient.id), { evidence_reference: 'Restored tables compared against the erasure audit export by DBA pair (synthetic).' }, key()), S.schemas.SystemRestore, [200]);
    check('the manual review is recorded with the restore', [reviewed.ledger_coverage, reviewed.coverage_review?.evidence_reference], ['INCOMPLETE', 'Restored tables compared against the erasure audit export by DBA pair (synthetic).']);
    check('a second review is refused', (await admin.call(reviewPath(ancient.id), { evidence_reference: 'Again.' }, key())).status, 409);
    const cleared = await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention);
    check('once reviewed, the restore leaves Operations attention', cleared.items.some(i => i.kind === 'RESTORE_PREDATES_LEDGER' && i.entity_id === ancient.id), false);
    check('the review cannot be rewritten', await refused('UPDATE app.restore_coverage_reviews SET evidence_reference=$2 WHERE restore_id=$1', [ancient.id, 'Rewritten']).then(m => m !== 'changed'), true);
    check('the coverage of a recorded restore cannot be changed', await refused(`UPDATE app.system_restores SET ledger_coverage='COMPLETE', ledger_purged_through=NULL WHERE id=$1`, [ancient.id]).then(m => m !== 'changed'), true);
    t.setPhase('the upgrade boundary for erasures purged before 0090 (migration 0091)');
    // A system whose backup treatment predates the upgrade by more than 30 days may have had ledger rows purged before purges were
    // recorded. The boundary is recorded once; a restore older than it is INCOMPLETE, a newer one stays COMPLETE.
    await db.query(`INSERT INTO app.backup_treatments(tenant_id,legal_entity_id,environment_id,id,system_id,technical_restriction,isolation_controls,retention_days,restore_procedure_reference,legal_treatment,recorded_by,recorded_at)
      VALUES($1,$2,$3,$4,$5,'Nightly images, not editable per record (synthetic).','Encrypted, two named DBAs (synthetic).',35,'Runbook DBA-7 (synthetic)','Management accepts backup retention (synthetic).',$6,now() - interval '90 days')`,
      [s.tenant_id, s.legal_entity_id, s.environment_id, randomUUID(), noTreatment.id, randomUUID()]);
    const boundaryAdded = Number((await db.query('SELECT app.record_ledger_upgrade_boundary() AS n')).rows[0].n);
    const boundary = (await db.query(`SELECT purged_through, purged_rows FROM app.erasure_ledger_purges WHERE system_id=$1 AND basis='BEFORE_UPGRADE'`, [noTreatment.id])).rows;
    check('one boundary is recorded for a system whose treatment predates the upgrade by more than 30 days, naming no one', [boundaryAdded >= 1, boundary.length, boundary[0]?.purged_rows], [true, 1, 0]);
    check('recording the boundary again adds nothing for that system', [Number((await db.query('SELECT app.record_ledger_upgrade_boundary() AS n')).rows[0].n) >= 0,
      Number((await db.query(`SELECT count(*) n FROM app.erasure_ledger_purges WHERE system_id=$1 AND basis='BEFORE_UPGRADE'`, [noTreatment.id])).rows[0].n)], [true, 1]);
    const oldRestore = await ok(admin.call('/api/v1/admin/system-restores', { system_id: noTreatment.id, backup_taken_at: hoursFromNow(-24 * 45), restored_at: hoursFromNow(0), evidence_reference: 'Restore after upgrade RST-1 (synthetic)' }, key()), S.schemas.SystemRestore);
    check('a restore from before the upgrade boundary is INCOMPLETE, not reported as complete', oldRestore.ledger_coverage, 'INCOMPLETE');
    const newRestore = await ok(admin.call('/api/v1/admin/system-restores', { system_id: noTreatment.id, backup_taken_at: hoursFromNow(-24 * 10), restored_at: hoursFromNow(0), evidence_reference: 'Restore after upgrade RST-2 (synthetic)' }, key()), S.schemas.SystemRestore);
    check('a restore from after the boundary stays COMPLETE', newRestore.ledger_coverage, 'COMPLETE');
    await ok(admin.call(reviewPath(oldRestore.id), { evidence_reference: 'Restored tables reviewed by hand (synthetic).' }, key()), S.schemas.SystemRestore, [200]);
    check('the application role cannot record a boundary', await (async () => { const cx = await db.connect(); try { await cx.query('BEGIN'); await cx.query('SET LOCAL ROLE orvia_app');
      return await cx.query('SELECT app.record_ledger_upgrade_boundary()').then(() => 'ran', (e: { code?: string }) => e.code); } finally { await cx.query('ROLLBACK').catch(() => {}); cx.release(); } })(), '42501');
    check('purge records cannot be removed', await refused('DELETE FROM app.erasure_ledger_purges WHERE system_id=$1', [withBackups.id]).then(m => m !== 'changed'), true);
  } finally { await runner.close(); }
});
