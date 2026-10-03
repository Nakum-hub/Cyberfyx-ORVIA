// Bounded readiness of the exact synthetic vendor policy dependency, not a business retry.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const [label] = process.argv.slice(2);
assert.equal(process.argv.length, 3);
assert.match(label ?? '', /^[a-z0-9-]{1,40}$/);
assert.equal(process.env.ORVIA_PROFILE, 'codex-a00');
const started_at = new Date().toISOString(), observations = [], deadline = Date.now() + 30000;
let ready = false;
while (Date.now() < deadline && !ready) {
  const observation = { at: new Date().toISOString() };
  try {
    const decide = async (role, expected) => {
      const response = await fetch('http://127.0.0.1:58181/v1/data/orvia/vendor/authorize', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(2000),
        body: JSON.stringify({ input: { actor_domain: 'VENDOR_STAFF', role, capability: 'vendor.team.manage', mfa_verified: true } }),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).result, expected);
    };
    await decide('VENDOR_ADMIN', true); await decide('AUDITOR', false);
    ready = true; observation.result = 'READY_ALLOW_AND_DENY';
  } catch (error) {
    observation.result = 'NOT_READY';
    observation.error_class = ['TimeoutError','AbortError','TypeError','AssertionError'].includes(error?.name) ? error.name : 'OTHER';
  }
  observations.push(observation);
  if (!ready) await new Promise(resolve => setTimeout(resolve, 500));
}
const artifact = `handoffs/codex/artifacts/R8-${label}-vendor-policy-prerequisite.json`;
writeFileSync(artifact, JSON.stringify({ started_at, ended_at: new Date().toISOString(), fixed_synthetic_endpoint: true,
  readiness_only: true, observations, result: ready ? 'PASS' : 'FAIL', exit_code: ready ? 0 : 1 }, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ artifact, exit_code: ready ? 0 : 1 }) + '\n');
process.exitCode = ready ? 0 : 1;
