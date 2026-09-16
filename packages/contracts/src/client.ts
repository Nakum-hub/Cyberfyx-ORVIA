import { routes, schemas } from './index.ts';
import type { EndpointMap } from '../generated/endpoint-types.ts';
export class ApiError extends Error {
  constructor(public readonly status:number,public readonly envelope:ReturnType<typeof schemas.ErrorResponse.parse>){super(envelope.error.message);}
}
/** Browser transport only: no automatic write retry, no cached authority, no machine token. */
export function createClient(fetcher:typeof fetch=fetch){
  return {async call<K extends keyof EndpointMap>(operation:K,input:EndpointMap[K]['request'],options:{params?:Record<string,string>;cursor?:string;limit?:number;idempotency_key?:string;signal?:AbortSignal}={}):Promise<EndpointMap[K]['response']>{
    const route=routes.find(r=>r.id===operation);
    if(!route||route.authority==='MACHINE')throw new Error('Unknown browser operation');
    if(route.request)schemas[route.request].parse(input);
    if(route.params)schemas[route.params].parse(options.params);
    if(route.paginated)schemas.Pagination.parse({cursor:options.cursor,limit:options.limit});
    if(route.idempotency&&!/^[A-Za-z0-9_-]{16,128}$/.test(options.idempotency_key??''))throw new Error('Valid Idempotency-Key required');
    const path=route.path.replace(/\{([^}]+)\}/g,(_,key:string)=>encodeURIComponent(options.params?.[key]??''));
    const query=new URLSearchParams();
    if(options.cursor)query.set('cursor',options.cursor);
    if(options.limit)query.set('limit',String(options.limit));
    const headers:Record<string,string>={'Accept':'application/json'};
    if(route.request)headers['Content-Type']='application/json';
    if(route.idempotency)headers['Idempotency-Key']=options.idempotency_key!;
    const response=await fetcher(`${path}${query.size?'?'+query.toString():''}`,{method:route.method.toUpperCase(),credentials:'same-origin',cache:'no-store',headers,body:route.request?JSON.stringify(input):undefined,signal:options.signal});
    const result:unknown=await response.json();
    if(!response.ok)throw new ApiError(response.status,schemas.ErrorResponse.parse(result));
    return schemas[route.response].parse(result) as EndpointMap[K]['response'];
  }};
}
