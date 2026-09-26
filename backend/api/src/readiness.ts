import { authorizationReady } from '../../authorization/src/index.ts';
import { runtime } from './runtime.ts';

/**
 * GET /readyz — whether this process can serve requests now: the database
 * answers as the application role and the authorization policy answers an
 * allow and a deny control within the production deadline. /healthz stays a
 * liveness probe. The startup script waits for this before declaring ready.
 */
export async function readinessRoute() {
  const r = runtime();
  const database = await r.pool.query('SELECT 1 AS ok').then(result => result.rows[0]?.ok === 1, () => false);
  const policy = await authorizationReady(r.config);
  const ready = database && policy.ready;
  return Response.json({ status: ready ? 'ready' : 'not_ready', database, policy: { ready: policy.ready, allow_ms: policy.allow_ms, deny_ms: policy.deny_ms, error: policy.error } },
    { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
