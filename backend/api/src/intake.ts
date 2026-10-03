import { schemas, Id } from '../../../shared/contracts/src/index.ts';
import { limitedBody } from '../../auth/src/server.ts';
import { AccessError } from '../../authorization/src/index.ts';
import { scopedTransaction, type Authority } from '../../../database/customer/src/runtime.ts';
import { intakeKeyDigest, intakeReceipt, submitIntake } from '../../domain/src/registry/intake.ts';
import { collectForPlatform } from '../../domain/src/rights/response-packages.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';

/**
 * Organisation website/app intake (revision 1.7). The organisation's own application server calls these routes for its
 * signed-in customers, with an intake key created in the Workspace. The key is resolved by digest through a narrow database
 * function, then the request runs as that key's own actor, whose row-level policies allow only adding and reading its own
 * submissions. The key is a server-side secret: a request carrying cookies or any browser Origin is refused, so it cannot be
 * used from a web page where a visitor could copy it.
 */
export function intakeRoute(request: Request) {
  return safeRoute(async requestId => {
    const r = runtime();
    const path = new URL(request.url).pathname;
    if (request.headers.has('cookie')) throw new AccessError(401, 'UNAUTHENTICATED');
    if (request.headers.has('origin')) throw new AccessError(403, 'FORBIDDEN');
    const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) throw new AccessError(401, 'UNAUTHENTICATED');
    const key = (await r.pool.query('SELECT * FROM app.resolve_intake_client($1)', [intakeKeyDigest(token)])).rows[0];
    if (!key) throw new AccessError(401, 'UNAUTHENTICATED');
    // An intake actor lives for this request only.
    const actor: Authority = { actor_domain: 'MACHINE', actor_id: key.id, role: 'INTAKE', capabilities: ['intake.submit'], expires_at: new Date(Date.now() + 60_000).toISOString(),
      scope: { tenant_id: key.tenant_id, legal_entity_id: key.legal_entity_id, environment_id: key.environment_id } };
    const status = path.match(/^\/api\/v1\/intake\/submissions\/([^/]+)$/);
    const collect = path.match(/^\/api\/v1\/intake\/submissions\/([^/]+)\/response-package$/);
    let result: unknown; let code = 200;
    if (collect) {
      // Owner decision 2026-10-03: the platform collects the released response for a rights request it submitted.
      if (request.method !== 'POST') throw new AccessError(404, 'NOT_FOUND');
      if (!Id.safeParse(collect[1]).success) throw new AccessError(400, 'VALIDATION_ERROR');
      const copy = await scopedTransaction(r.pool, actor, tx => collectForPlatform({ tx, actor, requestId }, collect[1]!));
      return Response.json(schemas.OwnResponsePackage.parse(copy), { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } });
    }
    if (status) {
      if (request.method !== 'GET') throw new AccessError(404, 'NOT_FOUND');
      if (!Id.safeParse(status[1]).success) throw new AccessError(400, 'VALIDATION_ERROR');
      result = await scopedTransaction(r.pool, actor, tx => intakeReceipt({ tx, actor, requestId }, status[1]!));
    } else {
      const kind = path === '/api/v1/intake/consents' ? 'CONSENT' : path === '/api/v1/intake/rights-requests' ? 'RIGHTS' : null;
      if (!kind || request.method !== 'POST') throw new AccessError(404, 'NOT_FOUND');
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new AccessError(400, 'VALIDATION_ERROR');
      const idempotency = request.headers.get('idempotency-key');
      if (!idempotency || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotency)) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'idempotency-key', code: 'required' }]);
      let input: unknown;
      try { input = JSON.parse(await limitedBody(request, 8192) ?? ''); } catch { throw new AccessError(400, 'VALIDATION_ERROR'); }
      const parsed = (kind === 'CONSENT' ? schemas.IntakeConsentSubmit : schemas.IntakeRightsSubmit).safeParse(input);
      if (!parsed.success) throw new AccessError(400, 'VALIDATION_ERROR', parsed.error.issues.slice(0, 32).map(issue => ({ field: issue.path.join('.').slice(0, 120), code: issue.code })));
      result = await scopedTransaction(r.pool, actor, tx => submitIntake({ tx, actor, requestId }, kind, parsed.data, idempotency, key));
      code = 202;
    }
    return Response.json(schemas.IntakeReceipt.parse(result), { status: code, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } });
  }, 'BUSINESS');
}
