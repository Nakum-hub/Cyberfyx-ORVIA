// Diagnose observed post-network-idle loading without changing app or crawl assertions.
import { webkit } from '@playwright/test';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpFixture, authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
const h=new HttpFixture();
if(h.config.profile!=='codex-a00')throw new Error('Named synthetic profile only');
const evidence:unknown[]=[];
const record=(data:unknown)=>evidence.push({at:new Date().toISOString(),...data as object});
const label=process.env.R7_LOADING_LABEL??'probe';
if(!/^[a-z-]+$/.test(label))throw new Error('Invalid label');
const walk=(directory:string,prefix:string):string[]=>readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(directory,e.name),`${prefix}/${e.name}`):e.name==='page.tsx'?[prefix]:[]);
try {
  await h.start();const browser=await webkit.launch({headless:true});
  try {
    const anonymous=label==='background'?await browser.newContext({baseURL:h.config.origin}):null;
    if(anonymous){const page=await anonymous.newPage();for(const path of ['/workspace/sign-in','/privacy/sign-in','/setup','/supplier','/privacy','/no-such-page','/vendor']){await page.goto(path);await page.waitForLoadState('networkidle');await page.screenshot();}}
    for(const role of ['owner','admin','auditor']) {
      const context=await browser.newContext({baseURL:h.config.origin,viewport:{width:1440,height:1000}});
      const page=await context.newPage();
      const pending=new Set<string>();
      page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/v1/'))pending.add(new URL(r.url()).pathname);});
      page.on('requestfinished',r=>pending.delete(new URL(r.url()).pathname));
      page.on('requestfailed',r=>pending.delete(new URL(r.url()).pathname));
      page.on('console',m=>{if(m.type()==='error')record({role,event:'console',text:m.text(),source:m.location().url});});
      page.on('pageerror',e=>record({role,event:'pageerror',message:e.message}));
      page.on('request',r=>{if(new URL(r.url()).pathname==='/api/v1/session')record({role,event:'session-request',page:page.url()});});
      page.on('response',r=>{if(new URL(r.url()).pathname==='/api/v1/session')record({role,event:'session-response',page:page.url(),status:r.status()});});
      page.on('requestfailed',r=>record({role,event:'request-failed',page:page.url(),path:new URL(r.url()).pathname,type:r.resourceType(),error:r.failure()?.errorText}));
      await h.authWindow();const user=h.users[role]!;
      await page.goto('/workspace/sign-in');
      await page.getByLabel('Staff email').fill(user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      if(user.totp_uri){await page.getByLabel('Authenticator code',{exact:true}).fill(authenticatorCode(user.totp_uri));await page.getByRole('button',{name:'Verify authenticator',exact:true}).click();}
      await page.getByRole('heading',{name:'Signed in',exact:true}).waitFor({timeout:30000});
      const paths=['wide','background'].includes(label)&&role==='owner'?walk('frontend/src/app/workspace','/workspace').filter(p=>!p.includes('[')&&p!=='/workspace/sign-in').sort():['/workspace','/workspace/coverage','/workspace/data-principals'];
      for(const path of paths) {
        await page.goto(path,{waitUntil:'domcontentloaded'});await page.waitForLoadState('networkidle');await page.waitForTimeout(400);
        const probe=async(label:string)=>{
          const state=await page.evaluate(()=>{
            const text=((document.querySelector('main') as HTMLElement|null)?.innerText??'').trim();
            return {visibility:document.visibilityState,focused:document.hasFocus(),ready:document.readyState,main_length:text.length,loading:/^(loading|reading|opening)/i.test(text)&&text.length<80,loading_text:text.length<80?text:null};
          });record({role,path,label,pending:[...pending],...state});console.log(`${role} ${path}: ${label}, loading=${state.loading}, pending=${pending.size}`);return state;
        };
        const initial=await probe('networkidle + 400ms');
        if(initial.loading) {
          for(const delay of [1000,2000,5000]){await page.waitForTimeout(delay);if(!(await probe(`additional ${delay}ms`)).loading)break;}
          await page.bringToFront();await page.waitForTimeout(1000);await probe('after bringToFront + 1000ms');
        }
        // The crawl takes screenshots for its first (owner) context only.
        if(role==='owner')await page.screenshot();
      }
      await context.close();
      if(role==='owner'&&anonymous){await anonymous.close();record({event:'unused signed-out context closed before administrator control'});}
    }
  }finally{await browser.close();}
}finally{await h.stop();writeFileSync(`handoffs/codex/artifacts/R7V-webkit-loading-${label}.json`,JSON.stringify(evidence,null,2));console.log('WebKit loading diagnostic saved; no application mutation.');}
