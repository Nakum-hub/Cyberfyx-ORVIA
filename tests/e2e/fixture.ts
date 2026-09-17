import { test as base, expect, type Page, type BrowserContext, type TestInfo } from '@playwright/test';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HttpFixture, authenticatorCode } from '../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../packages/testing/src/scenario.ts';
import { connectDatabase } from '../../packages/db/src/index.ts';
import { loadProfile } from '../../packages/testing/src/config.ts';
import { waitForAuthWindow } from '../../packages/testing/src/auth-window.ts';
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
  async authWindow(){const n=Number((await this.db.query("SELECT count(*) n FROM staff_auth.auth_audit WHERE created_at>clock_timestamp()-interval '61 seconds' AND operation IN ('/sign-in/email','/two-factor/verify-totp')")).rows[0].n);if(n>=8)await waitForAuthWindow(this.db);}
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
  async workers(){await this.cli('scripts/machine-init.ts');const worker=this.startProcess(['--import','tsx','apps/worker/src/main.ts']);const agent=this.startProcess(['--import','tsx','apps/agent/src/main.ts']);return async()=>{await this.stopProcess(agent);await this.stopProcess(worker);};}
  async screenshot(page:Page,name:string){await page.screenshot({path:resolve(this.publicDirectory,name+'.png'),fullPage:false});}
}

export const test=base.extend<{networkAudit:void},{h:BrowserHarness}>({
  h:[async({browserName},use)=>{
    if(browserName!=='chromium')throw new Error('This evidence suite pins Chromium');
    const h=new BrowserHarness();const lock=await h.db.connect();
    try{if(!(await lock.query('SELECT pg_try_advisory_lock(728107) locked')).rows[0].locked)throw new Error('Another browser suite owns rehearsal');await h.start();await use(h);}
    finally{try{await h.stop();}finally{lock.release();await Promise.all([h.db.end(),h.target.end()]);}}
  },{scope:'worker'}],
  networkAudit:[async({context,h},use,info)=>{
    const requests:{origin:string;path:string;method:string}[]=[];
    context.on('request',request=>{const url=new URL(request.url());requests.push({origin:url.origin,path:url.pathname,method:request.method()});});
    await use();writeFileSync(resolve(h.publicDirectory,`network-${info.testId}.json`),JSON.stringify({test:info.title,requests,scope:'This Playwright context only; not host-wide egress.'},null,2));
    expect(requests.filter(r=>r.origin!==h.config.origin)).toEqual([]);
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
export async function newContextPage(context:BrowserContext,info:TestInfo){const page=await context.newPage();page.on('pageerror',()=>info.annotations.push({type:'browser-page-error',description:'See protected raw trace'}));return page;}
