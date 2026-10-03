/**
 * VENDOR SIDE. Issues a signed licence for one customer installation from a
 * catalogue plan option. The member seats come from the option; the licence is
 * signed with the vendor licence key, which exists only on the vendor side
 * (.local/vendor/signing/licence.json in development). The customer imports the
 * resulting file; its installation verifies it with the vendor public key and
 * enforces the seats.
 */
import { createPrivateKey, randomUUID, sign } from 'node:crypto';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import { LicenceClaims, SignedLicence, EntitlementCode, editionCeiling } from '../../../shared/contracts/src/index.ts';
import { INCLUDED_LOGINS, findOption } from '../plans/catalogue.ts';

/** sequence: the next number for this installation (the caller reads it from issued licences); term: the commercial term. */
export type IssueRequest = { installation_id: string; option: string; entitlements: string[]; environments: number; valid_from: string; valid_to: string;
  sequence?: number; term?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'TRIAL' | 'CONTRACT' };
export type VendorKey = { key_id: string; private: string };

export function issueLicence(request: IssueRequest, key: VendorKey) {
  const { tier, option } = findOption(request.option);
  const entitlements = request.entitlements.map(e => EntitlementCode.parse(e));
  // The customer installation would refuse it (ENTITLEMENT_EXCEEDS_EDITION); refuse here so the mistake never leaves the vendor.
  const ceiling = editionCeiling(tier.edition);
  if (entitlements.some(e => !ceiling.has(e))) throw new Error('entitlement exceeds edition');
  const included = INCLUDED_LOGINS.ORG_SUPER_ADMIN + INCLUDED_LOGINS.ORG_ADMIN;
  const claims = LicenceClaims.parse({
    licence_id: randomUUID(), edition: tier.edition, entitlements, installation_id: request.installation_id, audience: 'ORVIA_CUSTOMER_INSTALLATION',
    valid_from: request.valid_from, valid_to: request.valid_to,
    ...(request.term ? { term: request.term, trial: request.term === 'TRIAL' } : {}), ...(request.sequence ? { sequence: request.sequence } : {}),
    // staff_members is the reported total (members plus the included owner and administrator); member_seats is what is enforced.
    licensed_limits: { environments: request.environments, staff_members: option.member_seats + included, member_seats: option.member_seats },
  });
  const signature = sign(null, Buffer.from(canonicalJson(claims)), createPrivateKey({ key: Buffer.from(key.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
  return { licence: SignedLicence.parse({ algorithm: 'Ed25519', claims, signing_key_id: key.key_id, signature }), plan: { tier: tier.code, option: option.code, member_seats: option.member_seats } };
}
