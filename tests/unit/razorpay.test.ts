import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { razorpayCallbackVerifier, razorpayOrderReader, requireRecoveredOrder } from '../../backend/vendor/commerce/razorpay.ts';

const config = { mode: 'TEST' as const, merchant_id: 'acc_fixture', key_id: 'rzp_test_fixture', key_secret: 'synthetic-api-secret-'.repeat(3) };
const request = { provider: 'RAZORPAY' as const, mode: 'TEST' as const, merchant_id: config.merchant_id,
  order_id: '00000000-0000-4000-8000-000000000001', amount_minor: 10000, currency: 'INR', receipt: 'orvia_00000000000040008000000000000001' };
const entity = { entity: 'order', id: 'order_fixture', status: 'created', amount: 10000, currency: 'INR', receipt: request.receipt, amount_paid: 0, amount_due: 10000 };
function signed(order = 'order_fixture') {
  return { razorpay_order_id: order, razorpay_payment_id: 'pay_fixture',
    razorpay_signature: createHmac('sha256', config.key_secret).update(`${order}|pay_fixture`).digest('hex') };
}
test('callback authenticates stored order and never claims capture', () => {
  const verify = razorpayCallbackVerifier(config);
  assert.equal(verify('order_fixture', signed()).status, 'AUTHENTIC_CALLBACK_AWAITING_CAPTURE');
  assert.throws(() => verify('order_other', signed()), /CHECKOUT_SIGNATURE/);
  assert.throws(() => verify('order_fixture', signed('order_other')), /CHECKOUT_SIGNATURE/);
  assert.throws(() => verify('order_fixture', { ...signed(), razorpay_payment_id: 'pay_other' }), /CHECKOUT_SIGNATURE/);
  assert.throws(() => verify('order_fixture', { ...signed(), amount: 1 }));
});
test('callback rejects malformed signatures and wrong key environment', () => {
  for (const signature of ['', 'x'.repeat(64), '0'.repeat(64)])
    assert.throws(() => razorpayCallbackVerifier(config)('order_fixture', { ...signed(), razorpay_signature: signature }));
  assert.throws(() => razorpayCallbackVerifier({ ...config, mode: 'LIVE' }), /CHECKOUT_KEY_CONFIGURATION/);
});
test('recovery uses fixed authenticated GET and brands immutable checked result', async () => {
  const read = razorpayOrderReader(config, async (url, init) => {
    assert.equal(url, 'https://api.razorpay.com/v1/orders/order_fixture');
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error'); assert.equal(init?.body, undefined);
    assert.equal(new Headers(init?.headers).get('authorization'), `Basic ${Buffer.from(`${config.key_id}:${config.key_secret}`).toString('base64')}`);
    return Response.json(entity);
  });
  const result = await read(request, entity.id);
  assert.equal(requireRecoveredOrder(result), result); assert.equal(Object.isFrozen(result), true);
  assert.throws(() => requireRecoveredOrder({ ...result }), /PROVIDER_RECOVERY_NOT_CHECKED/);
});
test('paid and attempted recovery restore identity without fabricating payment facts', async () => {
  for (const patch of [{ status: 'attempted' }, { status: 'paid', amount_paid: 10000, amount_due: 0 }]) {
    const result = await razorpayOrderReader(config, async () => Response.json({ ...entity, ...patch }))(request, entity.id);
    assert.equal(result.provider_order_id, entity.id); assert.equal('state' in result, false); assert.equal('fact' in result, false);
  }
});
test('recovery rejects wrong receipt amount currency identity and inconsistent payment totals', async () => {
  for (const patch of [{ receipt: 'other' }, { amount: 1 }, { currency: 'USD' }, { id: 'order_other' },
    { amount_paid: -1, amount_due: 10001 }, { amount_paid: '0' }, { status: 'paid' }, { amount_due: 0 }, { status: 'refunded' }])
    await assert.rejects(() => razorpayOrderReader(config, async () => Response.json({ ...entity, ...patch }))(request, entity.id), /CHECKOUT_ORDER_MISMATCH/);
});
test('recovery rejects unsafe IDs and wrong merchant before network access', async () => {
  let calls = 0; const read = razorpayOrderReader(config, async () => { calls++; return Response.json(entity); });
  for (const id of ['https://example.invalid', '../order', 'order_x?secret=1']) await assert.rejects(() => read(request, id));
  await assert.rejects(() => read({ ...request, merchant_id: 'acc_other' }, entity.id), /PROVIDER_BINDING_MISMATCH/);
  assert.equal(calls, 0);
});
test('recovery bounds responses and does not retry provider failures', async () => {
  await assert.rejects(() => razorpayOrderReader(config, async () => new Response('x'.repeat(65537)))(request, entity.id), /CHECKOUT_RESPONSE_SIZE/);
  await assert.rejects(() => razorpayOrderReader(config, async () => new Response('invalid'))(request, entity.id), /CHECKOUT_PROVIDER_RESPONSE/);
  let calls = 0;
  await assert.rejects(() => razorpayOrderReader(config, async () => { calls++; return new Response('', { status: 503 }); })(request, entity.id), /CHECKOUT_PROVIDER_ERROR/);
  assert.equal(calls, 1);
});
