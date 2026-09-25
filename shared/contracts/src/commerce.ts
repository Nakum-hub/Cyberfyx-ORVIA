import { z } from 'zod';

/** Separate vendor-internal contract. Not mounted on customer /api/v1. */
export const COMMERCE_CONTRACT_VERSION = '0.2.0' as const;
const Id = z.uuid();
const Reference = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export const MinorUnits = z.number().int().min(0).max(1_000_000_000_000);
export const PaymentMethod = z.enum(['UPI', 'CARD']);
export const ProviderBinding = z.strictObject({
  provider: z.enum(['RAZORPAY']), merchant_id: Reference, mode: z.enum(['TEST', 'LIVE']),
});
export const CommercialContext = z.strictObject({ account_id: Id, actor_id: Id });
export const CommercialOrderCreate = z.strictObject({
  plan_version_id: Id, payment_method: PaymentMethod, idempotency_key: Id,
});
export const CommercialOrder = z.strictObject({
  id: Id, account_id: Id, plan_version_id: Id, payment_method: PaymentMethod,
  amount_minor: MinorUnits.refine(n => n > 0), currency: z.string().regex(/^[A-Z]{3}$/),
  terms_digest: z.string().regex(/^[a-f0-9]{64}$/),
  state: z.enum(['PENDING', 'FAILED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVIEW_REQUIRED']),
  provider_order_id: Reference.nullable(), created_at: z.iso.datetime(),
});
export const PaymentFact = z.strictObject({
  ...ProviderBinding.shape, event_id: Reference, provider_order_id: Reference,
  payment_id: Reference, kind: z.enum(['AUTHORIZED', 'FAILED', 'CAPTURED', 'REFUNDED']),
  method: PaymentMethod, amount_minor: MinorUnits.refine(n => n > 0),
  currency: z.string().regex(/^[A-Z]{3}$/), refunded_minor: MinorUnits,
  refund_id: Reference.nullable(),
  occurred_at: z.iso.datetime(),
}).refine(v => v.refunded_minor <= v.amount_minor, 'Refund cannot exceed payment')
  .refine(v => v.kind === 'REFUNDED' || v.refunded_minor === 0, 'Refund amount requires a refund fact')
  .refine(v => v.kind !== 'REFUNDED' || v.refunded_minor > 0, 'Refund fact needs an amount')
  .refine(v => (v.kind === 'REFUNDED') === (v.refund_id !== null), 'Processed refund needs its unique provider refund identity');
export type PaymentFactValue = z.infer<typeof PaymentFact>;
export type OrderValue = z.infer<typeof CommercialOrder>;

// Unknown fields (including card details and customer operational data) cannot
// enter the normalized ledger through these contracts.
export const CommerceResult = z.strictObject({
  order_id: Id, state: CommercialOrder.shape.state, duplicate: z.boolean(),
  issuance: z.enum(['NOT_QUEUED', 'READY', 'HELD', 'ISSUED', 'ISSUED_REVIEW_REQUIRED']),
});

export const CheckoutRequest = z.strictObject({
  ...ProviderBinding.shape, order_id: Id, amount_minor: MinorUnits.refine(n => n > 0),
  currency: z.string().regex(/^[A-Z]{3}$/), receipt: z.string().regex(/^orvia_[a-f0-9]{32}$/),
});
export const ProviderOrder = z.strictObject({
  ...CheckoutRequest.shape, provider_order_id: Reference,
});
