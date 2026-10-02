import { createPublicKey, randomUUID, verify } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import * as L from '../../../shared/contracts/src/vendor-service-licence.ts';
import { AccessError } from '../../authorization/src/index.ts';
import { audit, guarded, iso, type Ctx } from './service.ts';

/**
 * Revision 1.13: the vendor service's own licence (see shared/contracts/src/vendor-service-licence.ts). The trusted public
 * key comes from ORVIA_SERVICE_LICENCE_KEY_ID / ORVIA_SERVICE_LICENCE_PUBLIC_KEY, or from the vendor profile's
 * trust/service-licence-public-key.json. It is never the customer licence key, and a customer licence (audience
 * ORVIA_CUSTOMER_INSTALLATION) cannot even be parsed here.
 */
export function serviceLicenceTrust(profileDirectory: string): { key_id: string; public: string } | null {
  if (process.env.ORVIA_SERVICE_LICENCE_KEY_ID && process.env.ORVIA_SERVICE_LICENCE_PUBLIC_KEY) return { key_id: process.env.ORVIA_SERVICE_LICENCE_KEY_ID, public: process.env.ORVIA_SERVICE_LICENCE_PUBLIC_KEY };
  const file = resolve(profileDirectory, 'trust', 'service-licence-public-key.json');
  if (!existsSync(file)) return null;
  const v = JSON.parse(readFileSync(file, 'utf8')) as { key_id?: string; public?: string };
  return v.key_id && v.public ? { key_id: v.key_id, public: v.public } : null;
}
const refuse = (code: string): never => { throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'licence', code }]); };

export async function importServiceLicence(c: Ctx, input: unknown, trust: { key_id: string; public: string } | null, installationId: string) {
  const parsed = L.VendorServiceLicenceImport.safeParse(input);
  if (!parsed.success) refuse(parsed.error.issues.some(i => i.path.includes('audience')) ? 'wrong_audience' : 'malformed');
  const licence = parsed.data!.licence;
  if (!trust) refuse('no_trusted_key');
  if (licence.signing_key_id !== trust!.key_id) refuse('untrusted_signer');
  const key = createPublicKey({ key: Buffer.from(trust!.public, 'base64'), format: 'der', type: 'spki' });
  if (!verify(null, Buffer.from(canonicalJson(licence.claims)), key, Buffer.from(licence.signature, 'base64url'))) refuse('invalid_signature');
  return guarded(async () => {
    await c.tx.query('SELECT vendor.import_service_licence($1,$2,$3,$4,$5,$6)', [c.actor.actor_id, randomUUID(), installationId, licence.claims, licence.signing_key_id, licence.signature]);
    await audit(c, 'vendor.service-licence.imported', licence.claims.licence_id);
    return serviceLicenceState(c);
  });
}
export async function serviceLicenceState(c: Ctx) {
  return guarded(async () => {
    const r = (await c.tx.query('SELECT * FROM vendor.service_licence_state()')).rows[0]!;
    const state = r.licence_id === null ? 'NONE' : r.expired ? 'EXPIRED' : 'ACTIVE';
    return L.VendorServiceLicenceState.parse({ state, licence_id: r.licence_id, sequence: r.sequence, valid_to: iso(r.valid_to), member_seats: r.member_seats, members_active: r.members_active,
      note: state === 'NONE' ? 'No vendor service licence imported: member logins are not limited. Import the licence the company issued for this installation.'
        : state === 'EXPIRED' ? 'The vendor service licence has expired: existing logins keep working; no member can be added or reactivated until a renewed licence is imported.'
        : 'Member logins (lead auditors, auditors, reviewers) are limited by this licence; the super administrator and administrators are not counted.' });
  });
}
