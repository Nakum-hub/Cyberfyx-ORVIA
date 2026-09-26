import { schemas } from '../../../shared/contracts/src/index.ts';
import { limitedBody } from '../../auth/src/server.ts';
import { AccessError } from '../../authorization/src/index.ts';
import { sdkSource } from '../../domain/src/cmp/sdk.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';

/**
 * Public website consent endpoints (EX02). The banner script and the consent
 * endpoint are reached from the customer's own website, so they carry no ORVIA
 * session: the site key in the path is a public identifier, and what makes a
 * request acceptable is that it comes from an origin a second person approved
 * for that site. Cross-origin access is granted to that exact origin only.
 * Cookies are refused, so no staff or portal session can ride along.
 */
const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
async function published(key: string) {
  return (await runtime().pool.query('SELECT * FROM app.cmp_published($1)', [key])).rows[0] as { site_id: string; origins: string[]; version: number; document: ReturnType<typeof schemas.CmpConfigDocument.parse>; content_digest: string } | undefined;
}
const cors = (origin: string) => ({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '600', Vary: 'Origin' });

/** GET /cmp/{siteKey}/orvia-cmp.js — the banner script with the published configuration embedded. */
export async function cmpSdkRoute(request: Request, siteKey: string) {
  if (request.method !== 'GET' || !KEY.test(siteKey)) return new Response('/* not found */', { status: 404, headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
  const site = await published(siteKey);
  if (!site) return new Response('/* No published consent banner for this site. */', { status: 404, headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
  const cookies: Record<string, string[]> = {};
  for (const t of site.document.trackers) (cookies[t.category] ??= []).push(...t.cookies);
  const body = sdkSource({ siteKey, version: site.version, categories: site.document.categories, cookies, texts: site.document.texts, honourGpc: site.document.rule.honour_gpc });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ETag: `"${site.content_digest.slice(0, 32)}"` } });
}

/** OPTIONS and POST /api/v1/cmp/{siteKey}/consents — one visitor's choice. */
export async function cmpConsentRoute(request: Request) {
  const match = new URL(request.url).pathname.match(/^\/api\/v1\/cmp\/([^/]+)\/consents$/);
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    const site = match && KEY.test(match[1]!) ? await published(match[1]!) : undefined;
    if (!site || !origin || !site.origins.includes(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  const response = await safeRoute(async requestId => {
    if (!match || !KEY.test(match[1]!) || request.method !== 'POST') throw new AccessError(404, 'NOT_FOUND');
    if (request.headers.has('cookie') || request.headers.has('authorization')) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'credentials', code: 'no_credentials_accepted' }]);
    if (!origin) throw new AccessError(403, 'FORBIDDEN');
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new AccessError(400, 'VALIDATION_ERROR');
    let input: unknown;
    try { input = JSON.parse(await limitedBody(request, 4096) ?? ''); } catch { throw new AccessError(400, 'VALIDATION_ERROR'); }
    const value = schemas.CmpConsentSubmit.safeParse(input);
    if (!value.success) throw new AccessError(400, 'VALIDATION_ERROR', value.error.issues.slice(0, 16).map(i => ({ field: i.path.join('.').slice(0, 120), code: i.code })));
    let receipt: { receipt_id: string; recorded_at: Date };
    try {
      receipt = (await runtime().pool.query('SELECT * FROM app.cmp_record_consent($1,$2,$3,$4,$5,$6,$7)',
        [match[1], value.data.visitor_id, value.data.config_version, JSON.stringify(value.data.choices), value.data.gpc, value.data.language, origin])).rows[0];
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'P0002') throw new AccessError(404, 'NOT_FOUND');
      if (code === '42501') throw new AccessError(403, 'FORBIDDEN', [{ field: 'origin', code: 'origin_not_approved' }]);
      if (code === '22023') throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'choices', code: 'choices_do_not_match_the_banner' }]);
      if (code === '53400') throw new AccessError(503, 'SERVICE_UNAVAILABLE', [{ field: 'visitor_id', code: 'too_many_choices' }]);
      throw error;
    }
    return Response.json(schemas.CmpConsentReceipt.parse({ receipt_id: receipt.receipt_id, recorded_at: receipt.recorded_at.toISOString(), config_version: value.data.config_version }), { status: 201, headers: { 'X-Request-Id': requestId } });
  }, 'BUSINESS');
  // The approved origin may read the answer, including a refusal; any other origin may not.
  if (origin && match && KEY.test(match[1]!)) { const site = await published(match[1]!).catch(() => undefined); if (site?.origins.includes(origin)) for (const [k, v] of Object.entries(cors(origin))) response.headers.set(k, v); }
  return response;
}
