// Isolated synthetic browser readback. No customer target or release claim.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium,type Page } from '@playwright/test';
import { HttpFixture,authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../shared/testing/src/scenario.ts';
import { workflowActivities } from '../../services/worker/src/withdrawal-worker.ts';
import { sweepCatalogDiscovery } from '../../services/worker/src/catalog-discovery.ts';
import { observerEnrollment } from '../../backend/auth/src/machine-profile.ts';
import { writeEvidence,safeError } from '../../shared/testing/src/evidence.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
import * as S from '../../shared/contracts/src/index.ts';
import { connectDatabase } from '../../database/customer/src/index.ts';
import { waitForAuthWindow } from '../../shared/testing/src/auth-window.ts';

const profile=loadProfile();
if(profile.profile!=='codex-a00')throw new Error('Synthetic codex-a00 profile only');
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.local/tools/playwright');
const h=new HttpFixture(),steps:string[]=[],external:string[]=[],errors:string[]=[];
const db=connectDatabase(profile).pool;
let runtime:ReturnType<typeof workflowActivities>|undefined;
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,page:Page|undefined;
let phase='start';
try{
  await h.start();
  await waitForAuthWindow(db);
  const scenario=await createMarketingScenario(h);
  const path='/api/v1/admin/catalog-discovery-targets';
  const created=await scenario.author.call(path,{system_id:scenario.system.id,schema_name:'public',relation_name:'marketing_memberships'},
    {'idempotency-key':randomUUID()});
  assert.equal(created.status,201);
  const target=S.CatalogDiscoveryTarget.parse(await created.json());
  const approved=await scenario.owner.call(`${path}/${target.id}/approve`,{}, {'idempotency-key':randomUUID()});
  assert.equal(approved.status,200);
  runtime=workflowActivities();
  assert((await sweepCatalogDiscovery(runtime.scoped,runtime.enrollment.identities.map(x=>x.id),
    observerEnrollment(runtime.config).identities,runtime.observer))>=1);
  phase='browser';
  browser=await chromium.launch({headless:true,executablePath:resolve('.local/tools/playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe')});
  const context=await browser.newContext({baseURL:h.config.origin,viewport:{width:1440,height:900}});
  page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('Failed to load resource'))errors.push(message.text());});
  page.on('request',request=>{if(new URL(request.url()).origin!==h.config.origin)external.push(request.url());});
  const user=h.users.admin!;assert(user.totp_uri);
  await page.goto('/workspace/sign-in');
  await page.getByLabel('Staff email').fill(user.email);
  await page.getByLabel('Password',{exact:true}).fill(user.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByLabel('Authenticator code',{exact:true}).fill(authenticatorCode(user.totp_uri));
  await page.getByRole('button',{name:'Verify authenticator',exact:true}).click();
  await page.getByRole('heading',{name:'Signed in',exact:true}).waitFor();
  steps.push('staff MFA sign-in');
  await page.goto(`/workspace/catalog-discovery?target_id=${target.id}`);
  phase='readback';
  await page.getByRole('heading',{name:'Catalog observations',exact:true}).waitFor();
  await page.getByRole('heading',{name:'Target and observations',exact:true}).waitFor();
  await page.getByRole('table',{name:'Independent catalog reads'}).getByText('OBSERVED_METADATA').waitFor();
  await page.getByText('marketing_restricted',{exact:false}).waitFor();
  steps.push('approved target and actual column observation shown');
  await page.getByRole('button',{name:'Add observed dataset to inventory'}).click();
  await page.getByRole('link',{name:'Open inventory record'}).waitFor();
  steps.push('observed metadata dataset linked to inventory through workspace');
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  const screenshot=resolve('output/playwright/catalog-discovery-codex-a00.png');
  mkdirSync(resolve('output/playwright'),{recursive:true});
  await page.screenshot({path:screenshot,fullPage:true});
  writeEvidence('catalog-discovery-browser',{profile:profile.profile,result:'PASS',steps,external_requests:0,console_errors:0,screenshot});
  console.log(`PASS ${steps.join('; ')}; no external requests or console errors`);
  await context.close();
}catch(error){
  const detail=error instanceof Error?error.message.slice(0,900):'Unknown failure';
  const pageText=(await page?.locator('main').innerText().catch(()=>null))?.slice(-2500)??null;
  if(page)await page.screenshot({path:resolve('output/playwright/catalog-discovery-failure.png'),fullPage:true}).catch(()=>{});
  writeEvidence('catalog-discovery-browser',{profile:profile.profile,result:'FAIL',phase,steps,external_requests:external.length,
    console_errors:errors,error:safeError(error),detail,page_text:pageText,diagnostics:h.diagnostics.slice(-5000)});
  console.error({phase,detail});process.exitCode=1;
}finally{await browser?.close();if(runtime)await runtime.close();await h.stop();await db.end();}
