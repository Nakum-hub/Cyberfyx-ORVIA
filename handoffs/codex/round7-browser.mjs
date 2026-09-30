import { chromium, firefox, webkit } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appendFileSync, writeFileSync } from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';
const [engine, suite] = process.argv.slice(2);
if (!['chromium', 'webkit', 'firefox'].includes(engine) || !['audit-mandate-local', 'expansion-screens-local', 'interface-crawl-local', 'sign-in-hydration-local'].includes(suite)) throw new Error('Unknown test selection');
const artifact = resolve(`handoffs/codex/artifacts/R7-${engine}-${suite}-diagnostic.jsonl`);
writeFileSync(artifact, '');
const record = value => appendFileSync(artifact, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n');
const spawn = childProcess.spawn;
childProcess.spawn = function (...args) {
  const child = spawn.apply(this, args); let pending = '';
  child.stderr?.on('data', chunk => {
    pending += chunk.toString(); const lines = pending.split('\n'); pending = lines.pop() ?? '';
    for (const line of lines) {
      try { const data = JSON.parse(line); if (data.round7_diagnostic) record({ server: data });
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
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async options => {
    const context = await newContext(options);
    context.on('page', page => {
      page.on('requestfailed', r => { if (new URL(r.url()).pathname === '/api/v1/vendor/session') record({ page: page.url(), url: r.url(), status: null, failure: r.failure()?.errorText }); });
      page.on('console', m => { if (m.type() === 'error' && m.text().includes('/api/v1/vendor/session')) record({ page: page.url(), console: m.text() }); });
      page.on('response', r => {
        const path = new URL(r.url()).pathname;
        if (r.status() < 500 && path !== '/api/v1/vendor/session') return;
        void (async () => {
          const headers = await r.allHeaders(); let error;
          if (r.status() >= 400) { try { const body = await r.json(); error = { code: body.error?.code, field_errors: body.error?.field_errors }; } catch { /* response may be cancelled */ } }
          record({ page: page.url(), url: r.url(), status: r.status(), request_id: headers['x-request-id'], error });
        })();
      });
    }); return context;
  }; return browser;
};
for (const kind of ['release', 'licence', 'audit']) Object.assign(process.env, vendorSigningEnvironment(kind));
console.log(`R7 ${engine} ${suite}: unchanged suite, passive diagnostic instrumentation`);
await import(pathToFileURL(resolve(`tests/e2e/${suite}.ts`)));
