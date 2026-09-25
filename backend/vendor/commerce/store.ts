import { createHash, randomUUID } from 'node:crypto';
import { CheckoutRequest, CommercialContext, CommercialOrder, CommercialOrderCreate, CommerceResult, PaymentFact, ProviderBinding } from '../../../shared/contracts/src/commerce.ts';
import { CommerceError, paymentStanding, requireVerifiedPayment, type VerifiedPayment } from './payment.ts';
import { requireProviderOrder, type CheckoutTransport } from './checkout.ts';

export interface SqlClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  release(): void;
}
export interface SqlPool { connect(): Promise<SqlClient> }
type AccountContext = { account_id: string; actor_id: string };

function one(rows: Record<string, unknown>[]) {
  if (!rows[0]) throw new CommerceError('NOT_FOUND');
  return rows[0];
}
function orderDocument(row: Record<string, unknown>) {
  return CommercialOrder.parse({
    id: row.id, account_id: row.account_id, plan_version_id: row.plan_version_id,
    payment_method: row.payment_method, amount_minor: Number(row.amount_minor), currency: row.currency,
    terms_digest: row.terms_digest, state: row.state, provider_order_id: row.provider_order_id,
    created_at: (row.created_at as Date).toISOString(),
  });
}

/** Vendor-only application service. Callers must obtain actor_id from the
 * vendor identity service; no HTTP route currently exposes this module.
 * Every account operation additionally checks persisted membership here. */
export class CommerceStore {
  private readonly binding;
  constructor(private readonly pool: SqlPool, binding: unknown) { this.binding = ProviderBinding.parse(binding); }

  private async transaction<T>(run: (tx: SqlClient) => Promise<T>): Promise<T> {
    const tx = await this.pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query("SET LOCAL statement_timeout='10s'");
      await tx.query("SET LOCAL lock_timeout='5s'");
      const boundary = one((await tx.query(`SELECT boundary,schema_version,to_regnamespace('app') AS customer_schema FROM vendor.installation WHERE singleton=1`)).rows);
      if (boundary.boundary !== 'VENDOR_COMMERCIAL_ONLY' || boundary.schema_version !== 2 || boundary.customer_schema !== null)
        throw new CommerceError('VENDOR_DATABASE_BOUNDARY');
      const result = await run(tx);
      await tx.query('COMMIT');
      return result;
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally { tx.release(); }
  }

  private async authorize(tx: SqlClient, input: AccountContext, capability: 'ORDER_READ' | 'ORDER_CREATE') {
    const context = CommercialContext.parse(input);
    const access = await tx.query(`SELECT a.id FROM vendor.accounts a JOIN vendor.memberships m ON m.account_id=a.id
      WHERE a.id=$1 AND m.actor_id=$2 AND m.capability=$3 AND a.state='ACTIVE' FOR SHARE OF a,m`,
    [context.account_id, context.actor_id, capability]);
    if (!access.rowCount) throw new CommerceError('FORBIDDEN');
    return context;
  }

  async createOrder(context: AccountContext, input: unknown) {
    const request = CommercialOrderCreate.parse(input);
    return this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'ORDER_CREATE');
      const requestDigest = createHash('sha256').update(JSON.stringify([request.plan_version_id, request.payment_method])).digest('hex');
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`commerce-order:${actor.account_id}:${request.idempotency_key}`]);
      const previous = (await tx.query('SELECT * FROM vendor.orders WHERE account_id=$1 AND idempotency_key=$2', [actor.account_id, request.idempotency_key])).rows[0];
      if (previous) {
        if (previous.request_digest !== requestDigest) throw new CommerceError('IDEMPOTENCY_CONFLICT');
        return orderDocument(previous);
      }
      const plan = one((await tx.query("SELECT * FROM vendor.plan_versions WHERE id=$1 AND state='APPROVED' FOR SHARE", [request.plan_version_id])).rows);
      const id = randomUUID();
      const result = await tx.query(`INSERT INTO vendor.orders(id,account_id,plan_version_id,payment_method,amount_minor,currency,terms_digest,idempotency_key,request_digest,state)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING') RETURNING *`,
      [id, actor.account_id, request.plan_version_id, request.payment_method, plan.amount_minor, plan.currency, plan.terms_digest, request.idempotency_key, requestDigest]);
      await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'order.create',$3)", [actor.account_id, actor.actor_id, id]);
      return orderDocument(one(result.rows));
    });
  }

  async readOrder(context: AccountContext, id: string) {
    CommercialOrder.shape.id.parse(id);
    return this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'ORDER_READ');
      const row = one((await tx.query('SELECT * FROM vendor.orders WHERE account_id=$1 AND id=$2', [actor.account_id, id])).rows);
      await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'order.read',$3)", [actor.account_id, actor.actor_id, id]);
      return orderDocument(row);
    });
  }

  /** Durable reservation precedes the external request. Concurrent callers and
   * restart after a lost response cannot create a second provider order. */
  async checkout(context: AccountContext, id: string, transport: CheckoutTransport) {
    CommercialOrder.shape.id.parse(id);
    const prepared=await this.transaction(async tx=>{
      const actor = await this.authorize(tx, context, 'ORDER_CREATE');
      const row = one((await tx.query('SELECT * FROM vendor.orders WHERE account_id=$1 AND id=$2 FOR UPDATE', [actor.account_id, id])).rows);
      const b = this.binding;
      if (row.provider_order_id !== null) {
        if (row.provider !== b.provider || row.merchant_id !== b.merchant_id || row.mode !== b.mode)
          throw new CommerceError('PROVIDER_ORDER_CONFLICT');
        if(row.state!=='PENDING')throw new CommerceError('CHECKOUT_ORDER_NOT_PENDING');
        return {order:orderDocument(row),request:null};
      }
      if((await tx.query('SELECT state FROM vendor.checkout_attempts WHERE order_id=$1',[id])).rowCount)
        throw new CommerceError('CHECKOUT_EFFECT_UNKNOWN');
      const request=CheckoutRequest.parse({...b,order_id:id,amount_minor:Number(row.amount_minor),currency:row.currency,receipt:`orvia_${id.replaceAll('-','')}`});
      await tx.query("INSERT INTO vendor.checkout_attempts(order_id,state,request) VALUES($1,'STARTED',$2)",[id,request]);
      await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'checkout.started',$3)",[actor.account_id,actor.actor_id,id]);
      return {order:orderDocument(row),request};
    });
    if(!prepared.request)return prepared.order;
    Object.freeze(prepared.request);
    try{
      const response=requireProviderOrder(await transport(prepared.request));
      for(const key of ['provider','merchant_id','mode','order_id','amount_minor','currency','receipt'] as const)
        if(response[key]!==prepared.request[key])throw new CommerceError('CHECKOUT_ORDER_MISMATCH');
      return await this.transaction(async tx=>{
        const actor=await this.authorize(tx,context,'ORDER_CREATE');
        const row=one((await tx.query('SELECT * FROM vendor.orders WHERE account_id=$1 AND id=$2 FOR UPDATE',[actor.account_id,id])).rows);
        if(row.provider_order_id!==null)throw new CommerceError('PROVIDER_ORDER_CONFLICT');
        const b=this.binding;
        const result=await tx.query(`UPDATE vendor.orders SET provider=$3,merchant_id=$4,mode=$5,provider_order_id=$6 WHERE account_id=$1 AND id=$2 RETURNING *`,
          [actor.account_id,id,b.provider,b.merchant_id,b.mode,response.provider_order_id]);
        await tx.query("UPDATE vendor.checkout_attempts SET state='BOUND',completed_at=clock_timestamp() WHERE order_id=$1",[id]);
        await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'checkout.bound',$3)",[actor.account_id,actor.actor_id,id]);
        return orderDocument(one(result.rows));
      });
    }catch{
      await this.transaction(async tx=>{
        await tx.query("UPDATE vendor.checkout_attempts SET state='UNKNOWN' WHERE order_id=$1 AND state='STARTED'",[id]);
        await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,NULL,'checkout.effect_unknown',$2)",[prepared.order.account_id,id]);
      });
      throw new CommerceError('CHECKOUT_EFFECT_UNKNOWN');
    }
  }

  async applyPayment(input: VerifiedPayment) {
    const { fact, body_digest } = requireVerifiedPayment(input);
    const b = this.binding;
    if (fact.provider !== b.provider || fact.merchant_id !== b.merchant_id || fact.mode !== b.mode) throw new CommerceError('PROVIDER_BINDING_MISMATCH');
    return this.transaction(async tx => {
      const scope = [b.provider, b.merchant_id, b.mode];
      // Fixed lock order: event, payment, then order. Independent orders do not
      // share a merchant-wide mutex; duplicate events and reused payments do.
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`commerce-event:${scope.join(':')}:${fact.event_id}`]);
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`commerce-payment:${scope.join(':')}:${fact.payment_id}`]);
      const row = one((await tx.query(`SELECT * FROM vendor.orders WHERE provider=$1 AND merchant_id=$2 AND mode=$3 AND provider_order_id=$4 FOR UPDATE`, [...scope, fact.provider_order_id])).rows);
      const previous = (await tx.query(`SELECT body_digest,order_id FROM vendor.payment_events WHERE provider=$1 AND merchant_id=$2 AND mode=$3 AND event_id=$4`, [...scope, fact.event_id])).rows[0];
      if (previous && (previous.body_digest !== body_digest || previous.order_id !== row.id)) throw new CommerceError('PROVIDER_EVENT_CONFLICT');
      if (!previous) {
        const payment = (await tx.query(`SELECT order_id FROM vendor.payment_bindings WHERE provider=$1 AND merchant_id=$2 AND mode=$3 AND payment_id=$4`, [...scope, fact.payment_id])).rows[0];
        if (payment && payment.order_id !== row.id) throw new CommerceError('PAYMENT_ORDER_CONFLICT');
        if (!payment) await tx.query('INSERT INTO vendor.payment_bindings(provider,merchant_id,mode,payment_id,order_id) VALUES($1,$2,$3,$4,$5)', [...scope, fact.payment_id, row.id]);
        await tx.query('INSERT INTO vendor.payment_events(provider,merchant_id,mode,event_id,order_id,body_digest,fact) VALUES($1,$2,$3,$4,$5,$6,$7)', [...scope, fact.event_id, row.id, body_digest, fact]);
      }
      const events = await tx.query('SELECT fact FROM vendor.payment_events WHERE order_id=$1 LIMIT 10001', [row.id]);
      if (events.rows.length > 10000) throw new CommerceError('PAYMENT_RECONCILIATION_LIMIT');
      const standing = paymentStanding(orderDocument(row), events.rows.map(r => PaymentFact.parse(r.fact)));
      await tx.query('UPDATE vendor.orders SET state=$2 WHERE id=$1', [row.id, standing.state]);
      if (standing.issue) {
        await tx.query("INSERT INTO vendor.entitlement_outbox(order_id,state) VALUES($1,'READY') ON CONFLICT(order_id) DO NOTHING", [row.id]);
      } else {
        await tx.query(`UPDATE vendor.entitlement_outbox SET state=CASE WHEN state IN ('ISSUED','ISSUED_REVIEW_REQUIRED') THEN 'ISSUED_REVIEW_REQUIRED' ELSE 'HELD' END WHERE order_id=$1`, [row.id]);
      }
      // A previously held issuance is not automatically reactivated by later
      // events. A reviewed reconciliation policy is a separate future action.
      const issuance = (await tx.query('SELECT state FROM vendor.entitlement_outbox WHERE order_id=$1', [row.id])).rows[0]?.state ?? 'NOT_QUEUED';
      if (!previous) await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,NULL,'payment.verified_event',$2)", [row.account_id, row.id]);
      return CommerceResult.parse({ order_id: row.id, state: standing.state, duplicate: !!previous,
        issuance });
    });
  }
}
