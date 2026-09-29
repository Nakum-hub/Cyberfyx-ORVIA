import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { commerceHandler } from '../../backend/vendor/commerce/http.ts';
import type { CommerceStore } from '../../backend/vendor/commerce/store.ts';
import { requireVerifiedPayment, type VerifiedPayment } from '../../backend/vendor/commerce/payment.ts';

const origin = 'https://vendor.example.invalid';
const id = '00000000-0000-4000-8000-000000000001';
const secret = 'synthetic-secret-'.repeat(4);
const config = { mode: 'TEST' as const, merchant_id: 'acc_fixture', key_id: 'rzp_test_fixture', key_secret: secret, webhook_secrets: [secret] };
function fixture(loggedIn = true) {
  const calls: string[] = [];
  const store = {
    async createOrder(context: unknown, body: unknown) { calls.push('create'); return { context, body }; },
    async readOrder() { calls.push('read'); return { id, provider_order_id: 'order_fixture', state: 'PENDING' }; },
    async readLicence(context: unknown) { calls.push('licence'); return { fixture: true, context }; },
    async applyPayment(input: VerifiedPayment) { requireVerifiedPayment(input); calls.push('payment'); return { duplicate: false }; },
  } as unknown as CommerceStore;
  return { calls, handle: commerceHandler({ origin, store, config,
    authenticate: async () => loggedIn ? { account_id: id, actor_id: id } : null,
    fetcher: async () => { throw new Error('No actual provider access in unit tests'); } }) };
}
function post(path: string, body: string, headers: Record<string, string> = {}) {
  return new Request(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body });
}
test('vendor HTTP requires session and rejects cross-origin mutations before store access', async () => {
  const f = fixture(false);
  assert.equal((await f.handle(post('/vendor/api/orders', '{}'))).status, 401);
  const logged = fixture();
  assert.equal((await logged.handle(post('/vendor/api/orders', '{}', { origin: 'https://other.invalid' }))).status, 403);
  assert.deepEqual(f.calls, []); assert.deepEqual(logged.calls, []);
});
test('vendor HTTP rejects malformed media, JSON and oversized payloads', async () => {
  const f = fixture();
  assert.equal((await f.handle(post('/vendor/api/orders', '{}', { 'content-type': 'text/plain' }))).status, 415);
  assert.equal((await f.handle(post('/vendor/api/orders', '{'))).status, 400);
  assert.equal((await f.handle(post('/vendor/api/orders', 'x'.repeat(8193)))).status, 413);
  assert.deepEqual(f.calls, []);
});

test('licence download requires vendor session and stays non-cacheable', async () => {
  const path = `${origin}/vendor/api/orders/${id}/licence`;
  const anonymous = fixture(false);
  assert.equal((await anonymous.handle(new Request(path))).status, 401);
  assert.deepEqual(anonymous.calls, []);
  const authenticated = fixture();
  const response = await authenticated.handle(new Request(path));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await response.json()).licence.context, { account_id: id, actor_id: id });
  assert.deepEqual(authenticated.calls, ['licence']);
  const rejected = await authenticated.handle(post(`/vendor/api/orders/${id}/licence`, '{}'));
  assert.equal(rejected.status, 400);
  assert.deepEqual(authenticated.calls, ['licence'], 'No signing or claim mutation endpoint');
});
test('callback uses stored provider order and never invokes payment ingestion', async () => {
  const f = fixture();
  const body = JSON.stringify({ razorpay_order_id: 'order_fixture', razorpay_payment_id: 'pay_fixture',
    razorpay_signature: createHmac('sha256', secret).update('order_fixture|pay_fixture').digest('hex') });
  const response = await f.handle(post(`/vendor/api/orders/${id}/callback`, body));
  assert.equal(response.status, 200); assert.equal((await response.json()).status, 'AUTHENTIC_CALLBACK_AWAITING_CAPTURE');
  assert.deepEqual(f.calls, ['read']); assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('webhook is signature-authenticated over unchanged raw bytes without session', async () => {
  const f = fixture(false);
  const body = JSON.stringify({ account_id: 'acc_fixture', event: 'payment.captured', created_at: 1790294400,
    payload: { payment: { entity: { entity: 'payment', id: 'pay_fixture', order_id: 'order_fixture', method: 'upi', status: 'captured', captured: true, amount: 10000, currency: 'INR' } } } });
  const headers = { 'x-razorpay-signature': createHmac('sha256', secret).update(body).digest('hex'), 'x-razorpay-event-id': 'evt_fixture' };
  const result = await f.handle(post('/vendor/api/razorpay/webhook', body, headers));
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { received: true, duplicate: false });
  assert.equal((await f.handle(post('/vendor/api/razorpay/webhook', body + ' ', headers))).status, 400);
  assert.deepEqual(f.calls, ['payment']);
});
test('vendor routes reject wrong hosts query strings and methods', async () => {
  const f = fixture();
  for (const request of [new Request(`https://other.invalid/vendor/api/orders/${id}`),
    new Request(`${origin}/vendor/api/orders/${id}?account_id=other`),
    new Request(`${origin}/vendor/api/orders/${id}`, { method: 'DELETE' })])
    assert.equal((await f.handle(request)).status, 404);
  assert.deepEqual(f.calls, []);
});
