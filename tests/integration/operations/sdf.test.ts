// DPDP operations: Significant Data Fiduciary mode (quality s4 "SDF").
// Under test: SDF status is a recorded fact and nothing is created for an
// organisation that is not designated; a designation needs its reference and
// opens the package's SDF obligations with their timers; completing a periodic
// obligation opens the next period; ending the designation closes open
// obligations with a reason instead of deleting them; and only a super admin may
// change the profile.
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('sdf');
const { h, check, ok, codes, db } = t;
const YEAR_MS = 8760 * 3_600_000;

await t.run(async () => {
  await t.ensurePackage();
  const owner = await h.login('owner'); const admin = await h.login('admin'); const auditor = await h.login('auditor');
  const body = (sdf: string, reference: string | null, reason: string, effective = new Date().toISOString()) => ({ sdf_status: sdf, sdf_designation_reference: reference, dpo_contact: 'Privacy office (synthetic)',
    grievance_contact: 'Grievance desk (synthetic)', independent_auditor_reference: null, facts: { third_schedule_class: 'NONE' }, effective_from: effective, reason });
  const set = (sdf: string, reference: string | null, reason: string) => ok(owner.call('/api/v1/admin/organisation-profile', body(sdf, reference, reason), key()), S.schemas.OrganisationProfile);
  const open = (p: ReturnType<typeof S.schemas.OrganisationProfile.parse>) => p.sdf_obligations.filter(o => o.state === 'OPEN');

  t.setPhase('not designated');
  const plain = await set('NOT_DESIGNATED', null, 'Not designated as a Significant Data Fiduciary (synthetic).');
  check('an organisation that is not designated has no open SDF obligations', open(plain).length, 0);
  check('an organisation admin cannot change SDF status', (await admin.call('/api/v1/admin/organisation-profile', body('DESIGNATED', 'S.O. 1 (synthetic)', 'Admin must not designate.'), key())).status, 403);
  check('a designation is recorded with its reference', (await codes(owner.call('/api/v1/admin/organisation-profile', body('DESIGNATED', null, 'Designation without its reference.'), key()))).codes, ['designation_is_recorded_with_its_reference']);

  t.setPhase('designation');
  const designatedAt = new Date();
  const designated = await ok(owner.call('/api/v1/admin/organisation-profile', body('DESIGNATED', 'Central Government notification S.O. 99(E) (synthetic)', 'Designated as a Significant Data Fiduciary (synthetic).', designatedAt.toISOString()), key()), S.schemas.OrganisationProfile);
  const obligations = open(designated);
  const kinds = obligations.map(o => o.kind).sort();
  check('a designation opens one obligation per SDF requirement in the package in force', kinds, ['ALGORITHMIC_DUE_DILIGENCE', 'DPO_APPOINTMENT', 'INDEPENDENT_AUDITOR_APPOINTMENT', 'PERIODIC_AUDIT', 'PERIODIC_DPIA', 'TRANSFER_RESTRICTION_REVIEW']);
  const dpia = obligations.find(o => o.kind === 'PERIODIC_DPIA')!;
  check('a periodic assessment is due twelve months after designation', dpia.due_at, new Date(designatedAt.getTime() + YEAR_MS).toISOString());
  check('an obligation without a statutory period carries no invented due time', obligations.find(o => o.kind === 'DPO_APPOINTMENT')?.due_at, null);
  check('obligations are pinned to the package they came from and are in force', obligations.every(o => o.package_row_id === obligations[0]!.package_row_id && o.legal_status === 'APPLICABLE'), true);
  const event = (await db.query(`SELECT payload FROM app.operational_events WHERE event_type='sdf_status_changed' AND subject_id=$1`, [designated.id])).rows[0]?.payload;
  check('the designation is emitted as a status change', [event?.from, event?.to], ['NOT_DESIGNATED', 'DESIGNATED']);
  const evidence = Number((await db.query(`SELECT count(*) n FROM app.evidence_records WHERE entity_kind='organisation_profile' AND entity_id=$1 AND method='SDF_STATUS_RECORD'`, [designated.id])).rows[0].n);
  check('the designation is recorded as evidence', evidence, 1);
  const attention = await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention);
  check('open obligations without a due time appear in Attention', attention.items.some(i => i.kind === 'SDF_OBLIGATION_DUE' && i.entity_id === obligations.find(o => o.kind === 'DPO_APPOINTMENT')!.id), true);
  check('an auditor can read the profile but not complete an obligation', [(await auditor.call('/api/v1/admin/organisation-profile')).status,
    (await auditor.call(`/api/v1/admin/sdf-obligations/${dpia.id}/completion`, { evidence_reference: 'Auditor must not complete.' }, key())).status], [200, 403]);
  check('a profile cannot be back-dated before the current version', (await codes(owner.call('/api/v1/admin/organisation-profile', body('DESIGNATED', 'S.O. 99(E) (synthetic)', 'Back-dated profile must be refused.', new Date(designatedAt.getTime() - 3_600_000).toISOString()), key()))).codes, ['must_not_precede_current_profile']);

  t.setPhase('periodic obligations');
  const completed = await ok(owner.call(`/api/v1/admin/sdf-obligations/${dpia.id}/completion`, { evidence_reference: 'DPIA report DPIA-2026-1 (synthetic)' }, key()), S.schemas.SdfObligation);
  check('completion records its evidence', [completed.state, completed.evidence_reference], ['COMPLETED', 'DPIA report DPIA-2026-1 (synthetic)']);
  check('an obligation is completed once', (await owner.call(`/api/v1/admin/sdf-obligations/${dpia.id}/completion`, { evidence_reference: 'A second completion.' }, key())).status, 409);
  const afterDpia = open((await ok(owner.call('/api/v1/admin/organisation-profile'), S.schemas.OrganisationProfileView)).current!);
  const next = afterDpia.filter(o => o.kind === 'PERIODIC_DPIA');
  check('completing a periodic assessment opens the next period from completion', [next.length, next[0]?.id !== dpia.id, next[0]?.due_at], [1, true, new Date(Date.parse(completed.completed_at!) + YEAR_MS).toISOString()]);
  const dpo = obligations.find(o => o.kind === 'DPO_APPOINTMENT')!;
  await ok(owner.call(`/api/v1/admin/sdf-obligations/${dpo.id}/completion`, { evidence_reference: 'Board resolution appointing the DPO (synthetic)' }, key()), S.schemas.SdfObligation);
  const afterDpo = open((await ok(owner.call('/api/v1/admin/organisation-profile'), S.schemas.OrganisationProfileView)).current!);
  check('a one-time appointment does not recur', afterDpo.some(o => o.kind === 'DPO_APPOINTMENT'), false);

  t.setPhase('designation ends');
  const ended = await set('NOT_DESIGNATED', null, 'Designation withdrawn by the Central Government (synthetic).');
  const mine = ended.sdf_obligations.filter(o => o.package_row_id === dpia.package_row_id);
  check('no obligation remains open once the designation ends', open(ended).length, 0);
  check('open obligations are closed as not applicable with a reason, not deleted', mine.filter(o => o.state === 'NOT_APPLICABLE').every(o => o.closure_reason?.startsWith('SDF designation no longer recorded')) && mine.some(o => o.state === 'NOT_APPLICABLE'), true);
  check('completed obligations keep their completion', mine.filter(o => [dpia.id, dpo.id].includes(o.id)).map(o => o.state), ['COMPLETED', 'COMPLETED']);
  check('a closed obligation cannot be completed', (await owner.call(`/api/v1/admin/sdf-obligations/${next[0]!.id}/completion`, { evidence_reference: 'Completing after the designation ended.' }, key())).status, 409);
  const view = await ok(auditor.call('/api/v1/admin/organisation-profile'), S.schemas.OrganisationProfileView);
  check('the profile history keeps the designated version', view.history.some(v => v.id === designated.id && v.sdf_status === 'DESIGNATED'), true);
  check('a profile version cannot be rewritten', await db.query(`UPDATE app.organisation_profile_versions SET sdf_status='UNKNOWN' WHERE id=$1`, [designated.id]).then(() => 'ACCEPTED').catch((e: { code?: string }) => e.code), '23514');
});
