import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * Website privacy-policy discovery (migration 0077). The site is asked where its policy is, the way it declares it itself: the
 * registered HTML link type <link rel="privacy-policy">. Only when there is no declaration does the worker fall back to a link on
 * the same page whose text names the privacy policy, and the result says which it was. One page and one document are read;
 * nothing else on the site is crawled, and a policy on an origin nobody approved is reported but never fetched.
 * The worker (services/worker/src/policy-discovery.ts) does the reading; this module holds the records and the judgement.
 */
type Row = QueryResultRow;
export const POLICY_DISCOVERY_LIMITS = [
  'Only the approved origin\'s home page and the one policy document it points to were read; nothing else on the site was crawled.',
  'A policy found by its link text rather than a declared rel="privacy-policy" link may be the wrong page; declaring the link removes the guess.',
  'A change is detected from the text as the browser rendered it; formatting-only edits that change the text also count as changes.',
  'Detecting a change is not reviewing it. ORVIA does not judge whether the policy meets the DPDP Act or matches the notices recorded here.',
  'Requests to origins other than the approved ones were blocked while reading, so anything the site loads from elsewhere was not seen.',
];
/** Link texts accepted as naming a privacy policy when the site declares none. Exact phrases only, never a substring guess. */
export const POLICY_LINK_TEXT = /^(privacy|privacy policy|privacy notice|privacy statement|privacy & cookies|privacy and cookies|privacy & cookie policy|privacy and cookie policy|data protection|data protection policy|data privacy policy|गोपनीयता नीति)$/i;

export type PolicyObservation = {
  declared_url: string | null; link_text_url: string | null; terms_url: string | null; home_status: number | null;
  policy?: { url: string; status: number; content_type: string | null; last_modified: string | null; title: string | null; language: string | null; text: string; digest: string } | null;
};
export type PolicyJudgement = {
  found_by: 'DECLARED_LINK' | 'LINK_TEXT' | 'NOT_FOUND'; policy_url: string | null; on_approved_origin: boolean;
  findings: { kind: string; severity: 'HIGH' | 'MEDIUM' | 'INFO'; detail: string }[]; changed_since_previous: boolean | null;
};

/** Which URL the site points to, and what is wrong with it. Pure, so the rules are testable without a browser. */
export function judgePolicy(obs: PolicyObservation, approvedOrigins: string[], previous: { policy_url: string | null; text_digest: string | null } | null): PolicyJudgement {
  const findings: PolicyJudgement['findings'] = [];
  const url = obs.declared_url ?? obs.link_text_url;
  const found_by = obs.declared_url ? 'DECLARED_LINK' : obs.link_text_url ? 'LINK_TEXT' : 'NOT_FOUND';
  let on = false;
  if (!url) findings.push({ kind: 'POLICY_NOT_FOUND', severity: 'HIGH', detail: 'The home page neither declares a privacy policy (rel="privacy-policy") nor links to one by name.' });
  else {
    on = approvedOrigins.includes(new URL(url).origin);
    if (found_by === 'LINK_TEXT') findings.push({ kind: 'POLICY_NOT_DECLARED', severity: 'MEDIUM', detail: 'Found by its link text. Add <link rel="privacy-policy" href="…"> to the page head so the location is declared, not guessed.' });
    if (!on) findings.push({ kind: 'POLICY_ON_UNAPPROVED_ORIGIN', severity: 'MEDIUM', detail: `The policy is on ${new URL(url).origin}, which is not an approved origin of this site, so it was not read. Approve that origin to include it.` });
  }
  if (obs.policy) {
    if (obs.policy.status >= 400) findings.push({ kind: 'POLICY_UNREACHABLE', severity: 'HIGH', detail: `The policy address answered HTTP ${obs.policy.status}.` });
    else if (obs.policy.text.length < 200) findings.push({ kind: 'POLICY_EMPTY', severity: 'HIGH', detail: `The policy page has only ${obs.policy.text.length} characters of text.` });
  }
  let changed: boolean | null = null;
  if (previous && obs.policy && obs.policy.status < 400) {
    if (previous.policy_url && previous.policy_url !== obs.policy.url) findings.push({ kind: 'POLICY_MOVED', severity: 'INFO', detail: `The policy moved from ${previous.policy_url.slice(0, 120)}.` });
    if (previous.text_digest) {
      changed = previous.text_digest !== obs.policy.digest;
      if (changed) findings.push({ kind: 'POLICY_CHANGED', severity: 'INFO', detail: 'The policy text changed since the previous discovery. Review it against the notices and purposes recorded in ORVIA.' });
    }
  }
  return { found_by, policy_url: url, on_approved_origin: on, findings, changed_since_previous: changed };
}

const view = (r: Row) => {
  const x = (r.results ?? {}) as Record<string, unknown>;
  return X.PolicyDiscovery.parse({
    id: r.id, site_id: r.site_id, origin: r.origin, trigger: r.trigger, state: r.state, requested_by: r.requested_by, requested_at: iso(r.requested_at), observed_at: iso(r.observed_at),
    failure_code: r.failure_code, found_by: x.found_by ?? null, policy_url: x.policy_url ?? null, http_status: x.http_status ?? null, content_type: x.content_type ?? null,
    last_modified: x.last_modified ?? null, title: x.title ?? null, language: x.language ?? null, terms_url: x.terms_url ?? null, text_digest: r.text_digest,
    text_length: r.policy_text === null || r.policy_text === undefined ? (x.text_length ?? null) : String(r.policy_text).length,
    previous_discovery_id: x.previous_discovery_id ?? null, changed_since_previous: x.changed_since_previous ?? null, findings: x.findings ?? [],
    reviewed_by: r.reviewed_by, reviewed_at: iso(r.reviewed_at), review_note: r.review_note, limits: r.state === 'COMPLETED' ? POLICY_DISCOVERY_LIMITS : [],
  });
};
// The list never carries the policy text; it is read one discovery at a time.
const COLUMNS = 'id, site_id, origin, trigger, state, requested_by, requested_at, observed_at, failure_code, results, text_digest, NULL::text AS policy_text, reviewed_by, reviewed_at, review_note';

async function site(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT id, origins, state FROM app.cmp_sites WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}

export async function requestPolicyDiscovery(c: Context, siteId: string, input: unknown) {
  const v = X.PolicyDiscoveryRequest.parse(input);
  const s = await site(c, siteId);
  if (s.state !== 'ENABLED') refuse(409, 'state', 'site_not_enabled');
  const origin = new URL(v.origin).origin;
  if (!(s.origins as string[]).includes(origin)) refuse(409, 'origin', 'origin_not_approved_for_this_site');
  if ((await c.tx.query(`SELECT 1 FROM app.policy_discoveries WHERE ${predicate} AND site_id=$4 AND state='QUEUED'`, [...scope(c), siteId])).rowCount) refuse(409, 'state', 'discovery_already_queued');
  const row = (await c.tx.query(`INSERT INTO app.policy_discoveries(tenant_id,legal_entity_id,environment_id,id,site_id,origin,trigger,requested_by) VALUES($1,$2,$3,$4,$5,$6,'STAFF',$7) RETURNING ${COLUMNS}`,
    [...scope(c), randomUUID(), siteId, origin, c.actor.actor_id])).rows[0];
  await audit(c, 'policy_discovery.request', row.id);
  return view(row);
}

export async function policyDiscoveryList(c: Context, siteId: string, page: Page) {
  await site(c, siteId);
  const rows = (await c.tx.query(`SELECT ${COLUMNS} FROM app.policy_discoveries x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3 AND x.site_id=$4
    AND ($5::uuid IS NULL OR (x.requested_at, x.id) < (SELECT k.requested_at, k.id FROM app.policy_discoveries k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$5))
    ORDER BY x.requested_at DESC, x.id DESC LIMIT $6`, [...scope(c), siteId, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(view), next_cursor: paged.next_cursor };
}

export async function policyDiscoveryText(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT id, results, text_digest, policy_text FROM app.policy_discoveries WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  if (r.policy_text === null) refuse(409, 'state', 'no_policy_text');
  return X.PolicyDiscoveryText.parse({ id: r.id, policy_url: r.results?.policy_url ?? null, text_digest: r.text_digest, text: r.policy_text });
}

export async function reviewPolicyDiscovery(c: Context, id: string, input: unknown) {
  const v = X.PolicyDiscoveryReview.parse(input);
  const r = (await c.tx.query(`SELECT state, reviewed_at FROM app.policy_discoveries WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  if (r.state !== 'COMPLETED') refuse(409, 'state', 'only_a_completed_discovery_is_reviewed');
  if (r.reviewed_at) refuse(409, 'state', 'already_reviewed');
  const row = (await c.tx.query(`UPDATE app.policy_discoveries SET reviewed_by=$5, reviewed_at=clock_timestamp(), review_note=$6 WHERE ${predicate} AND id=$4 RETURNING ${COLUMNS}`,
    [...scope(c), id, c.actor.actor_id, v.note])).rows[0];
  await audit(c, 'policy_discovery.review', id);
  return view(row);
}
