import { createHash, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { adapterFor } from '../../../../connectors/src/shared/connector-adapters.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope, type OperationsEnv } from '../operations/shared.ts';
import { canonical } from '../mapping/ropa.ts';
import { releaseResponse } from './rights.ts';

/**
 * EX03 rights response packages.
 *
 * Preparing a package reads the principal's records from each system in the
 * request's plan through the connector's observer role, next to what ORVIA
 * itself holds about them. A source that cannot be read is recorded as such,
 * never as empty. Deterministic rules suggest fields that may concern another
 * person; the reviewer, who is not the preparer, must redact or keep each one
 * with a reason, and must acknowledge any unreadable source. Redaction removes
 * the value wherever it appears in the package, and the released content is
 * checked for leakage before it is fixed. The principal collects the copy
 * through the authenticated portal until it expires, is revoked or its
 * allowance is spent; each collection leaves a receipt. The content is purged
 * thirty days after delivery ends, leaving the digest and receipts.
 */
type Row = QueryResultRow;
type Section = ReturnType<typeof X.PackageSection.parse>;
const RULESET = 'response-redaction-rules v1';
const MAX_REFERENCES_PER_SYSTEM = 20;
const MAX_DELIVERY_DAYS = 30;
const PURGE_AFTER_DAYS = 30;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Ten or more digits, optionally separated by single spaces or hyphens, not inside a longer token: a date or an identifier is not a phone number.
const PHONE = /(?<![\w-])\+?\d(?:[\s-]?\d){9,13}(?![\w-])/g;
const OWN_IDENTIFIER_FIELD = /^(e-?mail|mail|email_address|phone|mobile|telephone|phone_number)$/i;
const OTHER_PERSON_FIELD = /contact|spouse|partner|referr|guardian|nominee|family|emergency|colleague|manager/i;
const REASON_LABEL: Record<string, string> = { THIRD_PARTY: 'another person\'s data', LEGAL_PRIVILEGE: 'legal privilege', SECURITY: 'security', OTHER: 'withheld' };
const sha = (text: string) => createHash('sha256').update(text).digest('hex');

async function requestRow(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT * FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
async function packageRow(c: Context, id: string, lock = false) {
  const r = (await c.tx.query(`SELECT * FROM app.rights_response_packages WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
function deliveryState(r: Row): ReturnType<typeof X.DeliveryState.parse> {
  if (r.state !== 'RELEASED') return 'NOT_RELEASED';
  if (r.revoked_at) return 'REVOKED';
  if (Date.parse(r.delivery_expires_at) <= Date.now()) return 'EXPIRED';
  if (r.downloads >= r.max_downloads) return 'EXHAUSTED';
  return 'ACTIVE';
}
const view = (r: Row) => X.ResponsePackage.parse({
  id: r.id, request_id: r.request_id, version: r.version, state: r.state, sections: r.sections, suggestions: r.suggestions, redactions: r.redactions, kept: r.kept, released_content: r.released_content,
  content_digest: r.content_digest, unreadable_acknowledged: r.unreadable_acknowledged, prepared_by: r.prepared_by, prepared_at: iso(r.prepared_at), reviewed_by: r.reviewed_by, reviewed_at: iso(r.reviewed_at),
  released_by: r.released_by, released_at: iso(r.released_at), delivery_expires_at: iso(r.delivery_expires_at), max_downloads: r.max_downloads, downloads: r.downloads, delivery_state: deliveryState(r),
  revoked_at: iso(r.revoked_at), revocation_reason: r.revocation_reason, purged_at: iso(r.purged_at),
});

/** Deterministic suggestions: another person's contact details, or a field whose name suggests another person. Never the value itself. */
function suggest(sections: Section[]) {
  const own = new Set(sections.flatMap(s => Object.entries(s.fields).filter(([k]) => OWN_IDENTIFIER_FIELD.test(k)).map(([, v]) => v.trim().toLowerCase())));
  const out: ReturnType<typeof X.PackageSuggestion.parse>[] = [];
  // Only what was read from a system can hold someone else's data; ORVIA's own request and consent entries are its records of this principal.
  for (const s of sections.filter(x => x.source === 'SYSTEM')) for (const [field, value] of Object.entries(s.fields)) {
    if (OWN_IDENTIFIER_FIELD.test(field)) continue;
    const foreign = [...value.matchAll(EMAIL), ...value.matchAll(PHONE)].map(m => m[0].trim().toLowerCase()).filter(v => !own.has(v));
    if (foreign.length) out.push({ section_id: s.section_id, field, reason: 'POSSIBLE_THIRD_PARTY', detail: `Contains ${foreign.length} contact detail(s) that are not the principal's own identifiers (${RULESET}).` });
    else if (OTHER_PERSON_FIELD.test(field)) out.push({ section_id: s.section_id, field, reason: 'POSSIBLE_THIRD_PARTY', detail: `The field name suggests it describes another person (${RULESET}).` });
  }
  return out.slice(0, 500);
}

export async function preparePackage(c: Context, env: OperationsEnv, requestId: string) {
  const request = await requestRow(c, requestId);
  if (!['ACCESS', 'CORRECTION'].includes(request.right_type)) refuse(409, 'right_type', 'right_produces_no_response_package');
  if (request.identity !== 'ESTABLISHED') refuse(409, 'identity', 'identity_not_established');
  if (!['EXECUTING', 'PARTIALLY_COMPLETED', 'COMPLETED'].includes(request.state)) refuse(409, 'state', 'request_not_executing');
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), 'response-package', requestId])]);
  const others = (await c.tx.query(`SELECT * FROM app.rights_response_packages WHERE ${predicate} AND request_id=$4 AND state IN ('DRAFT','REVIEWED','RELEASED')`, [...scope(c), requestId])).rows;
  if (others.some(o => o.state !== 'RELEASED' || (!o.purged_at && deliveryState(o) === 'ACTIVE'))) refuse(409, 'request_id', 'a_package_is_already_in_play');
  const readAt = new Date().toISOString();
  const sections: Section[] = [];
  const actions = request.right_type === 'ACCESS' ? ['DISCLOSE_COPY'] : ['CORRECT_RECORD', 'DISCLOSE_COPY'];
  const items = (await c.tx.query(`SELECT p.system_id, s.document->>'name' AS name, b.adapter FROM app.rights_request_plan_items p
    JOIN app.systems s ON s.tenant_id=p.tenant_id AND s.legal_entity_id=p.legal_entity_id AND s.environment_id=p.environment_id AND s.id=p.system_id
    LEFT JOIN app.connector_bindings b ON b.tenant_id=p.tenant_id AND b.legal_entity_id=p.legal_entity_id AND b.environment_id=p.environment_id AND b.system_id=p.system_id AND b.valid_to IS NULL
    WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.request_id=$4 AND p.action=ANY($5::text[]) ORDER BY p.system_id`, [...scope(c), requestId, actions])).rows;
  // Only an active Data Principal record linked to the request's principal is searched; a merged or ambiguous one is not guessed at.
  const subjects = (await c.tx.query(`SELECT id FROM app.data_principals WHERE ${predicate} AND principal_id=$4 AND status='ACTIVE'`, [...scope(c), request.principal_id])).rows.map(r => r.id as string);
  if (subjects.length > 1) refuse(409, 'principal_id', 'more_than_one_active_data_principal');
  for (const item of items) {
    const refs = subjects.length ? (await c.tx.query(`SELECT target_reference FROM app.data_principal_references WHERE ${predicate} AND subject_id=$4 AND system_id=$5 ORDER BY recorded_at LIMIT ${MAX_REFERENCES_PER_SYSTEM + 1}`,
      [...scope(c), subjects[0], item.system_id])).rows.map(r => r.target_reference as string) : [];
    if (refs.length > MAX_REFERENCES_PER_SYSTEM) refuse(409, 'references', 'too_many_references_in_one_system');
    const adapter = adapterFor(item.adapter);
    if (!refs.length) { sections.push({ section_id: `system:${item.system_id}:none`, source: 'SYSTEM', system_id: item.system_id, title: item.name, read_state: 'NOT_FOUND', read_at: readAt, read_by: 'no linked reference', record_state: null, fields: {} }); continue; }
    for (const [n, ref] of refs.entries()) {
      const read = adapter && env.targets ? await adapter.retrieve(env.targets, c.actor, item.system_id, ref).catch(() => ({ result: 'UNAVAILABLE' as const, fields: null, state: null, read_by: adapter.name })) : adapter ? { result: 'UNAVAILABLE' as const, fields: null, state: null, read_by: 'target pools not configured in this runtime' } : { result: 'NOT_SUPPORTED' as const, fields: null, state: null, read_by: 'no connector binding' };
      sections.push({ section_id: `system:${item.system_id}:${n + 1}`, source: 'SYSTEM', system_id: item.system_id, title: refs.length > 1 ? `${item.name} (record ${n + 1})` : item.name,
        read_state: read.result, read_at: readAt, read_by: read.read_by, record_state: read.state, fields: Object.fromEntries(Object.entries(read.fields ?? {}).slice(0, 200).map(([k, v]) => [k.slice(0, 120), v.slice(0, 4000)])) });
    }
  }
  if (subjects.length) {
    const consent = (await c.tx.query(`SELECT r.id, r.current_status, r.channel, r.updated_at, p.name AS purpose, v.version FROM app.consent_records r
      JOIN app.registry_purpose_versions v ON v.tenant_id=r.tenant_id AND v.legal_entity_id=r.legal_entity_id AND v.environment_id=r.environment_id AND v.id=r.purpose_version_id
      JOIN app.registry_purposes p ON p.tenant_id=v.tenant_id AND p.legal_entity_id=v.legal_entity_id AND p.environment_id=v.environment_id AND p.id=v.purpose_id
      WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.subject_id=$4 ORDER BY r.recorded_at LIMIT 100`, [...scope(c), subjects[0]])).rows;
    if (consent.length) sections.push({ section_id: 'orvia:consent', source: 'ORVIA_CONSENT', system_id: null, title: 'Consent records held by this organisation', read_state: 'HELD_BY_ORVIA', read_at: readAt, read_by: 'ORVIA records',
      record_state: null, fields: Object.fromEntries(consent.map((r, i) => [`consent_${i + 1}`, `${r.purpose} (version ${r.version}): ${r.current_status.toLowerCase()} via ${r.channel ?? 'unrecorded channel'}, last changed ${iso(r.updated_at)}`])) });
  }
  sections.push({ section_id: 'orvia:request', source: 'ORVIA_REQUEST', system_id: null, title: 'This request', read_state: 'HELD_BY_ORVIA', read_at: readAt, read_by: 'ORVIA records', record_state: null,
    fields: { request_id: request.id, right: request.right_type, received_at: iso(request.received_at)!, state: request.state } });
  const parsed = sections.map(s => X.PackageSection.parse(s));
  const version = Number((await c.tx.query(`SELECT coalesce(max(version),0)+1 v FROM app.rights_response_packages WHERE ${predicate} AND request_id=$4`, [...scope(c), requestId])).rows[0].v);
  const row = (await c.tx.query(`INSERT INTO app.rights_response_packages(tenant_id,legal_entity_id,environment_id,id,request_id,principal_id,version,sections,suggestions,prepared_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [...scope(c), randomUUID(), requestId, request.principal_id, version, JSON.stringify(parsed), JSON.stringify(suggest(parsed)), c.actor.actor_id])).rows[0];
  await audit(c, 'rights_response.prepare', row.id);
  return view(row);
}

export async function reviewPackage(c: Context, id: string, input: unknown) {
  const value = X.ResponsePackageReview.parse(input);
  const pkg = await packageRow(c, id, true);
  if (pkg.state !== 'DRAFT') refuse(409, 'state', 'only_a_draft_is_reviewed');
  if (pkg.prepared_by === c.actor.actor_id) refuse(409, 'reviewed_by', 'preparer_cannot_review');
  const sections = pkg.sections as Section[];
  const fieldKey = (r: { section_id: string; field: string }) => `${r.section_id}\u0000${r.field}`;
  const known = new Set(sections.flatMap(s => Object.keys(s.fields).map(f => fieldKey({ section_id: s.section_id, field: f }))));
  for (const r of [...value.redactions, ...value.kept]) if (!known.has(fieldKey(r))) refuse(400, 'redactions', 'field_not_in_package');
  const redacted = new Set(value.redactions.map(fieldKey)); const kept = new Set(value.kept.map(fieldKey));
  if ([...redacted].some(k => kept.has(k))) refuse(400, 'kept', 'field_both_redacted_and_kept');
  for (const sgn of pkg.suggestions as { section_id: string; field: string }[]) if (!redacted.has(fieldKey(sgn)) && !kept.has(fieldKey(sgn))) refuse(409, 'suggestions', 'suggestion_not_decided');
  const unreadable = sections.some(s => ['UNAVAILABLE', 'NOT_SUPPORTED'].includes(s.read_state));
  if (unreadable && !value.unreadable_acknowledged) refuse(409, 'unreadable_acknowledged', 'unreadable_sources_not_acknowledged');
  // Redaction removes the value wherever it appears, not only in the field it was marked on.
  const removed = value.redactions.map(r => sections.find(s => s.section_id === r.section_id)!.fields[r.field]!).filter(v => v.trim().length >= 3);
  const scrub = (text: string) => removed.reduce((t, v) => t.split(v).join('[Redacted]'), text);
  const content = sections.map(s => ({
    title: s.title, read_state: s.read_state,
    fields: Object.fromEntries(Object.entries(s.fields).map(([f, v]) => {
      const mark = value.redactions.find(r => r.section_id === s.section_id && r.field === f);
      return [f, mark ? `[Redacted: ${REASON_LABEL[mark.reason]}]` : scrub(v)];
    })),
  }));
  const serialised = JSON.stringify(content);
  if (removed.some(v => serialised.includes(v))) refuse(409, 'redactions', 'redaction_leak_detected');
  const digest = sha(canonical(content));
  const row = (await c.tx.query(`UPDATE app.rights_response_packages SET state='REVIEWED', redactions=$5, kept=$6, released_content=$7, content_digest=$8, unreadable_acknowledged=$9, reviewed_by=$10, reviewed_at=clock_timestamp()
    WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, JSON.stringify(value.redactions), JSON.stringify(value.kept), serialised, digest, value.unreadable_acknowledged, c.actor.actor_id])).rows[0];
  await audit(c, 'rights_response.review', id);
  return view(row);
}

export async function releasePackage(c: Context, id: string, input: unknown) {
  const value = X.ResponsePackageRelease.parse(input);
  const pkg = await packageRow(c, id, true);
  if (pkg.state !== 'REVIEWED') refuse(409, 'state', 'only_a_reviewed_package_is_released');
  const expires = Date.parse(value.expires_at);
  if (expires <= Date.now()) refuse(400, 'expires_at', 'already_expired');
  if (expires > Date.now() + MAX_DELIVERY_DAYS * 86_400_000) refuse(400, 'expires_at', 'at_most_thirty_days');
  const request = await requestRow(c, pkg.request_id);
  // The first release also settles the request's V1 response dimension; a replacement after revocation does not repeat it.
  if (request.response !== 'RELEASED') await releaseResponse(c, pkg.request_id, { third_party_redaction_reviewed: true, delivery_reference: `ORVIA portal response package version ${pkg.version} (${pkg.id})`, expires_at: value.expires_at });
  const row = (await c.tx.query(`UPDATE app.rights_response_packages SET state='RELEASED', released_by=$5, released_at=clock_timestamp(), delivery_expires_at=$6, max_downloads=$7 WHERE ${predicate} AND id=$4 RETURNING *`,
    [...scope(c), id, c.actor.actor_id, value.expires_at, value.max_downloads])).rows[0];
  await audit(c, 'rights_response.release', id);
  return view(row);
}
export async function revokePackage(c: Context, id: string, input: unknown) {
  const value = X.ResponsePackageRevoke.parse(input);
  const pkg = await packageRow(c, id, true);
  if (pkg.state !== 'RELEASED' || pkg.revoked_at) refuse(409, 'state', 'only_a_released_package_is_revoked');
  const row = (await c.tx.query(`UPDATE app.rights_response_packages SET revoked_by=$5, revoked_at=clock_timestamp(), revocation_reason=$6 WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id, value.reason])).rows[0];
  await audit(c, 'rights_response.revoke', id);
  return view(row);
}
export async function withdrawPackage(c: Context, id: string) {
  const pkg = await packageRow(c, id, true);
  if (!['DRAFT', 'REVIEWED'].includes(pkg.state)) refuse(409, 'state', 'only_an_unreleased_package_is_withdrawn');
  const row = (await c.tx.query(`UPDATE app.rights_response_packages SET state='WITHDRAWN' WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id])).rows[0];
  await audit(c, 'rights_response.withdraw', id);
  return view(row);
}
export async function packageView(c: Context, id: string) { return view(await packageRow(c, id)); }
export async function packageList(c: Context, requestId: string, page: Page) {
  await requestRow(c, requestId);
  const rows = (await c.tx.query(`SELECT * FROM app.rights_response_packages WHERE ${predicate} AND request_id=$4 AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`, [...scope(c), requestId, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(view), next_cursor: paged.next_cursor };
}

/** The authenticated principal collects their own copy. Anyone else's request is simply not found. */
export async function collectOwnPackage(c: Context, requestId: string) {
  const pkg = (await c.tx.query(`SELECT * FROM app.rights_response_packages WHERE ${predicate} AND request_id=$4 AND principal_id=$5 AND state='RELEASED' ORDER BY version DESC LIMIT 1 FOR UPDATE`,
    [...scope(c), requestId, c.actor.principal_id])).rows[0];
  if (!pkg) refuse(404, 'id', 'not_found');
  const state = pkg.purged_at ? 'EXPIRED' : deliveryState(pkg);
  if (state === 'REVOKED') refuse(409, 'delivery', 'delivery_revoked');
  if (state === 'EXPIRED') refuse(409, 'delivery', 'delivery_expired');
  if (state === 'EXHAUSTED') refuse(409, 'delivery', 'download_allowance_spent');
  const row = (await c.tx.query(`UPDATE app.rights_response_packages SET downloads=downloads+1 WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), pkg.id])).rows[0];
  await c.tx.query(`INSERT INTO app.rights_response_downloads(tenant_id,legal_entity_id,environment_id,id,package_id,principal_id,content_digest) VALUES($1,$2,$3,$4,$5,$6,$7)`, [...scope(c), randomUUID(), pkg.id, c.actor.principal_id, pkg.content_digest]);
  await audit(c, 'rights_response.collect', pkg.id);
  return X.OwnResponsePackage.parse({
    request_id: requestId, version: row.version, released_at: iso(row.released_at), expires_at: iso(row.delivery_expires_at), downloads_remaining: row.max_downloads - row.downloads, content_digest: row.content_digest,
    content: row.released_content, limits: [
      'This copy contains what the listed systems returned when it was prepared, and what this organisation holds about you in ORVIA.',
      'A section marked unavailable or not supported could not be read automatically; the organisation acknowledged this before releasing the copy.',
      'Information about other people has been withheld where marked.',
    ],
  });
}

/** Runner: removes package content thirty days after delivery ended. The digest and receipts remain. */
export async function purgeEndedPackages(c: Context) {
  const r = await c.tx.query(`UPDATE app.rights_response_packages SET sections='[]'::jsonb, released_content=NULL, purged_at=clock_timestamp()
    WHERE ${predicate} AND purged_at IS NULL AND (
      (state='WITHDRAWN' AND prepared_at<clock_timestamp()-make_interval(days=>${PURGE_AFTER_DAYS}))
      OR (state='RELEASED' AND coalesce(revoked_at, delivery_expires_at)<clock_timestamp()-make_interval(days=>${PURGE_AFTER_DAYS})))`, scope(c));
  return r.rowCount ?? 0;
}
