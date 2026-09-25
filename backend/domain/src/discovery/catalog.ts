import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, paged, predicate, requireOne, scopeValues, type Context, type Page } from '../shared/transaction.ts';

function target(row: Record<string,unknown>) {
  return S.CatalogDiscoveryTarget.parse({id:row.id,system_id:row.system_id,schema_name:row.schema_name,
    relation_name:row.relation_name,state:row.state,created_by:row.created_by,approved_by:row.approved_by,
    created_at:(row.created_at as Date).toISOString(),
    approved_at:row.approved_at?(row.approved_at as Date).toISOString():null});
}

export async function createCatalogTarget(c:Context,input:unknown) {
  const value=S.CatalogDiscoveryTargetCreate.parse(input),scope=scopeValues(c.actor);
  // This first adapter is bound to the protected local synthetic target. A
  // declared system name alone cannot authorize access to another database.
  const system=requireOne((await c.tx.query(`SELECT connector FROM app.systems WHERE ${predicate} AND id=$4`,[...scope,value.system_id])).rows);
  if(system.connector!=='SYNTHETIC_CRM')throw new AccessError(400,'VALIDATION_ERROR',[{field:'system_id',code:'unsupported_connector'}]);
  const id=randomUUID();
  const rows=await c.tx.query(`INSERT INTO app.catalog_discovery_targets
    (tenant_id,legal_entity_id,environment_id,id,system_id,schema_name,relation_name,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[...scope,id,value.system_id,value.schema_name,value.relation_name,c.actor.actor_id]);
  await audit(c,'catalog_discovery.target_create',id);
  return target(rows.rows[0]);
}

export async function catalogTargetList(c:Context,page:Page) {
  const rows=await c.tx.query(`SELECT * FROM app.catalog_discovery_targets WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4)
    ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
  return paged(rows.rows.map(target),page);
}

export async function catalogTargetDetail(c:Context,id:string) {
  const scope=scopeValues(c.actor);
  const row=requireOne((await c.tx.query(`SELECT * FROM app.catalog_discovery_targets WHERE ${predicate} AND id=$4`,[...scope,id])).rows);
  const job=(await c.tx.query(`SELECT state,attempts,next_run_at,last_run_at,last_error_code FROM app.catalog_discovery_jobs
    WHERE ${predicate} AND target_id=$4`,[...scope,id])).rows[0];
  const history=await c.tx.query(`SELECT id,target_id,state,observed_at,digest,columns,limits,recorded_by
    FROM app.catalog_discovery_observations WHERE ${predicate} AND target_id=$4
    ORDER BY observed_at DESC,id DESC LIMIT 101`,[...scope,id]);
  const latest=history.rows[0];
  const freshness=!latest?'NEVER_OBSERVED':row.state!=='APPROVED'||!job||job.state!=='READY'?'UNKNOWN':
    job.next_run_at.getTime()<=Date.now()||latest.observed_at.getTime()+3600000<=Date.now()?'STALE':'CURRENT';
  return S.CatalogDiscoveryDetail.parse({target:target(row),job:job?{...job,next_run_at:job.next_run_at.toISOString(),
    last_run_at:job.last_run_at?.toISOString()??null}:null,
    observations:history.rows.slice(0,100).map(entry=>({...entry,observed_at:entry.observed_at.toISOString()})),
    history_limited:history.rows.length>100,freshness});
}

export async function approveCatalogTarget(c:Context,id:string) {
  const scope=scopeValues(c.actor);
  const row=requireOne((await c.tx.query(`SELECT * FROM app.catalog_discovery_targets WHERE ${predicate} AND id=$4 FOR UPDATE`,[...scope,id])).rows);
  if(row.state!=='PENDING'||row.created_by===c.actor.actor_id)throw new AccessError(409,'EPOCH_CONFLICT');
  const approved=await c.tx.query(`UPDATE app.catalog_discovery_targets SET state='APPROVED',approved_by=$5,approved_at=clock_timestamp()
    WHERE ${predicate} AND id=$4 RETURNING *`,[...scope,id,c.actor.actor_id]);
  await c.tx.query(`INSERT INTO app.catalog_discovery_jobs(tenant_id,legal_entity_id,environment_id,target_id)
    VALUES($1,$2,$3,$4)`,[...scope,id]);
  await audit(c,'catalog_discovery.target_approve',id);
  return target(approved.rows[0]);
}

export async function disableCatalogTarget(c:Context,id:string) {
  const scope=scopeValues(c.actor);
  const row=requireOne((await c.tx.query(`SELECT state FROM app.catalog_discovery_targets WHERE ${predicate} AND id=$4 FOR UPDATE`,[...scope,id])).rows);
  if(row.state!=='APPROVED')throw new AccessError(409,'EPOCH_CONFLICT');
  const disabled=await c.tx.query(`UPDATE app.catalog_discovery_targets SET state='DISABLED'
    WHERE ${predicate} AND id=$4 RETURNING *`,[...scope,id]);
  await audit(c,'catalog_discovery.target_disable',id);
  return target(disabled.rows[0]);
}
