// Synthetic two-installation channel qualification. Real HTTPS transport, no transport mock.
import {createServer, get} from 'node:https';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import * as S from '../../shared/contracts/src/index.ts';
import {operationsSuite,key} from '../../shared/testing/src/operations-fixture.ts';
import {vendorSigningEnvironment,vendorSigningKey,installationTrust} from '../../scripts/credentials.ts';
import {vendorHarness} from '../../tests/integration/vendor/harness.ts';
import {setupPractice,acceptEngagement} from '../../tests/integration/vendor/practice-flow.ts';
import {runtimeConfig} from '../../backend/auth/src/config.ts';
import {workerEnrollment} from '../../backend/auth/src/machine-profile.ts';
import {servicePool,machineAuthority} from '../../backend/auth/src/machine.ts';
import {scopedTransaction} from '../../database/customer/src/runtime.ts';
import {channelSweep} from '../../backend/domain/src/dpdpa-audit/channel.ts';
import type {Context} from '../../backend/domain/src/shared/transaction.ts';

for(const kind of ['release','licence','audit'] as const) Object.assign(process.env,vendorSigningEnvironment(kind));
const root=process.env.ORVIA_WORKSPACE_ROOT!;
const certDir=resolve(root,'.local/profiles/rehearsal/tls');
const address='https://127.0.0.1:54430';
const trustPath=resolve(root,'.local/profiles/codex-a00/trust/vendor-public-keys.json');
const oldTrust=readFileSync(trustPath);
writeFileSync(trustPath,JSON.stringify({...JSON.parse(oldTrust.toString()),audit_service:{url:address}}));
const t=operationsSuite('local-audit-tls'); const {h,ok,check}=t;
const day=(n:number)=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
let networkCalls=0;
try { await t.run(async()=>{
 const vendor=await vendorHarness();
 const server=createServer({key:readFileSync(resolve(certDir,'server-key.pem')),cert:readFileSync(resolve(certDir,'server-cert.pem')),minVersion:'TLSv1.2'},async(req,res)=>{
  try {
   const chunks:Buffer[]=[]; for await(const chunk of req) chunks.push(Buffer.from(chunk));
   const body=Buffer.concat(chunks); networkCalls++;
   const headers=new Headers();for(const [name,value] of Object.entries(req.headers)) if(value) headers.set(name,Array.isArray(value)?value.join(','):value);
   const response=await vendor.handler(new Request(address+req.url,{method:req.method,headers,...body.length?{body:new Uint8Array(body)}:{}}));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch {res.writeHead(500);res.end();}
 });
 await new Promise<void>((done,fail)=>{server.once('error',fail);server.listen(54430,'127.0.0.1',done);});
 const cfg=runtimeConfig(); const pool=servicePool(cfg,'orvia_worker');
 try {
  const reject=(options:object)=>new Promise<string>(done=>{const r=get(address,options,res=>{res.resume();done('UNEXPECTED_SUCCESS');});r.on('error',(e:NodeJS.ErrnoException)=>done(e.code??e.message));});
  check('untrusted CA is rejected before channel data is sent',(await reject({ca:[]})).includes('CERT'),true);
  check('wrong TLS hostname is rejected',await reject({ca:readFileSync(resolve(certDir,'ca-cert.pem')),servername:'wrong.example'}),'ERR_TLS_CERT_ALTNAME_INVALID');
  check('configured trust file names only the local HTTPS vendor',installationTrust('codex-a00')?.audit_service?.url,address);
  const setup=await vendor.issueSetupCode();const anon=vendor.session();
  const va={email:'admin@vendor.example',password:`Admin-${randomUUID()}`,domain:'vendor' as const};
  check('isolated vendor setup', (await anon.json('/api/v1/vendor/setup',{setup_code:setup,owner:{name:'Synthetic owner',email:'owner@vendor.example',password:`Owner-${randomUUID()}`},admin:{name:'Synthetic admin',email:va.email,password:va.password}})).status,201);
  const vadm=await vendor.login(va);
  const member=async(name:string,role:string)=>{const r=await vadm.json('/api/v1/vendor/team',{name,email:name+'@vendor.example',role});return {id:r.data.member.user_id as string,s:await vendor.login({email:name+'@vendor.example',password:r.data.one_time_password,domain:'vendor'})};};
  const lead=await member('lead','LEAD_AUDITOR');const reviewer=await member('reviewer','AUDIT_REVIEWER');
  const org=await vadm.json('/api/v1/vendor/organisations',{name:'Synthetic TLS organisation',registered_address:null});
  const req='DPDP-NOTICE-CONSENT-REQUEST';const reference='ENG-TLS-'+randomUUID().slice(0,8);
  const eng=await vadm.json('/api/v1/vendor/engagements',{organisation_id:org.data.id,reference,scope_requirement_ids:[req],period_from:day(-30),period_to:day(10)});
  const vid=eng.data.engagement_id;
  await vadm.json(`/api/v1/vendor/engagements/${vid}/team`,{user_id:lead.id,engagement_role:'LEAD'});
  await vadm.json(`/api/v1/vendor/engagements/${vid}/team`,{user_id:reviewer.id,engagement_role:'REVIEWER'});
  const practice=await setupPractice(lead.s,reviewer.s);
  await acceptEngagement({admin:vadm,reviewer:reviewer.s,lead:lead.s,engagementId:vid,...practice});
  const admin=await h.login('admin');const approver=await h.login('reviewer');await t.ensurePackage();
  const client=await ok(admin.call('/api/v1/admin/audit-engagements',{engagement_code:eng.data.engagement_code,firm_name:'Synthetic TLS audit practice',engagement_reference:reference,scope_requirement_ids:[req],period_from:day(-30),period_to:day(10),processing_agreement_reference:null,independence_statement:null,empanelment_reference:null},key()),S.schemas.AuditEngagement);
  const draft=await ok(admin.call(`/api/v1/admin/audit-engagements/${client.id}/mandates`,{kind:'ENGAGEMENT',scope_requirement_ids:[req],categories:['INDICATORS'],schedule:'DAILY',valid_from:new Date(Date.now()-60000).toISOString(),valid_to:new Date(Date.now()+86400000).toISOString()},key()),S.schemas.AuditMandate);
  const mandate=await ok(approver.call(`/api/v1/admin/audit-mandates/${draft.id}/approval`,{},key()),S.schemas.AuditMandate);
  check('distinct approver activates the mandate',mandate.open,true);
  const identity=workerEnrollment(cfg).identities.find(i=>i.scope.environment_id===t.scope().environment_id)!;const actor=machineAuthority(identity);const audit=vendorSigningKey('audit');
  const sweep=()=>channelSweep(<T>(work:(c:Context)=>Promise<T>)=>scopedTransaction(pool,actor,tx=>work({tx,actor,requestId:randomUUID()})),{address,auditKey:{key_id:audit.key_id,public:audit.public},sealKey:createHash('sha256').update('orvia-evidence-key-seal:'+cfg.secret('principal-secret')).digest(),checkInSeconds:60});
  const first=await sweep();check('real HTTPS accepts a signed snapshot',first.deliveries_accepted>=1,true);
  const issued=await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel/requests`,{kind:'COLLECT_NOW',requirement_id:null,categories:['INDICATORS'],population:null,sample_size:null,description:'Synthetic TLS qualification request',due_date:day(1)});
  // vendor/routes.ts returns 200 for channel/requests (201 is limited to its
  // top-level creation routes); verify the recorded request below as well.
  check('auditor request recorded',issued.status,200);
  await t.db.query("UPDATE app.audit_mandates SET last_check_in_at=last_check_in_at-interval '1 hour' WHERE id=$1",[mandate.id]);
  const second=await sweep();check('HTTPS request received and response accepted',[second.requests_received>=1,second.deliveries_accepted>=1],[true,true]);
  const view=await ok(approver.call(`/api/v1/admin/audit-engagements/${client.id}/channel`),S.schemas.AuditChannel);
  check('durable accepted delivery receipts',view.deliveries.filter(x=>x.state==='ACCEPTED').length>=2,true);
  check('actual HTTPS requests reached vendor',networkCalls>=4,true);
  await ok(admin.call(`/api/v1/admin/audit-engagements/${client.id}/closure`,{reason:'Synthetic local TLS qualification completed.'},key()),S.schemas.AuditEngagement);
 }finally {await pool.end();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await vendor.close();}
}); }finally {writeFileSync(trustPath,oldTrust);}
