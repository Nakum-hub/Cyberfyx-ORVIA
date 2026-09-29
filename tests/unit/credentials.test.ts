import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { customerEnvironment, installationTrust, vendorSigningEnvironment } from '../../scripts/credentials.ts';
import { separate } from '../../scripts/credentials-separate.ts';

// Vendor signing keys and customer installation credentials are kept apart:
// the vendor pair lives only under .local/vendor, an installation holds only the
// vendor's public keys, and the customer application never receives a private key.
function workspace() {
  const root = mkdtempSync(join(tmpdir(), 'orvia-credentials-'));
  mkdirSync(join(root, '.local/profiles/acme/auth'), { recursive: true });
  writeFileSync(join(root, '.local/profiles/acme/auth/principal-secret'), 'a'.repeat(64));
  for (const kind of ['release', 'licence']) writeFileSync(join(root, `.local/${kind}-fixture.json`), JSON.stringify({ key_id: `${kind}-k1`, public: `PUBLIC-${kind}`, private: `-----BEGIN PRIVATE KEY-----${kind}`, note: 'synthetic' }));
  process.env.ORVIA_WORKSPACE_ROOT = root;
  return root;
}
test('separation moves the vendor pairs out and gives installations public keys only', () => {
  const root = workspace();
  // The DPDPA audit key (revision 1.5 addendum) is created once, in the vendor directory only.
  assert.deepEqual(separate(), { moved: ['release', 'licence'], trusted: ['acme'], created: ['audit'] });
  assert.equal(existsSync(join(root, '.local/release-fixture.json')), false);
  assert.equal(vendorSigningEnvironment('release').ORVIA_RELEASE_PRIVATE_KEY, '-----BEGIN PRIVATE KEY-----release');
  const trust = readFileSync(join(root, '.local/profiles/acme/trust/vendor-public-keys.json'), 'utf8');
  assert.equal(trust.includes('PRIVATE'), false);
  const trusted = installationTrust('acme')!;
  assert.deepEqual({ release: trusted.release, licence: trusted.licence }, { release: { key_id: 'release-k1', public: 'PUBLIC-release' }, licence: { key_id: 'licence-k1', public: 'PUBLIC-licence' } });
  assert.equal(trusted.audit?.key_id, vendorSigningEnvironment('audit').ORVIA_AUDIT_KEY_ID, 'installations trust the audit public key');
  assert.equal(readFileSync(join(root, '.local/vendor/signing/audit.json'), 'utf8').includes('"private"'), true);
  assert.deepEqual(separate(), { moved: [], trusted: ['acme'], created: [] }, 'running again changes nothing');
});
test('separation refuses to overwrite a different vendor key', () => {
  const root = workspace(); separate();
  writeFileSync(join(root, '.local/release-fixture.json'), JSON.stringify({ key_id: 'other', public: 'P2', private: 'S2' }));
  assert.throws(() => separate(), /different release key already exists/);
});
test('separation refuses when private key material sits under a customer profile', () => {
  const root = workspace();
  writeFileSync(join(root, '.local/profiles/acme/auth/leaked.json'), JSON.stringify({ private: 'x' }));
  assert.throws(() => separate(), /Private key material found under customer profiles/);
});
test('the customer application environment carries no private key and trusts the installation keys', () => {
  workspace(); separate();
  const env = customerEnvironment({ PATH: '/bin', ORVIA_RELEASE_PRIVATE_KEY: 'secret', ORVIA_LICENCE_PRIVATE_KEY: 'secret', SOME_PRIVATE_KEY_FILE: 'x' } as unknown as NodeJS.ProcessEnv, 'acme');
  assert.equal(Object.keys(env).some(k => /PRIVATE_KEY/.test(k)), false);
  assert.deepEqual([env.PATH, env.ORVIA_RELEASE_KEY_ID, env.ORVIA_RELEASE_PUBLIC_KEY, env.ORVIA_LICENCE_PUBLIC_KEY], ['/bin', 'release-k1', 'PUBLIC-release', 'PUBLIC-licence']);
});
test('a public key that differs from the installation trust file is refused', () => {
  workspace(); separate();
  assert.throws(() => customerEnvironment({ ORVIA_RELEASE_PUBLIC_KEY: 'SOMETHING-ELSE' } as unknown as NodeJS.ProcessEnv, 'acme'), /differs from the installation trust file/);
});
test('a trust file that carries a private key is refused', () => {
  const root = workspace(); separate();
  writeFileSync(join(root, '.local/profiles/acme/trust/vendor-public-keys.json'), JSON.stringify({ release: { key_id: 'r', public: 'p', private: 's' }, licence: { key_id: 'l', public: 'p' } }));
  assert.throws(() => installationTrust('acme'), /public keys only/);
});
test('the audit service address (revision 1.6) comes only from the trust file, and only as HTTPS or loopback', () => {
  const root = workspace(); separate();
  const path = join(root, '.local/profiles/acme/trust/vendor-public-keys.json'); const base = JSON.parse(readFileSync(path, 'utf8'));
  const write = (audit_service: unknown) => writeFileSync(path, JSON.stringify({ ...base, audit_service }));
  assert.equal(customerEnvironment({ ORVIA_AUDIT_SERVICE_URL: 'https://someone-else.example' } as unknown as NodeJS.ProcessEnv, 'acme').ORVIA_AUDIT_SERVICE_URL, undefined, 'without one in the trust file, none is passed on');
  write({ url: 'https://audit.vendor.example.in' });
  assert.equal(installationTrust('acme')!.audit_service?.url, 'https://audit.vendor.example.in');
  assert.equal(customerEnvironment({} as NodeJS.ProcessEnv, 'acme').ORVIA_AUDIT_SERVICE_URL, 'https://audit.vendor.example.in');
  assert.throws(() => customerEnvironment({ ORVIA_AUDIT_SERVICE_URL: 'https://someone-else.example' } as unknown as NodeJS.ProcessEnv, 'acme'), /differs from the installation trust file/);
  write({ url: 'http://127.0.0.1:4340' }); assert.equal(installationTrust('acme')!.audit_service?.url, 'http://127.0.0.1:4340');
  for (const bad of ['http://audit.vendor.example.in', 'https://u:p@audit.vendor.example.in', 'https://audit.vendor.example.in/?next=x', 'ftp://audit.vendor.example.in']) { write({ url: bad }); assert.throws(() => installationTrust('acme'), /audit_service url must be HTTPS/, bad); }
  write({ url: 'https://audit.vendor.example.in', token: 'x' }); assert.throws(() => installationTrust('acme'), /holds only its url/);
});
