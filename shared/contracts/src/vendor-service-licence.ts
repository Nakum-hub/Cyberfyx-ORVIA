import { z } from 'zod';

/**
 * Revision 1.13: the licence of the company's own central vendor service, deliberately separate from customer licences so
 * the two can never collide. Different audience (ORVIA_VENDOR_SERVICE, never ORVIA_CUSTOMER_INSTALLATION), different
 * signing key (`.local/vendor/signing/service-licence.json`, never the customer licence key), different store
 * (vendor.service_licences). It carries no plan, tier or entitlement: the vendor service is not sold to anyone. It states
 * how many vendor member logins (lead auditors, auditors, reviewers) may be active and for how long, with an increasing
 * sequence so an older licence cannot be re-imported.
 */
const Id = z.uuid();
const Time = z.iso.datetime();
export const VENDOR_SERVICE_AUDIENCE = 'ORVIA_VENDOR_SERVICE' as const;
export const VendorServiceLicenceClaims = z.strictObject({
  licence_id: Id, audience: z.literal(VENDOR_SERVICE_AUDIENCE), installation_id: Id,
  valid_from: Time, valid_to: Time, sequence: z.number().int().min(1),
  member_seats: z.number().int().min(0).max(10000).describe('Active vendor member logins (lead auditor, auditor, audit reviewer). The super administrator and administrators are not counted.'),
}).refine(c => Date.parse(c.valid_to) > Date.parse(c.valid_from), { message: 'valid_to must be after valid_from' });
export const SignedVendorServiceLicence = z.strictObject({ algorithm: z.literal('Ed25519'), claims: VendorServiceLicenceClaims, signing_key_id: z.string().min(1).max(100), signature: z.string().min(16).max(200) });
export const VendorServiceLicenceImport = z.strictObject({ licence: SignedVendorServiceLicence });
export const VendorServiceLicenceState = z.strictObject({
  state: z.enum(['NONE', 'ACTIVE', 'EXPIRED']), licence_id: Id.nullable(), sequence: z.number().int().nullable(), valid_to: Time.nullable(),
  member_seats: z.number().int().nullable(), members_active: z.number().int(),
  note: z.string(),
});
