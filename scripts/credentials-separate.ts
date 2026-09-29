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
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { privateDirectory, writePrivateJson } from './local-private.ts';
import { profileDirectory, trustPath, vendorDirectory, vendorKeyPath, vendorSigningKey, type SigningKind } from './credentials.ts';

const legacy = (kind: SigningKind) => resolve(process.env.ORVIA_WORKSPACE_ROOT ?? process.cwd(), '.local', `${kind}-fixture.json`);
const PRIVATE_MARKERS = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /"private"\s*:/];

/**
 * Private keys a customer installation legitimately owns, as profile-relative
 * path segments (compared segment by segment, so Windows and POSIX separators
 * behave the same): its worker signing key, its own TLS server key and local
 * backups. Any other private key under a profile is a misplaced vendor key.
 */
const CUSTOMER_OWNED = [['worker', 'signing-key.pem'], ['tls', 'server-key.pem']];
export function customerOwnedKey(profilesRoot: string, file: string) {
  const parts = relative(profilesRoot, file).split(sep).filter(Boolean);
  if (parts.length < 2 || parts.includes('..')) return false;
  const inProfile = parts.slice(1);
  return inProfile[0] === 'backups' || CUSTOMER_OWNED.some(owned => owned.length === inProfile.length && owned.every((segment, i) => segment === inProfile[i]));
}
function files(directory: string): string[] {
  return readdirSync(directory).flatMap(name => { const path = resolve(directory, name); return statSync(path).isDirectory() ? files(path) : [path]; });
}

export function separate() {
  const moved: string[] = []; const trusted: string[] = []; const created: string[] = [];
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
  // The DPDPA audit key (revision 1.5 addendum) is created here once, in the vendor directory only. Development fixture; replace before real use.
  if (!existsSync(vendorKeyPath('audit'))) {
    const pair = generateKeyPairSync('ed25519');
    writePrivateJson(vendorKeyPath('audit'), { key_id: `orvia-audit-dev-${randomUUID().slice(0, 8)}`, public: pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'), private: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64') });
    created.push('audit');
  }
  const pub = (kind: SigningKind) => ({ key_id: vendorSigningKey(kind).key_id, public: vendorSigningKey(kind).public });
  const trust = { release: pub('release'), licence: pub('licence'), audit: pub('audit') };
  const profiles = resolve(profileDirectory('x'), '..');
  for (const profile of existsSync(profiles) ? readdirSync(profiles).filter(p => statSync(resolve(profiles, p)).isDirectory()) : []) {
    privateDirectory(resolve(profileDirectory(profile), 'trust'));
    // Keep an audit service address the vendor supplied (revision 1.6); only the keys are refreshed here.
    const existing = existsSync(trustPath(profile)) ? JSON.parse(readFileSync(trustPath(profile), 'utf8')) as { audit_service?: unknown } : {};
    writePrivateJson(trustPath(profile), existing.audit_service === undefined ? trust : { ...trust, audit_service: existing.audit_service }); trusted.push(profile);
  }
  const leaks = existsSync(profiles) ? files(profiles).filter(f => !customerOwnedKey(profiles, f) && PRIVATE_MARKERS.some(m => m.test(readFileSync(f, 'utf8')))) : [];
  if (leaks.length) throw new Error(`Private key material found under customer profiles: ${leaks.map(f => f.slice(f.indexOf('.local'))).join(', ')}`);
  return { moved, trusted, created };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] !== 'confirm:local') throw new Error('Run with confirm:local');
  const result = separate();
  console.log(`Vendor signing keys in .local/vendor/signing/ (moved now: ${result.moved.join(', ') || 'none, already separated'}; created now: ${result.created.join(', ') || 'none'}). Public trust written for installation profiles: ${result.trusted.join(', ') || 'none'}.`);
}
