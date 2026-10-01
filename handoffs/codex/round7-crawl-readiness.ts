import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { chromium, webkit, firefox } from '@playwright/test';
import { waitForPageContent } from '../../shared/testing/src/browser-ready.ts';
const results:unknown[]=[];
for(const [engine,type] of Object.entries({chromium,webkit,firefox})) {
  const browser=await type.launch({headless:true});
  try {
    const page=await browser.newPage();
    await page.setContent('<main><div role="status"><h3>Loading</h3><p>Reading the authenticated session from the server.</p></div></main>');
    await page.evaluate(()=>{
      setTimeout(()=>{document.querySelector('main')!.innerHTML='<h2>Page heading</h2><div role="status"><h3>Loading</h3><p>Reading the table.</p></div>';},1500);
      setTimeout(()=>{document.querySelector('main')!.innerHTML='<h2>Page heading</h2><p>Ready</p>';},2500);
    });
    const started=Date.now();await waitForPageContent(page,8000);
    assert.match(await page.locator('main').innerText(),/Ready/);
    const elapsed=Date.now()-started;assert.ok(elapsed>=2000);
    await page.setContent('<main><h2>Engagements</h2><p role="status">Loading…</p></main>');
    await page.evaluate(()=>setTimeout(()=>{document.querySelector('[role="status"]')!.replaceWith(Object.assign(document.createElement('p'),{textContent:'Vendor list ready'}));},700));
    await waitForPageContent(page,5000);
    assert.match(await page.locator('main').innerText(),/Vendor list ready/);
    await page.setContent('<main><h2>Page heading</h2><div role="status"><h3>Loading</h3><p>A permanently stuck query.</p></div></main>');
    await assert.rejects(waitForPageContent(page,500),/Timeout/);
    results.push({engine,result:'PASS',delayed_content_ms:elapsed,plain_vendor_loading_status:'AWAITED',permanently_stuck_loader:'REJECTED_AS_REQUIRED'});
    console.log(`${engine}: delayed content awaited; permanently stuck loader rejected`);
  }finally{await browser.close();}
}
writeFileSync('handoffs/codex/artifacts/R7V-crawl-readiness-regression.json',JSON.stringify(results,null,2));
