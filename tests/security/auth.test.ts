import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { webProcess } from '../../scripts/web-process.ts';
import { once } from 'node:events';
import { runtimeConfig } from '../../packages/auth/src/config.ts';
import { createAuth } from '../../packages/auth/src/server.ts';
import { authorityFor, requireCapability, AccessError } from '../../packages/authz/src/index.ts';
import { runtimePool, scopedTransaction } from '../../packages/db/src/runtime.ts';
import { connectDatabase } from '../../packages/db/src/index.ts';
import { loadProfile } from '../../packages/testing/src/config.ts';
import { writeEvidence, safeError } from '../../packages/testing/src/evidence.ts';
import { Session, schemas } from '../../packages/contracts/src/index.ts';
import type { AuthFixture, FixtureUser } from '../../scripts/auth-bootstrap.ts';
import { writePrivateJson } from '../../scripts/local-private.ts';

const config = runtimeConfig();
if (!['codex-a00','rehearsal'].includes(config.profile)) throw new Error('This suite owns only codex-a00/rehearsal synthetic fixtures');
const credentialPath = resolve(config.directory,'auth/bootstrap.json');
const fixture: AuthFixture = JSON.parse(readFileSync(credentialPath,'utf8'));
if (fixture.installation_id !== config.installation_id || fixture.fixture_id !== 'aster-birch-v1' || !fixture.users.birch) throw new Error('Run protected fixture seed first');
const root = process.cwd();
const command=webProcess(config);
const staff = createAuth(config,'staff'); const principal = createAuth(config,'principal');
const app = runtimePool(config,'orvia_app'); const admin = connectDatabase(loadProfile()).pool;
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
let child: ChildProcess | undefined;
let serverOutput = '';
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual,expected); assertions.push({ name,result:'PASS',expected,actual }); console.log(`PASS ${name}`); }
  catch { assertions.push({ name,result:'FAIL',expected,actual }); throw new Error(`Assertion failed: ${name}`); }
}
async function start() {
  child = spawn(process.execPath,command.args, {
    cwd:command.cwd,windowsHide:true,stdio:['ignore','pipe','pipe'],
    env:{...process.env,ORVIA_WORKSPACE_ROOT:root,NEXT_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1',BETTER_AUTH_TELEMETRY:'0'},
  });
  child.stdout?.on('data',chunk=>{serverOutput+=chunk;}); child.stderr?.on('data',chunk=>{serverOutput+=chunk;});
  for(let attempt=0;attempt<90;attempt++) {
    if(child.exitCode!==null)throw new Error('Owned web process exited before readiness');
    try { if((await fetch(config.origin+'/healthz',{signal:AbortSignal.timeout(1000)})).ok)return; } catch { /* bounded readiness probe */ }
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new Error('Web readiness timed out');
}
async function stop() { if(child&&child.exitCode===null){const closed=once(child,'close');child.kill();await closed;} }
class Browser {
  cookies = new Map<string,string>();
  header() { return [...this.cookies].map(([key,value])=>`${key}=${value}`).join('; '); }
  async call(path: string, body?: unknown, extra: Record<string,string> = {}) {
    const response=await fetch(config.origin+path,{method:body===undefined?'GET':'POST',headers:{cookie:this.header(),origin:config.origin,'content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
    for(const cookie of response.headers.getSetCookie()) {const value=cookie.split(';')[0]!;const at=value.indexOf('=');this.cookies.set(value.slice(0,at),value.slice(at+1));}
    return response;
  }
}
// Independent test authenticator for the real library TOTP verifier. Never shipped
// as an authentication implementation. It reads only the local synthetic fixture.
function totp(uri: string) {
  const secret=new URL(uri).searchParams.get('secret')!; const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits=[...secret.toUpperCase().replaceAll('=','')].map(char=>alphabet.indexOf(char).toString(2).padStart(5,'0')).join('');
  const bytes=Buffer.from((bits.match(/.{8}/g)??[]).map(byte=>parseInt(byte,2))); const counter=Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hmac=createHmac('sha1',bytes).update(counter).digest();
  const offset=hmac.at(-1)!&15;return ((hmac.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
async function login(name: string, useMfa = true) {
  const user=fixture.users[name]!; const browser=new Browser();const base=`/api/auth/${user.domain}`;
  const response=await browser.call(base+'/sign-in/email',{email:user.email,password:user.password,rememberMe:false});
  check(`${name}: real password sign-in`,response.status,200);const body=await response.json();
  check(`${name}: HttpOnly and strict SameSite cookies`,response.headers.getSetCookie().some(cookie=>/HttpOnly/i.test(cookie)&&/SameSite=Strict/i.test(cookie)),true);
  if(user.domain==='staff'&&user.role!=='AUDITOR'&&useMfa) {
    const pendingCookie=browser.header();
    if(!user.totp_uri) {
      check(`${name}: pre-MFA business session denied`,(await browser.call('/api/v1/session')).status,403);
      const setup=await browser.call(base+'/two-factor/enable',{password:user.password,method:'totp'});
      check(`${name}: library MFA enrollment`,setup.status,200);
      const enrollment=await setup.json();user.totp_uri=enrollment.totpURI;
      writePrivateJson(credentialPath,fixture);
    } else check(`${name}: MFA challenge required`,body.twoFactorRedirect,true);
    if(name==='owner') {
      const code=totp(user.totp_uri!);const invalid=code.slice(0,-1)+((Number(code.at(-1))+1)%10);
      check('wrong MFA code rejected',(await browser.call(base+'/two-factor/verify-totp',{code:invalid,trustDevice:false})).status,401);
      check('failed MFA does not grant authority',(await browser.call('/api/v1/session')).status,user.totp_uri&&body.twoFactorRedirect?401:403);
    }
    check(`${name}: real TOTP verification`,(await browser.call(base+'/two-factor/verify-totp',{code:totp(user.totp_uri!),trustDevice:false})).status,200);
    check(`${name}: password-only or pending cookie remains denied`,(await fetch(config.origin+'/api/v1/session',{headers:{cookie:pendingCookie}})).status,401);
  }
  return browser;
}
function requestFor(browser: Browser) { return new Request(config.origin+'/api/v1/session',{headers:{cookie:browser.header()}}); }
function inputFor(user: FixtureUser) { return {legal_entity_id:user.scope.legal_entity_id,environment_id:user.scope.environment_id,display_name:'Synthetic API-created principal',email:`created.${randomUUID()}@aster.example`}; }
async function databaseDenial(name: string, operation: ()=>Promise<unknown>, code='42501') {
  let observed='NO_ERROR';try { await operation(); } catch(error) { observed=safeError(error).code; } check(name,observed,code);
}

try {
  await start();
  const anonymous=new Browser();
  const anonymousDenied=await anonymous.call('/api/v1/session');
  check('unauthenticated session denied',anonymousDenied.status,401);
  const denialAudit=await admin.query('SELECT operation,status FROM app.request_audit WHERE id=$1',[anonymousDenied.headers.get('x-request-id')]);
  check('anonymous denial is persistently audited',denialAudit.rows[0],{operation:'SESSION_READ',status:401});
  check('public signup unavailable',(await anonymous.call('/api/auth/staff/sign-up/email',{})).status,404);
  check('foreign origin denied',(await anonymous.call('/api/auth/staff/sign-in/email',{}, {origin:'https://invalid.example'})).status,403);
  check('role field cannot grant authority',(await anonymous.call('/api/auth/staff/sign-in/email',{email:fixture.users.owner!.email,password:fixture.users.owner!.password,role:'ORG_SUPER_ADMIN'})).status,400);
  check('machine bearer cannot become human',(await anonymous.call('/api/v1/session',undefined,{authorization:'Bearer synthetic-invalid'})).status,401);
  const badPassword=await anonymous.call('/api/auth/staff/sign-in/email',{email:fixture.users.owner!.email,password:'synthetic-wrong-password'});
  check('wrong password denied',badPassword.status,401);
  const missingUser=await anonymous.call('/api/auth/staff/sign-in/email',{email:`missing.${randomUUID()}@aster.example`,password:'synthetic-wrong-password'});
  check('unknown identity has same denial',missingUser.status,401);
  check('login errors resist enumeration',(await missingUser.json()).code,(await badPassword.json()).code);
  const owner=await login('owner');
  const session=Session.parse(await (await owner.call('/api/v1/session')).json());
  check('server-derived owner scope',session.scope,fixture.users.owner!.scope);
  check('owner MFA proof is session-specific',session.actor_domain==='STAFF'&&session.mfa_verified,true);
  const cookie=owner.header();check('staff cookie namespace',cookie.includes('orvia.staff.session_token='),true);
  const key=randomUUID();const input=inputFor(fixture.users.owner!);
  const created=await owner.call('/api/v1/admin/principals',input,{'idempotency-key':key});
  check('authenticated persistent creation',created.status,201);const resource=await created.json();
  check('idempotent principal retry',(await (await owner.call('/api/v1/admin/principals',input,{'idempotency-key':key})).json()).id,resource.id);
  check('conflicting key denied',(await owner.call('/api/v1/admin/principals',{...input,display_name:'Changed'}, {'idempotency-key':key})).status,409);
  check('duplicate principal is safe validation failure',(await owner.call('/api/v1/admin/principals',input,{'idempotency-key':randomUUID()})).status,400);
  check('accepted maximum idempotency-key length',(await owner.call('/api/v1/admin/principals',inputFor(fixture.users.owner!),{'idempotency-key':randomUUID().replaceAll('-','').repeat(4)})).status,201);
  check('wrong tenant body denied',(await owner.call('/api/v1/admin/principals',inputFor(fixture.users.birch!),{'idempotency-key':randomUUID()})).status,404);
  check('sibling environment body denied',(await owner.call('/api/v1/admin/principals',inputFor(fixture.users.sibling!),{'idempotency-key':randomUUID()})).status,404);
  check('unexpected scope selector denied',(await owner.call('/api/v1/admin/principals?tenant_id='+fixture.users.birch!.scope.tenant_id)).status,400);
  check('malformed cursor denied',(await owner.call('/api/v1/admin/principals?cursor=bad')).status,400);
  check('over-limit page denied',(await owner.call('/api/v1/admin/principals?limit=101')).status,400);
  const listed=schemas.PrincipalList.parse(await (await owner.call('/api/v1/admin/principals?limit=100')).json());
  check('created resource is persisted and listed',listed.items.some(item=>item.id===resource.id),true);
  check('directory excludes other tenant principal',listed.items.some(item=>item.id===fixture.users.birch_principal!.principal_id),false);
  const auditor=await login('auditor');
  check('auditor read allowed',(await auditor.call('/api/v1/admin/principals')).status,200);
  check('auditor mutation denied',(await auditor.call('/api/v1/admin/principals',input,{'idempotency-key':randomUUID()})).status,403);
  const enrollmentUser=await login('reviewer',false);
  const enrollmentPath='/api/auth/staff/two-factor/enable';
  const enrollmentResponse=await enrollmentUser.call(enrollmentPath,{password:fixture.users.reviewer!.password,method:'totp'});
  check('separate enrollment fixture started',enrollmentResponse.status,200);
  const enrollment=await enrollmentResponse.json();
  check('unverified enrollment backup code cannot establish MFA',(await enrollmentUser.call('/api/auth/staff/two-factor/verify-backup-code',{code:enrollment.backupCodes[0],trustDevice:false})).status,403);
  check('enrollment bypass attempt leaves privileged access denied',(await enrollmentUser.call('/api/v1/session')).status,403);
  const member=await login('member');
  check('member directory denied',(await member.call('/api/v1/admin/principals')).status,403);
  check('member mutation denied',(await member.call('/api/v1/admin/principals',input,{'idempotency-key':randomUUID()})).status,403);
  const delegated=await login('admin');const adminActor=await authorityFor(requestFor(delegated),staff,principal);
  check('delegated admin can prepare scoped principals',(await delegated.call('/api/v1/admin/principals',inputFor(fixture.users.admin!),{'idempotency-key':randomUUID()})).status,201);
  let publishDenied=0;try {await requireCapability(config,adminActor,'STAFF','policy.publish');}catch(error){if(error instanceof AccessError)publishDenied=error.status;}
  check('delegated admin cannot acquire reviewer capability',publishDenied,403);
  const auditorActor=await authorityFor(requestFor(auditor),staff,principal);
  await databaseDenial('auditor direct SQL mutation denied by RLS',()=>scopedTransaction(app,auditorActor,tx=>tx.query('INSERT INTO app.principal_references VALUES ($1,$2,$3,$4,$5,$6,true)',[auditorActor.scope.tenant_id,auditorActor.scope.legal_entity_id,auditorActor.scope.environment_id,randomUUID(),'Denied synthetic',`denied.${randomUUID()}@aster.example`])));
  const alice=await login('alice');const aliceActor=await authorityFor(requestFor(alice),staff,principal);
  check('principal server binding',aliceActor.principal_id,fixture.users.alice!.principal_id);
  check('principal cannot read staff directory',(await alice.call('/api/v1/admin/principals')).status,403);
  const ownerActor=await authorityFor(requestFor(owner),staff,principal);
  let staffAsPrincipal=0;try {await requireCapability(config,ownerActor,'PRINCIPAL','consent.own.write');}catch(error){if(error instanceof AccessError)staffAsPrincipal=error.status;}
  check('staff denied by own-principal authority guard',staffAsPrincipal,403);
  const mixed=new Browser();mixed.cookies=new Map([...owner.cookies,...alice.cookies]);
  check('ambiguous dual-domain session denied',(await mixed.call('/api/v1/session')).status,403);
  const wrongCookie=new Browser();wrongCookie.cookies=new Map([...owner.cookies].map(([key,value])=>[key.replace('orvia.staff','orvia.principal'),value]));
  check('staff cookie cannot authenticate principal mount',(await wrongCookie.call('/api/v1/session')).status,401);
  const ownRows=await scopedTransaction(app,aliceActor,tx=>tx.query('SELECT id FROM app.principal_references'));
  check('principal RLS exposes only own reference',ownRows.rows.map(row=>row.id),[fixture.users.alice!.principal_id]);
  const wrongPrincipal=await scopedTransaction(app,aliceActor,tx=>tx.query('SELECT id FROM app.principal_references WHERE id=$1',[fixture.users.bob!.principal_id]));
  check('wrong-principal direct SQL denied',wrongPrincipal.rowCount,0);
  const otherTenant=await scopedTransaction(app,ownerActor,tx=>tx.query('SELECT id FROM app.principal_references WHERE tenant_id=$1',[fixture.users.birch!.scope.tenant_id]));
  check('unscoped SQL cannot cross tenant',otherTenant.rowCount,0);
  const siblingRows=await scopedTransaction(app,ownerActor,tx=>tx.query('SELECT id FROM app.environments WHERE id=$1',[fixture.users.sibling!.scope.environment_id]));
  check('unscoped SQL cannot cross sibling environment',siblingRows.rowCount,0);
  check('pool clears successful transaction scope',(await app.query('SELECT id FROM app.principal_references')).rowCount,0);
  try {await scopedTransaction(app,ownerActor,async()=>{throw new Error('Injected rollback');});}catch{/* expected rollback */}
  check('pool clears failed transaction scope',(await app.query('SELECT id FROM app.principal_references')).rowCount,0);
  await databaseDenial('application cannot read auth credentials',()=>app.query('SELECT password FROM staff_auth.account'));
  await databaseDenial('application cannot enumerate global transport audit',()=>app.query('SELECT * FROM app.request_audit'));
  await databaseDenial('application cannot assume migrator',()=>app.query('SET ROLE orvia_migrator'));
  await databaseDenial('auth role cannot alter authority',()=>staff.pool.query("UPDATE staff_auth.authority SET role='ORG_SUPER_ADMIN'"));
  await databaseDenial('staff auth cannot read principal store',()=>staff.pool.query('SELECT * FROM principal_auth.session'));
  const role=await app.query('SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');
  check('application role has no privileged bypass',role.rows[0],{rolsuper:false,rolbypassrls:false,rolcreatedb:false,rolcreaterole:false});
  const tables=await admin.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='app' AND (r.rolname='orvia_app' OR (c.relkind='r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)))");
  check('protected tables force RLS and are not app-owned',tables.rows[0].count,0);
  await databaseDenial('tenant-aware foreign key rejects sibling parent',()=>admin.query('INSERT INTO app.environments VALUES ($1,$2,$3,$4)',[fixture.users.birch!.scope.tenant_id,fixture.users.owner!.scope.legal_entity_id,randomUUID(),'Invalid synthetic reference']),'23503');
  const faultInput=inputFor(fixture.users.owner!);
  const stopped=spawnSync('docker',['stop',`${config.compose_project}-opa-1`],{encoding:'utf8',windowsHide:true});
  check('docker stop named profile OPA exit',stopped.status,0);
  try {
    check('administrative policy outage blocks mutation',(await owner.call('/api/v1/admin/principals',faultInput,{'idempotency-key':randomUUID()})).status,503);
    check('policy outage creates no principal',(await admin.query('SELECT id FROM app.principal_references WHERE email=$1',[faultInput.email])).rowCount,0);
  } finally {
    const restarted=spawnSync('docker',['start',`${config.compose_project}-opa-1`],{encoding:'utf8',windowsHide:true});
    check('docker start named profile OPA exit',restarted.status,0);
    let restored=false;
    for(let attempt=0;attempt<30;attempt++) {
      try { if((await owner.call('/api/v1/admin/principals')).status===200){restored=true;break;} }catch{/* bounded service readiness */}
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    check('administrative policy recovered',restored,true);
  }
  await stop(); await start();
  check('persisted session survives application restart',(await owner.call('/api/v1/session')).status,200);
  const afterRestart=schemas.PrincipalList.parse(await (await owner.call('/api/v1/admin/principals?limit=100')).json());
  check('persisted record survives application restart',afterRestart.items.some(item=>item.id===resource.id),true);
  const revokedCookie=owner.header();
  check('library revocation succeeds',(await owner.call('/api/auth/staff/revoke-sessions',{})).status,200);
  check('revoked cookie rejected',(await fetch(config.origin+'/api/v1/session',{headers:{cookie:revokedCookie}})).status,401);
  const aliceCookie=alice.header();check('principal logout succeeds',(await alice.call('/api/auth/principal/sign-out',{})).status,200);
  check('logged-out principal cookie rejected',(await fetch(config.origin+'/api/v1/session',{headers:{cookie:aliceCookie}})).status,401);
  writeEvidence('auth-security',{result:'PASS',test_ids:['T02','T03','T04','T05','T27'],profile:config.profile,origin:config.origin,fixture_id:fixture.fixture_id,build_id:readFileSync('apps/web/.next/BUILD_ID','utf8').trim(),assertions,
    limitations:['This suite covers API/database authentication and authority; other suites cover consent, workflows, exports and runtime egress. Browser flows are not covered here.',config.profile==='rehearsal'?'Verified HTTPS rehearsal with per-process local CA trust; OS/browser trust is not installed.':'HTTP loopback development; TLS is not qualified in this profile.']});
} catch(error) {
  console.error(safeError(error));
  // No request/response bodies, cookies, passwords or TOTP material in evidence.
  writeEvidence('auth-security',{result:'FAIL',profile:config.profile,assertions,error:safeError(error),server_output:serverOutput});process.exitCode=1;
} finally {await stop();await Promise.all([staff.pool.end(),principal.pool.end(),app.end(),admin.end()]);}
