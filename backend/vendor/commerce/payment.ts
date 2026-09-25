import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentFact, ProviderBinding, type PaymentFactValue, type OrderValue } from '../../../shared/contracts/src/commerce.ts';

export class CommerceError extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'CommerceError'; }
}

/** Only this module can construct the verification capability. It is not a DTO
 * accepted from a browser or a deserialized queue payload. */
const verified = new WeakSet<object>();
export interface VerifiedPayment { readonly fact: Readonly<PaymentFactValue>; readonly body_digest: string }
export function requireVerifiedPayment(value: VerifiedPayment) {
  if (!verified.has(value)) throw new CommerceError('PAYMENT_NOT_VERIFIED');
  return value;
}

export function razorpayVerifier(input: {
  merchant_id: string; mode: 'TEST' | 'LIVE'; secrets: readonly string[];
}) {
  const binding = ProviderBinding.parse({ provider: 'RAZORPAY', merchant_id: input.merchant_id, mode: input.mode });
  if (!input.secrets.length || input.secrets.length > 2 || input.secrets.some(s => Buffer.byteLength(s) < 32))
    throw new CommerceError('WEBHOOK_KEY_CONFIGURATION');
  const secrets = [...input.secrets];
  return (raw: Buffer, signature: string, eventId: string): VerifiedPayment => {
    if (!Buffer.isBuffer(raw) || raw.length === 0 || raw.length > 262144) throw new CommerceError('WEBHOOK_SIZE');
    if (!/^[a-fA-F0-9]{64}$/.test(signature)) throw new CommerceError('WEBHOOK_SIGNATURE');
    const supplied = Buffer.from(signature, 'hex');
    let matched = false;
    for (const secret of secrets) {
      const expected = createHmac('sha256', secret).update(raw).digest();
      matched = timingSafeEqual(expected, supplied) || matched;
    }
    if (!matched) throw new CommerceError('WEBHOOK_SIGNATURE');
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw.toString('utf8')); } catch { throw new CommerceError('WEBHOOK_BODY'); }
    if (!body || typeof body !== 'object' || body.account_id !== binding.merchant_id) throw new CommerceError('WEBHOOK_MERCHANT');
    const kinds: Record<string, PaymentFactValue['kind']> = {
      'payment.authorized': 'AUTHORIZED', 'payment.failed': 'FAILED',
      'payment.captured': 'CAPTURED', 'refund.processed': 'REFUNDED',
    };
    const kind = typeof body.event === 'string' ? kinds[body.event] : undefined;
    if (!kind) throw new CommerceError('WEBHOOK_EVENT_UNSUPPORTED');
    const payment = (body.payload as { payment?: { entity?: Record<string, unknown> } } | undefined)?.payment?.entity;
    if (!payment || payment.entity !== 'payment') throw new CommerceError('WEBHOOK_PAYMENT');
    const method = payment.method === 'upi' ? 'UPI' : payment.method === 'card' ? 'CARD' : null;
    const refund=(body.payload as {refund?:{entity?:Record<string,unknown>}}|undefined)?.refund?.entity;
    const expectedStatus = { AUTHORIZED: 'authorized', FAILED: 'failed', CAPTURED: 'captured', REFUNDED: 'refunded' }[kind];
    const validStatus=kind==='REFUNDED'?['captured','refunded'].includes(String(payment.status)):payment.status===expectedStatus;
    if (!validStatus || (['CAPTURED','REFUNDED'].includes(kind) && payment.captured !== true))
      throw new CommerceError('WEBHOOK_PAYMENT_STATE');
    if(kind==='REFUNDED'&&(!refund||refund.entity!=='refund'||refund.status!=='processed'||refund.payment_id!==payment.id||refund.currency!==payment.currency))
      throw new CommerceError('WEBHOOK_REFUND_STATE');
    if (typeof body.created_at !== 'number' || !Number.isSafeInteger(body.created_at) || body.created_at < 0 || body.created_at > 253402300799)
      throw new CommerceError('WEBHOOK_TIME');
    // Retain normalized minimum commercial fields only. Raw payload may contain
    // contact/card metadata; never log or persist it.
    const fact = Object.freeze(PaymentFact.parse({ ...binding, event_id: eventId,
      provider_order_id: payment.order_id, payment_id: payment.id, kind, method,
      amount_minor: payment.amount, currency: payment.currency,
      refunded_minor: kind === 'REFUNDED' ? refund?.amount : 0,
      refund_id:kind==='REFUNDED'?refund?.id:null,
      occurred_at: new Date(body.created_at * 1000).toISOString(),
    }));
    const result = Object.freeze({ fact, body_digest: createHash('sha256').update(raw).digest('hex') });
    verified.add(result);
    return result;
  };
}

/** Fold verified immutable facts, not delivery order or browser status. A failed
 * attempt never overwrites a captured attempt; reversals prevent new issuance. */
export function paymentStanding(order: Pick<OrderValue, 'amount_minor' | 'currency' | 'payment_method'>, facts: readonly PaymentFactValue[]) {
  const payments = new Map<string, { captured: boolean; authorized: boolean; failed: boolean; refunds:Map<string,number>; amount: number; currency: string; method: string }>();
  let conflict = false;
  for (const input of facts) {
    const fact = PaymentFact.parse(input);
    const current = payments.get(fact.payment_id) ?? { captured: false, authorized: false, failed: false, refunds:new Map<string,number>(), amount: fact.amount_minor, currency: fact.currency, method: fact.method };
    if (current.amount !== fact.amount_minor || current.currency !== fact.currency || current.method !== fact.method) conflict = true;
    if (fact.kind === 'CAPTURED') current.captured = true;
    if (fact.kind === 'AUTHORIZED') current.authorized = true;
    if (fact.kind === 'FAILED') current.failed = true;
    if (fact.kind === 'REFUNDED') {
      const prior=current.refunds.get(fact.refund_id!);
      if(prior!==undefined&&prior!==fact.refunded_minor)conflict=true;
      current.refunds.set(fact.refund_id!,fact.refunded_minor);
    }
    payments.set(fact.payment_id, current);
  }
  const totals=[...payments.values()].map(p=>({...p,refunded:[...p.refunds.values()].reduce((a,b)=>a+b,0)}));
  const captures = totals.filter(p => p.captured);
  const reversal = totals.some(p => p.refunded > 0);
  const unmatchedRefund = totals.some(p => p.refunded > 0 && !p.captured);
  if (conflict || unmatchedRefund || captures.length > 1 || totals.some(p => p.refunded>p.amount ||
    p.amount !== order.amount_minor || p.currency !== order.currency || p.method !== order.payment_method))
    return { state: 'REVIEW_REQUIRED' as const, issue: false };
  if (captures.length === 1) {
    const capture = captures[0]!;
    if (reversal) return { state: capture.refunded === capture.amount ? 'REFUNDED' as const : 'PARTIALLY_REFUNDED' as const, issue: false };
    return { state: 'PAID' as const, issue: true };
  }
  const activeAttempt = [...payments.values()].some(p => p.authorized && !p.failed);
  return { state: !activeAttempt && facts.some(f => f.kind === 'FAILED') ? 'FAILED' as const : 'PENDING' as const, issue: false };
}
