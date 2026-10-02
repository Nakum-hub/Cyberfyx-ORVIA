import { licenceCovers } from '../../../backend/domain/src/licensing/licensing.ts';
import { createHash, randomUUID } from 'node:crypto';
import type { Browser, BrowserContext } from '@playwright/test';
import { launchLocalChromium } from './local-browser.ts';
import { audit, predicate, scopeValues, type Context } from '../../../backend/domain/src/shared/transaction.ts';
import { judgePolicy, POLICY_LINK_TEXT, type PolicyObservation } from '../../../backend/domain/src/cmp/policy-discovery.ts';

/**
 * Website privacy-policy discovery (migration 0077). For each queued discovery the worker opens the approved origin's home
 * page in a local headless Chromium and asks the page where its privacy policy is: first the declared
 * <link rel="privacy-policy">, then, only if there is none, a link whose whole text names the privacy policy. It reads that
 * one document if it is on an approved origin and keeps its rendered text and SHA-256 digest. Every request to an origin
 * that is not approved is aborted, and images, media and fonts are not loaded, so the site's third parties are never
 * contacted from this installation. Enabled sites are rediscovered weekly so a changed or missing policy surfaces by itself.
 */
const WEEK_MS = 7 * 86_400_000;
const normalise = (text: string) => text.replace(/\r/g, '').split('\n').map(l => l.replace(/[ \t\u00a0]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();

async function restricted(browser: Browser, origins: string[]): Promise<BrowserContext> {
  const context = await browser.newContext({ javaScriptEnabled: true, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const request = route.request();
    let origin = '';
    try { origin = new URL(request.url()).origin; } catch { /* data: and similar */ }
    if (!origins.includes(origin) || ['image', 'media', 'font'].includes(request.resourceType())) return route.abort();
    return route.continue();
  });
  return context;
}

/** One discovery: the home page's declaration, then at most one document. */
export async function observePolicy(browser: Browser, origin: string, origins: string[]): Promise<PolicyObservation & { home_final_origin: string }> {
  const context = await restricted(browser, origins);
  try {
    const page = await context.newPage();
    const home = await page.goto(`${origin}/`, { waitUntil: 'load', timeout: 20_000 });
    const homeFinal = new URL(page.url()).origin;
    // Passed as source text: the TypeScript loader wraps named functions with a helper that does not exist inside the page.
    const links = await page.evaluate(`(() => {
      const pattern = new RegExp(${JSON.stringify(POLICY_LINK_TEXT.source)}, 'i');
      const rel = name => Array.from(document.querySelectorAll('link[rel], a[rel]')).find(l => (l.getAttribute('rel') || '').toLowerCase().split(/\\s+/).includes(name));
      const web = href => href && /^https?:/i.test(href) ? href : null;
      const label = a => ((a.textContent || '').trim() || a.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim();
      const named = Array.from(document.querySelectorAll('a[href]')).find(a => pattern.test(label(a)));
      return { declared: web(rel('privacy-policy') && rel('privacy-policy').href), terms: web(rel('terms-of-service') && rel('terms-of-service').href), named: web(named && named.href) };
    })()`) as { declared: string | null; terms: string | null; named: string | null };
    const obs: PolicyObservation & { home_final_origin: string } = { declared_url: links.declared, link_text_url: links.declared ? null : links.named, terms_url: links.terms, home_status: home?.status() ?? null, policy: null, home_final_origin: homeFinal };
    const url = obs.declared_url ?? obs.link_text_url;
    if (url && origins.includes(new URL(url).origin)) {
      const response = await page.goto(url, { waitUntil: 'load', timeout: 20_000 });
      const finalUrl = page.url();
      // A redirect off the approved origins is treated as a policy there: reported, its text not kept.
      if (!origins.includes(new URL(finalUrl).origin)) return { ...obs, declared_url: obs.declared_url ? finalUrl : null, link_text_url: obs.declared_url ? null : finalUrl };
      const headers = response?.headers() ?? {};
      const facts = await page.evaluate('({ title: document.title, language: document.documentElement.lang || null, text: document.body ? document.body.innerText : "" })') as { title: string; language: string | null; text: string };
      const text = normalise(facts.text).slice(0, 200_000);
      obs.policy = { url: finalUrl, status: response?.status() ?? 0, content_type: headers['content-type']?.slice(0, 200) ?? null, last_modified: headers['last-modified']?.slice(0, 100) ?? null,
        title: facts.title ? facts.title.slice(0, 300) : null, language: facts.language ? facts.language.slice(0, 35) : null, text, digest: createHash('sha256').update(text).digest('hex') };
    }
    return obs;
  } finally { await context.close(); }
}

export async function sweepPolicyDiscoveries(scoped: <T>(id: string, work: (c: Context) => Promise<T>) => Promise<T>, workerIds: readonly string[], now: () => number = Date.now) {
  let processed = 0;
  for (const id of workerIds) {
    // Rev 1.11: paused, not failed, while the licence in force does not cover it.
    if (!(await scoped(id, c => licenceCovers(c, 'DISCOVERY_CLASSIFICATION')))) continue;
    // Weekly rediscovery: an enabled site with nothing queued and nothing requested in the last week gets one, for its first origin.
    await scoped(id, async c => {
      const s = scopeValues(c.actor);
      const due = (await c.tx.query(`SELECT t.id, t.origins[1] AS origin FROM app.cmp_sites t WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3 AND t.state='ENABLED'
        AND NOT EXISTS (SELECT 1 FROM app.policy_discoveries d WHERE d.tenant_id=t.tenant_id AND d.legal_entity_id=t.legal_entity_id AND d.environment_id=t.environment_id AND d.site_id=t.id
          AND (d.state='QUEUED' OR d.requested_at > $4::timestamptz)) LIMIT 20`, [...s, new Date(now() - WEEK_MS).toISOString()])).rows;
      for (const site of due) {
        const row = (await c.tx.query(`INSERT INTO app.policy_discoveries(tenant_id,legal_entity_id,environment_id,id,site_id,origin,trigger,requested_by) VALUES($1,$2,$3,$4,$5,$6,'SCHEDULE',$7) ON CONFLICT DO NOTHING RETURNING id`,
          [...s, randomUUID(), site.id, site.origin, c.actor.actor_id])).rows[0];
        if (row) await audit(c, 'policy_discovery.schedule', row.id);
      }
    });
    const queued = await scoped(id, async c => (await c.tx.query(`SELECT d.id, d.site_id, d.origin, d.attempts, t.origins, t.state AS site_state FROM app.policy_discoveries d
      JOIN app.cmp_sites t ON t.tenant_id=d.tenant_id AND t.legal_entity_id=d.legal_entity_id AND t.environment_id=d.environment_id AND t.id=d.site_id
      -- A person waiting on a discovery goes before the weekly ones, however many sites are due.
      WHERE d.tenant_id=$1 AND d.legal_entity_id=$2 AND d.environment_id=$3 AND d.state='QUEUED' ORDER BY (d.trigger='STAFF') DESC, d.requested_at LIMIT 5`, scopeValues(c.actor))).rows);
    if (!queued.length) continue;
    const browser = await launchLocalChromium();
    try {
      for (const d of queued) {
        const origins = d.origins as string[];
        type Outcome = { state: 'COMPLETED'; results: Record<string, unknown>; text: string | null; digest: string | null } | { state: 'FAILED' | 'RETRY'; code: string };
        let outcome: Outcome;
        try {
          if (d.site_state !== 'ENABLED') outcome = { state: 'FAILED', code: 'SITE_NOT_ENABLED' };
          else if (!origins.includes(d.origin)) outcome = { state: 'FAILED', code: 'ORIGIN_NOT_APPROVED' };
          else {
            const obs = await observePolicy(browser, d.origin, origins);
            if (!origins.includes(obs.home_final_origin)) outcome = { state: 'FAILED', code: 'HOME_REDIRECTED_OFF_APPROVED_ORIGINS' };
            else if (obs.home_status !== null && obs.home_status >= 400) outcome = { state: 'FAILED', code: `HOME_PAGE_HTTP_${obs.home_status}` };
            else {
              const previous = await scoped(id, async c => (await c.tx.query(`SELECT id, results->>'policy_url' AS policy_url, text_digest FROM app.policy_discoveries WHERE ${predicate} AND site_id=$4 AND state='COMPLETED'
                ORDER BY observed_at DESC, id DESC LIMIT 1`, [...scopeValues(c.actor), d.site_id])).rows[0]);
              const judged = judgePolicy(obs, origins, previous ?? null);
              const kept = obs.policy && obs.policy.status < 400 ? obs.policy : null;
              outcome = { state: 'COMPLETED', text: kept?.text ?? null, digest: kept?.digest ?? null, results: {
                found_by: judged.found_by, policy_url: judged.policy_url, http_status: obs.policy?.status ?? null, content_type: obs.policy?.content_type ?? null,
                last_modified: obs.policy?.last_modified ?? null, title: obs.policy?.title ?? null, language: obs.policy?.language ?? null, terms_url: obs.terms_url,
                text_length: kept?.text.length ?? null, previous_discovery_id: previous?.id ?? null, changed_since_previous: judged.changed_since_previous, findings: judged.findings } };
            }
          }
        } catch { outcome = Number(d.attempts) + 1 >= 3 ? { state: 'FAILED', code: 'DISCOVERY_FAILED' } : { state: 'RETRY', code: 'DISCOVERY_FAILED' }; }
        await scoped(id, async c => {
          const s = scopeValues(c.actor);
          if (outcome.state === 'COMPLETED') await c.tx.query(`UPDATE app.policy_discoveries SET state='COMPLETED', observed_at=clock_timestamp(), results=$5, policy_text=$6, text_digest=$7 WHERE ${predicate} AND id=$4`,
            [...s, d.id, JSON.stringify(outcome.results), outcome.text, outcome.digest]);
          else if (outcome.state === 'FAILED') await c.tx.query(`UPDATE app.policy_discoveries SET state='FAILED', failure_code=$5, attempts=least(attempts+1,3) WHERE ${predicate} AND id=$4`, [...s, d.id, outcome.code]);
          else await c.tx.query(`UPDATE app.policy_discoveries SET attempts=attempts+1 WHERE ${predicate} AND id=$4`, [...s, d.id]);
          await audit(c, `policy_discovery.${outcome.state.toLowerCase()}`, d.id);
        });
        processed++;
      }
    } finally { await browser.close(); }
  }
  return processed;
}
