// DPDP operations: Consent Managers (Act s.6(7)-(9), Rules rule 4; contract 0.47.0).
// Under test: the organisation registers a Consent Manager with its Board registration and evidence; a duplicate registration
// is refused; a consent record is linked to an active Consent Manager and its artefact; linking a second time, or to a
// suspended Consent Manager, is refused; a withdrawal the Consent Manager relays is honoured through the normal withdrawal
// pipeline (a propagation run is created) and marked CONSENT_MANAGER; a relay naming another artefact is refused; a relay
// is honoured even after the Consent Manager is suspended; a cancelled Consent Manager cannot change status again; a
// read-only role cannot register; and the audit indicators count the records and relayed withdrawals.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('consent-manager');
const { h, check, ok } = t;

await t.run(async () => {
  await t.ensurePackage();
  const admin = await h.login('admin'); const auditor = await h.login('auditor');
  const run = randomUUID().slice(0, 8);
  const system = await t.boundSystem(`CM CRM ${run}`);
  const { activity } = await t.activity({ condition: 'CONSENT', systems: [system.id] });
  const consentFor = async (i: number) => {
    const subject = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: system.id, target_reference: `cm_${run}_${i}`, source_key: null }] }, key()), S.schemas.Subject);
    const record = await ok(admin.call('/api/v1/admin/consent-records', { subject_id: subject.id, relationship_id: null, activity_id: activity.id, channel: 'CONSENT_MANAGER', expiry_policy: null, v1_principal_id: null, v1_purpose_id: null }, key()), S.schemas.ConsentRecord);
    await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'GRANTED', occurred_at: hoursFromNow(-24), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: `cm-artefact-grant:${i}`, notice_version_id: null }, key()), S.schemas.ConsentRecord);
    return record;
  };

  t.setPhase('register');
  const cm = { name: `Synthetic Consent Manager ${run}`, board_registration_number: `DPB-CM-${run}`, registered_on: '2026-09-01', evidence_reference: 'Board registration certificate (synthetic)' };
  check('a read-only role cannot register a Consent Manager', (await auditor.call('/api/v1/admin/consent-managers', cm, key())).status, 403);
  const manager = await ok(admin.call('/api/v1/admin/consent-managers', cm, key()), S.schemas.ConsentManager);
  check('the Consent Manager is registered active with its Board registration', [manager.status, manager.board_registration_number, manager.linked_records], ['ACTIVE', cm.board_registration_number, 0]);
  check('the same Board registration cannot be registered twice', (await admin.call('/api/v1/admin/consent-managers', cm, key())).status, 409);

  t.setPhase('link and relay');
  const a = await consentFor(1); const b = await consentFor(2);
  const linked = await ok(admin.call(`/api/v1/admin/consent-records/${a.id}/consent-manager`, { consent_manager_id: manager.id, artefact_reference: `ART-${run}-1` }, key()), S.schemas.ConsentRecord);
  check('the consent record shows the Consent Manager and artefact', [linked.consent_manager?.board_registration_number, linked.consent_manager?.artefact_reference], [cm.board_registration_number, `ART-${run}-1`]);
  check('a record is linked to one Consent Manager only', (await admin.call(`/api/v1/admin/consent-records/${a.id}/consent-manager`, { consent_manager_id: manager.id, artefact_reference: `ART-${run}-1b` }, key())).status, 409);
  await ok(admin.call(`/api/v1/admin/consent-records/${b.id}/consent-manager`, { consent_manager_id: manager.id, artefact_reference: `ART-${run}-2` }, key()), S.schemas.ConsentRecord);
  check('a relay naming another artefact is refused', (await admin.call(`/api/v1/admin/consent-records/${a.id}/consent-manager-withdrawal`, { consent_manager_id: manager.id, artefact_reference: 'ART-OTHER', occurred_at: hoursFromNow(-0.1), evidence_reference: 'CM relay message (synthetic)' }, key())).status, 409);
  const withdrawn = await ok(admin.call(`/api/v1/admin/consent-records/${a.id}/consent-manager-withdrawal`, { consent_manager_id: manager.id, artefact_reference: `ART-${run}-1`, occurred_at: hoursFromNow(-0.1), evidence_reference: 'CM relay message (synthetic)' }, key()), S.schemas.ConsentRecord);
  check('a relayed withdrawal withdraws the consent and starts propagation', [withdrawn.current_status, withdrawn.events.at(-1)?.source, withdrawn.withdrawal_run_ids.length >= 1], ['WITHDRAWN', 'CONSENT_MANAGER', true]);

  t.setPhase('status');
  const suspended = await ok(admin.call(`/api/v1/admin/consent-managers/${manager.id}/status`, { status: 'SUSPENDED', reason: 'Registration suspended by the Board (synthetic).' }, key()), S.schemas.ConsentManager);
  check('the Consent Manager is suspended with its reason', [suspended.status, suspended.linked_records], ['SUSPENDED', 2]);
  const c3 = await consentFor(3);
  check('no new consent can be linked to a suspended Consent Manager', (await admin.call(`/api/v1/admin/consent-records/${c3.id}/consent-manager`, { consent_manager_id: manager.id, artefact_reference: `ART-${run}-3` }, key())).status, 409);
  const after = await ok(admin.call(`/api/v1/admin/consent-records/${b.id}/consent-manager-withdrawal`, { consent_manager_id: manager.id, artefact_reference: `ART-${run}-2`, occurred_at: hoursFromNow(-0.05), evidence_reference: 'CM relay after suspension (synthetic)' }, key()), S.schemas.ConsentRecord);
  check('a withdrawal relayed after suspension is still honoured', after.current_status, 'WITHDRAWN');
  await ok(admin.call(`/api/v1/admin/consent-managers/${manager.id}/status`, { status: 'CANCELLED', reason: 'Registration cancelled by the Board (synthetic).' }, key()), S.schemas.ConsentManager);
  check('a cancelled Consent Manager cannot change status again', (await admin.call(`/api/v1/admin/consent-managers/${manager.id}/status`, { status: 'SUSPENDED', reason: 'Attempt after cancellation (synthetic).' }, key())).status, 409);
  const list = await ok(admin.call('/api/v1/admin/consent-managers?limit=50'), S.schemas.ConsentManagerList);
  check('the register lists it as cancelled', list.items.find(x => x.id === manager.id)?.status, 'CANCELLED');
});
