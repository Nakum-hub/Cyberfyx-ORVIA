import { createHash } from 'node:crypto';
import type pg from 'pg';
import type { Authority } from '../../../database/customer/src/runtime.ts';

export type ApprovedRelation = Readonly<{schema:string;relation:string}>;
export type CatalogColumn = Readonly<{name:string;data_type:string;nullable:boolean}>;
export type CatalogResult = Readonly<{
  scope:Authority['scope'];schema:string;relation:string;
  state:'OBSERVED_METADATA'|'MISSING'|'TRUNCATED';columns:CatalogColumn[];
  observed_at:string;digest:string|null;limits:string[];
}>;

const identifier=/^[a-z][a-z0-9_]{0,62}$/;
const MAX_RELATIONS=20;
const MAX_COLUMNS=200;

/** Reads only catalog metadata from an explicitly approved relation. It never
 * selects record values, infers a personal-data category or writes a target. */
export async function observePostgresCatalog(pool:pg.Pool,actor:Authority,allowlist:readonly ApprovedRelation[]):Promise<CatalogResult[]> {
  if(actor.actor_domain!=='MACHINE'||actor.role!=='OBSERVER'||!actor.capabilities.includes('target.observe')||
    !Number.isFinite(Date.parse(actor.expires_at))||Date.parse(actor.expires_at)<=Date.now())
    throw new Error('Current observer machine authority required');
  if(!allowlist.length||allowlist.length>MAX_RELATIONS)throw new Error('Invalid relation allowlist size');
  const keys=new Set<string>();
  for(const item of allowlist){
    if(!identifier.test(item.schema)||!identifier.test(item.relation))throw new Error('Invalid approved relation identifier');
    const key=`${item.schema}.${item.relation}`;
    if(keys.has(key))throw new Error('Duplicate approved relation');
    keys.add(key);
  }
  const tx=await pool.connect();
  try{
    await tx.query('BEGIN READ ONLY');
    await tx.query("SET LOCAL statement_timeout = '5000ms'");
    const role=(await tx.query('SELECT current_user name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    if(!role||role.rolsuper||role.rolbypassrls||role.name!=='orvia_target_observer')throw new Error('Least-privilege observer role required');
    await tx.query("SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true)",
      [actor.scope.tenant_id,actor.scope.legal_entity_id,actor.scope.environment_id,actor.actor_id]);
    const results:CatalogResult[]=[];
    for(const item of allowlist){
      const rows=await tx.query(`SELECT a.attname AS name,pg_catalog.format_type(a.atttypid,a.atttypmod) AS data_type,
        NOT a.attnotnull AS nullable,
        has_table_privilege(current_user,c.oid,'SELECT') AS can_read,
        has_table_privilege(current_user,c.oid,'INSERT') OR has_table_privilege(current_user,c.oid,'UPDATE')
          OR has_table_privilege(current_user,c.oid,'DELETE') OR has_table_privilege(current_user,c.oid,'TRUNCATE') AS can_mutate
        FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid
        JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
        WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind IN ('r','p','v','m')
          AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum LIMIT $3`,
        [item.schema,item.relation,MAX_COLUMNS+1]);
      if(rows.rows.some(row=>!row.can_read||row.can_mutate))throw new Error('Observer target permission is not read-only');
      const truncated=rows.rows.length>MAX_COLUMNS;
      const columns=rows.rows.slice(0,MAX_COLUMNS).map(row=>({name:String(row.name),data_type:String(row.data_type),nullable:Boolean(row.nullable)}));
      const state=rows.rows.length===0?'MISSING':truncated?'TRUNCATED':'OBSERVED_METADATA';
      const digest=state==='OBSERVED_METADATA'?createHash('sha256').update(JSON.stringify({schema:item.schema,relation:item.relation,columns})).digest('hex'):null;
      results.push({scope:actor.scope,schema:item.schema,relation:item.relation,state,columns,
        observed_at:new Date().toISOString(),digest,limits:[
          'Catalog metadata only; no record values or personal-data classification were read.',
          ...(truncated?['Column limit reached; the relation inventory is incomplete.']:[]),
        ]});
    }
    await tx.query('COMMIT');
    return results;
  }catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
}
