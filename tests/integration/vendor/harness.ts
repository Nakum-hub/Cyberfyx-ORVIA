// Vendor-installation test harness. Each run gets its own vendor database
// (orvia_vendor_test_<id>) on the local development server, the vendor
// migrations applied, and the vendor HTTP handlers called in-process with a
// cookie jar, exactly as the Next route files call them. Synthetic data only.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeConfig } from '../../../backend/auth/src/config.ts';
import { createAuth, authHandler } from '../../../backend/auth/src/server.ts';
import { runtimePool } from '../../../database/customer/src/runtime.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { applyVendorMigrations } from '../../../database/vendor/src/migrations.ts';
import { createVendorHandler, setupCodeDigest } from '../../../backend/api/src/vendor/routes.ts';
import type { VendorRuntime } from '../../../backend/api/src/vendor/runtime.ts';
import { authenticatorCode } from '../../../shared/testing/src/http-fixture.ts';

/** The vendor profile's configuration, read without changing the process's own profile. */
function vendorConfig() {
  const previous = process.env.ORVIA_PROFILE; process.env.ORVIA_PROFILE = 'vendor-a00';
  try { return runtimeConfig(); } finally { if (previous === undefined) delete process.env.ORVIA_PROFILE; else process.env.ORVIA_PROFILE = previous; }
}
export async function vendorHarness() {
  const base = vendorConfig();
  const database = `orvia_vendor_test_${randomUUID().replaceAll('-', '')}`;
  const operatorPassword = readFileSync(resolve(base.directory, 'postgres-password'), 'utf8').trim();
  const bootstrap = connectDatabase({ postgres_port: base.postgres_port, database: 'postgres', password: operatorPassword }).pool;
  await bootstrap.query(`CREATE DATABASE "${database}"`); await bootstrap.end();
  const operator = connectDatabase({ postgres_port: base.postgres_port, database, password: operatorPassword }).pool;
  const client = await operator.connect(); try { await applyVendorMigrations(client, randomUUID()); } finally { client.release(); }
  const config = { ...base, database } as unknown as typeof base;
  const runtime: VendorRuntime = { config, vendor: createAuth(config, 'vendor'), account: createAuth(config, 'account'), pool: runtimePool(config, 'orvia_vendor_app') } as VendorRuntime;
  const handler = createVendorHandler(() => runtime);
  const origin = config.origin;

  function session() {
    const cookies = new Map<string, string>();
    const send = async (path: string, init: { method?: string; body?: BodyInit | null; headers?: Record<string, string> } = {}) => {
      const headers = new Headers({ origin, host: new URL(origin).host, cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...init.headers });
      if (!headers.get('cookie')) headers.delete('cookie');
      const request = new Request(origin + path, { method: init.method ?? 'GET', headers, body: init.body ?? null });
      const response = path.startsWith('/api/auth/vendor') ? await authHandler(runtime.vendor, config, request) : path.startsWith('/api/auth/account') ? await authHandler(runtime.account, config, request) : await handler(request);
      for (const cookie of response.headers.getSetCookie()) { const value = cookie.split(';')[0]!; const at = value.indexOf('='); const v = value.slice(at + 1); if (v) cookies.set(value.slice(0, at), v); else cookies.delete(value.slice(0, at)); }
      return response;
    };
    return {
      send,
      async json(path: string, body?: unknown, headers: Record<string, string> = {}) {
        const response = await send(path, body === undefined ? { headers } : { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID().replaceAll('-', ''), ...headers } });
        const text = await response.text(); let data: unknown; try { data = JSON.parse(text); } catch { data = text; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertions read arbitrary response fields
        return { status: response.status, data: data as any };
      },
    };
  }
  type Login = { email: string; password: string; totp?: string; domain: 'vendor' | 'account' };
  /** Signs in, replacing a one-time password and enrolling an authenticator where needed. */
  async function login(user: Login, options: { enrol?: boolean } = {}) {
    const s = session(); const base = `/api/auth/${user.domain}`;
    let r = await s.json(base + '/sign-in/email', { email: user.email, password: user.password, rememberMe: false });
    if (r.status !== 200) throw new Error(`sign-in failed ${r.status} ${JSON.stringify(r.data)}`);
    if (r.data?.twoFactorRedirect) {
      r = await s.json(base + '/two-factor/verify-totp', { code: authenticatorCode(user.totp!), trustDevice: false });
      if (r.status !== 200) throw new Error(`verify failed ${r.status}`);
      return s;
    }
    const state = await s.json(base + '/orvia/password-state');
    if (state.data?.must_change_password) {
      const replacement = `Replaced-${randomUUID()}`;
      const changed = await s.json(base + '/change-password', { currentPassword: user.password, newPassword: replacement, revokeOtherSessions: false });
      if (changed.status !== 200) throw new Error(`change-password failed ${changed.status}`);
      user.password = replacement;
    }
    if (options.enrol === false) return s;
    const enabled = await s.json(base + '/two-factor/enable', { password: user.password, method: 'totp' });
    if (enabled.status !== 200) throw new Error(`enable failed ${enabled.status} ${JSON.stringify(enabled.data)}`);
    user.totp = enabled.data.totpURI;
    const verified = await s.json(base + '/two-factor/verify-totp', { code: authenticatorCode(user.totp!), trustDevice: false });
    if (verified.status !== 200) throw new Error(`verify failed ${verified.status} ${JSON.stringify(verified.data)}`);
    return s;
  }
  async function issueSetupCode() {
    const code = `TEST-${randomUUID().slice(0, 5).toUpperCase()}-SETUP-CODE`;
    await operator.query(`INSERT INTO vendor.installation_setup(singleton, code_digest, expires_at) VALUES (1,$1, clock_timestamp()+interval '1 hour')
      ON CONFLICT (singleton) DO UPDATE SET code_digest=EXCLUDED.code_digest, failed_attempts=0, used_at=NULL, expires_at=EXCLUDED.expires_at`, [setupCodeDigest(code)]);
    return code;
  }
  // The throwaway database is dropped at the end, so runs do not accumulate databases on the development server.
  async function close() {
    await Promise.allSettled([runtime.pool.end(), runtime.vendor.pool.end(), runtime.account.pool.end(), operator.end()]);
    const drop = connectDatabase({ postgres_port: base.postgres_port, database: 'postgres', password: operatorPassword }).pool;
    await drop.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`).catch(() => {}); await drop.end();
  }
  return { database, config, runtime, operator, handler, session, login, issueSetupCode, close };
}
export type Harness = Awaited<ReturnType<typeof vendorHarness>>;
