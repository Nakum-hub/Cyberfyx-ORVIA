import { proxyActivities,sleep } from '@temporalio/workflow';
import type { Activities } from './withdrawal-worker.ts';
const activities=proxyActivities<Activities>({startToCloseTimeout:'15s',retry:{maximumAttempts:3,initialInterval:'1s',maximumInterval:'5s'}});
export async function withdrawalWorkflow(identityId: string, workflowId: string) {
 const actions=await activities.prepare(identityId,workflowId);
 for(const action of actions) {
  let received=false;
  for(let i=0;i<150;i++) {
   const receipt=await activities.receipt(identityId,action);
   if(receipt){received=true;if(receipt!=='EFFECT_UNKNOWN')await activities.observe(identityId,action);break;}
   await sleep('2s');
  }
  if(!received)await activities.commandExpired(identityId,action);
 }
 return activities.finish(identityId,workflowId);
}
export async function reconciliationWorkflow(identityId:string,operationId:string) {return activities.reconcile(identityId,operationId);}
