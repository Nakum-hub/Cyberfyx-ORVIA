import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';

/**
 * Revision 1.13: how the company website calls the central vendor service to manage vendor accounts. One signed request
 * format, used by the vendor service to verify and by the website (or any provisioning client) to sign. The product name is
 * part of what is signed, so a key the company issues for a different product can never act on ORVIA.
 *
 *   X-Orvia-Client     the provisioning client id
 *   X-Orvia-Timestamp  Unix seconds; accepted within 300 seconds of the server clock
 *   X-Orvia-Nonce      16-64 characters [A-Za-z0-9_-], used once
 *   X-Orvia-Signature  hex HMAC-SHA256(secret, "ORVIA\n" + METHOD + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + sha256hex(body))
 */
export const PROVISIONING_PRODUCT = 'ORVIA' as const;
export const PROVISIONING_WINDOW_SECONDS = 300;
export const PROVISIONING_HEADERS = { client: 'x-orvia-client', timestamp: 'x-orvia-timestamp', nonce: 'x-orvia-nonce', signature: 'x-orvia-signature' } as const;
export const PROVISIONING_SCOPES = ['accounts.read', 'accounts.create.member', 'accounts.create.admin', 'accounts.create.super_admin', 'accounts.setup_code', 'accounts.deactivate'] as const;

export function provisioningSignature(secret: string, method: string, path: string, timestamp: string, nonce: string, body: string) {
  const digest = createHash('sha256').update(body, 'utf8').digest('hex');
  return createHmac('sha256', Buffer.from(secret, 'base64url')).update(`${PROVISIONING_PRODUCT}\n${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${digest}`, 'utf8').digest('hex');
}
/** Headers for one request, as the website would send them. */
export function signProvisioningRequest(client: { id: string; secret: string }, method: string, path: string, body: string, now = Date.now(), nonce = createHash('sha256').update(`${now}:${Math.random()}`).digest('base64url').slice(0, 32)) {
  const timestamp = String(Math.floor(now / 1000));
  return { [PROVISIONING_HEADERS.client]: client.id, [PROVISIONING_HEADERS.timestamp]: timestamp, [PROVISIONING_HEADERS.nonce]: nonce,
    [PROVISIONING_HEADERS.signature]: provisioningSignature(client.secret, method, path, timestamp, nonce, body) };
}

const Id = z.uuid();
const Time = z.iso.datetime();
export const ProvisioningAccountCreate = z.strictObject({
  name: z.string().trim().min(1).max(100), email: z.string().email().max(254),
  role: z.enum(['VENDOR_SUPER_ADMIN', 'VENDOR_ADMIN', 'LEAD_AUDITOR', 'AUDITOR', 'AUDIT_REVIEWER']),
  setup_code_valid_hours: z.number().int().min(1).max(168).default(72),
});
export const ProvisioningAccount = z.strictObject({ user_id: Id, name: z.string(), email: z.string(), role: z.string(), active: z.boolean(), deleted: z.boolean(), password_set: z.boolean(), mfa_enrolled: z.boolean(), created_at: Time });
export const ProvisioningAccountList = z.strictObject({ accounts: z.array(ProvisioningAccount).max(1000) });
export const ProvisioningAccountCreated = z.strictObject({ account: ProvisioningAccount, setup_code: z.string(), setup_code_expires_at: Time,
  set_password_path: z.literal('/vendor/account-setup'), note: z.string() });
export const ProvisioningSetupCode = z.strictObject({ user_id: Id, setup_code: z.string(), setup_code_expires_at: Time });
export const ProvisioningCodeRequest = z.strictObject({ setup_code_valid_hours: z.number().int().min(1).max(168).default(72) });
