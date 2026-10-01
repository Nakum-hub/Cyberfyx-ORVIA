import { chromium, firefox, webkit } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';
const [engine, suite] = process.argv.slice(2);
// Owner narrowed Round 7 acceptance to desktop/laptop on 2026-10-01.
if (suite === 'interface-crawl-local') process.env.R7_DESKTOP_ONLY = '1';
if (engine !== 'webkit' || suite !== 'interface-crawl-local') delete process.env.R7_CRAWL_FROM;
if (!['chromium', 'webkit', 'firefox'].includes(engine) || !['audit-mandate-local', 'expansion-screens-local', 'operations-screens-local', 'interface-crawl-local', 'sign-in-hydration-local'].includes(suite)) throw new Error('Unknown test selection');
const label = process.env.R7_RUN_LABEL ?? 'final';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid run label');
const artifact = resolve(`handoffs/codex/artifacts/R7V-${label}-${engine}-${suite}-diagnostic.jsonl`);
writeFileSync(artifact, '');
const record = value => appendFileSync(artifact, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n');
const spawn = childProcess.spawn;
childProcess.spawn = function (...args) {
  const child = spawn.apply(this, args); let pending = '';
  child.stderr?.on('data', chunk => {
    pending += chunk.toString(); const lines = pending.split('\n'); pending = lines.pop() ?? '';
    for (const line of lines) {
      try { const data = JSON.parse(line); if (data.round7_diagnostic) record({ server: data });
        else if (data.dependency === 'policy_engine') record({ server: data });
        else if (data.request_id && data.operation) record({ server: { request_id: data.request_id, operation: data.operation, name: data.name, code: data.code } });
      } catch { /* Never retain arbitrary server output or secrets. */ }
    }
  }); return child;
};
syncBuiltinESMExports();
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --import=${pathToFileURL(resolve('handoffs/codex/round7-server-trace.mjs')).href}`.trim();
const launch = { chromium, webkit, firefox }[engine].launch.bind({ chromium, webkit, firefox }[engine]);
chromium.launch = async options => {
  const browser = await launch({ ...options, ...(engine === 'chromium' ? {} : { executablePath: undefined }) });
  record({ engine, suite, browser_version: browser.version() });
  if (engine === 'firefox' && suite === 'interface-crawl-local') {
    const sampler = childProcess.spawn(process.execPath, ['--import', 'tsx', 'handoffs/codex/round7-opa-sampler.ts'], { windowsHide: true, stdio: 'ignore', env: {...process.env,R7_METRIC_LABEL:label==='final'?'firefox':`${label}-firefox`} });
    const stop = () => { if (sampler.exitCode === null) sampler.kill(); };
    process.once('exit', stop);
    browser.once('disconnected', () => { stop(); record({ sampler: 'stopped' }); });
    record({ sampler: 'started', interval_ms: 5000 });
  }
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async options => {
    const context = await newContext(options);
    await context.exposeBinding('__r7VendorFetchTrace', (_source, value) => record({ event: 'vendor_session_fetch_trace', browser_at: value.browser_at, page: value.page, phase: value.phase, url: value.url, status: value.status, error: value.error }));
    await context.addInitScript(`(()=>{
      const original=globalThis.fetch;
      const trace=value=>{void globalThis.__r7VendorFetchTrace({browser_at:new Date().toISOString(),page:location.href,...value}).catch(()=>{});};
      globalThis.fetch=async(input,init)=>{
        const url=new URL(input instanceof Request?input.url:String(input),location.href);
        if(url.pathname!=='/api/v1/vendor/session')return original(input,init);
        trace({phase:'started',url:url.href});
        try{const response=await original(input,init);trace({phase:'response',url:url.href,status:response.status});return response;}
        catch(error){trace({phase:'rejected',url:url.href,status:null,error:error instanceof Error?error.message:'unknown'});throw error;}
      };
      addEventListener('pagehide',()=>{if(location.pathname.startsWith('/vendor'))trace({phase:'pagehide'});});
    })()`);
    context.on('page', page => {
      const issued = new WeakMap();
      page.on('request', r => { issued.set(r, { page: page.url(), issued_at: new Date().toISOString() });
        if(new URL(r.url()).pathname==='/api/v1/vendor/session')record({...issued.get(r),event:'vendor_session_requested',url:r.url()}); });
      page.on('pageerror', error => { if(error.message.includes('/api/v1/vendor/session'))record({page:page.url(),event:'vendor_session_pageerror',message:error.message}); });
      const sessionRequest = url => new URL(url).pathname === '/api/v1/vendor/session' || (new URL(url).pathname === '/api/v1/session' && page.url().includes('/workspace'));
      page.on('requestfailed', r => { if (sessionRequest(r.url())) record({ ...issued.get(r), url: r.url(), status: null, failure: r.failure()?.errorText }); });
      page.on('console', m => { if (m.type() === 'error' && (m.text().includes('/api/v1/vendor/session') || m.location().url?.includes('/api/v1/vendor/session'))) record({ page: page.url(), console_url: m.location().url, console: m.text() }); });
      page.on('response', r => {
        const path = new URL(r.url()).pathname;
        if (r.status() < 500 && !sessionRequest(r.url())) return;
        void (async () => {
          const headers = await r.allHeaders(); let error;
          if (r.status() >= 400) { try { const body = await r.json(); error = { code: body.error?.code, field_errors: body.error?.field_errors }; } catch { /* response may be cancelled */ } }
          record({ ...issued.get(r.request()), url: r.url(), status: r.status(), request_id: headers['x-request-id'], error });
        })().catch(() => { /* A departing page may close the response; requestfailed records that outcome. */ });
      });
    }); return context;
  }; return browser;
};
for (const kind of ['release', 'licence', 'audit']) Object.assign(process.env, vendorSigningEnvironment(kind));
console.log(`R7 ${engine} ${suite}: suite entry point with passive diagnostic instrumentation`);
if (label === 'final' && existsSync('.local/round7-verify-pause')) console.log('Matrix paused before suite import; no installation started by this process.');
while (label === 'final' && existsSync('.local/round7-verify-pause')) await new Promise(resolve => setTimeout(resolve, 1000));
await import(pathToFileURL(resolve(`tests/e2e/${suite}.ts`)));
