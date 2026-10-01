// Measured withdrawal enforcement ("real-time consent enforcement"; master §§ consent, send admission, propagation).
// Two separate questions, measured on this host with synthetic targets, never generalised to a named production integration:
// A. Processing boundary: after the portal withdrawal returns, is the very next send admission refused, and how long does the
//    admission decision take? Twenty grant/withdraw cycles; every first post-withdrawal admission must be BLOCK.
// B. Downstream effect: from the withdrawal API returning to the target record being independently read back as suppressed,
//    with one operations-runner cycle started straight away. The runner's own cadence (a 30-second loop unless woken) is stated
//    in the evidence, because it bounds the worst case when nothing wakes it.
import { randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';
import { senderEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { operationsRunner } from '../../../services/worker/src/operations-runner.ts';
import { customerEnvironment } from '../../../scripts/credentials.ts';

const t = operationsSuite('withdrawal-timing');
const { h, check, ok } = t;
const run = promisify(execFile);
const target = recordsTarget();
const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]!; };

try { await t.run(async () => {
  t.setPhase('A: the processing boundary');
  // Twenty independent purposes for the same person, each granted, so every cycle starts from standing consent with no earlier
  // withdrawal. (A re-grant after a withdrawal is not admitted until the withdrawal's suppression work is resolved: checked below.)
  const scenarios = [];
  for (let i = 0; i < 20; i++) { const sc = await createMarketingScenario(h); await sc.change('grant'); scenarios.push(sc); }
  const scenario = scenarios[0]!;
  await run(process.execPath, ['--import', 'tsx', 'scripts/machine-init.ts', `confirm:${h.config.profile}`], { timeout: 180000 });
  const sender = senderEnrollment(h.config).identities.find(i => i.scope.environment_id === scenario.scope.environment_id)!;
  const send = async (sc: typeof scenario) => { const started = performance.now(); const r = await fetch(`${h.config.origin}/api/v1/machine/simulator/send`, { method: 'POST', headers: { authorization: `Bearer ${sender.token}`, 'content-type': 'application/json', 'idempotency-key': randomUUID() },
    body: JSON.stringify({ attempt_id: randomUUID(), principal_reference_id: h.users.alice!.principal_id, purpose_id: sc.purpose.id, system_id: sc.system.id, message_class: 'MARKETING', order_reference: null }), signal: AbortSignal.timeout(15000) });
    const body = await r.text(); let decision = `HTTP ${r.status}`; try { if (r.status === 200) decision = (JSON.parse(body) as { decision: string }).decision; else decision += ` ${body.slice(0, 160)}`; } catch { /* the status says enough */ }
    return { decision, ms: performance.now() - started }; };
  const firstAfter: string[] = []; const decisionMs: number[] = []; const grantedAllowed: string[] = [];
  for (const sc of scenarios) {
    grantedAllowed.push((await send(sc)).decision);
    await sc.change('withdraw');
    const after = await send(sc); firstAfter.push(after.decision); decisionMs.push(after.ms);
  }
  check('every send while consent stood was admitted (the control)', grantedAllowed, Array(20).fill('ALLOW'));
  check('in 20 of 20 cycles the first send after the withdrawal returned was refused: no window in which an old grant is used', firstAfter, Array(20).fill('BLOCK'));
  const measured = { cycles: 20, decision_ms_p50: Math.round(pct(decisionMs, 0.5)), decision_ms_p95: Math.round(pct(decisionMs, 0.95)), decision_ms_max: Math.round(Math.max(...decisionMs)) };
  console.log('MEASURED processing boundary', JSON.stringify(measured));
  check('the post-withdrawal admission decision is measured (p50, p95, max ms) and each took under 5 seconds on this host', [measured.decision_ms_max < 5000, measured], [true, measured]);
  await scenario.change('grant');
  check('a re-grant does not silently restart marketing while the withdrawal\'s suppression work is unresolved', (await send(scenario)).decision, 'BLOCK');

  t.setPhase('B: the downstream effect');
  await t.ensurePackage();
  const admin = await h.login('admin'); const s = t.scope();
  const crm = await t.boundSystem('Timed CRM');
  const { activity } = await t.activity({ condition: 'CONSENT', systems: [crm.id] });
  const runner = operationsRunner();
  try {
    const propagationMs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const ref = `tm_${randomUUID().slice(0, 12)}`;
      const subject = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: crm.id, target_reference: ref, source_key: null }] }, key()), S.schemas.Subject);
      await target.seed(s, crm.id, [{ reference: ref, fields: { email: `timed${i}@records.example`, segment: 'newsletter' } }]);
      const record = await ok(admin.call('/api/v1/admin/consent-records', { subject_id: subject.id, relationship_id: null, activity_id: activity.id, channel: 'WEB_FORM', expiry_policy: null, v1_principal_id: null, v1_purpose_id: null }, key()), S.schemas.ConsentRecord);
      await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'GRANTED', occurred_at: hoursFromNow(-48), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'web-form:granted', notice_version_id: null }, key()), S.schemas.ConsentRecord);
      const started = performance.now();
      await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'WITHDRAWN', occurred_at: hoursFromNow(-0.01), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'web-form:withdrawn', notice_version_id: null }, key()), S.schemas.ConsentRecord);
      let suppressed = false;
      for (let n = 0; n < 10 && !suppressed; n++) { await runner.once(); suppressed = (await target.record(crm.id, ref)).suppressed === true; }
      propagationMs.push(performance.now() - started);
      check(`withdrawal ${i + 1}: the target record is independently read back as suppressed`, suppressed, true);
    }
    const effect = { withdrawals: 5, propagation_ms_p50: Math.round(pct(propagationMs, 0.5)), propagation_ms_max: Math.round(Math.max(...propagationMs)), runner_loop_seconds_when_not_woken: 30,
      basis: 'Synthetic records adapter on loopback; one runner cycle started immediately after the withdrawal returned. A named production connector needs its own measurement.' };
    console.log('MEASURED downstream effect', JSON.stringify(effect));
    check('time from withdrawal to verified suppression is measured with its basis stated', [effect.propagation_ms_max > 0, effect], [true, effect]);

    t.setPhase('C: the supervised runner wakes on a withdrawal');
    // The real runner loop as a separate process. It has just finished a pass and would sleep 30 seconds; the withdrawal's
    // NOTIFY (migration 0081) must start the next pass at once. Nothing in this test calls the runner.
    const loop = spawn(process.execPath, ['--import', 'tsx', 'services/worker/src/operations-runner.ts'], { windowsHide: true, env: customerEnvironment({ ...process.env, ORVIA_WORKSPACE_ROOT: process.cwd() }, h.config.profile), stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    let passes = 0; let pending = ''; let failedToStart = false;
    loop.once('error', () => { failedToStart = true; });
    loop.stdout.on('data', (chunk: Buffer) => {
      pending += chunk.toString(); const lines = pending.split('\n'); pending = lines.pop() ?? '';
      for (const line of lines) {
        try { const value = JSON.parse(line); if (value.at && Array.isArray(value.reports)) passes++; } catch { /* Incomplete/non-report output is not readiness. */ }
      }
    });
    try {
      for (let i = 0; i < 300 && passes < 1; i++) await new Promise(r => setTimeout(r, 100));
      check('the real supervised runner completed a pass before measuring its notification wake', [passes > 0, !failedToStart, loop.exitCode === null && loop.signalCode === null], [true, true, true]);
      await new Promise(r => setTimeout(r, 1500));
      const ref = `tl_${randomUUID().slice(0, 12)}`;
      const subject = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: crm.id, target_reference: ref, source_key: null }] }, key()), S.schemas.Subject);
      await target.seed(s, crm.id, [{ reference: ref, fields: { email: 'looped@records.example', segment: 'newsletter' } }]);
      const record = await ok(admin.call('/api/v1/admin/consent-records', { subject_id: subject.id, relationship_id: null, activity_id: activity.id, channel: 'WEB_FORM', expiry_policy: null, v1_principal_id: null, v1_purpose_id: null }, key()), S.schemas.ConsentRecord);
      await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'GRANTED', occurred_at: hoursFromNow(-48), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'web-form:granted', notice_version_id: null }, key()), S.schemas.ConsentRecord);
      const started = performance.now();
      await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'WITHDRAWN', occurred_at: hoursFromNow(-0.01), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'web-form:withdrawn', notice_version_id: null }, key()), S.schemas.ConsentRecord);
      let suppressed = false;
      while (!suppressed && performance.now() - started < 25_000) { await new Promise(r => setTimeout(r, 100)); suppressed = (await target.record(crm.id, ref)).suppressed === true; }
      const wokenMs = Math.round(performance.now() - started);
      console.log('MEASURED supervised runner', JSON.stringify({ withdrawal_to_verified_suppression_ms: wokenMs }));
      check('the running runner suppressed the target well inside its 30-second loop: it was woken, not waiting', [suppressed, wokenMs < 15_000, { withdrawal_to_verified_suppression_ms: wokenMs }], [true, true, { withdrawal_to_verified_suppression_ms: wokenMs }]);
    } finally {
      if (loop.pid && loop.exitCode === null && loop.signalCode === null) {
        const closed = once(loop, 'close');
        if (loop.connected) loop.send('orvia-stop', () => {}); else loop.kill('SIGTERM');
        const forced = setTimeout(() => { if (loop.exitCode === null && loop.signalCode === null) loop.kill(); }, 10000);
        try { await closed; } finally { clearTimeout(forced); }
      }
    }
  } finally { await runner.close(); }
}); } finally { await target.end(); }
