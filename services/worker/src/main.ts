import { createWithdrawalWorker,dispatchOutbox } from './withdrawal-worker.ts';
import { sweepAiGovernance } from './ai-governance-monitor.ts';
import { sweepCatalogDiscovery } from './catalog-discovery.ts';
import { observerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { safeError } from '../../../shared/testing/src/evidence.ts';
import { Runtime } from '@temporalio/worker';
// This entry point owns signal ordering, including draining its outbox loop.
Runtime.install({shutdownSignals:[]});
let stopped=false;
// runUntil shuts down the Temporal worker after this polling promise settles.
// Stopping the worker first races the in-flight dispatch/sleep and is an error.
const shutdown=()=>{stopped=true;};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);process.on('message',message=>{if(message==='orvia-stop')shutdown();});
const runtime=await createWithdrawalWorker();
try {
 await runtime.worker.runUntil(async()=>{
  while(!stopped){await dispatchOutbox(runtime);await sweepAiGovernance(runtime.scoped,runtime.enrollment.identities.map(identity=>identity.id));
   await sweepCatalogDiscovery(runtime.scoped,runtime.enrollment.identities.map(identity=>identity.id),
    observerEnrollment(runtime.config).identities,runtime.observer);
   await new Promise(resolve=>setTimeout(resolve,2000));}
 });
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await runtime.connection.close();await runtime.close();}

if(process.connected)process.disconnect();
