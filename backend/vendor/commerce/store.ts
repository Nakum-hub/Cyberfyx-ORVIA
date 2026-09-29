import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto';
import { LicenceClaims, SignedLicence } from '../../../shared/contracts/src/index.ts';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import type { VendorKey } from '../licensing/issue.ts';
import { CheckoutRequest, CommercialContext, CommercialLicenceReview, CommercialOrder, CommercialOrderCreate, CommerceResult, PaymentFact, ProviderBinding } from '../../../shared/contracts/src/commerce.ts';
import { CommerceError, paymentStanding, requireVerifiedPayment, type VerifiedPayment } from './payment.ts';
import { requireProviderOrder, type CheckoutTransport } from './checkout.ts';
import { requireRecoveredOrder, type OrderReader } from './razorpay.ts';

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
 * vendor identity service; the separate Fetch handler requires that binding.
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
      if (boundary.boundary !== 'VENDOR_COMMERCIAL_ONLY' || boundary.schema_version !== 3 || boundary.customer_schema !== null)
        throw new CommerceError('VENDOR_DATABASE_BOUNDARY');
      const result = await run(tx);
      await tx.query('COMMIT');
      return result;
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally { tx.release(); }
  }

  private async authorize(tx: SqlClient, input: AccountContext, capability: 'ORDER_READ' | 'ORDER_CREATE' | 'LICENCE_PREPARE' | 'LICENCE_APPROVE' | 'LICENCE_ISSUE') {
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

  private async fulfilmentOrder(tx: SqlClient, context: AccountContext, id: string) {
    CommercialOrder.shape.id.parse(id);
    // Same order lock as payment/refund ingestion. No network call under lock.
    return one((await tx.query('SELECT * FROM vendor.orders WHERE account_id=$1 AND id=$2 FOR UPDATE', [context.account_id, id])).rows);
  }

  private async readyToIssue(tx: SqlClient, order: Record<string, unknown>) {
    if (order.provider !== this.binding.provider || order.merchant_id !== this.binding.merchant_id || order.mode !== this.binding.mode)
      throw new CommerceError('PROVIDER_BINDING_MISMATCH');
    const outbox = (await tx.query('SELECT state FROM vendor.entitlement_outbox WHERE order_id=$1 FOR UPDATE', [order.id])).rows[0];
    if (order.state !== 'PAID' || outbox?.state !== 'READY') throw new CommerceError('LICENCE_NOT_PAYABLE');
  }

  /** Manually reviewed fulfilment: no tier/edition/term is inferred from price.
   * The authenticated vendor preparer supplies the commercial claim snapshot;
   * an independent reviewer must approve its exact order-bound digest. */
  async prepareLicence(context: AccountContext, id: string, input: unknown) {
    const claims = LicenceClaims.parse(input);
    return this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'LICENCE_PREPARE');
      const order = await this.fulfilmentOrder(tx, actor, id);
      const digest = createHash('sha256').update(canonicalJson({ order_id: id, account_id: actor.account_id,
        plan_version_id: order.plan_version_id, terms_digest: order.terms_digest, claims })).digest('hex');
      const previous = (await tx.query('SELECT digest FROM vendor.licence_requests WHERE order_id=$1', [id])).rows[0];
      if (previous) {
        if (previous.digest !== digest) throw new CommerceError('LICENCE_REQUEST_CONFLICT');
        return { order_id: id, digest };
      }
      await this.readyToIssue(tx, order);
      if (Date.parse(claims.valid_to) <= Date.now()) throw new CommerceError('LICENCE_EXPIRED');
      await tx.query('INSERT INTO vendor.licence_requests(order_id,licence_id,claims,digest,prepared_by) VALUES($1,$2,$3,$4,$5)',
        [id, claims.licence_id, claims, digest, actor.actor_id]);
      await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'licence.prepare',$3)", [actor.account_id, actor.actor_id, id]);
      return { order_id: id, digest };
    });
  }

  async approveLicence(context: AccountContext, id: string, digest: string) {
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new CommerceError('LICENCE_APPROVAL_MISMATCH');
    return this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'LICENCE_APPROVE');
      const order = await this.fulfilmentOrder(tx, actor, id);
      const request = one((await tx.query('SELECT * FROM vendor.licence_requests WHERE order_id=$1', [id])).rows);
      if (request.prepared_by === actor.actor_id) throw new CommerceError('INDEPENDENT_REVIEW_REQUIRED');
      if (request.digest !== digest) throw new CommerceError('LICENCE_APPROVAL_MISMATCH');
      await this.readyToIssue(tx, order);
      const added = await tx.query('INSERT INTO vendor.licence_approvals(order_id,digest,approved_by) VALUES($1,$2,$3) ON CONFLICT(order_id) DO NOTHING', [id, digest, actor.actor_id]);
      if (added.rowCount) await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'licence.approve',$3)", [actor.account_id, actor.actor_id, id]);
      return { order_id: id, digest };
    });
  }

  async reviewLicence(context: AccountContext, id: string) {
    return this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'LICENCE_APPROVE');
      const order = await this.fulfilmentOrder(tx, actor, id);
      const request = one((await tx.query(`SELECT r.*,a.approved_by FROM vendor.licence_requests r
        LEFT JOIN vendor.licence_approvals a ON a.order_id=r.order_id WHERE r.order_id=$1`, [id])).rows);
      await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'licence.review',$3)", [actor.account_id, actor.actor_id, id]);
      return CommercialLicenceReview.parse({ order_id: id, plan_version_id: order.plan_version_id, terms_digest: order.terms_digest,
        digest: request.digest, claims: request.claims, prepared_by: request.prepared_by, approved_by: request.approved_by });
    });
  }

  /** Trusted vendor service call only; signing keys never come from HTTP input.
   * Local Ed25519 signing and document/outbox/audit persistence share one tx.
   * After a lost COMMIT response, retry returns the same durable document. */
  async issueApprovedLicence(context: AccountContext, id: string, key: VendorKey) {
    return this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'LICENCE_ISSUE');
      const order = await this.fulfilmentOrder(tx, actor, id);
      const previous = (await tx.query('SELECT document FROM vendor.issued_licences WHERE order_id=$1', [id])).rows[0];
      if (previous) return SignedLicence.parse(previous.document);
      await this.readyToIssue(tx, order);
      const request = one((await tx.query(`SELECT r.* FROM vendor.licence_requests r JOIN vendor.licence_approvals a
        ON a.order_id=r.order_id AND a.digest=r.digest AND a.approved_by<>r.prepared_by WHERE r.order_id=$1`, [id])).rows);
      const claims = LicenceClaims.parse(request.claims);
      if (Date.parse(claims.valid_to) <= Date.now()) throw new CommerceError('LICENCE_EXPIRED');
      const privateKey = createPrivateKey({ key: Buffer.from(key.private, 'base64'), format: 'der', type: 'pkcs8' });
      if (privateKey.asymmetricKeyType !== 'ed25519') throw new CommerceError('LICENCE_SIGNING_KEY');
      const licence = SignedLicence.parse({ algorithm: 'Ed25519', claims, signing_key_id: key.key_id,
        signature: sign(null, Buffer.from(canonicalJson(claims)), privateKey).toString('base64url') });
      await tx.query('INSERT INTO vendor.issued_licences(order_id,licence_id,document,digest,issued_by) VALUES($1,$2,$3,$4,$5)',
        [id, claims.licence_id, licence, createHash('sha256').update(canonicalJson(licence)).digest('hex'), actor.actor_id]);
      await tx.query("UPDATE vendor.entitlement_outbox SET state='ISSUED' WHERE order_id=$1", [id]);
      await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'licence.issue',$3)", [actor.account_id, actor.actor_id, id]);
      return licence;
    });
  }

  async readLicence(context: AccountContext, id: string) {
    return this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'ORDER_READ');
      await this.fulfilmentOrder(tx, actor, id);
      const row = one((await tx.query('SELECT document FROM vendor.issued_licences WHERE order_id=$1', [id])).rows);
      await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'licence.download',$3)", [actor.account_id, actor.actor_id, id]);
      return SignedLicence.parse(row.document);
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

  async reconcileCheckout(context: AccountContext, id: string, candidate: string, reader: OrderReader) {
    CommercialOrder.shape.id.parse(id);
    const request = await this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'ORDER_CREATE');
      const row = one((await tx.query('SELECT * FROM vendor.orders WHERE account_id=$1 AND id=$2', [actor.account_id, id])).rows);
      if (row.provider_order_id !== null) throw new CommerceError('PROVIDER_ORDER_CONFLICT');
      const attempt = one((await tx.query('SELECT state,request FROM vendor.checkout_attempts WHERE order_id=$1', [id])).rows);
      if (!['STARTED', 'UNKNOWN'].includes(String(attempt.state))) throw new CommerceError('CHECKOUT_RECOVERY_STATE');
      const value = CheckoutRequest.parse(attempt.request);
      if (value.order_id !== id || value.amount_minor !== Number(row.amount_minor) || value.currency !== row.currency ||
        value.provider !== this.binding.provider || value.mode !== this.binding.mode || value.merchant_id !== this.binding.merchant_id)
        throw new CommerceError('PROVIDER_BINDING_MISMATCH');
      return Object.freeze(value);
    });
    const response = requireRecoveredOrder(await reader(request, candidate));
    for (const key of ['provider', 'merchant_id', 'mode', 'order_id', 'amount_minor', 'currency', 'receipt'] as const)
      if (response[key] !== request[key]) throw new CommerceError('CHECKOUT_ORDER_MISMATCH');
    if (response.provider_order_id !== candidate) throw new CommerceError('CHECKOUT_ORDER_MISMATCH');
    return this.transaction(async tx => {
      const actor = await this.authorize(tx, context, 'ORDER_CREATE');
      const row = one((await tx.query('SELECT * FROM vendor.orders WHERE account_id=$1 AND id=$2 FOR UPDATE', [actor.account_id, id])).rows);
      if (row.provider_order_id !== null) throw new CommerceError('PROVIDER_ORDER_CONFLICT');
      const updated = await tx.query(`UPDATE vendor.orders SET provider=$3,merchant_id=$4,mode=$5,provider_order_id=$6
        WHERE account_id=$1 AND id=$2 RETURNING *`, [actor.account_id, id, request.provider, request.merchant_id, request.mode, candidate]);
      const attempt = await tx.query("UPDATE vendor.checkout_attempts SET state='BOUND',completed_at=clock_timestamp() WHERE order_id=$1 AND state IN ('STARTED','UNKNOWN')", [id]);
      if (attempt.rowCount !== 1) throw new CommerceError('CHECKOUT_RECOVERY_STATE');
      await tx.query("INSERT INTO vendor.audit(account_id,actor_id,action,order_id) VALUES($1,$2,'checkout.reconciled',$3)", [actor.account_id, actor.actor_id, id]);
      return orderDocument(one(updated.rows));
    });
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
