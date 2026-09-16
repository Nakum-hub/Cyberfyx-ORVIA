import assert from 'node:assert/strict';
import { randomBytes,randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { connectDatabase,bootstrapProbes } from '../../packages/db/src/index.ts';
import { loadProfile } from '../../packages/testing/src/config.ts';
import { writeEvidence,safeError } from '../../packages/testing/src/evidence.ts';
import { resetBootstrap } from '../../packages/testing/src/reset.ts';
import { connectTemporal } from '../../apps/worker/src/probe-client.ts';
import { createProbeWorker } from '../../apps/worker/src/probe-worker.ts';

const profile=loadProfile();
const id=randomUUID(),marker=`syn_probe_${randomBytes(16).toString('hex')}`;
const assertions:{id:string;result:'PASS';actual:unknown}[]=[];
try{
  const {pool,db}=connectDatabase(profile);
  try{await db.insert(bootstrapProbes).values({id,marker});assert.equal((await pool.query('SELECT marker FROM bootstrap_probes WHERE id=$1',[id])).rows[0]?.marker,marker);}
  finally{await pool.end();}
  assertions.push({id:'drizzle-write-postgres-read',result:'PASS',actual:{id,marker}});
  const first=await connectTemporal(profile);
  let runId:string|undefined;
  try{
    const {worker,connection}=await createProbeWorker();
    try{
      await worker.runUntil(async()=>{
        const handle=await first.client.workflow.start('bootstrapProbe',{workflowId:`a00-probe-${id}`,taskQueue:'a00-bootstrap-probes',args:[marker],workflowExecutionTimeout:'60s'});
        runId=handle.firstExecutionRunId;
        assert.equal(await handle.result(),marker);
      });
    }finally{await connection.close();}
  }finally{await first.connection.close();}
  assertions.push({id:'real-temporal-worker-execution',result:'PASS',actual:{workflow_id:`a00-probe-${id}`,run_id:runId}});
  // Only these two named disposable profile services; no volume deletion.
  const restart=spawnSync('docker',['restart',`${profile.compose_project}-postgres-1`,`${profile.compose_project}-temporal-1`],{encoding:'utf8',windowsHide:true,timeout:60000});
  assert.equal(restart.status,0,'Profile service restart must succeed');
  let persistence=false;
  for(let attempt=0;attempt<20&&!persistence;attempt++){
    const dbAfter=connectDatabase(profile);
    try{
      assert.equal((await dbAfter.pool.query('SELECT marker FROM bootstrap_probes WHERE id=$1',[id])).rows[0]?.marker,marker);
      const after=await connectTemporal(profile);
      try{
        const handle=after.client.workflow.getHandle(`a00-probe-${id}`,runId);
        assert.equal(await handle.result(),marker);
        const history=await handle.fetchHistory();
        assert.ok((history.events?.length??0)>2);
        assertions.push({id:'persisted-after-service-restart',result:'PASS',actual:{database:profile.database,workflow_id:`a00-probe-${id}`,events:history.events?.length,marker}});
      }finally{await after.connection.close();}
      persistence=true;
    }catch(error){if(attempt===19)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
    finally{await dbAfter.pool.end();}
  }
  assert.equal(persistence,true);
  await assert.rejects(resetBootstrap(profile.profile,'WRONG_CONFIRMATION'));
  await assert.rejects(resetBootstrap('customer-production','customer-production-bootstrap-only'));
  const verifyDb=connectDatabase(profile);
  try{assert.equal((await verifyDb.pool.query('SELECT marker FROM bootstrap_probes WHERE id=$1',[id])).rows[0]?.marker,marker);}
  finally{await verifyDb.pool.end();}
  assertions.push({id:'invalid-reset-denied-probe-preserved',result:'PASS',actual:'Wrong confirmation and unknown profile denied; marker still present.'});
  writeEvidence('service-integration',{profile:profile.profile,assertions,result:'PASS',limitations:['T01/T28 bootstrap subset only. No claim for application auth, business workflows, consent recovery or full demo reset.']});
}catch(error){writeEvidence('service-integration',{profile:profile.profile,assertions,result:'FAIL',error:safeError(error)});console.error(safeError(error));process.exitCode=1;}
