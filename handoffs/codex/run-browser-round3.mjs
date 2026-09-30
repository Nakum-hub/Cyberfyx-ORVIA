// Runs the unchanged requested journey with a different Playwright browser.
// No assertions, fixtures, selectors or thresholds are replaced.
import {chromium,firefox,webkit} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {vendorSigningEnvironment} from '../../scripts/credentials.ts';
const [browserName,suite]=process.argv.slice(2);
if(!['firefox','webkit','chromium'].includes(browserName)) throw new Error('Unknown browser');
const allowed=['expansion-screens-local','dpdpa-audit-local','audit-mandate-local','interface-crawl-local'];
if(!allowed.includes(suite)) throw new Error('Unknown journey');
const selected={chromium,firefox,webkit}[browserName];
const launch=selected.launch.bind(selected);
chromium.launch=async options=>{
  const browser=await launch({...options,executablePath:browserName==='chromium'?options?.executablePath:undefined});
  const close=browser.close.bind(browser);
  browser.close=async()=>{
    let n=0;
    for(const context of browser.contexts()) for(const page of context.pages()) {
      await page.screenshot({path:resolve(`handoffs/codex/artifacts/R3-${browserName}-${suite}-${++n}.png`),fullPage:true,
        mask:[page.locator('input,code,pre')]}).catch(()=>{});
      console.log(`Final page ${n}: ${new URL(page.url()).pathname}`);
      console.log('Final form states:',JSON.stringify(await page.evaluate(()=>[...document.forms].map(form=>({
        name:form.getAttribute('aria-label'),
        invalid:[...form.querySelectorAll('input,select,textarea')].filter(field=>!field.validity.valid).map(field=>({name:field.name,reason:field.validity.valueMissing?'required':field.validity.tooShort?'tooShort':field.validity.patternMismatch?'pattern':'other'})),
        buttons:[...form.querySelectorAll('button')].map(button=>({label:button.textContent,disabled:button.disabled})),
      }))).catch(()=>[])));
    }
    return close();
  };
  return browser;
};
for(const kind of ['release','licence','audit']) Object.assign(process.env,vendorSigningEnvironment(kind));
console.log(`Unchanged journey ${suite}; browser ${browserName}.`);
await import(pathToFileURL(resolve(`tests/e2e/${suite}.ts`)));
