import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {connectDatabase} from '../../../database/customer/src/index.ts';
import {runtimePool} from '../../../database/customer/src/runtime.ts';
import {runtimeConfig} from '../../../backend/auth/src/config.ts';
import {createAuth,authHandler} from '../../../backend/auth/src/server.ts';
import {hashPassword} from '../../../backend/auth/src/bootstrap-password.ts';
import {authorityFor} from '../../../backend/authorization/src/index.ts';
import {createBusinessHandler} from '../../../backend/api/src/business.ts';
import {safeRoute} from '../../../backend/api/src/http.ts';
import {loadProfile} from '../../../shared/testing/src/config.ts';
import {authenticatorCode} from '../../../shared/testing/src/http-fixture.ts';
import {schemas,CONTRACT_VERSION} from '../../../shared/contracts/src/index.ts';

const run=randomUUID(),database=`orvia_grc_http_${run.replaceAll('-','')}`;
const artifact=`handoffs/codex/artifacts/V1-EXPANSION-04-http-${run}.json`;
const opaPort=Number(process.env.ORVIA_GRC_OPA_PORT);
if(!Number.isInteger(opaPort)||opaPort<1024||opaPort>65535||opaPort===58181)throw new Error('An independently owned local OPA port is required.');
const base=runtimeConfig();if(base.profile!=='codex-a00')throw new Error('Expected codex-a00 credentials for isolated database.');
const profile=loadProfile('codex-a00'),bootstrap=connectDatabase({...profile,database:'postgres'}).pool;
const db=connectDatabase({...profile,database}).pool;
let dispatch:(request:Request)=>Promise<Response>;
const server=createServer(async(req,res)=>{
  try{
    const chunks:Buffer[]=[];let size=0;
    for await(const value of req){const bytes=Buffer.from(value);size+=bytes.length;if(size>262144){res.writeHead(413).end();return;}chunks.push(bytes);}
    const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
    const request=new Request(`http://127.0.0.1:${(server.address() as {port:number}).port}${req.url}`,{method:req.method,headers,...chunks.length?{body:Buffer.concat(chunks).toString('utf8')}:{}});
    const response=await dispatch(request);
    res.statusCode=response.status;response.headers.forEach((v,k)=>{if(k!=='set-cookie')res.setHeader(k,v);});
    if(response.headers.getSetCookie().length)res.setHeader('set-cookie',response.headers.getSetCookie());
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const port=(server.address() as {port:number}).port;
const config={...base,database,app_port:port,origin:`http://127.0.0.1:${port}`,opa_port:opaPort} as ReturnType<typeof runtimeConfig>;
const runtime={config,staff:createAuth(config,'staff'),principal:createAuth(config,'principal'),pool:runtimePool(config,'orvia_app')};
const business=createBusinessHandler(()=>runtime);
dispatch=request=>{
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/auth/staff/'))return safeRoute(id=>authHandler(runtime.staff,config,request,id),'AUTH_STAFF',()=>runtime);
  if(path.startsWith('/api/auth/principal/'))return safeRoute(id=>authHandler(runtime.principal,config,request,id),'AUTH_PRINCIPAL',()=>runtime);
  if(path==='/api/v1/session')return safeRoute(async()=>Response.json(await authorityFor(request,runtime.staff,runtime.principal)),'SESSION_READ',()=>runtime);
  return business(request);
};
const results:{name:string;result:'PASS'|'FAIL'}[]=[];let phase='setup';
function check(name:string,a:unknown,b:unknown){try{assert.deepEqual(a,b);results.push({name,result:'PASS'});console.log(`PASS ${name}`);}catch{results.push({name,result:'FAIL'});throw new Error(`Assertion failed: ${name}`);}}
function client(){
  const cookies=new Map<string,string>();
  return {browserCookies:()=>[...cookies].map(([k,v])=>`${k}=${v}; Path=/; HttpOnly; SameSite=Strict`),async call(path:string,body?:unknown,extra:Record<string,string>={}){
    const response=await fetch(config.origin+path,{method:body===undefined?'GET':'POST',headers:{origin:config.origin,'content-type':'application/json',cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...extra},...body===undefined?{}:{body:JSON.stringify(body)},signal:AbortSignal.timeout(20000)});
    for(const cookie of response.headers.getSetCookie()){const value=cookie.split(';')[0]!,at=value.indexOf('=');cookies.set(value.slice(0,at),value.slice(at+1));}
    return response;
  }};
}
const scopes={a:{tenant_id:randomUUID(),legal_entity_id:randomUUID(),environment_id:randomUUID()},b:{tenant_id:randomUUID(),legal_entity_id:randomUUID(),environment_id:randomUUID()}};
type User={id:string;password:string;email:string;domain:'staff'|'principal';role:string;scope:typeof scopes.a};
async function user(name:string,role:string,scope=scopes.a,domain:'staff'|'principal'='staff'):Promise<User>{
  const value={id:randomUUID(),password:randomBytes(32).toString('hex'),email:`${name}.${randomUUID()}@aster.example`,domain,role,scope};
  const schema=domain==='staff'?'staff_auth':'principal_auth';
  await db.query(`INSERT INTO ${schema}."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)`,[value.id,`Synthetic ${name}`,value.email]);
  await db.query(`INSERT INTO ${schema}.account(id,"accountId","providerId","userId",password) VALUES($1,$2,'credential',$3,$4)`,[randomUUID(),value.id,value.id,await hashPassword(value.password)]);
  if(domain==='staff')await db.query('INSERT INTO staff_auth.authority(user_id,tenant_id,legal_entity_id,environment_id,role) VALUES($1,$2,$3,$4,$5)',[value.id,...Object.values(scope),role]);
  else{
    const principal=randomUUID();await db.query('INSERT INTO app.principal_references VALUES($1,$2,$3,$4,$5,$6,true)',[...Object.values(scope),principal,'Synthetic principal',value.email]);
    await db.query('INSERT INTO principal_auth.authority(user_id,tenant_id,legal_entity_id,environment_id,principal_id) VALUES($1,$2,$3,$4,$5)',[value.id,...Object.values(scope),principal]);
  }
  return value;
}
async function login(user:User,mfa=true){
  const browser=client(),path=`/api/auth/${user.domain}`;
  const signin=await browser.call(path+'/sign-in/email',{email:user.email,password:user.password,rememberMe:false});
  if(signin.status!==200)throw new Error('Synthetic sign-in failed');
  if(mfa&&user.domain==='staff'&&user.role!=='AUDITOR'){
    const enable=await browser.call(path+'/two-factor/enable',{password:user.password,method:'totp'});
    if(enable.status!==200)throw new Error('Synthetic MFA enrollment failed');
    const uri=(await enable.json()).totpURI as string;
    const verify=await browser.call(path+'/two-factor/verify-totp',{code:authenticatorCode(uri),trustDevice:false});
    if(verify.status!==200)throw new Error('Synthetic MFA verification failed');
  }
  return browser;
}
const keyed=()=>({'idempotency-key':randomUUID()});
try{
  if(!/^orvia_grc_http_[a-f0-9]{32}$/.test(database))throw new Error('Unsafe fixture database name');
  await bootstrap.query(`CREATE DATABASE "${database}"`);
  for(const migration of ['0001_auth_scope.sql','0003_request_audit.sql']){
    await db.query(readFileSync(`database/customer/migrations/${migration}`,'utf8'));
  }
  const {readdirSync}=await import('node:fs');
  const second=readdirSync('database/customer/migrations').filter(p=>p.startsWith('0002_'));
  if(second.length!==1)throw new Error('Ambiguous idempotency migration');
  await db.query(readFileSync(`database/customer/migrations/${second[0]}`,'utf8'));
  const configuration=readFileSync('database/customer/migrations/0004_configuration_consent.sql','utf8');
  const requestAudit=configuration.match(/ALTER TABLE app\.request_audit (?:DROP CONSTRAINT|ADD CHECK)[^;]+;/g);
  if(requestAudit?.length!==2)throw new Error('Missing business audit operation migration');
  for(const sql of requestAudit)await db.query(sql);
  await db.query(readFileSync('database/customer/migrations/0049_grc.sql','utf8'));
  await db.query(readFileSync('database/customer/migrations/0050_grc_audits.sql','utf8'));
  // Same prerequisite grants as auth-init, limited to this fresh isolated DB.
  await db.query(`GRANT USAGE ON SCHEMA app TO orvia_app;
    GRANT SELECT ON app.organisations,app.legal_entities,app.environments,app.principal_references,app.audit_events,app.idempotency_records TO orvia_app;
    GRANT INSERT ON app.audit_events,app.idempotency_records,app.request_audit TO orvia_app;
    GRANT EXECUTE ON FUNCTION app.in_scope(uuid,uuid,uuid),app.has_capability(text) TO orvia_app;`);
  for(const [schema,role] of [['staff_auth','orvia_staff_auth'],['principal_auth','orvia_principal_auth']] as const){
    await db.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
    for(const table of ['user','session','account','verification','twoFactor','rateLimit'])await db.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ${schema}."${table}" TO ${role}`);
    await db.query(`GRANT SELECT ON ${schema}.authority TO ${role}; GRANT INSERT ON ${schema}.auth_audit TO ${role}`);
  }
  await db.query('GRANT SELECT,INSERT,UPDATE ON staff_auth.mfa_sessions TO orvia_staff_auth');
  for(const scope of Object.values(scopes)){
    await db.query('INSERT INTO app.organisations VALUES($1,$2)',[scope.tenant_id,'Synthetic GRC test']);
    await db.query('INSERT INTO app.legal_entities VALUES($1,$2,$3)',[scope.tenant_id,scope.legal_entity_id,'Synthetic legal entity']);
    await db.query('INSERT INTO app.environments VALUES($1,$2,$3,$4)',[...Object.values(scope),'Synthetic isolated environment']);
  }
  phase='real authentication and policy';
  const authorUser=await user('author','ORG_ADMIN'),reviewerUser=await user('reviewer','ORG_SUPER_ADMIN');
  const author=await login(authorUser,false);
  check('privileged session without MFA denied',(await author.call('/api/v1/admin/grc/controls')).status,403);
  const writer=await login(authorUser),reviewer=await login(reviewerUser),auditor=await login(await user('auditor','AUDITOR'));
  const foreign=await login(await user('foreign','ORG_SUPER_ADMIN',scopes.b));
  const principal=await login(await user('principal','DATA_PRINCIPAL',scopes.a,'principal'));
  check('anonymous request denied',(await client().call('/api/v1/admin/grc/controls')).status,401);
  check('principal denied staff GRC',(await principal.call('/api/v1/admin/grc/controls')).status,403);
  check('auditor can read controls',(await auditor.call('/api/v1/admin/grc/controls')).status,200);
  const frameworkInput={name:'Synthetic HTTP access framework',version:'1',source_reference:'Synthetic source',requirements:[{code:'AC-1',description:'Review access'}]};
  check('auditor cannot create framework',(await auditor.call('/api/v1/admin/grc/frameworks',frameworkInput,keyed())).status,403);
  phase='contracts and idempotency';
  check('missing idempotency key denied',(await writer.call('/api/v1/admin/grc/frameworks',frameworkInput)).status,400);
  check('wrong origin denied',(await writer.call('/api/v1/admin/grc/frameworks',frameworkInput,{...keyed(),origin:'https://invalid.example'})).status,403);
  check('unexpected authority fields rejected',(await writer.call('/api/v1/admin/grc/frameworks',{...frameworkInput,role:'ORG_SUPER_ADMIN'},keyed())).status,400);
  const key=keyed(),created=await writer.call('/api/v1/admin/grc/frameworks',frameworkInput,key);
  check('framework creation succeeds',created.status,201);const framework=schemas.GrcFramework.parse(await created.json());
  const replay=await writer.call('/api/v1/admin/grc/frameworks',frameworkInput,key);
  check('identical retry replays original immutable response',await replay.json(),framework);
  check('changed payload with same key denied',(await writer.call('/api/v1/admin/grc/frameworks',{...frameworkInput,version:'2'},key)).status,409);
  const controlInput={title:'Synthetic HTTP control',description:'Review access',owner_reference:'Synthetic owner',review_interval_days:30,mappings:[{framework_id:framework.id,requirement_code:'AC-1'}]};
  const controlResponse=await writer.call('/api/v1/admin/grc/controls',controlInput,keyed());
  check('mapped control creation succeeds',controlResponse.status,201);const control=schemas.GrcControl.parse(await controlResponse.json());
  check('cross-tenant detail denied',(await foreign.call(`/api/v1/admin/grc/controls/${control.id}`)).status,404);
  check('cross-tenant mapping denied',(await foreign.call('/api/v1/admin/grc/controls',controlInput,keyed())).status,404);
  check('unknown query field denied',(await writer.call('/api/v1/admin/grc/controls?role=ORG_SUPER_ADMIN')).status,400);
  check('malformed cursor denied',(await writer.call('/api/v1/admin/grc/controls?cursor=YQ')).status,400);
  const largeFramework={...frameworkInput,name:'Synthetic complete framework',requirements:Array.from({length:100},(_,i)=>({code:`CTRL-${i}`,description:'\u0939'.repeat(500)}))};
  check('full Unicode framework fits declared body limit',(await writer.call('/api/v1/admin/grc/frameworks',largeFramework,keyed())).status,201);
  phase='evidence and independent review';
  const evidenceInput={description:'Synthetic access report',local_reference:'local:synthetic-http-evidence',content_sha256:'a'.repeat(64),collected_at:new Date(Date.now()-60000).toISOString(),valid_until:new Date(Date.now()+86400000).toISOString()};
  const evidenceResponse=await writer.call(`/api/v1/admin/grc/controls/${control.id}/evidence`,evidenceInput,keyed());
  check('evidence submission succeeds',evidenceResponse.status,201);const evidence=schemas.GrcEvidence.parse(await evidenceResponse.json());
  const decision={evidence_id:evidence.id,decision:'ACCEPT',reason:'Synthetic independent evidence review'};
  check('writer cannot impersonate reviewer through header',(await writer.call(`/api/v1/admin/grc/controls/${control.id}/reviews`,decision,{...keyed(),'x-orvia-role':'ORG_SUPER_ADMIN'})).status,403);
  check('independent reviewer accepts evidence',(await reviewer.call(`/api/v1/admin/grc/controls/${control.id}/reviews`,decision,keyed())).status,201);
  const detail=schemas.GrcControlDetail.parse(await (await auditor.call(`/api/v1/admin/grc/controls/${control.id}`)).json());
  check('accepted evidence remains manual',detail.standing.state,'MANUAL_REVIEW_ACCEPTED');
  check('manual review never verifies effect',detail.standing.automated_effect_verified,false);
  await writer.call(`/api/v1/admin/grc/controls/${control.id}/evidence`,evidenceInput,keyed());
  check('old evidence cannot be approved after replacement',(await reviewer.call(`/api/v1/admin/grc/controls/${control.id}/reviews`,decision,keyed())).status,409);
  const replaced=schemas.GrcControlDetail.parse(await (await writer.call(`/api/v1/admin/grc/controls/${control.id}`)).json());
  check('replacement is pending review',replaced.standing.state,'PENDING_REVIEW');
  const history=schemas.GrcEvidenceHistoryList.parse(await (await auditor.call(`/api/v1/admin/grc/controls/${control.id}/evidence?limit=1`)).json());
  check('evidence history starts with replacement',history.items[0]?.id,replaced.evidence?.id);
  check('history exposes a continuation',typeof history.next_cursor,'string');
  const older=schemas.GrcEvidenceHistoryList.parse(await (await auditor.call(`/api/v1/admin/grc/controls/${control.id}/evidence?limit=1&cursor=${history.next_cursor}`)).json());
  check('older evidence retains its independent review',older.items[0]?.review?.evidence_id,evidence.id);
  check('cross-tenant history denied',(await foreign.call(`/api/v1/admin/grc/controls/${control.id}/evidence`)).status,404);
  check('unrelated history cursor denied',(await auditor.call(`/api/v1/admin/grc/controls/${control.id}/evidence?cursor=${Buffer.from(randomUUID()).toString('base64url')}`)).status,404);
  phase='risk treatment';
  const riskInput={title:'Synthetic HTTP risk',description:'Excess access',owner_reference:'Synthetic owner',likelihood:3,impact:4,review_due_at:new Date(Date.now()+86400000).toISOString(),control_ids:[control.id]};
  const riskResponse=await writer.call('/api/v1/admin/grc/risks',riskInput,keyed());
  check('risk creation succeeds',riskResponse.status,201);const risk=schemas.GrcRisk.parse(await riskResponse.json());
  const treatmentInput={response:'ACCEPT',plan:'Temporary synthetic acceptance',due_at:new Date(Date.now()+86400000).toISOString(),acceptance_expires_at:new Date(Date.now()+86400000).toISOString()};
  const proposed=await writer.call(`/api/v1/admin/grc/risks/${risk.id}/treatments`,treatmentInput,keyed());
  check('risk treatment proposal succeeds',proposed.status,201);const treatment=schemas.GrcRiskTreatment.parse(await proposed.json());
  const riskReview={treatment_id:treatment.id,decision:'ACCEPT',reason:'Synthetic independent treatment review'};
  check('risk author cannot approve own plan',(await writer.call(`/api/v1/admin/grc/risks/${risk.id}/reviews`,riskReview,keyed())).status,403);
  check('independent risk approval succeeds',(await reviewer.call(`/api/v1/admin/grc/risks/${risk.id}/reviews`,riskReview,keyed())).status,201);
  const riskDetail=schemas.GrcRiskDetail.parse(await (await auditor.call(`/api/v1/admin/grc/risks/${risk.id}`)).json());
  check('risk acceptance visible',riskDetail.standing.state,'RISK_ACCEPTED');
  check('risk treatment does not claim mitigation effect',riskDetail.standing.mitigation_effect_verified,false);
  const treatmentHistory=schemas.GrcTreatmentHistoryList.parse(await (await auditor.call(`/api/v1/admin/grc/risks/${risk.id}/treatments`)).json());
  check('risk history preserves reviewed treatment',treatmentHistory.items[0]?.review?.treatment_id,treatment.id);
  phase='audit engagements';
  await reviewer.call(`/api/v1/admin/grc/controls/${control.id}/reviews`,{...decision,evidence_id:replaced.evidence!.id},keyed());
  const planInput={title:'Synthetic HTTP audit',objective:'Access evidence audit',owner_reference:'Synthetic owner',due_at:new Date(Date.now()+172800000).toISOString(),control_ids:[control.id]};
  const planResponse=await writer.call('/api/v1/admin/grc/audits',planInput,keyed());
  check('audit plan creation succeeds',planResponse.status,201);const plan=schemas.GrcAudit.parse(await planResponse.json());
  check('auditor reads audit list',(await auditor.call('/api/v1/admin/grc/audits')).status,200);
  check('auditor cannot create audit',(await auditor.call('/api/v1/admin/grc/audits',planInput,keyed())).status,403);
  check('foreign tenant audit denied',(await foreign.call(`/api/v1/admin/grc/audits/${plan.id}`)).status,404);
  const reqInput={control_id:control.id,description:'Synthetic HTTP audit evidence request',assignee_reference:'Synthetic owner',due_at:new Date(Date.now()+86400000).toISOString()};
  const reqResponse=await writer.call(`/api/v1/admin/grc/audits/${plan.id}/requests`,reqInput,keyed());
  check('audit evidence request creation succeeds',reqResponse.status,201);const req=schemas.GrcAuditRequest.parse(await reqResponse.json());
  check('audit requests list scoped',(schemas.GrcAuditRequestList.parse(await (await auditor.call(`/api/v1/admin/grc/audits/${plan.id}/requests`)).json())).items[0]?.id,req.id);
  const replyInput={evidence_id:replaced.evidence!.id,explanation:'Synthetic reviewed local evidence'};
  const replyKey=keyed(),replyResponse=await writer.call(`/api/v1/admin/grc/audit-requests/${req.id}/responses`,replyInput,replyKey);
  check('audit response submission succeeds',replyResponse.status,201);const reply=schemas.GrcAuditResponse.parse(await replyResponse.json());
  check('audit response replay immutable',await (await writer.call(`/api/v1/admin/grc/audit-requests/${req.id}/responses`,replyInput,replyKey)).json(),reply);
  check('audit closure blocks pending review',(await reviewer.call(`/api/v1/admin/grc/audits/${plan.id}/closure`,{reason:'Premature'},keyed())).status,409);
  const reviewInput={response_id:reply.id,decision:'ACCEPT',reason:'Synthetic independent audit review'};
  check('writer cannot approve own audit response',(await writer.call(`/api/v1/admin/grc/audit-requests/${req.id}/reviews`,reviewInput,keyed())).status,403);
  check('audit response independent review succeeds',(await reviewer.call(`/api/v1/admin/grc/audit-requests/${req.id}/reviews`,reviewInput,keyed())).status,201);
  check('audit response detail accepted',schemas.GrcAuditRequestDetail.parse(await (await auditor.call(`/api/v1/admin/grc/audit-requests/${req.id}`)).json()).state,'ACCEPTED');
  check('audit response history preserves review',schemas.GrcAuditResponseHistoryList.parse(await (await auditor.call(`/api/v1/admin/grc/audit-requests/${req.id}/responses`)).json()).items[0]?.review?.response_id,reply.id);
  check('foreign tenant audit history denied',(await foreign.call(`/api/v1/admin/grc/audit-requests/${req.id}/responses`)).status,404);
  const closureResponse=await reviewer.call(`/api/v1/admin/grc/audits/${plan.id}/closure`,{reason:'Synthetic reviewed scope complete'},keyed());
  check('audit closure succeeds',closureResponse.status,201);
  check('audit closure never claims certification',schemas.GrcAuditClosure.parse(await closureResponse.json()).certification_asserted,false);
  check('closed audit rejects late request',(await writer.call(`/api/v1/admin/grc/audits/${plan.id}/requests`,reqInput,keyed())).status,409);
  phase='revocation and audit';
  await db.query('UPDATE staff_auth.authority SET active=false WHERE user_id=$1',[authorUser.id]);
  check('revoked authority cannot replay prior success',(await writer.call('/api/v1/admin/grc/frameworks',frameworkInput,key)).status,403);
  check('transport denials audited',Number((await db.query('SELECT count(*)::int n FROM app.request_audit WHERE status IN (400,401,403,404,409)')).rows[0].n)>0,true);
  check('successful changes audited',Number((await db.query("SELECT count(*)::int n FROM app.audit_events WHERE operation='grc.evidence.reviewed'")).rows[0].n),2);
  await db.query('REVOKE INSERT ON app.request_audit FROM orvia_app');
  check('unavailable transport audit fails closed',(await auditor.call('/api/v1/admin/grc/controls')).status,503);
  await db.query('GRANT INSERT ON app.request_audit TO orvia_app');
  writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-04',result:'PASS',recorded_at:new Date().toISOString(),database,origin:config.origin,opa_port:opaPort,contract_version:CONTRACT_VERSION,policy_sha256:createHash('sha256').update(readFileSync('backend/policy/admin/authorization.rego')).digest('hex'),results,limitations:['Isolated HTTP server exercises production handlers/authentication/MFA/OPA/RLS; Next routing, full application packaging and browser flow are separate acceptance checks. Synthetic accounts only.']},null,2));
  console.log(`Artifact: ${artifact}`);
  if(process.argv.includes('--browser')){
    // Restore only this synthetic fixture actor after the revocation check.
    await db.query('UPDATE staff_auth.authority SET active=true WHERE user_id=$1',[authorUser.id]);
    phase='browser harness';
    const {browserHarness}=await import('./browser-harness.ts');
    const harness=await browserHarness(config.origin,dispatch,{writer:writer.browserCookies,reviewer:reviewer.browserCookies,auditor:auditor.browserCookies});
    dispatch=harness.handler;
    console.log(`Browser fixture: ${config.origin}/fixture/session/writer`);
    await harness.finished;
  }
}catch(error){writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-04',result:'FAIL',database,phase,results,error:{name:error instanceof Error?error.name:'Error',code:String((error as {code?:string}).code??'UNCLASSIFIED')}},null,2));console.error(`FAIL ${phase}; artifact: ${artifact}`);process.exitCode=1;}
finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await Promise.all([runtime.staff.pool.end(),runtime.principal.pool.end(),runtime.pool.end(),db.end(),bootstrap.end()]);}
