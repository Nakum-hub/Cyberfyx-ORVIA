// W01-A02-F01. Real HTTP, real PostgreSQL locks, test-owned synthetic rows only.
// Original-source mode labels observations; it never changes expected results.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as S from '../../../packages/contracts/src/index.ts';
import { digest } from '../../../packages/contracts/src/crypto.ts';
import { HttpFixture, authenticatorCode } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../packages/testing/src/evidence.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';

const harness=new HttpFixture();const profile=loadProfile();
if(profile.profile!=='codex-a00')throw new Error('Expiry regression is restricted to codex-a00');
const db=connectDatabase(profile).pool;
const assertions:{name:string;result:'PASS'|'FAIL';expected:unknown;actual:unknown}[]=[];
const waits:Record<string,unknown>[]=[];
const pause=()=>new Promise(resolve=>setTimeout(resolve,40));
function check(name:string,actual:unknown,expected:unknown) {
  let result:'PASS'|'FAIL'='PASS';try{assert.deepEqual(actual,expected);}catch{result='FAIL';process.exitCode=1;}
  assertions.push({name,result,expected,actual});console.log(`${result} ${name}`);
}
type Browser=ReturnType<HttpFixture['browser']>;
type PendingRequest={browser:Browser;path:string;input:unknown;key:string};
const call=(r:PendingRequest)=>r.browser.call(r.path,r.input,{'idempotency-key':r.key});
type DeadlineTable='publication_proofs'|'consent_interactions';
async function expire(table:DeadlineTable,id:string,milliseconds:number) {
  await db.query(`UPDATE app.${table} SET expires_at=clock_timestamp()+($2::int*interval '1 millisecond') WHERE id=$1`,[id,milliseconds]);
}
// Acquire without changing the row: an UPDATE that changes expiry could cause an
// EvalPlanQual recheck and conceal a stale predicate evaluated before the wait.
async function delayed(name:string,table:DeadlineTable,id:string,lock:{sql:string;values:unknown[]},request:PendingRequest) {
  await expire(table,id,3000);
  const holder=await db.connect();let pending:Promise<Response>|undefined;
  try {
    await holder.query('BEGIN');await holder.query(lock.sql,lock.values);
    const pid=Number((await holder.query('SELECT pg_backend_pid() pid')).rows[0].pid);
    pending=call(request);pending.catch(()=>{});
    const timeout=Date.now()+7000;let observed:Record<string,unknown>|undefined;
    while(Date.now()<timeout) {
      const row=(await db.query(`SELECT a.xact_start,t.expires_at,clock_timestamp() observed_at,
        a.xact_start<t.expires_at began_before_expiry,clock_timestamp()<t.expires_at waiting_before_expiry,
        a.wait_event_type FROM pg_stat_activity a CROSS JOIN app.${table} t
        WHERE t.id=$1 AND a.application_name='orvia-orvia_app' AND $2::int=ANY(pg_blocking_pids(a.pid))`,[id,pid])).rows[0];
      if(row){observed=row;break;}await pause();
    }
    if(!observed)throw new Error('Expected database lock wait was not observed');
    check(`${name}: actual transaction and wait began before expiry`,[observed.began_before_expiry,observed.waiting_before_expiry,observed.wait_event_type],[true,true,'Lock']);
    let release:Record<string,unknown>|undefined;
    while(Date.now()<timeout) {
      const row=(await db.query(`SELECT clock_timestamp() released_after,expires_at,clock_timestamp()>expires_at expired FROM app.${table} WHERE id=$1`,[id])).rows[0];
      if(row.expired){release=row;break;}await pause();
    }
    if(!release)throw new Error('Test deadline was not crossed');
    waits.push({name,token_id:id,...observed,...release});
    await holder.query('COMMIT');return await pending;
  } finally {
    await holder.query('ROLLBACK');holder.release();
    if(pending)await pending.catch(()=>{});
  }
}

try {
  await harness.start();const scenario=await createMarketingScenario(harness);
  const {owner,author,alice,scope,purpose,notice,system}=scenario;
  const scopeValues=[scope.tenant_id,scope.legal_entity_id,scope.environment_id];
  const publicationKey=JSON.stringify([...scopeValues,'publication',purpose.id]);
  const publicationLock={sql:'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',values:[publicationKey]};
  async function policySnapshot(proofId:string,key:string) {
    const result:Record<string,unknown>={};
    for(const [table,where,value] of [
      ['purpose_versions','id',purpose.id],['notice_versions','purpose_id',purpose.id],
      ['policy_versions','purpose_id',purpose.id],['publication_proofs','id',proofId],
      ['policy_approvals','proof_id',proofId],['idempotency_records','key',key],
    ])result[table!]=(await db.query(`SELECT ${table==='publication_proofs'?"to_jsonb(t)-'expires_at'":'to_jsonb(t)'} row FROM app.${table} t WHERE ${where}=$1 ORDER BY to_jsonb(t)::text`,[value])).rows;
    return digest(result);
  }
  // Covers pre-existing locks at each point before publication consumption.
  for(const mode of ['fresh','expired','publication','purpose','policy','proof','idempotency'] as const) {
    const draftResponse=await author.call('/api/v1/admin/policies',{purpose_id:purpose.id,notice_version_id:notice.version_id,condition:'AFFIRMATIVE_MARKETING_CONSENT',system_ids:[system.id],required_observation:true},{'idempotency-key':randomUUID()});
    if(draftResponse.status!==201)throw new Error('Draft setup failed');const draft=S.Policy.parse(await draftResponse.json());
    const proofResponse=await owner.call(`/api/v1/admin/policies/${draft.id}/reauthenticate`,{version_id:draft.version_id,digest:draft.digest,code:authenticatorCode(harness.users.owner!.totp_uri!)});
    if(proofResponse.status!==201)throw new Error('Proof setup failed');const proof=S.PublicationProof.parse(await proofResponse.json());
    const request={browser:owner,path:`/api/v1/admin/policies/${draft.id}/publish`,input:{version_id:draft.version_id,digest:draft.digest,reauthentication_id:proof.reauthentication_id},key:randomUUID()};
    if(mode==='expired')await expire('publication_proofs',proof.reauthentication_id,-1000);
    const before=await policySnapshot(proof.reauthentication_id,request.key);
    let response:Response;
    if(mode==='fresh'||mode==='expired')response=await call(request);
    else {
      const lock=mode==='publication'?publicationLock:mode==='idempotency'?{sql:'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',values:[JSON.stringify([...scopeValues,harness.users.owner!.id,'publish_policy:'+draft.id,request.key])]}:
        {sql:`SELECT id FROM app.${mode==='purpose'?'purpose_versions':mode==='policy'?'policy_versions':'publication_proofs'} WHERE id=$1 FOR UPDATE`,values:[mode==='purpose'?purpose.id:mode==='policy'?draft.id:proof.reauthentication_id]};
      response=await delayed(`publication/${mode}`,'publication_proofs',proof.reauthentication_id,lock,request);
    }
    check(`publication/${mode}: HTTP status`,response.status,mode==='fresh'?200:403);
    if(mode==='fresh') {
      check('publication: fresh proof consumed before expiry with one approval and idempotency',(await db.query('SELECT used_at<expires_at timely,(SELECT count(*)::int FROM app.policy_approvals WHERE proof_id=$1) approvals,(SELECT count(*)::int FROM app.idempotency_records WHERE key=$2) idempotency FROM app.publication_proofs WHERE id=$1',[proof.reauthentication_id,request.key])).rows[0],{timely:true,approvals:1,idempotency:1});
      const original=await response.json();await expire('publication_proofs',proof.reauthentication_id,-1000);
      const committed=await policySnapshot(proof.reauthentication_id,request.key);const replay=await call(request);
      check('publication: committed replay after expiry status',replay.status,200);check('publication: committed replay response',await replay.json(),original);
      check('publication: replay preserves business rows',await policySnapshot(proof.reauthentication_id,request.key),committed);
      check('publication: replay still requires authentication',(await call({...request,browser:harness.browser()})).status,401);
    } else {
      // Deadlines are fixture setup, excluded from business state comparison.
      const after=(await db.query('SELECT used_at FROM app.publication_proofs WHERE id=$1',[proof.reauthentication_id])).rows[0];
      check(`publication/${mode}: proof remains unused`,after.used_at,null);
      check(`publication/${mode}: all business rows unchanged`,await policySnapshot(proof.reauthentication_id,request.key),before);
      check(`publication/${mode}: no approval or success idempotency`,(await db.query('SELECT (SELECT count(*)::int FROM app.policy_approvals WHERE proof_id=$1) approvals,(SELECT count(*)::int FROM app.idempotency_records WHERE key=$2) idempotency',[proof.reauthentication_id,request.key])).rows[0],{approvals:0,idempotency:0});
      check(`publication/${mode}: policy remains draft`,(await db.query('SELECT status FROM app.policy_versions WHERE id=$1',[draft.id])).rows[0].status,'DRAFT');
    }
  }

  async function choice() {
    let cursor:string|null=null;
    do {
      const page=S.schemas.ConsentList.parse(await (await alice.call('/api/v1/portal/me/consents?limit=100'+(cursor?'&cursor='+cursor:''))).json());
      const item=page.items.find(i=>i.purpose_id===purpose.id);if(item)return item;cursor=page.next_cursor;
    }while(cursor);throw new Error('Consent setup missing purpose');
  }
  async function consentSnapshot(interactionId:string,key:string) {
    const result:Record<string,unknown>={};
    for(const table of ['consent_aggregates','consent_events','workflows','outbox_events'])result[table]=(await db.query(`SELECT to_jsonb(t) row FROM app.${table} t WHERE purpose_id=$1 ORDER BY to_jsonb(t)::text`,[purpose.id])).rows;
    result.interaction=(await db.query("SELECT to_jsonb(t)-'expires_at' row FROM app.consent_interactions t WHERE id=$1",[interactionId])).rows;
    result.idempotency=(await db.query('SELECT to_jsonb(t) row FROM app.idempotency_records t WHERE key=$1',[key])).rows;
    return digest(result);
  }
  for(const kind of ['grant','withdraw'] as const) {
    for(const mode of ['fresh','expired','consent-boundary','aggregate','interaction','publication','idempotency'] as const) {
      const current=await choice();const request={browser:alice,path:`/api/v1/portal/me/consents/${purpose.id}/${kind}`,input:{expected_epoch:current.consent_epoch,interaction_id:current.interaction_id,...kind==='grant'?{notice_version_id:notice.version_id,affirmative:true}:{}},key:randomUUID()};
      if(mode==='expired')await expire('consent_interactions',current.interaction_id,-1000);
      const before=await consentSnapshot(current.interaction_id,request.key);let response:Response;
      if(mode==='fresh'||mode==='expired')response=await call(request);
      else {
        const lock=mode==='publication'?publicationLock:mode==='consent-boundary'||mode==='idempotency'?{sql:'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',values:[JSON.stringify(mode==='consent-boundary'?[scope.tenant_id,scope.legal_entity_id,harness.users.alice!.principal_id,purpose.id,'consent-boundary']:[...scopeValues,harness.users.alice!.id,kind+':'+purpose.id,request.key])]}:
          {sql:mode==='aggregate'?'SELECT purpose_id FROM app.consent_aggregates WHERE purpose_id=$1 FOR UPDATE':'SELECT id FROM app.consent_interactions WHERE id=$1 FOR UPDATE',values:[mode==='aggregate'?purpose.id:current.interaction_id]};
        response=await delayed(`${kind}/${mode}`,'consent_interactions',current.interaction_id,lock,request);
      }
      check(`${kind}/${mode}: HTTP status`,response.status,mode==='fresh'?202:409);
      if(mode==='fresh') {
        check(`${kind}: fresh interaction consumed before expiry with one event and idempotency`,(await db.query('SELECT used_at<expires_at timely,(SELECT count(*)::int FROM app.consent_events WHERE interaction_id=$1) events,(SELECT count(*)::int FROM app.idempotency_records WHERE key=$2) idempotency FROM app.consent_interactions WHERE id=$1',[current.interaction_id,request.key])).rows[0],{timely:true,events:1,idempotency:1});
        const original=S.Receipt.parse(await response.json());await expire('consent_interactions',current.interaction_id,-1000);
        const committed=await consentSnapshot(current.interaction_id,request.key);const replay=await call(request);
        check(`${kind}: committed replay after expiry status`,replay.status,202);check(`${kind}: committed replay response`,await replay.json(),original);
        check(`${kind}: replay preserves business rows`,await consentSnapshot(current.interaction_id,request.key),committed);
        check(`${kind}: new key cannot reuse consumed interaction`,(await call({...request,key:randomUUID()})).status,409);
      } else check(`${kind}/${mode}: aggregate interaction event receipt workflow outbox idempotency unchanged`,await consentSnapshot(current.interaction_id,request.key),before);
    }
  }
} catch(error) {console.error(safeError(error));console.error(harness.diagnostics);process.exitCode=1;}
finally {
  await harness.stop();await db.end();
  writeEvidence('expiry-integration',{finding:'W01-A02-F01',phase:process.argv.includes('--observe-original')?'ORIGINAL_SOURCE_REGRESSION_OBSERVATION':'CORRECTED_RETEST',profile:profile.profile,contract_version:S.CONTRACT_VERSION,build_id:readFileSync('apps/web/.next/BUILD_ID','utf8').trim(),assertions,waits,result:process.exitCode?'FAIL':'PASS',limitations:['Only newly-created synthetic rows and locks; no reset. Business snapshots exclude fixture expiry adjustment and transport/denial audit. Work retains acceptance.']});
}
