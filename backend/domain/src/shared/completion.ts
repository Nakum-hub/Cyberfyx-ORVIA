import { Obligation, ReconciliationState, RequestPlanItem, SystemOutcome } from '../../../../shared/contracts/src/index.ts';
export function obligationSatisfied(value:unknown, now:Date){
  const o=Obligation.parse(value);
  if(!o.required)return Boolean(o.skip_reason);
  if(!o.scope_still_current)return false;
  if(o.completion_criterion==='ATTRIBUTED_MANUAL_ATTESTATION')return o.attestation!==null && Date.parse(o.attestation.recorded_at)<=now.getTime() && o.attestation.evidence_record_ids.length>0;
  const observation=o.observation;
  // A provider receipt is attributable evidence, not an independent target read.
  return observation!==null && observation.method==='SCOPED_READ' && observation.state==='OBSERVED_SATISFIED' && observation.observed_state===observation.desired_state && observation.observed_at!==null && Date.parse(observation.observed_at)<=now.getTime() && observation.fresh_until!==null && Date.parse(observation.fresh_until)>now.getTime();
}
export function workflowCompletion(obligations:unknown[],now:Date){
  if(obligations.length===0)return 'NEEDS_ATTENTION';
  return obligations.every(o=>obligationSatisfied(o,now))?'COMPLETED':'NEEDS_ATTENTION';
}
/**
 * WP08. What execution actually achieved, derived only from recorded per-system
 * outcomes. Moving a request along its lifecycle is an administrative act and
 * never an effect, so no lifecycle state is an input here. The order of these
 * rules is deliberate: the least flattering true answer wins.
 */
export function rightsExecution(plan:unknown[],outcomes:unknown[],unresolvedDestinations:number){
  const items=plan.map(item=>RequestPlanItem.parse(item)).filter(item=>item.action!=='NO_ACTION_REQUIRED');
  const recorded=outcomes.map(outcome=>SystemOutcome.parse(outcome));
  if(recorded.length===0)return 'NOT_STARTED';
  const bySystem=new Map(recorded.map(outcome=>[outcome.system_id,outcome]));
  // A planned system with no recorded outcome means the work is still open.
  if(items.some(item=>!bySystem.has(item.system_id)))return 'RUNNING';
  const relevant=items.map(item=>bySystem.get(item.system_id)!);
  if(relevant.length===0)return 'NOT_STARTED';
  if(relevant.every(outcome=>outcome.result==='SUCCEEDED')&&unresolvedDestinations===0)return 'COMPLETE';
  if(relevant.every(outcome=>outcome.result==='FAILED'))return 'FAILED';
  // Outstanding manual or unsupported work outranks a partial success, because
  // somebody still has to do something.
  if(relevant.some(outcome=>outcome.result==='MANUAL_REQUIRED'||outcome.result==='NOT_SUPPORTED'))return 'MANUAL_REQUIRED';
  return 'PARTIAL';
}
const transitions:Record<ReturnType<typeof ReconciliationState.parse>,readonly ReturnType<typeof ReconciliationState.parse>[]>={PENDING:['RECONCILING'],RECONCILING:['RESOLVED','INCONCLUSIVE','FAILED'],RESOLVED:[],INCONCLUSIVE:[],FAILED:[]};
export function assertReconciliationTransition(from:unknown,to:unknown){
  const a=ReconciliationState.parse(from),b=ReconciliationState.parse(to);
  if(!transitions[a].includes(b))throw new Error(`Invalid reconciliation transition ${a} -> ${b}`);
  return b;
}
