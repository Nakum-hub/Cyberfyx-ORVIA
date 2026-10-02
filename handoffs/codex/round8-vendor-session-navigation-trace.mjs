// Bounded diagnostic only. Original requests, responses, errors and fixture assertions are preserved.
import { appendFileSync, writeFileSync } from 'node:fs';
import { webkit } from '@playwright/test';
const label = process.env.R8_FEATURE_LABEL;
if (!label || !/^[a-z0-9-]{1,60}$/.test(label) || process.env.ORVIA_PROFILE !== 'codex-a00') throw new Error('Fresh fixed-fixture label required');
const artifact = `handoffs/codex/artifacts/R8-${label}-session-navigation.jsonl`;
writeFileSync(artifact, '', { flag: 'wx' });
const record = event => appendFileSync(artifact, JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n');
const path = url => new URL(url, 'http://127.0.0.1').pathname;
const launch = webkit.launch.bind(webkit);
webkit.launch = async options => {
  const browser = await launch(options);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async options => {
    const context = await newContext(options);
    await context.exposeBinding('__orviaR8SessionNavigation', ({ page }, event) => {
      if (!event || !['SESSION_FETCH_START', 'SESSION_FETCH_RESPONSE', 'SESSION_FETCH_REJECTION', 'PAGE_HIDE'].includes(event.kind)) throw new Error('Unknown diagnostic event');
      record({ page_path: path(page.url()), ...event });
    });
    await context.addInitScript(() => {
      const emit = event => { void window.__orviaR8SessionNavigation(event).catch(() => {}); };
      window.addEventListener('pagehide', event => emit({ kind: 'PAGE_HIDE', persisted: event.persisted }));
      const original = window.fetch;
      window.fetch = function (...args) {
        const input = args[0];
        const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (new URL(requestUrl, window.location.href).pathname !== '/api/v1/vendor/session') return Reflect.apply(original, this, args);
        emit({ kind: 'SESSION_FETCH_START', document_path: window.location.pathname, signal_present: !!args[1]?.signal });
        return Reflect.apply(original, this, args).then(response => {
          emit({ kind: 'SESSION_FETCH_RESPONSE', document_path: window.location.pathname, status: response.status });
          return response;
        }, error => {
          emit({ kind: 'SESSION_FETCH_REJECTION', document_path: window.location.pathname, error_name: error instanceof Error ? error.name : 'NON_ERROR' });
          throw error;
        });
      };
    });
    context.on('page', page => {
      page.on('framenavigated', frame => { if (frame === page.mainFrame()) record({ kind: 'NAVIGATION', page_path: path(frame.url()) }); });
      page.on('request', request => {
        if (path(request.url()) === '/api/v1/vendor/session') record({ kind: 'REQUEST_START', page_path: path(page.url()), method: request.method() });
      });
      page.on('requestfinished', request => {
        if (path(request.url()) === '/api/v1/vendor/session') record({ kind: 'REQUEST_FINISHED', page_path: path(page.url()) });
      });
      page.on('requestfailed', request => {
        if (path(request.url()) === '/api/v1/vendor/session') record({ kind: 'REQUEST_FAILED', page_path: path(page.url()), failure: request.failure()?.errorText });
      });
      page.on('response', response => {
        if (path(response.url()) === '/api/v1/vendor/session') record({ kind: 'RESPONSE', page_path: path(page.url()), status: response.status() });
      });
      page.on('pageerror', error => record({ kind: 'PAGE_ERROR', page_path: path(page.url()), error_name: error.name }));
    });
    return context;
  };
  return browser;
};
await import('./round8-feature-browser.mjs');
