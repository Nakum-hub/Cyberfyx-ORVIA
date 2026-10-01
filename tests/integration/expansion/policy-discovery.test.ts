import { allPageList } from '../../../shared/testing/src/all-pages.ts';
// Website privacy-policy discovery (migration 0077, contract 0.51.0) through the HTTP boundary and the worker.
// Loopback test sites stand in for the organisation's website, another origin and a third-party tracker (synthetic, local).
// Scenarios: a declared <link rel="privacy-policy"> is followed and its text kept with a digest; a recheck of unchanged text says
// unchanged; changed text is flagged, raises Operations attention, and a review clears it (once only); a site with no declaration
// but a footer link named "Privacy Policy" is found by link text and told to declare it; a Hindi link text works; a site with no
// policy at all is HIGH and raises attention; a policy declared on an unapproved origin is reported and never fetched; a broken
// policy address is HIGH; a near-empty policy page is HIGH; only the home page and the one policy document are read (no crawl);
// third-party requests are blocked while reading; the weekly schedule queues a rediscovery by itself; a read-only role, an
// unapproved origin, a disabled site and a second queued request are refused; another tenant sees nothing; the database refuses
// rewriting a completed discovery's text or deleting it.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepPolicyDiscoveries } from '../../../services/worker/src/policy-discovery.ts';

const t = operationsSuite('policy-discovery');
const { h, check, ok, codes, db } = t;
const listen = (server: http.Server) => new Promise<number>(r => server.listen(0, '127.0.0.1', () => r((server.address() as AddressInfo).port)));
const LONG = 'We collect your name, email address and order history to deliver orders and, with your consent, to send offers. You may withdraw consent at any time, ask for a copy or correction of your data, or ask us to erase it. Contact our Data Protection Officer at privacy@shop.example. You may also complain to the Data Protection Board of India. (synthetic)';

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const servers: http.Server[] = [];
  let runtimeForCleanup: ReturnType<typeof workflowActivities> | undefined;
  try {
  let trackerHits = 0; let otherHits = 0;
  const tracker = http.createServer((req, res) => { trackerHits++; res.writeHead(200, { 'content-type': 'application/javascript' }); res.end('void 0;'); });
  servers.push(tracker);
  const trackerPort = await listen(tracker);
  const other = http.createServer((req, res) => { otherHits++; res.writeHead(200, { 'content-type': 'text/html' }); res.end(`<html><body>${LONG}</body></html>`); });
  servers.push(other);
  const otherPort = await listen(other);
  // The organisation's site. `mode` decides what the home page declares; every path requested is recorded.
  let mode = 'declared'; let policyText = LONG; const paths: string[] = [];
  const site = http.createServer((req, res) => {
    paths.push(req.url ?? '');
    const page = (head: string, body: string) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(`<!doctype html><html lang="en"><head><title>Synthetic shop</title>${head}<script src="http://127.0.0.1:${trackerPort}/t.js"></script></head><body>${body}<a href="/about">About</a><a href="/careers">Careers</a></body></html>`); };
    if (req.url === '/') {
      if (mode === 'declared') return page('<link rel="privacy-policy" href="/legal/privacy"><link rel="terms-of-service" href="/legal/terms">', '<a href="/old-privacy">Privacy policy</a>');
      if (mode === 'text') return page('', '<footer><a href="/privacy-notice">  Privacy   Policy </a></footer>');
      if (mode === 'hindi') return page('', '<footer><a href="/hi/privacy">गोपनीयता नीति</a></footer>');
      if (mode === 'none') return page('', '<footer><a href="/contact">Contact</a><a href="/privacy-tips">Privacy tips for shoppers</a></footer>');
      if (mode === 'elsewhere') return page(`<link rel="privacy-policy" href="http://127.0.0.1:${otherPort}/privacy">`, '');
      if (mode === 'broken') return page('<link rel="privacy-policy" href="/gone">', '');
      if (mode === 'empty') return page('<link rel="privacy-policy" href="/stub">', '');
    }
    if (req.url === '/legal/privacy' || req.url === '/privacy-notice' || req.url === '/hi/privacy') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'last-modified': 'Wed, 01 Oct 2026 00:00:00 GMT' }); return res.end(`<html lang="en"><head><title>Privacy policy</title></head><body><h1>Privacy policy</h1><p>${policyText}</p></body></html>`); }
    if (req.url === '/stub') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html><body>Coming soon</body></html>'); }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found');
  });
  servers.push(site);
  const origin = `http://127.0.0.1:${await listen(site)}`;
  const runtime = runtimeForCleanup = workflowActivities();
  const workers = runtime.enrollment.identities.map(x => x.id);
  const D = (id: string) => `/api/v1/admin/cmp-sites/${id}/policy-discoveries`;
  const latest = async (id: string) => (await ok(admin.call(`${D(id)}?limit=1`), S.schemas.PolicyDiscoveryList)).items[0]!;
  const discover = async (id: string) => { await ok(admin.call(D(id), { origin }, key()), S.schemas.PolicyDiscovery); paths.length = 0; await sweepPolicyDiscoveries(runtime.scoped, workers); return latest(id); };
  const kinds = (x: { findings: { kind: string }[] }) => x.findings.map(f => f.kind).sort();
  const attention = async (siteId: string) => (await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention)).items.some(i => i.kind === 'WEBSITE_POLICY_REVIEW' && i.entity_id === siteId);
    t.setPhase('site');
    const created = await ok(admin.call('/api/v1/admin/cmp-sites', { name: unique('Policy shop'), origins: [origin] }, key()), S.schemas.CmpSite);
    check('a discovery needs an enabled site', (await codes(admin.call(D(created.id), { origin }, key()))).codes, ['site_not_enabled']);
    await ok(owner.call(`/api/v1/admin/cmp-sites/${created.id}/enable`, {}, key()), S.schemas.CmpSite);

    t.setPhase('declared policy');
    check('a read-only role cannot request a discovery', (await auditor.call(D(created.id), { origin }, key())).status, 403);
    check('an origin the site does not have is refused', (await codes(admin.call(D(created.id), { origin: `http://127.0.0.1:${otherPort}` }, key()))).codes, ['origin_not_approved_for_this_site']);
    await ok(admin.call(D(created.id), { origin }, key()), S.schemas.PolicyDiscovery);
    check('a second request while one is queued is refused', (await codes(admin.call(D(created.id), { origin }, key()))).codes, ['discovery_already_queued']);
    paths.length = 0; await sweepPolicyDiscoveries(runtime.scoped, workers);
    const first = await latest(created.id);
    check('the declared link is followed, not the footer link', [first.state, first.found_by, first.policy_url, first.http_status], ['COMPLETED', 'DECLARED_LINK', `${origin}/legal/privacy`, 200]);
    check('the policy text, title, language, terms link and digest are kept; no findings on a first discovery', [first.title, first.language, first.terms_url, first.text_length! > 300, /^[a-f0-9]{64}$/.test(first.text_digest ?? ''), first.changed_since_previous, first.findings],
      ['Privacy policy', 'en', `${origin}/legal/terms`, true, true, null, []]);
    check('only the home page and the one policy document were read (no crawl)', [...new Set(paths)].sort(), ['/', '/legal/privacy']);
    check('the third-party tracker on the page was never contacted', trackerHits, 0);
    const text = await ok(admin.call(`/api/v1/admin/policy-discoveries/${first.id}/text`), S.schemas.PolicyDiscoveryText);
    check('the retrieved text can be read and matches the digest', [text.text.includes('Data Protection Board of India'), text.text_digest], [true, first.text_digest]);
    check('no attention for a healthy first discovery', await attention(created.id), false);

    t.setPhase('unchanged and changed');
    const same = await discover(created.id);
    check('a recheck of the same text says unchanged', [same.changed_since_previous, same.previous_discovery_id, same.findings], [false, first.id, []]);
    policyText = LONG.replace('to send offers', 'to send offers and to share your purchase history with advertising partners');
    const changed = await discover(created.id);
    check('changed text is flagged for review', [changed.changed_since_previous, kinds(changed), changed.text_digest !== first.text_digest], [true, ['POLICY_CHANGED'], true]);
    check('a changed policy raises Operations attention', await attention(created.id), true);
    check('a read-only role cannot record the review', (await auditor.call(`/api/v1/admin/policy-discoveries/${changed.id}/review`, { note: 'Looked at it.' }, key())).status, 403);
    const reviewed = await ok(admin.call(`/api/v1/admin/policy-discoveries/${changed.id}/review`, { note: 'New advertising sharing: notice and consent purposes to be updated (synthetic).' }, key()), S.schemas.PolicyDiscovery);
    check('the review is recorded with who and when, and clears attention', [reviewed.reviewed_by !== null, reviewed.review_note?.startsWith('New advertising'), await attention(created.id)], [true, true, false]);
    check('a discovery is reviewed once', (await codes(admin.call(`/api/v1/admin/policy-discoveries/${changed.id}/review`, { note: 'Again.' }, key()))).codes, ['already_reviewed']);
    policyText = LONG;

    t.setPhase('undeclared, Hindi, missing');
    mode = 'text';
    const byText = await discover(created.id);
    check('without a declaration, a link named "Privacy Policy" is found and the site is told to declare it', [byText.found_by, byText.policy_url, kinds(byText).includes('POLICY_NOT_DECLARED'), kinds(byText).includes('POLICY_MOVED')], ['LINK_TEXT', `${origin}/privacy-notice`, true, true]);
    mode = 'hindi';
    const hindi = await discover(created.id);
    check('a Hindi link text (गोपनीयता नीति) is recognised', [hindi.found_by, hindi.policy_url], ['LINK_TEXT', `${origin}/hi/privacy`]);
    mode = 'none';
    const none = await discover(created.id);
    check('no policy at all is HIGH and nothing else is read; a link merely containing "privacy" is not taken', [none.found_by, kinds(none), none.policy_url, [...new Set(paths)]], ['NOT_FOUND', ['POLICY_NOT_FOUND'], null, ['/']]);
    check('a missing policy raises attention', await attention(created.id), true);

    t.setPhase('elsewhere, broken, empty');
    mode = 'elsewhere';
    const elsewhere = await discover(created.id);
    check('a policy declared on an unapproved origin is reported and never fetched', [elsewhere.found_by, kinds(elsewhere), elsewhere.text_length, otherHits], ['DECLARED_LINK', ['POLICY_ON_UNAPPROVED_ORIGIN'], null, 0]);
    mode = 'broken';
    const broken = await discover(created.id);
    check('a broken policy address is HIGH and its text is not kept', [kinds(broken), broken.http_status, broken.text_length], [['POLICY_UNREACHABLE'], 404, null]);
    mode = 'empty';
    const empty = await discover(created.id);
    check('a near-empty policy page is HIGH', kinds(empty).includes('POLICY_EMPTY'), true);
    check('none of these discoveries contacted the third-party tracker', trackerHits, 0);

    t.setPhase('weekly schedule');
    mode = 'declared';
    const before = (await allPageList(p => admin.call(p), `${D(created.id)}`, value => S.schemas.PolicyDiscoveryList.parse(value))).items.length;
    await sweepPolicyDiscoveries(runtime.scoped, workers);
    check('no rediscovery is scheduled within a week of the last', (await allPageList(p => admin.call(p), `${D(created.id)}`, value => S.schemas.PolicyDiscoveryList.parse(value))).items.length, before);
    // Other enabled sites in this scope are due too; sweep until this site's weekly discovery has run (bounded).
    let scheduled = await latest(created.id);
    for (let i = 0; i < 40 && !(scheduled.trigger === 'SCHEDULE' && scheduled.state !== 'QUEUED'); i++) { await sweepPolicyDiscoveries(runtime.scoped, workers, () => Date.now() + 8 * 86_400_000); scheduled = await latest(created.id); }
    check('a week later the worker queues and runs a rediscovery by itself', [scheduled.trigger, scheduled.state, scheduled.found_by], ['SCHEDULE', 'COMPLETED', 'DECLARED_LINK']);

    t.setPhase('tenancy, guards, disablement');
    check('another tenant sees nothing', [(await birch.call(`${D(created.id)}?limit=10`)).status, (await birch.call(`/api/v1/admin/policy-discoveries/${first.id}/text`)).status], [404, 404]);
    const refused = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'changed', (e: Error) => e.message);
    check('a completed discovery\'s text cannot be rewritten', await refused('UPDATE app.policy_discoveries SET policy_text=$2 WHERE id=$1', [first.id, 'rewritten']), 'policy_discovery_transition_refused');
    check('a discovery cannot be deleted', await refused('DELETE FROM app.policy_discoveries WHERE id=$1', [first.id]), 'policy_discovery_is_retained');
    await ok(admin.call(`/api/v1/admin/cmp-sites/${created.id}/disable`, {}, key()), S.schemas.CmpSite);
    check('a disabled site takes no new discovery', (await codes(admin.call(D(created.id), { origin }, key()))).codes, ['site_not_enabled']);
  } finally {
    try { await runtimeForCleanup?.close(); }
    finally { await Promise.all(servers.map(server => new Promise<void>(resolve => server.close(() => resolve())))); }
  }
});
