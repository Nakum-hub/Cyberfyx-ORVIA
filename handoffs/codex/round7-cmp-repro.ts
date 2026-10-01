// Diagnose a real, published synthetic banner through its actual public route.
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium, webkit, firefox } from '@playwright/test';
import { HttpFixture } from '../../shared/testing/src/http-fixture.ts';
import { routes, schemas } from '../../shared/contracts/src/index.ts';
const h = new HttpFixture();
if (h.config.profile !== 'codex-a00') throw new Error('Synthetic codex-a00 only');
const evidence: unknown[] = [];
const label=process.env.R7_CMP_LABEL??'';
if(label&&!/^[a-z-]+$/.test(label))throw new Error('Invalid evidence label');
const build=readFileSync('frontend/.next/BUILD_ID','utf8').trim();
try {
  await h.start(); const owner = await h.login('owner');
  const route = routes.find(r => r.id === 'list_cmp_sites')!;
  const response = await owner.call(route.path);
  if (!response.ok) { const result = await response.json(); evidence.push({ stage: 'list_sites', status: response.status, response: result }); throw new Error(`List sites failed (${response.status}, ${result.error?.code}); inspect the safe diagnostic artifact`); }
  const sites = schemas.CmpSiteList.parse(await response.json());
  const site = sites.items.find(s => s.state === 'ENABLED' && s.name.startsWith('Browser shop ') && s.origins.some(o => /^http:\/\/127\.0\.0\.1:\d+$/.test(o)));
  if (!site) throw new Error('No existing synthetic browser shop');
  const origin = site.origins.find(o => /^http:\/\/127\.0\.0\.1:\d+$/.test(o))!;
  const sdk = `${h.config.origin}/cmp/${site.site_key}/orvia-cmp.js`;
  if (!(await fetch(sdk)).ok) throw new Error('Selected shop has no published banner');
  const shop = createServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(`<!doctype html><html lang="en"><head><script src="${sdk}"></script></head><body><h1>Synthetic browser diagnosis</h1></body></html>`); });
  await new Promise<void>((ok, fail) => { shop.once('error', fail); shop.listen(Number(new URL(origin).port), '127.0.0.1', ok); });
  try {
    for (const [engine, browserType] of Object.entries({ chromium, webkit, firefox, 'webkit-no-keepalive': webkit })) {
      const browser = await browserType.launch({ headless: true });
      try {
        const page = await browser.newPage();
        if (engine === 'webkit-no-keepalive') await page.addInitScript({ content: "const original = window.fetch; window.fetch = (input, init) => original(input, String(input).includes('/consents') ? {...init, keepalive: false} : init);" });
        await page.goto(origin);
        const pending = page.waitForResponse(r => r.url().endsWith('/consents') && r.request().method() === 'POST');
        await page.getByRole('button', { name: 'Reject all', exact: true }).click();
        const result = await pending;
        const request = result.request(); const headers = await request.allHeaders();
        const credentialHeaders = Object.fromEntries(Object.entries(headers).filter(([key]) => /cookie|authorization|token|key/i.test(key)).map(([key, value]) => [key, { present: true, bytes: Buffer.byteLength(value), empty: value.trim().length === 0 }]));
        for (const key of Object.keys(headers)) if (/cookie|authorization|token|key/i.test(key) && headers[key] !== '') headers[key] = '[REDACTED: credential-bearing header]';
        evidence.push({ build, engine, page: origin, url: request.url(), method: request.method(), headers, credentialHeaders, body: request.postData(), status: result.status(), response: await result.json() });
        console.log(JSON.stringify({ engine, status: result.status() }));
        assert.equal(result.status(),201,`${engine}: Reject all must be accepted`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise<void>(ok => shop.close(() => ok())); }
} finally {
  writeFileSync(`handoffs/codex/artifacts/R7V-${label?`${label}-`:''}cmp-request-evidence.json`, JSON.stringify(evidence, null, 2));
  await h.stop();
}
