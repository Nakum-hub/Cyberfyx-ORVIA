// Diagnostic only: deliberately overlap a real session read with hard navigation.
// Routing changes network timing; this is not ordinary product qualification.
import { appendFileSync, writeFileSync } from 'node:fs';
import { webkit } from '@playwright/test';

const label = process.env.R8_FEATURE_LABEL;
if (process.env.R8_CONTROLLED_SESSION_NAVIGATION !== '1'
  || process.env.ORVIA_PROFILE !== 'codex-a00'
  || !label || !/^[a-z0-9-]{1,60}$/.test(label)
  || process.argv.length !== 5 || process.argv[2] !== '--child'
  || process.argv[3] !== 'webkit' || process.argv[4] !== 'vendor-production-criteria-local') {
  throw new Error('Explicit fixed WebKit session-navigation diagnostic required');
}
const artifact = `handoffs/codex/artifacts/R8-${label}-controlled-session-navigation.jsonl`;
writeFileSync(artifact, '', { flag: 'wx' });
const record = event => appendFileSync(artifact, JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n');
const pathname = url => new URL(url, 'http://127.0.0.1').pathname;
const launch = webkit.launch;
webkit.launch = async function (...args) {
  const browser = await Reflect.apply(launch, this, args);
  const newContext = browser.newContext;
  browser.newContext = async function (...contextArgs) {
    const context = await Reflect.apply(newContext, this, contextArgs);
    const states = new WeakMap();
    context.on('page', page => {
      let observed;
      const started = new Promise(resolve => { observed = resolve; });
      const state = { started, observed, release: null, held: false };
      states.set(page, state);
      page.on('framenavigated', frame => {
        if (frame === page.mainFrame() && pathname(frame.url()) === '/vendor/practice') {
          record({ kind: 'PRACTICE_NAVIGATION', held: state.held });
          state.release?.();
        }
      });
      const goto = page.goto;
      page.goto = async function (...gotoArgs) {
        if (pathname(gotoArgs[0]) !== '/vendor/practice'
          || pathname(page.url()) !== '/vendor/engagements') return Reflect.apply(goto, this, gotoArgs);
        let timer;
        try {
          await Promise.race([
            state.started,
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Real engagements session request not observed within 30000ms')), 30000); })
          ]);
          record({ kind: 'HARD_NAVIGATION_START', held: state.held });
          return await Reflect.apply(goto, this, gotoArgs);
        } finally {
          clearTimeout(timer);
          state.release?.();
        }
      };
    });
    await context.route('**/api/v1/vendor/session', async route => {
      const request = route.request();
      const page = request.frame().page();
      const state = states.get(page);
      if (!state || pathname(page.url()) !== '/vendor/engagements' || state.held) {
        await route.continue();
        return;
      }
      state.held = true;
      let timer;
      const released = new Promise(resolve => { state.release = resolve; });
      timer = setTimeout(() => state.release?.(), 30000);
      record({ kind: 'REAL_SESSION_HELD', document_path: '/vendor/engagements' });
      state.observed();
      try {
        await released;
        record({ kind: 'REAL_SESSION_RELEASED', document_path: pathname(page.url()) });
        // Continue the original request: no fulfillment, synthetic response or abort.
        await route.continue();
      } finally {
        clearTimeout(timer);
        state.release = null;
      }
    });
    return context;
  };
  return browser;
};
// Ordering matters: the existing tracer wraps our launch/context wrappers; the
// feature wrapper subsequently selects that already-wrapped WebKit launcher.
await import('./round8-vendor-session-navigation-trace.mjs');
