import { proxyActivities,sleep } from '@temporalio/workflow';
import type { Activities } from './withdrawal-worker.ts';
const activities=proxyActivities<Activities>({startToCloseTimeout:'15s',retry:{maximumAttempts:3,initialInterval:'1s',maximumInterval:'5s'}});
export async function withdrawalWorkflow(identityId: string, workflowId: string) {
 const actions=await activities.prepare(identityId,workflowId);
 for(const action of actions) {
  let received=false;
  for(let i=0;i<150;i++) {
   if(await activities.receipt(identityId,action)){received=true;break;}
   await sleep('2s');
  }
  if(received)await activities.observe(identityId,action);
  else await activities.commandExpired(identityId,action);
 }
 return activities.finish(identityId,workflowId);
}
