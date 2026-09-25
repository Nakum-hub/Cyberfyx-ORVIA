import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { machineAuthority } from '../../../backend/auth/src/machine.ts';
import type { MachineIdentity } from '../../../backend/auth/src/machine.ts';
import { observePostgresCatalog } from '../../../connectors/src/discovery/postgres-catalog.ts';
import { audit,predicate,scopeValues,type Context } from '../../../backend/domain/src/shared/transaction.ts';
import { CatalogDiscoveryObservation } from '../../../shared/contracts/src/index.ts';

async function openCatalogGap(c:Context,scope:string[],targetId:string,source:'CATALOG_SCHEMA_CHANGED'|'CATALOG_READ_EXHAUSTED',
  description:string,evidenceReference:string|null){
  await c.tx.query(`INSERT INTO app.coverage_gaps
    (tenant_id,legal_entity_id,environment_id,id,source,subject_kind,subject_id,severity,description,evidence_reference)
    SELECT $1,$2,$3,$4,$5,'CATALOG_TARGET',$6,'HIGH',$7,$8
    WHERE NOT EXISTS(SELECT 1 FROM app.coverage_gaps WHERE ${predicate} AND source=$5
      AND subject_kind='CATALOG_TARGET' AND subject_id=$6 AND state IN ('OPEN','IN_PROGRESS'))`,
  [...scope,randomUUID(),source,targetId,description,evidenceReference]);
}

export async function sweepCatalogDiscovery(
  scoped:<T>(id:string,work:(c:Context)=>Promise<T>)=>Promise<T>,
  workerIds:readonly string[],observerIdentities:readonly MachineIdentity[],observerPool:pg.Pool,
) {
  let processed=0;
  for(const id of workerIds)await scoped(id,async c=>{
    const scope=scopeValues(c.actor);
    const observer=observerIdentities.find(candidate=>candidate.scope.tenant_id===scope[0]&&
      candidate.scope.legal_entity_id===scope[1]&&candidate.scope.environment_id===scope[2]);
    const jobs=await c.tx.query(`SELECT j.target_id,j.attempts,t.schema_name,t.relation_name FROM app.catalog_discovery_jobs j
      JOIN app.catalog_discovery_targets t USING(tenant_id,legal_entity_id,environment_id)
      WHERE j.tenant_id=$1 AND j.legal_entity_id=$2 AND j.environment_id=$3 AND t.id=j.target_id
        AND t.state='APPROVED' AND j.state<>'EXHAUSTED' AND j.next_run_at<=clock_timestamp()
      ORDER BY j.next_run_at,j.target_id LIMIT 10 FOR UPDATE OF j SKIP LOCKED`,scope);
    for(const job of jobs.rows){
      await c.tx.query('SAVEPOINT catalog_discovery_item');
      try{
        if(!observer)throw new Error('Observer identity unavailable');
        const result=(await observePostgresCatalog(observerPool,machineAuthority(observer),
          [{schema:job.schema_name,relation:job.relation_name}]))[0]!;
        if(result.scope.tenant_id!==scope[0]||result.scope.legal_entity_id!==scope[1]||result.scope.environment_id!==scope[2])
          throw new Error('Observer scope mismatch');
        const record=CatalogDiscoveryObservation.parse({id:randomUUID(),target_id:job.target_id,
          state:result.state,observed_at:result.observed_at,digest:result.digest,columns:result.columns,
          limits:result.limits,recorded_by:observer.id});
        const prior=(await c.tx.query(`SELECT digest,state FROM app.catalog_discovery_observations
          WHERE ${predicate} AND target_id=$4 ORDER BY observed_at DESC,id DESC LIMIT 1`,[...scope,job.target_id])).rows[0];
        await c.tx.query(`INSERT INTO app.catalog_discovery_observations
          (tenant_id,legal_entity_id,environment_id,id,target_id,state,observed_at,digest,columns,limits,recorded_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[...scope,record.id,record.target_id,record.state,
          record.observed_at,record.digest,JSON.stringify(record.columns),JSON.stringify(record.limits),record.recorded_by]);
        if(prior?.state==='OBSERVED_METADATA'&&record.state==='OBSERVED_METADATA'&&prior.digest!==record.digest){
          await openCatalogGap(c,scope,job.target_id,'CATALOG_SCHEMA_CHANGED',
            'The independently read column metadata changed. Review data mapping and affected controls.',record.id);
          await audit(c,'catalog_discovery.schema_changed',record.id);
        }
        await c.tx.query(`UPDATE app.catalog_discovery_jobs SET state='READY',attempts=0,last_error_code=NULL,
          last_run_at=clock_timestamp(),next_run_at=clock_timestamp()+interval '1 hour'
          WHERE ${predicate} AND target_id=$4`,[...scope,job.target_id]);
        await audit(c,'catalog_discovery.observed',record.id);
        await c.tx.query('RELEASE SAVEPOINT catalog_discovery_item');
      }catch{
        await c.tx.query('ROLLBACK TO SAVEPOINT catalog_discovery_item');
        const attempts=Math.min(3,Number(job.attempts)+1),state=attempts===3?'EXHAUSTED':'RETRY';
        await c.tx.query(`UPDATE app.catalog_discovery_jobs SET state=$5,attempts=$6,last_error_code='CATALOG_READ_FAILED',
          last_run_at=clock_timestamp(),next_run_at=clock_timestamp()+($7::integer*interval '1 minute')
          WHERE ${predicate} AND target_id=$4`,[...scope,job.target_id,state,attempts,2**(attempts-1)]);
        if(state==='EXHAUSTED')await openCatalogGap(c,scope,job.target_id,'CATALOG_READ_EXHAUSTED',
          'The local catalog reader exhausted bounded retries. No current source read is available.',null);
        await audit(c,'catalog_discovery.read_failed',job.target_id);
      }
      processed++;
    }
  });
  return processed;
}
