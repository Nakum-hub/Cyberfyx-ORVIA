/**
 * Revision 1.13: the company's own vendor service licence. Kept apart from customer licences: its own key
 * (.local/vendor/signing/service-licence.json, company custody), its own audience (ORVIA_VENDOR_SERVICE).
 *
 *   pnpm run vendor:service-licence keys confirm:local
 *       creates the key pair once (development; production keys belong offline/HSM) and writes ONLY the public key to the
 *       vendor installation's trust/service-licence-public-key.json
 *   pnpm run vendor:service-licence issue confirm:vendor-a00 <member-seats> <days>
 *       signs a licence for the vendor installation and writes it to .local/vendor/issued/; a super administrator imports it
 *       on the Vendor team page. The sequence is minutes since 1970, so a later licence always outranks an earlier one.
 */
import { createPrivateKey, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonicalJson } from '../shared/contracts/src/crypto.ts';
import { SignedVendorServiceLicence, VENDOR_SERVICE_AUDIENCE } from '../shared/contracts/src/vendor-service-licence.ts';
import { profileDirectory, vendorDirectory, vendorKeyPath, vendorSigningKey } from './credentials.ts';
import { privateDirectory, writePrivateJson } from './local-private.ts';

export function ensureServiceLicenceKeys() {
  privateDirectory(vendorDirectory()); privateDirectory(resolve(vendorDirectory(), 'signing'));
  if (!existsSync(vendorKeyPath('service-licence'))) {
    const pair = generateKeyPairSync('ed25519');
    writePrivateJson(vendorKeyPath('service-licence'), { key_id: `orvia-service-licence-dev-${randomUUID().slice(0, 8)}`, note: 'Development key for the vendor service licence. Replace with a company-held key before real use.',
      public: pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'), private: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64') });
  }
  const key = vendorSigningKey('service-licence');
  const trust = resolve(profileDirectory('vendor-a00'), 'trust');
  if (existsSync(profileDirectory('vendor-a00'))) { privateDirectory(trust); writePrivateJson(resolve(trust, 'service-licence-public-key.json'), { key_id: key.key_id, public: key.public }); }
  return key.key_id;
}
export function signServiceLicence(key: { key_id: string; private: string }, installationId: string, memberSeats: number, days: number, now = Date.now(), sequence = Math.floor(now / 60000)) {
  const claims = { licence_id: randomUUID(), audience: VENDOR_SERVICE_AUDIENCE, installation_id: installationId, valid_from: new Date(now - 60000).toISOString(), valid_to: new Date(now + days * 86400000).toISOString(), sequence, member_seats: memberSeats };
  const signature = sign(null, Buffer.from(canonicalJson(claims)), createPrivateKey({ key: Buffer.from(key.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
  return SignedVendorServiceLicence.parse({ algorithm: 'Ed25519', claims, signing_key_id: key.key_id, signature });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] === 'keys') {
    if (process.argv[3] !== 'confirm:local') throw new Error('Run with confirm:local');
    console.log(`Vendor service licence key ready: ${ensureServiceLicenceKeys()} (public key written to the vendor installation's trust directory).`);
  } else if (process.argv[2] === 'issue') {
    if (process.argv[3] !== 'confirm:vendor-a00') throw new Error('Run with confirm:vendor-a00');
    const seats = Number(process.argv[4]); const days = Number(process.argv[5]);
    if (!Number.isInteger(seats) || seats < 0 || !Number.isInteger(days) || days < 1) throw new Error('Usage: issue confirm:vendor-a00 <member-seats> <days>');
    ensureServiceLicenceKeys();
    const installation = (JSON.parse(readFileSync(resolve(profileDirectory('vendor-a00'), 'config.json'), 'utf8')) as { installation_id: string }).installation_id;
    const licence = signServiceLicence(vendorSigningKey('service-licence'), installation, seats, days);
    const out = resolve(vendorDirectory(), 'issued', `service-licence-${licence.claims.licence_id}.json`);
    privateDirectory(resolve(vendorDirectory(), 'issued')); writePrivateJson(out, { licence });
    console.log(`Vendor service licence written to ${out}\nA vendor super administrator imports it on the Vendor team page.`);
  } else throw new Error('Use keys confirm:local, or issue confirm:vendor-a00 <member-seats> <days>');
}
