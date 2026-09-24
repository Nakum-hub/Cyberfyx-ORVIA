// DPDP operations: existing-data onboarding and multi-relationship Data Principals
// (quality s4 "Existing-data onboarding", "Multi-relationship Data Principal").
// Under test: a legacy estate imports in resumable batches with row isolation,
// missing history stays missing, every fact keeps its provenance, a re-import
// duplicates nothing, raw source identifiers are never stored, and one person's
// patient and employee contexts stay separate while linked to one reference.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('estate-import');
const { h, check, ok, codes, db } = t;

await t.run(async () => {
  await t.ensurePackage();
  const admin = await h.login('admin'); const auditor = await h.login('auditor');
  const system = await t.boundSystem('Legacy patient store');
  const { activity, category, dataCategory, purpose } = await t.activity({ condition: 'CONSENT', systems: [system.id], categoryName: 'Patient' });
  const notice = await ok(admin.call('/api/v1/admin/registry-notices', { name: unique('Patient notice'), audience_category_ids: [category.id] }, key()), S.schemas.RegistryNotice);
  const withVersion = await ok(admin.call(`/api/v1/admin/registry-notices/${notice.id}/versions`, { locale: 'en', title: 'Patient privacy notice', content: 'Synthetic notice content for the legacy estate import.',
    purpose_version_ids: [purpose.versions[0]!.id], data_category_ids: [dataCategory.id], channels: { withdrawal: 'Withdraw in the synthetic portal.', rights: 'Exercise rights in the synthetic portal.', grievance: 'Raise grievances with the synthetic privacy desk.', board_complaint: 'Complain to the Data Protection Board through its published channel.' },
    template_reference: null, v1_notice_version_id: null }, key()), S.schemas.RegistryNotice);
  const noticeEffective = hoursFromNow(-24 * 10);
  await ok(admin.call(`/api/v1/admin/registry-notice-versions/${withVersion.versions[0]!.id}/publication`, { effective_from: noticeEffective }, key()), S.schemas.RegistryNotice);
  const noticeVersion = withVersion.versions[0]!.id;
  const run = randomUUID().slice(0, 8);
  const total = 300;
  const rows = Array.from({ length: total }, (_, i) => {
    const kind = i % 10;
    const row = { row_key: `legacy-${run}-${i}`, source_key: `person${i}.${run}@legacy.example`, references: [{ system_id: system.id, target_reference: `leg_${run}_${i}` }],
      relationships: [{ category_id: category.id, status: kind === 1 ? 'ENDED' : kind === 2 ? 'UNKNOWN' : 'ACTIVE', effective_from: kind === 2 ? null : hoursFromNow(-24 * 400),
        effective_to: kind === 1 ? hoursFromNow(-24 * 100) : null, source_reference: `legacy table row ${i}`, evidence_state: kind === 2 ? 'UNKNOWN' : 'EVIDENCE_AVAILABLE', evidence_reference: kind === 2 ? null : `legacy-export:${i}` }],
      consent: kind === 3 ? [{ activity_id: activity.id, event: 'GRANTED', occurred_at: null, evidence_state: 'EVIDENCE_MISSING', evidence_reference: null, source_reference: 'legacy flag without a timestamp' }]
        : kind === 4 ? [{ activity_id: activity.id, event: 'GRANTED', occurred_at: hoursFromNow(-24 * 200), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: `legacy-consent-log:${i}`, source_reference: 'legacy consent log' }] : [],
      notice_deliveries: kind === 5 ? [{ notice_version_id: noticeVersion, channel: 'EMAIL', presented_at: hoursFromNow(-24 * 5), source_reference: `legacy mail log ${i}`, evidence_reference: null, result: 'DELIVERED' }] : [] };
    // Deliberately invalid rows, which must be isolated rather than stop the job.
    if (i === 7) row.relationships[0]!.category_id = randomUUID();
    if (i === 17) (row.relationships[0] as Record<string, unknown>).evidence_reference = null;
    if (i === 15) row.notice_deliveries[0]!.presented_at = hoursFromNow(-24 * 30);
    return row;
  });
  t.setPhase('receive');
  const job = await ok(admin.call('/api/v1/admin/bulk-jobs', { source_label: 'Legacy patient store export', mapping_version: 'legacy-map-1' }, key()), S.schemas.BulkJob);
  for (let i = 0; i < total; i += 100) await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/rows`, { first_ordinal: i, rows: rows.slice(i, i + 100) }, key()), S.schemas.BulkJob);
  check('a resent chunk with different content for a received ordinal is refused', (await codes(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/rows`, { first_ordinal: 0, rows: [rows[1]] }, key()))).codes, ['ordinal_already_received_with_other_content']);
  check('an auditor cannot append to an import', (await auditor.call(`/api/v1/admin/bulk-jobs/${job.id}/rows`, { first_ordinal: 300, rows: [rows[0]] }, key())).status, 403);

  t.setPhase('process');
  const first = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/processing`, { limit: 120 }, key()), S.schemas.BulkJob);
  check('a first batch stops at its limit and checkpoints its cursor', [first.status, first.cursor, first.counts.pending], ['PROCESSING', 119, total - 120]);
  const done = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/processing`, { limit: 1000 }, key()), S.schemas.BulkJob);
  check('the job resumes from the checkpoint and finishes with isolated errors', [done.status, done.counts.pending, done.counts.error, done.counts.applied], ['COMPLETED_WITH_ERRORS', 0, 3, total - 3]);
  check('each failed row names its own error', done.errors.map(e => [e.ordinal, e.error_code]), [[7, 'UNKNOWN_CATEGORY'], [15, 'version_not_in_effect_at_that_time'], [17, 'EVIDENCE_WITHOUT_REFERENCE']]);
  const replayed = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/replay`, {}, key()), S.schemas.BulkJob);
  const reprocessed = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/processing`, { limit: 1000 }, key()), S.schemas.BulkJob);
  check('replaying failed rows re-attempts only them, and unchanged bad rows fail again', [replayed.counts.pending, reprocessed.counts.error, reprocessed.counts.applied], [3, 3, total - 3]);

  t.setPhase('facts');
  const s = t.scope();
  const scopeArgs = [s.tenant_id, s.legal_entity_id, s.environment_id];
  const missing = (await db.query(`SELECT e.occurred_at,e.evidence_state,e.source FROM app.consent_record_events e JOIN app.consent_records r ON r.tenant_id=e.tenant_id AND r.legal_entity_id=e.legal_entity_id AND r.environment_id=e.environment_id AND r.id=e.record_id
    JOIN app.data_principal_references f ON f.tenant_id=r.tenant_id AND f.legal_entity_id=r.legal_entity_id AND f.environment_id=r.environment_id AND f.subject_id=r.subject_id
    WHERE f.tenant_id=$1 AND f.legal_entity_id=$2 AND f.environment_id=$3 AND f.target_reference=$4`, [...scopeArgs, `leg_${run}_3`])).rows[0];
  check('a legacy consent flag without a timestamp is stored with no time and evidence missing', [missing?.occurred_at, missing?.evidence_state, missing?.source], [null, 'EVIDENCE_MISSING', 'IMPORT']);
  const deliveries = Number((await db.query(`SELECT count(*) n FROM app.notice_delivery_evidence WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND provenance->>'job_id'=$4`, [...scopeArgs, job.id])).rows[0].n);
  check('notice delivery is recorded only for rows whose source says it happened', deliveries, total / 10 - 1);
  const noSubjectsWithoutDelivery = Number((await db.query(`SELECT count(*) n FROM app.notice_delivery_evidence d JOIN app.data_principal_references f ON f.tenant_id=d.tenant_id AND f.legal_entity_id=d.legal_entity_id AND f.environment_id=d.environment_id AND f.subject_id=d.subject_id
    WHERE d.tenant_id=$1 AND d.legal_entity_id=$2 AND d.environment_id=$3 AND f.target_reference=$4`, [...scopeArgs, `leg_${run}_4`])).rows[0].n);
  check('an account that exists is not given a notice presentation it has no record of', noSubjectsWithoutDelivery, 0);
  const provenance = (await db.query(`SELECT r.provenance FROM app.data_principal_relationships r JOIN app.data_principal_references f ON f.tenant_id=r.tenant_id AND f.legal_entity_id=r.legal_entity_id AND f.environment_id=r.environment_id AND f.subject_id=r.subject_id
    WHERE f.tenant_id=$1 AND f.legal_entity_id=$2 AND f.environment_id=$3 AND f.target_reference=$4`, [...scopeArgs, `leg_${run}_0`])).rows[0].provenance;
  check('every imported fact carries its source, key, job and mapping version', [provenance.source, provenance.source_key, provenance.job_id, provenance.mapping_version], ['IMPORT', `legacy-${run}-0`, job.id, 'legacy-map-1']);
  const unknown = (await db.query(`SELECT r.status,r.effective_from,r.evidence_state FROM app.data_principal_relationships r JOIN app.data_principal_references f ON f.tenant_id=r.tenant_id AND f.legal_entity_id=r.legal_entity_id AND f.environment_id=r.environment_id AND f.subject_id=r.subject_id
    WHERE f.tenant_id=$1 AND f.legal_entity_id=$2 AND f.environment_id=$3 AND f.target_reference=$4`, [...scopeArgs, `leg_${run}_2`])).rows[0];
  check('an unknown relationship stays unknown, with no invented start date', [unknown.status, unknown.effective_from, unknown.evidence_state], ['UNKNOWN', null, 'UNKNOWN']);
  const leaked = Number((await db.query(`SELECT (SELECT count(*) FROM app.data_principal_references WHERE data_principal_references::text LIKE $1)+(SELECT count(*) FROM app.data_principals WHERE data_principals::text LIKE $1)
    +(SELECT count(*) FROM app.data_principal_relationships WHERE data_principal_relationships::text LIKE $1) n`, [`%${run}@legacy.example%`])).rows[0].n);
  check('raw source identifiers are never stored, only their keyed digest', leaked, 0);

  t.setPhase('idempotent re-import');
  const before = Number((await db.query('SELECT count(*) n FROM app.data_principals WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3', scopeArgs)).rows[0].n);
  const again = await ok(admin.call('/api/v1/admin/bulk-jobs', { source_label: 'Legacy patient store export (re-run)', mapping_version: 'legacy-map-1' }, key()), S.schemas.BulkJob);
  for (let i = 0; i < total; i += 100) await ok(admin.call(`/api/v1/admin/bulk-jobs/${again.id}/rows`, { first_ordinal: i, rows: rows.slice(i, i + 100) }, key()), S.schemas.BulkJob);
  const rerun = await ok(admin.call(`/api/v1/admin/bulk-jobs/${again.id}/processing`, { limit: 1000 }, key()), S.schemas.BulkJob);
  const after = Number((await db.query('SELECT count(*) n FROM app.data_principals WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3', scopeArgs)).rows[0].n);
  check('importing the same estate again duplicates nobody', [after - before, rerun.counts.duplicate, rerun.counts.applied], [0, total - 3, 0]);

  t.setPhase('multi-relationship');
  const employee = await ok(admin.call('/api/v1/admin/data-principal-categories', { name: unique('Employee'), description: 'Synthetic employment relationship.', regulatory_tags: ['EMPLOYMENT'] }, key()), S.schemas.PrincipalCategory);
  const hr = await t.activity({ condition: 'S7_I_EMPLOYMENT', systems: [system.id], categoryName: 'Staff' });
  await ok(admin.call(`/api/v1/admin/registry-activities/${hr.activity.id}/links`, { link_kind: 'PRINCIPAL_CATEGORY', target_id: employee.id, channel: null, basis: 'HR system declaration.', valid_from: hoursFromNow(-24) }, key()), S.schemas.Activity);
  const person = (await ok(admin.call(`/api/v1/admin/data-principals?system_id=${system.id}&target_reference=leg_${run}_0`), S.schemas.SubjectList)).items[0]!;
  await ok(admin.call('/api/v1/admin/data-principal-relationships', { subject_id: person.id, category_id: employee.id, effective_from: hoursFromNow(-24 * 50), effective_to: null, status: 'ACTIVE', source_system_id: null, source_reference: 'HR roster', evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'hr-roster:1' }, key()), S.schemas.Relationship);
  const processing = await ok(admin.call(`/api/v1/admin/data-principals/${person.id}/processing`), S.schemas.SubjectProcessing);
  const patientContext = processing.contexts.find(x => x.category_id === category.id); const employeeContext = processing.contexts.find(x => x.category_id === employee.id);
  check('one person carries two relationship contexts under one reference', processing.contexts.length, 2);
  check('the patient context sees only patient processing', patientContext?.activities.map(a => a.activity_id), [activity.id]);
  check('the employee context sees only employment processing', employeeContext?.activities.map(a => a.activity_id), [hr.activity.id]);
  const other = (await ok(admin.call(`/api/v1/admin/data-principals?system_id=${system.id}&target_reference=leg_${run}_1`), S.schemas.SubjectList)).items[0]!;
  const merged = await ok(admin.call(`/api/v1/admin/data-principals/${other.id}/merge`, { into_subject_id: person.id, basis: 'Deterministic match confirmed by the records team.' }, key()), S.schemas.Subject);
  const unmerged = await ok(admin.call(`/api/v1/admin/data-principals/${other.id}/unmerge`, { reason: 'Match withdrawn after review of the source records.' }, key()), S.schemas.Subject);
  check('a merge is an explicit act that can be reversed', [merged.status, merged.merged_into, unmerged.status, unmerged.merged_into], ['MERGED', person.id, 'ACTIVE', null]);
  const birch = await h.login('birch');
  check('another tenant cannot read this person', (await birch.call(`/api/v1/admin/data-principals/${person.id}`)).status, 404);
});
