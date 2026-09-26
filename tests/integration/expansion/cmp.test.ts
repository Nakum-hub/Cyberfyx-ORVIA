// EX02 website consent management through the HTTP boundary and the worker scanner.
// A loopback test site and tracker host stand in for the customer's website and a
// third-party analytics provider (synthetic, local only). Under test: origins
// approved by a second person; banner versions published by someone other than
// their author, with the rule's source; the banner script served by this
// installation with its configuration safely embedded; consent posts accepted
// only from an approved origin with exact-origin CORS and every choice checked;
// withdrawal as a new record; statistics from each visitor's latest choice; the
// scanner finding trackers before consent, after refusal and undeclared hosts
// without adding visitor records; disablement; tenancy and immutability.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepCmpScans } from '../../../services/worker/src/cmp-scanner.ts';

const t = operationsSuite('cmp');
const { h, check, ok, codes, db } = t;
const listen = (server: http.Server) => new Promise<number>(r => server.listen(0, '127.0.0.1', () => r((server.address() as AddressInfo).port)));

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const tracker = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'application/javascript' }); res.end("document.cookie='_syn_id=1; path=/';"); });
  const trackerPort = await listen(tracker);
  let siteKey = '';
  const site = http.createServer((req, res) => {
    const sdk = `<script src="${h.config.origin}/cmp/${siteKey}/orvia-cmp.js"></script>`;
    const blocked = `<script type="text/plain" data-orvia-category="analytics" data-src="http://127.0.0.1:${trackerPort}/analytics.js"></script>`;
    const leaky = `<script src="http://127.0.0.1:${trackerPort}/pixel.js"></script><script src="http://localhost:${trackerPort}/undeclared.js"></script>`;
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html lang="en"><head><title>Synthetic shop</title>${sdk}</head><body><h1>Synthetic shop</h1>${blocked}${req.url === '/leaky' ? leaky : ''}</body></html>`);
  });
  const sitePort = await listen(site);
  const origin = `http://127.0.0.1:${sitePort}`;
  const runtime = workflowActivities();
  try {
    t.setPhase('site and banner');
    check('an origin must be HTTPS or loopback', (await admin.call('/api/v1/admin/cmp-sites', { name: unique('Shop'), origins: ['http://shop.customer.example'] }, key())).status, 400);
    const created = await ok(admin.call('/api/v1/admin/cmp-sites', { name: unique('Synthetic shop'), origins: [origin] }, key()), S.schemas.CmpSite);
    siteKey = created.site_key;
    check('a new site is pending with its script path', [created.state, created.sdk_path], ['PENDING', `/cmp/${created.site_key}/orvia-cmp.js`]);
    check('an admin without connection authority cannot enable it', (await admin.call(`/api/v1/admin/cmp-sites/${created.id}/enable`, {}, key())).status, 403);
    await ok(owner.call(`/api/v1/admin/cmp-sites/${created.id}/enable`, {}, key()), S.schemas.CmpSite);
    const sdk = () => fetch(`${h.config.origin}/cmp/${siteKey}/orvia-cmp.js`);
    check('no script is served before a banner is published', (await sdk()).status, 404);
    const doc = {
      categories: [{ key: 'necessary', label: 'Necessary', description: 'Needed for the shop to work.', required: true }, { key: 'analytics', label: 'Analytics', description: 'Helps us understand how the shop is used.', required: false }],
      trackers: [{ name: 'Synthetic analytics', category: 'analytics', hosts: [`127.0.0.1:${trackerPort}`], cookies: ['_syn*'] }],
      texts: { en: { title: 'Your choices', body: 'We set analytics cookies only if you agree. </script><script>alert(1)</script>', accept_all: 'Accept all', reject_all: 'Reject all', choose: 'Choose', save: 'Save choices' },
        hi: { title: 'आपकी पसंद', body: 'हम केवल आपकी सहमति से एनालिटिक्स कुकीज़ का उपयोग करते हैं।', accept_all: 'सभी स्वीकार करें', reject_all: 'सभी अस्वीकार करें', choose: 'चुनें', save: 'सहेजें' } },
      rule: { basis: 'OPT_IN', requirement_id: null, source_reference: 'DPDP Act 2023, section 6: consent is free, specific, informed and unambiguous.', honour_gpc: true },
    };
    check('a banner with two strictly necessary categories is refused', (await admin.call(`/api/v1/admin/cmp-sites/${created.id}/configs`, { document: { ...doc, categories: doc.categories.map(c => ({ ...c, required: true })) } }, key())).status, 400);
    const v1 = await ok(admin.call(`/api/v1/admin/cmp-sites/${created.id}/configs`, { document: doc }, key()), S.schemas.CmpConfig);
    check('an admin without approval authority cannot publish', (await admin.call(`/api/v1/admin/cmp-configs/${v1.id}/decision`, { action: 'PUBLISH' }, key())).status, 403);
    const own = await ok(owner.call(`/api/v1/admin/cmp-sites/${created.id}/configs`, { document: doc }, key()), S.schemas.CmpConfig);
    check('the author cannot publish their own version', await codes(owner.call(`/api/v1/admin/cmp-configs/${own.id}/decision`, { action: 'PUBLISH' }, key())), { status: 409, codes: ['author_cannot_publish'] });
    const published = await ok(reviewer.call(`/api/v1/admin/cmp-configs/${v1.id}/decision`, { action: 'PUBLISH' }, key()), S.schemas.CmpConfig);
    check('another approver publishes it with its rule source', [published.state, published.document.rule.source_reference.startsWith('DPDP Act')], ['PUBLISHED', true]);
    const script = await sdk();
    const source = await script.text();
    check('the banner script is served by this installation as JavaScript', [script.status, script.headers.get('content-type'), script.headers.get('cross-origin-resource-policy')], [200, 'application/javascript; charset=utf-8', 'cross-origin']);
    check('configuration text cannot break out of the script', [source.includes('</script>'), source.includes('\\u003c/script\\u003e')], [false, true]);
    check('the script loads nothing from anywhere else', [/https?:\/\/(?!\$\{)/.test(source.replace(/ORVIA consent banner[^\n]*/, ''))], [false]);

    t.setPhase('visitor consent');
    const post = (body: unknown, extra: Record<string, string> = { origin }) => fetch(`${h.config.origin}/api/v1/cmp/${siteKey}/consents`, { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
    const visitor = randomUUID();
    const choice = (analytics: boolean, v = visitor) => ({ visitor_id: v, config_version: published.version, choices: { necessary: true, analytics }, gpc: false, language: 'en' });
    const preflight = await fetch(`${h.config.origin}/api/v1/cmp/${siteKey}/consents`, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } });
    check('the approved origin passes the preflight with an exact-origin grant', [preflight.status, preflight.headers.get('access-control-allow-origin')], [204, origin]);
    const foreignPreflight = await fetch(`${h.config.origin}/api/v1/cmp/${siteKey}/consents`, { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } });
    check('another origin is refused without a grant', [foreignPreflight.status, foreignPreflight.headers.get('access-control-allow-origin')], [403, null]);
    const granted = await post(choice(true));
    const receipt = S.schemas.CmpConsentReceipt.parse(await granted.json());
    check('a choice from the approved origin is recorded with a receipt', [granted.status, granted.headers.get('access-control-allow-origin'), receipt.config_version], [201, origin, published.version]);
    check('a choice from another origin is refused', (await post(choice(true), { origin: 'https://evil.example' })).status, 403);
    check('a choice with no origin is refused', (await post(choice(true), {})).status, 403);
    check('a request carrying cookies is refused', (await post(choice(true), { origin, cookie: 'session=1' })).status, 400);
    check('an unknown category is refused', (await post({ ...choice(true), choices: { necessary: true, analytics: true, marketing: true } })).status, 400);
    check('a missing category is refused', (await post({ ...choice(true), choices: { necessary: true } })).status, 400);
    check('the strictly necessary category cannot be refused', (await post({ ...choice(true), choices: { necessary: false, analytics: false } })).status, 400);
    check('an unknown banner version is refused', (await post({ ...choice(true), config_version: 99 })).status, 400);
    check('withdrawal is a new record', (await post(choice(false))).status, 201);
    const other = randomUUID();
    await post(choice(true, other));
    await post({ ...choice(false, randomUUID()), gpc: true });
    const stats = await ok(admin.call(`/api/v1/admin/cmp-sites/${created.id}/consent-stats`), S.schemas.CmpConsentStats);
    check('statistics use each visitor\'s latest choice', [stats.visitors, stats.records, stats.gpc_visitors, stats.by_category.find(c => c.key === 'analytics')], [3, 4, 1, { key: 'analytics', granted: 1, refused: 2 }]);
    const flood = randomUUID(); const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await post(choice(i % 2 === 0, flood))).status);
    check('one visitor cannot flood the record', [statuses.slice(0, 20).every(s => s === 201), statuses[20]], [true, 503]);
    const stored = (await db.query('SELECT choices, origin, visitor_id FROM app.cmp_consents WHERE id=$1', [receipt.receipt_id])).rows[0];
    check('the record holds the choice, origin and a pseudonymous visitor only', [stored.choices, stored.origin, stored.visitor_id], [{ necessary: true, analytics: true }, origin, visitor]);

    t.setPhase('scanner');
    check('a page outside the approved origins cannot be scanned', await codes(admin.call(`/api/v1/admin/cmp-sites/${created.id}/scans`, { url: 'https://evil.example/' }, key())), { status: 409, codes: ['origin_not_approved_for_this_site'] });
    const clean = await ok(admin.call(`/api/v1/admin/cmp-sites/${created.id}/scans`, { url: `${origin}/` }, key()), S.schemas.CmpScan);
    const leaky = await ok(admin.call(`/api/v1/admin/cmp-sites/${created.id}/scans`, { url: `${origin}/leaky` }, key()), S.schemas.CmpScan);
    const recordsBefore = Number((await db.query('SELECT count(*) n FROM app.cmp_consents WHERE site_id=$1', [created.id])).rows[0].n);
    check('the worker carries out queued scans', await sweepCmpScans(runtime.scoped, runtime.enrollment.identities.map(x => x.id)) >= 2, true);
    const scans = (await ok(admin.call(`/api/v1/admin/cmp-sites/${created.id}/scans?limit=10`), S.schemas.CmpScanList)).items;
    const cleanScan = scans.find(s => s.id === clean.id)!; const leakyScan = scans.find(s => s.id === leaky.id)!;
    const trackerHost = `127.0.0.1:${trackerPort}`;
    check('the banner loaded and was shown', [cleanScan.state, cleanScan.results?.sdk_loaded, cleanScan.results?.banner_shown], ['COMPLETED', true, true]);
    check('on a correctly marked page the tracker waits for consent', [cleanScan.results?.before_consent.hosts.includes(trackerHost), cleanScan.results?.after_consent.hosts.includes(trackerHost), cleanScan.results?.after_refusal.hosts.includes(trackerHost)], [false, true, false]);
    check('its cookie appears only after consent', [cleanScan.results?.before_consent.cookies.includes('_syn_id'), cleanScan.results?.after_consent.cookies.includes('_syn_id')], [false, true]);
    check('a correctly marked page has no high finding', cleanScan.findings.filter(f => f.severity === 'HIGH'), []);
    const kinds = leakyScan.findings.map(f => [f.kind, f.subject]);
    check('a tracker loaded before consent is found', kinds.some(([k, s]) => k === 'TRACKER_BEFORE_CONSENT' && s === trackerHost), true);
    check('it is found again after refusal', kinds.some(([k, s]) => k === 'TRACKER_AFTER_REFUSAL' && s === trackerHost), true);
    check('a host the banner does not declare is found', kinds.some(([k, s]) => k === 'UNDECLARED_HOST' && s === `localhost:${trackerPort}`), true);
    check('a cookie set before consent is found', kinds.some(([k, s]) => k === 'COOKIE_BEFORE_CONSENT' && s === '_syn_id'), true);
    check('scans do not add visitor records', Number((await db.query('SELECT count(*) n FROM app.cmp_consents WHERE site_id=$1', [created.id])).rows[0].n), recordsBefore);
    check('the scan states its limits', cleanScan.limits.length, 3);

    t.setPhase('disable, isolation and history');
    check('an auditor reads but cannot change anything', [(await auditor.call(`/api/v1/admin/cmp-sites/${created.id}/consent-stats`)).status, (await auditor.call(`/api/v1/admin/cmp-sites/${created.id}/scans`, { url: `${origin}/` }, key())).status], [200, 403]);
    check('another tenant sees nothing', [(await birch.call(`/api/v1/admin/cmp-sites/${created.id}/consent-stats`)).status, (await ok(birch.call('/api/v1/admin/cmp-sites?limit=100'), S.schemas.CmpSiteList)).items.some(x => x.id === created.id)], [404, false]);
    const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((x: { code?: string }) => x.code ?? 'rejected');
    check('a consent record cannot be altered', await direct(`UPDATE app.cmp_consents SET choices='{}' WHERE id=$1`, [receipt.receipt_id]), '23514');
    check('a consent record cannot be deleted', await direct(`DELETE FROM app.cmp_consents WHERE id=$1`, [receipt.receipt_id]), '23514');
    check('a published banner cannot be rewritten', await direct(`UPDATE app.cmp_configs SET document='{}' WHERE id=$1`, [v1.id]), '23514');
    check('a site\'s origins cannot be changed', await direct(`UPDATE app.cmp_sites SET origins=ARRAY['https://evil.example'] WHERE id=$1`, [created.id]), '23514');
    await ok(admin.call(`/api/v1/admin/cmp-sites/${created.id}/disable`, {}, key()), S.schemas.CmpSite);
    check('a disabled site serves no script and records nothing', [(await sdk()).status, (await post(choice(true))).status], [404, 404]);
  } finally { await runtime.close(); site.close(); tracker.close(); }
});
