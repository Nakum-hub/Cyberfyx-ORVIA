// Fresh Linux installer qualification through the public HTTPS boundary.
// Generated synthetic credentials stay under .local and are never printed.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
const mode = process.argv[2];
if (!['setup', 'verify'].includes(mode)) throw new Error('Use setup or verify');
if (process.env.ORVIA_PROFILE !== 'rehearsal') throw new Error('Dedicated rehearsal qualification only');
const origin = 'https://127.0.0.1:4330';
const fixturePath = resolve('.local/qualification/first-run.json');
let checks = 0;
function check(label, actual, expected) { assert.deepEqual(actual, expected, label); checks++; console.log('PASS ' + label); }
async function call(path, body, jar) {
  const response = await fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', headers: { origin, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(jar?.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  if (jar) for (const cookie of response.headers.getSetCookie()) { const first = cookie.split(';')[0]; const at = first.indexOf('='); jar.set(first.slice(0, at), first.slice(at + 1)); }
  return { status: response.status, body: await response.json() };
}
let fixture;
if (mode === 'setup') {
  check('fresh installation setup is OPEN', (await call('/api/v1/setup')).body.state, 'OPEN');
  mkdirSync('.local/qualification', { recursive: true, mode: 0o700 });
  fixture = { organisation_name: 'Synthetic Round 4 Linux Qualification', owner: { name: 'Synthetic Owner', email: 'round4-owner@example.test', password: randomBytes(32).toString('hex') }, admin: { name: 'Synthetic Administrator', email: 'round4-admin@example.test', password: randomBytes(32).toString('hex') } };
  writeFileSync(fixturePath, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 });
  const setup_code = readFileSync('.local/profiles/rehearsal/auth/setup-code.txt', 'utf8').trim();
  const payload = { ...fixture, setup_code };
  const result = await call('/api/v1/setup', payload);
  check('first-run HTTPS setup creates owner and administrator', result.status, 201);
  check('setup response confirms completion', result.body.completed, true);
  check('setup code cannot be reused', (await call('/api/v1/setup', payload)).status, 409);
  fixture.installation_id = loadProfile().installation_id;
  writeFileSync(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
} else fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
assert.match(fixture.installation_id, /^[0-9a-f-]{36}$/i);
check('installation identity is retained', loadProfile().installation_id, fixture.installation_id);
check('first-run setup remains COMPLETED', (await call('/api/v1/setup')).body.state, 'COMPLETED');
for (const role of ['owner', 'admin']) {
  const user = fixture[role]; const jar = new Map();
  check(`${role} password sign-in`, (await call('/api/auth/staff/sign-in/email', { email: user.email, password: user.password, rememberMe: false }, jar)).status, 200);
  if (mode === 'setup') {
    const enabled = await call('/api/auth/staff/two-factor/enable', { password: user.password, method: 'totp' }, jar);
    check(`${role} authenticator enrollment`, enabled.status, 200);
    user.totp_uri = enabled.body.totpURI;
    writeFileSync(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
  }
  check(`${role} authenticator verification`, (await call('/api/auth/staff/two-factor/verify-totp', { code: authenticatorCode(user.totp_uri), trustDevice: false }, jar)).status, 200);
  const session = await call('/api/v1/session', undefined, jar);
  check(`${role} authenticated session remains available`, session.status, 200);
  await call('/api/auth/staff/sign-out', {}, jar);
}
console.log(JSON.stringify({ mode, checks, fixture: 'SYNTHETIC_ONLY', transport: 'HTTPS_WITH_CA_AND_HOSTNAME_VERIFICATION' }));
