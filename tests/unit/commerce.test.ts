import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { CommercialOrderCreate, PaymentFact, type PaymentFactValue } from '../../shared/contracts/src/commerce.ts';
import { paymentStanding, razorpayVerifier, requireVerifiedPayment } from '../../backend/vendor/commerce/payment.ts';
import { razorpayCheckout, requireProviderOrder } from '../../backend/vendor/commerce/checkout.ts';

const secret = 'synthetic-webhook-secret-'.repeat(3);
const verify = razorpayVerifier({ merchant_id: 'acc_fixture', mode: 'TEST', secrets: [secret] });
const fact: PaymentFactValue = { provider:'RAZORPAY',merchant_id:'acc_fixture',mode:'TEST',event_id:'evt_fixture',provider_order_id:'order_fixture',
  payment_id:'pay_fixture',kind:'CAPTURED',method:'UPI',amount_minor:10000,currency:'INR',refunded_minor:0,refund_id:null,occurred_at:'2026-09-25T00:00:00.000Z' };
const order = { amount_minor:10000,currency:'INR',payment_method:'UPI' as const };
function payload() { return { account_id:'acc_fixture',event:'payment.captured',created_at:1790294400,
  payload:{payment:{entity:{entity:'payment',id:'pay_fixture',order_id:'order_fixture',method:'upi',status:'captured',captured:true,
    amount:10000,currency:'INR',email:'excluded@example.invalid',card:{last4:'0000'}}}} }; }
function signed(body = payload()) { const raw=Buffer.from(JSON.stringify(body)); return {raw,signature:createHmac('sha256',secret).update(raw).digest('hex')}; }

test('capture requires exact amount currency and method; authorization is not paid',()=>{
  assert.deepEqual(paymentStanding(order,[fact]),{state:'PAID',issue:true});
  assert.deepEqual(paymentStanding(order,[{...fact,kind:'AUTHORIZED'}]),{state:'PENDING',issue:false});
  for (const patch of [{amount_minor:9999},{currency:'USD'},{method:'CARD' as const}])
    assert.deepEqual(paymentStanding(order,[{...fact,...patch}]),{state:'REVIEW_REQUIRED',issue:false});
});
test('capture and stale failure fold identically in either delivery order',()=>{
  const failure={...fact,kind:'FAILED' as const,event_id:'evt_failure'};
  assert.deepEqual(paymentStanding(order,[fact,failure]),paymentStanding(order,[failure,fact]));
  assert.equal(paymentStanding(order,[fact,failure]).state,'PAID');
});
test('a separate authorized retry remains pending despite an older failed attempt',()=>{
  const failed={...fact,kind:'FAILED' as const};
  const retry={...fact,payment_id:'pay_retry',kind:'AUTHORIZED' as const};
  assert.deepEqual(paymentStanding(order,[failed,retry]),{state:'PENDING',issue:false});
  assert.deepEqual(paymentStanding(order,[retry,failed]),{state:'PENDING',issue:false});
  assert.deepEqual(paymentStanding(order,[{...failed,kind:'AUTHORIZED'},failed]),{state:'FAILED',issue:false});
});
test('refund before capture prevents issuance and duplicate processed refunds do not add twice',()=>{
  const refund={...fact,kind:'REFUNDED' as const,refunded_minor:10000,refund_id:'rfnd_fixture'};
  assert.deepEqual(paymentStanding(order,[refund]),{state:'REVIEW_REQUIRED',issue:false});
  assert.deepEqual(paymentStanding(order,[refund,fact]),{state:'REFUNDED',issue:false});
  assert.deepEqual(paymentStanding(order,[fact,refund,{...refund,event_id:'different_delivery'}]),{state:'REFUNDED',issue:false});
  assert.deepEqual(paymentStanding(order,[fact,{...refund,refunded_minor:100}]),{state:'PARTIALLY_REFUNDED',issue:false});
  assert.deepEqual(paymentStanding(order,[fact,{...refund,refunded_minor:100},{...refund,refund_id:'rfnd_second',refunded_minor:9900}]),{state:'REFUNDED',issue:false});
  assert.equal(paymentStanding(order,[fact,refund,{...refund,refunded_minor:100}]).state,'REVIEW_REQUIRED');
  assert.equal(paymentStanding(order,[fact,refund,{...refund,refund_id:'rfnd_second'}]).state,'REVIEW_REQUIRED');
});
test('multiple captures and contradictory payment identities require review',()=>{
  assert.equal(paymentStanding(order,[fact,{...fact,payment_id:'pay_second'}]).state,'REVIEW_REQUIRED');
  assert.equal(paymentStanding(order,[fact,{...fact,amount_minor:10}]).state,'REVIEW_REQUIRED');
  assert.equal(paymentStanding(order,[fact,{...fact,event_id:'another_delivery'}]).state,'PAID');
});
test('raw HMAC verification creates immutable minimum-data capability',()=>{
  const {raw,signature}=signed(); const result=verify(raw,signature,'evt_fixture');
  assert.equal(result.fact.kind,'CAPTURED');
  assert.equal(result.fact.method,'UPI');
  assert.equal(JSON.stringify(result).includes('excluded@'),false);
  assert.equal(JSON.stringify(result).includes('last4'),false);
  assert.equal(Object.isFrozen(result.fact),true);
  assert.equal(requireVerifiedPayment(result),result);
  assert.throws(()=>requireVerifiedPayment({...result}),/PAYMENT_NOT_VERIFIED/);
  assert.throws(()=>verify(Buffer.concat([raw,Buffer.from(' ')]),signature,'evt_fixture'),/WEBHOOK_SIGNATURE/);
});
test('bad signatures merchant body event and unsupported method are rejected',()=>{
  const {raw}=signed();
  for(const signature of ['', '0'.repeat(64),'a'.repeat(63)])assert.throws(()=>verify(raw,signature,'evt_fixture'),/WEBHOOK_SIGNATURE/);
  for(const change of [(b:ReturnType<typeof payload>)=>{b.account_id='acc_other';},
    (b:ReturnType<typeof payload>)=>{b.event='order.paid';},
    (b:ReturnType<typeof payload>)=>{b.payload.payment.entity.method='wallet';},
    (b:ReturnType<typeof payload>)=>{b.payload.payment.entity.captured=false;}]) {
    const body=payload();change(body);const s=signed(body);assert.throws(()=>verify(s.raw,s.signature,'evt_fixture'));
  }
});
test('bounded rotated key verifies an older delivery but wrong key does not',()=>{
  const rotated=razorpayVerifier({merchant_id:'acc_fixture',mode:'TEST',secrets:['new-secret-'.repeat(8),secret]});
  const {raw,signature}=signed();assert.equal(rotated(raw,signature,'evt_fixture').fact.mode,'TEST');
  assert.throws(()=>razorpayVerifier({merchant_id:'acc_fixture',mode:'TEST',secrets:['short']}),/WEBHOOK_KEY_CONFIGURATION/);
});
test('refund.processed uses distinct refund amount and identity, not snapshot cumulative total',()=>{
  const body={...payload(),event:'refund.processed',payload:{...payload().payload,refund:{entity:{entity:'refund',id:'rfnd_fixture',status:'processed',payment_id:'pay_fixture',currency:'INR',amount:100}}}};
  const raw=Buffer.from(JSON.stringify(body));const signature=createHmac('sha256',secret).update(raw).digest('hex');
  const result=verify(raw,signature,'evt_refund');
  assert.equal(result.fact.refund_id,'rfnd_fixture');assert.equal(result.fact.refunded_minor,100);
  for(const patch of [{event:'refund.created'},{event:'refund.failed'},{event:'payment.refunded'}]){
    const bytes=Buffer.from(JSON.stringify({...body,...patch}));
    assert.throws(()=>verify(bytes,createHmac('sha256',secret).update(bytes).digest('hex'),'evt_other'),/WEBHOOK_EVENT_UNSUPPORTED/);
  }
});
test('strict commercial contracts reject client prices card details and over-refunds',()=>{
  const input={plan_version_id:'00000000-0000-4000-8000-000000000001',payment_method:'CARD',idempotency_key:'00000000-0000-4000-8000-000000000002'};
  assert.equal(CommercialOrderCreate.safeParse(input).success,true);
  for(const extra of [{amount_minor:1},{card_number:'synthetic'},{account_id:'other'}])assert.equal(CommercialOrderCreate.safeParse({...input,...extra}).success,false);
  assert.equal(PaymentFact.safeParse({...fact,kind:'REFUNDED',refunded_minor:10001}).success,false);
});

const checkoutRequest={provider:'RAZORPAY' as const,mode:'TEST' as const,merchant_id:'acc_fixture',order_id:'00000000-0000-4000-8000-000000000001',
  amount_minor:10000,currency:'INR',receipt:'orvia_00000000000040008000000000000001'};
const config={mode:'TEST' as const,merchant_id:'acc_fixture',key_id:'rzp_test_fixture',key_secret:secret};
const providerResponse={entity:'order',status:'created',id:'order_fixture',amount:10000,currency:'INR',receipt:checkoutRequest.receipt,amount_paid:0,amount_due:10000};
test('checkout sends only server amount currency receipt to fixed HTTPS destination',async()=>{
  let calls=0;
  const transport=razorpayCheckout(config,async(url,options)=>{
    calls++;assert.equal(url,'https://api.razorpay.com/v1/orders');assert.equal(options?.redirect,'error');
    assert.deepEqual(JSON.parse(String(options?.body)),{amount:10000,currency:'INR',receipt:checkoutRequest.receipt,partial_payment:false});
    return Response.json(providerResponse);
  });
  const result=await transport(checkoutRequest);assert.equal(calls,1);assert.equal(result.provider_order_id,'order_fixture');
  assert.equal(requireProviderOrder(result),result);assert.throws(()=>requireProviderOrder({...result}),/PROVIDER_ORDER_NOT_CHECKED/);
});
test('checkout refuses mismatched provider order and does not retry failed transport',async()=>{
  for(const patch of [{amount:1},{currency:'USD'},{receipt:'other'},{status:'paid'},{amount_paid:1}]){
    const transport=razorpayCheckout(config,async()=>Response.json({...providerResponse,...patch}));
    await assert.rejects(()=>transport(checkoutRequest),/CHECKOUT_ORDER_MISMATCH/);
  }
  let calls=0;const failed=razorpayCheckout(config,async()=>{calls++;throw new Error('synthetic timeout');});
  await assert.rejects(()=>failed(checkoutRequest),/synthetic timeout/);assert.equal(calls,1);
});
test('checkout bounds response size and prevents test/live key confusion',async()=>{
  assert.throws(()=>razorpayCheckout({...config,mode:'LIVE'}),/CHECKOUT_KEY_CONFIGURATION/);
  const transport=razorpayCheckout(config,async()=>new Response('x'.repeat(65537)));
  await assert.rejects(()=>transport(checkoutRequest),/CHECKOUT_RESPONSE_SIZE/);
});
