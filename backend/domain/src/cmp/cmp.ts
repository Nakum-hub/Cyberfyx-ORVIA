import { createHash, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';
import { canonical } from '../mapping/ropa.ts';

/**
 * EX02 website consent management: sites, banner configurations, consent
 * statistics and scans. Visitor consent records are written only through
 * app.cmp_record_consent (backend/api/src/cmp.ts); scans are carried out by the
 * worker (services/worker/src/cmp-scanner.ts) against approved origins only.
 */
type Row = QueryResultRow;
const siteView = (r: Row) => X.CmpSite.parse({ id: r.id, site_key: r.site_key, name: r.name, origins: r.origins, state: r.state, created_by: r.created_by, created_at: iso(r.created_at),
  approved_by: r.approved_by, approved_at: iso(r.approved_at), disabled_at: iso(r.disabled_at), sdk_path: `/cmp/${r.site_key}/orvia-cmp.js` });
async function siteRow(c: Context, id: string, lock = false) {
  const r = (await c.tx.query(`SELECT * FROM app.cmp_sites WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
export async function createSite(c: Context, input: unknown) {
  const v = X.CmpSiteCreate.parse(input);
  if (new Set(v.origins).size !== v.origins.length) refuse(400, 'origins', 'duplicate_origin');
  const row = (await c.tx.query(`INSERT INTO app.cmp_sites(tenant_id,legal_entity_id,environment_id,id,site_key,name,origins,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...scope(c), randomUUID(), randomUUID(), v.name, v.origins, c.actor.actor_id])).rows[0];
  await audit(c, 'cmp_site.create', row.id);
  return siteView(row);
}
export async function enableSite(c: Context, id: string) {
  const s = await siteRow(c, id, true);
  if (s.state !== 'PENDING') refuse(409, 'state', 'only_a_pending_site_is_enabled');
  if (s.created_by === c.actor.actor_id) refuse(409, 'approved_by', 'author_cannot_enable');
  const row = (await c.tx.query(`UPDATE app.cmp_sites SET state='ENABLED', approved_by=$5, approved_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id])).rows[0];
  await audit(c, 'cmp_site.enable', id);
  return siteView(row);
}
export async function disableSite(c: Context, id: string) {
  const s = await siteRow(c, id, true);
  if (s.state === 'DISABLED') refuse(409, 'state', 'already_disabled');
  const row = (await c.tx.query(`UPDATE app.cmp_sites SET state='DISABLED', disabled_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id])).rows[0];
  await audit(c, 'cmp_site.disable', id);
  return siteView(row);
}
export async function siteList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.cmp_sites WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(siteView), next_cursor: paged.next_cursor };
}

const configView = (r: Row) => X.CmpConfig.parse({ id: r.id, site_id: r.site_id, version: r.version, document: r.document, content_digest: r.content_digest, state: r.state, authored_by: r.authored_by,
  authored_at: iso(r.authored_at), published_by: r.published_by, published_at: iso(r.published_at), retired_at: iso(r.retired_at) });
export async function createConfig(c: Context, siteId: string, input: unknown) {
  const v = X.CmpConfigCreate.parse(input);
  await siteRow(c, siteId);
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), 'cmp-config', siteId])]);
  const version = Number((await c.tx.query(`SELECT coalesce(max(version),0)+1 v FROM app.cmp_configs WHERE ${predicate} AND site_id=$4`, [...scope(c), siteId])).rows[0].v);
  const row = (await c.tx.query(`INSERT INTO app.cmp_configs(tenant_id,legal_entity_id,environment_id,id,site_id,version,document,content_digest,authored_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [...scope(c), randomUUID(), siteId, version, JSON.stringify(v.document), createHash('sha256').update(canonical(v.document)).digest('hex'), c.actor.actor_id])).rows[0];
  await audit(c, 'cmp_config.create', row.id);
  return configView(row);
}
export async function decideConfig(c: Context, id: string, input: unknown) {
  const v = X.CmpConfigDecision.parse(input);
  const cfg = (await c.tx.query(`SELECT * FROM app.cmp_configs WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!cfg) refuse(404, 'id', 'not_found');
  if (v.action === 'PUBLISH') {
    if (cfg.state !== 'DRAFT') refuse(409, 'state', 'only_a_draft_is_published');
    if (cfg.authored_by === c.actor.actor_id) refuse(409, 'published_by', 'author_cannot_publish');
    await c.tx.query(`UPDATE app.cmp_configs SET state='RETIRED', retired_at=clock_timestamp() WHERE ${predicate} AND site_id=$4 AND state='PUBLISHED'`, [...scope(c), cfg.site_id]);
    const row = (await c.tx.query(`UPDATE app.cmp_configs SET state='PUBLISHED', published_by=$5, published_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id])).rows[0];
    await audit(c, 'cmp_config.publish', id);
    return configView(row);
  }
  if (cfg.state !== 'PUBLISHED') refuse(409, 'state', 'only_a_published_config_is_retired');
  const row = (await c.tx.query(`UPDATE app.cmp_configs SET state='RETIRED', retired_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id])).rows[0];
  await audit(c, 'cmp_config.retire', id);
  return configView(row);
}
export async function configList(c: Context, siteId: string, page: Page) {
  await siteRow(c, siteId);
  const rows = (await c.tx.query(`SELECT * FROM app.cmp_configs WHERE ${predicate} AND site_id=$4 AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`, [...scope(c), siteId, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(configView), next_cursor: paged.next_cursor };
}

/** Counts from each visitor's latest choice. Visitors are pseudonymous; nothing here identifies a person. */
export async function consentStats(c: Context, siteId: string) {
  await siteRow(c, siteId);
  const latest = (await c.tx.query(`SELECT DISTINCT ON (visitor_id) visitor_id, choices, gpc, recorded_at FROM app.cmp_consents WHERE ${predicate} AND site_id=$4 ORDER BY visitor_id, recorded_at DESC`, [...scope(c), siteId])).rows;
  const records = Number((await c.tx.query(`SELECT count(*) n FROM app.cmp_consents WHERE ${predicate} AND site_id=$4`, [...scope(c), siteId])).rows[0].n);
  const keys = [...new Set(latest.flatMap(r => Object.keys(r.choices)))].sort().slice(0, 10);
  return X.CmpConsentStats.parse({
    site_id: siteId, visitors: latest.length, records, gpc_visitors: latest.filter(r => r.gpc).length, latest_at: latest.length ? iso(latest.map(r => r.recorded_at).sort().at(-1)) : null,
    by_category: keys.map(key => ({ key, granted: latest.filter(r => r.choices[key] === true).length, refused: latest.filter(r => r.choices[key] === false).length })),
    limits: ['Counts are taken from each visitor\'s most recent choice. A visitor is a random identifier in a first-party cookie; clearing cookies makes a new visitor.'],
  });
}

const scanView = (r: Row) => X.CmpScan.parse({ id: r.id, site_id: r.site_id, url: r.url, state: r.state, requested_by: r.requested_by, requested_at: iso(r.requested_at), observed_at: iso(r.observed_at),
  config_version: r.config_version, results: r.results ? r.results.observations : null, findings: r.results?.findings ?? [], failure_code: r.failure_code, limits: r.results?.limits ?? [] });
export async function requestScan(c: Context, siteId: string, input: unknown) {
  const v = X.CmpScanRequest.parse(input);
  const s = await siteRow(c, siteId);
  if (s.state !== 'ENABLED') refuse(409, 'state', 'site_not_enabled');
  const origin = new URL(v.url).origin;
  if (!(s.origins as string[]).includes(origin)) refuse(409, 'url', 'origin_not_approved_for_this_site');
  const row = (await c.tx.query(`INSERT INTO app.cmp_scans(tenant_id,legal_entity_id,environment_id,id,site_id,url,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [...scope(c), randomUUID(), siteId, v.url, c.actor.actor_id])).rows[0];
  await audit(c, 'cmp_scan.request', row.id);
  return scanView(row);
}
export async function scanList(c: Context, siteId: string, page: Page) {
  await siteRow(c, siteId);
  const rows = (await c.tx.query(`SELECT * FROM app.cmp_scans x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3 AND x.site_id=$4
    AND ($5::uuid IS NULL OR (x.requested_at, x.id) < (SELECT k.requested_at, k.id FROM app.cmp_scans k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$5))
    ORDER BY x.requested_at DESC, x.id DESC LIMIT $6`, [...scope(c), siteId, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(scanView), next_cursor: paged.next_cursor };
}

type Observation = { hosts: string[]; cookies: string[] };
type Doc = ReturnType<typeof X.CmpConfigDocument.parse>;
const hostMatches = (pattern: string, host: string) => pattern.startsWith('*.') ? host === pattern.slice(2) || host.endsWith(pattern.slice(1)) : host === pattern;
const cookieMatches = (pattern: string, name: string) => pattern.endsWith('*') ? name.startsWith(pattern.slice(0, -1)) : name === pattern;
/** Compares what a page did before consent, after acceptance and after refusal with what the configuration declares. */
export function scanFindings(doc: Doc, siteHosts: string[], obs: { sdk_loaded: boolean; banner_shown: boolean; before_consent: Observation; after_consent: Observation; after_refusal: Observation }) {
  const findings: { kind: string; severity: 'HIGH' | 'MEDIUM' | 'INFO'; subject: string; detail: string }[] = [];
  const required = new Set(doc.categories.filter(x => x.required).map(x => x.key));
  const trackerForHost = (host: string) => doc.trackers.find(t => t.hosts.some(p => hostMatches(p, host)));
  const trackerForCookie = (name: string) => doc.trackers.find(t => t.cookies.some(p => cookieMatches(p, name)));
  if (!obs.sdk_loaded) findings.push({ kind: 'SDK_MISSING', severity: 'HIGH', subject: 'orvia-cmp.js', detail: 'The page did not load the consent banner script.' });
  const thirdParty = (hosts: string[]) => hosts.filter(h => !siteHosts.includes(h));
  for (const host of thirdParty(obs.before_consent.hosts)) {
    const t = trackerForHost(host);
    if (t && !required.has(t.category)) findings.push({ kind: 'TRACKER_BEFORE_CONSENT', severity: 'HIGH', subject: host, detail: `${t.name} (${t.category}) was contacted before any choice was made.` });
  }
  for (const host of thirdParty(obs.after_refusal.hosts)) {
    const t = trackerForHost(host);
    if (t && !required.has(t.category)) findings.push({ kind: 'TRACKER_AFTER_REFUSAL', severity: 'HIGH', subject: host, detail: `${t.name} (${t.category}) was contacted after the visitor refused it.` });
  }
  for (const name of obs.before_consent.cookies) {
    const t = trackerForCookie(name);
    if (t && !required.has(t.category)) findings.push({ kind: 'COOKIE_BEFORE_CONSENT', severity: 'HIGH', subject: name, detail: `${t.name} (${t.category}) set this cookie before any choice was made.` });
  }
  const seenHosts = new Set([...obs.before_consent.hosts, ...obs.after_consent.hosts, ...obs.after_refusal.hosts]);
  for (const host of thirdParty([...seenHosts])) if (!trackerForHost(host)) findings.push({ kind: 'UNDECLARED_HOST', severity: 'MEDIUM', subject: host, detail: 'The page contacted a third-party host the configuration does not declare.' });
  const seenCookies = new Set([...obs.before_consent.cookies, ...obs.after_consent.cookies, ...obs.after_refusal.cookies]);
  for (const name of seenCookies) if (!name.startsWith('orvia_cmp') && !trackerForCookie(name)) findings.push({ kind: 'UNDECLARED_COOKIE', severity: 'MEDIUM', subject: name, detail: 'The page set a cookie the configuration does not declare.' });
  for (const t of doc.trackers) if (!t.hosts.some(p => [...seenHosts].some(h => hostMatches(p, h)))) findings.push({ kind: 'DECLARED_NOT_SEEN', severity: 'INFO', subject: t.name, detail: 'Declared but not observed on this page; it may load elsewhere on the site.' });
  return findings.slice(0, 200);
}
