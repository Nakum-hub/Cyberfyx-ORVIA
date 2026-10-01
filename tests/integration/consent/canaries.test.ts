// Withdrawal canaries ("canary trap"; migration 0079, contract 0.53.0) through the HTTP boundary, the machine sender and the
// database. Scenario: an online shop plants a decoy customer, who never consented, in its marketing list and CRM. Under test:
// only people with sensitive access see canaries; one owner registers and another activates (self-activation refused); a decoy
// that holds a granted consent cannot be activated; the marketing sender asking ORVIA to admit a send to the decoy is BLOCKED,
// is not told why, and leaves a SEND_ADMISSION hit naming the sender and system; an outbound message addressed to the decoy
// leaves an OUTBOUND_MESSAGE hit without being refused (the author cannot probe for canaries); an operator recording consent for
// the decoy leaves a CONSENT_RECORDED hit; staff record the decoy mailbox receiving a newsletter with evidence; Operations
// attention shows the count to an administrator who cannot see the canaries; each hit is reviewed once; a retired canary traps
// nothing; the database refuses editing or deleting hits; another tenant sees none of it.
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { senderEnrollment } from '../../../backend/auth/src/machine-profile.ts';

const t = operationsSuite('withdrawal-canaries');
const { h, check, ok, codes, db } = t;
const run = promisify(execFile);

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const scenario = await createMarketingScenario(h);
  const s = t.scope();
  const decoy = async (label: string) => {
    const p = await ok(owner.call('/api/v1/admin/principals', { environment_id: s.environment_id, legal_entity_id: s.legal_entity_id, display_name: `${label} (synthetic decoy)`, email: `decoy.${randomUUID().slice(0, 8)}@aster.example` }, key()), S.schemas.Principal, [201]);
    await ok(owner.call('/api/v1/admin/target-mappings', { principal_id: p.id, purpose_id: scenario.purpose.id, system_id: scenario.system.id }, key()), S.schemas.TargetMapping, [201]);
    return p;
  };
  const A = await decoy('Decoy shopper A'); const B = await decoy('Decoy shopper B');
  await run(process.execPath, ['--import', 'tsx', 'scripts/machine-init.ts', `confirm:${h.config.profile}`], { timeout: 180000 });
  const sender = senderEnrollment(h.config).identities.find(i => i.scope.environment_id === s.environment_id)!;
  const send = (principal: string) => fetch(`${h.config.origin}/api/v1/machine/simulator/send`, { method: 'POST', headers: { authorization: `Bearer ${sender.token}`, 'content-type': 'application/json', 'idempotency-key': randomUUID() },
    body: JSON.stringify({ attempt_id: randomUUID(), principal_reference_id: principal, purpose_id: scenario.purpose.id, system_id: scenario.system.id, message_class: 'MARKETING', order_reference: null }), signal: AbortSignal.timeout(15000) });
  const hits = async (canary: string) => (await ok(owner.call(`/api/v1/admin/canary-hits?canary_id=${canary}&limit=100`), S.schemas.CanaryHitList)).items;
  const attention = async () => (await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention)).items.find(i => i.kind === 'CANARY_TRAP_HIT');

  t.setPhase('registration');
  check('an administrator without sensitive access cannot see canaries', (await admin.call('/api/v1/admin/withdrawal-canaries?limit=10')).status, 403);
  check('an auditor cannot see canaries', (await auditor.call('/api/v1/admin/withdrawal-canaries?limit=10')).status, 403);
  const k = await ok(owner.call('/api/v1/admin/withdrawal-canaries', { label: unique('Decoy shopper A'), principal_id: A.id, planted_in: 'CRM marketing list "All customers" and the newsletter tool (synthetic)' }, key()), S.schemas.WithdrawalCanary);
  check('a canary is registered pending', [k.state, k.principal_email, k.open_hits], ['PENDING', A.email, 0]);
  check('the registrant cannot activate it', (await codes(owner.call(`/api/v1/admin/withdrawal-canaries/${k.id}/activation`, {}, key()))).codes, ['activator_must_differ_from_creator']);
  check('the same decoy cannot be registered twice', (await codes(owner.call('/api/v1/admin/withdrawal-canaries', { label: 'Again', principal_id: A.id, planted_in: 'Same list (synthetic)' }, key()))).codes, ['already_a_canary']);
  const active = await ok(reviewer.call(`/api/v1/admin/withdrawal-canaries/${k.id}/activation`, {}, key()), S.schemas.WithdrawalCanary);
  check('a second person activates it', [active.state, active.activated_by !== null], ['ACTIVE', true]);
  await db.query(`INSERT INTO app.consent_aggregates(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id,epoch,state) VALUES($1,$2,$3,$4,$5,1,'GRANTED')`, [s.tenant_id, s.legal_entity_id, s.environment_id, B.id, scenario.purpose.id]);
  const kb = await ok(owner.call('/api/v1/admin/withdrawal-canaries', { label: unique('Decoy shopper B'), principal_id: B.id, planted_in: 'Loyalty list (synthetic)' }, key()), S.schemas.WithdrawalCanary);
  check('a decoy holding a granted consent cannot be activated', (await codes(reviewer.call(`/api/v1/admin/withdrawal-canaries/${kb.id}/activation`, {}, key()))).codes, ['a_canary_must_hold_no_granted_consent']);

  t.setPhase('the sender markets to the decoy');
  const response = await send(A.id);
  const body = await response.json() as { decision: string; reason_codes: string[] };
  check('the send is blocked and the sender is not told it hit a canary', [response.status, body.decision, JSON.stringify(body).toLowerCase().includes('canary')], [200, 'BLOCK', false]);
  const sendHit = (await hits(k.id)).find(x => x.source === 'SEND_ADMISSION');
  check('a SEND_ADMISSION hit names the sending machine and system', [sendHit?.actor_domain, sendHit?.actor_id, sendHit?.system_id, sendHit?.detail.includes('MARKETING')], ['MACHINE', sender.id, scenario.system.id, true]);
  check('Operations attention shows the hit to an administrator who cannot see canaries', (await attention())?.count, 1);

  t.setPhase('an outbound message to the decoy');
  const transport = await ok(admin.call('/api/v1/admin/delivery-transports', { kind: 'SMTP', name: unique('Relay'), host: '127.0.0.1', port: 2525, security: 'NONE', from_address: 'privacy@customer.example', credential_env: 'ORVIA_TRANSPORT_TEST_SINK' }, key()), S.schemas.DeliveryTransport);
  await ok(owner.call(`/api/v1/admin/delivery-transports/${transport.id}/enable`, {}, key()), S.schemas.DeliveryTransport);
  const msg = await admin.call('/api/v1/admin/outbound-messages', { transport_id: transport.id, source_kind: 'MANUAL', source_id: null, recipient: A.email.toUpperCase(), subject: 'Festive sale (synthetic)', body: 'Synthetic promotional text.' }, key());
  check('the message is not refused, so its author cannot probe for canaries', msg.status, 201);
  check('an OUTBOUND_MESSAGE hit is recorded, matching the address case-insensitively', (await hits(k.id)).some(x => x.source === 'OUTBOUND_MESSAGE' && x.detail.includes('Festive sale')), true);

  t.setPhase('consent recorded for the decoy');
  const { activity } = await t.activity({ condition: 'CONSENT', systems: [scenario.system.id] });
  const subject = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: A.id, references: [] }, key()), S.schemas.Subject);
  const record = await ok(admin.call('/api/v1/admin/consent-records', { subject_id: subject.id, relationship_id: null, activity_id: activity.id, channel: 'PAPER_FORM', expiry_policy: null, v1_principal_id: null, v1_purpose_id: null }, key()), S.schemas.ConsentRecord);
  await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'GRANTED', occurred_at: hoursFromNow(-1), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'paper form 77 (synthetic)', notice_version_id: null }, key()), S.schemas.ConsentRecord);
  const consentHit = (await hits(k.id)).find(x => x.source === 'CONSENT_RECORDED');
  check('recording consent for the decoy leaves a CONSENT_RECORDED hit naming the operator', [consentHit?.actor_domain, consentHit?.actor_id, consentHit?.detail.includes('operator')], ['STAFF', h.users.admin!.id, true]);

  t.setPhase('the decoy mailbox receives a newsletter');
  check('an administrator cannot record a receipt', (await admin.call(`/api/v1/admin/withdrawal-canaries/${k.id}/hits`, { detail: 'x x x', evidence_reference: 'x x x', observed_at: hoursFromNow(-1), system_id: null }, key())).status, 403);
  const reported = await ok(owner.call(`/api/v1/admin/withdrawal-canaries/${k.id}/hits`, { detail: 'Newsletter "Weekend deals" from news@shop.example (synthetic).', evidence_reference: 'Mailbox export MX-12 (synthetic)', observed_at: hoursFromNow(-2), system_id: null }, key()), S.schemas.CanaryHit);
  check('staff record the receipt with its evidence', [reported.source, reported.evidence_reference], ['REPORTED_RECEIPT', 'Mailbox export MX-12 (synthetic)']);
  check('attention counts every unreviewed hit', (await attention())?.count, 4);
  check('the canary list shows four open hits', (await ok(owner.call('/api/v1/admin/withdrawal-canaries?limit=100'), S.schemas.WithdrawalCanaryList)).items.find(x => x.id === k.id)?.open_hits, 4);

  t.setPhase('review');
  const reviewed = await ok(reviewer.call(`/api/v1/admin/canary-hits/${sendHit!.id}/review`, { note: 'Traced to the campaign tool importing the full list; suppression list now applied (synthetic).' }, key()), S.schemas.CanaryHit);
  check('a hit is reviewed with who and what was found', [reviewed.reviewed_by !== null, reviewed.review_note?.startsWith('Traced')], [true, true]);
  check('a hit is reviewed once', (await codes(reviewer.call(`/api/v1/admin/canary-hits/${sendHit!.id}/review`, { note: 'Again.' }, key()))).codes, ['already_reviewed']);
  check('attention drops to the unreviewed hits', (await attention())?.count, 3);
  const refused = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'changed', (e: Error) => e.message);
  check('a hit cannot be edited', await refused('UPDATE app.canary_hits SET detail=$2 WHERE id=$1', [reported.id, 'rewritten']), 'canary_hit_is_reviewed_once_and_never_edited');
  check('a hit cannot be deleted', await refused('DELETE FROM app.canary_hits WHERE id=$1', [reported.id]), 'canary_records_are_retained');

  t.setPhase('retirement and tenancy');
  await ok(owner.call(`/api/v1/admin/withdrawal-canaries/${k.id}/retirement`, {}, key()), S.schemas.WithdrawalCanary);
  const before = (await hits(k.id)).length;
  await send(A.id);
  check('a retired canary traps nothing', (await hits(k.id)).length, before);
  check('another tenant sees none of it', [(await birch.call('/api/v1/admin/withdrawal-canaries?limit=100')).status === 200 ? (await ok(birch.call('/api/v1/admin/withdrawal-canaries?limit=100'), S.schemas.WithdrawalCanaryList)).items.some(x => x.id === k.id) : false], [false]);
});
