import { NativeConnection,Worker } from '@temporalio/worker';
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { WorkflowIdReusePolicy } from '@temporalio/common';
import { createPrivateKey,randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeConfig } from '../../../backend/auth/src/config.ts';
import { workerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { servicePool,machineAuthority } from '../../../backend/auth/src/machine.ts';
import { scopedTransaction } from '../../../database/customer/src/runtime.ts';
import { prepareWorkflow,actionReceipt,observeAction,finishWorkflow } from '../../../backend/domain/src/workflow/workflow.ts';
import { predicate,scopeValues,audit,type Context } from '../../../backend/domain/src/shared/transaction.ts';
import { connectTemporal } from './probe-client.ts';
import { reconcile } from '../../../backend/domain/src/evidence/evidence.ts';

export function workflowActivities() {
 const config=runtimeConfig();const enrollment=workerEnrollment(config);
 const control=servicePool(config,'orvia_worker');const observer=servicePool(config,'orvia_target_observer');
 const key=createPrivateKey(readFileSync(resolve(config.directory,'worker/signing-key.pem')));
 function identityFor(id: string) {const identity=enrollment.identities.find(i=>i.id===id);if(!identity)throw new Error('Worker identity not enrolled');return identity;}
 function scoped<T>(id: string,work: (c: Context)=>Promise<T>) {
  const actor=machineAuthority(identityFor(id));return scopedTransaction(control,actor,tx=>work({tx,actor,requestId:randomUUID()}));
 }
 const activities={
  prepare:(id: string,workflow: string)=>scoped(id,c=>prepareWorkflow(c,workflow,{key,key_id:enrollment.signing_key_id,installation_id:enrollment.installation_id,agent_id:identityFor(id).agent_id})),
  receipt:(id: string,action: string)=>scoped(id,async c=>(await actionReceipt(c,action))?.execution_state??null),
  reconcile:(id:string,operation:string)=>scoped(id,c=>reconcile(c,operation,observer)),
  observe:(id: string,action: string)=>scoped(id,c=>observeAction(c,action,observer)),
  commandExpired:(id: string,action: string)=>scoped(id,async c=>{
   await c.tx.query(`UPDATE app.action_plans SET execution_state='EFFECT_UNKNOWN' WHERE ${predicate} AND id=$4 AND execution_state='PENDING'`,[...scopeValues(c.actor),action]);
   await audit(c,'command.receipt-missing',action);
  }),
  finish:(id: string,workflow: string)=>scoped(id,c=>finishWorkflow(c,workflow)),
 };
 return {activities,scoped,enrollment,config,close:()=>Promise.all([control.end(),observer.end()])};
}
export type Activities=ReturnType<typeof workflowActivities>['activities'];
export async function createWithdrawalWorker() {
 const runtime=workflowActivities();const connection=await NativeConnection.connect({address:`127.0.0.1:${runtime.config.temporal_port}`});
 const worker=await Worker.create({connection,namespace:runtime.config.temporal_namespace,taskQueue:'orvia-withdrawals-v1',workflowsPath:fileURLToPath(new URL('./withdrawal-workflows.ts',import.meta.url)),activities:runtime.activities,maxConcurrentActivityTaskExecutions:2,maxConcurrentWorkflowTaskExecutions:2,maxCachedWorkflows:10});
 return {...runtime,worker,connection};
}
export async function dispatchOutbox(runtime: ReturnType<typeof workflowActivities>, afterStart?: (workflowId: string,eventId: string)=>Promise<void>) {
 const temporal=await connectTemporal(runtime.config);let count=0;
 try {
  for(const identity of runtime.enrollment.identities)await runtime.scoped(identity.id,async c=>{
   const outbox=await c.tx.query(`SELECT id,event_id,workflow_id FROM app.outbox_events WHERE ${predicate} AND dispatched_at IS NULL ORDER BY created_at,id LIMIT 20 FOR UPDATE SKIP LOCKED`,scopeValues(c.actor));
   for(const event of outbox.rows) {
    const workflowId=`orvia:${identity.scope.tenant_id}:${identity.scope.environment_id}:${event.event_id}`;
    try {await temporal.client.workflow.start('withdrawalWorkflow',{workflowId,taskQueue:'orvia-withdrawals-v1',args:[identity.id,event.workflow_id],workflowIdReusePolicy:WorkflowIdReusePolicy.REJECT_DUPLICATE});}
    catch(error){if(!(error instanceof WorkflowExecutionAlreadyStartedError))throw error;}
    // Test-only injection at the real durable-start/database-commit boundary.
    // No request or environment flag can enable this hook in the runtime CLI.
    if(afterStart)await afterStart(workflowId,event.event_id);
    await c.tx.query(`UPDATE app.outbox_events SET dispatched_at=now() WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),event.id]);
    await audit(c,'outbox.dispatched',event.id);count++;
   }
   const reconciliations=await c.tx.query(`SELECT id FROM app.reconciliations WHERE ${predicate} AND dispatched_at IS NULL ORDER BY created_at,id LIMIT 20 FOR UPDATE SKIP LOCKED`,scopeValues(c.actor));
   for(const row of reconciliations.rows) {
    const workflowId=`orvia-reconcile:${identity.scope.tenant_id}:${identity.scope.environment_id}:${row.id}`;
    try{await temporal.client.workflow.start('reconciliationWorkflow',{workflowId,taskQueue:'orvia-withdrawals-v1',args:[identity.id,row.id],workflowIdReusePolicy:WorkflowIdReusePolicy.REJECT_DUPLICATE});}catch(error){if(!(error instanceof WorkflowExecutionAlreadyStartedError))throw error;}
    await c.tx.query(`UPDATE app.reconciliations SET dispatched_at=clock_timestamp() WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),row.id]);await audit(c,'reconciliation.dispatched',row.id);count++;
   }
  });
 }finally{await temporal.connection.close();}
 return count;
}
