import { Session } from '../../contracts/src/index.ts';
import type { AuthInstance } from '../../auth/src/server.ts';
import type { RuntimeConfig } from '../../auth/src/config.ts';
import type { Authority } from '../../db/src/runtime.ts';

const read = ['overview.read', 'configuration.read', 'principals.read', 'workflow.read', 'evidence.read', 'evidence.export', 'tests.read', 'capabilities.read', 'health.read'];
export const roleCapabilities: Record<string, string[]> = {
  ORG_SUPER_ADMIN: [...read, 'configuration.write', 'policy.publish', 'systems.check', 'principals.create', 'action.reconcile', 'manual.attest', 'policy.preview', 'tests.run'],
  ORG_ADMIN: [...read, 'configuration.write', 'systems.check', 'principals.create', 'action.reconcile', 'manual.attest', 'policy.preview'],
  // Assigned workflow/task permissions require a resource assignment in A03.
  MEMBER: ['workflow.read', 'action.reconcile', 'manual.attest'], AUDITOR: read,
  DATA_PRINCIPAL: ['consent.own.read', 'consent.own.write', 'receipt.own.read'],
};
export class AccessError extends Error {
  constructor(public status: number, public code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVICE_UNAVAILABLE' | 'VALIDATION_ERROR' | 'IDEMPOTENCY_CONFLICT' | 'EPOCH_CONFLICT' | 'STALE_GENERATION' | 'INVALID_COMMAND',
    public fieldErrors?: { field: string; code: string }[]) { super(code); }
}
export async function authorityFor(request: Request, staff: AuthInstance, principal: AuthInstance): Promise<Authority> {
  if (request.headers.has('authorization')) throw new AccessError(401, 'UNAUTHENTICATED');
  const [staffSession, principalSession] = await Promise.all([
    staff.auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } }),
    principal.auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } }),
  ]);
  if (staffSession && principalSession) throw new AccessError(403, 'FORBIDDEN');
  const session = staffSession ?? principalSession;
  if (!session) throw new AccessError(401, 'UNAUTHENTICATED');
  const instance = staffSession ? staff : principal;
  const schema = staffSession ? 'staff_auth' : 'principal_auth';
  const result = await instance.pool.query(`SELECT * FROM ${schema}.authority WHERE user_id=$1 AND active`, [session.user.id]);
  if (result.rowCount !== 1) throw new AccessError(403, 'FORBIDDEN');
  const binding = result.rows[0];
  const role = staffSession ? binding.role : 'DATA_PRINCIPAL';
  const capabilities = roleCapabilities[role];
  if (!capabilities) throw new AccessError(403, 'FORBIDDEN');
  const mfa = staffSession ? await staff.pool.query('SELECT 1 FROM staff_auth.mfa_sessions WHERE session_id=$1', [session.session.id]) : null;
  const verified = mfa?.rowCount === 1;
  const privileged = role === 'ORG_SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'MEMBER';
  if (privileged && !verified) throw new AccessError(403, 'FORBIDDEN');
  return Session.parse({ actor_domain: staffSession ? 'STAFF' : 'PRINCIPAL', actor_id: session.user.id,
    scope: { tenant_id: binding.tenant_id, legal_entity_id: binding.legal_entity_id, environment_id: binding.environment_id },
    role, capabilities, expires_at: session.session.expiresAt.toISOString(),
    ...(staffSession ? { mfa_verified: verified } : { principal_id: binding.principal_id }) });
}
export async function requireCapability(config: RuntimeConfig, actor: Authority, domain: 'STAFF' | 'PRINCIPAL', capability: string) {
  if (actor.actor_domain !== domain || !actor.capabilities.includes(capability)) throw new AccessError(403, 'FORBIDDEN');
  if (domain === 'PRINCIPAL') return;
  let response: Response;
  try { response = await fetch(`http://127.0.0.1:${config.opa_port}/v1/data/orvia/admin/authorize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(2000),
    body: JSON.stringify({ input: { actor_domain: actor.actor_domain, role: actor.role, capability, mfa_verified: actor.mfa_verified } }),
  }); } catch { throw new AccessError(503, 'SERVICE_UNAVAILABLE'); }
  if (!response.ok) throw new AccessError(503, 'SERVICE_UNAVAILABLE');
  let decision: unknown; try { decision = await response.json(); } catch { throw new AccessError(503, 'SERVICE_UNAVAILABLE'); }
  if (!decision || typeof decision !== 'object' || !('result' in decision) || typeof decision.result !== 'boolean') throw new AccessError(503, 'SERVICE_UNAVAILABLE');
  if (!decision.result) throw new AccessError(403, 'FORBIDDEN');
}
