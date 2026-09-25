import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { audit, predicate, scopeValues, requireOne, type Context } from '../../../backend/domain/src/shared/transaction.ts';

export function classifyAiInput(asset:{provenance:string;fresh_until:Date|string|null;tombstoned_at:Date|string|null;
  last_seen_at?:Date|string|null;system_id?:string;source_observation_id?:string|null},now:number,
  source?:{state:string;observed_at:Date|string;digest:string|null;system_id:string;target_state:string;job_state:string;next_run_at:Date|string;latest_id:string}|null) {
  // The graph API currently lets a staff author label an asset OBSERVED. That
  // label and its generated freshness timestamp are still an assertion. Until
  // a connector-backed observation with a separate source receipt is linked,
  // no inventory state can satisfy this check.
  const currentLabel=asset.provenance==='OBSERVED'&&asset.fresh_until!==null&&
    new Date(asset.fresh_until).getTime()>now&&asset.tombstoned_at===null;
  const independent=currentLabel&&!!source&&!!asset.source_observation_id&&source.latest_id===asset.source_observation_id&&
    source.state==='OBSERVED_METADATA'&&!!source.digest&&source.system_id===asset.system_id&&
    source.target_state==='APPROVED'&&source.job_state==='READY'&&new Date(source.next_run_at).getTime()>now&&
    new Date(source.observed_at).getTime()+3600000>now&&new Date(asset.last_seen_at??0).getTime()===new Date(source.observed_at).getTime();
  if(independent)return {state:'RECORDED' as const,title:'Input inventory independently read',
    detail:'A current approved catalog read confirms the dataset relation metadata. It does not classify row values or verify external AI behaviour.'};
  return {state:'FINDING' as const,title:'Input inventory needs an independent fresh read',
    detail:currentLabel
      ? 'The linked input asset is labelled observed, but no independent connector read is linked. Review the allowlisted source and collect a separate source receipt.'
      : 'The linked input asset is declared, stale or erased. Review the allowlisted source and collect an independent fresh observation.'};
}

export function aiMonitorRetryPlan(priorAttempts:number) {
  const attempts=Math.min(3,Math.max(0,priorAttempts)+1);
  return {attempts,state:attempts===3?'EXHAUSTED' as const:'RETRY' as const,delayMinutes:2**(attempts-1)};
}

/** A local metadata check. It never invokes a model, calls a target, or calls a
 *  recorded assertion "verified". The database job and event commit together. */
export async function sweepAiGovernance(
  scoped:<T>(id:string,work:(c:Context)=>Promise<T>)=>Promise<T>, identities:readonly string[],
) {
  let processed=0;
  for(const identity of identities) await scoped(identity,async c=>{
    const scope=scopeValues(c.actor);
    const jobs=await c.tx.query(`SELECT ai_system_id,attempts FROM app.ai_monitor_jobs WHERE ${predicate} AND state<>'EXHAUSTED' AND next_run_at<=clock_timestamp()
      ORDER BY next_run_at,ai_system_id LIMIT 20 FOR UPDATE SKIP LOCKED`,scope);
    for(const job of jobs.rows) {
      await c.tx.query('SAVEPOINT ai_monitor_item');
      try {
        const system=requireOne((await c.tx.query(`SELECT input_asset_id FROM app.ai_systems WHERE ${predicate} AND id=$4`,[...scope,job.ai_system_id])).rows);
        const asset=requireOne((await c.tx.query(`SELECT provenance,fresh_until,last_seen_at,review_state,tombstoned_at,system_id,source_observation_id
          FROM app.data_assets WHERE ${predicate} AND id=$4`,[...scope,system.input_asset_id])).rows);
        const source=asset.source_observation_id?(await c.tx.query(`SELECT o.state,o.observed_at,o.digest,t.system_id,t.state AS target_state,
          j.state AS job_state,j.next_run_at,
          (SELECT id FROM app.catalog_discovery_observations newer WHERE newer.tenant_id=o.tenant_id
            AND newer.legal_entity_id=o.legal_entity_id AND newer.environment_id=o.environment_id
            AND newer.target_id=o.target_id ORDER BY observed_at DESC,id DESC LIMIT 1) AS latest_id
          FROM app.catalog_discovery_observations o
          JOIN app.catalog_discovery_targets t ON t.tenant_id=o.tenant_id AND t.legal_entity_id=o.legal_entity_id
            AND t.environment_id=o.environment_id AND t.id=o.target_id
          JOIN app.catalog_discovery_jobs j ON j.tenant_id=o.tenant_id AND j.legal_entity_id=o.legal_entity_id
            AND j.environment_id=o.environment_id AND j.target_id=o.target_id
          WHERE o.tenant_id=$1 AND o.legal_entity_id=$2 AND o.environment_id=$3 AND o.id=$4`,
          [...scope,asset.source_observation_id])).rows[0]:null;
        const {state,title,detail}=classifyAiInput(asset,Date.now(),source);
        const previous=(await c.tx.query(`SELECT state,title FROM app.ai_governance_events WHERE ${predicate} AND ai_system_id=$4 AND kind='MONITORING'
          ORDER BY recorded_at DESC,id DESC LIMIT 1`,[...scope,job.ai_system_id])).rows[0];
        if(previous?.state!==state||previous?.title!==title) {
          const id=randomUUID();
          const document=S.AiGovernanceEvent.parse({id,ai_system_id:job.ai_system_id,kind:'MONITORING',state,title,detail,
            source_reference:state==='RECORDED'?`catalog-observation:${asset.source_observation_id}`:`asset:${system.input_asset_id}`,policy_version_id:null,incident_id:null,
            recorded_at:new Date().toISOString(),recorded_by:c.actor.actor_id});
          await c.tx.query(`INSERT INTO app.ai_governance_events(tenant_id,legal_entity_id,environment_id,id,ai_system_id,kind,state,title,detail,source_reference,policy_version_id,incident_id,recorded_by,document)
            VALUES($1,$2,$3,$4,$5,'MONITORING',$6,$7,$8,$9,NULL,NULL,$10,$11)`,
            [...scope,id,job.ai_system_id,state,title,detail,document.source_reference,c.actor.actor_id,document]);
          await audit(c,'ai_governance.monitor',id);
        }
        await c.tx.query(`UPDATE app.ai_monitor_jobs SET state='READY',attempts=0,last_error_code=NULL,last_run_at=clock_timestamp(),
          next_run_at=clock_timestamp()+interval '1 hour' WHERE ${predicate} AND ai_system_id=$4`,[...scope,job.ai_system_id]);
        await c.tx.query('RELEASE SAVEPOINT ai_monitor_item');
      }catch(error) {
        await c.tx.query('ROLLBACK TO SAVEPOINT ai_monitor_item');
        const retry=aiMonitorRetryPlan(Number(job.attempts));
        const code=error instanceof Error&&error.name==='AccessError'?'REFERENCE_UNAVAILABLE':'CHECK_ERROR';
        await c.tx.query(`UPDATE app.ai_monitor_jobs SET attempts=$4,state=$5,last_error_code=$6,
          next_run_at=clock_timestamp()+($7::integer * interval '1 minute') WHERE ${predicate} AND ai_system_id=$8`,
          [...scope,retry.attempts,retry.state,code,retry.delayMinutes,job.ai_system_id]);
        await audit(c,'ai_governance.monitor-error',job.ai_system_id);
      }
      processed++;
    }
  });
  return processed;
}
