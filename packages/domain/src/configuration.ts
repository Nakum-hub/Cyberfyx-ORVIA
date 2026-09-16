import { randomUUID } from 'node:crypto';
import * as S from '../../contracts/src/index.ts';
import { digest } from '../../contracts/src/crypto.ts';
import { AccessError } from '../../authz/src/index.ts';
import { audit, predicate, scopeValues, requireOne, selectorScope, paged, type Context, type Page } from './transaction.ts';

const configurations={purposes:{table:'purpose_versions',schema:S.Purpose},notices:{table:'notice_versions',schema:S.Notice},policies:{table:'policy_versions',schema:S.Policy},systems:{table:'systems',schema:S.System}} as const;
export type ConfigurationKind=keyof typeof configurations;
export async function configurationList(c: Context, kind: ConfigurationKind, page: Page) {
  const {table,schema}=configurations[kind];
  const result=await c.tx.query(`SELECT * FROM app.${table} WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
  if(kind==='systems')for(const row of result.rows){const checked=(await c.tx.query(`SELECT * FROM app.system_checks WHERE ${predicate} AND system_id=$4 ORDER BY checked_at DESC,id DESC LIMIT 1`,[...scopeValues(c.actor),row.id])).rows[0];if(checked)row.document={...row.document,supports_read:checked.supports_read,supports_restrict:checked.supports_restrict,checked_at:checked.checked_at.toISOString()};}
  return paged(result.rows.map(row=>schema.parse({...row.document,...(kind==='purposes'||kind==='policies'?{status:row.status}:{}),...(kind==='policies'||kind==='notices'?{published_at:row.published_at?.toISOString()??null}:{})})),page);
}
export async function createConfiguration(c: Context, kind: ConfigurationKind, input: unknown) {
  const scope=scopeValues(c.actor);const id=randomUUID();const version_id=randomUUID();
  let document;
  if(kind==='purposes') {
    const value=S.PurposeCreate.parse(input);selectorScope(c,value);
    document=S.Purpose.parse({...value,id,version_id,version:1,status:'DRAFT'});
    await c.tx.query('INSERT INTO app.purpose_versions VALUES($1,$2,$3,$4,$5,1,$6,\'DRAFT\',$7)',[...scope,id,version_id,value.code,document]);
  } else if(kind==='notices') {
    const value=S.NoticeCreate.parse(input);
    requireOne((await c.tx.query(`SELECT id FROM app.purpose_versions WHERE ${predicate} AND id=$4`,[...scope,value.purpose_id])).rows);
    document=S.Notice.parse({...value,id,version_id,content_digest:digest(value),published_at:null});
    await c.tx.query('INSERT INTO app.notice_versions VALUES($1,$2,$3,$4,$5,$6,$7,NULL)',[...scope,id,version_id,value.purpose_id,document]);
  } else if(kind==='systems') {
    const value=S.SystemCreate.parse(input);selectorScope(c,value);
    document=S.System.parse({...value,id,capability_version:'1.0.0',supports_restrict:value.connector!=='LEGACY_MANUAL',supports_read:value.connector!=='LEGACY_MANUAL',checked_at:null});
    await c.tx.query('INSERT INTO app.systems VALUES($1,$2,$3,$4,$5,$6)',[...scope,id,value.connector,document]);
  } else {
    const parsed=S.PolicyCreate.parse(input);const value={...parsed,system_ids:[...new Set(parsed.system_ids)].sort()};
    if(value.system_ids.length!==parsed.system_ids.length)throw new AccessError(400,'VALIDATION_ERROR');
    const purpose=requireOne((await c.tx.query(`SELECT code FROM app.purpose_versions WHERE ${predicate} AND id=$4`,[...scope,value.purpose_id])).rows);
    if((purpose.code==='promotional_marketing')!==(value.condition==='AFFIRMATIVE_MARKETING_CONSENT'))throw new AccessError(400,'VALIDATION_ERROR');
    requireOne((await c.tx.query(`SELECT id FROM app.notice_versions WHERE ${predicate} AND version_id=$4 AND purpose_id=$5`,[...scope,value.notice_version_id,value.purpose_id])).rows);
    const systems=await c.tx.query(`SELECT id FROM app.systems WHERE ${predicate} AND id=ANY($4::uuid[])`,[...scope,value.system_ids]);
    if(systems.rowCount!==value.system_ids.length)throw new AccessError(404,'NOT_FOUND');
    const binding={...value,id,version_id,author_id:c.actor.actor_id};
    document=S.Policy.parse({...binding,digest:digest(binding),status:'DRAFT',published_at:null});
    await c.tx.query('INSERT INTO app.policy_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,\'DRAFT\',$10,NULL)',[...scope,id,version_id,value.purpose_id,value.notice_version_id,c.actor.actor_id,document.digest,document]);
    for(const system of value.system_ids)await c.tx.query('INSERT INTO app.policy_systems VALUES($1,$2,$3,$4,$5,$6)',[...scope,randomUUID(),version_id,system]);
  }
  await audit(c,`${kind}.create`,id);return document;
}
export async function publicationCandidate(c: Context, id: string, value: {version_id:string;digest:string}) {
  const candidate=requireOne((await c.tx.query(`SELECT purpose_id FROM app.policy_versions WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id])).rows);
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([...scopeValues(c.actor),'publication',candidate.purpose_id])]);
  const row=requireOne((await c.tx.query(`SELECT * FROM app.policy_versions WHERE ${predicate} AND id=$4 FOR UPDATE`,[...scopeValues(c.actor),id])).rows);
  if(row.author_id===c.actor.actor_id)throw new AccessError(403,'FORBIDDEN');
  if(row.version_id!==value.version_id||row.digest!==value.digest||row.status!=='DRAFT')throw new AccessError(409,'IDEMPOTENCY_CONFLICT');
  return row;
}
export async function recordPublicationProof(c: Context, id: string, input: unknown, sessionId: string) {
  const value=S.PolicyReauthenticate.parse(input);await publicationCandidate(c,id,value);
  const proof=S.PublicationProof.parse({reauthentication_id:randomUUID(),version_id:value.version_id,digest:value.digest,expires_at:new Date(Date.now()+120000).toISOString()});
  await c.tx.query('INSERT INTO app.publication_proofs VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL)',[...scopeValues(c.actor),proof.reauthentication_id,c.actor.actor_id,sessionId,id,value.version_id,value.digest,proof.expires_at]);
  await audit(c,'policy.reauthenticate',id);return proof;
}
export async function publishPolicy(c: Context, id: string, input: unknown, sessionId: string) {
  const value=S.PolicyPublish.parse(input);const row=await publicationCandidate(c,id,value);const scope=scopeValues(c.actor);
  // Serialize publication for this purpose, including concurrent distinct drafts.
  await c.tx.query(`SELECT id FROM app.purpose_versions WHERE ${predicate} AND id=$4 FOR UPDATE`,[...scope,row.purpose_id]);
  await c.tx.query(`SELECT id FROM app.policy_versions WHERE ${predicate} AND purpose_id=$4 AND status='PUBLISHED' FOR UPDATE`,[...scope,row.purpose_id]);
  await c.tx.query(`SELECT id FROM app.notice_versions WHERE ${predicate} AND version_id=$4 FOR UPDATE`,[...scope,row.notice_version_id]);
  const binding=[...scope,value.reauthentication_id,c.actor.actor_id,sessionId,id,value.version_id,value.digest];
  // Lock first, then consume with one advancing database-clock reading. Neither
  // transaction time nor a predicate evaluated before a row-lock wait is fresh.
  await c.tx.query(`SELECT id FROM app.publication_proofs WHERE ${predicate} AND id=$4 AND actor_id=$5 AND session_id=$6 AND policy_id=$7 AND version_id=$8 AND digest=$9 FOR UPDATE`,binding);
  const proof=await c.tx.query(`WITH consumption AS MATERIALIZED (SELECT clock_timestamp() AS at)
    UPDATE app.publication_proofs SET used_at=consumption.at FROM consumption
    WHERE ${predicate} AND id=$4 AND actor_id=$5 AND session_id=$6 AND policy_id=$7 AND version_id=$8 AND digest=$9
    AND used_at IS NULL AND expires_at>consumption.at RETURNING id`,binding);
  if(proof.rowCount!==1)throw new AccessError(403,'FORBIDDEN');
  await c.tx.query('INSERT INTO app.policy_approvals VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now())',[...scope,randomUUID(),value.version_id,row.author_id,c.actor.actor_id,value.digest,value.reauthentication_id]);
  await c.tx.query(`UPDATE app.policy_versions SET status='SUPERSEDED' WHERE ${predicate} AND purpose_id=$4 AND status='PUBLISHED'`,[...scope,row.purpose_id]);
  const result=requireOne((await c.tx.query(`UPDATE app.policy_versions SET status='PUBLISHED',published_at=now() WHERE ${predicate} AND id=$4 RETURNING published_at`,[...scope,id])).rows);
  await c.tx.query(`UPDATE app.notice_versions SET published_at=now() WHERE ${predicate} AND version_id=$4 AND published_at IS NULL`,[...scope,row.notice_version_id]);
  await c.tx.query(`UPDATE app.purpose_versions SET status='PUBLISHED' WHERE ${predicate} AND id=$4 AND status='DRAFT'`,[...scope,row.purpose_id]);
  await audit(c,'policy.publish',id);return S.Policy.parse({...row.document,status:'PUBLISHED',published_at:result.published_at.toISOString()});
}
export async function createMapping(c: Context, input: unknown) {
  const value=S.MappingCreate.parse(input);const scope=scopeValues(c.actor);
  for(const [table,id] of [['principal_references',value.principal_id],['purpose_versions',value.purpose_id],['systems',value.system_id]])requireOne((await c.tx.query(`SELECT id FROM app.${table} WHERE ${predicate} AND id=$4`,[...scope,id])).rows);
  const id=randomUUID();const mapping=S.TargetMapping.parse({...value,id,target_subject_reference:`syn_${id.replaceAll('-','')}`,target_generation:1});
  await c.tx.query('INSERT INTO app.target_mappings VALUES($1,$2,$3,$4,$5,$6,$7,$8,1)',[...scope,id,value.principal_id,value.purpose_id,value.system_id,mapping.target_subject_reference]);
  await audit(c,'target_mapping.create',id);return mapping;
}
export async function mappingList(c: Context, page: Page) {
  const rows=await c.tx.query(`SELECT id,principal_id,purpose_id,system_id,target_subject_reference,target_generation FROM app.target_mappings WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
  return paged(rows.rows.map(row=>S.TargetMapping.parse({...row,target_generation:Number(row.target_generation)})),page);
}
export async function controlMap(c: Context,page:Page) {
  const rows=await c.tx.query(`SELECT m.purpose_id,m.system_id,m.id resource_id,s.document FROM app.target_mappings m JOIN app.systems s USING(tenant_id,legal_entity_id,environment_id) WHERE m.tenant_id=$1 AND m.legal_entity_id=$2 AND m.environment_id=$3 AND s.id=m.system_id AND ($4::uuid IS NULL OR m.id>$4) ORDER BY m.id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
  const edges=[];for(const row of rows.rows.slice(0,page.limit)){const latest=(await c.tx.query(`SELECT o.observation,m.target_generation FROM app.observations o JOIN app.action_plans a ON(a.id=o.action_id AND a.tenant_id=o.tenant_id AND a.legal_entity_id=o.legal_entity_id AND a.environment_id=o.environment_id) JOIN app.target_mappings m ON(m.id=a.resource_id AND m.tenant_id=a.tenant_id AND m.legal_entity_id=a.legal_entity_id AND m.environment_id=a.environment_id) WHERE o.tenant_id=$1 AND o.legal_entity_id=$2 AND o.environment_id=$3 AND a.resource_id=$4 ORDER BY o.created_at DESC,o.id DESC LIMIT 1`,[...scopeValues(c.actor),row.resource_id])).rows[0];const o=latest?.observation;const fresh=o&&o.method==='SCOPED_READ'&&o.target_generation===Number(latest.target_generation)&&Date.parse(o.fresh_until)>Date.now();edges.push({purpose_id:row.purpose_id,system_id:row.system_id,resource_id:row.resource_id,capability_version:row.document.capability_version,declared_restrict:row.document.supports_restrict,observed_restrict:fresh&&['OBSERVED_SATISFIED','OBSERVED_NOT_SATISFIED'].includes(o.state)?o.state==='OBSERVED_SATISFIED':null,as_of:o?.observed_at??null});}
  return S.ControlMap.parse({edges,next_cursor:rows.rows.length>page.limit?Buffer.from(rows.rows[page.limit-1].resource_id).toString('base64url'):null});
}
