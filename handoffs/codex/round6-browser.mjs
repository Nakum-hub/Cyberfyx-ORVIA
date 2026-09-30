// Run the repository's unchanged journeys, with optional engine selection only.
import { chromium, firefox, webkit } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appendFileSync, writeFileSync } from 'node:fs';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';
const [engine, suite] = process.argv.slice(2);
if (!['chromium', 'webkit', 'firefox'].includes(engine)
  || !['dpdpa-audit-local', 'audit-mandate-local', 'expansion-screens-local', 'interface-crawl-local', 'sign-in-hydration-local'].includes(suite)) throw new Error('Unknown engine or suite');
const selected = { chromium, firefox, webkit }[engine];
const launch = selected.launch.bind(selected);
const observe = process.env.R6_OBSERVE_ERRORS === '1';
const errorsPath = resolve(`handoffs/codex/artifacts/R6-${engine}-${suite}-http-errors.jsonl`);
if (observe) writeFileSync(errorsPath, '');
chromium.launch = async options => {
  const browser = await launch({ ...options, ...(engine !== 'chromium' ? { executablePath: undefined } : {}) });
  if (observe) {
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const context = await newContext(options);
      context.on('page', page => page.on('response', response => {
        if (response.status() < 500 || !new URL(response.url()).pathname.startsWith('/api/')) return;
        void (async () => {
          let code = 'UNREADABLE';
          try { const body = await response.json(); if (/^[A-Z_]+$/.test(body.error?.code)) code = body.error.code; } catch { /* no response payload is logged */ }
          appendFileSync(errorsPath, JSON.stringify({ time: new Date().toISOString(), path: new URL(response.url()).pathname, status: response.status(), code, timing: response.request().timing() }) + '\n');
        })();
      }));
      return context;
    };
  }
  return browser;
};
for (const kind of ['release', 'licence', 'audit']) Object.assign(process.env, vendorSigningEnvironment(kind));
console.log(`R6 unchanged suite: ${suite}; engine: ${engine}`);
await import(pathToFileURL(resolve(`tests/e2e/${suite}.ts`)));
