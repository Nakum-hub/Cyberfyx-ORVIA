import { CommercialOrder } from '../../../shared/contracts/src/commerce.ts';
import { razorpayCheckout } from './checkout.ts';
import { CommerceError, razorpayVerifier } from './payment.ts';
import { razorpayCallbackVerifier, razorpayOrderReader, type RazorpayConfig } from './razorpay.ts';
import type { CommerceStore } from './store.ts';

/** Vendor-only composition. Context must come from vendor session authentication;
 * store membership checks remain mandatory. Never mount in customer-local API. */
export function razorpayCommerce(store: CommerceStore, config: RazorpayConfig & { webhook_secrets: string[] }, fetcher: typeof fetch = fetch) {
  const checkout = razorpayCheckout(config, fetcher);
  const read = razorpayOrderReader(config, fetcher);
  const callback = razorpayCallbackVerifier(config);
  const webhook = razorpayVerifier({ merchant_id: config.merchant_id, mode: config.mode, secrets: config.webhook_secrets });
  const publicKey = config.key_id;
  return {
    async checkout(context: { account_id: string; actor_id: string }, orderId: string) {
      const order = await store.checkout(context, orderId, checkout);
      return Object.freeze({ key: publicKey, order_id: order.provider_order_id!, amount: order.amount_minor,
        currency: order.currency, payment_method: order.payment_method });
    },
    async callback(context: { account_id: string; actor_id: string }, orderId: string, input: unknown) {
      const order = await store.readOrder(context, CommercialOrder.shape.id.parse(orderId));
      if (!order.provider_order_id) throw new CommerceError('CHECKOUT_ORDER_NOT_BOUND');
      const authentic = callback(order.provider_order_id, input);
      // readOrder already records access. Neither signatures nor UI callbacks
      // write payment state or enqueue issuance; only verified events do that.
      return { ...authentic, order_state: order.state };
    },
    reconcile(context: { account_id: string; actor_id: string }, orderId: string, candidate: string) {
      return store.reconcileCheckout(context, orderId, candidate, read);
    },
    webhook(rawBody: Buffer, signature: string, eventId: string) {
      return store.applyPayment(webhook(rawBody, signature, eventId));
    },
  };
}
