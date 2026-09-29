import { randomBytes, randomInt, randomUUID, createHash } from 'node:crypto';
import type pg from 'pg';
import * as V from '../../../shared/contracts/src/vendor-audit.ts';
import { verifyPackageFile, sha256, assertAttestationWording, type AuditPackageManifest } from '../../../shared/contracts/src/audit-exchange.ts';
import { channelKey } from '../../../shared/contracts/src/audit-channel.ts';
import { requirements as baselineRequirements } from '../../../scripts/regulatory/dpdp-baseline.ts';
import { hashPassword } from '../../auth/src/bootstrap-password.ts';
import { AccessError } from '../../authorization/src/index.ts';
import { issueLicence, type VendorKey } from '../licensing/issue.ts';
import { seal, open, newDataKey } from './vault.ts';
import { scanFile } from './scanner.ts';
import { signAuditDocument, type AuditKey } from './signing.ts';
import { renderPdf, type PdfLine } from './pdf.ts';

/**
 * Vendor-side DPDPA audit service (revision 1.5 addendum). Every function runs
 * inside a vendor business transaction as the unprivileged vendor role with the
 * actor bound, so row-level security and the definer functions of vendor
 * migrations 0003-0004 decide what is visible and writable; the checks here
 * add the workflow rules (who drafts, who approves, what may be opened).
 */
export type Actor = { actor_id: string; actor_domain: 'VENDOR_STAFF' | 'CLIENT_ACCOUNT' | 'CLIENT_INSTALLATION'; role: string; organisation_id: string | null };
export type Ctx = { tx: pg.PoolClient; actor: Actor; requestId: string };
export type Keys = { vault: Buffer; audit: () => AuditKey; licence: () => VendorKey };
const iso = (v: unknown) => v === null || v === undefined ? null : (v as Date).toISOString();
const day = (v: unknown) => v === null || v === undefined ? null : typeof v === 'string' ? v.slice(0, 10) : new Date((v as Date).getTime() - (v as Date).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const refuse = (status: number, field: string, code: string): never => { throw new AccessError(status, status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR', [{ field, code }]); };
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) {
    const e = error as { code?: string; message?: string; hint?: string; constraint?: string };
    if (e.code === '42501') throw new AccessError(403, 'FORBIDDEN');
    if (e.code === 'P0002') refuse(404, e.hint ?? 'id', 'not_found');
    if (e.code === 'P0001') refuse(409, e.hint ?? 'request', e.message ?? 'refused');
    if (e.code === '23505') refuse(409, e.constraint ?? 'request', 'already_exists');
    if (e.code === '23514') refuse(409, e.constraint ?? 'request', 'refused');
    throw error;
  }
}
export async function audit(c: Ctx, operation: string, resource: string | null) {
  await c.tx.query('INSERT INTO vendor.audit_events (id, actor_id, actor_domain, operation, resource_id, request_id) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), c.actor.actor_id, c.actor.actor_domain, operation, resource, c.requestId]);
}
const baseline = new Map(baselineRequirements.map(r => [r.requirement_id, r]));

// Engagement codes: shown once to vendor staff to hand to the client; only the digest is kept on either side.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newEngagementCode = () => Array.from({ length: 4 }, () => Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')).join('-');
export const engagementCodeDigest = (code: string) => createHash('sha256').update('orvia-engagement:' + code.toUpperCase().replace(/[^A-Z0-9]/g, ''), 'utf8').digest('hex');

// Vendor team
export async function team(c: Ctx) {
  return guarded(async () => V.VendorTeam.parse({ members: (await c.tx.query('SELECT * FROM vendor.team()')).rows.map(r => ({ ...r, created_at: iso(r.created_at) })) }));
}
export async function createMember(c: Ctx, input: unknown) {
  const v = V.VendorMemberCreate.parse(input); const id = randomUUID(); const password = randomBytes(24).toString('base64url');
  const hash = await hashPassword(password);
  return guarded(async () => {
    await c.tx.query('SELECT vendor.create_member($1,$2,$3,$4,$5,$6)', [c.actor.actor_id, id, v.name, v.email, v.role, hash]);
    await audit(c, 'vendor.team.member-created', id);
    const member = (await team(c)).members.find(m => m.user_id === id)!;
    return V.VendorMemberCreated.parse({ member, one_time_password: password });
  });
}
export async function setMemberActive(c: Ctx, id: string, active: boolean) {
  return guarded(async () => { await c.tx.query('SELECT vendor.set_member_active($1,$2,$3)', [c.actor.actor_id, id, active]); await audit(c, active ? 'vendor.team.member-reactivated' : 'vendor.team.member-deactivated', id);
    return (await team(c)).members.find(m => m.user_id === id)!; });
}
export async function deleteMember(c: Ctx, id: string, input: unknown) {
  V.DeleteConfirm.parse(input);
  return guarded(async () => { await c.tx.query('SELECT vendor.delete_member($1,$2)', [c.actor.actor_id, id]); await audit(c, 'vendor.team.member-deleted', id);
    return (await team(c)).members.find(m => m.user_id === id)!; });
}

// Organisations (Rev 1.4 §96: business details, designated contacts, licences; nothing operational)
export async function organisationList(c: Ctx) {
  return V.OrganisationList.parse({ items: (await c.tx.query('SELECT id, name, registered_address, licence_state, created_at FROM vendor.organisations ORDER BY name')).rows.map(r => ({ ...r, created_at: iso(r.created_at) })) });
}
export async function organisation(c: Ctx, id: string) {
  const o = (await c.tx.query('SELECT id, name, registered_address, licence_state, created_at FROM vendor.organisations WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  const contacts = (await c.tx.query('SELECT id, name, email, designation FROM vendor.organisation_contacts WHERE organisation_id=$1 ORDER BY created_at, id', [id])).rows;
  const accounts = (await guarded(() => c.tx.query('SELECT * FROM vendor.client_accounts($1)', [id]))).rows.map(r => ({ ...r, created_at: iso(r.created_at) }));
  const licences = (await c.tx.query('SELECT licence_id, installation_id, plan_option, member_seats, valid_from, valid_to, issued_at FROM vendor.licence_issues WHERE organisation_id=$1 ORDER BY issued_at DESC LIMIT 200', [id]))
    .rows.map(r => ({ ...r, valid_from: iso(r.valid_from), valid_to: iso(r.valid_to), issued_at: iso(r.issued_at) }));
  return V.Organisation.parse({ ...o, created_at: iso(o.created_at), contacts, accounts, licences });
}
export async function createOrganisation(c: Ctx, input: unknown) {
  const v = V.OrganisationCreate.parse(input); const id = randomUUID();
  return guarded(async () => { await c.tx.query('INSERT INTO vendor.organisations (id, name, registered_address, created_by) VALUES ($1,$2,$3,$4)', [id, v.name, v.registered_address, c.actor.actor_id]);
    await audit(c, 'vendor.organisation.created', id); return organisation(c, id); });
}
export async function addContact(c: Ctx, id: string, input: unknown) {
  const v = V.OrganisationContactCreate.parse(input);
  return guarded(async () => { const contact = randomUUID(); await c.tx.query('INSERT INTO vendor.organisation_contacts (id, organisation_id, name, email, designation) VALUES ($1,$2,$3,$4,$5)', [contact, id, v.name, v.email.toLowerCase(), v.designation]);
    await audit(c, 'vendor.organisation.contact-added', contact); return organisation(c, id); });
}
export async function createClientAccount(c: Ctx, id: string, input: unknown) {
  const v = V.ClientAccountCreate.parse(input); const user = randomUUID(); const password = randomBytes(24).toString('base64url');
  const hash = await hashPassword(password);
  return guarded(async () => { await c.tx.query('SELECT vendor.create_client_account($1,$2,$3,$4,$5,$6)', [c.actor.actor_id, user, id, v.name, v.email, hash]);
    await audit(c, 'vendor.organisation.account-created', user); return V.ClientAccountCreated.parse({ user_id: user, one_time_password: password }); });
}
export async function issueOrganisationLicence(c: Ctx, input: unknown, keys: Keys) {
  const v = V.LicenceIssueRequest.parse(input);
  if (!(await c.tx.query('SELECT 1 FROM vendor.organisations WHERE id=$1', [v.organisation_id])).rowCount) refuse(404, 'organisation_id', 'not_found');
  let issued: ReturnType<typeof issueLicence>;
  try { issued = issueLicence({ installation_id: v.installation_id, option: v.option, entitlements: v.entitlements, environments: v.environments, valid_from: v.valid_from, valid_to: v.valid_to }, keys.licence()); }
  catch (error) { refuse(400, 'option', error instanceof Error && /option/i.test(error.message) ? 'unknown_option' : 'licence_invalid'); throw error; }
  return guarded(async () => {
    await c.tx.query(`INSERT INTO vendor.licence_issues (id, organisation_id, installation_id, licence_id, plan_option, member_seats, valid_from, valid_to, licence, issued_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [randomUUID(), v.organisation_id, v.installation_id, issued.licence.claims.licence_id, issued.plan.option, issued.plan.member_seats, v.valid_from, v.valid_to, JSON.stringify(issued.licence), c.actor.actor_id]);
    await c.tx.query("UPDATE vendor.organisations SET licence_state='ACTIVE' WHERE id=$1", [v.organisation_id]);
    await audit(c, 'vendor.licence.issued', issued.licence.claims.licence_id);
    return V.LicenceIssued.parse(issued);
  });
}

// Engagements
async function engagementRow(c: Ctx, id: string) {
  return (await c.tx.query('SELECT e.*, o.name AS organisation_name FROM vendor.engagements e JOIN vendor.organisations o ON o.id = e.organisation_id WHERE e.id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
}
const onTeam = async (c: Ctx, id: string, role?: string) => (await c.tx.query('SELECT vendor.on_team($1,$2) AS ok', [id, role ?? null])).rows[0].ok === true;
async function requireTeam(c: Ctx, id: string, role?: string) { await engagementRow(c, id); if (!(await onTeam(c, id, role))) throw new AccessError(403, 'FORBIDDEN'); }
const summary = async (c: Ctx, r: pg.QueryResultRow) => ({ id: r.id, organisation_id: r.organisation_id, organisation_name: r.organisation_name, reference: r.reference, state: r.state,
  period_from: day(r.period_from), period_to: day(r.period_to), scope_requirement_ids: r.scope_requirement_ids, created_at: iso(r.created_at), on_team: await onTeam(c, r.id) });
export async function engagementList(c: Ctx) {
  const rows = (await c.tx.query('SELECT e.*, o.name AS organisation_name FROM vendor.engagements e JOIN vendor.organisations o ON o.id = e.organisation_id ORDER BY e.created_at DESC LIMIT 1000')).rows;
  return V.EngagementList.parse({ items: await Promise.all(rows.map(r => summary(c, r))) });
}
export async function engagement(c: Ctx, id: string) {
  const r = await engagementRow(c, id);
  const team = (await guarded(() => c.tx.query('SELECT * FROM vendor.engagement_members($1)', [id]))).rows;
  return V.Engagement.parse({ ...(await summary(c, r)), team,
    processing_agreement: { recorded: r.processing_agreement_reference !== null, reference: r.processing_agreement_reference, recorded_at: iso(r.processing_agreement_recorded_at) },
    independence: { declared: r.independence_statement !== null, statement: r.independence_statement, conflict_check: r.conflict_check, conflict_note: r.conflict_note, declared_at: iso(r.independence_declared_at) },
    empanelment_reference: r.empanelment_reference, retention_days: r.retention_days, closed_at: iso(r.closed_at), purged_at: iso(r.purged_at) });
}
export async function createEngagement(c: Ctx, input: unknown, keys?: Keys) {
  const v = V.EngagementCreate.parse(input);
  if (v.period_to < v.period_from) refuse(400, 'period_to', 'before_period_from');
  const unknown = v.scope_requirement_ids.filter(r => !baseline.has(r));
  if (unknown.length) refuse(400, 'scope_requirement_ids', 'unknown_requirement');
  const id = randomUUID(); const code = newEngagementCode();
  return guarded(async () => {
    await c.tx.query(`INSERT INTO vendor.engagements (id, organisation_id, reference, code_digest, scope_requirement_ids, period_from, period_to, retention_days, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, v.organisation_id, v.reference, engagementCodeDigest(code), [...new Set(v.scope_requirement_ids)], v.period_from, v.period_to, v.retention_days, c.actor.actor_id]);
    // The audit channel key (revision 1.6) is derived from the code and kept only sealed under the vault key.
    if (keys) { const sealed = seal(keys.vault, channelKey(code), `channel-key:${id}`);
      await c.tx.query('INSERT INTO vendor.channels (engagement_id, key_ciphertext, key_nonce, key_tag) VALUES ($1,$2,$3,$4)', [id, sealed.ciphertext, sealed.nonce, sealed.tag]); }
    await audit(c, 'vendor.engagement.created', id);
    return V.EngagementCreated.parse({ engagement_id: id, engagement_code: code, note: 'Shown once. Give it to the client organisation privately; ORVIA keeps only its digest.' });
  });
}
export async function addTeamMember(c: Ctx, id: string, input: unknown) {
  const v = V.EngagementTeamAdd.parse(input); await engagementRow(c, id);
  const member = (await guarded(() => c.tx.query('SELECT * FROM vendor.team() WHERE user_id=$1', [v.user_id]))).rows[0] ?? refuse(404, 'user_id', 'not_found');
  if (!member.active) refuse(409, 'user_id', 'login_inactive');
  const allowed: Record<string, string[]> = { LEAD: ['LEAD_AUDITOR'], REVIEWER: ['AUDIT_REVIEWER'], AUDITOR: ['LEAD_AUDITOR', 'AUDITOR', 'AUDIT_REVIEWER'] };
  if (!allowed[v.engagement_role]!.includes(member.role)) refuse(409, 'engagement_role', 'role_does_not_fit');
  const lead = (await c.tx.query("SELECT user_id FROM vendor.engagement_team WHERE engagement_id=$1 AND engagement_role='LEAD'", [id])).rows[0];
  const reviewer = (await c.tx.query("SELECT user_id FROM vendor.engagement_team WHERE engagement_id=$1 AND engagement_role='REVIEWER'", [id])).rows;
  if (v.engagement_role === 'REVIEWER' && lead?.user_id === v.user_id) refuse(409, 'user_id', 'reviewer_must_differ_from_lead');
  if (v.engagement_role === 'LEAD' && reviewer.some(r => r.user_id === v.user_id)) refuse(409, 'user_id', 'reviewer_must_differ_from_lead');
  return guarded(async () => { await c.tx.query('INSERT INTO vendor.engagement_team (engagement_id, user_id, engagement_role, added_by) VALUES ($1,$2,$3,$4)', [id, v.user_id, v.engagement_role, c.actor.actor_id]);
    await audit(c, 'vendor.engagement.team-added', id); return engagement(c, id); });
}
export async function declareIndependence(c: Ctx, id: string, input: unknown) {
  const v = V.IndependenceDeclare.parse(input); await requireTeam(c, id, 'LEAD');
  if (v.conflict_check === 'CONFLICT_MITIGATED' && !v.conflict_note) refuse(400, 'conflict_note', 'required_when_mitigated');
  assertWording(v.statement);
  return guarded(async () => {
    const r = await c.tx.query(`UPDATE vendor.engagements SET independence_statement=$2, independence_declared_by=$3, independence_declared_at=clock_timestamp(), conflict_check=$4, conflict_note=$5, empanelment_reference=$6
      WHERE id=$1 AND independence_statement IS NULL AND state <> 'CLOSED'`, [id, v.statement, c.actor.actor_id, v.conflict_check, v.conflict_note, v.empanelment_reference]);
    if (!r.rowCount) refuse(409, 'engagement', 'independence_already_declared');
    await audit(c, 'vendor.engagement.independence-declared', id); return engagement(c, id);
  });
}
export async function recordProcessingAgreement(c: Ctx, id: string, input: unknown) {
  const v = V.ProcessingAgreementRecord.parse(input); await engagementRow(c, id);
  return guarded(async () => { await c.tx.query('SELECT vendor.record_processing_agreement($1,$2)', [id, v.reference]); await audit(c, 'vendor.engagement.processing-agreement-recorded', id); return engagement(c, id); });
}
export async function closeEngagement(c: Ctx, id: string) {
  const r = await engagementRow(c, id);
  if (r.state === 'CLOSED') refuse(409, 'engagement', 'already_closed');
  return guarded(async () => { await c.tx.query("UPDATE vendor.engagements SET state='CLOSED', closed_at=clock_timestamp() WHERE id=$1", [id]); await audit(c, 'vendor.engagement.closed', id); return engagement(c, id); });
}

// Client upload: verify everything before storing anything; encrypt at rest; record refusals without content.
export const MAX_PACKAGE_BYTES = 64 * 1024 * 1024;
export async function receivePackage(c: Ctx, engagementCode: string, bytes: Buffer, keys: Keys, now = new Date()) {
  if (c.actor.actor_domain !== 'CLIENT_ACCOUNT') throw new AccessError(403, 'FORBIDDEN');
  return receivePackageForDigest(c, engagementCodeDigest(engagementCode), bytes, keys, now);
}
/** The same verification for a file a client user uploads and for a package the client installation sends over the audit channel (revision 1.6). */
export async function receivePackageForDigest(c: Ctx, digest: string, bytes: Buffer, keys: Keys, now = new Date()) {
  if (c.actor.actor_domain !== 'CLIENT_ACCOUNT' && c.actor.actor_domain !== 'CLIENT_INSTALLATION') throw new AccessError(403, 'FORBIDDEN');
  if (!(await c.tx.query('SELECT vendor.record_upload_attempt() AS ok')).rows[0].ok) throw new AccessError(429, 'RATE_LIMITED');
  const fileSha = sha256(bytes);
  const found = (await c.tx.query('SELECT * FROM vendor.engagement_for_code($1)', [digest])).rows[0];
  const refused = async (reasons: string[]) => {
    await c.tx.query('SELECT vendor.refuse_package($1,$2,$3)', [found?.id ?? null, fileSha, reasons]);
    await audit(c, 'audit.package.refused', found?.id ?? null);
    return V.UploadResult.parse({ outcome: 'REFUSED', package_id: null, reasons, manifest_fingerprint: null });
  };
  if (!found) return refused(['ENGAGEMENT_CODE_NOT_RECOGNISED']);
  if (found.state === 'CLOSED') return refused(['ENGAGEMENT_CLOSED']);
  if (bytes.length > MAX_PACKAGE_BYTES) return refused(['PACKAGE_TOO_LARGE']);
  const verified = verifyPackageFile(bytes, now);
  if (!verified.ok) return refused(verified.problems);
  const m: AuditPackageManifest = verified.manifest;
  const reasons: string[] = [];
  if (m.engagement_code_digest !== digest) reasons.push('WRONG_ENGAGEMENT');
  const scope = new Set<string>(found.scope);
  if (m.scope_requirement_ids.some(r => !scope.has(r))) reasons.push('SCOPE_OUTSIDE_ENGAGEMENT');
  if ((await c.tx.query('SELECT 1 FROM vendor.packages WHERE client_package_id=$1 AND uploaded_by=$2', [m.package_id, c.actor.actor_id])).rowCount) reasons.push('PACKAGE_ALREADY_RECEIVED');
  let engine = '';
  for (const item of m.items) {
    const verdict = scanFile(verified.contents.get(item.item_id)!, item.media_type); engine = verdict.engine;
    for (const r of verdict.reasons) reasons.push(`MALWARE_SCREEN_${r}`);
  }
  if (reasons.length) return refused([...new Set(reasons)].slice(0, 20));
  const dataKey = newDataKey(); const packageId = randomUUID();
  const wrapped = seal(keys.vault, dataKey, `package-key:${packageId}`);
  const items = m.items.map(item => { const s = seal(dataKey, verified.contents.get(item.item_id)!, `item:${packageId}:${item.item_id}:${item.sha256}`);
    return { item_id: item.item_id, requirement_id: item.requirement_id, kind: item.kind, title: item.title, file_name: item.file_name, media_type: item.media_type, size_bytes: item.size_bytes, sha256: item.sha256,
      contains_personal_data: item.contains_personal_data === 'YES', ciphertext: s.ciphertext.toString('base64'), nonce: s.nonce.toString('base64'), tag: s.tag.toString('base64') }; });
  const personal = m.items.some(i => i.contains_personal_data === 'YES');
  const state = await guarded(async () => (await c.tx.query('SELECT vendor.store_package($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS state',
    [packageId, found.id, m.package_id, fileSha, JSON.stringify(m), verifiedFingerprint(bytes), m.expires_at, personal, engine, wrapped.ciphertext, wrapped.nonce, wrapped.tag, JSON.stringify(items)])).rows[0].state);
  return V.UploadResult.parse({ outcome: state, package_id: packageId, reasons: state === 'QUARANTINED' ? ['PERSONAL_DATA_WITHOUT_PROCESSING_AGREEMENT'] : [], manifest_fingerprint: verifiedFingerprint(bytes) });
}
const verifiedFingerprint = (bytes: Buffer) => (JSON.parse(bytes.toString('utf8')) as { manifest_fingerprint: string }).manifest_fingerprint;
export async function ownUploads(c: Ctx) {
  return V.OwnUploads.parse({ items: (await c.tx.query('SELECT * FROM vendor.own_uploads()')).rows.map(r => ({ ...r, uploaded_at: iso(r.uploaded_at) })) });
}

// Evidence inbox (engagement team only)
const packageSummary = (r: pg.QueryResultRow) => ({ id: r.id, engagement_id: r.engagement_id, client_package_id: r.client_package_id, uploaded_at: iso(r.uploaded_at), file_sha256: r.file_sha256,
  manifest_fingerprint: r.manifest_fingerprint, expires_at: iso(r.expires_at), contains_personal_data: r.contains_personal_data, state: r.state, quarantine_reason: r.quarantine_reason, scan_engine: r.scan_engine });
export async function inbox(c: Ctx, id: string) {
  await requireTeam(c, id);
  const packages = (await c.tx.query('SELECT p.*, (SELECT count(*)::int FROM vendor.package_items i WHERE i.package_id = p.id) AS item_count FROM vendor.packages p WHERE engagement_id=$1 ORDER BY uploaded_at DESC', [id])).rows;
  const refusals = (await c.tx.query('SELECT id, file_sha256, reasons, refused_at FROM vendor.package_refusals WHERE engagement_id=$1 ORDER BY refused_at DESC LIMIT 1000', [id])).rows;
  return V.EngagementInbox.parse({ packages: packages.map(r => ({ ...packageSummary(r), item_count: r.item_count })), refusals: refusals.map(r => ({ ...r, refused_at: iso(r.refused_at) })) });
}
async function packageRow(c: Ctx, id: string) {
  const p = (await c.tx.query('SELECT * FROM vendor.packages WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  if (!(await onTeam(c, p.engagement_id))) throw new AccessError(403, 'FORBIDDEN');
  return p;
}
export async function packageDetail(c: Ctx, id: string) {
  const p = await packageRow(c, id);
  const items = (await c.tx.query('SELECT item_id, requirement_id, kind, title, file_name, media_type, size_bytes, sha256, contains_personal_data, ciphertext IS NOT NULL AS stored FROM vendor.package_items WHERE package_id=$1 ORDER BY requirement_id, item_id', [id])).rows;
  const reviews = (await c.tx.query('SELECT * FROM vendor.item_reviews WHERE package_id=$1 ORDER BY reviewed_at', [id])).rows;
  await c.tx.query("INSERT INTO vendor.evidence_access_log (id, engagement_id, package_id, item_id, actor_id, action) VALUES ($1,$2,$3,NULL,$4,'VIEW_MANIFEST')", [randomUUID(), p.engagement_id, id, c.actor.actor_id]);
  return V.InboxPackage.parse({ ...packageSummary(p), items: items.map(i => ({ item_id: i.item_id, requirement_id: i.requirement_id, kind: i.kind, title: i.title, file_name: i.file_name, media_type: i.media_type, size_bytes: i.size_bytes,
    sha256: i.sha256, contains_personal_data: i.contains_personal_data, content_available: i.stored && p.state === 'ACCEPTED',
    reviews: reviews.filter(r => r.item_id === i.item_id).map(r => ({ id: r.id, decision: r.decision, note: r.note, sampling: r.sampling, reviewer_id: r.reviewer_id, reviewed_at: iso(r.reviewed_at) })) })) });
}
export async function itemContent(c: Ctx, id: string, itemId: string, keys: Keys) {
  const p = await packageRow(c, id);
  if (p.state !== 'ACCEPTED') refuse(409, 'package', p.state === 'QUARANTINED' ? 'quarantined_until_processing_agreement' : `package_${String(p.state).toLowerCase()}`);
  const i = (await c.tx.query('SELECT * FROM vendor.package_items WHERE package_id=$1 AND item_id=$2', [id, itemId])).rows[0] ?? refuse(404, 'item', 'not_found');
  if (!i.ciphertext) refuse(409, 'item', 'content_purged');
  const dataKey = open(keys.vault, { ciphertext: p.wrapped_key, nonce: p.key_nonce, tag: p.key_tag }, `package-key:${id}`);
  const content = open(dataKey, { ciphertext: i.ciphertext, nonce: i.nonce, tag: i.tag }, `item:${id}:${itemId}:${i.sha256}`);
  if (sha256(content) !== i.sha256) throw new Error('Stored evidence does not match its recorded hash');
  await c.tx.query("INSERT INTO vendor.evidence_access_log (id, engagement_id, package_id, item_id, actor_id, action) VALUES ($1,$2,$3,$4,$5,'DOWNLOAD_ITEM')", [randomUUID(), p.engagement_id, id, itemId, c.actor.actor_id]);
  return V.ItemContent.parse({ item_id: itemId, media_type: i.media_type, file_name: i.file_name, sha256: i.sha256, content_base64: content.toString('base64') });
}
export async function reviewItem(c: Ctx, id: string, input: unknown) {
  const v = V.ItemReviewRecord.parse(input); const p = await packageRow(c, id);
  if (p.state !== 'ACCEPTED') refuse(409, 'package', 'not_reviewable');
  if (!(await c.tx.query('SELECT 1 FROM vendor.package_items WHERE package_id=$1 AND item_id=$2', [id, v.item_id])).rowCount) refuse(404, 'item_id', 'not_found');
  return guarded(async () => { await c.tx.query('INSERT INTO vendor.item_reviews (id, package_id, item_id, engagement_id, decision, note, sampling, reviewer_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [randomUUID(), id, v.item_id, p.engagement_id, v.decision, v.note, v.sampling, c.actor.actor_id]); await audit(c, 'vendor.evidence.item-reviewed', id); return packageDetail(c, id); });
}
export async function accessLog(c: Ctx, id: string) {
  await engagementRow(c, id);
  return V.AccessLog.parse({ items: (await c.tx.query('SELECT id, package_id, item_id, actor_id, action, recorded_at FROM vendor.evidence_access_log WHERE engagement_id=$1 ORDER BY recorded_at DESC LIMIT 1000', [id])).rows.map(r => ({ ...r, recorded_at: iso(r.recorded_at) })) });
}

// Checklist and requirement results
export async function checklist(c: Ctx, id: string) {
  await requireTeam(c, id); const e = await engagementRow(c, id);
  const counts = (await c.tx.query(`SELECT i.requirement_id, count(*)::int AS received,
      count(*) FILTER (WHERE last.decision = 'ACCEPT')::int AS accepted, count(*) FILTER (WHERE last.decision = 'REJECT')::int AS rejected, count(*) FILTER (WHERE last.decision = 'REQUEST_MORE')::int AS more
    FROM vendor.package_items i JOIN vendor.packages p ON p.id = i.package_id AND p.state IN ('ACCEPTED','PURGED')
    LEFT JOIN LATERAL (SELECT decision FROM vendor.item_reviews r WHERE r.package_id = i.package_id AND r.item_id = i.item_id ORDER BY reviewed_at DESC LIMIT 1) last ON true
    WHERE p.engagement_id = $1 GROUP BY i.requirement_id`, [id])).rows;
  const results = (await c.tx.query('SELECT DISTINCT ON (requirement_id) requirement_id, result, rationale, recorded_at FROM vendor.requirement_results WHERE engagement_id=$1 ORDER BY requirement_id, recorded_at DESC', [id])).rows;
  // Evidence entries received under the client's mandate (revision 1.6), by requirement.
  const channel = (await c.tx.query(`SELECT e->>'requirement_id' AS requirement_id, count(*)::int AS n FROM vendor.channel_deliveries d, jsonb_array_elements(d.document->'entries') e
    WHERE d.engagement_id=$1 AND d.outcome='ACCEPTED' AND d.document IS NOT NULL GROUP BY 1`, [id])).rows;
  return V.Checklist.parse({ engagement_id: id, expectations_source: 'ORVIA DPDP baseline (scripts/regulatory/dpdp-baseline.ts); test-fixture regulatory content until the official package is signed',
    rows: (e.scope_requirement_ids as string[]).map(req => { const n = counts.find(x => x.requirement_id === req); const r = results.find(x => x.requirement_id === req);
      return { requirement_id: req, expected_evidence: [...(baseline.get(req)?.evidence_expectations ?? [])], received_items: n?.received ?? 0, channel_entries: channel.find(x => x.requirement_id === req)?.n ?? 0, accepted_items: n?.accepted ?? 0, rejected_items: n?.rejected ?? 0, more_requested: n?.more ?? 0,
        result: r?.result ?? null, rationale: r?.rationale ?? null, recorded_at: iso(r?.recorded_at) }; }) });
}
export async function recordResult(c: Ctx, id: string, input: unknown) {
  const v = V.RequirementResultRecord.parse(input); await requireTeam(c, id); const e = await engagementRow(c, id);
  if (!(e.scope_requirement_ids as string[]).includes(v.requirement_id)) refuse(400, 'requirement_id', 'outside_scope');
  if (e.state === 'CLOSED') refuse(409, 'engagement', 'closed');
  assertWording(v.rationale);
  return guarded(async () => { await c.tx.query('INSERT INTO vendor.requirement_results (id, engagement_id, requirement_id, result, rationale, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), id, v.requirement_id, v.result, v.rationale, c.actor.actor_id]);
    await audit(c, 'vendor.audit.result-recorded', id); return checklist(c, id); });
}

// Requests and findings
async function findingsView(c: Ctx, id: string) {
  const findings = (await c.tx.query('SELECT * FROM vendor.findings WHERE engagement_id=$1 ORDER BY created_at, id', [id])).rows;
  const events = (await c.tx.query('SELECT fe.* FROM vendor.finding_events fe JOIN vendor.findings f ON f.id = fe.finding_id WHERE f.engagement_id=$1 ORDER BY fe.recorded_at', [id])).rows;
  const requests = (await c.tx.query('SELECT id, requirement_id, description, due_date, created_at FROM vendor.audit_requests WHERE engagement_id=$1 ORDER BY created_at, id', [id])).rows;
  return V.FindingList.parse({ items: findings.map(f => ({ id: f.id, engagement_id: f.engagement_id, requirement_id: f.requirement_id, provision_ids: f.provision_ids, severity: f.severity, title: f.title, observation: f.observation,
    recommendation: f.recommendation, due_date: day(f.due_date), status: f.status, created_at: iso(f.created_at),
    events: events.filter(e => e.finding_id === f.id).map(e => ({ id: e.id, event: e.event, note: e.note, recorded_at: iso(e.recorded_at) })) })),
    requests: requests.map(r => ({ ...r, due_date: day(r.due_date), created_at: iso(r.created_at) })) });
}
export async function findings(c: Ctx, id: string) { await requireTeam(c, id); return findingsView(c, id); }
export async function createRequest(c: Ctx, id: string, input: unknown) {
  const v = V.AuditRequestCreate.parse(input); await requireTeam(c, id); const e = await engagementRow(c, id);
  if (!(e.scope_requirement_ids as string[]).includes(v.requirement_id)) refuse(400, 'requirement_id', 'outside_scope');
  return guarded(async () => { await c.tx.query('INSERT INTO vendor.audit_requests (id, engagement_id, requirement_id, description, due_date, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), id, v.requirement_id, v.description, v.due_date, c.actor.actor_id]);
    await audit(c, 'vendor.audit.request-created', id); return findingsView(c, id); });
}
export async function createFinding(c: Ctx, id: string, input: unknown) {
  const v = V.FindingCreate.parse(input); await requireTeam(c, id); const e = await engagementRow(c, id);
  if (!(e.scope_requirement_ids as string[]).includes(v.requirement_id)) refuse(400, 'requirement_id', 'outside_scope');
  const cited = new Set<string>(baseline.get(v.requirement_id)?.provision_ids ?? []);
  if (v.provision_ids.some(p => !cited.has(p))) refuse(400, 'provision_ids', 'not_cited_by_requirement');
  assertWording(v.title, v.observation, v.recommendation);
  return guarded(async () => { const f = randomUUID(); await c.tx.query(`INSERT INTO vendor.findings (id, engagement_id, requirement_id, provision_ids, severity, title, observation, recommendation, due_date, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [f, id, v.requirement_id, v.provision_ids, v.severity, v.title, v.observation, v.recommendation, v.due_date, c.actor.actor_id]); await audit(c, 'vendor.audit.finding-created', f); return findingsView(c, id); });
}
export async function recordFindingEvent(c: Ctx, findingId: string, input: unknown) {
  const v = V.FindingEventRecord.parse(input);
  const f = (await c.tx.query('SELECT * FROM vendor.findings WHERE id=$1', [findingId])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, f.engagement_id);
  const next: Record<string, string> = { CLIENT_RESPONSE: 'CLIENT_RESPONDED', RETEST_PASSED: 'RETEST_PASSED', RETEST_FAILED: 'RETEST_FAILED', CLOSED: 'CLOSED' };
  if (f.status === 'CLOSED') refuse(409, 'finding', 'closed');
  if (v.event === 'CLOSED' && f.status !== 'RETEST_PASSED') refuse(409, 'event', 'close_needs_passed_retest');
  return guarded(async () => { await c.tx.query('INSERT INTO vendor.finding_events (id, finding_id, event, note, actor_id) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), findingId, v.event, v.note, c.actor.actor_id]);
    await c.tx.query('UPDATE vendor.findings SET status=$2 WHERE id=$1', [findingId, next[v.event]]); await audit(c, 'vendor.audit.finding-event', findingId); return findingsView(c, f.engagement_id); });
}
const header = (e: pg.QueryResultRow) => ({ engagement_code_digest: e.code_digest, engagement_reference: e.reference, firm_name: FIRM_NAME(), organisation_name: e.organisation_name, issued_at: new Date().toISOString() });
const FIRM_NAME = () => process.env.ORVIA_AUDIT_FIRM_NAME ?? 'ORVIA audit practice';
async function storeSigned(c: Ctx, id: string, kind: string, signed: ReturnType<typeof signAuditDocument>) {
  const docId = randomUUID();
  await c.tx.query('INSERT INTO vendor.signed_documents (id, engagement_id, kind, document, signing_key_id, signature, signed_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [docId, id, kind, JSON.stringify(signed.document), signed.signing_key_id, signed.signature, c.actor.actor_id]);
  await audit(c, `vendor.audit.${kind.toLowerCase()}-signed`, docId);
  return docId;
}
export async function exportRequests(c: Ctx, id: string, keys: Keys) {
  await requireTeam(c, id); const e = await engagementRow(c, id); const view = await findingsView(c, id);
  const signed = signAuditDocument({ kind: 'REQUEST_LIST', ...header(e), requests: view.requests.map(r => ({ request_id: r.id, requirement_id: r.requirement_id, description: r.description, due_date: r.due_date })) }, keys.audit());
  await storeSigned(c, id, 'REQUEST_LIST', signed);
  return V.SignedFile.parse({ file_name: `orvia-audit-requests-${e.reference.replace(/[^A-Za-z0-9_-]/g, '_')}.json`, signed });
}
export async function exportFindings(c: Ctx, id: string, keys: Keys) {
  await requireTeam(c, id); const e = await engagementRow(c, id); const view = await findingsView(c, id);
  const signed = signAuditDocument({ kind: 'FINDINGS', ...header(e), findings: view.items.map(f => ({ finding_id: f.id, requirement_id: f.requirement_id, provision_ids: f.provision_ids, severity: f.severity, title: f.title,
    observation: f.observation, recommendation: f.recommendation, due_date: f.due_date, status: f.status })) }, keys.audit());
  await storeSigned(c, id, 'FINDINGS', signed);
  return V.SignedFile.parse({ file_name: `orvia-audit-findings-${e.reference.replace(/[^A-Za-z0-9_-]/g, '_')}.json`, signed });
}

// Report: the lead drafts, the engagement's reviewer (a different person) approves, then it is signed.
function assertWording(...texts: string[]) {
  try { assertAttestationWording(...texts); } catch (error) { refuse(400, 'wording', `refused:${((error as { problems?: string[] }).problems ?? []).join('|').replace(/[^a-z|]/gi, '_').slice(0, 50)}`); }
}
const reportView = (r: pg.QueryResultRow) => V.Report.parse({ id: r.id, engagement_id: r.engagement_id, version: r.version, state: r.state, opinion_as_of: day(r.opinion_as_of), method: r.method, opinion: r.opinion, limitations: r.limitations,
  drafted_by: r.drafted_by, drafted_at: iso(r.drafted_at), approved_by: r.approved_by, approved_at: iso(r.approved_at), pdf_sha256: r.pdf_sha256, signed_document_id: r.signed_document_id });
export async function reports(c: Ctx, id: string) {
  await requireTeam(c, id);
  return V.ReportList.parse({ items: (await c.tx.query('SELECT * FROM vendor.reports WHERE engagement_id=$1 ORDER BY version DESC', [id])).rows.map(reportView) });
}
export async function draftReport(c: Ctx, id: string, input: unknown) {
  const v = V.ReportDraft.parse(input); await requireTeam(c, id, 'LEAD'); const e = await engagementRow(c, id);
  if (e.state === 'CLOSED') refuse(409, 'engagement', 'closed');
  if (!e.independence_statement) refuse(409, 'independence', 'declaration_required');
  assertWording(v.method, v.opinion, ...v.limitations);
  return guarded(async () => {
    const version = (await c.tx.query('SELECT coalesce(max(version),0)+1 AS v FROM vendor.reports WHERE engagement_id=$1', [id])).rows[0].v;
    await c.tx.query("UPDATE vendor.reports SET state='SUPERSEDED' WHERE engagement_id=$1 AND state IN ('DRAFT','APPROVED')", [id]);
    const rid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.reports (id, engagement_id, version, state, opinion_as_of, method, opinion, limitations, drafted_by) VALUES ($1,$2,$3,'DRAFT',$4,$5,$6,$7,$8)`, [rid, id, version, v.opinion_as_of, v.method, v.opinion, v.limitations, c.actor.actor_id]);
    if (e.state !== 'REPORTING') await c.tx.query("UPDATE vendor.engagements SET state='REPORTING' WHERE id=$1", [id]);
    await audit(c, 'vendor.audit.report-drafted', rid);
    return reportView((await c.tx.query('SELECT * FROM vendor.reports WHERE id=$1', [rid])).rows[0]!);
  });
}
async function reportRow(c: Ctx, id: string) {
  const r = (await c.tx.query('SELECT * FROM vendor.reports WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, r.engagement_id); return r;
}
export async function approveReport(c: Ctx, id: string) {
  const r = await reportRow(c, id);
  if (r.state !== 'DRAFT') refuse(409, 'report', 'not_a_draft');
  if (r.drafted_by === c.actor.actor_id) refuse(409, 'approved_by', 'reviewer_must_differ_from_drafter');
  if (!(await onTeam(c, r.engagement_id, 'REVIEWER'))) refuse(403, 'approved_by', 'engagement_reviewer_required');
  return guarded(async () => { await c.tx.query("UPDATE vendor.reports SET state='APPROVED', approved_by=$2, approved_at=clock_timestamp() WHERE id=$1", [id, c.actor.actor_id]);
    await audit(c, 'vendor.audit.report-approved', id); return reportView((await c.tx.query('SELECT * FROM vendor.reports WHERE id=$1', [id])).rows[0]!); });
}
export async function signReport(c: Ctx, id: string, keys: Keys) {
  const r = await reportRow(c, id);
  if (r.state !== 'APPROVED') refuse(409, 'report', 'approval_required');
  const e = await engagementRow(c, r.engagement_id);
  const list = await checklist(c, r.engagement_id); const f = await findingsView(c, r.engagement_id);
  const results = list.rows.map(row => ({ requirement_id: row.requirement_id, result: row.result ?? 'NOT_TESTED' as const, rationale: row.rationale ?? 'No result was recorded for this requirement; it was not tested.' }));
  const scope = { requirement_ids: e.scope_requirement_ids as string[], period: { from: day(e.period_from)!, to: day(e.period_to)! } };
  // Auditor requests the client left unanswered past their due date are scope limitations; they are stated, never hidden.
  const unanswered = (await c.tx.query(`SELECT kind, requirement_id, due_date, status FROM vendor.channel_requests WHERE engagement_id=$1 AND status IN ('PENDING','AWAITING_CLIENT_APPROVAL','REFUSED') AND due_date < $2::date ORDER BY due_date, id`,
    [r.engagement_id, day(r.opinion_as_of)])).rows;
  const limitations = [...(r.limitations as string[]), ...unanswered.map(u => `Auditor request (${String(u.kind).replaceAll('_', ' ').toLowerCase()}${u.requirement_id ? `, ${u.requirement_id}` : ''}) due ${day(u.due_date)} was ${u.status === 'REFUSED' ? 'declined' : 'not answered'} by the client by the opinion date.`)];
  if (limitations.length > 20) limitations.splice(19, limitations.length - 19, `${limitations.length - 19} further limitations, including unanswered auditor requests, are recorded in the engagement file.`);
  r.limitations = limitations;
  const pdf = renderPdf(reportLines(e, r, results, f.items), `${e.reference} - audit opinion as of ${day(r.opinion_as_of)} - version ${r.version}`);
  const pdfSha = sha256(pdf);
  const document = { kind: 'REPORT' as const, ...header(e), report_id: r.id, version: r.version, opinion_as_of: day(r.opinion_as_of)!, scope, method: r.method, results,
    findings: f.items.map(x => ({ finding_id: x.id, requirement_id: x.requirement_id, severity: x.severity, title: x.title, status: x.status })),
    opinion: r.opinion, limitations: r.limitations, independence_statement: e.independence_statement, empanelment_reference: e.empanelment_reference,
    drafted_by_role: 'LEAD_AUDITOR' as const, approved_by_role: 'AUDIT_REVIEWER' as const, pdf_sha256: pdfSha };
  const signed = signAuditDocument(document, keys.audit());
  const docId = await storeSigned(c, r.engagement_id, 'REPORT', signed);
  await guarded(() => c.tx.query("UPDATE vendor.reports SET state='SIGNED', signed_document_id=$2, pdf=$3, pdf_sha256=$4 WHERE id=$1", [id, docId, pdf, pdfSha]));
  return V.SignedFile.parse({ file_name: `orvia-audit-report-${e.reference.replace(/[^A-Za-z0-9_-]/g, '_')}-v${r.version}.json`, signed });
}
export async function reportPdf(c: Ctx, id: string) {
  const r = await reportRow(c, id);
  if (r.state !== 'SIGNED' && r.state !== 'SUPERSEDED' || !r.pdf) refuse(409, 'report', 'not_signed');
  const e = await engagementRow(c, r.engagement_id);
  return V.ReportPdf.parse({ file_name: `orvia-audit-report-${e.reference.replace(/[^A-Za-z0-9_-]/g, '_')}-v${r.version}.pdf`, pdf_base64: (r.pdf as Buffer).toString('base64'), pdf_sha256: r.pdf_sha256 });
}
export function reportLines(e: pg.QueryResultRow, r: pg.QueryResultRow, results: { requirement_id: string; result: string; rationale: string }[], findings: { requirement_id: string; severity: string; title: string; status: string }[]): PdfLine[] {
  const lines: PdfLine[] = [
    { text: 'DPDPA audit opinion', style: 'title' },
    { text: `${e.organisation_name} - engagement ${e.reference}` },
    { text: `Opinion as of ${day(r.opinion_as_of)}. Audit period ${day(e.period_from)} to ${day(e.period_to)}. Report version ${r.version}.` },
    { text: 'This is an audit opinion, as of the date stated, on the scope stated below. It is not a determination of compliance: only the Data Protection Board of India decides compliance with the Digital Personal Data Protection Act, 2023 and the Rules made under it.', style: 'small' },
    { text: 'Scope', style: 'heading' }, { text: (e.scope_requirement_ids as string[]).join(', ') },
    { text: 'Method', style: 'heading' }, { text: r.method },
    { text: 'Results by requirement', style: 'heading' },
    ...results.flatMap(x => [{ text: `${x.requirement_id}: ${x.result.replaceAll('_', ' ')}` }, { text: x.rationale, style: 'small' as const }]),
    { text: 'Findings', style: 'heading' },
    ...(findings.length ? findings.map(x => ({ text: `[${x.severity}] ${x.requirement_id} - ${x.title} (${x.status.replaceAll('_', ' ')})` })) : [{ text: 'No findings were raised.' }]),
    { text: 'Opinion', style: 'heading' }, { text: r.opinion },
    { text: 'Limitations', style: 'heading' }, ...(r.limitations as string[]).map(x => ({ text: `- ${x}` })),
    { text: 'Independence', style: 'heading' }, { text: e.independence_statement },
    ...(e.empanelment_reference ? [{ text: `Empanelment reference recorded by the auditor: ${e.empanelment_reference}`, style: 'small' as const }] : []),
    { text: 'Drafted by the lead auditor and approved by a different audit reviewer before signing. The signed JSON issued with this PDF carries its SHA-256.', style: 'small' },
  ];
  assertAttestationWording(...lines.slice(4).map(l => l.text));
  return lines;
}

export async function retentionSweep(c: Ctx) {
  return guarded(async () => { const rows = (await c.tx.query('SELECT * FROM vendor.retention_sweep($1)', [c.actor.actor_id])).rows;
    await audit(c, 'vendor.retention.sweep', null); return V.RetentionSweep.parse({ purged: rows.map(r => ({ engagement_id: r.engagement_id, packages: r.packages, items: r.items, bytes: Number(r.bytes) })) }); });
}
export async function supportCases(c: Ctx) {
  return V.SupportCaseList.parse({ items: (await c.tx.query('SELECT s.*, o.name AS organisation_name FROM vendor.support_cases s JOIN vendor.organisations o ON o.id = s.organisation_id ORDER BY s.created_at DESC LIMIT 1000')).rows
    .map(r => ({ id: r.id, organisation_id: r.organisation_id, organisation_name: r.organisation_name, category: r.category, summary: r.summary, urgency: r.urgency, state: r.state, created_at: iso(r.created_at) })) });
}
export async function createSupportCase(c: Ctx, input: unknown) {
  const v = V.SupportCaseCreate.parse(input);
  return guarded(async () => { const id = randomUUID(); await c.tx.query('INSERT INTO vendor.support_cases (id, organisation_id, category, summary, urgency, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [id, v.organisation_id, v.category, v.summary, v.urgency, c.actor.actor_id]);
    await audit(c, 'vendor.support.case-created', id); return (await supportCases(c)).items.find(s => s.id === id)!; });
}
