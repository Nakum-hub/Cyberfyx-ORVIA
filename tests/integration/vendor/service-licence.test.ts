// Revision 1.13: the vendor service's own licence, on a fresh throwaway vendor database.
// Under test: it is verified against its own key and audience, so a customer licence or a licence signed with the customer
// licence key is refused; only the super administrator imports it; an older sequence or another installation's licence is
// refused; member seats are enforced on every path (team screen, website provisioning, reactivation) while administrators
// are not counted; without a licence the state says so.
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign, createPrivateKey } from 'node:crypto';
import { vendorHarness } from './harness.ts';
import { signServiceLicence } from '../../../scripts/vendor-service-licence.ts';
import { vendorSigningKey } from '../../../scripts/credentials.ts';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import { LicenceClaims } from '../../../shared/contracts/src/index.ts';
import { createProvisioningClient } from '../../../scripts/vendor-provisioning-client.ts';
import { signProvisioningRequest } from '../../../shared/contracts/src/vendor-provisioning.ts';

process.env.ORVIA_PROFILE = 'vendor-a00';
const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { results.push({ name, result: 'FAIL', detail: `${JSON.stringify(actual)?.slice(0, 300)} != ${JSON.stringify(expected)?.slice(0, 300)}` }); console.log(`FAIL ${name}: ${JSON.stringify(actual)?.slice(0, 300)}`); }
}
// The test plays the company: a throwaway service-licence key pair, trusted through the environment.
const pair = generateKeyPairSync('ed25519');
const serviceKey = { key_id: `test-service-licence-${randomUUID().slice(0, 8)}`, private: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64') };
process.env.ORVIA_SERVICE_LICENCE_KEY_ID = serviceKey.key_id;
process.env.ORVIA_SERVICE_LICENCE_PUBLIC_KEY = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

const h = await vendorHarness();
try {
  const anon = h.session();
  const code = await h.issueSetupCode();
  const owner = { email: 'owner@vendor.example', password: `Owner-${randomUUID()}`, domain: 'vendor' as const } as { email: string; password: string; totp?: string; domain: 'vendor' };
  const admin = { email: 'admin@vendor.example', password: `Admin-${randomUUID()}`, domain: 'vendor' as const } as typeof owner;
  await anon.json('/api/v1/vendor/setup', { setup_code: code, owner: { name: 'Vendor Owner', email: owner.email, password: owner.password }, admin: { name: 'Vendor Admin', email: admin.email, password: admin.password } });
  const own = await h.login(owner); const adm = await h.login(admin);
  const installation = h.config.installation_id as string;
  const importIt = (s: typeof own, licence: unknown) => s.json('/api/v1/vendor/service-licence', { licence });
  const codeOf = (r: { data: { error?: { field_errors?: { code: string }[] } } }) => r.data.error?.field_errors?.[0]?.code;
  const member = (s: typeof own, n: string) => s.json('/api/v1/vendor/team', { name: n, email: `${n.toLowerCase()}@vendor.example`, role: 'AUDITOR', password_mode: 'SETUP_CODE' });

  check('with no licence the state says so and members are not limited', [(await own.json('/api/v1/vendor/service-licence')).data.state, (await member(adm, 'Before')).status], ['NONE', 201]);
  const first = signServiceLicence(serviceKey, installation, 2, 30, Date.now(), 100);
  check('only the super administrator imports the vendor licence', (await importIt(adm, first)).status, 403);
  const imported = await importIt(own, first);
  check('the super administrator imports it', [imported.status, imported.data.state, imported.data.member_seats, imported.data.members_active], [200, 'ACTIVE', 2, 1]);
  check('a second member fits', (await member(adm, 'Second')).status, 201);
  check('a third member is refused at the seat limit', codeOf(await member(adm, 'Third')), 'vendor_seat_limit_reached');
  check('an administrator is not counted', (await own.json('/api/v1/vendor/team', { name: 'Extra Admin', email: 'extra-admin@vendor.example', role: 'VENDOR_ADMIN', password_mode: 'SETUP_CODE' })).status, 201);
  const website = await createProvisioningClient('website', ['accounts.create.member'], h.database);
  const path = '/api/v1/vendor/provisioning/accounts'; const body = JSON.stringify({ name: 'Via Website', email: 'via-website@vendor.example', role: 'AUDITOR' });
  const viaWebsite = await h.handler(new Request(h.config.origin + path, { method: 'POST', headers: { 'content-type': 'application/json', ...signProvisioningRequest(website, 'POST', path, body) }, body }));
  check('the limit applies to accounts the website creates too', [viaWebsite.status, ((await viaWebsite.json()) as { error?: { field_errors?: { code: string }[] } }).error?.field_errors?.[0]?.code], [409, 'vendor_seat_limit_reached']);
  const team = (await adm.json('/api/v1/vendor/team')).data.members as { user_id: string; email: string }[];
  const second = team.find(m => m.email === 'second@vendor.example')!;
  check('deactivating a member frees a seat', [(await adm.json(`/api/v1/vendor/team/${second.user_id}/deactivate`, {})).status, (await member(adm, 'Replacement')).status], [200, 201]);
  check('reactivating beyond the limit is refused', codeOf(await adm.json(`/api/v1/vendor/team/${second.user_id}/reactivate`, {})), 'vendor_seat_limit_reached');

  // --- what is refused ---
  check('an older sequence is refused', codeOf(await importIt(own, signServiceLicence(serviceKey, installation, 50, 30, Date.now(), 99))), 'stale_sequence');
  check('another installation\'s licence is refused', codeOf(await importIt(own, signServiceLicence(serviceKey, randomUUID(), 50, 30, Date.now(), 200))), 'wrong_installation');
  const tampered = signServiceLicence(serviceKey, installation, 3, 30, Date.now(), 300); (tampered.claims as { member_seats: number }).member_seats = 500;
  check('a licence changed after signing is refused', codeOf(await importIt(own, tampered)), 'invalid_signature');
  const customerKey = vendorSigningKey('licence');
  check('a licence signed with the customer licence key is refused', codeOf(await importIt(own, signServiceLicence(customerKey, installation, 50, 30, Date.now(), 400))), 'untrusted_signer');
  const customerClaims = { licence_id: randomUUID(), edition: 'ENTERPRISE', entitlements: ['PRIVACY_GRAPH'], installation_id: installation, audience: 'ORVIA_CUSTOMER_INSTALLATION', valid_from: new Date(Date.now() - 60000).toISOString(), valid_to: new Date(Date.now() + 86400000).toISOString(), licensed_limits: { environments: 1, staff_members: 5 } };
  const customerLicence = { algorithm: 'Ed25519', claims: customerClaims, signing_key_id: serviceKey.key_id, signature: sign(null, Buffer.from(canonicalJson(customerClaims)), createPrivateKey({ key: Buffer.from(serviceKey.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url') };
  check('a customer licence cannot be imported as the vendor licence, whoever signed it', codeOf(await importIt(own, customerLicence)), 'wrong_audience');
  check('and a vendor licence can never pass as a customer licence', LicenceClaims.safeParse(first.claims).success, false);
  const renewed = await importIt(own, signServiceLicence(serviceKey, installation, 5, 365, Date.now(), 500));
  check('a renewal with a higher sequence takes over', [renewed.status, renewed.data.member_seats, renewed.data.sequence], [200, 5, 500]);
  check('imported licences are never edited', await h.operator.query('UPDATE vendor.service_licences SET member_seats=999').then(() => 'EDITED', () => 'REFUSED'), 'REFUSED');
} finally {
  await h.close();
  const failures = results.filter(r => r.result === 'FAIL').length;
  console.log(`\nservice-licence: ${results.length - failures}/${results.length} passed`);
  if (failures) process.exitCode = 1;
}
