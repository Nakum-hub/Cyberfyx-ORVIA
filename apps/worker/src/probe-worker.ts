import { NativeConnection,Worker } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import { loadProfile } from '../../../packages/testing/src/config.ts';
export async function createProbeWorker(){
  const profile=loadProfile();
  const connection=await NativeConnection.connect({address:`127.0.0.1:${profile.temporal_port}`});
  try{
    const worker=await Worker.create({connection,namespace:profile.temporal_namespace,taskQueue:'a00-bootstrap-probes',workflowsPath:fileURLToPath(new URL('./probe-workflows.ts',import.meta.url)),maxConcurrentWorkflowTaskExecutions:2,maxCachedWorkflows:4});
    return {worker,connection};
  }catch(error){await connection.close();throw error;}
}
