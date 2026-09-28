/**
 * Separates the prototype's credentials into vendor and customer sides.
 *
 * The prototype kept the vendor's release and licence signing key pairs at
 * `.local/release-fixture.json` and `.local/licence-fixture.json`, beside the
 * customer installation profiles. This moves each pair to
 * `.local/vendor/signing/{release,licence}.json` and writes each installation
 * profile a `trust/vendor-public-keys.json` holding only the public keys. It is
 * idempotent, refuses to overwrite a different key, and finally checks that no
 * private key material is left anywhere under `.local/profiles/`.
 *
 * Usage: pnpm run credentials:separate confirm:local
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { privateDirectory, writePrivateJson } from './local-private.ts';
import { profileDirectory, trustPath, vendorDirectory, vendorKeyPath, vendorSigningKey, type SigningKind } from './credentials.ts';

const legacy = (kind: SigningKind) => resolve(process.env.ORVIA_WORKSPACE_ROOT ?? process.cwd(), '.local', `${kind}-fixture.json`);
const PRIVATE_MARKERS = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /"private"\s*:/];

function files(directory: string): string[] {
  return readdirSync(directory).flatMap(name => { const path = resolve(directory, name); return statSync(path).isDirectory() ? files(path) : [path]; });
}

export function separate() {
  const moved: string[] = []; const trusted: string[] = [];
  privateDirectory(vendorDirectory()); privateDirectory(resolve(vendorDirectory(), 'signing'));
  for (const kind of ['release', 'licence'] as const) {
    const from = legacy(kind); const to = vendorKeyPath(kind);
    if (existsSync(from)) {
      const value = JSON.parse(readFileSync(from, 'utf8'));
      if (existsSync(to) && JSON.stringify(JSON.parse(readFileSync(to, 'utf8'))) !== JSON.stringify(value)) throw new Error(`A different ${kind} key already exists in the vendor directory; resolve by hand, nothing was changed.`);
      if (!existsSync(to)) writePrivateJson(to, value);
      rmSync(from); moved.push(kind);
    }
    vendorSigningKey(kind);
  }
  const trust = { release: { key_id: vendorSigningKey('release').key_id, public: vendorSigningKey('release').public }, licence: { key_id: vendorSigningKey('licence').key_id, public: vendorSigningKey('licence').public } };
  const profiles = resolve(profileDirectory('x'), '..');
  for (const profile of existsSync(profiles) ? readdirSync(profiles).filter(p => statSync(resolve(profiles, p)).isDirectory()) : []) {
    privateDirectory(resolve(profileDirectory(profile), 'trust'));
    writePrivateJson(trustPath(profile), trust); trusted.push(profile);
  }
  const leaks = existsSync(profiles) ? files(profiles).filter(f => !f.includes('/backups/') && PRIVATE_MARKERS.some(m => m.test(readFileSync(f, 'utf8'))) && !f.endsWith('worker/signing-key.pem')) : [];
  if (leaks.length) throw new Error(`Private key material found under customer profiles: ${leaks.map(f => f.slice(f.indexOf('.local'))).join(', ')}`);
  return { moved, trusted };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] !== 'confirm:local') throw new Error('Run with confirm:local');
  const result = separate();
  console.log(`Vendor signing keys in .local/vendor/signing/ (moved now: ${result.moved.join(', ') || 'none, already separated'}). Public trust written for installation profiles: ${result.trusted.join(', ') || 'none'}.`);
}
