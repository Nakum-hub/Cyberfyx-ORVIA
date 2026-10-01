// EX07 backup-copy obligations (master §§50, 52, 91; migration 0076; contract 0.50.0).
// Under test: a backup treatment records the five required facts and needs a second person's approval (the recorder, an
// administrator without approval rights and a read-only role cannot); when erasures are verified, only the system with a current
// treatment gets erasure-ledger rows, each with the date its backups age out, and nothing reports a backup as erased; coverage
// gives true counts to a reader who may not read the ledger, and names a system with verified erasures but no treatment as unknown
// backup handling (also in Operations attention); the ledger itself needs sensitive access; recording a restore from a backup older
// than the erasures marks exactly those people for re-erasure (a restore from a newer backup marks none) and raises attention
// until staff confirm it; the database refuses to rewrite a treatment or delete a live ledger row; and the runner ages rows out
// and purges them 30 days past their clear date (the ledger's own retention).
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
    check('Operations attention names the unknown backup handling', attention.items.some(i => i.kind === 'BACKUP_HANDLING_UNKNOWN' && i.entity_id === noTreatment.id), true);
    check('the ledger itself needs sensitive access', (await admin.call(`/api/v1/admin/erasure-ledger?system_id=${withBackups.id}&limit=10`)).status, 403);
    const listed = await ok(owner.call(`/api/v1/admin/erasure-ledger?system_id=${withBackups.id}&limit=100`), S.schemas.ErasureLedgerList);
    check('the owner reads the ledger', listed.items.filter(e => e.state === 'IN_BACKUPS').length >= N, true);

    t.setPhase('restore');
    const now = new Date().toISOString();
    const newer = await ok(admin.call('/api/v1/admin/system-restores', { system_id: withBackups.id, backup_taken_at: now, restored_at: now, evidence_reference: 'Change CHG-1 (synthetic)' }, key()), S.schemas.SystemRestore);
    check('a restore from a backup taken after the erasures marks nobody', newer.marked_for_reerasure, 0);
    const older = await ok(admin.call('/api/v1/admin/system-restores', { system_id: withBackups.id, backup_taken_at: hoursFromNow(-DAY * 2), restored_at: hoursFromNow(0), evidence_reference: 'Incident INC-4 restore (synthetic)' }, key()), S.schemas.SystemRestore);
    check('a restore from a backup older than the erasures marks everyone erased since', older.marked_for_reerasure >= N, true);
    const attention2 = await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention);
    check('Operations attention shows the re-erasure', attention2.items.some(i => i.kind === 'REERASURE_AFTER_RESTORE' && i.entity_id === withBackups.id && i.count >= N), true);
    const toErase = (await ok(owner.call(`/api/v1/admin/erasure-ledger?system_id=${withBackups.id}&state=REAPPLY_REQUIRED&limit=100`), S.schemas.ErasureLedgerList)).items;
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
  } finally { await runner.close(); }
});
