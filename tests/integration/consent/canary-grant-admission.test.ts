// Active canary -> recorded grant -> marketing admission. Written by Codex round 8 as a diagnostic; the owner decided on
// 2026-10-01 (revision 1.10, decision A, migration 0088) that an active decoy is never admitted for marketing, even after a
// recorded grant, so the suite now asserts BLOCK. All setup/targets are synthetic; no external or real message is sent.
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { senderEnrollment, agentEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { writeEvidence } from '../../../shared/testing/src/evidence.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';

const t = operationsSuite('canary-grant-admission');
const { h, db, check, ok } = t;
const observations: Record<string, unknown>[] = [];
let classification = 'NOT_OBSERVED';
const run = promisify(execFile);

await t.run(async () => {
  const owner = await h.login('owner'); const reviewer = await h.login('reviewer');
  const admin = await h.login('admin'); const auditor = await h.login('auditor');
  const birch = await h.login('birch');
  const scenario = await createMarketingScenario(h);
  const s = t.scope(); const scope = [s.tenant_id, s.legal_entity_id, s.environment_id];
  const principal = async (label: string) => {
    const p = await ok(owner.call('/api/v1/admin/principals', {
      environment_id: s.environment_id, legal_entity_id: s.legal_entity_id,
      display_name: unique(label), email: `grant-probe.${randomUUID().slice(0, 12)}@aster.example`,
    }, key()), S.schemas.Principal, [201]);
    check(`${label}: synthetic fixture`, p.synthetic, true);
    await ok(admin.call('/api/v1/admin/target-mappings', {
      principal_id: p.id, purpose_id: scenario.purpose.id, system_id: scenario.system.id,
    }, key()), S.schemas.TargetMapping, [201]);
    return p;
  };
  const decoy = await principal('Diagnostic decoy'); const ordinary = await principal('Ordinary control');
  const canary = await ok(owner.call('/api/v1/admin/withdrawal-canaries', {
    label: unique('Grant admission diagnostic'), principal_id: decoy.id,
    planted_in: 'Test-owned synthetic marketing target; no real mailbox or delivery.',
  }, key()), S.schemas.WithdrawalCanary);
  await ok(reviewer.call(`/api/v1/admin/withdrawal-canaries/${canary.id}/activation`, {}, key()), S.schemas.WithdrawalCanary);
  // Existing machine setup seeds only synthetic target mappings and allows the
  // registered sender to address the test-owned system. Root serializes runtime.
  await run(process.execPath, ['--import', 'tsx', 'scripts/machine-init.ts', `confirm:${h.config.profile}`], {
    windowsHide: true, timeout: 180000,
  });
  const sender = senderEnrollment(h.config).identities.find(i => i.scope.environment_id === s.environment_id)!;
  const foreign = senderEnrollment(h.config).identities.find(i => i.scope.tenant_id !== s.tenant_id)!;
  const agent = agentEnrollment(h.config).identities.find(i => i.scope.environment_id === s.environment_id)!;
  if (!sender || !foreign || !agent) throw new Error('Diagnostic needs scoped, foreign and non-sender synthetic identities');
  const fresh = (id = decoy.id) => S.SendRequest.parse({ attempt_id: randomUUID(), principal_reference_id: id,
    purpose_id: scenario.purpose.id, system_id: scenario.system.id, message_class: 'MARKETING', order_reference: null });
  const send = (value: ReturnType<typeof S.SendRequest.parse>, requestKey = randomUUID(), token = sender.token) => fetch(
    `${h.config.origin}/api/v1/machine/simulator/send`, { method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': requestKey },
      body: JSON.stringify(value), signal: AbortSignal.timeout(15000),
    });
  const result = async (value: ReturnType<typeof S.SendRequest.parse>, requestKey = randomUUID()) => {
    const response = await send(value, requestKey); check('diagnostic admission HTTP status', response.status, 200);
    return S.SendResult.parse(await response.json());
  };
  const counts = async () => (await db.query(`SELECT
    (SELECT count(*)::int FROM app.processing_decisions WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND principal_id=$4 AND purpose_id=$5 AND system_id=$6 AND NOT preview_only) AS decisions,
    (SELECT count(*)::int FROM app.send_records WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND principal_id=$4 AND purpose_id=$5 AND system_id=$6) AS sends,
    (SELECT count(*)::int FROM app.canary_hits WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND canary_id=$7 AND source='SEND_ADMISSION') AS send_hits,
    (SELECT count(*)::int FROM app.canary_hits WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND canary_id=$7 AND source='CONSENT_RECORDED') AS consent_hits`,
  [...scope, decoy.id, scenario.purpose.id, scenario.system.id, canary.id])).rows[0] as { decisions: number; sends: number; send_hits: number; consent_hits: number };
  const delta = (a: Awaited<ReturnType<typeof counts>>, b: Awaited<ReturnType<typeof counts>>) => ({
    decisions: b.decisions - a.decisions, sends: b.sends - a.sends,
    send_hits: b.send_hits - a.send_hits, consent_hits: b.consent_hits - a.consent_hits,
  });
  // A00 aggregate and DPDP registry grants are distinct models. The HTTP
  // registry grant alone must not be misreported as an A00 admission grant.
  const aggregateGrant = async (id: string) => {
    const tx = await db.connect();
    try {
      await tx.query('BEGIN');
      await tx.query("SELECT set_config('orvia.actor_id',$1,true),set_config('orvia.actor_domain','STAFF',true)", [h.users.admin!.id]);
      await tx.query(`INSERT INTO app.consent_aggregates(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id,epoch,state,notice_version_id)
        VALUES($1,$2,$3,$4,$5,1,'GRANTED',$6)`, [...scope, id, scenario.purpose.id, scenario.notice.version_id]);
      await tx.query('COMMIT');
    } catch (error) { await tx.query('ROLLBACK'); throw error; } finally { tx.release(); }
  };

  t.setPhase('authority and registry grant');
  check('agent cannot act as sender', (await send(fresh(), randomUUID(), agent.token)).status, 401);
  check('foreign sender cannot address this target', (await send(fresh(), randomUUID(), foreign.token)).status, 404);
  check('human staff session cannot admit a send', (await owner.call('/api/v1/machine/simulator/send', fresh(), key())).status, 403);
  check('auditor cannot record a canary receipt', (await auditor.call(`/api/v1/admin/withdrawal-canaries/${canary.id}/hits`, {
    detail: 'Synthetic receipt attempt.', evidence_reference: 'Synthetic receipt reference.', observed_at: hoursFromNow(-1), system_id: null,
  }, key())).status, 403);
  check('foreign tenant cannot retire the active decoy', (await birch.call(`/api/v1/admin/withdrawal-canaries/${canary.id}/retirement`, {}, key())).status, 404);
  const initial = await counts();
  const { activity } = await t.activity({ condition: 'CONSENT', systems: [scenario.system.id] });
  const subject = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: decoy.id, references: [] }, key()), S.schemas.Subject);
  const record = await ok(admin.call('/api/v1/admin/consent-records', { subject_id: subject.id, relationship_id: null,
    activity_id: activity.id, channel: 'PAPER_FORM', expiry_policy: null, v1_principal_id: null, v1_purpose_id: null,
  }, key()), S.schemas.ConsentRecord);
  const registered = await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, {
    event: 'GRANTED', occurred_at: hoursFromNow(-1), evidence_state: 'EVIDENCE_AVAILABLE',
    evidence_reference: 'Synthetic fraudulent paper grant diagnostic.', notice_version_id: null,
  }, key()), S.schemas.ConsentRecord);
  check('registered grant is current in the registry model', registered.current_status, 'GRANTED');
  const afterRegistry = await counts();
  check('registered grant records exactly one consent hit', delta(initial, afterRegistry), { decisions: 0, sends: 0, send_hits: 0, consent_hits: 1 });
  const registryOnly = await result(fresh());
  observations.push({ stage: 'REGISTRY_GRANT_ONLY', result: registryOnly, counts: await counts(),
    admission_model: 'No A00 aggregate grant was installed yet; this is not the otherwise-ALLOW adverse case.' });
  check('registry-only grant does not satisfy the separate A00 admission model', registryOnly.decision, 'BLOCK');

  t.setPhase('otherwise-ALLOW synthetic adverse fixture');
  await aggregateGrant(ordinary.id);
  const control = await result(fresh(ordinary.id));
  check('ordinary synthetic control satisfies real published-policy and target gates', control.decision, 'ALLOW');
  const beforeGrant = await counts();
  // Deliberately malicious synthetic source-state fixture, using the migrator
  // connection just as the existing canary suite seeds a granted aggregate.
  // This is not proof that the registry HTTP event propagates into A00 consent.
  await aggregateGrant(decoy.id);
  const beforeAdverse = await counts();
  check('adverse A00 grant triggers a second consent hit', delta(beforeGrant, beforeAdverse),
    { decisions: 0, sends: 0, send_hits: 0, consent_hits: 1 });
  const gates = (await db.query(`SELECT a.state,a.notice_version_id=$6 AS matching_notice,
    NOT EXISTS(SELECT 1 FROM app.workflows w WHERE w.tenant_id=$1 AND w.legal_entity_id=$2 AND w.environment_id=$3 AND w.principal_id=$4 AND w.purpose_id=$5 AND w.state<>'COMPLETED') AS no_unresolved_suppression
    FROM app.consent_aggregates a WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.principal_id=$4 AND a.purpose_id=$5`,
  [...scope, decoy.id, scenario.purpose.id, scenario.notice.version_id])).rows[0];
  check('adverse aggregate has matching grant and no unresolved suppression', gates,
    { state: 'GRANTED', matching_notice: true, no_unresolved_suppression: true });
  const mapping = (await db.query(`SELECT id,target_generation FROM app.target_mappings
    WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND principal_id=$4 AND purpose_id=$5 AND system_id=$6`,
  [...scope, decoy.id, scenario.purpose.id, scenario.system.id])).rows[0];
  const profile = loadProfile();
  const target = connectDatabase({ ...profile, database: `${profile.database}_targets` }).pool;
  let targetFacts: Record<string, unknown>;
  try {
    targetFacts = (await target.query(`SELECT generation::int AS generation,marketing_restricted,quarantined FROM public.marketing_memberships
      WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND resource_id=$4 AND principal_id=$5 AND purpose_id=$6 AND system_id=$7`,
    [...scope, mapping.id, decoy.id, scenario.purpose.id, scenario.system.id])).rows[0];
  } finally { await target.end(); }
  check('independent synthetic target matches generation and has no restriction or quarantine', targetFacts,
    { generation: Number(mapping.target_generation), marketing_restricted: false, quarantined: false });
  const attempt = fresh(); const transportKey = randomUUID();
  const observed = await result(attempt, transportKey); const afterAdverse = await counts();
  classification = observed.decision === 'BLOCK' && observed.reason_codes.join() === 'RECIPIENT_MARKETING_HOLD' ? 'BLOCKED_BY_ACTIVE_CANARY_HOLD'
    : `UNEXPECTED_${observed.decision}`;
  observations.push({ stage: 'ACTIVE_CANARY_WITH_REGISTRY_AND_A00_GRANTS', result: observed,
    before: beforeAdverse, after: afterAdverse, delta: delta(beforeAdverse, afterAdverse), gates, target: targetFacts,
    ordinary_control: control, classification, owner_decision: 'revision 1.10 decision A: active decoy is never admitted for marketing' });
  console.log('canary grant admission observation', JSON.stringify(observations.at(-1)));
  check('an otherwise-ALLOW marketing send to an active decoy with a recorded grant is BLOCK', observed.decision, 'BLOCK');
  check('the reason is the generic recipient hold, not a canary label', observed.reason_codes, ['RECIPIENT_MARKETING_HOLD']);
  check('one decision and one trap hit are recorded, and no send record', delta(beforeAdverse, afterAdverse),
    { decisions: 1, sends: 0, send_hits: 1, consent_hits: 0 });
  check('the stored decision is BLOCK, so a BLOCK never coexists with an ALLOW send record', (await db.query(`SELECT decision FROM app.processing_decisions
    WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND principal_id=$4 AND NOT preview_only ORDER BY evaluated_at DESC LIMIT 1`, [...scope, decoy.id])).rows[0]?.decision, 'BLOCK');
  check('admission result does not explicitly reveal the canary', JSON.stringify(observed).toLowerCase().includes('canary'), false);
  const preview = await ok(owner.call('/api/v1/admin/policy/evaluate', { principal_id: decoy.id, purpose_id: scenario.purpose.id, system_id: scenario.system.id, action: 'MARKETING_SEND' }, key()), S.schemas.Decision);
  check('the staff preview predicts the same BLOCK, so preview and send agree', [preview.decision, preview.reason_codes], ['BLOCK', ['RECIPIENT_MARKETING_HOLD']]);
  const ordinaryPreview = await ok(owner.call('/api/v1/admin/policy/evaluate', { principal_id: ordinary.id, purpose_id: scenario.purpose.id, system_id: scenario.system.id, action: 'MARKETING_SEND' }, key()), S.schemas.Decision);
  check('the ordinary control is still ALLOW in preview', ordinaryPreview.decision, 'ALLOW');
  const roles = (await db.query(`SELECT r.rolname, has_function_privilege(r.rolname, 'app.canary_marketing_hold(uuid)', 'EXECUTE') AS can
    FROM pg_roles r WHERE r.rolname = ANY($1) ORDER BY r.rolname`, [['orvia_app', 'orvia_worker', 'orvia_agent_control', 'orvia_machine_auth', 'orvia_sender']])).rows;
  check('only send admission and its staff preview may ask for the hold', Object.fromEntries(roles.map(r => [r.rolname, r.can])),
    { orvia_agent_control: false, orvia_app: true, orvia_machine_auth: false, orvia_sender: true, orvia_worker: false });

  t.setPhase('replay and conflicting attempt');
  check('same HTTP idempotency key returns the exact observation', await result(attempt, transportKey), observed);
  check('same attempt under a new HTTP key returns the exact observation', await result(attempt), observed);
  check('replays produce no new decision, send or canary hit', await counts(), afterAdverse);
  check('changed payload under the same HTTP key is refused', (await send({ ...attempt, principal_reference_id: ordinary.id }, transportKey)).status, 409);
  check('changed payload for the same attempt under a new key is refused', (await send({ ...attempt, principal_reference_id: ordinary.id })).status, 409);
  check('conflicting replays leave durable counts unchanged', await counts(), afterAdverse);

  t.setPhase('a canary transition and an admission check serialise on one principal-wide lock');
  const pending = await ok(owner.call('/api/v1/admin/withdrawal-canaries', {
    label: unique('Lock ordering probe'), principal_id: ordinary.id, planted_in: 'Test-owned synthetic marketing target; no real mailbox or delivery.',
  }, key()), S.schemas.WithdrawalCanary);
  const transition = await db.connect(); const admission = await db.connect();
  try {
    await transition.query('BEGIN');
    await transition.query(`UPDATE app.withdrawal_canaries SET state='RETIRED', retired_at=clock_timestamp() WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4`, [...scope, pending.id]);
    await admission.query('BEGIN');
    await admission.query("SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('lock_timeout','700ms',true)", scope);
    const waited = await admission.query('SELECT app.canary_marketing_hold($1)', [ordinary.id]).then(() => 'NOT_BLOCKED', (e: { code?: string }) => e.code ?? 'ERROR');
    check('while a transition is uncommitted, the admission check waits for it (lock timeout 55P03)', waited, '55P03');
    await admission.query('ROLLBACK');
  } finally { await transition.query('ROLLBACK').catch(() => undefined); transition.release(); admission.release(); }
  await ok(owner.call(`/api/v1/admin/withdrawal-canaries/${pending.id}/retirement`, {}, key()), S.schemas.WithdrawalCanary);

  t.setPhase('retirement returns the record to the ordinary rules');
  await ok(owner.call(`/api/v1/admin/withdrawal-canaries/${canary.id}/retirement`, {}, key()), S.schemas.WithdrawalCanary);
  const retired = await result(fresh());
  check('after retirement the ordinary consent rules decide again (the recorded grant stands, and its hit stays for review)', retired.decision, 'ALLOW');
});
writeEvidence('canary-grant-admission-observation', { owner_decision: 'revision 1.10 decision A',
  classification, observations, synthetic_source_fixture: true,
  limitation: 'Registry HTTP grant and deliberately seeded A00 grant are distinct; no real delivery or production admission was exercised.' });
