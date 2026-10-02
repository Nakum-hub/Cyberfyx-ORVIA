// Revision 1.13: the company website managing vendor accounts through the central vendor service, on a fresh vendor DB.
// Under test: only correctly signed, fresh, unreplayed requests from an active ORVIA client are accepted; each operation is
// limited to the client's scopes; the website receives setup codes, never passwords; a super administrator can be created
// only while none exists; a key signed for another product is refused; every action is audited.
import assert from 'node:assert/strict';
import { createHmac, createHash, randomUUID } from 'node:crypto';
import { vendorHarness } from './harness.ts';
import { createProvisioningClient, revokeProvisioningClient } from '../../../scripts/vendor-provisioning-client.ts';
import { signProvisioningRequest, PROVISIONING_HEADERS } from '../../../shared/contracts/src/vendor-provisioning.ts';

process.env.ORVIA_PROFILE = 'vendor-a00';
const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { results.push({ name, result: 'FAIL', detail: `${JSON.stringify(actual)?.slice(0, 300)} != ${JSON.stringify(expected)?.slice(0, 300)}` }); console.log(`FAIL ${name}: ${JSON.stringify(actual)?.slice(0, 300)}`); }
}
const h = await vendorHarness();
try {
  const website = await createProvisioningClient('website', ['accounts.read', 'accounts.create.super_admin', 'accounts.create.admin', 'accounts.create.member', 'accounts.setup_code', 'accounts.deactivate'], h.database);
  const membersOnly = await createProvisioningClient('members-only', ['accounts.create.member'], h.database);
  const call = async (client: { id: string; secret: string }, method: 'GET' | 'POST', path: string, body?: unknown, tamper: (headers: Record<string, string>) => void = () => {}) => {
    const text = body === undefined ? '' : JSON.stringify(body);
    const headers: Record<string, string> = { 'content-type': 'application/json', ...signProvisioningRequest(client, method, path, text) };
    tamper(headers);
    const response = await h.handler(new Request(h.config.origin + path, { method, headers, body: method === 'POST' ? text : null }));
    const raw = await response.text(); let data: unknown; try { data = JSON.parse(raw); } catch { data = raw; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertions read arbitrary response fields
    return { status: response.status, data: data as any };
  };
  const A = '/api/v1/vendor/provisioning/accounts';
  const codeOf = (r: { data: { error?: { field_errors?: { code: string }[] } } }) => r.data.error?.field_errors?.[0]?.code;

  // --- first setup from the website ---
  const owner = await call(website, 'POST', A, { name: 'Company Owner', email: 'owner@company.example', role: 'VENDOR_SUPER_ADMIN' });
  check('the website creates the super administrator and gets a setup code, not a password', [owner.status, owner.data.account.role, owner.data.account.password_set, typeof owner.data.setup_code, 'password' in owner.data], [201, 'VENDOR_SUPER_ADMIN', false, 'string', false]);
  check('first-run setup is then closed', (await h.session().json('/api/v1/vendor/setup')).data.state, 'COMPLETED');
  check('a second super administrator is refused', codeOf(await call(website, 'POST', A, { name: 'Another Owner', email: 'owner2@company.example', role: 'VENDOR_SUPER_ADMIN' })), 'super_admin_exists');
  const password = `Owner-${randomUUID()}`;
  check('the owner sets their password at the vendor service with the code', (await h.session().json('/api/v1/vendor/account-setup', { email: 'owner@company.example', setup_code: owner.data.setup_code, new_password: password })).status, 200);
  check('and signs in', (await h.session().json('/api/auth/vendor/sign-in/email', { email: 'owner@company.example', password, rememberMe: false })).status, 200);
  const admin = await call(website, 'POST', A, { name: 'Company Admin', email: 'admin@company.example', role: 'VENDOR_ADMIN' });
  const member = await call(website, 'POST', A, { name: 'Remote Auditor', email: 'auditor@company.example', role: 'AUDITOR', setup_code_valid_hours: 24 });
  check('the website adds an administrator and a member', [admin.status, member.status], [201, 201]);
  const list = await call(website, 'GET', A);
  check('the website reads vendor accounts (never client-organisation accounts)', [list.status, list.data.accounts.map((a: { email: string }) => a.email).sort()], [200, ['admin@company.example', 'auditor@company.example', 'owner@company.example']]);
  const reissued = await call(website, 'POST', `${A}/${member.data.account.user_id}/setup-code`, {});
  check('the website re-issues a setup code', [reissued.status, reissued.data.setup_code !== member.data.setup_code], [200, true]);
  check('the earlier code no longer works', (await h.session().json('/api/v1/vendor/account-setup', { email: 'auditor@company.example', setup_code: member.data.setup_code, new_password: 'Some-password-123' })).status, 403);

  // --- scopes ---
  check('a members-only client cannot create an administrator', codeOf(await call(membersOnly, 'POST', A, { name: 'Sneaky Admin', email: 'sneaky@company.example', role: 'VENDOR_ADMIN' })), 'scope_not_granted');
  check('nor read accounts', (await call(membersOnly, 'GET', A)).status, 403);
  check('but can add a member', (await call(membersOnly, 'POST', A, { name: 'Allowed Member', email: 'allowed@company.example', role: 'LEAD_AUDITOR' })).status, 201);
  check('the super administrator cannot be deactivated through the website', codeOf(await call(website, 'POST', `${A}/${owner.data.account.user_id}/deactivate`, {})), 'super_admin_not_deactivated');
  check('a member can be deactivated', (await call(website, 'POST', `${A}/${member.data.account.user_id}/deactivate`, {})).status, 200);

  // --- signature, freshness, replay, product ---
  check('a wrong signature is refused', codeOf(await call(website, 'GET', A, undefined, hd => { hd[PROVISIONING_HEADERS.signature] = '0'.repeat(64); })), 'bad_signature');
  check('a changed body is refused', codeOf(await call(website, 'POST', A, { name: 'X', email: 'x@company.example', role: 'AUDITOR' }, hd => { hd[PROVISIONING_HEADERS.signature] = signProvisioningRequest(website, 'POST', A, '{"name":"Y"}')[PROVISIONING_HEADERS.signature]!; })), 'bad_signature');
  const old = Date.now() - 10 * 60_000;
  check('a stale request is refused', codeOf(await call(website, 'GET', A, undefined, hd => Object.assign(hd, signProvisioningRequest(website, 'GET', A, '', old)))), 'stale');
  const fixed = signProvisioningRequest(website, 'GET', A, '', Date.now(), `replay-${randomUUID().slice(0, 12)}`);
  check('a request is accepted once', (await call(website, 'GET', A, undefined, hd => Object.assign(hd, fixed))).status, 200);
  check('the same request replayed is refused', codeOf(await call(website, 'GET', A, undefined, hd => Object.assign(hd, fixed))), 'replayed');
  const otherProduct = (() => { const ts = String(Math.floor(Date.now() / 1000)); const nonce = `other-${randomUUID().slice(0, 12)}`;
    const sig = createHmac('sha256', Buffer.from(website.secret, 'base64url')).update(`NEXTPRODUCT\nGET\n${A}\n${ts}\n${nonce}\n${createHash('sha256').update('').digest('hex')}`).digest('hex');
    return { [PROVISIONING_HEADERS.timestamp]: ts, [PROVISIONING_HEADERS.nonce]: nonce, [PROVISIONING_HEADERS.signature]: sig }; })();
  check('a request signed for another product is refused, even with the right key', codeOf(await call(website, 'GET', A, undefined, hd => Object.assign(hd, otherProduct))), 'bad_signature');
  check('an unknown client is refused', codeOf(await call({ id: randomUUID(), secret: website.secret }, 'GET', A)), 'unknown_client');
  check('a browser session cookie is not accepted on this API', (await call(website, 'GET', A, undefined, hd => { hd.cookie = 'orvia.vendor.session_token=x'; })).status, 400);
  await revokeProvisioningClient(membersOnly.id, h.database);
  check('a revoked client is refused', codeOf(await call(membersOnly, 'POST', A, { name: 'After Revoke', email: 'after@company.example', role: 'AUDITOR' })), 'unknown_client');
  check('only the sealed secret is stored', (await h.operator.query('SELECT secret_ciphertext FROM vendor.provisioning_clients WHERE id=$1', [website.id])).rows[0].secret_ciphertext.toString('utf8').includes(website.secret), false);
  check('website actions are audited as the provisioning client', (await h.operator.query("SELECT count(*)::int n FROM vendor.audit_events WHERE actor_id=$1 AND actor_domain='MACHINE' AND operation LIKE 'vendor.provisioning.%'", [website.id])).rows[0].n >= 5, true);
} finally {
  await h.close();
  const failures = results.filter(r => r.result === 'FAIL').length;
  console.log(`\nprovisioning: ${results.length - failures}/${results.length} passed`);
  if (failures) process.exitCode = 1;
}
