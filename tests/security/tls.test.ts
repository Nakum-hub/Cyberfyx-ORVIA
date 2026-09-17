import assert from 'node:assert/strict';
import { request } from 'node:https';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HttpFixture } from '../../packages/testing/src/http-fixture.ts';
import { writeEvidence,safeError } from '../../packages/testing/src/evidence.ts';
import { waitForAuthWindow } from '../../packages/testing/src/auth-window.ts';
import { connectDatabase } from '../../packages/db/src/index.ts';
import { loadProfile } from '../../packages/testing/src/config.ts';
const h=new HttpFixture();if(h.config.profile!=='rehearsal')throw new Error('TLS test owns rehearsal only');
const db=connectDatabase(loadProfile()).pool;const assertions:Record<string,unknown>[]=[];
function check(name:string,actual:unknown,expected:unknown){const pass=JSON.stringify(actual)===JSON.stringify(expected);assertions.push({name,actual,expected,result:pass?'PASS':'FAIL'});assert.equal(pass,true,name);console.log('PASS '+name);}
function probe(ca:Buffer|never[],servername='localhost'){return new Promise<{status?:number;error?:string}>((done)=>{const req=request(h.config.origin+'/healthz',{ca,servername,rejectUnauthorized:true},res=>{res.resume();done({status:res.statusCode});});req.setTimeout(5000,()=>req.destroy());req.once('error',error=>done({error:'code' in error?String(error.code):'ERROR'}));req.end();});}
try{
 await h.start();const ca=readFileSync(resolve(h.config.directory,'tls/ca-cert.pem'));
 check('trusted HTTPS chain and hostname accepted',(await probe(ca)).status,200);
 check('untrusted CA rejected',!!(await probe([])).error,true);
 check('wrong hostname rejected',(await probe(ca,'wrong-host.invalid')).error,'ERR_TLS_CERT_ALTNAME_INVALID');
 let plainDenied=false;try{await fetch(h.config.origin.replace('https:','http:')+'/healthz',{signal:AbortSignal.timeout(3000)});}catch{plainDenied=true;}check('plaintext application transport refused',plainDenied,true);
 await waitForAuthWindow(db);const principal=h.browser();const user=h.users.alice!;
 const signed=await principal.call('/api/auth/principal/sign-in/email',{email:user.email,password:user.password,rememberMe:false});check('real principal HTTPS sign-in',signed.status,200);
 const cookies=signed.headers.getSetCookie();check('principal secure cookie namespace',cookies.some(c=>c.startsWith('__Secure-orvia.principal.session_token=')),true);check('principal Secure HttpOnly strict cookies',cookies.filter(c=>c.startsWith('__Secure-orvia.principal')).every(c=>/; Secure/i.test(c)&&/HttpOnly/i.test(c)&&/SameSite=Strict/i.test(c)),true);
 check('principal scoped session over TLS',(await principal.call('/api/v1/session')).status,200);
 check('principal cannot read staff overview',(await principal.call('/api/v1/admin/overview')).status,403);
 const owner=await h.login('owner');check('staff MFA session over TLS',(await owner.call('/api/v1/session')).status,200);check('staff secure cookie namespace',owner.headers().cookie.includes('__Secure-orvia.staff.session_token='),true);
 check('staff cannot read principal consent',(await owner.call('/api/v1/portal/me/consents')).status,403);
}catch(error){console.error({...safeError(error),sites:error instanceof Error?error.stack?.split('\n').slice(1,4):[]});console.error(h.diagnostics);process.exitCode=1;}finally{await h.stop();await db.end();writeEvidence('tls-integration',{test_ids:['T02','T05','T29'],profile:h.config.profile,origin:h.config.origin,assertions,result:process.exitCode?'FAIL':'PASS',limitations:['Real verified Node HTTPS clients. No OS/browser trust installation, browser UI qualification or human rehearsal is inferred. Other development profiles remain HTTP.']});}
