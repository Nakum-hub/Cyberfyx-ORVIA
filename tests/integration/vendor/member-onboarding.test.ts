// Revision 1.13: vendor members' first password, on a fresh throwaway vendor database.
// Under test: an administrator either sets a member's password or issues a one-time setup code; the member uses the code
// once to set the password; the code is single use, counts wrong attempts and never reveals whether an email exists; a
// later sign-in (as after reinstalling ORVIA on a device) needs only email and password; an administrator can reset a
// forgotten password with a new code; an administrator cannot touch the super administrator.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { vendorHarness } from './harness.ts';

process.env.ORVIA_PROFILE = 'vendor-a00';
const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { results.push({ name, result: 'FAIL', detail: `${JSON.stringify(actual)?.slice(0, 300)} != ${JSON.stringify(expected)?.slice(0, 300)}` }); console.log(`FAIL ${name}: ${JSON.stringify(actual)?.slice(0, 300)}`); }
}
const h = await vendorHarness();
try {
  const anon = h.session();
  const code = await h.issueSetupCode();
  const owner = { email: 'owner@vendor.example', password: `Owner-${randomUUID()}`, domain: 'vendor' as const } as { email: string; password: string; totp?: string; domain: 'vendor' };
  const admin = { email: 'admin@vendor.example', password: `Admin-${randomUUID()}`, domain: 'vendor' as const } as typeof owner;
  await anon.json('/api/v1/vendor/setup', { setup_code: code, owner: { name: 'Vendor Owner', email: owner.email, password: owner.password }, admin: { name: 'Vendor Admin', email: admin.email, password: admin.password } });
  const adm = await h.login(admin);
  const signIn = (email: string, password: string) => h.session().json('/api/auth/vendor/sign-in/email', { email, password, rememberMe: false });
  const setup = (email: string, setup_code: string, new_password: string) => anon.json('/api/v1/vendor/account-setup', { email, setup_code, new_password });

  // --- setup code ---
  const created = await adm.json('/api/v1/vendor/team', { name: 'Coded Auditor', email: 'coded@vendor.example', role: 'AUDITOR', password_mode: 'SETUP_CODE' });
  check('a member added with a setup code has no password yet and a code shown once', [created.status, created.data.member.password_set, created.data.one_time_password, typeof created.data.setup_code, created.data.setup_code_expires_at !== null], [201, false, null, 'string', true]);
  check('only the code digest is stored', (await h.operator.query('SELECT code_digest FROM vendor.account_setup_codes')).rows.every(r => r.code_digest !== created.data.setup_code), true);
  check('without a password the member cannot sign in', (await signIn('coded@vendor.example', 'anything-at-all-123')).status !== 200, true);
  const wrong = await setup('coded@vendor.example', 'WRONG-WRONG-WRONG-WRONG', 'A-good-password-123');
  const unknown = await setup('nobody@vendor.example', created.data.setup_code, 'A-good-password-123');
  check('a wrong code and an unknown email get the same refusal', [wrong.status, wrong.data.error?.field_errors?.[0]?.code, unknown.status, unknown.data.error?.field_errors?.[0]?.code], [403, 'setup_code_not_accepted', 403, 'setup_code_not_accepted']);
  check('the wrong attempt is counted', (await h.operator.query('SELECT failed_attempts FROM vendor.account_setup_codes')).rows[0].failed_attempts, 1);
  const password = `Member-${randomUUID()}`;
  check('the member sets their password with email and code', (await setup('CODED@vendor.example', created.data.setup_code.toLowerCase(), password)).status, 200);
  check('the code works once', (await setup('coded@vendor.example', created.data.setup_code, `Again-${randomUUID()}`)).status, 403);
  check('afterwards (as after reinstalling) the member signs in with email and password only', (await signIn('coded@vendor.example', password)).status, 200);
  const team1 = (await adm.json('/api/v1/vendor/team')).data.members.find((m: { email: string }) => m.email === 'coded@vendor.example');
  check('the team shows the password set and no code outstanding', [team1.password_set, team1.setup_code_expires_at, team1.must_change_password], [true, null, false]);

  // --- administrator sets it ---
  const set = await adm.json('/api/v1/vendor/team', { name: 'Set Reviewer', email: 'set@vendor.example', role: 'AUDIT_REVIEWER', password_mode: 'ADMIN_SET', password: 'Chosen-by-admin-2026' });
  check('an administrator-set password is final: no code, not forced to change', [set.status, set.data.setup_code, set.data.one_time_password, set.data.member.password_set, set.data.member.must_change_password], [201, null, null, true, false]);
  check('that member signs in with it', (await signIn('set@vendor.example', 'Chosen-by-admin-2026')).status, 200);
  check('a password shorter than 12 characters is refused', (await adm.json('/api/v1/vendor/team', { name: 'Short', email: 'short@vendor.example', role: 'AUDITOR', password_mode: 'ADMIN_SET', password: 'short' })).status, 400);
  check('the old behaviour (generated one-time password) still works', (await adm.json('/api/v1/vendor/team', { name: 'Legacy', email: 'legacy@vendor.example', role: 'AUDITOR' })).data.one_time_password?.length >= 24, true);

  // --- forgotten password: reset with a new code ---
  const reset = await adm.json(`/api/v1/vendor/team/${team1.user_id}/setup-code`, { valid_hours: 24 });
  check('an administrator issues a reset code', [reset.status, typeof reset.data.setup_code], [200, 'string']);
  check('the old password keeps working until the code is used', (await signIn('coded@vendor.example', password)).status, 200);
  const newPassword = `Reset-${randomUUID()}`;
  check('the member resets with the code', (await setup('coded@vendor.example', reset.data.setup_code, newPassword)).status, 200);
  check('after the reset only the new password works', [(await signIn('coded@vendor.example', password)).status !== 200, (await signIn('coded@vendor.example', newPassword)).status], [true, 200]);

  // --- limits ---
  const ownerId = (await h.operator.query("SELECT user_id FROM vendor_auth.authority WHERE role='VENDOR_SUPER_ADMIN'")).rows[0].user_id;
  check('an administrator cannot issue a code for the super administrator', (await adm.json(`/api/v1/vendor/team/${ownerId}/setup-code`, {})).status, 409);
  check('an administrator cannot set the super administrator\'s password', (await adm.json(`/api/v1/vendor/team/${ownerId}/password`, { password: 'Taking-over-12345' })).status, 409);
  check('the setup endpoint takes no session credentials', (await adm.json('/api/v1/vendor/account-setup', { email: 'coded@vendor.example', setup_code: 'X'.repeat(20), new_password: 'Whatever-123456' })).status, 400);
  const locked = await adm.json('/api/v1/vendor/team', { name: 'Locked', email: 'locked@vendor.example', role: 'AUDITOR', password_mode: 'SETUP_CODE' });
  for (let i = 0; i < 5; i++) await setup('locked@vendor.example', `WRONG-${i}-WRONG-WRONG`, 'A-good-password-123');
  check('after five wrong codes the right one no longer works', (await setup('locked@vendor.example', locked.data.setup_code, 'A-good-password-123')).status, 403);
} finally {
  await h.close();
  const failures = results.filter(r => r.result === 'FAIL').length;
  console.log(`\nmember-onboarding: ${results.length - failures}/${results.length} passed`);
  if (failures) process.exitCode = 1;
}
