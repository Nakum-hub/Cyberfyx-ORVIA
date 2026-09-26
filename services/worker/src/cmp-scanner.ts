import { existsSync } from 'node:fs';
import { chromium, type BrowserContext } from '@playwright/test';
import { audit, predicate, scopeValues, type Context } from '../../../backend/domain/src/shared/transaction.ts';
import { scanFindings } from '../../../backend/domain/src/cmp/cmp.ts';

/**
 * Website consent scanner (EX02). It visits one page of an approved site
 * origin in a local headless Chromium three times: without any choice, after
 * accepting everything, and in a fresh profile after refusing everything and
 * reloading. It records which hosts the page contacted and which cookies it
 * set, never page content, and compares them with the published banner
 * configuration. The banner's own consent posts are answered locally so a scan
 * never adds a visitor record. Chromium must be installed on the host.
 */
const LIMITS = [
  'One page was visited; trackers that load only on other pages or after interaction are not seen.',
  'Hosts are the network destinations the page contacted; cookies are those visible to the browser after each visit.',
  'The scan ran in a local headless browser from this installation; it is not a certification of the site.',
];
const executablePath = () => process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

async function visit(context: BrowserContext, url: string, action: 'NONE' | 'ACCEPT' | 'REFUSE') {
  const page = await context.newPage();
  await page.route('**/api/v1/cmp/*/consents', route => route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }));
  const hosts = new Set<string>();
  page.on('request', r => { try { hosts.add(new URL(r.url()).host); } catch { /* not a URL we can attribute */ } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });
  const sdk = await page.evaluate(() => Boolean((window as unknown as { OrviaCMP?: unknown }).OrviaCMP));
  const banner = await page.evaluate(() => Boolean(document.getElementById('orvia-cmp')));
  if (action !== 'NONE') {
    hosts.clear();
    await page.evaluate(a => { const cmp = (window as unknown as { OrviaCMP?: { acceptAll(): unknown; rejectAll(): unknown } }).OrviaCMP; if (!cmp) return; if (a === 'ACCEPT') cmp.acceptAll(); else cmp.rejectAll(); }, action);
    await page.waitForTimeout(500);
    if (action === 'REFUSE') { hosts.clear(); await page.reload({ waitUntil: 'networkidle', timeout: 20_000 }); }
    else await page.waitForLoadState('networkidle', { timeout: 20_000 });
  }
  const cookies = (await context.cookies()).map(c => c.name);
  await page.close();
  return { sdk, banner, hosts: [...hosts].sort().slice(0, 200), cookies: [...new Set(cookies)].sort().slice(0, 200) };
}

export async function sweepCmpScans(scoped: <T>(id: string, work: (c: Context) => Promise<T>) => Promise<T>, workerIds: readonly string[]) {
  let processed = 0;
  for (const id of workerIds) {
    const due = await scoped(id, async c => (await c.tx.query(`SELECT s.id, s.url, s.attempts, t.origins, t.state AS site_state, cfg.version, cfg.document FROM app.cmp_scans s
      JOIN app.cmp_sites t ON t.tenant_id=s.tenant_id AND t.legal_entity_id=s.legal_entity_id AND t.environment_id=s.environment_id AND t.id=s.site_id
      LEFT JOIN app.cmp_configs cfg ON cfg.tenant_id=s.tenant_id AND cfg.legal_entity_id=s.legal_entity_id AND cfg.environment_id=s.environment_id AND cfg.site_id=s.site_id AND cfg.state='PUBLISHED'
      WHERE s.tenant_id=$1 AND s.legal_entity_id=$2 AND s.environment_id=$3 AND s.state='QUEUED' ORDER BY s.requested_at LIMIT 5`, scopeValues(c.actor))).rows);
    if (!due.length) continue;
    const browser = await chromium.launch({ headless: true, ...executablePath() ? { executablePath: executablePath() } : {} });
    try {
      for (const scan of due) {
        let outcome: { state: 'COMPLETED'; results: unknown; version: number } | { state: 'FAILED' | 'RETRY'; code: string };
        try {
          if (scan.site_state !== 'ENABLED') outcome = { state: 'FAILED', code: 'SITE_NOT_ENABLED' };
          else if (!scan.document) outcome = { state: 'FAILED', code: 'NO_PUBLISHED_BANNER' };
          else if (!(scan.origins as string[]).includes(new URL(scan.url).origin)) outcome = { state: 'FAILED', code: 'ORIGIN_NOT_APPROVED' };
          else {
            const first = await browser.newContext(); const before = await visit(first, scan.url, 'NONE'); const after = await visit(first, scan.url, 'ACCEPT'); await first.close();
            const second = await browser.newContext(); const refused = await visit(second, scan.url, 'REFUSE'); await second.close();
            const observations = { sdk_loaded: before.sdk, banner_shown: before.banner, before_consent: { hosts: before.hosts, cookies: before.cookies }, after_consent: { hosts: after.hosts, cookies: after.cookies }, after_refusal: { hosts: refused.hosts, cookies: refused.cookies } };
            const siteHosts = (scan.origins as string[]).map(o => new URL(o).host);
            outcome = { state: 'COMPLETED', version: scan.version, results: { observations, findings: scanFindings(scan.document, siteHosts, observations), limits: LIMITS } };
          }
        } catch { outcome = Number(scan.attempts) + 1 >= 3 ? { state: 'FAILED', code: 'SCAN_FAILED' } : { state: 'RETRY', code: 'SCAN_FAILED' }; }
        await scoped(id, async c => {
          const s = scopeValues(c.actor);
          if (outcome.state === 'COMPLETED') await c.tx.query(`UPDATE app.cmp_scans SET state='COMPLETED', observed_at=clock_timestamp(), config_version=$5, results=$6, recorded_by=$7 WHERE ${predicate} AND id=$4`, [...s, scan.id, outcome.version, JSON.stringify(outcome.results), c.actor.actor_id]);
          else if (outcome.state === 'FAILED') await c.tx.query(`UPDATE app.cmp_scans SET state='FAILED', failure_code=$5, attempts=least(attempts+1,3) WHERE ${predicate} AND id=$4`, [...s, scan.id, outcome.code]);
          else await c.tx.query(`UPDATE app.cmp_scans SET attempts=attempts+1 WHERE ${predicate} AND id=$4`, [...s, scan.id]);
          await audit(c, `cmp_scan.${outcome.state.toLowerCase()}`, scan.id);
        });
        processed++;
      }
    } finally { await browser.close(); }
  }
  return processed;
}
