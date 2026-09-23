import { randomUUID } from 'node:crypto';
import { TestRunCreate,TestRun,CONTRACT_VERSION } from '../../../../shared/contracts/src/index.ts';
import type { RuntimeConfig } from '../../../auth/src/config.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { predicate,scopeValues,requireOne,audit,paged,type Context,type Page } from '../shared/transaction.ts';
import { buildId } from '../evidence/evidence.ts';
export async function startTest(c:Context,config:RuntimeConfig,input:unknown){
 const request=TestRunCreate.parse(input);if(request.profile!==config.profile)throw new AccessError(403,'FORBIDDEN');
 const scope=scopeValues(c.actor);
 const fixture=requireOne((await c.tx.query(`SELECT * FROM app.test_fixture_profiles WHERE ${predicate}`,[...scope])).rows);
 if(fixture.installation_id!==config.installation_id||fixture.profile!==config.profile||fixture.fixture_id!==request.fixture_id)throw new AccessError(403,'FORBIDDEN');
 await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([...scope,'regression-run'])]);
 if((await c.tx.query(`SELECT 1 FROM app.test_runs WHERE ${predicate} AND state IN ('NOT_RUN','RUNNING')`,scope)).rowCount)throw new AccessError(409,'IDEMPOTENCY_CONFLICT');
 const run=TestRun.parse({id:randomUUID(),request,state:'NOT_RUN',build_id:buildId(),contract_version:CONTRACT_VERSION,started_at:null,finished_at:null,assertions:[],expected_fault_detection:request.scenario==='MARKETING_WITHDRAWAL_BROKEN_CONTROL'});
 await c.tx.query("INSERT INTO app.test_runs(tenant_id,legal_entity_id,environment_id,id,requester_id,state,document) VALUES($1,$2,$3,$4,$5,'NOT_RUN',$6)",[...scope,run.id,c.actor.actor_id,run]);
 await audit(c,'test.request',run.id);return run;
}
export async function readTest(c:Context,id:string){return TestRun.parse(requireOne((await c.tx.query(`SELECT document FROM app.test_runs WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id])).rows).document);}
export async function listTests(c:Context,page:Page){
 const rows=await c.tx.query(`SELECT document FROM app.test_runs WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
 return paged(rows.rows.map(row=>TestRun.parse(row.document)),page);
}
