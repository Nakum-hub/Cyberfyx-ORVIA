/**
 * Protected command on the vendor server (revision 1.13): create or revoke a provisioning client, the credential the
 * company website uses to manage vendor accounts through the central vendor service. The secret is printed once and kept
 * only sealed under this installation's vault key. A client is bound to the product ORVIA; a future product gets its own
 * service and keys, never one of these.
 *
 * Usage:
 *   pnpm run vendor:provisioning-client confirm:vendor-a00 create <name> <scope,scope,...>
 *   pnpm run vendor:provisioning-client confirm:vendor-a00 revoke <client-id>
 * Scopes: accounts.read, accounts.create.member, accounts.create.admin, accounts.create.super_admin, accounts.setup_code,
 * accounts.deactivate. Grant the fewest the website needs.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connectDatabase } from '../database/customer/src/index.ts';
import { PROFILES } from '../shared/contracts/src/index.ts';
import { PROVISIONING_SCOPES } from '../shared/contracts/src/vendor-provisioning.ts';
import { seal, vaultKeyFrom } from '../backend/vendor/audit/vault.ts';

export async function createProvisioningClient(name: string, scopes: string[], database: string = PROFILES['vendor-a00'].database, root = process.cwd()) {
  if (!/^[A-Za-z0-9 ._-]{2,60}$/.test(name)) throw new Error('Name: 2-60 letters, digits, space, dot, underscore or hyphen');
  if (!scopes.length || scopes.some(s => !(PROVISIONING_SCOPES as readonly string[]).includes(s))) throw new Error(`Scopes must be some of: ${PROVISIONING_SCOPES.join(', ')}`);
  const directory = resolve(root, '.local/profiles/vendor-a00');
  const vault = vaultKeyFrom(readFileSync(resolve(directory, 'auth', 'vault-key'), 'utf8').trim());
  const pool = connectDatabase({ postgres_port: PROFILES['vendor-a00'].postgres_port, database, password: readFileSync(resolve(directory, 'postgres-password'), 'utf8').trim() }).pool;
  try {
    if ((await pool.query('SELECT kind FROM vendor.installation_identity')).rows[0]?.kind !== 'VENDOR_SERVICE') throw new Error('Not a vendor installation database');
    const id = randomUUID(); const secret = randomBytes(32).toString('base64url');
    const sealed = seal(vault, Buffer.from(secret, 'utf8'), `provisioning:${id}`);
    await pool.query(`INSERT INTO vendor.provisioning_clients(id, product, name, scopes, secret_ciphertext, secret_nonce, secret_tag) VALUES ($1,'ORVIA',$2,$3,$4,$5,$6)`,
      [id, name, [...new Set(scopes)], sealed.ciphertext, sealed.nonce, sealed.tag]);
    return { id, secret };
  } finally { await pool.end(); }
}
export async function revokeProvisioningClient(id: string, database: string = PROFILES['vendor-a00'].database, root = process.cwd()) {
  const directory = resolve(root, '.local/profiles/vendor-a00');
  const pool = connectDatabase({ postgres_port: PROFILES['vendor-a00'].postgres_port, database, password: readFileSync(resolve(directory, 'postgres-password'), 'utf8').trim() }).pool;
  try { return (await pool.query('UPDATE vendor.provisioning_clients SET revoked_at = clock_timestamp() WHERE id = $1 AND revoked_at IS NULL', [id])).rowCount === 1; }
  finally { await pool.end(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] !== 'confirm:vendor-a00') throw new Error('Run with confirm:vendor-a00');
  if (process.argv[3] === 'create') {
    const client = await createProvisioningClient(process.argv[4] ?? '', (process.argv[5] ?? '').split(',').filter(Boolean));
    console.log(`\n  Provisioning client created (shown once; store the secret in the website's server-side secret settings, never in its code):\n\n      client id: ${client.id}\n      secret:    ${client.secret}\n`);
  } else if (process.argv[3] === 'revoke') {
    console.log(await revokeProvisioningClient(process.argv[4] ?? '') ? 'Revoked.' : 'No active client with that id.');
  } else throw new Error('Use create <name> <scopes> or revoke <client-id>');
}
