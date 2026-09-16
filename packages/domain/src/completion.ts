import { Obligation, ReconciliationState } from '../../contracts/src/index.ts';
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
const transitions:Record<ReturnType<typeof ReconciliationState.parse>,readonly ReturnType<typeof ReconciliationState.parse>[]>={PENDING:['RECONCILING'],RECONCILING:['RESOLVED','INCONCLUSIVE','FAILED'],RESOLVED:[],INCONCLUSIVE:[],FAILED:[]};
export function assertReconciliationTransition(from:unknown,to:unknown){
  const a=ReconciliationState.parse(from),b=ReconciliationState.parse(to);
  if(!transitions[a].includes(b))throw new Error(`Invalid reconciliation transition ${a} -> ${b}`);
  return b;
}
