import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { CommerceStore } from '../../../backend/vendor/commerce/store.ts';
import { razorpayVerifier } from '../../../backend/vendor/commerce/payment.ts';
import { razorpayCheckout } from '../../../backend/vendor/commerce/checkout.ts';

// Own database, no customer tables/migrations, roles/grants, runtime restarts,
// external requests, real purchases or shared result files.
const profile = loadProfile('codex-a00');
const runId = randomUUID();
const database = `orvia_vendor_test_${runId.replaceAll('-', '')}`;
const artifact = `handoffs/codex/artifacts/V1-EXPANSION-01-commerce-${runId}.json`;
const assertions: {name:string;result:'PASS'|'FAIL'}[]=[];
const bootstrap=connectDatabase({...profile,database:'postgres'}).pool;
let pool:ReturnType<typeof connectDatabase>['pool']|undefined;
let phase='create isolated vendor database';
function check(name:string,actual:unknown,expected:unknown){
  try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS'});console.log(`PASS ${name}`);}
  catch{assertions.push({name,result:'FAIL'});throw new Error(`Assertion failed: ${name}`);}
}
async function rejected(name:string,run:()=>Promise<unknown>,code:string){
  let actual='ACCEPTED';try{await run();}catch(error){actual=(error as {code?:string}).code??'UNKNOWN';}
  check(name,actual,code);
}
const binding={provider:'RAZORPAY',merchant_id:'acc_synthetic',mode:'TEST'} as const;
const secret='synthetic-secret-'.repeat(4);
const verify=razorpayVerifier({...binding,secrets:[secret]});
const checkoutConfig={mode:'TEST' as const,merchant_id:binding.merchant_id,key_id:'rzp_test_synthetic',key_secret:secret};
let providerCreates=0;
const transport=razorpayCheckout(checkoutConfig,async (_url,options)=>{
  providerCreates++;
  const body=JSON.parse(String(options?.body));
  return Response.json({entity:'order',status:'created',id:`order_${randomUUID().replaceAll('-','')}`,
    amount:body.amount,currency:body.currency,receipt:body.receipt,amount_paid:0,amount_due:body.amount});
});
function event(orderId:string, kind='captured', paymentId=`pay_${randomUUID().replaceAll('-','')}`, options:{eventId?:string;amount?:number;refund?:number;method?:string}={}) {
  const body={account_id:binding.merchant_id,event:kind==='refunded'?'refund.processed':`payment.${kind}`,created_at:1790294400,
    payload:{payment:{entity:{entity:'payment',id:paymentId,order_id:orderId,status:kind==='refunded'?'captured':kind,captured:kind==='captured'||kind==='refunded',
      method:options.method??'upi',amount:options.amount??10000,currency:'INR',amount_refunded:options.refund??0}},
    ...(kind==='refunded'?{refund:{entity:{entity:'refund',id:`rfnd_${paymentId}_${options.refund}`,status:'processed',payment_id:paymentId,currency:'INR',amount:options.refund}}}:{})}};
  const raw=Buffer.from(JSON.stringify(body));
  return verify(raw,createHmac('sha256',secret).update(raw).digest('hex'),options.eventId??`evt_${randomUUID().replaceAll('-','')}`);
}
try{
  if(!/^orvia_vendor_test_[a-f0-9]{32}$/.test(database))throw new Error('Invalid isolated database identifier');
  await bootstrap.query(`CREATE DATABASE "${database}"`);
  await bootstrap.end();
  pool=connectDatabase({...profile,database}).pool;
  const migration=readFileSync('database/vendor/migrations/0001_commerce.sql','utf8');
  await pool.query(migration);
  const checkoutMigration=readFileSync('database/vendor/migrations/0002_checkout_attempts.sql','utf8');
  await pool.query(checkoutMigration);
  const account=randomUUID(),actor=randomUUID(),otherAccount=randomUUID(),otherActor=randomUUID(),plan=randomUUID();
  await pool.query("INSERT INTO vendor.accounts VALUES($1,'ACTIVE'),($2,'ACTIVE')",[account,otherAccount]);
  await pool.query("INSERT INTO vendor.memberships VALUES($1,$2,'ORDER_CREATE'),($1,$2,'ORDER_READ'),($3,$4,'ORDER_READ')",[account,actor,otherAccount,otherActor]);
  await pool.query("INSERT INTO vendor.plan_versions VALUES($1,10000,'INR',$2,$3,$4,'APPROVED')",[plan,'a'.repeat(64),actor,otherActor]);
  const context={account_id:account,actor_id:actor};
  let store=new CommerceStore(pool,binding);
  const create=async(method:'UPI'|'CARD'='UPI')=>{
    const order=await store.createOrder(context,{plan_version_id:plan,payment_method:method,idempotency_key:randomUUID()});
    const bound=await store.checkout(context,order.id,transport);return {order,providerId:bound.provider_order_id!};
  };
  phase='orders and account isolation';
  const input={plan_version_id:plan,payment_method:'UPI',idempotency_key:randomUUID()};
  const [a,b]=await Promise.all([store.createOrder(context,input),store.createOrder(context,input)]);
  check('concurrent identical order creates one durable order',a.id,b.id);
  check('price comes from approved server catalogue',a.amount_minor,10000);
  await rejected('changed idempotency body rejected',()=>store.createOrder(context,{...input,payment_method:'CARD'}),'IDEMPOTENCY_CONFLICT');
  await rejected('cross-account read denied',()=>store.readOrder({account_id:otherAccount,actor_id:otherActor},a.id),'NOT_FOUND');
  await rejected('forged account authority denied',()=>store.readOrder({account_id:account,actor_id:otherActor},a.id),'FORBIDDEN');
  await rejected('read-only buyer cannot create',()=>store.createOrder({account_id:otherAccount,actor_id:otherActor},input),'FORBIDDEN');
  check('no entitlement before a verified capture',(await pool.query('SELECT count(*)::int AS n FROM vendor.entitlement_outbox')).rows[0].n,0);
  phase='verified payment';
  const providerId=(await store.checkout(context,a.id,transport)).provider_order_id!;
  const beforeRetry=providerCreates;
  check('repeated pending checkout retains provider binding',(await store.checkout(context,a.id,transport)).provider_order_id,providerId);
  check('repeated checkout does not create another provider order',providerCreates,beforeRetry);
  const capture=event(providerId);
  const results=await Promise.all([store.applyPayment(capture),store.applyPayment(capture)]);
  check('concurrent capture yields exactly one original receipt',results.filter(r=>!r.duplicate).length,1);
  check('one entitlement request per order',(await pool.query('SELECT count(*)::int AS n FROM vendor.entitlement_outbox WHERE order_id=$1',[a.id])).rows[0].n,1);
  check('verified capture queues but does not issue licence',results[0]?.issuance,'READY');
  await rejected('paid order cannot start another checkout',()=>store.checkout(context,a.id,transport),'CHECKOUT_ORDER_NOT_PENDING');
  await rejected('plain object cannot impersonate verified provider',()=>store.applyPayment({...capture}),'PAYMENT_NOT_VERIFIED');
  await rejected('same provider event ID with changed body rejected',()=>store.applyPayment(event(providerId,'captured',capture.fact.payment_id,{eventId:capture.fact.event_id,amount:9999})),'PROVIDER_EVENT_CONFLICT');
  check('stale failure cannot downgrade captured order',(await store.applyPayment(event(providerId,'failed',capture.fact.payment_id))).state,'PAID');
  check('different delivery ID does not duplicate issuance',(await store.applyPayment(event(providerId,'captured',capture.fact.payment_id))).issuance,'READY');
  const reused=await create();
  await rejected('one provider payment cannot pay two orders',()=>store.applyPayment(event(reused.providerId,'captured',capture.fact.payment_id)),'PAYMENT_ORDER_CONFLICT');
  const mismatch=await create();
  check('underpayment retained as review required',(await store.applyPayment(event(mismatch.providerId,'captured',undefined,{amount:9999}))).state,'REVIEW_REQUIRED');
  check('underpayment never queues entitlement',(await pool.query('SELECT count(*)::int AS n FROM vendor.entitlement_outbox WHERE order_id=$1',[mismatch.order.id])).rows[0].n,0);
  phase='independent order concurrency';
  const locked=await create(),independent=await create();
  const blockerPool=connectDatabase({...profile,database}).pool;
  const blocker=await blockerPool.connect();
  let pending:Promise<unknown>|undefined;
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM vendor.orders WHERE id=$1 FOR UPDATE',[locked.order.id]);
    pending=store.applyPayment(event(locked.providerId));
    // Keep rejection handled even if an unrelated assertion throws first.
    void pending.catch(()=>{});
    const deadline=Date.now()+4000;
    let waiting=false;
    while(Date.now()<deadline){
      const blocked=await blocker.query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND cardinality(pg_blocking_pids(pid))>0) AS waiting`);
      if(blocked.rows[0].waiting){waiting=true;break;}
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    check('fixture holds a payment on its own order lock',waiting,true);
    check('unrelated order can capture while first order is locked',(await store.applyPayment(event(independent.providerId))).state,'PAID');
    await blocker.query('COMMIT');
    await pending;
  }finally{await blocker.query('ROLLBACK');blocker.release();await pending?.catch(()=>{});await blockerPool.end();}
  const card=await create('CARD');
  check('card capture uses same verified durable path',(await store.applyPayment(event(card.providerId,'captured',undefined,{method:'card'}))).state,'PAID');
  const wrongMode=new CommerceStore(pool,{...binding,mode:'LIVE'});
  await rejected('test event cannot credit live merchant binding',()=>wrongMode.applyPayment(capture),'PROVIDER_BINDING_MISMATCH');
  phase='refund and out of order';
  const early=await create(),earlyPay='pay_early_refund';
  check('refund received before capture remains unresolved',(await store.applyPayment(event(early.providerId,'refunded',earlyPay,{refund:10000}))).state,'REVIEW_REQUIRED');
  const earlyResult=await store.applyPayment(event(early.providerId,'captured',earlyPay));
  check('late capture does not undo refund',[earlyResult.state,earlyResult.issuance],['REFUNDED','NOT_QUEUED']);
  const reversal=await store.applyPayment(event(providerId,'refunded',capture.fact.payment_id,{refund:100}));
  check('partial refund holds pending issuance',[reversal.state,reversal.issuance],['PARTIALLY_REFUNDED','HELD']);
  // Explicit fixture-only issued state models the future signer completion.
  await pool.query("UPDATE vendor.entitlement_outbox SET state='ISSUED' WHERE order_id=$1",[card.order.id]);
  const cardPayment=(await pool.query('SELECT fact FROM vendor.payment_events WHERE order_id=$1',[card.order.id])).rows[0].fact.payment_id as string;
  const afterIssue=await store.applyPayment(event(card.providerId,'refunded',cardPayment,{method:'card',refund:10000}));
  check('refund after fixture issuance requires review without remote command',afterIssue.issuance,'ISSUED_REVIEW_REQUIRED');
  phase='unknown checkout effect';
  const unknown=await store.createOrder(context,{plan_version_id:plan,payment_method:'UPI',idempotency_key:randomUUID()});
  let lostRequests=0;
  const lost=razorpayCheckout(checkoutConfig,async()=>{lostRequests++;throw new Error('Synthetic connection lost after provider effect');});
  await rejected('lost checkout response is unknown',()=>store.checkout(context,unknown.id,lost),'CHECKOUT_EFFECT_UNKNOWN');
  await rejected('unknown checkout cannot be blindly retried',()=>store.checkout(context,unknown.id,lost),'CHECKOUT_EFFECT_UNKNOWN');
  check('lost provider create called only once',lostRequests,1);
  check('unknown checkout effect is durable',(await pool.query('SELECT state FROM vendor.checkout_attempts WHERE order_id=$1',[unknown.id])).rows[0].state,'UNKNOWN');
  const concurrent=await store.createOrder(context,{plan_version_id:plan,payment_method:'CARD',idempotency_key:randomUUID()});
  let release!:()=>void,started!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;}),arrival=new Promise<void>(resolve=>{started=resolve;});
  let concurrentCalls=0;
  const delayed=razorpayCheckout(checkoutConfig,async(_url,options)=>{
    concurrentCalls++;started();await gate;
    const request=JSON.parse(String(options?.body));
    return Response.json({entity:'order',status:'created',id:'order_concurrent_checkout',amount:request.amount,
      amount_due:request.amount,amount_paid:0,currency:request.currency,receipt:request.receipt});
  });
  const firstCheckout=store.checkout(context,concurrent.id,delayed);
  try{await Promise.race([arrival,firstCheckout.then(()=>{throw new Error('Checkout completed before response release');})]);await rejected('in-flight checkout is not sent twice',()=>store.checkout(context,concurrent.id,delayed),'CHECKOUT_EFFECT_UNKNOWN');}
  finally{release();}
  await firstCheckout;check('concurrent checkout sends one provider request',concurrentCalls,1);
  phase='atomic rollback';
  const rollback=await create();
  await pool.query(`CREATE FUNCTION vendor.fixture_fail_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.order_id='${rollback.order.id}'::uuid THEN RAISE EXCEPTION 'synthetic persistence fault' USING ERRCODE='23514'; END IF;
    RETURN NEW; END $$`);
  await pool.query('CREATE TRIGGER fixture_outbox_fault BEFORE INSERT ON vendor.entitlement_outbox FOR EACH ROW EXECUTE FUNCTION vendor.fixture_fail_outbox()');
  await rejected('outbox persistence failure aborts payment transaction',()=>store.applyPayment(event(rollback.providerId)),'23514');
  check('failed transaction leaves no payment receipt',(await pool.query('SELECT count(*)::int AS n FROM vendor.payment_events WHERE order_id=$1',[rollback.order.id])).rows[0].n,0);
  check('failed transaction preserves pending order',(await store.readOrder(context,rollback.order.id)).state,'PENDING');
  phase='immutable history and restart';
  await rejected('payment ledger cannot be rewritten',()=>pool!.query('UPDATE vendor.payment_events SET body_digest=$1 WHERE order_id=$2',['b'.repeat(64),a.id]),'23514');
  await rejected('audit cannot be erased',()=>pool!.query('DELETE FROM vendor.audit WHERE order_id=$1',[a.id]),'23514');
  await pool.end();pool=connectDatabase({...profile,database}).pool;store=new CommerceStore(pool,binding);
  check('restart retains payment state',(await store.readOrder(context,a.id)).state,'PARTIALLY_REFUNDED');
  check('restart replay retains held entitlement',(await store.applyPayment(capture)).issuance,'HELD');
  await rejected('restart retains unknown checkout without resending',()=>store.checkout(context,unknown.id,lost),'CHECKOUT_EFFECT_UNKNOWN');
  check('restart did not repeat unknown provider request',lostRequests,1);
  check('vendor database contains no customer operational schema',(await pool.query("SELECT to_regnamespace('app') AS customer_schema")).rows[0].customer_schema,null);
  const guard=await pool.connect();
  try {
    await guard.query('BEGIN');await guard.query('CREATE SCHEMA app');
    await rejected('vendor migration refuses customer schema sentinel',()=>guard.query(migration),'42501');
  }finally{await guard.query('ROLLBACK');guard.release();}
  writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-01',recorded_at:new Date().toISOString(),fixture_kind:'ISOLATED_SYNTHETIC_VENDOR_DATABASE',database,
    result:'PASS',assertions,migration_sha256:createHash('sha256').update(migration).digest('hex'),checkout_migration_sha256:createHash('sha256').update(checkoutMigration).digest('hex'),
    source_sha256:Object.fromEntries(['backend/vendor/commerce/store.ts','backend/vendor/commerce/payment.ts','backend/vendor/commerce/checkout.ts','shared/contracts/src/commerce.ts','tests/integration/commerce/commerce.test.ts'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
    limitations:['No HTTP/vendor login or actual payment provider used; checkout transport uses explicit injected synthetic responses.','No licence issued; one outbox row set to ISSUED by labelled fixture only.','Operator identity used in isolated test database; production role deployment not qualified.']},null,2));
  console.log(`Artifact: ${artifact}`);
}catch(error){
  const message=error instanceof Error?error.message:'';
  const failureCategory=/timeout/i.test(message)?'TIMEOUT':message.startsWith('Assertion failed:')?'ASSERTION':'OTHER';
  writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-01',recorded_at:new Date().toISOString(),fixture_kind:'ISOLATED_SYNTHETIC_VENDOR_DATABASE',database,
    result:'FAIL',phase,assertions,error:{name:error instanceof Error?error.name:'Error',code:String((error as {code?:string}).code??'UNCLASSIFIED'),category:failureCategory,message_sha256:createHash('sha256').update(message).digest('hex')}},null,2));
  console.error(`FAIL ${phase}; artifact: ${artifact}`);process.exitCode=1;
}finally{await pool?.end();await bootstrap.end().catch(()=>{});}
