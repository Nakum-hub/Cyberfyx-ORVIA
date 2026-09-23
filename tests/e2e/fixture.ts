import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HttpFixture, authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../shared/testing/src/scenario.ts';
import { connectDatabase } from '../../database/customer/src/index.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { waitForAuthWindow } from '../../shared/testing/src/auth-window.ts';
import { webProcess } from '../../scripts/web-process.ts';
import { writePrivateJson } from '../../scripts/local-private.ts';
import type { AuthFixture } from '../../scripts/auth-bootstrap.ts';

const exec=promisify(execFile);
export class BrowserHarness extends HttpFixture {
  profile=loadProfile(); db=connectDatabase(this.profile).pool;
  target=connectDatabase({...this.profile,database:this.profile.database+'_targets'}).pool;
  processes=new Set<ChildProcess>();
  publicDirectory=resolve('handoffs/codex/browser',`B06-playwright-${process.env.ORVIA_BROWSER_RUN_ID}`);
  privateDirectory=resolve('.local/browser-evidence',process.env.ORVIA_BROWSER_RUN_ID!);
  constructor(){super();const login=super.login.bind(this);const clients=new Map<string,ReturnType<HttpFixture['browser']>>();this.login=async name=>{if(!clients.has(name)){await this.authWindow();clients.set(name,await login(name));}return clients.get(name)!;};}
  // Same per-bucket measurement as guardAuthWindow, using the pool already held.
  async authWindow(){const r=(await this.db.query("SELECT count(*) FILTER (WHERE operation='/sign-in/email') sign_in, count(*) FILTER (WHERE operation LIKE '/two-factor/%') two_factor FROM staff_auth.auth_audit WHERE created_at>clock_timestamp()-interval '61 seconds'")).rows[0];if(Number(r.sign_in)>=6||Number(r.two_factor)>=6)await waitForAuthWindow(this.db);}
  async start(){
    if(this.profile.profile!=='rehearsal')throw new Error('Exclusive rehearsal profile required');
    const identity=(await this.db.query('SELECT installation_id,profile FROM bootstrap_profile WHERE singleton=1')).rows[0];
    if(identity?.installation_id!==this.profile.installation_id||identity?.profile!==this.profile.profile)throw new Error('Rehearsal database installation identity mismatch');
    const port=createServer();await new Promise<void>((done,fail)=>{port.once('error',fail);port.listen(this.config.app_port,'127.0.0.1',()=>port.close(()=>done()));});
    if((await this.db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name IN ('orvia_worker','orvia_agent_control') LIMIT 1")).rowCount)throw new Error('Stop the existing profile owner before browser fixtures');
    const command=webProcess(this.config);this.child=this.startProcess(command.args,command.cwd);
    await expect.poll(async()=>{try{return (await fetch(this.config.origin+'/healthz',{signal:AbortSignal.timeout(1000)})).status;}catch{return 0;}},{timeout:60000,intervals:[500]}).toBe(200);
    mkdirSync(this.publicDirectory,{recursive:true});
  }
  startProcess(args:string[],cwd=process.cwd()){
    const child=spawn(process.execPath,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,ORVIA_WORKSPACE_ROOT:process.cwd()}});this.processes.add(child);
    let output='';child.stdout?.on('data',c=>{output+=c;});child.stderr?.on('data',c=>{output+=c;});child.on('close',()=>writeFileSync(resolve(this.privateDirectory,`process-${child.pid}.txt`),output));return child;
  }
  async stopProcess(child:ChildProcess){if(child.exitCode===null&&child.signalCode===null){const closed=once(child,'close');let forced=false;if(child.connected)child.send('orvia-stop');else child.kill();const timer=setTimeout(()=>{forced=true;child.kill();},10000);await closed;clearTimeout(timer);if(forced||child.exitCode!==0)throw new Error('Owned browser fixture child failed graceful shutdown');}this.processes.delete(child);}
  async stop(){const failures:unknown[]=[];for(const child of [...this.processes].reverse())try{await this.stopProcess(child);}catch(error){failures.push(error);}if(failures.length)throw new AggregateError(failures,'Owned browser fixture cleanup failed');}
  async cli(file:string,args:string[]=[]){await exec(process.execPath,['--import','tsx',file,'confirm:rehearsal',...args],{windowsHide:true,timeout:120000,env:process.env});}
  scenario(connector:'SYNTHETIC_CRM'|'ORVIA_REST_SIMULATOR'|'LEGACY_MANUAL'='SYNTHETIC_CRM',required=true){return createMarketingScenario(this,connector,'promotional_marketing',required);}
  async workers(){await this.cli('scripts/machine-init.ts');const worker=this.startProcess(['--import','tsx','services/worker/src/main.ts']);const agent=this.startProcess(['--import','tsx','services/agent/src/main.ts']);return async()=>{await this.stopProcess(agent);await this.stopProcess(worker);};}
  async screenshot(page:Page,name:string){await page.screenshot({path:resolve(this.publicDirectory,name+'.png'),fullPage:false});}
}

export type BrowserLogEntry={kind:'PAGE_ERROR'|'CONSOLE_ERROR'|'REACT_WARNING'|'HTTP_STATUS'|'WARNING';text:string;url:string};
/** Marks an error this test deliberately provokes, so it is evidence rather than a failure. */
export function expectPageError(info:TestInfo,fragment:string){info.annotations.push({type:'expect-page-error',description:fragment});}
const REACT_DEFECT=/hydrat|did not match|Text content does not match|validateDOMNesting|Maximum update depth|Each child in a list|Cannot update a component/i;
// A deliberate 401/403/404/503 in a test surfaces as a browser resource log, not
// a JavaScript fault. Those are recorded with their status but never fail a run:
// the test's own assertions decide whether the status was correct.
const RESOURCE_LOG=/Failed to load resource/i;
function classify(type:string,text:string):BrowserLogEntry['kind']{
  if(RESOURCE_LOG.test(text))return 'HTTP_STATUS';
  if(REACT_DEFECT.test(text))return 'REACT_WARNING';
  return type==='error'?'CONSOLE_ERROR':'WARNING';
}
export const test=base.extend<{networkAudit:void;browserAudit:void},{h:BrowserHarness}>({
  h:[async({browserName},use)=>{
    if(browserName!=='chromium')throw new Error('This evidence suite pins Chromium');
    const h=new BrowserHarness();const lock=await h.db.connect();let heartbeat:ReturnType<typeof setInterval>|undefined;
    let failLease:(error:Error)=>void=()=>{};const leaseLost=new Promise<never>((_,reject)=>{failLease=reject;});
    // Keep the checked-out ownership connection active across long real suites.
    // The loopback relay expires idle sockets after five minutes. Losing this
    // connection also loses the advisory lock, so stop instead of continuing.
    lock.on('error',failLease);
    try{
      if(!(await lock.query('SELECT pg_try_advisory_lock(728107) locked')).rows[0].locked)throw new Error('Another browser suite owns rehearsal');
      await h.start();
      heartbeat=setInterval(()=>{void lock.query('SELECT 1').catch(failLease);},30000);
      await Promise.race([use(h),leaseLost]);
    }finally{if(heartbeat)clearInterval(heartbeat);try{await h.stop();}finally{lock.removeListener('error',failLease);lock.release();await Promise.all([h.db.end(),h.target.end()]);}}
  },{scope:'worker'}],
  networkAudit:[async({context,h},use,info)=>{
    const requests:{origin:string;path:string;method:string}[]=[];
    context.on('request',request=>{const url=new URL(request.url());requests.push({origin:url.origin,path:url.pathname,method:request.method()});});
    await use();writeFileSync(resolve(h.publicDirectory,`network-${info.testId}.json`),JSON.stringify({test:info.title,requests,scope:'This Playwright context only; not host-wide egress.'},null,2));
    expect(requests.filter(r=>r.origin!==h.config.origin)).toEqual([]);
  },{auto:true}],
  /**
   * Browser health as published evidence. Every page in the context is watched,
   * including pages opened later, and the result is written next to the network
   * record and summarised into results.json by the reporter. An uncaught page
   * error or a React correctness warning fails the run: qualification may not
   * pass while the interface is throwing.
   */
  browserAudit:[async({context,h},use,info)=>{
    const entries:BrowserLogEntry[]=[];
    const watch=(page:Page)=>{
      page.on('pageerror',error=>entries.push({kind:'PAGE_ERROR',text:`${error.name}: ${error.message}`.slice(0,500),url:page.url()}));
      page.on('console',message=>{const type=message.type();if(type!=='error'&&type!=='warning')return;
        entries.push({kind:classify(type,message.text()),text:message.text().slice(0,500),url:page.url()});});
    };
    context.on('page',watch);context.pages().forEach(watch);
    await use();
    const expected=info.annotations.filter(a=>a.type==='expect-page-error').map(a=>a.description??'');
    const isExpected=(entry:BrowserLogEntry)=>expected.some(fragment=>fragment&&entry.text.includes(fragment));
    const failing=entries.filter(e=>(e.kind==='PAGE_ERROR'||e.kind==='CONSOLE_ERROR'||e.kind==='REACT_WARNING')&&!isExpected(e));
    const matched=entries.filter(isExpected);
    writeFileSync(resolve(h.publicDirectory,`console-${info.testId}.json`),JSON.stringify({test:info.title,expected,
      // Every entry carries whether this test deliberately provoked it, so a
      // reader of the published evidence can never mistake the audit's own
      // capture probe for a real fault.
      entries:entries.map(entry=>({...entry,deliberate:isExpected(entry)})),
      counts:Object.fromEntries(['PAGE_ERROR','CONSOLE_ERROR','REACT_WARNING','HTTP_STATUS','WARNING'].map(k=>[k,entries.filter(e=>e.kind===k).length])),
      deliberate_errors_captured:matched.length,unexpected:failing.length,
      scope:'Console and page errors for this Playwright context only. Deliberate HTTP 401/403/404/503 responses are recorded as HTTP_STATUS and do not fail a run.'},null,2));
    if(expected.length)expect(matched.length,'a deliberately provoked page error must be captured by this audit').toBeGreaterThan(0);
    expect(failing,'uncaught page errors and React correctness warnings must not occur during qualification').toEqual([]);
  },{auto:true}],
});
export {expect};

export async function loginUi(page:Page,h:BrowserHarness,name:string){
  await h.authWindow();const user=h.users[name]!;const staff=user.domain==='staff';
  await page.goto(staff?'/workspace/sign-in':'/privacy/sign-in');
  await page.getByLabel(staff?'Staff email':'Email',{exact:!staff}).fill(user.email);
  await page.getByLabel('Password',{exact:true}).fill(user.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  if(staff&&user.role!=='AUDITOR'){
    if(!user.totp_uri){
      await page.getByLabel('Current password for enrollment').fill(user.password);await page.getByRole('button',{name:'Set up authenticator',exact:true}).click();
      await page.getByText('Show my authenticator enrollment and recovery codes',{exact:true}).click();
      user.totp_uri=await page.locator('code').filter({hasText:'otpauth://'}).innerText();
      const fixture=JSON.parse(readFileSync(h.journal,'utf8')) as AuthFixture;fixture.users[name]=user;writePrivateJson(h.journal,fixture);
      await page.getByText('Show my authenticator enrollment and recovery codes',{exact:true}).click();
    }
    await page.getByLabel('Authenticator code',{exact:true}).fill(authenticatorCode(user.totp_uri!));await page.getByRole('button',{name:'Verify authenticator',exact:true}).click();
  }
  await expect(page.getByRole('heading',{name:'Signed in',exact:true})).toBeVisible();
}

export async function choicePanel(page:Page,purpose:{id:string;name:string}){
  let response=page.waitForResponse(r=>r.url().includes('/portal/me/consents?')&&r.request().method()==='GET');await page.goto('/privacy');await response;
  for(let index=0;index<100;index++){
    await expect(page.locator('.state-block').filter({hasText:'Loading'})).toHaveCount(0);
    const card=page.getByRole('region',{name:purpose.name,exact:true});if(await card.count())return card;
    const next=page.getByRole('button',{name:'Next page',exact:true});await expect(next).toBeEnabled();response=page.waitForResponse(r=>r.url().includes('/portal/me/consents?')&&r.request().method()==='GET');await next.click();await response;
  }
  throw new Error('Purpose not found within bounded canonical pagination');
}

export async function grantUi(page:Page,purpose:{id:string;name:string}){
  const card=await choicePanel(page,purpose);await card.locator('summary').click();await expect(card.getByRole('button',{name:'Give consent',exact:true})).toBeDisabled();await card.getByRole('checkbox').check();
  const response=page.waitForResponse(r=>r.url().endsWith(`/consents/${purpose.id}/grant`));await card.getByRole('button',{name:'Give consent',exact:true}).click();const result=await response;expect(result.status()).toBe(202);return result.json();
}
export async function withdrawUi(page:Page,purpose:{id:string;name:string}){
  const card=await choicePanel(page,purpose);await card.getByRole('button',{name:'Withdraw consent',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Withdraw consent'});await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  const response=page.waitForResponse(r=>r.url().endsWith(`/consents/${purpose.id}/withdraw`));await dialog.getByRole('button',{name:'Withdraw consent',exact:true}).click();const result=await response;expect(result.status()).toBe(202);return result.json();
}
