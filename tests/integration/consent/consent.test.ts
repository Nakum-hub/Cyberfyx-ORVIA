import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { HttpFixture, authenticatorCode } from '../../../shared/testing/src/http-fixture.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { runtimePool, scopedTransaction } from '../../../database/customer/src/runtime.ts';
import { authorityFor } from '../../../backend/authorization/src/index.ts';
import { createAuth } from '../../../backend/auth/src/server.ts';
import { changeConsent } from '../../../backend/domain/src/consent/consent.ts';
import { idempotent } from '../../../backend/domain/src/shared/transaction.ts';

const harness=new HttpFixture();const config=harness.config;
const adminDb=connectDatabase(loadProfile()).pool;const app=runtimePool(config,'orvia_app');
const staff=createAuth(config,'staff');const principal=createAuth(config,'principal');
const assertions: {name:string;result:'PASS'|'FAIL';expected:unknown;actual:unknown}[]=[];
function check(name: string, actual: unknown, expected: unknown) {
  try {assert.deepEqual(actual,expected);assertions.push({name,result:'PASS',expected,actual});console.log(`PASS ${name}`);}
  catch{assertions.push({name,result:'FAIL',expected,actual});throw new Error(`Assertion failed: ${name}`);}
}
const key=()=>({'idempotency-key':randomUUID()});
try {
  await harness.start();
  const owner=await harness.login('owner');const author=await harness.login('admin');
  const alice=await harness.login('alice');const bob=await harness.login('bob');const birch=await harness.login('birch_principal');const auditor=await harness.login('auditor');
  const scope=harness.users.owner!.scope;const scoped={legal_entity_id:scope.legal_entity_id,environment_id:scope.environment_id};
  const purposeInput={...scoped,code:'promotional_marketing',name:'Synthetic A02 marketing',description:'Explicit fixture purpose; no real messages.'};
  check('principal cannot author configuration',(await alice.call('/api/v1/admin/purposes',purposeInput,key())).status,403);
  check('auditor cannot author configuration',(await auditor.call('/api/v1/admin/purposes',purposeInput,key())).status,403);
  check('cross-environment configuration rejected',(await author.call('/api/v1/admin/purposes',{...purposeInput,environment_id:randomUUID()},key())).status,404);
  const purposeResponse=await author.call('/api/v1/admin/purposes',purposeInput,key());check('create persisted purpose',purposeResponse.status,201);const purpose=S.Purpose.parse(await purposeResponse.json());
  const noticeResponse=await author.call('/api/v1/admin/notices',{purpose_id:purpose.id,language:'en',title:'Synthetic marketing notice',content:'Optional synthetic marketing. Withdraw in the same portal; no real messages are sent.',data_categories:['CONTACT_DETAILS','MARKETING_PREFERENCES'],contact:{rights_channel:'Withdraw or exercise any right in this synthetic portal at any time.',grievance_channel:'Raise a grievance with the synthetic privacy team through this portal.',board_complaint_channel:'Complain to the Data Protection Board using the channel the Board publishes.'}},key());
  check('create immutable notice version',noticeResponse.status,201);const notice=S.Notice.parse(await noticeResponse.json());
  const systemResponse=await author.call('/api/v1/admin/systems',{...scoped,name:'Synthetic CRM',connector:'SYNTHETIC_CRM'},key());check('create scoped system',systemResponse.status,201);const system=S.System.parse(await systemResponse.json());
  const policyInput={purpose_id:purpose.id,notice_version_id:notice.version_id,condition:'AFFIRMATIVE_MARKETING_CONSENT',system_ids:[system.id],required_observation:true};
  const policyResponse=await author.call('/api/v1/admin/policies',policyInput,key());check('author policy draft',policyResponse.status,201);const policy=S.Policy.parse(await policyResponse.json());
  const publishPath=`/api/v1/admin/policies/${policy.id}/publish`;const reauthPath=`/api/v1/admin/policies/${policy.id}/reauthenticate`;
  const approval={version_id:policy.version_id,digest:policy.digest,reauthentication_id:randomUUID()};
  check('draft purpose hidden in own portal',(S.schemas.ConsentList.parse(await (await alice.call('/api/v1/portal/me/consents?limit=100')).json())).items.some(i=>i.purpose_id===purpose.id),false);
  check('unauthorized author publication denied',(await author.call(publishPath,approval,key())).status,403);
  const selfResponse=await owner.call('/api/v1/admin/policies',policyInput,key());const selfPolicy=S.Policy.parse(await selfResponse.json());
  check('authorized reviewer cannot approve own version',(await owner.call(`/api/v1/admin/policies/${selfPolicy.id}/publish`,{...approval,version_id:selfPolicy.version_id,digest:selfPolicy.digest},key())).status,403);
  check('publication requires actual proof',(await owner.call(publishPath,approval,key())).status,403);
  check('wrong digest denied',(await owner.call(publishPath,{...approval,digest:'0'.repeat(64)},key())).status,409);
  const correctCode=authenticatorCode(harness.users.owner!.totp_uri!);const badCode=correctCode.slice(0,5)+((Number(correctCode[5])+1)%10);
  await harness.authWindow();
  check('reauthentication rejects wrong TOTP',(await owner.call(reauthPath,{version_id:policy.version_id,digest:policy.digest,code:badCode})).status,403);
  const proofResponse=await owner.call(reauthPath,{version_id:policy.version_id,digest:policy.digest,code:authenticatorCode(harness.users.owner!.totp_uri!)});
  check('real MFA creates exact publication proof',proofResponse.status,201);const proof=S.PublicationProof.parse(await proofResponse.json());
  const publishKey=key();const publishInput={...approval,reauthentication_id:proof.reauthentication_id};
  const published=await owner.call(publishPath,publishInput,publishKey);check('different reviewer publishes exact version',published.status,200);const publishedPolicy=S.Policy.parse(await published.json());
  check('published digest unchanged',publishedPolicy.digest,policy.digest);
  check('publish retry returns stable published version',await (await owner.call(publishPath,publishInput,publishKey)).json(),publishedPolicy);
  const mappingResponse=await author.call('/api/v1/admin/target-mappings',{principal_id:harness.users.alice!.principal_id,purpose_id:purpose.id,system_id:system.id},key());check('explicit principal to target mapping',mappingResponse.status,201);const mapping=S.TargetMapping.parse(await mappingResponse.json());
  const edges:ReturnType<typeof S.ControlMap.parse>['edges']=[];let mapCursor:string|null=null;
  do {const page=S.ControlMap.parse(await (await owner.call('/api/v1/admin/control-map?limit=7'+(mapCursor?'&cursor='+mapCursor:''))).json());edges.push(...page.edges);mapCursor=page.next_cursor;}while(mapCursor);
  check('control map exposes actual declared edge',edges.some(e=>e.resource_id===mapping.id&&e.observed_restrict===null),true);
  check('control map pagination preserves all scoped mappings',edges.map(e=>e.resource_id).sort(),(await adminDb.query('SELECT id FROM app.target_mappings WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 ORDER BY id',[scope.tenant_id,scope.legal_entity_id,scope.environment_id])).rows.map(r=>r.id));
  async function choice() {
    let cursor:string|null=null;
    do {const page=S.schemas.ConsentList.parse(await (await alice.call('/api/v1/portal/me/consents?limit=100'+(cursor?'&cursor='+cursor:''))).json());const found=page.items.find(i=>i.purpose_id===purpose.id);if(found)return found;cursor=page.next_cursor;}while(cursor);
    throw new Error('Persisted scenario purpose missing');
  }
  const first=await choice();check('published notice available to own principal',first.notice?.version_id,notice.version_id);
  const grantPath=`/api/v1/portal/me/consents/${purpose.id}/grant`;const withdrawPath=`/api/v1/portal/me/consents/${purpose.id}/withdraw`;
  const grant={expected_epoch:0,interaction_id:first.interaction_id,notice_version_id:notice.version_id,affirmative:true};const grantKey=key();
  check('affirmative action mandatory',(await alice.call(grantPath,{...grant,affirmative:false},key())).status,400);
  check('incorrect notice rejected',(await alice.call(grantPath,{...grant,notice_version_id:randomUUID()},key())).status,409);
  const grantResponse=await alice.call(grantPath,grant,grantKey);check('grant accepted after commit',grantResponse.status,202);const grantReceipt=S.Receipt.parse(await grantResponse.json());check('first epoch is one',grantReceipt.consent_epoch,1);
  const second=await choice();const withdraw={expected_epoch:1,interaction_id:second.interaction_id};const withdrawKey=key();
  const withdrawal=await alice.call(withdrawPath,withdraw,withdrawKey);check('withdrawal accepted durably',withdrawal.status,202);const receipt=S.Receipt.parse(await withdrawal.json());
  check('withdrawal increments epoch',receipt.consent_epoch,2);
  const persisted=await adminDb.query('SELECT (SELECT count(*)::int FROM app.consent_events WHERE id=$1) events,(SELECT count(*)::int FROM app.outbox_events WHERE event_id=$1) outbox,(SELECT count(*)::int FROM app.workflows WHERE event_id=$1) workflows',[receipt.event_id]);
  check('state event workflow and outbox committed together',persisted.rows[0],{events:1,outbox:1,workflows:1});
  check('retry returns identical withdrawal receipt',await (await alice.call(withdrawPath,withdraw,withdrawKey)).json(),receipt);
  check('same key different request denied',(await alice.call(withdrawPath,{...withdraw,expected_epoch:2},withdrawKey)).status,409);
  check('old grant replay returns old immutable receipt',await (await alice.call(grantPath,grant,grantKey)).json(),grantReceipt);
  check('old grant replay cannot reactivate', (await choice()).consent_status,'WITHDRAWN');
  check('old interaction with new key denied',(await alice.call(grantPath,grant,key())).status,409);
  check('another principal cannot read receipt',(await bob.call(`/api/v1/portal/me/receipts/${receipt.receipt_id}`)).status,404);
  check('another tenant cannot read receipt',(await birch.call(`/api/v1/portal/me/receipts/${receipt.receipt_id}`)).status,404);
  const rollbackChoice=await choice();const aliceActor=await authorityFor(new Request(config.origin+'/api/v1/session',{headers:alice.headers()}),staff,principal);
  const rollbackKey=randomUUID();let rollbackObserved=false;
  try {await scopedTransaction(app,aliceActor,async tx=>{
    const c={tx,actor:aliceActor,requestId:randomUUID()};
    await idempotent(c,'withdraw',purpose.id,rollbackKey,{expected_epoch:2,interaction_id:rollbackChoice.interaction_id},()=>changeConsent(c,purpose.id,'withdraw',{expected_epoch:2,interaction_id:rollbackChoice.interaction_id}));
    rollbackObserved=true;
    throw new Error('Test-only interruption after all business writes');
  });}catch{/* rollback assertions below check that every write was reached and undone */}
  check('test interruption reached transaction rollback',rollbackObserved,true);
  check('rollback preserves aggregate epoch',(await choice()).consent_epoch,2);
  const rolledBack=await adminDb.query('SELECT (SELECT count(*)::int FROM app.consent_events WHERE purpose_id=$1) events,(SELECT count(*)::int FROM app.outbox_events WHERE purpose_id=$1) outbox,(SELECT count(*)::int FROM app.idempotency_records WHERE key=$2) idempotency',[purpose.id,rollbackKey]);
  check('rollback removes event outbox and idempotency together',rolledBack.rows[0],{events:2,outbox:1,idempotency:0});
  const a=await choice();const b=await choice();
  const race=await Promise.all([alice.call(grantPath,{expected_epoch:2,interaction_id:a.interaction_id,notice_version_id:notice.version_id,affirmative:true},key()),alice.call(withdrawPath,{expected_epoch:2,interaction_id:b.interaction_id},key())]);
  check('concurrent grant and withdrawal serialize',[...race.map(r=>r.status)].sort(),[202,409]);
  check('race advances one epoch only',(await choice()).consent_epoch,3);
  const fresh=await choice();const freshGrant=await alice.call(grantPath,{expected_epoch:3,interaction_id:fresh.interaction_id,notice_version_id:notice.version_id,affirmative:true},key());check('fresh reconsent requires fresh authorized interaction',freshGrant.status,202);
  check('new interaction advances to epoch four',S.Receipt.parse(await freshGrant.json()).consent_epoch,4);
  const history=S.schemas.ReceiptList.parse(await (await alice.call(`/api/v1/portal/me/consents/${purpose.id}/history`)).json());check('history retains all four committed events',history.items.length,4);
  check('old receipt remains unchanged after new consent',S.ReceiptView.parse(await (await alice.call(`/api/v1/portal/me/receipts/${receipt.receipt_id}`)).json()).receipt,receipt);
  const ownRows=await scopedTransaction(app,aliceActor,tx=>tx.query('SELECT DISTINCT principal_id FROM app.consent_events'));
  check('RLS cannot expose another principal with missing query predicates',ownRows.rows.every(row=>row.principal_id===harness.users.alice!.principal_id),true);
  let immutableCode='NONE';try{await adminDb.query("UPDATE app.policy_versions SET document=jsonb_set(document,'{condition}','\"APPROVED_SYNTHETIC_ORDER_SERVICE\"') WHERE id=$1",[policy.id]);}catch(error){immutableCode=safeError(error).code;}
  check('database rejects published version rewriting',immutableCode,'23514');
  await harness.stop();await harness.start();
  const restarted=S.ReceiptView.parse(await (await alice.call(`/api/v1/portal/me/receipts/${receipt.receipt_id}`)).json());
  check('restart preserves original receipt',restarted.receipt,receipt);check('restart preserves current epoch',restarted.current.consent_epoch,4);
  let policyAfterRestart:ReturnType<typeof S.Policy.parse>|undefined;let policyCursor:string|null=null;
  do {const page=S.schemas.PolicyList.parse(await (await owner.call('/api/v1/admin/policies?limit=100'+(policyCursor?'&cursor='+policyCursor:''))).json());policyAfterRestart=page.items.find(item=>item.id===policy.id);policyCursor=page.next_cursor;}while(!policyAfterRestart&&policyCursor);
  check('restart preserves exact published configuration',policyAfterRestart,publishedPolicy);
  check('restart preserves exact notice content',(await choice()).notice?.content,notice.content);
} catch(error) {console.error(safeError(error));console.error(harness.diagnostics);process.exitCode=1;}
finally {
  await harness.stop();await Promise.all([adminDb.end(),app.end(),staff.pool.end(),principal.pool.end()]);
  writeEvidence('consent-integration',{test_ids:['T06','T07','T08','T09','T10'],contract_version:S.CONTRACT_VERSION,profile:config.profile,assertions,result:process.exitCode?'FAIL':'PASS',limitations:['T10 outbox transaction only; durable worker recovery belongs to A03. Browser acceptance remains Claude Code owned.']});
}
