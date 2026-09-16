import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import openapiTS, { astToString, type OpenAPI3 } from 'openapi-typescript';
import { AUTH, CONTRACT_VERSION, PROFILES, routes, schemas, type SchemaName } from './index.ts';
import { example, receiptReplayExample } from './examples.ts';
import signatureVector from '../fixtures/command-vector.json' with { type:'json' };
const review = { review_status: 'PENDING_WORK_REVIEW', accepted_baseline: '0.2.1', review_commit: null, integration_commit: null };

const components=Object.fromEntries(Object.entries(schemas).map(([name,schema])=>{
  const json=z.toJSONSchema(schema,{target:'draft-2020-12'});
  delete json.$schema;
  return [name,json];
}));
const ref=(name:SchemaName)=>({$ref:`#/components/schemas/${name}`});
const errorCodes={400:'VALIDATION_ERROR',401:'UNAUTHENTICATED',403:'FORBIDDEN',404:'NOT_FOUND',409:'EPOCH_CONFLICT',429:'RATE_LIMITED',503:'SERVICE_UNAVAILABLE'} as const;
const errors=Object.entries(errorCodes).map(([status,code])=>({status:Number(status),body:{error:{code,message:'Synthetic safe error example',retry:status==='401'?'REAUTHENTICATE':status==='409'?'REFRESH':status==='429'||status==='503'?'AFTER_DELAY':'NEVER'},request_id:'00000000-0000-4000-8000-000000000001'}}));
for(const e of errors)schemas.ErrorResponse.parse(e.body);
const paths:Record<string,Record<string,unknown>>={};
const routeExamples=[];
for(const route of routes){
  const body=route.request?example(route.request):undefined;
  const response=example(route.response);
  schemas[route.response].parse(response);
  if(route.request)schemas[route.request].parse(body);
  const parameters:unknown[]=[];
  for(const field of route.path.matchAll(/\{([^}]+)\}/g))parameters.push({in:'path',name:field[1],required:true,schema:{type:'string',format:'uuid'}});
  if(route.idempotency)parameters.push({in:'header',name:'Idempotency-Key',required:true,schema:{type:'string',minLength:16,maxLength:128,pattern:'^[A-Za-z0-9_-]+$'}});
  if(route.paginated)parameters.push({in:'query',name:'cursor',schema:{type:'string',maxLength:200}},{in:'query',name:'limit',schema:{type:'integer',minimum:1,maximum:100,default:25}});
  const security=route.authority==='PUBLIC'?[]:route.authority==='STAFF_OR_PRINCIPAL'?[{staffSession:[]},{principalSession:[]}]:route.authority==='STAFF'?[{staffSession:[]}]:route.authority==='PRINCIPAL'?[{principalSession:[]}]:[{machineCredential:[]}];
  const responses:Record<string,unknown>={[route.status]:{description:'Typed contract response; endpoint implementation is ticket-gated.',content:{'application/json':{schema:ref(route.response),example:response}}}};
  for(const error of errors)responses[error.status]={description:error.body.error.code,content:{'application/json':{schema:ref('ErrorResponse'),example:error.body}}};
  const operation={operationId:route.id,security,parameters,responses,'x-orvia-authority':route.authority,'x-orvia-capability':route.capability,'x-orvia-implementation':route.id==='health'?'IMPLEMENTED_A00':['session','list_principals','create_principals'].includes(route.id)?'IMPLEMENTED_A01_PENDING_REVIEW':['list_purposes','create_purposes','list_notices','create_notices','list_policies','create_policies','list_systems','create_systems','publish_policy','reauthenticate_policy','create_mapping','list_mappings','control_map','own_consents','own_receipt','own_history','grant','withdraw'].includes(route.id)?'IMPLEMENTED_A02_PENDING_REVIEW':['workflows','workflow','poll_commands','command_receipt'].includes(route.id)?'IMPLEMENTED_A03_PENDING_REVIEW':['evaluate','send'].includes(route.id)?'IMPLEMENTED_A04_PENDING_REVIEW':'CONTRACT_ONLY_PENDING_TICKET',...(route.request?{requestBody:{required:true,content:{'application/json':{schema:ref(route.request),example:body}}}}:{})};
  (paths[route.path]??={})[route.method]=operation;
  routeExamples.push({operation_id:route.id,method:route.method.toUpperCase(),path:route.path,headers:route.idempotency?{'Idempotency-Key':'synthetic_example_key_0001'}:{},request:body??null,response_status:route.status,response});
}
const doc={openapi:'3.1.0',info:{title:'ORVIA customer-local synthetic contract',version:CONTRACT_VERSION,description:'Contract 0.3.0 is pending consolidated Work review; accepted baseline 0.2.1. Examples are labelled synthetic contract fixtures, never runtime responses.'},paths,components:{schemas:components,securitySchemes:{staffSession:{type:'apiKey',in:'cookie',name:`${AUTH.staff.cookie_prefix}.session_token`},principalSession:{type:'apiKey',in:'cookie',name:`${AUTH.principal.cookie_prefix}.session_token`},machineCredential:{type:'http',scheme:'bearer',description:'Independent installation/environment-scoped machine authority; never a human session.'}}}};
const json=(v:unknown)=>JSON.stringify(v,null,2)+'\n';
const outputs:Record<string,string>={'openapi.json':json(doc),'examples.json':json({fixture_kind:'SYNTHETIC_CONTRACT_EXAMPLES',runtime_fallback:false,routes:routeExamples,errors,immutable_receipt_replay:receiptReplayExample}),'client-types.d.ts':astToString(await openapiTS(doc as unknown as OpenAPI3)), 'interfaces.json':json({contract_version:CONTRACT_VERSION,...review,auth:AUTH,profiles:PROFILES,polling:{minimum_interval_ms:2000,maximum_backoff_ms:30000,workflow_terminal:['COMPLETED'],test_terminal:['PASS','FAIL','ERROR','SKIPPED'],needs_attention:'Pause automatic polling after surfacing attention; explicit refresh remains available.'}})};
outputs['signature-vector.json']=json(signatureVector);
outputs['contract-seed.proposed.json']=json({contract_version:CONTRACT_VERSION,...review,provenance:'Generated from canonical executable schemas, pending Work review. Historical proposal filename retained; tracking/contract_seed.json is generated from these same bytes.',api_base:'/api/v1',profiles:PROFILES,auth:AUTH,routes});
outputs['endpoint-types.ts']='// Generated from canonical routes. Do not edit.\nexport interface EndpointMap {\n'+routes.filter(r=>r.authority!=='MACHINE').map(r=>`  ${r.id}: { request: ${r.request?`import('zod').infer<typeof import('../src/index.ts').schemas.${r.request}>`:'undefined'}; response: import('zod').infer<typeof import('../src/index.ts').schemas.${r.response}> };`).join('\n')+'\n}\n';
outputs['manifest.json']=json({contract_version:CONTRACT_VERSION,...review,artifacts:Object.fromEntries(Object.entries(outputs).map(([p,b])=>[p,createHash('sha256').update(b).digest('hex')]))});
const check=process.argv.includes('--check');
mkdirSync('packages/contracts/generated',{recursive:true});
for(const [name,bytes] of Object.entries(outputs)){
  const path=`packages/contracts/generated/${name}`;
  if(check){if(!existsSync(path)||readFileSync(path,'utf8')!==bytes)throw new Error(`Generated contract drift: ${path}`);}
  else writeFileSync(path,bytes);
}
const seedPath='tracking/contract_seed.json';
if(check){if(!existsSync(seedPath)||readFileSync(seedPath,'utf8')!==outputs['contract-seed.proposed.json'])throw new Error('Generated accepted seed drift');}
else writeFileSync(seedPath,outputs['contract-seed.proposed.json']!);
console.log(`${check?'Checked':'Generated'} ${Object.keys(outputs).length} artifacts and canonical seed; ${routes.length} route examples and ${errors.length} error examples validated; contract ${CONTRACT_VERSION}.`);
