import { chromium, webkit, firefox } from '@playwright/test';
import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
const [engine, suite] = process.argv.slice(2);
const label = process.env.R8_LABEL ?? 'baseline';
if(!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid diagnostic label');
const path = `handoffs/codex/artifacts/R8-${label}-${engine}-${suite}-requests.jsonl`;
writeFileSync(path, '');
const record = value => appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n');
// Observe metadata only: never retain headers, cookies, bodies or credentials.
for (const kind of [chromium, webkit, firefox]) {
const originalLaunch = kind.launch.bind(kind);
kind.launch = async options => {
  const browser = await originalLaunch(options);
  const originalContext = browser.newContext.bind(browser);
  browser.newContext = async options => {
    const context = await originalContext(options);
    await context.exposeBinding('__r8Trace', (_source, value) => record(value));
    await context.addInitScript(`(() => {
      const emit = value => void globalThis.__r8Trace({page:location.href,...value}).catch(()=>{});
      const original = globalThis.fetch;
      globalThis.fetch = async (input,init) => {
        const url = new URL(input instanceof Request ? input.url : String(input),location.href);
        if (!url.pathname.startsWith('/api/v1/')) return original(input,init);
        const id = crypto.randomUUID();
        emit({event:'fetch-start',id,url:url.href});
        init?.signal?.addEventListener('abort',()=>emit({event:'fetch-abort',id,url:url.href}),{once:true});
        try { const response = await original(input,init); emit({event:'fetch-response',id,url:url.href,status:response.status});
          const json=response.json.bind(response);response.json=async()=>{emit({event:'body-start',id,url:url.href});try{const value=await json();emit({event:'body-end',id,url:url.href});return value;}catch(error){emit({event:'body-error',id,url:url.href,name:error.name});throw error;}};
          return response; }
        catch(error) {emit({event:'fetch-rejected',id,url:url.href,name:error.name,message:error.message});throw error;}
      };
      addEventListener('pagehide',()=>emit({event:'pagehide'}));
    })()`);
    context.on('page', page => {
      const issued = new WeakMap();
      page.on('request', request => {
        const meta = {page:page.url(),url:request.url(),method:request.method()};
        issued.set(request,meta);
        if(new URL(request.url()).pathname.startsWith('/api/v1/')) record({event:'request',...meta});
      });
      page.on('requestfailed', request => record({event:'requestfailed',...issued.get(request),failure:request.failure()?.errorText}));
      page.on('pageerror', error => record({event:'pageerror',page:page.url(),message:error.message}));
      page.on('response', response => {
        if(!new URL(response.url()).pathname.startsWith('/api/v1/')) return;
        void response.allHeaders().then(headers=>record({event:'response',...issued.get(response.request()),status:response.status(),request_id:headers['x-request-id']}));
      });
    });
    return context;
  };
  const close = browser.close.bind(browser);
  browser.close = async () => {
    mkdirSync('output/playwright/round8', {recursive:true});
    let n=0;
    for(const context of browser.contexts()) for(const page of context.pages()) {
      if(!new URL(page.url()).pathname.startsWith('/workspace/')) continue;
      await page.screenshot({path:`output/playwright/round8/${label}-${engine}-${suite}-${n++}.png`,fullPage:true}).catch(()=>{});
    }
    return close();
  };
  return browser;
};
}
process.env.R7_RUN_LABEL=`round8-${label}`;
let stopPolicySamples=()=>{};
if(process.env.R8_POLICY_SAMPLES==='1') {
  const sampler=spawn(process.execPath,['--import','tsx','handoffs/codex/round7-opa-sampler.ts'],{windowsHide:true,stdio:'ignore',env:{...process.env,R7_METRIC_LABEL:`roundeight-${engine}-${suite}`}});
  const stop=()=>{if(sampler.exitCode===null)sampler.kill();};
  stopPolicySamples=stop;
  process.once('exit',stop);
  process.once('SIGTERM',stop);
}
try { await import('./round7-browser.mjs'); }
finally { stopPolicySamples(); }
