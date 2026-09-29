import { authorizationReady } from '../../authorization/src/index.ts';
import { runtime } from './runtime.ts';
import { configuredKind, verifiedKind } from './installation.ts';

/**
 * GET /readyz — whether this process can serve requests now: the database
 * answers as the application role and the authorization policy answers an
 * allow and a deny control within the production deadline. /healthz stays a
 * liveness probe. The startup script waits for this before declaring ready.
 * On the vendor's VENDOR_SERVICE installation the same checks run against the
 * vendor database and the vendor policy, and the recorded installation kind
 * must agree with the configured one.
 */
export async function readinessRoute() {
  if (configuredKind() === 'VENDOR_SERVICE') return vendorReadiness();
  const r = runtime();
  const database = await r.pool.query('SELECT 1 AS ok').then(result => result.rows[0]?.ok === 1, () => false);
  const kind = await verifiedKind().then(() => true, () => false);
  const policy = await authorizationReady(r.config);
  const ready = database && kind && policy.ready;
  return Response.json({ status: ready ? 'ready' : 'not_ready', installation_kind: 'CUSTOMER_INSTALLATION', database, kind_verified: kind, policy: { ready: policy.ready, allow_ms: policy.allow_ms, deny_ms: policy.deny_ms, error: policy.error } },
    { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}

async function vendorReadiness() {
  const { vendorRuntime } = await import('./vendor/runtime.ts');
  const r = vendorRuntime();
  const database = await r.pool.query('SELECT 1 AS ok').then(result => result.rows[0]?.ok === 1, () => false);
  const kind = await verifiedKind().then(() => true, () => false);
  const decide = async (input: Record<string, unknown>) => {
    const response = await fetch(`http://127.0.0.1:${r.config.opa_port}/v1/data/orvia/vendor/authorize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(2000), body: JSON.stringify({ input }) });
    return (await response.json() as { result?: unknown }).result;
  };
  const policy = await Promise.all([decide({ actor_domain: 'VENDOR_STAFF', role: 'VENDOR_ADMIN', capability: 'vendor.team.manage', mfa_verified: true }),
    decide({ actor_domain: 'VENDOR_STAFF', role: 'AUDITOR', capability: 'vendor.team.manage', mfa_verified: true })]).then(([allow, deny]) => allow === true && deny === false, () => false);
  const ready = database && kind && policy;
  return Response.json({ status: ready ? 'ready' : 'not_ready', installation_kind: 'VENDOR_SERVICE', database, kind_verified: kind, policy: { ready: policy } }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
