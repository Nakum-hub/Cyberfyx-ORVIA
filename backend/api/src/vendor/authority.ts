import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { VendorRoleName } from '../../../../shared/contracts/src/vendor-audit.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { limitedBody } from '../../../auth/src/server.ts';
import type { RuntimeConfig } from '../../../auth/src/config.ts';
import { safeError } from '../../../../shared/testing/src/evidence.ts';
import { vendorRuntime, type VendorRuntime } from './runtime.ts';
import { markVendorFailure, markVendorPolicyFailure, vendorFailureMetadata } from './dependency-errors.ts';

/**
 * Vendor-area authority (revision 1.5 addendum). Two kinds of actor exist on
 * the vendor installation, and nothing else is accepted:
 *   VENDOR_STAFF   — a vendor_auth login with an active role;
 *   CLIENT_ACCOUNT — a client organisation's vendor-account login, which can
 *                    only upload audit evidence packages.
 * Both must have completed an authenticator ceremony in this session. A
 * customer staff, principal or supplier credential does not exist here.
 */
export const VendorRole = VendorRoleName;
export type VendorRole = 'VENDOR_SUPER_ADMIN' | 'VENDOR_ADMIN' | 'LEAD_AUDITOR' | 'AUDITOR' | 'AUDIT_REVIEWER';
const administration = ['vendor.team.read', 'vendor.team.manage', 'organisations.read', 'organisations.manage', 'licences.read', 'licences.issue', 'engagements.read', 'engagements.manage', 'support.read', 'support.manage', 'vendor.audit.read', 'payments.read', 'vendor.overview.read'];
const fieldwork = ['engagements.read', 'organisations.read', 'audit.fieldwork', 'support.read'];
/** Mirrors backend/policy/vendor/authorization.rego; both must allow. */
// Audit practice (task AUDIT-PRACTICE-01): managers record criteria and methodology, reviewers approve them and decide
// engagement acceptance, and only the super administrator records the gates that allow real engagements and legal holds.
export const vendorRoleCapabilities: Record<VendorRole | 'CLIENT_ACCOUNT', string[]> = {
  VENDOR_SUPER_ADMIN: [...administration, 'practice.manage', 'practice.activate'], VENDOR_ADMIN: [...administration, 'practice.manage'],
  LEAD_AUDITOR: [...fieldwork, 'audit.report.draft', 'practice.manage'], AUDITOR: fieldwork, AUDIT_REVIEWER: [...fieldwork, 'audit.report.approve', 'practice.approve', 'engagement.accept'],
  CLIENT_ACCOUNT: ['packages.upload'],
};
export type VendorActor = {
  actor_domain: 'VENDOR_STAFF' | 'CLIENT_ACCOUNT'; actor_id: string; role: VendorRole | 'CLIENT_ACCOUNT';
  capabilities: string[]; organisation_id: string | null; name: string; email: string; expires_at: string; session_id: string;
};

export async function vendorActorFor(request: Request, r: VendorRuntime = vendorRuntime()): Promise<VendorActor> {
  if (request.headers.has('authorization')) throw new AccessError(401, 'UNAUTHENTICATED');
  const [staff, account] = await Promise.all([
    r.vendor.auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } }).catch(error => markVendorFailure(error, 'VENDOR_SESSION_READ')),
    r.account.auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } }).catch(error => markVendorFailure(error, 'ACCOUNT_SESSION_READ')),
  ]);
  if (staff && account) throw new AccessError(403, 'FORBIDDEN');
  const session = staff ?? account;
  if (!session) throw new AccessError(401, 'UNAUTHENTICATED');
  const instance = staff ? r.vendor : r.account; const schema = staff ? 'vendor_auth' : 'account_auth';
  const binding = (await instance.pool.query(`SELECT * FROM ${schema}.authority WHERE user_id=$1 AND active`, [session.user.id])).rows[0];
  if (!binding) throw new AccessError(403, 'FORBIDDEN');
  if (binding.must_change_password) throw new AccessError(403, 'FORBIDDEN', [{ field: 'password', code: 'password_change_required' }]);
  const mfa = await instance.pool.query(`SELECT 1 FROM ${schema}.mfa_sessions WHERE session_id=$1`, [session.session.id]);
  if (mfa.rowCount !== 1) throw new AccessError(403, 'FORBIDDEN', [{ field: 'mfa', code: 'mfa_required' }]);
  const role = staff ? VendorRole.parse(binding.role) : 'CLIENT_ACCOUNT' as const;
  return { actor_domain: staff ? 'VENDOR_STAFF' : 'CLIENT_ACCOUNT', actor_id: session.user.id, role, capabilities: vendorRoleCapabilities[role] ?? [],
    organisation_id: staff ? null : binding.organisation_id, name: session.user.name, email: session.user.email,
    expires_at: session.session.expiresAt.toISOString(), session_id: session.session.id };
}

/** Local capability check, then the vendor policy in OPA; an unreachable policy denies. */
export async function requireVendorCapability(config: RuntimeConfig, actor: VendorActor, capability: string) {
  if (!actor.capabilities.includes(capability)) throw new AccessError(403, 'FORBIDDEN');
  const started = performance.now();
  let response: Response;
  try { response = await fetch(`http://127.0.0.1:${config.opa_port}/v1/data/orvia/vendor/authorize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(2000),
    body: JSON.stringify({ input: { actor_domain: actor.actor_domain, role: actor.role, capability, mfa_verified: true } }) }); }
  catch (error) { markVendorPolicyFailure(new AccessError(503, 'SERVICE_UNAVAILABLE'), 'VENDOR_POLICY_FETCH', performance.now() - started, undefined, error); }
  if (!response.ok) markVendorPolicyFailure(new AccessError(503, 'SERVICE_UNAVAILABLE'), 'VENDOR_POLICY_HTTP', performance.now() - started, response.status);
  const decision = await response.json().catch(() => null) as { result?: unknown } | null;
  if (typeof decision?.result !== 'boolean') throw new AccessError(503, 'SERVICE_UNAVAILABLE');
  if (!decision.result) throw new AccessError(403, 'FORBIDDEN');
}

/** A vendor business transaction as the unprivileged vendor role, with the actor bound for row-level security. */
export async function vendorTransaction<T>(pool: pg.Pool, actor: VendorActor | null, work: (tx: pg.PoolClient) => Promise<T>) {
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    const role = (await tx.query('SELECT current_user AS name, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    if (role?.name !== 'orvia_vendor_app' || role.rolsuper || role.rolbypassrls) throw new Error('Unsafe vendor database role');
    if (actor) await tx.query(`SELECT set_config('vendor.actor_id',$1,true), set_config('vendor.actor_domain',$2,true), set_config('vendor.role',$3,true),
      set_config('vendor.capabilities',$4,true), set_config('vendor.organisation_id',$5,true)`, [actor.actor_id, actor.actor_domain, actor.role, actor.capabilities.join(','), actor.organisation_id ?? '']);
    const result = await work(tx);
    await tx.query('COMMIT');
    return result;
  } catch (error) { await tx.query('ROLLBACK').catch(() => {}); throw error; } finally { tx.release(); }
}

const errorCodes = new Set(['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'SERVICE_UNAVAILABLE', 'VALIDATION_ERROR', 'IDEMPOTENCY_CONFLICT', 'RATE_LIMITED']);
/** Error envelope and request audit for the vendor installation (vendor.request_audit). */
export async function vendorSafeRoute(work: (requestId: string) => Promise<Response>, operation: string, getRuntime: () => VendorRuntime = vendorRuntime) {
  const requestId = randomUUID(); let response: Response;
  try { response = await work(requestId); }
  catch (caught) {
    // A request body that fails its canonical schema is the caller's error, not the service's.
    const issues = (caught as { name?: string; issues?: { path: PropertyKey[]; code: string }[] })?.name === 'ZodError' ? (caught as { issues: { path: PropertyKey[]; code: string }[] }).issues : null;
    const error = issues ? new AccessError(400, 'VALIDATION_ERROR', issues.slice(0, 16).map(i => ({ field: i.path.map(String).join('.').slice(0, 120), code: i.code }))) : caught;
    const metadata = vendorFailureMetadata(error);
    if (!(error instanceof AccessError) || (error.status === 503 && (metadata.failure_stage === 'VENDOR_POLICY_FETCH' || metadata.failure_stage === 'VENDOR_POLICY_HTTP'))) {
      console.error(JSON.stringify({ request_id: requestId, operation, ...safeError(error), ...metadata }));
    }
    const status = error instanceof AccessError ? error.status : 503;
    const code = error instanceof AccessError && errorCodes.has(error.code) ? error.code : 'SERVICE_UNAVAILABLE';
    response = Response.json({ error: { code, message: code === 'FORBIDDEN' ? 'Access denied.' : 'Request could not be completed.',
      retry: status === 401 ? 'REAUTHENTICATE' : status === 503 || status === 429 ? 'AFTER_DELAY' : 'NEVER',
      ...(error instanceof AccessError && error.fieldErrors ? { field_errors: error.fieldErrors } : {}) }, request_id: requestId }, { status });
  }
  try { await getRuntime().pool.query('INSERT INTO vendor.request_audit (id, operation, status) VALUES ($1,$2,$3)', [requestId, operation.slice(0, 120), response.status]); }
  catch { return Response.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Request audit unavailable.', retry: 'AFTER_DELAY' }, request_id: requestId }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } }); }
  response.headers.set('Cache-Control', 'no-store'); response.headers.set('X-Request-Id', requestId); response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

/** Same-origin JSON body, bounded. */
export async function jsonBody(request: Request, config: RuntimeConfig, maximum = 16384): Promise<unknown> {
  if (request.headers.get('origin') !== new URL(config.origin).origin) throw new AccessError(403, 'FORBIDDEN');
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new AccessError(400, 'VALIDATION_ERROR');
  const text = await limitedBody(request, maximum);
  if (text === undefined) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'body', code: 'too_large' }]);
  try { return JSON.parse(text); } catch { throw new AccessError(400, 'VALIDATION_ERROR'); }
}
type Issue = { path: PropertyKey[]; code: string };
export function parseWith<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: Issue[] } } }, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AccessError(400, 'VALIDATION_ERROR', parsed.error.issues.slice(0, 16).map((i: Issue) => ({ field: i.path.join('.').slice(0, 120), code: i.code })));
  return parsed.data;
}
