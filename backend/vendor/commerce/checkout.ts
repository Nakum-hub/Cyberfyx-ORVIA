import { CheckoutRequest, ProviderOrder } from '../../../shared/contracts/src/commerce.ts';
import { CommerceError } from './payment.ts';

const responses=new WeakSet<object>();
export type CheckedProviderOrder=Readonly<ReturnType<typeof ProviderOrder.parse>>;
export type CheckoutTransport=(request:ReturnType<typeof CheckoutRequest.parse>)=>Promise<CheckedProviderOrder>;
export function requireProviderOrder(value:CheckedProviderOrder){
  if(!responses.has(value))throw new CommerceError('PROVIDER_ORDER_NOT_CHECKED');
  return value;
}

/** Vendor-only fixed-destination transport. Dependency injection is for tests;
 * there is no success fallback or customer-runtime caller. Never blindly retry
 * a POST whose effect is unknown. The store reserves work before calling this. */
export function razorpayCheckout(config:{mode:'TEST'|'LIVE';merchant_id:string;key_id:string;key_secret:string},
  fetcher:typeof fetch=fetch):CheckoutTransport {
  if(!config.key_id.startsWith(config.mode==='TEST'?'rzp_test_':'rzp_live_')||
    !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(config.key_id)||config.key_secret.length<20)
    throw new CommerceError('CHECKOUT_KEY_CONFIGURATION');
  const authorization=`Basic ${Buffer.from(`${config.key_id}:${config.key_secret}`).toString('base64')}`;
  const mode=config.mode,merchant=config.merchant_id;
  return async input=>{
    const request=CheckoutRequest.parse(input);
    if(request.provider!=='RAZORPAY'||request.mode!==mode||request.merchant_id!==merchant)
      throw new CommerceError('PROVIDER_BINDING_MISMATCH');
    const response=await fetcher('https://api.razorpay.com/v1/orders',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{authorization,'content-type':'application/json'},
      body:JSON.stringify({amount:request.amount_minor,currency:request.currency,receipt:request.receipt,partial_payment:false}),
    });
    if(!response.ok){await response.body?.cancel();throw new CommerceError('CHECKOUT_PROVIDER_ERROR');}
    const reader=response.body?.getReader();
    if(!reader)throw new CommerceError('CHECKOUT_PROVIDER_RESPONSE');
    let length=0;const chunks:Uint8Array[]=[];
    try{
      while(true){const {value,done}=await reader.read();if(done)break;
        length+=value.byteLength;if(length>65536)throw new CommerceError('CHECKOUT_RESPONSE_SIZE');chunks.push(value);}
    }finally{await reader.cancel();reader.releaseLock();}
    let entity:Record<string,unknown>;
    try{entity=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new CommerceError('CHECKOUT_PROVIDER_RESPONSE');}
    if(!entity||entity.entity!=='order'||entity.status!=='created'||entity.amount!==request.amount_minor||
      entity.currency!==request.currency||entity.receipt!==request.receipt||entity.amount_paid!==0||entity.amount_due!==request.amount_minor)
      throw new CommerceError('CHECKOUT_ORDER_MISMATCH');
    const result=Object.freeze(ProviderOrder.parse({...request,provider_order_id:entity.id}));
    responses.add(result);return result;
  };
}
