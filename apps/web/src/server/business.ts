import { routes, schemas, Pagination, Id, PolicyReauthenticate, type RouteDefinition } from '../../../../packages/contracts/src/index.ts';
import { authorityFor, requireCapability, AccessError } from '../../../../packages/authz/src/index.ts';
import { limitedBody, authHandler } from '../../../../packages/auth/src/server.ts';
import { scopedTransaction } from '../../../../packages/db/src/runtime.ts';
import { audit, idempotent, type Page } from '../../../../packages/domain/src/transaction.ts';
import { configurationList, createConfiguration, createMapping, mappingList, controlMap, publishPolicy, recordPublicationProof, publicationCandidate, type ConfigurationKind } from '../../../../packages/domain/src/configuration.ts';
import { ownChoices, changeConsent, ownReceipt, ownHistory } from '../../../../packages/domain/src/consent.ts';
import { readWorkflow,workflowList } from '../../../../packages/domain/src/workflow.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';

const implemented=new Set(['list_purposes','create_purposes','list_notices','create_notices','list_policies','create_policies','list_systems','create_systems','publish_policy','reauthenticate_policy','create_mapping','list_mappings','control_map','own_consents','own_receipt','own_history','grant','withdraw','workflows','workflow']);
function resolveRoute(request: Request) {
  const path=new URL(request.url).pathname;const parts=path.split('/');
  for(const route of routes) {
    if(route.method.toUpperCase()!==request.method||!implemented.has(route.id))continue;
    const template=route.path.split('/');if(parts.length!==template.length)continue;
    let id: string|undefined;let matches=true;
    template.forEach((part,i)=>{if(part.startsWith('{'))id=parts[i];else if(parts[i]!==part)matches=false;});
    if(matches) {if(id&&!Id.safeParse(id).success)throw new AccessError(400,'VALIDATION_ERROR');return {route,id};}
  }
  throw new AccessError(404,'NOT_FOUND');
}
function pagination(request: Request, route: RouteDefinition): Page {
  const params=new URL(request.url).searchParams;
  if([...params.keys()].some(key=>!route.paginated||!['cursor','limit'].includes(key))||params.getAll('cursor').length>1||params.getAll('limit').length>1)throw new AccessError(400,'VALIDATION_ERROR');
  const parsed=Pagination.safeParse({...params.has('cursor')?{cursor:params.get('cursor')}:{},...params.has('limit')?{limit:Number(params.get('limit'))}:{}});
  if(!parsed.success)throw new AccessError(400,'VALIDATION_ERROR');
  const cursor=parsed.data.cursor?Buffer.from(parsed.data.cursor,'base64url').toString('utf8'):null;
  if(cursor&&!Id.safeParse(cursor).success)throw new AccessError(400,'VALIDATION_ERROR');
  return {limit:parsed.data.limit,cursor};
}
export function businessRoute(request: Request) { return safeRoute(async requestId=>{
  const {route,id}=resolveRoute(request);const r=runtime();const actor=await authorityFor(request,r.staff,r.principal);
  const domain=route.authority==='PRINCIPAL'?'PRINCIPAL':'STAFF';
  await requireCapability(r.config,actor,domain,route.capability!);
  const page=pagination(request,route);let input: unknown=undefined;
  if(request.method==='POST') {
    if(request.headers.get('origin')!==r.config.origin)throw new AccessError(403,'FORBIDDEN');
    if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new AccessError(400,'VALIDATION_ERROR');
    try {input=JSON.parse(await limitedBody(request,16384)??'');}catch{throw new AccessError(400,'VALIDATION_ERROR');}
    if(route.request) {
      const parsed=schemas[route.request].safeParse(input);
      if(!parsed.success)throw new AccessError(400,'VALIDATION_ERROR',parsed.error.issues.slice(0,32).map(issue=>({field:issue.path.join('.').slice(0,120),code:issue.code})));
      input=parsed.data;
    }
  }
  const key=request.headers.get('idempotency-key');
  if(route.idempotency&&(!key||!/^[A-Za-z0-9_-]{16,128}$/.test(key)))throw new AccessError(400,'VALIDATION_ERROR');
  const staffSession=domain==='STAFF'?await r.staff.auth.api.getSession({headers:request.headers,query:{disableCookieCache:true}}):null;
  if(route.id==='reauthenticate_policy') {
    // Check the exact candidate before asking the auth library to verify fresh MFA.
    const value=PolicyReauthenticate.parse(input);
    await scopedTransaction(r.pool,actor,tx=>publicationCandidate({tx,actor,requestId},id!,value));
    const headers=new Headers(request.headers);headers.delete('content-length');
    const proof=await authHandler(r.staff,r.config,new Request(r.config.origin+'/api/auth/staff/two-factor/verify-totp',{method:'POST',headers,body:JSON.stringify({code:value.code,trustDevice:false})}),requestId);
    if(!proof.ok)throw new AccessError(proof.status===429?503:403,proof.status===429?'SERVICE_UNAVAILABLE':'FORBIDDEN');
  }
  const result=await scopedTransaction(r.pool,actor,async tx=>{
    // Authority is re-read after beginning the business transaction. A stale UI
    // role, prior preview or cookie cache cannot authorize the mutation/replay.
    const current=await authorityFor(request,r.staff,r.principal);
    if(current.actor_id!==actor.actor_id||current.actor_domain!==actor.actor_domain||JSON.stringify(current.scope)!==JSON.stringify(actor.scope)||current.principal_id!==actor.principal_id)throw new AccessError(403,'FORBIDDEN');
    await requireCapability(r.config,current,domain,route.capability!);
    const c={tx,actor:current,requestId};
    const execute=async()=>{
      if(route.id.startsWith('list_')&&route.id!=='list_mappings')return configurationList(c,route.id.slice(5) as ConfigurationKind,page);
      if(route.id.startsWith('create_')&&route.id!=='create_mapping')return createConfiguration(c,route.id.slice(7) as ConfigurationKind,input);
      switch(route.id) {
        case 'reauthenticate_policy':return recordPublicationProof(c,id!,input,staffSession!.session.id);
        case 'publish_policy':return publishPolicy(c,id!,input,staffSession!.session.id);
        case 'create_mapping':return createMapping(c,input);
        case 'list_mappings':return mappingList(c,page);
        case 'control_map':return controlMap(c);
        case 'own_consents':return ownChoices(c,page);
        case 'grant':case 'withdraw':return changeConsent(c,id!,route.id,input);
        case 'own_receipt':return ownReceipt(c,id!);
        case 'own_history':return ownHistory(c,id!,page);
        case 'workflows':return workflowList(c,page);
        case 'workflow':return readWorkflow(c,id!);
        default:throw new AccessError(404,'NOT_FOUND');
      }
    };
    const result=route.idempotency?await idempotent(c,route.id+(id?':'+id:''),key!,input??{},execute):await execute();
    await audit(c,route.id,id);
    return schemas[route.response].parse(result);
  });
  return Response.json(result,{status:route.status});
},'BUSINESS'); }
