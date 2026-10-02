// Isolated UI regression: synthetic paginated HTTP fixtures, no database writes.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium, webkit, firefox, expect } from '@playwright/test';
import { HttpFixture, authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { routes, schemas } from '../../shared/contracts/src/index.ts';
const h=new HttpFixture();
if(h.config.profile!=='codex-a00')throw new Error('Named synthetic profile only');
const results:unknown[]=[];
try {
  await h.start();
  const owner=await h.login('owner');
  const path=routes.find(r=>r.id==='list_impact_templates')!.path;
  const response=await owner.call(`${path}?limit=100`);
  assert.equal(response.status,200);
  const existing=schemas.ImpactTemplateList.parse(await response.json()).items[0];
  assert.ok(existing,'A synthetic journey template is required');
  const templates=Array.from({length:26},(_,i)=>({...existing,id:randomUUID(),template_key:randomUUID(),name:`Synthetic paged template ${i+1}`,status:'PUBLISHED' as const}));
  const cursor=Buffer.from(templates[24]!.id).toString('base64url');
  const transportsPath=routes.find(r=>r.id==='list_delivery_transports')!.path;
  const transportsResponse=await owner.call(`${transportsPath}?limit=100`);
  assert.equal(transportsResponse.status,200);
  const transport=schemas.DeliveryTransportList.parse(await transportsResponse.json()).items.find(item=>item.kind==='WEBHOOK');
  assert.ok(transport,'A synthetic webhook journey fixture is required');
  const staleTransport={...transport,state:'ENABLED',secret_revealed:false};
  for(const [engine,browserType] of Object.entries({chromium,webkit,firefox})) {
    const browser=await browserType.launch({headless:true});
    try {
      const context=await browser.newContext({baseURL:h.config.origin});const page=await context.newPage();
      await h.authWindow();
      const user=h.users.owner!;
      await page.goto('/workspace/sign-in');
      await page.getByLabel('Staff email').fill(user.email);
      await page.getByLabel('Password',{exact:true}).fill(user.password);
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.getByLabel('Authenticator code').fill(authenticatorCode(user.totp_uri!));
      await page.getByRole('button',{name:'Verify authenticator',exact:true}).click();
      await page.getByRole('heading',{name:'Signed in',exact:true}).waitFor();
      let nextPages=0;
      await page.route(`**${path}*`,async route=>{
        const next=new URL(route.request().url()).searchParams.get('cursor');
        if(next)assert.equal(next,cursor);
        if(next)nextPages++;
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:next?templates.slice(25):templates.slice(0,25),next_cursor:next?null:cursor})});
      });
      await page.goto('/workspace/impact-assessments');
      await page.getByLabel(/^Template(?: \*)?$/).selectOption(templates[25]!.id);
      await page.getByLabel('New version of',{exact:true}).selectOption(templates[25]!.template_key);
      assert.equal(await page.getByLabel(/^Template(?: \*)?$/).inputValue(),templates[25]!.id);
      assert.equal(await page.getByLabel('New version of',{exact:true}).inputValue(),templates[25]!.template_key);
      assert.ok(nextPages>0);
      let transportReads=0;
      await page.route(`**${transportsPath}?*`,async route=>{
        transportReads++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[staleTransport],next_cursor:null})});
      });
      await page.route(`**${transportsPath}/${transport.id}/signing-secret`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({transport_id:transport.id,secret:'0'.repeat(64),algorithm:'HMAC-SHA256',signed_content:'Synthetic regression fixture only',header:'X-Orvia-Signature'})}));
      await page.goto('/workspace/delivery');
      const reveal=page.getByRole('button',{name:'Show signing key once',exact:true});
      await reveal.waitFor();
      const refresh=page.waitForResponse(response=>new URL(response.url()).pathname===transportsPath);
      await reveal.click();await refresh;
      await page.getByText('Copy this signing key now',{exact:false}).waitFor();
      await page.waitForLoadState('networkidle');
      await expect(reveal).toHaveCount(0);
      await page.getByRole('button',{name:'I have copied it',exact:true}).click();
      await expect(reveal).toHaveCount(0);
      assert.ok(transportReads>=2,'A deliberately stale refresh was received');
      results.push({engine,result:'PASS',assertions:6,second_page_requests:nextPages,transport_reads:transportReads,reveal_control:'stays consumed after stale refresh and key dismissal',fixture:'26 synthetic template choices over two intercepted HTTP pages; intercepted reveal with all-zero fixture, no server write'});
      console.log(`${engine}: second-page choices selectable; reveal control stays consumed across a stale refresh`);
    } finally {await browser.close();}
  }
} finally {await h.stop();writeFileSync('handoffs/codex/artifacts/R7V-form-pages.json',JSON.stringify(results,null,2));}
