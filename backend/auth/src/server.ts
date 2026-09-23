import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AUTH } from '../../../shared/contracts/src/index.ts';
import { authSchema } from '../../../database/customer/src/auth-schema.ts';
import { runtimePool } from '../../../database/customer/src/runtime.ts';
import type { RuntimeConfig } from './config.ts';

export type Domain = 'staff' | 'principal';
export function createAuth(config: RuntimeConfig, domain: Domain, bootstrap = false) {
  const pool = runtimePool(config, domain === 'staff' ? 'orvia_staff_auth' : 'orvia_principal_auth');
  const schema = authSchema(domain === 'staff' ? 'staff_auth' : 'principal_auth');
  const auth = betterAuth({
    appName: 'ORVIA local synthetic prototype', baseURL: config.origin, basePath: AUTH[domain].base_path,
    secret: config.secret(`${domain}-secret`), trustedOrigins: [config.origin],
    database: drizzleAdapter(drizzle(pool, { schema }), { provider: 'pg', schema, transaction: true }),
    emailAndPassword: { enabled: true, disableSignUp: !bootstrap, autoSignIn: false, minPasswordLength: 16, maxPasswordLength: 128 },
    session: { expiresIn: 3600, updateAge: 300, freshAge: 300, cookieCache: { enabled: false } },
    advanced: { cookiePrefix: AUTH[domain].cookie_prefix, database: { generateId: () => randomUUID() },
      // Rehearsal is verified HTTPS; other profiles remain explicit development HTTP.
      useSecureCookies: config.origin.startsWith('https:'), defaultCookieAttributes: { httpOnly: true, sameSite: 'strict', path: '/' },
      ipAddress: { ipAddressHeaders: ['x-orvia-loopback-ip'] } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 10 }, '/two-factor/*': { window: 60, max: 10 } } },
    plugins: domain === 'staff' ? [twoFactor({ issuer: 'ORVIA', twoFactorCookieMaxAge: 300,
      accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 900 } })] : [],
    logger: { disabled: true }, telemetry: { enabled: false },
  });
  return { auth, pool, domain };
}
export type AuthInstance = ReturnType<typeof createAuth>;

const commonPaths = new Set(['/sign-in/email', '/sign-out', '/get-session', '/list-sessions', '/revoke-session', '/revoke-sessions', '/revoke-other-sessions']);
const staffPaths = new Set(['/two-factor/enable', '/two-factor/verify-totp', '/two-factor/verify-backup-code']);

// Transport guard around the supported library handler. No password/session crypto
// is implemented here. Signup is available only to the protected setup process.
export async function authHandler(instance: AuthInstance, config: RuntimeConfig, request: Request, requestId: string = randomUUID()) {
  const url = new URL(request.url);
  const path = url.pathname.slice(AUTH[instance.domain].base_path.length);
  const fail = (status: number, code: string) => Response.json({ code, message: 'Authentication request denied', request_id: requestId }, { status, headers: { 'Cache-Control': 'no-store' } });
  if ((request.headers.get('host') ?? url.host) !== new URL(config.origin).host || request.headers.has('authorization')) return fail(403, 'FORBIDDEN');
  if (!commonPaths.has(path) && !(instance.domain === 'staff' && staffPaths.has(path))) return fail(404, 'NOT_FOUND');
  if (request.method !== 'GET' && request.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED');
  const headers = new Headers(request.headers);
  // Local direct ingress only; never trust caller-controlled forwarding/IP headers.
  for (const name of ['x-forwarded-for', 'x-real-ip', 'forwarded', 'x-orvia-loopback-ip']) headers.delete(name);
  headers.set('x-orvia-loopback-ip', '127.0.0.1');
  let body: string | undefined;
  if (request.method === 'POST') {
    if (headers.get('origin') !== config.origin) return fail(403, 'INVALID_ORIGIN');
    if (headers.get('content-type')?.split(';')[0] !== 'application/json') return fail(400, 'INVALID_CONTENT_TYPE');
    body = await limitedBody(request, 8192);
    if (body === undefined) return fail(400, 'INVALID_BODY');
    let data: Record<string, unknown>;
    try { data = JSON.parse(body); } catch { return fail(400, 'INVALID_BODY'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(400, 'INVALID_BODY');
    const fields: Record<string, string[]> = {
      '/sign-in/email': ['email', 'password', 'rememberMe', 'callbackURL'],
      '/two-factor/enable': ['password', 'method'], '/two-factor/verify-totp': ['code', 'trustDevice'],
      '/two-factor/verify-backup-code': ['code', 'trustDevice'], '/revoke-session': ['token'],
    };
    if (Object.keys(data).some(key => !(fields[path] ?? []).includes(key))) return fail(400, 'INVALID_BODY');
    if (data.trustDevice === true || (data.method !== undefined && data.method !== 'totp')) return fail(400, 'UNSUPPORTED_METHOD');
    if (data.callbackURL !== undefined && data.callbackURL !== config.origin + '/workspace') return fail(400, 'INVALID_CALLBACK');
  }
  // Next may construct an internal localhost URL. Validate the actual Host first,
  // then give the library the configured canonical origin; do not trust forwarded hosts.
  const response = await instance.auth.handler(new Request(config.origin + url.pathname + url.search, { method: request.method, headers, body }));
  if (response.ok && instance.domain === 'staff' && ['/two-factor/verify-totp', '/two-factor/verify-backup-code'].includes(path)) {
    const cookieHeaders = new Headers(headers);
    const cookies = new Map((headers.get('cookie') ?? '').split(';').filter(Boolean).map(item => {
      const at = item.indexOf('='); return [item.slice(0, at).trim(), item.slice(at + 1)] as const;
    }));
    for (const cookie of response.headers.getSetCookie()) {
      const value = cookie.split(';')[0]!; const at = value.indexOf('='); cookies.set(value.slice(0, at), value.slice(at + 1));
    }
    cookieHeaders.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    const session = await instance.auth.api.getSession({ headers: cookieHeaders, query: { disableCookieCache: true } });
    if (!session) return fail(503, 'SESSION_UNAVAILABLE');
    // Recovery codes from an unverified enrollment are not an MFA ceremony.
    // Require the library's completed enrollment as well as this successful proof.
    const proof = await instance.pool.query(`INSERT INTO staff_auth.mfa_sessions (session_id)
      SELECT s.id FROM staff_auth.session s JOIN staff_auth."user" u ON u.id=s."userId"
      JOIN staff_auth."twoFactor" f ON f."userId"=u.id
      WHERE s.id=$1 AND u."twoFactorEnabled" AND f.verified
      ON CONFLICT (session_id) DO UPDATE SET verified_at=staff_auth.mfa_sessions.verified_at RETURNING session_id`, [session.session.id]);
    if (proof.rowCount !== 1) return fail(403, 'MFA_ENROLLMENT_REQUIRED');
  }
  const schema = instance.domain === 'staff' ? 'staff_auth' : 'principal_auth';
  await instance.pool.query(`INSERT INTO ${schema}.auth_audit (id,request_id,operation,status) VALUES ($1,$2,$3,$4)`, [randomUUID(), requestId, path, response.status]);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Request-Id', requestId);
  return response;
}

export async function limitedBody(request: Request, maximum: number): Promise<string | undefined> {
  if (Number(request.headers.get('content-length')) > maximum) return undefined;
  if (!request.body) return '{}';
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break;
      size += value.length; if (size > maximum) { await reader.cancel(); return undefined; } chunks.push(value); }
    return Buffer.concat(chunks).toString('utf8');
  } finally { reader.releaseLock(); }
}
