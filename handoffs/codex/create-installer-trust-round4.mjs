// Synthetic public trust only. No signing private key is written or printed.
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
const trust = {};
for (const kind of ['release', 'licence', 'audit']) {
  const { publicKey } = generateKeyPairSync('ed25519');
  trust[kind] = { key_id: kind === 'audit' ? `orvia-audit-dev-${randomUUID().slice(0, 8)}` : randomUUID(), public: publicKey.export({ format: 'der', type: 'spki' }).toString('base64') };
}
mkdirSync('.local/qualification', { recursive: true, mode: 0o700 });
writeFileSync('.local/qualification/vendor-public-keys.json', JSON.stringify(trust), { flag: 'wx', mode: 0o600 });
console.log('Synthetic public trust generated for the isolated installer; no private signing key retained.');
