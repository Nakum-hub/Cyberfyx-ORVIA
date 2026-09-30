// Observation-only wrapper for unchanged journeys. No selectors or assertions replaced.
import { chromium, firefox, webkit } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';
const [browserName, suite] = process.argv.slice(2);
if (!['firefox', 'webkit', 'chromium'].includes(browserName) || !['dpdpa-audit-local', 'audit-mandate-local', 'expansion-screens-local', 'interface-crawl-local', 'sign-in-hydration-local'].includes(suite)) throw new Error('Unknown browser/journey');
const dir = resolve(`output/playwright/round5/${process.env.R5_RUN_LABEL ?? 'baseline'}-${browserName}-${suite}`);
mkdirSync(dir, { recursive: true });
const logPath = resolve(dir, 'events.jsonl');
writeFileSync(logPath, '');
const log = (type, data) => appendFileSync(logPath, JSON.stringify({ time: new Date().toISOString(), type, ...data }) + '\n');
const headers = values => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, /authorization|cookie/i.test(k) ? (k.toLowerCase() === 'set-cookie' ? v.replace(/(^|\n)([^=;]+)=([^;\n]*)/g, '$1$2=[REDACTED]') : '[REDACTED]') : v]));
const launch = ({ chromium, firefox, webkit }[browserName]).launch.bind({ chromium, firefox, webkit }[browserName]);
const deadline = Date.parse('2026-09-30T09:31:30Z'); // Owner's 15-minute cap; reserve evidence/push time.
if (Date.now() >= deadline) { console.log('NOT_RUN: owner time-box reached'); process.exit(125); }
if (process.env.R5_RUN_JOURNEY !== '1' && suite !== 'sign-in-hydration-local' && suite !== 'interface-crawl-local') { console.log('NOT_RUN: owner shortened time-box; prioritize hydration probes after the already-running WebKit audit'); process.exit(125); }
if (suite === 'interface-crawl-local') { console.log('NOT_RUN: full crawl does not fit remaining owner time-box; historical runs take about 20 minutes'); process.exit(125); }
const activeBrowsers = [];
const deadlineTimer = setTimeout(async () => {
  console.error('INCOMPLETE: owner time-box reached; retaining current traces');
  for (const browser of activeBrowsers) await browser.close().catch(() => {});
  process.exit(124);
}, deadline - Date.now());
deadlineTimer.unref();
let contextIndex = 0; // A journey can launch more than one browser; never overwrite a trace.
chromium.launch = async options => {
  const browser = await launch({ ...options, executablePath: browserName === 'chromium' ? options?.executablePath : undefined });
  activeBrowsers.push(browser);
  log('browser', { browserName, version: browser.version() });
  const create = browser.newContext.bind(browser);
  const contexts = [];
  browser.newContext = async options => {
    const context = await create(options); const id = ++contextIndex;
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const pending = new Set();
    const track = p => { pending.add(p); p.finally(() => pending.delete(p)); };
    context.on('page', page => {
      page.on('console', m => log('console', { context: id, url: page.url(), level: m.type(), text: m.text(), location: m.location() }));
      page.on('pageerror', e => log('pageerror', { context: id, url: page.url(), message: e.message, stack: e.stack }));
      page.on('request', r => {
        log('request', { context: id, url: r.url(), method: r.method(), resourceType: r.resourceType(), headers: headers(r.headers()) });
        track(r.allHeaders().then(h => log('request-headers', { context: id, url: r.url(), headers: headers(h) })).catch(e => log('diagnostic-error', { message: e.message })));
      });
      page.on('response', r => {
        log('response', { context: id, url: r.url(), method: r.request().method(), status: r.status(), headers: headers(r.headers()) });
        track(r.allHeaders().then(h => log('response-headers', { context: id, url: r.url(), headers: headers(h) })).catch(e => log('diagnostic-error', { message: e.message })));
      });
      page.on('requestfailed', r => log('requestfailed', { context: id, url: r.url(), method: r.method(), failure: r.failure() }));
    });
    let stopped = false;
    const stop = async () => {
      if (stopped) return; stopped = true;
      for (const [n, page] of context.pages().entries()) {
        log('final-runtime', { context: id, url: page.url(), state: await page.evaluate(() => ({ nextFlight: Array.isArray(window.__next_f), nextRuntime: typeof window.next, ready: document.readyState, scripts: [...document.scripts].map(s => ({ src: s.src, type: s.type })), forms: [...document.forms].map(f => ({ name: f.getAttribute('aria-label'), invalid: [...f.querySelectorAll('input,select,textarea')].filter(e => !e.validity.valid).map(e => ({ name: e.name, type: e.type, message: e.validationMessage })), buttons: [...f.querySelectorAll('button')].map(b => ({ text: b.textContent, disabled: b.matches(':disabled') })) })) })).catch(e => ({ error: e.message })) });
        await page.screenshot({ path: resolve(dir, `context-${id}-page-${n + 1}.png`), fullPage: true, mask: [page.locator('input,code,pre')] }).catch(() => {});
      }
      log('cookies', { context: id, cookies: (await context.cookies()).map(({ value, ...cookie }) => ({ ...cookie, value: '[REDACTED]' })) });
      // Aborted requests may never resolve allHeaders until the context closes.
      // Their request/failure records are already logged synchronously; never make
      // browser cleanup depend on this optional header enrichment.
      log('diagnostic-pending-headers', { context: id, count: pending.size });
      await context.tracing.stop({ path: resolve(dir, `context-${id}.zip`) });
    };
    const close = context.close.bind(context);
    context.close = async (...args) => { await stop(); return close(...args); };
    contexts.push(stop);
    return context;
  };
  const close = browser.close.bind(browser);
  browser.close = async (...args) => { for (const stop of contexts) await stop(); return close(...args); };
  return browser;
};
for (const kind of ['release', 'licence', 'audit']) Object.assign(process.env, vendorSigningEnvironment(kind));
console.log(`R5 unchanged journey ${suite}; ${browserName}; diagnostics ${dir}`);
await import(pathToFileURL(resolve(`tests/e2e/${suite}.ts`)));
