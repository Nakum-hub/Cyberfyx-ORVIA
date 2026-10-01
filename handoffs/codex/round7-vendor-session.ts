// Synthetic, local sign-in diagnostic. Records only paths, statuses and timings.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, writeFileSync } from 'node:fs';
import { webkit } from '@playwright/test';
import { webProcess } from '../../scripts/web-process.ts';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
const label=process.env.R7_SESSION_LABEL??'before';
const delay=process.env.R7_SESSION_DELAY==='1';
if(!/^[a-z-]+$/.test(label)||process.env.ORVIA_PROFILE!=='codex-a00')throw new Error('Named synthetic profile and safe label required');
for(const kind of ['release','licence','audit'] as const)Object.assign(process.env,vendorSigningEnvironment(kind));
const origin=`http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
const journal=JSON.parse(readFileSync('.local/profiles/vendor-a00/auth/e2e-users.json','utf8'));
const command=webProcess({profile:'vendor-a00',app_port:PROFILES['vendor-a00'].app_port});
const child=spawn(process.execPath,command.args,{cwd:command.cwd,windowsHide:true,stdio:'ignore',env:{...command.env,ORVIA_PROFILE:'vendor-a00',NEXT_TELEMETRY_DISABLED:'1'}});
const events:unknown[]=[];
const record=(data:object)=>events.push({recorded_at:new Date().toISOString(),...data});
let browser:Awaited<ReturnType<typeof webkit.launch>>|undefined;
try {
  let ready=false;
  for(let i=0;i<120;i++){
    if(child.exitCode!==null)throw new Error('Vendor process exited');
    try{if((await fetch(`${origin}/readyz`,{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{/* waiting */}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(ready,'Vendor ready');browser=await webkit.launch({headless:true});
  for(const role of ['admin','lead','reviewer']) {
    const user=journal[role];assert.ok(user?.totp);
    const context=await browser.newContext({baseURL:origin});
    await context.exposeBinding('__r7Trace',(_,value)=>record({role,...value}));
    await context.addInitScript(`(()=>{
      const trace=event=>{void globalThis.__r7Trace({at:new Date().toISOString(),page:location.pathname,...event}).catch(()=>{});};
      const original=globalThis.fetch;
      globalThis.fetch=async(input,init)=>{
        const path=new URL(input instanceof Request?input.url:String(input),location.href).pathname;
        if(path!=='/api/v1/vendor/session')return original(input,init);
        trace({event:'session_fetch_started',url:path});
        try{const response=await original(input,init);trace({event:'session_fetch_response',url:path,status:response.status});return response;}
        catch(error){trace({event:'session_fetch_rejected',url:path,status:null,error:error instanceof Error?error.message:'unknown'});throw error;}
      };
      addEventListener('pagehide',()=>trace({event:'pagehide'}));
    })()`);
    const page=await context.newPage();
    let mfaComplete=false;
    if(delay){
      await page.route('**/vendor/engagements',async route=>{if(route.request().resourceType()==='document')await new Promise(resolve=>setTimeout(resolve,200));await route.continue();});
      await page.route('**/api/v1/vendor/session',async route=>{
        if(mfaComplete&&new URL(page.url()).pathname==='/vendor/sign-in'){
          record({role,event:'departing_session_delayed',url:'/api/v1/vendor/session',delay_ms:1000});
          await new Promise(resolve=>setTimeout(resolve,1000));
        }
        await route.continue().catch(()=>record({role,event:'route_closed_during_navigation'}));
      });
    }
    page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&frame.url().startsWith(origin))record({role,event:'navigation',page:new URL(frame.url()).pathname});});
    page.on('pageerror',error=>record({role,event:'pageerror',page:new URL(page.url()).pathname,message:error.message}));
    page.on('console',message=>{if(message.type()==='error')record({role,event:'console',page:new URL(page.url()).pathname,url:message.location().url,text:message.text()});});
    page.on('response',response=>{if(new URL(response.url()).pathname.includes('verify-totp')){mfaComplete=response.status()===200;record({role,event:'mfa_response',status:response.status(),page:new URL(page.url()).pathname});}});
    page.on('requestfailed',request=>{if(new URL(request.url()).pathname==='/api/v1/vendor/session')record({role,event:'session_request_failed',url:request.url(),page:new URL(page.url()).pathname,status:null,failure:request.failure()?.errorText});});
    await page.goto('/vendor/sign-in');
    await page.getByLabel(/^Email(?: \*)?$/).fill(user.email);
    await page.getByLabel(/^Password(?: \*)?$/).fill(user.password);
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByLabel(/^Authenticator code(?: \*)?$/).fill(authenticatorCode(user.totp));
    await page.getByRole('button',{name:'Verify authenticator',exact:true}).click();
    await page.waitForURL(/\/vendor\/engagements/,{timeout:30000});
    await page.getByRole('heading',{name:'DPDPA audit engagements',exact:true}).waitFor({timeout:30000});
    await page.waitForLoadState('networkidle');await page.waitForTimeout(1000);
    record({role,event:'destination_verified'});await context.close();
  }
}finally{
  await browser?.close();
  if(child.exitCode===null){const closed=once(child,'close');child.kill();await closed;}
  writeFileSync(`handoffs/codex/artifacts/R7V-vendor-session-${label}.json`,JSON.stringify({label,controlled_delay:delay,build:readFileSync('frontend/.next/BUILD_ID','utf8').trim(),events},null,2));
}
if(label.startsWith('after')){
  const rows=events as {role?:string;event?:string;page?:string;status?:number}[];
  for(const role of ['admin','lead','reviewer']){
    const own=rows.filter(row=>row.role===role);const mfa=own.findIndex(row=>row.event==='mfa_response'&&row.status===200);
    assert.ok(mfa>=0,'Real MFA succeeded');
    assert.equal(own.slice(mfa+1).filter(row=>row.event==='session_fetch_started'&&row.page==='/vendor/sign-in').length,0,'No redundant departing-page session fetch');
    assert.ok(own.some(row=>row.event==='session_fetch_response'&&row.page==='/vendor/engagements'&&row.status===200),'Destination reads an authenticated session');
    assert.equal(own.filter(row=>row.event==='pageerror').length,0,'No vendor session page error');
  }
}
console.log('Three synthetic vendor MFA sign-ins traced; see path/status-only artifact.');
