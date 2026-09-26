import { createHash, createHmac } from 'node:crypto';
import { governanceRoute } from './governance-routes.ts';
import { operationsRoute } from './operations-routes.ts';
import { operationsRoutes } from '../../../shared/contracts/src/operations-routes.ts';
import { expansionRoute } from './expansion-routes.ts';
import { expansionRoutes } from '../../../shared/contracts/src/expansion-routes.ts';
import type { OperationsEnv } from '../../domain/src/operations/shared.ts';
import { platformRoute } from './platform-routes.ts';
import { routes, schemas, Pagination, Id, PolicyReauthenticate, queryKeys, type RouteDefinition } from '../../../shared/contracts/src/index.ts';
import { authorityFor, requireCapability, AccessError } from '../../authorization/src/index.ts';
import { limitedBody, authHandler } from '../../auth/src/server.ts';
import { scopedTransaction } from '../../../database/customer/src/runtime.ts';
import { audit, idempotent, type Page } from '@orvia/domain/transaction';
import { configurationList, createConfiguration, createMapping, mappingList, controlMap, publishPolicy, recordPublicationProof, publicationCandidate, configurationKinds, type ConfigurationKind } from '../../domain/src/configuration/configuration.ts';
import { ownChoices, changeConsent, ownReceipt, ownHistory } from '../../domain/src/consent/consent.ts';
import { readWorkflow,workflowList } from '../../domain/src/workflow/workflow.ts';
import { preview } from '@orvia/privacy-control';
import { servicePool } from '../../auth/src/machine.ts';
import { requestReconciliation,attest,failures,overview,evidence,checkSystem,capabilities } from '../../domain/src/evidence/evidence.ts';
import { startTest,readTest,listTests } from '../../domain/src/test-runs/test-runs.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';
import { syntheticTargetObserver } from './synthetic/target-observer.ts';

const implemented=new Set(['grc_audit_response_history','list_grc_audits','create_grc_audit','grc_audit_detail','grc_audit_requests','create_grc_audit_request','grc_audit_request_detail','respond_grc_audit_request','review_grc_audit_response','close_grc_audit','grc_evidence_history','grc_treatment_history','list_grc_frameworks','create_grc_framework','list_grc_controls','create_grc_control','list_grc_risks','create_grc_risk','grc_control_detail','grc_risk_detail','submit_grc_evidence','review_grc_evidence','propose_grc_treatment','review_grc_treatment','list_catalog_discovery_targets','create_catalog_discovery_target','catalog_discovery_target','approve_catalog_discovery_target','disable_catalog_discovery_target','list_ai_systems','create_ai_system','ai_system','record_ai_event','ai_governance_report','list_purposes','create_purposes','list_notices','create_notices','list_policies','create_policies','list_systems','create_systems','publish_policy','reauthenticate_policy','create_mapping','list_mappings','control_map','own_consents','own_receipt','own_history','grant','withdraw','workflows','workflow','evaluate','reconcile','attest','failures','overview','evidence','export','check_system','capabilities','start_test','list_test_runs','test_run',
  'list_data_assets','data_asset','create_data_asset','create_catalog_asset','tombstone_data_asset','list_activities','create_activity','list_relationships','create_relationship','graph_search','graph_neighbourhood','graph_impact',
  'list_rights_requests','create_rights_request','rights_request','review_identity','scope_request','transition_request','release_response','record_outcome','list_mandates','create_mandate','revoke_mandate',
  'list_constraints','create_constraint','list_holds','create_hold','release_hold','asset_eligibility','retention_decision','retention_outcome','list_retention_outcomes',
  'coverage','list_gaps','derive_gaps','assign_gap','close_gap','gap_guidance',
  'list_processors','create_processor','link_processor_system','processor_standing','record_coordination','list_assessments','create_assessment','complete_assessment','list_findings','create_finding','close_finding',
  'list_incidents','create_incident','incident_assessment','correct_incident','contain_incident','close_incident','transition_notification','list_obligation_rules','create_obligation_rule',
  'list_templates','create_template','list_notification_tasks','create_notification_task','notification_task','record_delivery','escalation_sweep','entitlements','import_licence',
  'list_support_cases','create_support_case','support_case','generate_diagnostic','record_resolution','approve_diagnostic','record_transfer','validate_submission','list_canaries','register_canary',
  'list_releases','import_release','update_eligibility','plan_update','update_plan','list_update_plans','record_update_step','installation_versions',
  'operational_readiness','list_audit_events','export_audit_events','audit_coverage','correct_audit_event',
  'list_connections','start_connection','connection','record_connectivity','record_scoped_identity','approve_resources','change_enablement',
  'record_notice_revision','list_notice_revisions','notice_languages','set_language','preflight',
  'list_backup_snapshots','declare_snapshot','start_restore','list_restore_runs','restore_run','acknowledge_conflict','release_restore','vendor_visibility','audit_retention','set_audit_retention','list_imports','submit_import','import_batch','decide_import_row','apply_import','purge_import','report','own_rights_requests','raise_own_rights_request','own_rights_request']);
for(const route of operationsRoutes)implemented.add(route.id);
for(const route of expansionRoutes)implemented.add(route.id);
let observerPool: ReturnType<typeof servicePool>|undefined;
let agentPool: ReturnType<typeof servicePool>|undefined;
function operationsEnv(r: ReturnType<typeof runtime>): OperationsEnv {
  // A keyed digest, domain-separated from the auth secret it is derived from, so a raw source identifier is never stored and cannot be reversed by a table reader.
  const key=createHash('sha256').update('orvia-registry-source-key:'+r.config.secret('principal-secret')).digest();
  const webhookKey=createHash('sha256').update('orvia-webhook-signing:'+r.config.secret('principal-secret')).digest();
  return {sourceKeyDigest:value=>createHmac('sha256',key).update(value,'utf8').digest('hex'),webhookSecret:id=>createHmac('sha256',webhookKey).update(id,'utf8').digest('hex'),
    targets:{agent:agentPool??=servicePool(r.config,'orvia_target_agent'),observer:observerPool??=servicePool(r.config,'orvia_target_observer')}};
}
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
/** Looks up a canonical schema by name; the index signature keeps the checker from expanding every schema's type. */
type Parsed={success:true;data:unknown}|{success:false;error:{issues:{path:PropertyKey[];code:string}[]}};
const schemaNamed=(name:string)=>(schemas as unknown as Record<string,{safeParse(value:unknown):Parsed}>)[name]!;
/** Query parsing is allowlisted by the canonical route definition: a parameter the
 *  route did not declare, or a repeated one, is rejected rather than ignored. */
function queryString(request: Request, route: RouteDefinition): {page: Page; query: unknown} {
  const params=new URL(request.url).searchParams;
  const declared=route.query?queryKeys(route.query):[];
  const allowed=[...route.paginated?['cursor','limit']:[],...declared];
  for(const key of new Set(params.keys())) {
    if(!allowed.includes(key)||params.getAll(key).length>1)throw new AccessError(400,'VALIDATION_ERROR');
  }
  const parsed=Pagination.safeParse({...params.has('cursor')?{cursor:params.get('cursor')}:{},...params.has('limit')?{limit:Number(params.get('limit'))}:{}});
  if(!parsed.success)throw new AccessError(400,'VALIDATION_ERROR');
  const cursor=parsed.data.cursor?Buffer.from(parsed.data.cursor,'base64url').toString('utf8'):null;
  if(cursor&&!Id.safeParse(cursor).success)throw new AccessError(400,'VALIDATION_ERROR');
  let query: unknown=undefined;
  if(route.query) {
    const supplied=Object.fromEntries(declared.filter(key=>params.has(key)).map(key=>[key,params.get(key)!]));
    const value=schemaNamed(route.query).safeParse(supplied);
    if(!value.success)throw new AccessError(400,'VALIDATION_ERROR',value.error.issues.slice(0,32).map(issue=>({field:issue.path.join('.').slice(0,120),code:issue.code})));
    query=value.data;
  }
  return {page:{limit:parsed.data.limit,cursor},query};
}
/** Bind server-owned dependencies once; requests cannot select a database or identity provider. */
export function createBusinessHandler(getRuntime:typeof runtime) { return (request:Request)=>safeRoute(async requestId=>{
  const {route,id}=resolveRoute(request);const r=getRuntime();const actor=await authorityFor(request,r.staff,r.principal);
  const domain=route.authority==='PRINCIPAL'?'PRINCIPAL':'STAFF';
  await requireCapability(r.config,actor,domain,route.capability!);
  const {page,query}=queryString(request,route);let input: unknown=undefined;
  if(request.method==='POST') {
    if(request.headers.get('origin')!==r.config.origin)throw new AccessError(403,'FORBIDDEN');
    if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new AccessError(400,'VALIDATION_ERROR');
    try {input=JSON.parse(await limitedBody(request,route.maximum_body_bytes??16384)??'');}catch{throw new AccessError(400,'VALIDATION_ERROR');}
    if(route.request) {
      const parsed=schemaNamed(route.request).safeParse(input);
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
      if(route.id.startsWith('list_')&&configurationKinds.has(route.id.slice(5)))return configurationList(c,route.id.slice(5) as ConfigurationKind,page);
      if(route.id.startsWith('create_')&&configurationKinds.has(route.id.slice(7)))return createConfiguration(c,route.id.slice(7) as ConfigurationKind,input);
        const governanceResult=await governanceRoute(c,route,id,input,page,query);
        if(governanceResult!==undefined)return governanceResult;
        const platformResult=await platformRoute(c,route,id,input,page,query,r);
        if(platformResult!==undefined)return platformResult;
        const operationsResult=await operationsRoute(c,route,id,input,page,query,operationsEnv(r));
        if(operationsResult!==undefined)return operationsResult;
        const expansionResult=await expansionRoute(c,route,id,input,page,query,operationsEnv(r));
        if(expansionResult!==undefined)return expansionResult;
      switch(route.id) {
        case 'reauthenticate_policy':return recordPublicationProof(c,id!,input,staffSession!.session.id);
        case 'publish_policy':return publishPolicy(c,id!,input,staffSession!.session.id);
        case 'create_mapping':return createMapping(c,input);
        case 'list_mappings':return mappingList(c,page);
        case 'control_map':return controlMap(c,page);
        case 'own_consents':return ownChoices(c,page);
        case 'grant':case 'withdraw':return changeConsent(c,id!,route.id,input);
        case 'own_receipt':return ownReceipt(c,id!);
        case 'own_history':return ownHistory(c,id!,page);
        case 'workflows':return workflowList(c,page);
        case 'workflow':return readWorkflow(c,id!);
        case 'evaluate':return preview(c,r.config,observerPool??=servicePool(r.config,'orvia_target_observer'),syntheticTargetObserver,input);
        case 'reconcile':return requestReconciliation(c,id!);
        case 'attest':return attest(c,id!,input);
        case 'failures':return failures(c,page);
        case 'overview':return overview(c);
        case 'evidence':case 'export':return evidence(c,id!,route.id==='export');
        case 'check_system':return checkSystem(c,id!,observerPool??=servicePool(r.config,'orvia_target_observer'));
        case 'capabilities':return capabilities(c,page);
        case 'start_test':return startTest(c,r.config,input);
        case 'list_test_runs':return listTests(c,page);
        case 'test_run':return readTest(c,id!);
        default:throw new AccessError(404,'NOT_FOUND');
      }
    };
    const result=route.idempotency?await idempotent(c,route.id,id??null,key!,input??{},execute):await execute();
    await audit(c,route.id,id);
    return schemas[route.response].parse(result);
  });
  const download=route.id==='export'?`orvia-evidence-${id}.json`:route.id==='export_audit_events'?'orvia-audit-trail.json':route.id==='run_evidence_package'?`orvia-workflow-evidence-${id}.json`:null;
  return Response.json(result,{status:route.status,headers:{'cache-control':'no-store',...download?{'content-disposition':`attachment; filename="${download}"`}:{}}});
},'BUSINESS',getRuntime); }
export const businessRoute=createBusinessHandler(runtime);
