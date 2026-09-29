import { CommercialContext, CommercialOrder, RazorpayOrderId } from '../../../shared/contracts/src/commerce.ts';
import { CommerceError } from './payment.ts';
import { razorpayCommerce } from './service.ts';
import type { CommerceStore } from './store.ts';
import type { RazorpayConfig } from './razorpay.ts';

type Context = ReturnType<typeof CommercialContext.parse>;
async function bytes(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = []; let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new CommerceError('BODY_TIMEOUT')), 10000); });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]); if (done) break;
      size += value.byteLength; if (size > limit) throw new CommerceError('BODY_TOO_LARGE'); chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { clearTimeout(timer); await reader.cancel(); reader.releaseLock(); }
}
const json = (value: unknown, status = 200) => Response.json(value, { status,
  headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });

/** Mount on the separate vendor site only. authenticate MUST resolve a durable
 * vendor session (including MFA policy), never trust account/actor headers.
 * No default authenticator or development identity fallback is provided. */
export function commerceHandler(options: {
  origin: string; store: CommerceStore; config: RazorpayConfig & { webhook_secrets: string[] };
  authenticate: (request: Request) => Promise<Context | null>; fetcher?: typeof fetch;
}) {
  const origin = new URL(options.origin);
  if (origin.protocol !== 'https:' || origin.origin !== options.origin) throw new CommerceError('VENDOR_ORIGIN_CONFIGURATION');
  const service = razorpayCommerce(options.store, options.config, options.fetcher);
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (url.origin !== origin.origin || url.search) return json({ error: 'NOT_FOUND' }, 404);
      if (url.pathname === '/vendor/api/razorpay/webhook' && request.method === 'POST') {
        const result = await service.webhook(await bytes(request, 262144), request.headers.get('x-razorpay-signature') ?? '',
          request.headers.get('x-razorpay-event-id') ?? '');
        // Do not return account/order details to the provider.
        return json({ received: true, duplicate: result.duplicate });
      }
      const match = /^\/vendor\/api\/orders(?:\/([a-f0-9-]{36})(?:\/(checkout|callback|reconcile|licence))?)?$/.exec(url.pathname);
      if (!match || !['GET', 'POST'].includes(request.method)) return json({ error: 'NOT_FOUND' }, 404);
      if (request.method === 'POST' && request.headers.get('origin') !== origin.origin) return json({ error: 'ORIGIN_REQUIRED' }, 403);
      const session = await options.authenticate(request);
      if (!session) return json({ error: 'AUTHENTICATION_REQUIRED' }, 401);
      const context = CommercialContext.parse(session);
      const id = match[1] ? CommercialOrder.shape.id.parse(match[1]) : null;
      if (request.method === 'GET') {
        if (id && match[2] === 'licence') return json({ licence: await options.store.readLicence(context, id) });
        return id && !match[2] ? json(await options.store.readOrder(context, id)) : json({ error: 'NOT_FOUND' }, 404);
      }
      if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return json({ error: 'JSON_REQUIRED' }, 415);
      const raw = await bytes(request, 8192);
      let body: unknown;
      try { body = JSON.parse(raw.toString('utf8')); } catch { return json({ error: 'INVALID_JSON' }, 400); }
      if (!id) return json(await options.store.createOrder(context, body), 201);
      if (match[2] === 'callback') return json(await service.callback(context, id, body));
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'INVALID_REQUEST' }, 400);
      if (match[2] === 'checkout' && Object.keys(body).length === 0) return json(await service.checkout(context, id));
      if (match[2] === 'reconcile' && Object.keys(body).length === 1 && 'provider_order_id' in body)
        return json(await service.reconcile(context, id, RazorpayOrderId.parse(body.provider_order_id)));
      return json({ error: 'INVALID_REQUEST' }, 400);
    } catch (error) {
      if (error instanceof CommerceError) {
        const code = error.code;
        const status = code === 'FORBIDDEN' ? 403 : code === 'NOT_FOUND' ? 404 : code === 'BODY_TOO_LARGE' ? 413 :
          /SIGNATURE|WEBHOOK_|BODY_TIMEOUT/.test(code) ? 400 : 409;
        return json({ error: code }, status);
      }
      if (error instanceof Error && error.name === 'ZodError') return json({ error: 'INVALID_REQUEST' }, 400);
      // Provider/network/SQL exception text can contain credentials or values.
      return json({ error: 'COMMERCE_UNAVAILABLE' }, 503);
    }
  };
}
