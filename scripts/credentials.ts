/**
 * Where credentials live, and which side owns them.
 *
 * VENDOR (ORVIA the company) — `.local/vendor/`
 *   signing/release.json   release/regulatory-package signing key pair (private + public)
 *   signing/licence.json   licence signing key pair (private + public)
 *   signing/audit.json     DPDPA audit signing key pair (private + public): signs
 *                          auditor request lists, findings and reports on the
 *                          vendor's own VENDOR_SERVICE installation
 *   signing/service-licence.json  signs the licence of the company's own VENDOR_SERVICE installation (revision 1.13);
 *                          a separate key so a vendor licence and a customer licence can never be confused
 *   commerce/razorpay.json Razorpay keys for the vendor website checkout (key_id,
 *                          key_secret, webhook_secret, merchant_id, mode); see
 *                          docs/engineering/PAYMENTS_PROVIDER_DECISION.md
 *   These are used only by vendor tooling and by tests that play the vendor to
 *   sign fixtures. They are never placed on, or passed to, a customer runtime.
 *   In production they belong in the vendor's own custody (offline or HSM), not
 *   on any customer host; the local directory is for development only.
 *
 * CUSTOMER (each organisation's installation) — `.local/profiles/<installation>/`
 *   postgres-password, auth/*, machine-auth/*, worker/*, agent/*, observer/*,
 *   sender/*   database role passwords, session secrets, machine enrollments and
 *              the worker's own signing key, all generated for that installation
 *   trust/vendor-public-keys.json   the vendor's PUBLIC keys this installation
 *              trusts to verify releases, licences and audit documents; never a private key
 *
 * The customer application is started with customerEnvironment(): any
 * *_PRIVATE_KEY variable is removed, and the public keys come from the
 * installation's trust file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Same rule as ChannelAddress in shared/contracts/src/audit-channel.ts, kept dependency-free here. */
const channelAddressValid = (v: unknown) => { if (typeof v !== 'string' || v.length > 300) return false;
  try { const x = new URL(v); return !x.username && !x.password && !x.search && !x.hash && (x.protocol === 'https:' || (x.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(x.hostname))); } catch { return false; } };

type PublicKey = { key_id: string; public: string };
/** audit_service (revision 1.6): the one address the installation's audit channel may call; HTTPS, or plain HTTP only to loopback. */
export type VendorTrust = { release: PublicKey; licence: PublicKey; audit: PublicKey | null; audit_service: { url: string } | null };
const text = (v: unknown, what: string) => { if (typeof v !== 'string' || !v.length) throw new Error(`Invalid ${what}`); return v; };
const publicKey = (v: unknown, what: string): PublicKey => { const o = (v ?? {}) as Record<string, unknown>; return { key_id: text(o.key_id, `${what} key_id`), public: text(o.public, `${what} public key`) }; };
const keyPair = (v: unknown, what: string) => ({ ...publicKey(v, what), private: text((v as Record<string, unknown>).private, `${what} private key`) });
const trustFile = (v: unknown): VendorTrust => { const o = (v ?? {}) as Record<string, unknown>; if (Object.keys(o).some(k => !['release', 'licence', 'audit', 'audit_service'].includes(k))) throw new Error('Unexpected entry in trust file');
  for (const k of ['release', 'licence', 'audit'] as const) if (Object.keys((o[k] ?? {}) as object).some(x => !['key_id', 'public'].includes(x))) throw new Error('A trust file holds public keys only');
  let audit_service: { url: string } | null = null;
  if (o.audit_service !== undefined) {
    const s = (o.audit_service ?? {}) as Record<string, unknown>;
    if (Object.keys(s).some(x => x !== 'url')) throw new Error('audit_service holds only its url');
    if (!channelAddressValid(s.url)) throw new Error('audit_service url must be HTTPS (plain HTTP only to loopback) with no credentials, query or fragment');
    audit_service = { url: s.url as string };
  }
  return { release: publicKey(o.release, 'release'), licence: publicKey(o.licence, 'licence'), audit: o.audit === undefined ? null : publicKey(o.audit, 'audit'), audit_service }; };
/** service-licence (revision 1.13): signs the licence of the company's own vendor service only; never a customer licence. */
export type SigningKind = 'release' | 'licence' | 'audit' | 'service-licence';
const PREFIX: Record<SigningKind, string> = { release: 'ORVIA_RELEASE', licence: 'ORVIA_LICENCE', audit: 'ORVIA_AUDIT', 'service-licence': 'ORVIA_SERVICE_LICENCE' };

const root = () => process.env.ORVIA_WORKSPACE_ROOT ?? process.cwd();
export const vendorDirectory = () => resolve(root(), '.local/vendor');
export const vendorKeyPath = (kind: SigningKind) => resolve(vendorDirectory(), 'signing', `${kind}.json`);
export const profileDirectory = (profile: string) => resolve(root(), '.local/profiles', profile);
export const trustPath = (profile: string) => resolve(profileDirectory(profile), 'trust', 'vendor-public-keys.json');

/** Vendor-side only: the signing key pair. Refuses if it has not been separated into the vendor directory. */
export function vendorSigningKey(kind: SigningKind) {
  const path = vendorKeyPath(kind);
  if (!existsSync(path)) throw new Error(`Vendor ${kind} signing key not found at .local/vendor/signing/${kind}.json. Run: pnpm run credentials:separate confirm:local`);
  return keyPair(JSON.parse(readFileSync(path, 'utf8')), kind);
}
/** Environment variables for vendor tooling that signs (tests acting as the vendor, package signing). */
export function vendorSigningEnvironment(kind: SigningKind) {
  const pair = vendorSigningKey(kind); const prefix = PREFIX[kind];
  return { [`${prefix}_KEY_ID`]: pair.key_id, [`${prefix}_PUBLIC_KEY`]: pair.public, [`${prefix}_PRIVATE_KEY`]: pair.private };
}
/** Customer-side: the public keys an installation trusts, or null if none has been provisioned. */
export function installationTrust(profile: string) {
  return installationTrustAt(profileDirectory(profile));
}
/** The same, from an installation's profile directory (used by services that know their directory, not their profile name). */
export function installationTrustAt(directory: string) {
  const path = resolve(directory, 'trust', 'vendor-public-keys.json');
  return existsSync(path) ? trustFile(JSON.parse(readFileSync(path, 'utf8'))) : null;
}
/**
 * The environment a customer application process runs with: no private key of
 * any kind, and the vendor public keys from the installation's trust file
 * (an explicitly set public key is kept only if it matches the trust file).
 */
export function customerEnvironment(base: NodeJS.ProcessEnv, profile: string): NodeJS.ProcessEnv {
  const env = {} as NodeJS.ProcessEnv;
  for (const [name, value] of Object.entries(base)) if (!/PRIVATE_KEY/i.test(name)) env[name] = value;
  const trust = installationTrust(profile);
  if (trust) {
    for (const [prefix, key] of [['ORVIA_RELEASE', trust.release], ['ORVIA_LICENCE', trust.licence], ...(trust.audit ? [['ORVIA_AUDIT', trust.audit] as const] : [])] as const) {
      if (env[`${prefix}_PUBLIC_KEY`] && env[`${prefix}_PUBLIC_KEY`] !== key.public) throw new Error(`${prefix}_PUBLIC_KEY differs from the installation trust file; refusing to start with an untrusted key.`);
      env[`${prefix}_KEY_ID`] = key.key_id; env[`${prefix}_PUBLIC_KEY`] = key.public;
    }
    if (trust.audit_service) {
      if (env.ORVIA_AUDIT_SERVICE_URL && env.ORVIA_AUDIT_SERVICE_URL !== trust.audit_service.url) throw new Error('ORVIA_AUDIT_SERVICE_URL differs from the installation trust file; refusing to start with an untrusted address.');
      env.ORVIA_AUDIT_SERVICE_URL = trust.audit_service.url;
    } else delete env.ORVIA_AUDIT_SERVICE_URL;
  }
  return env;
}

/** Vendor-side only: the Razorpay credentials for the vendor website checkout, or null until provisioned. */
export function vendorRazorpayCredentials() {
  const path = resolve(vendorDirectory(), 'commerce', 'razorpay.json');
  if (!existsSync(path)) return null;
  const o = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const mode = o.mode === 'live' ? 'live' as const : o.mode === 'test' ? 'test' as const : null;
  if (!mode) throw new Error('razorpay.json mode must be "test" or "live"');
  return { key_id: text(o.key_id, 'Razorpay key_id'), key_secret: text(o.key_secret, 'Razorpay key_secret'), webhook_secret: text(o.webhook_secret, 'Razorpay webhook_secret'), merchant_id: text(o.merchant_id, 'Razorpay merchant_id'), mode };
}
