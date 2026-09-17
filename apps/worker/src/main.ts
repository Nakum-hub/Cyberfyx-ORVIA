import { createWithdrawalWorker,dispatchOutbox } from './withdrawal-worker.ts';
import { safeError } from '../../../packages/testing/src/evidence.ts';
const runtime=await createWithdrawalWorker();let stopped=false;
const shutdown=()=>{stopped=true;runtime.worker.shutdown();};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);process.on('message',message=>{if(message==='orvia-stop')shutdown();});
try {
 await runtime.worker.runUntil(async()=>{
  while(!stopped){await dispatchOutbox(runtime);await new Promise(resolve=>setTimeout(resolve,2000));}
 });
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await runtime.connection.close();await runtime.close();}

if(process.connected)process.disconnect();
