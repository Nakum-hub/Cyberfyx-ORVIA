import { routes, schemas, Pagination, Id, PolicyReauthenticate, queryKeys, type RouteDefinition } from '../../contracts/src/index.ts';
import { authorityFor, requireCapability, AccessError } from '../../authz/src/index.ts';
import { limitedBody, authHandler } from '../../auth/src/server.ts';
import { scopedTransaction } from '../../db/src/runtime.ts';
import { audit, idempotent, type Page } from '@orvia/domain/transaction';
import { configurationList, createConfiguration, createMapping, mappingList, controlMap, publishPolicy, recordPublicationProof, publicationCandidate, configurationKinds, type ConfigurationKind } from '../../domain/src/configuration/configuration.ts';
import { createDataAsset, dataAssetList, readDataAsset, tombstoneAsset, createActivity, activityList, createRelationship, relationshipList, graphSearch, neighbourhood, impact } from '../../domain/src/graph/graph.ts';
import { importLicence, entitlementReport } from '../../domain/src/licensing/licensing.ts';
import { createSupportCase, supportCaseList, readSupportCase, recordResolution, registerCanary, canaryList, generateDiagnostic, approveDiagnostic, recordTransfer, validateIngressSubmission } from '../../domain/src/support/support.ts';
import { importRelease, releaseList, updateEligibility, planUpdate, readUpdatePlan, updatePlanList, recordUpdateStep, installationVersionList } from '../../domain/src/updates/updates.ts';
import { operationalReadiness } from '../../domain/src/monitoring/monitoring.ts';
import { auditEventList, exportAuditEvents, auditCoverage, correctAuditEvent } from '../../domain/src/audit/audit.ts';
import { createTemplate, templateList, createNotificationTask, notificationTaskList, readNotificationTask, recordDelivery, escalationSweep } from '../../domain/src/notifications/notifications.ts';
import { createIncident, incidentList, incidentAssessment, correctIncident, containIncident, closeIncident, transitionNotification, createObligationRule, obligationRuleList } from '../../domain/src/incidents/incidents.ts';
import { createProcessor, processorList, linkProcessorSystem, recordCoordination, processorStanding, createAssessment, assessmentList, completeAssessment, createFinding, findingList, closeFinding } from '../../domain/src/processors/processors.ts';
import { coverageReport, deriveGaps, gapList, assignGap, closeGap, gapGuidance } from '../../domain/src/coverage/coverage.ts';
import { createConstraint, constraintList, createHold, holdList, releaseHold, evaluateEligibility, recordRetentionDecision, recordRetentionOutcome, retentionOutcomeList } from '../../domain/src/retention/retention.ts';
import { createRequest, requestList, readRequest, reviewIdentity, scopeRequest, transitionRequest, releaseResponse, recordOutcome, createMandate, mandateList, revokeMandate } from '../../domain/src/rights/rights.ts';
import { ownChoices, changeConsent, ownReceipt, ownHistory } from '../../domain/src/consent/consent.ts';
import { readWorkflow,workflowList } from '../../domain/src/workflow/workflow.ts';
import { preview } from '@orvia/privacy-control';
import { servicePool } from '../../auth/src/machine.ts';
import { requestReconciliation,attest,failures,overview,evidence,checkSystem,capabilities } from '../../domain/src/evidence/evidence.ts';
import { startTest,readTest } from '../../domain/src/test-runs/test-runs.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';
import { syntheticTargetObserver } from './synthetic/target-observer.ts';

const implemented=new Set(['list_purposes','create_purposes','list_notices','create_notices','list_policies','create_policies','list_systems','create_systems','publish_policy','reauthenticate_policy','create_mapping','list_mappings','control_map','own_consents','own_receipt','own_history','grant','withdraw','workflows','workflow','evaluate','reconcile','attest','failures','overview','evidence','export','check_system','capabilities','start_test','test_run',
  'list_data_assets','data_asset','create_data_asset','tombstone_data_asset','list_activities','create_activity','list_relationships','create_relationship','graph_search','graph_neighbourhood','graph_impact',
  'list_rights_requests','create_rights_request','rights_request','review_identity','scope_request','transition_request','release_response','record_outcome','list_mandates','create_mandate','revoke_mandate',
  'list_constraints','create_constraint','list_holds','create_hold','release_hold','asset_eligibility','retention_decision','retention_outcome','list_retention_outcomes',
  'coverage','list_gaps','derive_gaps','assign_gap','close_gap','gap_guidance',
  'list_processors','create_processor','link_processor_system','processor_standing','record_coordination','list_assessments','create_assessment','complete_assessment','list_findings','create_finding','close_finding',
  'list_incidents','create_incident','incident_assessment','correct_incident','contain_incident','close_incident','transition_notification','list_obligation_rules','create_obligation_rule',
  'list_templates','create_template','list_notification_tasks','create_notification_task','notification_task','record_delivery','escalation_sweep','entitlements','import_licence',
  'list_support_cases','create_support_case','support_case','generate_diagnostic','record_resolution','approve_diagnostic','record_transfer','validate_submission','list_canaries','register_canary',
  'list_releases','import_release','update_eligibility','plan_update','update_plan','list_update_plans','record_update_step','installation_versions',
  'operational_readiness','list_audit_events','export_audit_events','audit_coverage','correct_audit_event']);
let observerPool: ReturnType<typeof servicePool>|undefined;
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
    const value=schemas[route.query].safeParse(supplied);
    if(!value.success)throw new AccessError(400,'VALIDATION_ERROR',value.error.issues.slice(0,32).map(issue=>({field:issue.path.join('.').slice(0,120),code:issue.code})));
    query=value.data;
  }
  return {page:{limit:parsed.data.limit,cursor},query};
}
export function businessRoute(request: Request) { return safeRoute(async requestId=>{
  const {route,id}=resolveRoute(request);const r=runtime();const actor=await authorityFor(request,r.staff,r.principal);
  const domain=route.authority==='PRINCIPAL'?'PRINCIPAL':'STAFF';
  await requireCapability(r.config,actor,domain,route.capability!);
  const {page,query}=queryString(request,route);let input: unknown=undefined;
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
      if(route.id.startsWith('list_')&&configurationKinds.has(route.id.slice(5)))return configurationList(c,route.id.slice(5) as ConfigurationKind,page);
      if(route.id.startsWith('create_')&&configurationKinds.has(route.id.slice(7)))return createConfiguration(c,route.id.slice(7) as ConfigurationKind,input);
      switch(route.id) {
        case 'list_data_assets':return dataAssetList(c,page);
        case 'data_asset':return readDataAsset(c,id!);
        case 'create_data_asset':return createDataAsset(c,input);
        case 'tombstone_data_asset':return tombstoneAsset(c,id!,input);
        case 'list_activities':return activityList(c,page);
        case 'create_activity':return createActivity(c,input);
        case 'list_relationships':return relationshipList(c,page);
        case 'create_relationship':return createRelationship(c,input);
        case 'graph_search':return graphSearch(c,query);
        case 'graph_neighbourhood':return neighbourhood(c,id!,query);
        case 'graph_impact':return impact(c,id!);
        case 'list_rights_requests':return requestList(c,page);
        case 'create_rights_request':return createRequest(c,input);
        case 'rights_request':return readRequest(c,id!);
        case 'review_identity':return reviewIdentity(c,id!,input);
        case 'scope_request':return scopeRequest(c,id!,input);
        case 'transition_request':return transitionRequest(c,id!,input);
        case 'release_response':return releaseResponse(c,id!,input);
        case 'record_outcome':return recordOutcome(c,id!,input);
        case 'list_constraints':return constraintList(c,page);
        case 'create_constraint':return createConstraint(c,input);
        case 'list_holds':return holdList(c,page);
        case 'create_hold':return createHold(c,input);
        case 'release_hold':return releaseHold(c,id!,input);
        case 'asset_eligibility':return evaluateEligibility(c,id!);
        case 'retention_decision':return recordRetentionDecision(c,id!,input);
        case 'retention_outcome':return recordRetentionOutcome(c,id!,input);
        case 'list_retention_outcomes':return retentionOutcomeList(c,page);
        case 'coverage':return coverageReport(c);
        case 'list_gaps':return gapList(c,page);
        case 'derive_gaps':return deriveGaps(c);
        case 'assign_gap':return assignGap(c,id!,input);
        case 'close_gap':return closeGap(c,id!,input);
        case 'gap_guidance':return gapGuidance(c,id!);
        case 'list_processors':return processorList(c,page);
        case 'create_processor':return createProcessor(c,input);
        case 'link_processor_system':return linkProcessorSystem(c,id!,input);
        case 'processor_standing':return processorStanding(c,id!);
        case 'record_coordination':return recordCoordination(c,id!,input);
        case 'list_assessments':return assessmentList(c,page);
        case 'create_assessment':return createAssessment(c,input);
        case 'complete_assessment':return completeAssessment(c,id!,input);
        case 'list_findings':return findingList(c,page);
        case 'create_finding':return createFinding(c,input);
        case 'close_finding':return closeFinding(c,id!,input);
        case 'list_incidents':return incidentList(c,page);
        case 'create_incident':return createIncident(c,input);
        case 'incident_assessment':return incidentAssessment(c,id!);
        case 'correct_incident':return correctIncident(c,id!,input);
        case 'contain_incident':return containIncident(c,id!,input);
        case 'close_incident':return closeIncident(c,id!,input);
        case 'transition_notification':return transitionNotification(c,id!,input);
        case 'list_obligation_rules':return obligationRuleList(c,page);
        case 'create_obligation_rule':return createObligationRule(c,input);
        case 'list_templates':return templateList(c,page);
        case 'create_template':return createTemplate(c,input);
        case 'list_notification_tasks':return notificationTaskList(c,page);
        case 'create_notification_task':return createNotificationTask(c,input);
        case 'notification_task':return readNotificationTask(c,id!);
        case 'record_delivery':return recordDelivery(c,id!,input);
        case 'escalation_sweep':return escalationSweep(c);
        case 'entitlements':return entitlementReport(c);
        case 'import_licence':return importLicence(c,input,r.config.installation_id);
        case 'list_support_cases':return supportCaseList(c,page);
        case 'create_support_case':return createSupportCase(c,input);
        case 'support_case':return readSupportCase(c,id!);
        case 'generate_diagnostic':return generateDiagnostic(c,id!,r.config.installation_id);
        case 'record_resolution':return recordResolution(c,id!,input);
        case 'approve_diagnostic':return approveDiagnostic(c,id!,input);
        case 'record_transfer':return recordTransfer(c,id!,input);
        case 'validate_submission':return validateIngressSubmission(c,input);
        case 'list_canaries':return canaryList(c,page);
        case 'register_canary':return registerCanary(c,input);
        case 'list_releases':return releaseList(c,page);
        case 'import_release':return importRelease(c,input);
        case 'update_eligibility':return updateEligibility(c,id!);
        case 'plan_update':return planUpdate(c,id!,input);
        case 'update_plan':return readUpdatePlan(c,id!);
        case 'list_update_plans':return updatePlanList(c,page);
        case 'record_update_step':return recordUpdateStep(c,id!,input);
        case 'installation_versions':return installationVersionList(c,page);
        case 'operational_readiness':return operationalReadiness(c);
        case 'list_audit_events':return auditEventList(c,page,query);
        case 'export_audit_events':return exportAuditEvents(c,query);
        case 'audit_coverage':return auditCoverage(c);
        case 'correct_audit_event':return correctAuditEvent(c,input);
        case 'list_mandates':return mandateList(c,page);
        case 'create_mandate':return createMandate(c,input);
        case 'revoke_mandate':return revokeMandate(c,id!,input);
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
        case 'test_run':return readTest(c,id!);
        default:throw new AccessError(404,'NOT_FOUND');
      }
    };
    const result=route.idempotency?await idempotent(c,route.id,id??null,key!,input??{},execute):await execute();
    await audit(c,route.id,id);
    return schemas[route.response].parse(result);
  });
  const download=route.id==='export'?`orvia-evidence-${id}.json`:route.id==='export_audit_events'?'orvia-audit-trail.json':null;
  return Response.json(result,{status:route.status,headers:{'cache-control':'no-store',...download?{'content-disposition':`attachment; filename="${download}"`}:{}}});
},'BUSINESS'); }
