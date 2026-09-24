// DPDP operations: correction propagation (quality s4 "Correction propagation").
// Under test: a corrected value is written first to the configured system of
// record and then to copies, verified by comparing digests rather than values;
// the corrected value is purged once settled; an unsupported system is reported
// honestly; and with no single configured system of record nothing is written.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';

const t = operationsSuite('correction');
const { h, check, ok, codes, db } = t;
const target = recordsTarget();

await t.run(async () => {
  try {
    await t.ensurePackage();
    const admin = await h.login('admin');
    const s = t.scope();
    const principal = h.users.alice!.principal_id!;
    const contact = await ok(admin.call('/api/v1/admin/personal-data-categories', { name: unique('Contact email'), description: 'Synthetic contact email category.', legacy_code: 'CONTACT_DETAILS' }, key()), S.schemas.DataCategory);
    const record = await t.boundSystem('Customer master', { system_of_record_for: [contact.id] });
    const copy = await t.boundSystem('Marketing copy', { holds: [contact.id] });
    const manual = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: `Call centre notes ${randomUUID().slice(0, 6)}`, connector: 'LEGACY_MANUAL' }, key()), S.schemas.System);
    const ref = `cr_${randomUUID().slice(0, 12)}`;
    const subject = await t.principalSubject('alice', [record, copy, manual].map(x => ({ system_id: x.id, target_reference: ref })));
    for (const system of [record, copy]) await target.seed(s, system.id, [{ reference: ref, fields: { email: 'alice.old@records.example', city: 'Synthetic city' } }]);
    const newValue = `alice.${randomUUID().slice(0, 6)}@records.example`;

    t.setPhase('propagation');
    const request = await t.executingRequest('CORRECTION', principal, [record, copy, manual].map(x => ({ system_id: x.id, action: 'CORRECT_RECORD' })));
    check('a correction run must name the corrected values', (await codes(admin.call('/api/v1/admin/workflow-runs/rights', { rights_request_id: request.id, subject_id: subject.id, corrections: [] }, key()))).codes, ['correction_request_names_the_corrected_values']);
    const run = await ok(admin.call('/api/v1/admin/workflow-runs/rights', { rights_request_id: request.id, subject_id: subject.id, corrections: [{ field: 'email', data_category_id: contact.id, value: newValue }] }, key()), S.schemas.WorkflowRun);
    check('a correction is not destructive, so it needs no dry-run approval', [run.kind, run.status], ['CORRECTION', 'APPROVED']);
    const actions = async () => (await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}/actions?limit=100`), S.schemas.DownstreamActionList)).items.sort((a, b) => a.ordinal - b.ordinal);
    const planned = await actions();
    check('the system of record is written before any copy', planned.slice(0, 2).map(a => a.system_id), [record.id, copy.id]);
    check('the corrected value is held only as a digest on the action', planned.slice(0, 2).every(a => a.payload_digest !== null), true);
    await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    const done = await actions();
    check('both automated systems are corrected and verified', done.slice(0, 2).map(a => a.state), ['verified', 'verified']);
    check('the manual system is reported not supported', done.find(a => a.system_id === manual.id)?.state, 'not_supported');
    check('the target now holds the corrected value', [(await target.record(record.id, ref)).fields.email, (await target.record(copy.id, ref)).fields.email], [newValue, newValue]);
    check('verification compares digests and records no personal value', JSON.stringify(done.flatMap(a => a.verifications)).includes(newValue), false);
    const kept = Number((await db.query('SELECT count(*) n FROM app.downstream_action_payloads WHERE action_id=ANY($1::uuid[])', [done.map(a => a.id)])).rows[0].n);
    check('the corrected value is purged once its actions are settled', kept, 0);

    t.setPhase('source of truth unresolved');
    const phone = await ok(admin.call('/api/v1/admin/personal-data-categories', { name: unique('Phone'), description: 'Synthetic phone category.', legacy_code: null }, key()), S.schemas.DataCategory);
    const a = await t.boundSystem('Billing', { system_of_record_for: [phone.id] });
    const b = await t.boundSystem('Support desk', { system_of_record_for: [phone.id] });
    await t.principalSubject('alice', [a, b].map(x => ({ system_id: x.id, target_reference: ref })));
    for (const system of [a, b]) await target.seed(s, system.id, [{ reference: ref, fields: { phone: '000' } }]);
    const conflicted = await t.executingRequest('CORRECTION', principal, [a, b].map(x => ({ system_id: x.id, action: 'CORRECT_RECORD' })));
    const blocked = await ok(admin.call('/api/v1/admin/workflow-runs/rights', { rights_request_id: conflicted.id, subject_id: subject.id, corrections: [{ field: 'phone', data_category_id: phone.id, value: '111' }] }, key()), S.schemas.WorkflowRun);
    const blockedActions = (await ok(admin.call(`/api/v1/admin/workflow-runs/${blocked.id}/actions?limit=100`), S.schemas.DownstreamActionList)).items;
    check('two configured systems of record leave the source of truth unresolved, and nothing is written', blockedActions.map(x => [x.state, x.block_reason]), [['blocked', 'AUTHORITATIVE_SOURCE_UNRESOLVED'], ['blocked', 'AUTHORITATIVE_SOURCE_UNRESOLVED']]);
    check('the run records which category had no single system of record', (blocked.configuration.authoritative_source_unresolved as string[]), [phone.id]);
    await ok(admin.call(`/api/v1/admin/workflow-runs/${blocked.id}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    check('the targets are unchanged', [(await target.record(a.id, ref)).fields.phone, (await target.record(b.id, ref)).fields.phone], ['000', '000']);
  } finally { await target.end(); }
});
