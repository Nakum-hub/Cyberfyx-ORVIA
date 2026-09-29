import { createHmac, timingSafeEqual } from 'node:crypto';
import { CheckoutRequest, ProviderOrder, RazorpayCallback as callback, RazorpayOrderId as orderId } from '../../../shared/contracts/src/commerce.ts';
import { CommerceError } from './payment.ts';

export type RazorpayConfig = Readonly<{ mode: 'TEST' | 'LIVE'; merchant_id: string; key_id: string; key_secret: string }>;
const checked = new WeakSet<object>();
export type RecoveredOrder = Readonly<ReturnType<typeof ProviderOrder.parse>>;
export type OrderReader = (request: ReturnType<typeof CheckoutRequest.parse>, providerOrderId: string) => Promise<RecoveredOrder>;
export function requireRecoveredOrder(value: RecoveredOrder) {
  if (!checked.has(value)) throw new CommerceError('PROVIDER_RECOVERY_NOT_CHECKED');
  return value;
}
function configuration(config: RazorpayConfig) {
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(config.key_id) ||
    !config.key_id.startsWith(config.mode === 'TEST' ? 'rzp_test_' : 'rzp_live_') || config.key_secret.length < 20)
    throw new CommerceError('CHECKOUT_KEY_CONFIGURATION');
  return `Basic ${Buffer.from(`${config.key_id}:${config.key_secret}`).toString('base64')}`;
}

/** Authenticity only: this result must never be treated as capture or fulfilment.
 * expectedOrderId comes from the account-scoped durable order, not browser input. */
export function razorpayCallbackVerifier(config: RazorpayConfig) {
  configuration(config);
  const secret = config.key_secret;
  return (expectedOrderId: string, input: unknown) => {
    orderId.parse(expectedOrderId);
    const value = callback.parse(input);
    const expected = createHmac('sha256', secret).update(`${expectedOrderId}|${value.razorpay_payment_id}`).digest();
    if (value.razorpay_order_id !== expectedOrderId || !timingSafeEqual(expected, Buffer.from(value.razorpay_signature, 'hex')))
      throw new CommerceError('CHECKOUT_SIGNATURE');
    return Object.freeze({ provider_order_id: expectedOrderId, payment_id: value.razorpay_payment_id,
      status: 'AUTHENTIC_CALLBACK_AWAITING_CAPTURE' as const });
  };
}

/** Fixed-destination GET for an operator-supplied candidate ID after a lost POST.
 * Receipt and monetary terms must match the persisted reservation. Even a paid
 * order only restores the binding; signed payment events control fulfilment. */
export function razorpayOrderReader(config: RazorpayConfig, fetcher: typeof fetch = fetch): OrderReader {
  const authorization = configuration(config);
  const mode = config.mode, merchant = config.merchant_id;
  return async (input, candidate) => {
    const request = CheckoutRequest.parse(input);
    const id = orderId.parse(candidate);
    if (request.mode !== mode || request.merchant_id !== merchant) throw new CommerceError('PROVIDER_BINDING_MISMATCH');
    const response = await fetcher(`https://api.razorpay.com/v1/orders/${id}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { authorization },
    });
    if (!response.ok) { await response.body?.cancel(); throw new CommerceError('CHECKOUT_PROVIDER_ERROR'); }
    const reader = response.body?.getReader();
    if (!reader) throw new CommerceError('CHECKOUT_PROVIDER_RESPONSE');
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 65536) throw new CommerceError('CHECKOUT_RESPONSE_SIZE');
        chunks.push(value);
      }
    } finally { await reader.cancel(); reader.releaseLock(); }
    let entity: Record<string, unknown>;
    try { entity = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new CommerceError('CHECKOUT_PROVIDER_RESPONSE'); }
    if (!entity || entity.entity !== 'order' || entity.id !== id ||
      !['created', 'attempted', 'paid'].includes(String(entity.status)) || entity.amount !== request.amount_minor ||
      entity.currency !== request.currency || entity.receipt !== request.receipt ||
      !Number.isSafeInteger(entity.amount_paid) || !Number.isSafeInteger(entity.amount_due) ||
      Number(entity.amount_paid) < 0 || Number(entity.amount_due) < 0 ||
      Number(entity.amount_paid) + Number(entity.amount_due) !== request.amount_minor ||
      (entity.status === 'paid' ? entity.amount_due !== 0 : entity.amount_paid !== 0))
      throw new CommerceError('CHECKOUT_ORDER_MISMATCH');
    const result = Object.freeze(ProviderOrder.parse({ ...request, provider_order_id: id }));
    checked.add(result); return result;
  };
}
