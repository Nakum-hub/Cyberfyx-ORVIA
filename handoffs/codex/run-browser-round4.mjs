// Observation-only wrapper for unchanged journeys. No selectors or assertions replaced.
import { chromium, firefox, webkit } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';
const [browserName, suite] = process.argv.slice(2);
if (!['firefox', 'webkit', 'chromium'].includes(browserName) || !['dpdpa-audit-local', 'audit-mandate-local', 'expansion-screens-local', 'interface-crawl-local', 'crawl-observations-round4'].includes(suite)) throw new Error('Unknown browser/journey');
const dir = resolve(`output/playwright/round4/${process.env.R4_RUN_LABEL ?? 'baseline'}-${browserName}-${suite}`);
mkdirSync(dir, { recursive: true });
const logPath = resolve(dir, 'events.jsonl');
writeFileSync(logPath, '');
const log = (type, data) => appendFileSync(logPath, JSON.stringify({ time: new Date().toISOString(), type, ...data }) + '\n');
const headers = values => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, /authorization|cookie/i.test(k) ? (k.toLowerCase() === 'set-cookie' ? v.replace(/(^|\n)([^=;]+)=([^;\n]*)/g, '$1$2=[REDACTED]') : '[REDACTED]') : v]));
const launch = ({ chromium, firefox, webkit }[browserName]).launch.bind({ chromium, firefox, webkit }[browserName]);
let contextIndex = 0; // A journey can launch more than one browser; never overwrite a trace.
chromium.launch = async options => {
  const browser = await launch({ ...options, executablePath: browserName === 'chromium' ? options?.executablePath : undefined });
  log('browser', { browserName, version: browser.version() });
  const create = browser.newContext.bind(browser);
  const contexts = [];
  browser.newContext = async options => {
    const context = await create(options); const id = ++contextIndex;
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    await context.addInitScript(() => {
      const probe = event => {
        const target = event?.target;
        const button = target instanceof Element ? target.closest('button') : null;
        if (event && !button) return;
        console.debug('R4_RUNTIME ' + JSON.stringify({ event: event?.type ?? 'DOMContentLoaded', button: button?.textContent,
          nextFlight: Array.isArray(window.__next_f), nextRuntime: typeof window.next, ready: document.readyState,
          forms: [...document.forms].map(f => ({ name: f.getAttribute('aria-label'), fields: [...f.querySelectorAll('input,select,textarea')].map(e => ({ name: e.name, label: e.getAttribute('aria-label'), type: e.type, required: e.required, disabled: e.matches(':disabled'), valid: e.validity.valid, valueMissing: e.validity.valueMissing, badInput: e.validity.badInput, length: e.value.length })), buttons: [...f.querySelectorAll('button')].map(b => ({ text: b.textContent, disabled: b.matches(':disabled') })) })) }));
      };
      document.addEventListener('DOMContentLoaded', () => probe());
      document.addEventListener('click', probe, true);
      document.addEventListener('input', e => {
        if (!(e.target instanceof HTMLInputElement)) return;
        if (!['email', 'password'].includes(e.target.type)) return;
        console.debug('R4_AUTH_INPUT ' + JSON.stringify({ type: e.target.type, length: e.target.value.length, nextRuntime: typeof window.next,
          reactPropsAttached: Object.keys(e.target).some(k => k.startsWith('__reactProps')),
          emails: [...document.querySelectorAll('input[type=email]')].map(x => ({ length: x.value.length, valid: x.validity.valid })) }));
      }, true);
      document.addEventListener('invalid', e => console.debug('R4_INVALID ' + JSON.stringify({ name: e.target.name, type: e.target.type, message: e.target.validationMessage })), true);
    });
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
console.log(`R4 unchanged journey ${suite}; ${browserName}; diagnostics ${dir}`);
await import(pathToFileURL(resolve(suite === 'crawl-observations-round4' ? `handoffs/codex/${suite}.ts` : `tests/e2e/${suite}.ts`)));
