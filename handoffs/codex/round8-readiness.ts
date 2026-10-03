import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, webkit, firefox } from '@playwright/test';
const before=process.env.R8_BEFORE==='1';
const {waitForPageContent}=await import(pathToFileURL(resolve(before?'.local/round8-browser-ready-before.ts':'shared/testing/src/browser-ready.ts')).href);
const results:unknown[]=[];let failed=false;
for(const [engine,kind] of Object.entries({webkit,chromium,firefox})) {
  const browser=await kind.launch({headless:true,...(engine==='chromium'?{executablePath:'C:/Cyberfyx-projects/Cyberfyx_ORVIA/.local/tools/playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'}:{})});
  try {
    const page=await browser.newPage();
    await page.setContent('<main aria-busy="true"><h2>Consent records</h2><p>Retained snapshot</p></main>');
    await page.evaluate(()=>{setTimeout(()=>document.querySelector('main')!.setAttribute('aria-busy','false'),1000);});
    const start=Date.now();await waitForPageContent(page,5000);
    const elapsed=Date.now()-start;
    assert.equal(await page.locator('main').getAttribute('aria-busy'),'false','Never navigate away while a retained snapshot is refreshing');
    assert.ok(elapsed>=800);
    await page.setContent('<main aria-busy="true"><h2>Policy preview</h2><p>Selector data is still being read</p></main>');
    await assert.rejects(waitForPageContent(page,500),/Timeout/);
    results.push({engine,result:'PASS',refresh_wait_ms:elapsed,stuck_selector_read:'REJECTED'});
    console.log(`${engine}: retained refresh awaited; stuck selector read rejected`);
  } catch(error) {failed=true;results.push({engine,result:'FAIL',error:error instanceof Error?error.message:'unknown'});console.error(`${engine}: ${error instanceof Error?error.message:'unknown'}`);}
  finally {await browser.close();}
}
writeFileSync(`handoffs/codex/artifacts/R8-readiness-${before?'before':'after'}.json`,JSON.stringify(results,null,2));
process.exitCode=failed?1:0;
