import { schemas } from '../../../shared/contracts/src/index.ts';
import { limitedBody } from '../../auth/src/server.ts';
import { AccessError } from '../../authorization/src/index.ts';
import { scopedTransaction, type Authority } from '../../../database/customer/src/runtime.ts';
import { supplierAnswer, supplierQuestionnaire, tokenDigest } from '../../domain/src/third-party/third-party.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';

/**
 * Supplier questionnaire endpoints (EX08). A supplier has no ORVIA account: it
 * holds a bearer token issued once for one draft vendor due-diligence
 * assessment. The token is resolved by digest through a narrow database
 * function, then the request runs as that link's own actor, whose row-level
 * policies expose only that assessment's questions and the supplier's own
 * answers. Cookies are refused so a staff session can never ride along.
 */
export function supplierRoute(request: Request) {
  return safeRoute(async requestId => {
    const r = runtime();
    const path = new URL(request.url).pathname;
    if (request.headers.has('cookie')) throw new AccessError(401, 'UNAUTHENTICATED');
    const origin = request.headers.get('origin');
    if (origin !== null && origin !== r.config.origin) throw new AccessError(403, 'FORBIDDEN');
    const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) throw new AccessError(401, 'UNAUTHENTICATED');
    const link = (await r.pool.query('SELECT * FROM app.resolve_supplier_link($1)', [tokenDigest(token)])).rows[0];
    if (!link) throw new AccessError(401, 'UNAUTHENTICATED');
    const actor: Authority = { actor_domain: 'MACHINE', actor_id: link.id, role: 'SUPPLIER', capabilities: ['supplier.respond'], expires_at: new Date(link.expires_at).toISOString(),
      scope: { tenant_id: link.tenant_id, legal_entity_id: link.legal_entity_id, environment_id: link.environment_id } };
    let input: unknown;
    if (path === '/api/v1/supplier/questionnaire/answers') {
      if (request.method !== 'POST') throw new AccessError(404, 'NOT_FOUND');
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new AccessError(400, 'VALIDATION_ERROR');
      try { input = JSON.parse(await limitedBody(request, 262144) ?? ''); } catch { throw new AccessError(400, 'VALIDATION_ERROR'); }
      if (!schemas.SupplierAnswers.safeParse(input).success) throw new AccessError(400, 'VALIDATION_ERROR');
    } else if (path !== '/api/v1/supplier/questionnaire' || request.method !== 'GET') throw new AccessError(404, 'NOT_FOUND');
    const result = await scopedTransaction(r.pool, actor, async tx => {
      const c = { tx, actor, requestId };
      return input === undefined ? supplierQuestionnaire(c) : supplierAnswer(c, input);
    });
    return Response.json(schemas.SupplierQuestionnaire.parse(result), { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Request-Id': requestId } });
  }, 'BUSINESS');
}
