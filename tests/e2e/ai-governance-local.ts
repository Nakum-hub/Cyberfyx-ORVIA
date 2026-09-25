// Isolated codex-a00 browser check; no rehearsal profile or candidate claim.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { HttpFixture, authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../shared/testing/src/scenario.ts';
import * as S from '../../shared/contracts/src/index.ts';
import { writeEvidence, safeError } from '../../shared/testing/src/evidence.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';

const profile=loadProfile();
if(profile.profile!=='codex-a00')throw new Error('This browser check owns only codex-a00');
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.local/tools/playwright');
const h=new HttpFixture();
const errors:string[]=[];
const external:string[]=[];
const steps:string[]=[];
let phase='start';
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
let currentPage:Page|undefined;
try{
  await h.start();
  const scenario=await createMarketingScenario(h);
  const key=()=>({'idempotency-key':randomUUID()});
  const asset=S.DataAsset.parse(await (await scenario.author.call('/api/v1/admin/data-assets',{
    system_id:scenario.system.id,kind:'DATASET',parent_id:null,name:'browser_ai_input',
    description:'Synthetic browser fixture',provenance:'ASSERTED',valid_from:new Date().toISOString(),categories:[],
  },key())).json());
  const activity=S.ProcessingActivity.parse(await (await scenario.author.call('/api/v1/admin/processing-activities',{
    purpose_id:scenario.purpose.id,name:'Browser AI use activity',description:'Synthetic browser fixture',
    lawful_condition:'AFFIRMATIVE_MARKETING_CONSENT',owner_reference:'Synthetic test',
  },key())).json());
  const relation=async(relationship_type:string,from:{kind:string;id:string},to:{kind:string;id:string})=>{
    const response=await scenario.author.call('/api/v1/admin/graph/relationships',{
      relationship_type,from,to,provenance:'ASSERTED',valid_from:new Date().toISOString(),
      confidence_basis:'Synthetic browser fixture',
    },key());
    assert.equal(response.status,201);
  };
  await relation('ASSET_PROCESSED_BY_ACTIVITY',{kind:'DATA_ASSET',id:asset.id},{kind:'PROCESSING_ACTIVITY',id:activity.id});
  await relation('ACTIVITY_SERVES_PURPOSE',{kind:'PROCESSING_ACTIVITY',id:activity.id},{kind:'PURPOSE',id:scenario.purpose.id});
  phase='launch browser';
  browser=await chromium.launch({headless:true,executablePath:resolve('.local/tools/playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe')});
  phase='sign in';
  const context=await browser.newContext({baseURL:h.config.origin,viewport:{width:1440,height:900}});
  const page=await context.newPage();
  currentPage=page;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('Failed to load resource'))errors.push(message.text());});
  page.on('request',request=>{if(new URL(request.url()).origin!==h.config.origin)external.push(request.url());});
  const user=h.users.admin!;
  assert(user.totp_uri,'Synthetic admin authenticator enrollment required');
  await page.goto('/workspace/sign-in');
  await page.getByLabel('Staff email').fill(user.email);
  await page.getByLabel('Password',{exact:true}).fill(user.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByLabel('Authenticator code',{exact:true}).fill(authenticatorCode(user.totp_uri));
  await page.getByRole('button',{name:'Verify authenticator',exact:true}).click();
  await page.getByRole('heading',{name:'Signed in',exact:true}).waitFor();
  steps.push('admin signed in with MFA');
  await page.goto('/workspace/ai-governance');
  phase='read AI governance screen';
  await page.getByRole('heading',{name:'AI systems and uses',exact:true}).waitFor();
  await page.getByText('Recorded systems:',{exact:false}).waitFor();
  const form=page.locator('form.ai-governance-form').first();
  await page.getByRole('button',{name:'Register use'}).waitFor({state:'visible'});
  await page.getByRole('button',{name:'Register use'}).waitFor({state:'attached'});
  await form.locator('select[name="purpose_id"] option[value="'+scenario.purpose.id+'"]').waitFor({state:'attached'});
  await form.locator('select[name="processing_activity_id"] option[value="'+activity.id+'"]').waitFor({state:'attached'});
  await form.locator('select[name="input_asset_id"] option[value="'+asset.id+'"]').waitFor({state:'attached'});
  await form.locator('select[name="output_system_id"] option[value="'+scenario.system.id+'"]').waitFor({state:'attached'});
  const name='Browser AI use '+randomUUID().slice(0,8);
  await form.getByLabel('System name').fill(name);
  await form.getByLabel('Use case').fill('Synthetic browser journey');
  await form.getByLabel('Purpose').selectOption(scenario.purpose.id);
  await form.getByLabel('Processing activity').selectOption(activity.id);
  await form.getByLabel('Input data asset').selectOption(asset.id);
  await form.getByLabel('Output system').selectOption(scenario.system.id);
  await page.getByRole('button',{name:'Register use'}).click();
  await page.getByRole('heading',{name:'Use recorded',exact:true}).waitFor();
  steps.push('AI use created through workspace form');
  const row=page.getByRole('row',{name:new RegExp(name)});
  await row.getByRole('button',{name:'Open record'}).click();
  await page.getByRole('heading',{name:'Use and review history',exact:true}).waitFor();
  await page.getByRole('table',{name:'Append-only governance records'}).waitFor();
  steps.push('report, inventory and append-only detail rendered from API');
  await page.getByRole('heading',{name:name,exact:true}).waitFor();
  steps.push('created use shown in scoped detail');
  const screenshot=resolve('output/playwright/ai-governance-codex-a00.png');
  mkdirSync(resolve('output/playwright'),{recursive:true});
  await page.screenshot({path:screenshot,fullPage:true});
  assert.deepEqual(external,[]);
  assert.deepEqual(errors,[]);
  writeEvidence('ai-governance-browser',{profile:profile.profile,result:'PASS',steps,external_requests:external.length,console_errors:errors.length,screenshot});
  console.log(`PASS ${steps.join('; ')}; 0 external requests; 0 console errors; ${screenshot}`);
  await context.close();
}catch(error){
  const detail=error instanceof Error?error.message.slice(0,900):'Unknown failure';
  const pageText=(await currentPage?.locator('main').innerText().catch(()=>null))?.slice(-2500)??null;
  if(currentPage)await currentPage.screenshot({path:resolve('output/playwright/ai-governance-failure.png'),fullPage:true}).catch(()=>{});
  writeEvidence('ai-governance-browser',{profile:profile.profile,result:'FAIL',phase,steps,external_requests:external.length,console_errors:errors,error:safeError(error),detail,page_text:pageText});
  console.error({phase,detail});process.exitCode=1;
}finally{await browser?.close();await h.stop();}
