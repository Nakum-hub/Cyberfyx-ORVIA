// Production DPDPA audit signing key for the vendor (Cyberfyx) service: the "production audit signing key" activation gate.
//
//   pnpm exec tsx scripts/vendor-audit-key.ts generate confirm:production-audit-key   run by the named key custodian, on the vendor host
//   pnpm exec tsx scripts/vendor-audit-key.ts public                                  prints the public key for client trust files
//
// The vendor service signs auditor request lists, findings and reports with the key in .local/vendor/signing/audit.json
// (scripts/credentials.ts). Local setup creates a development key there (key id orvia-audit-dev-...), and the audit
// practice refuses to record the PRODUCTION_AUDIT_KEY gate while that key is in use. This tool replaces it with a production
// key pair generated on this host:
//   - a production key is never overwritten; rotating one is a separate, deliberate procedure;
//   - the development key it replaces is kept beside it (audit.dev-retired-<time>.json) so earlier synthetic documents can still be checked;
//   - only the key id, the public key and its SHA-256 fingerprint are printed. The private key goes to the file only, mode 0600.
// Never paste the file, the private key or its location details into chat, tickets or the repository.
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { vendorDirectory, vendorKeyPath } from './credentials.ts';
import { writePrivateJson } from './local-private.ts';

export const PRODUCTION_PREFIX = 'orvia-audit-';
export const DEVELOPMENT_PREFIX = 'orvia-audit-dev-';
type KeyFile = { key_id: string; public: string; private?: string };

export const fingerprint = (publicDerBase64: string) => createHash('sha256').update(Buffer.from(publicDerBase64, 'base64')).digest('hex');
export const isProductionKeyId = (keyId: string) => keyId.startsWith(PRODUCTION_PREFIX) && !keyId.startsWith(DEVELOPMENT_PREFIX);

/** Generates the production key pair at `path`; refuses to replace a production key. Returns the public part only. */
export function generateProductionKey(path = vendorKeyPath('audit'), now = new Date()) {
  if (existsSync(path)) {
    const current = JSON.parse(readFileSync(path, 'utf8')) as KeyFile;
    if (isProductionKeyId(current.key_id)) throw new Error(`A production audit key (${current.key_id}) is already in place. It is never overwritten here; rotation is a separate procedure.`);
    renameSync(path, resolve(path, '..', `audit.dev-retired-${now.toISOString().replace(/[:.]/g, '-')}.json`));
  }
  const pair = generateKeyPairSync('ed25519');
  const keyId = `${PRODUCTION_PREFIX}${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex')}`;
  const pub = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  writePrivateJson(path, { key_id: keyId, public: pub, private: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64') });
  return { key_id: keyId, public: pub, sha256: fingerprint(pub) };
}

export function publicPart(path = vendorKeyPath('audit')) {
  if (!existsSync(path)) throw new Error('No audit key on this host.');
  const k = JSON.parse(readFileSync(path, 'utf8')) as KeyFile;
  return { key_id: k.key_id, public: k.public, sha256: fingerprint(k.public), production: isProductionKeyId(k.key_id) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [command, confirm] = process.argv.slice(2);
  try {
    if (command === 'generate') {
      if (confirm !== 'confirm:production-audit-key') throw new Error('Refusing: pass confirm:production-audit-key. Run only as the named key custodian, on the vendor host.');
      if (!existsSync(vendorDirectory())) throw new Error('No .local/vendor directory on this host; this is not a vendor host.');
      const out = generateProductionKey();
      console.log(JSON.stringify({ created: out.key_id, public_key: out.public, public_key_sha256: out.sha256,
        next: ['Record the fingerprint in the key custody register.', 'Give client installations the public key in their trust file (audit entry).',
          'In the vendor area, Audit practice: record the gate "production audit signing key".'] }, null, 2));
    } else if (command === 'public') console.log(JSON.stringify(publicPart(), null, 2));
    else throw new Error('Usage: vendor-audit-key.ts generate confirm:production-audit-key | public');
  } catch (error) { console.error(error instanceof Error ? error.message : 'Failed.'); process.exitCode = 1; }
}
