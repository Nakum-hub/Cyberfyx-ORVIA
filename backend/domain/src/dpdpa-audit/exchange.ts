import { randomUUID, createHash } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as D from '../../../../shared/contracts/src/dpdpa-audit.ts';
import * as G from '../../../../shared/contracts/src/grc.ts';
import { canonicalJson } from '../../../../shared/contracts/src/crypto.ts';
import { AuditPackageManifest, packageFileBytes, manifestFingerprint, sha256, sniffMediaType, verifyAuditDocument, MAX_EVIDENCE_FILE_BYTES, type AuditDocument, type PackageItem } from '../../../../shared/contracts/src/audit-exchange.ts';
import { channelKey } from '../../../../shared/contracts/src/audit-channel.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, packageAt, predicate, refuse, scope, inForce, type RequirementClaim } from '../operations/shared.ts';
import { submitGrcEvidence } from '../grc/grc.ts';
import { issueView } from '../grc/lifecycle.ts';
import { redactContactDetails } from '../rights/response-packages.ts';
import { indicatorsFor } from './indicators.ts';

/**
 * Client side of the DPDPA external audit exchange (revision 1.5 addendum).
 *
 * The gap register is derived, never stored: applicability from recorded
 * decisions, evidence standing from the controls mapped to the imported DPDP
 * framework, and aggregate indicators read from ORVIA's own records. Nothing
 * personal is ever computed into it.
 *
 * A package leaves the installation only as a file, sealed at approval by an
 * owner or administrator other than its preparer (checked again by
 * app.audit_package_approve), holding only items whose personal-data flag was
 * confirmed by a second person, or an approved exception.
 */
type Row = QueryResultRow;
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) {
    const e = error as { code?: string; message?: string; hint?: string; constraint?: string };
    if (e.code === '42501') throw new AccessError(403, 'FORBIDDEN');
    if (e.code === 'P0002') refuse(404, e.hint ?? 'id', 'not_found');
    if (e.code === 'P0001') refuse(409, e.hint ?? 'request', e.message ?? 'refused');
    if (e.code === '23505') refuse(409, e.constraint ?? 'request', 'already_exists');
    throw error;
  }
}
const day = (v: unknown) => v instanceof Date ? new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : String(v).slice(0, 10);
export const engagementCodeDigest = (code: string) => createHash('sha256').update('orvia-engagement:' + code.toUpperCase().replace(/[^A-Z0-9]/g, ''), 'utf8').digest('hex');

// ---------------------------------------------------------------- gap register
export async function dpdpFramework(c: Context, version: string) {
  const r = (await c.tx.query(`SELECT document FROM app.grc_frameworks WHERE ${predicate} AND document->>'source_reference'=$4 ORDER BY document->>'recorded_at' DESC LIMIT 1`, [...scope(c), `ORVIA regulatory package ${version}`])).rows[0];
  return r ? G.GrcFramework.parse(r.document) : null;
}
/** Standing of every control mapped to the DPDP framework, by requirement. The mandate worker passes countFiles=false: it never reads evidence files. */
export async function controlStandings(c: Context, frameworkId: string | null, countFiles = true) {
  const out = new Map<string, { control_id: string; title: string; standing: D.Standing; evidence_id: string | null; files: number }[]>();
  if (!frameworkId) return out;
  const controls = (await c.tx.query(`SELECT document FROM app.grc_controls WHERE ${predicate} AND document->'mappings' @> $4::jsonb`, [...scope(c), JSON.stringify([{ framework_id: frameworkId }])])).rows.map(r => G.GrcControl.parse(r.document));
  const now = new Date();
  for (const control of controls) {
    const ev = (await c.tx.query(`SELECT document FROM app.grc_evidence WHERE ${predicate} AND control_id=$4 ORDER BY sequence DESC LIMIT 1`, [...scope(c), control.id])).rows[0];
    const evidence = ev ? G.GrcEvidence.parse(ev.document) : null;
    const rv = evidence ? (await c.tx.query(`SELECT document FROM app.grc_reviews WHERE ${predicate} AND evidence_id=$4`, [...scope(c), evidence.id])).rows[0] : undefined;
    const standing = G.controlStanding(control, evidence, rv ? G.GrcEvidenceReview.parse(rv.document) : null, now);
    const files = countFiles ? (await c.tx.query(`SELECT count(*)::int AS n FROM app.evidence_files WHERE ${predicate} AND control_id=$4`, [...scope(c), control.id])).rows[0].n as number : 0;
    for (const m of control.mappings.filter(m => m.framework_id === frameworkId)) {
      const list = out.get(m.requirement_code) ?? []; list.push({ control_id: control.id, title: control.title, standing: standing.state, evidence_id: standing.evidence_id, files }); out.set(m.requirement_code, list);
    }
  }
  return out;
}
export async function gapRegister(c: Context) {
  const now = new Date(); const pkg = await packageAt(c, now);
  const limits = ['Indicators are aggregate counts read from this installation\'s own records; they contain no personal data.',
    'Applicability comes from recorded decisions; a requirement with no decision is an unresolved gap, never assumed not applicable.'];
  const totals = Object.fromEntries(D.GapStatus.options.map(s => [s, 0])) as Record<D.GapStatus, number>;
  if (!pkg) return D.GapRegister.parse({ as_of: now.toISOString(), package: null, framework_id: null, rows: [], by_module: [], totals, limits: [...limits, 'No approved regulatory package is in force: import and approve the DPDP package first.'] });
  if (pkg.distribution === 'TEST_FIXTURE') limits.push('The regulatory package in force is a TEST FIXTURE: its content is not the official DPDP text and must not be relied on for a real audit.');
  const framework = await dpdpFramework(c, pkg.version);
  if (!framework) limits.push('The DPDP framework has not been imported into Frameworks & controls for this package version, so no evidence standing can be shown.');
  const decisions = (await c.tx.query(`SELECT DISTINCT ON (requirement_id, scope_kind, scope_id) requirement_id, scope_kind, result FROM app.applicability_decisions
    WHERE ${predicate} AND package_row_id=$4 ORDER BY requirement_id, scope_kind, scope_id, evaluated_at DESC`, [...scope(c), pkg.id])).rows;
  const standings = await controlStandings(c, framework?.id ?? null);
  const rows: ReturnType<typeof D.GapRow.parse>[] = [];
  for (const r of pkg.claims.requirements as RequirementClaim[]) {
    const mine = decisions.filter(d => d.requirement_id === r.requirement_id) as { scope_kind: 'ORGANISATION' | 'ACTIVITY'; result: string }[];
    const applicability = inForce(r, now) ? D.deriveApplicability(mine) : 'NOT_APPLICABLE';
    const basis = !inForce(r, now) ? `Not yet in force (effective ${r.effective_from}).` : mine.length ? `${mine.length} recorded decision(s); ${mine.find(d => d.scope_kind === 'ORGANISATION') ? 'organisation-level decision applies' : 'activity-level decisions'}.` : 'No applicability decision recorded.';
    const controls = standings.get(r.requirement_id) ?? [];
    const gap = D.deriveGapStatus(applicability, controls.map(x => x.standing));
    totals[gap]++;
    rows.push({ requirement_id: r.requirement_id, title: r.title.slice(0, 300), provision_ids: r.provision_ids, modules: r.modules, in_force: inForce(r, now), applicability, applicability_basis: basis,
      evidence_expectations: r.evidence_expectations, controls, indicators: await indicatorsFor(c, r.requirement_id, now), gap_status: gap });
  }
  const modules = [...new Set(rows.flatMap(r => r.modules))].sort();
  const by_module = modules.map(m => { const rs = rows.filter(r => r.modules.includes(m));
    return { module: m, total: rs.length, gaps: rs.filter(r => !['EVIDENCED', 'NOT_APPLICABLE'].includes(r.gap_status)).length, evidenced: rs.filter(r => r.gap_status === 'EVIDENCED').length, not_applicable: rs.filter(r => r.gap_status === 'NOT_APPLICABLE').length }; });
  await audit(c, 'dpdpa_audit.gap_register.read');
  return D.GapRegister.parse({ as_of: now.toISOString(), package: { id: pkg.id, version: pkg.version, distribution: pkg.distribution }, framework_id: framework?.id ?? null, rows, by_module, totals, limits });
}
const csvCell = (v: unknown) => { const s = String(v ?? ''); const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe; };
export async function exportGapRegister(c: Context) {
  const g = await gapRegister(c);
  const lines = [['requirement_id', 'title', 'provisions', 'in_force', 'applicability', 'gap_status', 'controls', 'control_standings', 'evidence_expectations'].join(','),
    ...g.rows.map(r => [r.requirement_id, r.title, r.provision_ids.join(' '), r.in_force, r.applicability, r.gap_status, r.controls.length, r.controls.map(x => x.standing).join(' '), r.evidence_expectations.join(' | ')].map(csvCell).join(','))];
  await audit(c, 'dpdpa_audit.gap_register.exported');
  return D.GapRegisterExport.parse({ file_name: `orvia-dpdpa-gap-register-${g.as_of.slice(0, 10)}.csv`, csv: lines.join('\n') + '\n', rows: g.rows.length });
}

// ---------------------------------------------------------------- evidence files
const shareable = (r: Row): 'SHAREABLE' | 'BLOCKED_UNCONFIRMED' | 'EXCEPTION_REQUIRED' => r.personal_data_confirmed === null ? 'BLOCKED_UNCONFIRMED' : r.personal_data_confirmed === 'YES' ? 'EXCEPTION_REQUIRED' : 'SHAREABLE';
const fileView = (r: Row) => D.EvidenceFile.parse({ id: r.id, control_id: r.control_id, grc_evidence_id: r.grc_evidence_id, file_name: r.file_name, media_type: r.media_type, size_bytes: r.size_bytes, sha256: r.sha256,
  contains_personal_data: r.contains_personal_data, personal_data_confirmed: r.personal_data_confirmed, confirmed_by: r.confirmed_by, confirmed_at: iso(r.confirmed_at), shareable: shareable(r), uploaded_by: r.uploaded_by, uploaded_at: iso(r.uploaded_at) });
const FILE_COLUMNS = 'id, control_id, grc_evidence_id, file_name, media_type, size_bytes, sha256, contains_personal_data, personal_data_confirmed, confirmed_by, confirmed_at, uploaded_by, uploaded_at';
async function fileRow(c: Context, id: string) {
  return (await c.tx.query(`SELECT ${FILE_COLUMNS} FROM app.evidence_files WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
}
export async function submitEvidenceFile(c: Context, controlId: string, input: unknown) {
  const v = D.EvidenceFileSubmit.parse(input);
  const bytes = Buffer.from(v.content_base64, 'base64');
  if (bytes.toString('base64') !== v.content_base64.replace(/\s/g, '')) refuse(400, 'content_base64', 'not_base64');
  if (bytes.length === 0 || bytes.length > MAX_EVIDENCE_FILE_BYTES) refuse(400, 'content_base64', 'size_out_of_range');
  const media = sniffMediaType(bytes, v.file_name);
  if (!media) refuse(400, 'file_name', 'type_not_permitted_or_content_mismatch');
  const id = randomUUID(); const digest = sha256(bytes);
  // The GRC evidence record carries the server-computed hash and points at the stored file.
  const evidence = await submitGrcEvidence(c, controlId, { description: v.description, local_reference: `orvia-evidence-file:${id}`, content_sha256: digest, collected_at: v.collected_at, valid_until: v.valid_until });
  await guarded(() => c.tx.query(`INSERT INTO app.evidence_files (tenant_id, legal_entity_id, environment_id, id, control_id, grc_evidence_id, file_name, media_type, size_bytes, sha256, content, contains_personal_data, uploaded_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [...scope(c), id, controlId, evidence.id, v.file_name, media, bytes.length, digest, bytes, v.contains_personal_data, c.actor.actor_id]));
  await audit(c, 'evidence_file.submitted', id);
  return fileView(await fileRow(c, id));
}
export async function evidenceFileList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT ${FILE_COLUMNS} FROM app.evidence_files WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const items = rows.slice(0, page.limit).map(fileView);
  return D.EvidenceFileList.parse({ items, next_cursor: rows.length > page.limit ? Buffer.from(items.at(-1)!.id).toString('base64url') : null });
}
export async function evidenceFile(c: Context, id: string) { return fileView(await fileRow(c, id)); }
export async function evidenceFileContent(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT id, file_name, media_type, sha256, content FROM app.evidence_files WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
  await audit(c, 'evidence_file.content_read', id);
  return D.EvidenceFileContent.parse({ id: r.id, file_name: r.file_name, media_type: r.media_type, sha256: r.sha256, content_base64: (r.content as Buffer).toString('base64') });
}
export async function confirmPersonalData(c: Context, id: string, input: unknown) {
  const v = D.PersonalDataConfirm.parse(input);
  await guarded(() => c.tx.query('SELECT app.evidence_file_confirm($1,$2)', [id, v.personal_data]));
  await audit(c, 'evidence_file.personal_data_confirmed', id);
  return fileView(await fileRow(c, id));
}

// ---------------------------------------------------------------- engagements
async function engagementRow(c: Context, id: string) {
  return (await c.tx.query(`SELECT * FROM app.audit_engagements WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
}
const effectiveState = (p: Row) => p.state === 'APPROVED' && Date.parse(p.expires_at) <= Date.now() ? 'EXPIRED' : p.state;
async function packageSummaries(c: Context, engagementId: string) {
  const rows = (await c.tx.query(`SELECT p.*, (SELECT count(*)::int FROM app.audit_package_items i WHERE i.package_id=p.id) AS item_count,
    (SELECT count(*)::int FROM app.audit_package_exports x WHERE x.package_id=p.id) AS exports FROM app.audit_packages p WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.engagement_id=$4 ORDER BY p.created_at DESC`, [...scope(c), engagementId])).rows;
  return rows.map(summaryOf);
}
const summaryOf = (p: Row) => D.AuditPackageSummary.parse({ id: p.id, engagement_id: p.engagement_id, state: p.state, expires_at: iso(p.expires_at), effective_state: effectiveState(p), prepared_by: p.prepared_by, prepared_role: p.prepared_role,
  approved_by: p.approved_by, approved_at: iso(p.approved_at), manifest_fingerprint: p.manifest_fingerprint, file_sha256: p.file_sha256, revoked_at: iso(p.revoked_at), revoke_reason: p.revoke_reason,
  item_count: p.item_count ?? 0, exports: p.exports ?? 0, created_at: iso(p.created_at) });
const importSummary = (r: Row) => { const d = r.document as { issued_at: string; requests?: unknown[]; findings?: unknown[]; results?: unknown[] };
  return D.AuditImportSummary.parse({ id: r.id, kind: r.kind, document_digest: r.document_digest, signing_key_id: r.signing_key_id, imported_at: iso(r.imported_at), imported_by: r.imported_by, issued_at: d.issued_at,
    entries: (d.requests ?? d.findings ?? d.results ?? []).length, pdf_sha256: r.pdf_sha256 }); };
const engagementBase = (r: Row) => ({ id: r.id, firm_name: r.firm_name, engagement_reference: r.engagement_reference, scope_requirement_ids: r.scope_requirement_ids, period_from: day(r.period_from), period_to: day(r.period_to),
  processing_agreement: { status: r.processing_agreement_reference ? 'RECORDED' as const : 'NOT_RECORDED' as const, reference: r.processing_agreement_reference },
  independence: { declared: r.independence_statement !== null, statement: r.independence_statement }, empanelment_reference: r.empanelment_reference, state: r.state, created_by: r.created_by, created_at: iso(r.created_at) });
export async function engagement(c: Context, id: string) {
  const r = await engagementRow(c, id);
  const imports = (await c.tx.query(`SELECT id, kind, document, document_digest, signing_key_id, imported_at, imported_by, pdf_sha256 FROM app.audit_imports WHERE ${predicate} AND engagement_id=$4 ORDER BY imported_at DESC`, [...scope(c), id])).rows;
  return D.AuditEngagement.parse({ ...engagementBase(r), packages: await packageSummaries(c, id), imports: imports.map(importSummary) });
}
export async function engagementList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.audit_engagements WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const items = rows.slice(0, page.limit).map(engagementBase);
  return D.AuditEngagementList.parse({ items, next_cursor: rows.length > page.limit ? Buffer.from(items.at(-1)!.id).toString('base64url') : null });
}
export async function createEngagement(c: Context, input: unknown) {
  const v = D.AuditEngagementCreate.parse(input);
  if (v.period_to < v.period_from) refuse(400, 'period_to', 'before_period_from');
  const pkg = await packageAt(c, new Date());
  const known = new Set((pkg?.claims.requirements ?? []).map(r => r.requirement_id));
  if (v.scope_requirement_ids.some(r => !known.has(r))) refuse(400, 'scope_requirement_ids', 'not_in_package_in_force');
  const id = randomUUID();
  await guarded(() => c.tx.query(`INSERT INTO app.audit_engagements (tenant_id, legal_entity_id, environment_id, id, code_digest, firm_name, engagement_reference, scope_requirement_ids, period_from, period_to,
    processing_agreement_reference, independence_statement, empanelment_reference, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
  [...scope(c), id, engagementCodeDigest(v.engagement_code), v.firm_name, v.engagement_reference, [...new Set(v.scope_requirement_ids)], v.period_from, v.period_to, v.processing_agreement_reference, v.independence_statement, v.empanelment_reference, c.actor.actor_id]));
  // The audit channel key (revision 1.6) is derived here and readable only by the background worker; the code itself is not kept.
  await guarded(() => c.tx.query('INSERT INTO app.audit_channel_keys (tenant_id, legal_entity_id, environment_id, engagement_id, channel_key) VALUES ($1,$2,$3,$4,$5)', [...scope(c), id, channelKey(v.engagement_code)]));
  await audit(c, 'audit_engagement.created', id);
  return engagement(c, id);
}

// ---------------------------------------------------------------- packages
async function packageRow(c: Context, id: string) {
  return (await c.tx.query(`SELECT * FROM app.audit_packages WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
}
async function items(c: Context, id: string) {
  return (await c.tx.query(`SELECT * FROM app.audit_package_items WHERE ${predicate} AND package_id=$4 ORDER BY requirement_id, added_at, item_id`, [...scope(c), id])).rows;
}
async function screening(c: Context, p: Row, list: Row[]) {
  const e = await engagementRow(c, p.engagement_id); const inScope = new Set<string>(e.scope_requirement_ids);
  const problems: { item_id: string; problem: 'PERSONAL_DATA_UNCONFIRMED' | 'PERSONAL_DATA_WITHOUT_EXCEPTION' | 'OUTSIDE_ENGAGEMENT_SCOPE' }[] = [];
  for (const i of list) {
    if (!inScope.has(i.requirement_id)) problems.push({ item_id: i.item_id, problem: 'OUTSIDE_ENGAGEMENT_SCOPE' });
    if (i.kind === 'FILE') {
      const f = await fileRow(c, i.evidence_file_id);
      if (f.personal_data_confirmed === null) problems.push({ item_id: i.item_id, problem: 'PERSONAL_DATA_UNCONFIRMED' });
      else if (f.personal_data_confirmed === 'YES' && i.contains_personal_data !== 'YES') problems.push({ item_id: i.item_id, problem: 'PERSONAL_DATA_WITHOUT_EXCEPTION' });
    }
  }
  return problems;
}
async function packageView(c: Context, id: string, redactions = 0) {
  const p = await packageRow(c, id); const list = await items(c, id);
  const counts = (await c.tx.query(`SELECT count(*)::int AS n FROM app.audit_package_exports WHERE ${predicate} AND package_id=$4`, [...scope(c), id])).rows[0].n;
  return D.AuditPackage.parse({ ...summaryOf({ ...p, item_count: list.length, exports: counts }), manifest: p.manifest,
    items: list.map(i => ({ item_id: i.item_id, requirement_id: i.requirement_id, kind: i.kind, title: i.title, evidence_file_id: i.evidence_file_id, indicator: i.indicator, statement: i.statement,
      contains_personal_data: i.contains_personal_data, exception_justification: i.exception_justification, exception_approved_by: i.exception_approved_by, added_by: i.added_by, added_at: iso(i.added_at) })),
    screening: p.state === 'DRAFT' ? await screening(c, p, list) : [], redactions });
}
export const auditPackage = (c: Context, id: string) => packageView(c, id);
export async function createPackage(c: Context, engagementId: string, input: unknown) {
  const v = D.AuditPackageCreate.parse(input); const e = await engagementRow(c, engagementId);
  if (e.state !== 'ACTIVE') refuse(409, 'engagement', 'closed');
  const expires = Date.parse(v.expires_at);
  if (expires <= Date.now() + 3600_000 || expires > Date.now() + 180 * 86400_000) refuse(400, 'expires_at', 'between_one_hour_and_180_days');
  const id = randomUUID();
  await guarded(() => c.tx.query(`INSERT INTO app.audit_packages (tenant_id, legal_entity_id, environment_id, id, engagement_id, expires_at, prepared_by, prepared_role) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [...scope(c), id, engagementId, v.expires_at, c.actor.actor_id, c.actor.role]));
  await audit(c, 'audit_package.created', id);
  return packageView(c, id);
}
/** Resolves an item's content. Indicators are computed now by the server, statements are redacted; a client cannot supply either as finished content. */
async function itemContent(c: Context, p: Row, v: ReturnType<typeof D.AuditPackageItemAdd.parse>) {
  const e = await engagementRow(c, p.engagement_id);
  if (!(e.scope_requirement_ids as string[]).includes(v.requirement_id)) refuse(400, 'requirement_id', 'outside_engagement_scope');
  if (v.kind === 'FILE') {
    if (!v.evidence_file_id || v.indicator_key || v.statement) refuse(400, 'kind', 'file_item_needs_only_evidence_file_id');
    const f = await fileRow(c, v.evidence_file_id!);
    return { file: f, indicator: null, statement: null, redactions: 0 };
  }
  if (v.kind === 'INDICATOR') {
    if (!v.indicator_key || v.evidence_file_id || v.statement) refuse(400, 'kind', 'indicator_item_needs_only_indicator_key');
    const indicator = (await indicatorsFor(c, v.requirement_id, new Date())).find(i => i.key === v.indicator_key);
    if (!indicator) refuse(400, 'indicator_key', 'not_an_indicator_of_this_requirement');
    return { file: null, indicator, statement: null, redactions: 0 };
  }
  if (!v.statement || v.evidence_file_id || v.indicator_key) refuse(400, 'kind', 'statement_item_needs_only_statement');
  const redacted = redactContactDetails(v.statement!);
  return { file: null, indicator: null, statement: redacted.text, redactions: redacted.redactions };
}
export async function addItem(c: Context, id: string, input: unknown) {
  const v = D.AuditPackageItemAdd.parse(input); const p = await packageRow(c, id);
  if (p.state !== 'DRAFT') refuse(409, 'package', 'package_not_a_draft');
  const content = await itemContent(c, p, v);
  if (content.file) {
    if (content.file.personal_data_confirmed === null) refuse(409, 'evidence_file_id', 'personal_data_unconfirmed');
    if (content.file.personal_data_confirmed === 'YES') refuse(409, 'evidence_file_id', 'personal_data_requires_approved_exception');
  }
  const item = randomUUID();
  await guarded(() => c.tx.query(`INSERT INTO app.audit_package_items (tenant_id, legal_entity_id, environment_id, package_id, item_id, requirement_id, kind, title, evidence_file_id, indicator, statement, contains_personal_data, added_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'NO',$12)`, [...scope(c), id, item, v.requirement_id, v.kind, v.title, content.file?.id ?? null, content.indicator ? JSON.stringify(content.indicator) : null, content.statement, c.actor.actor_id]));
  await audit(c, 'audit_package.item_added', id);
  return packageView(c, id, content.redactions);
}
export async function addExceptionItem(c: Context, id: string, input: unknown) {
  const v = D.AuditPackageExceptionAdd.parse(input); const p = await packageRow(c, id);
  if (p.state !== 'DRAFT') refuse(409, 'package', 'package_not_a_draft');
  const { justification, ...rest } = v;
  const content = await itemContent(c, p, rest);
  if (content.file && content.file.personal_data_confirmed === null) refuse(409, 'evidence_file_id', 'personal_data_unconfirmed');
  // The exception is approved by the caller and attributed to the package's preparer, who must be someone else (checked in the database).
  await guarded(() => c.tx.query('SELECT app.audit_item_add_exception($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [id, randomUUID(), v.requirement_id, v.kind, v.title, content.file?.id ?? null, content.indicator ? JSON.stringify(content.indicator) : null, content.statement, p.prepared_by, justification]));
  await audit(c, 'audit_package.exception_item_added', id);
  return packageView(c, id, content.redactions);
}
export async function removeItem(c: Context, id: string, input: unknown) {
  const v = D.AuditPackageItemRemove.parse(input); const p = await packageRow(c, id);
  if (p.state !== 'DRAFT') refuse(409, 'package', 'package_not_a_draft');
  const r = await guarded(() => c.tx.query(`DELETE FROM app.audit_package_items WHERE ${predicate} AND package_id=$4 AND item_id=$5`, [...scope(c), id, v.item_id]));
  if (!r.rowCount) refuse(404, 'item_id', 'not_found');
  await audit(c, 'audit_package.item_removed', id);
  return packageView(c, id);
}
/** The exact bytes of each item as they will appear in the package file. */
async function itemBytes(c: Context, i: Row): Promise<{ bytes: Buffer; media: PackageItem['media_type']; fileName: string | null }> {
  if (i.kind === 'FILE') {
    const f = (await c.tx.query(`SELECT file_name, media_type, content, sha256 FROM app.evidence_files WHERE ${predicate} AND id=$4`, [...scope(c), i.evidence_file_id])).rows[0]!;
    if (sha256(f.content) !== f.sha256) throw new Error('Stored evidence file does not match its recorded hash');
    return { bytes: f.content as Buffer, media: f.media_type, fileName: f.file_name };
  }
  if (i.kind === 'INDICATOR') return { bytes: Buffer.from(canonicalJson(i.indicator), 'utf8'), media: 'application/json', fileName: null };
  return { bytes: Buffer.from(i.statement as string, 'utf8'), media: 'text/plain', fileName: null };
}
async function build(c: Context, p: Row, approvedAt: string, approverRole: string, revoked: string[]) {
  const e = await engagementRow(c, p.engagement_id); const list = await items(c, p.id); const pkg = await packageAt(c, new Date());
  const org = (await c.tx.query('SELECT name FROM app.organisations WHERE id=$1', [c.actor.scope.tenant_id])).rows[0]?.name ?? 'Organisation';
  const installation = (await c.tx.query('SELECT app.installation_reference() AS id')).rows[0].id as string;
  const contents = new Map<string, Buffer>(); const manifestItems: PackageItem[] = [];
  for (const i of list) {
    const b = await itemBytes(c, i); contents.set(i.item_id, b.bytes);
    manifestItems.push({ item_id: i.item_id, requirement_id: i.requirement_id, kind: i.kind, title: i.title, file_name: b.fileName, media_type: b.media, size_bytes: b.bytes.length, sha256: sha256(b.bytes),
      contains_personal_data: i.contains_personal_data, personal_data_exception: i.contains_personal_data === 'YES' ? { justification: i.exception_justification, approved_by_role: i.exception_approved_role } : null });
  }
  const manifest = AuditPackageManifest.parse({ format: 'orvia.dpdpa-audit-package', format_version: 1, package_id: p.id, installation_id: installation, organisation_name: org,
    engagement_code_digest: e.code_digest, firm_name: e.firm_name, engagement_reference: e.engagement_reference, audit_period: { from: day(e.period_from), to: day(e.period_to) }, scope_requirement_ids: e.scope_requirement_ids,
    regulatory_package: pkg ? { package_id: pkg.package_id, version: pkg.version, kind: pkg.distribution } : null,
    approval: { preparer_role: p.prepared_role, approver_role: approverRole, distinct_people: true, approved_at: approvedAt }, created_at: iso(p.created_at), expires_at: iso(p.expires_at),
    items: manifestItems, revoked_package_ids: revoked });
  return { manifest, bytes: packageFileBytes(manifest, contents) };
}
export async function approvePackage(c: Context, id: string) {
  const p = await packageRow(c, id);
  if (p.state !== 'DRAFT') refuse(409, 'package', 'package_not_a_draft');
  if (p.prepared_by === c.actor.actor_id) refuse(409, 'approved_by', 'approver_must_differ_from_preparer');
  const problems = await screening(c, p, await items(c, id));
  if (problems.length) refuse(409, 'items', `screening_failed:${problems[0]!.problem.toLowerCase()}`);
  // Packages of this engagement revoked so far are named, so the vendor withdraws them at the next upload.
  const revoked = (await c.tx.query(`SELECT id FROM app.audit_packages WHERE ${predicate} AND engagement_id=$4 AND state='REVOKED' ORDER BY revoked_at`, [...scope(c), p.engagement_id])).rows.map(r => r.id as string);
  const approvedAt = new Date().toISOString();
  const built = await build(c, p, approvedAt, c.actor.role, revoked);
  await guarded(() => c.tx.query('SELECT app.audit_package_approve($1,$2,$3,$4)', [id, JSON.stringify(built.manifest), manifestFingerprint(built.manifest), sha256(built.bytes)]));
  await audit(c, 'audit_package.approved', id);
  return packageView(c, id);
}
export async function exportPackage(c: Context, id: string) {
  const p = await packageRow(c, id);
  if (p.state !== 'APPROVED') refuse(409, 'package', p.state === 'REVOKED' ? 'revoked' : 'approval_required');
  if (Date.parse(p.expires_at) <= Date.now()) refuse(409, 'package', 'expired');
  const manifest = AuditPackageManifest.parse(p.manifest);
  const contents = new Map<string, Buffer>();
  for (const i of await items(c, id)) contents.set(i.item_id, (await itemBytes(c, i)).bytes);
  const bytes = packageFileBytes(manifest, contents);
  // What leaves is exactly what was approved: the same bytes, byte for byte.
  if (sha256(bytes) !== p.file_sha256 || manifestFingerprint(manifest) !== p.manifest_fingerprint) throw new Error('Package content changed after approval');
  await guarded(() => c.tx.query(`INSERT INTO app.audit_package_exports (tenant_id, legal_entity_id, environment_id, id, package_id, file_sha256, exported_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [...scope(c), randomUUID(), id, p.file_sha256, c.actor.actor_id]));
  await audit(c, 'audit_package.exported', id);
  const e = await engagementRow(c, p.engagement_id);
  return D.AuditPackageExport.parse({ file_name: `orvia-dpdpa-audit-package-${e.engagement_reference.replace(/[^A-Za-z0-9_-]/g, '_')}-${id.slice(0, 8)}.orvia-audit.json`, package_base64: bytes.toString('base64'),
    file_sha256: p.file_sha256, manifest_fingerprint: p.manifest_fingerprint, expires_at: iso(p.expires_at) });
}
export async function revokePackage(c: Context, id: string, input: unknown) {
  const v = D.AuditPackageRevoke.parse(input); await packageRow(c, id);
  await guarded(() => c.tx.query('SELECT app.audit_package_revoke($1,$2)', [id, v.reason]));
  await audit(c, 'audit_package.revoked', id);
  return packageView(c, id);
}

// ---------------------------------------------------------------- signed imports from the vendor
function trustedAuditKey() {
  const key_id = process.env.ORVIA_AUDIT_KEY_ID; const pub = process.env.ORVIA_AUDIT_PUBLIC_KEY;
  if (!key_id || !pub) refuse(409, 'signed', 'no_trusted_audit_key_installed');
  return { key_id: key_id!, public: pub! };
}
const importView = async (c: Context, r: Row) => D.AuditImport.parse({ ...importSummary(r), engagement_id: r.engagement_id, document: r.document,
  finding_links: (await c.tx.query(`SELECT finding_id, grc_issue_id FROM app.audit_finding_links WHERE ${predicate} AND import_id=$4 ORDER BY linked_at`, [...scope(c), r.id])).rows });
async function importRow(c: Context, id: string) {
  return (await c.tx.query(`SELECT * FROM app.audit_imports WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0] ?? refuse(404, 'id', 'not_found');
}
export async function importDocument(c: Context, engagementId: string, input: unknown) {
  const v = D.AuditImportSubmit.parse(input); const e = await engagementRow(c, engagementId);
  let document: AuditDocument;
  try { document = verifyAuditDocument(v.signed, trustedAuditKey()); }
  catch (error) { if (error instanceof AccessError) throw error; refuse(400, 'signed', (error as Error).message === 'UNTRUSTED_SIGNING_KEY' ? 'untrusted_signing_key' : (error as Error).message === 'SIGNATURE_INVALID' ? 'signature_invalid' : 'not_a_signed_audit_document'); throw error; }
  if (document.engagement_code_digest !== e.code_digest) refuse(409, 'signed', 'document_is_for_another_engagement');
  let pdf: Buffer | null = null;
  if (document.kind === 'REPORT') {
    if (!v.pdf_base64) refuse(400, 'pdf_base64', 'report_pdf_required');
    pdf = Buffer.from(v.pdf_base64!, 'base64');
    if (sha256(pdf) !== document.pdf_sha256) refuse(400, 'pdf_base64', 'pdf_does_not_match_signed_report');
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') refuse(400, 'pdf_base64', 'not_a_pdf');
  } else if (v.pdf_base64) refuse(400, 'pdf_base64', 'only_reports_carry_a_pdf');
  const signed = v.signed as { signing_key_id: string; signature: string };
  const id = randomUUID();
  await guarded(() => c.tx.query(`INSERT INTO app.audit_imports (tenant_id, legal_entity_id, environment_id, id, engagement_id, kind, document, document_digest, signing_key_id, signature, pdf, pdf_sha256, imported_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [...scope(c), id, engagementId, document.kind, JSON.stringify(document), sha256(canonicalJson(document)), signed.signing_key_id, signed.signature, pdf, pdf ? sha256(pdf) : null, c.actor.actor_id]));
  await audit(c, `audit_import.${document.kind.toLowerCase()}`, id);
  return importView(c, await importRow(c, id));
}
export async function auditImport(c: Context, id: string) { return importView(c, await importRow(c, id)); }
export async function auditImportPdf(c: Context, id: string) {
  const r = await importRow(c, id);
  if (!r.pdf) refuse(409, 'id', 'no_pdf');
  const e = await engagementRow(c, r.engagement_id);
  return D.AuditImportPdf.parse({ file_name: `orvia-audit-report-${e.engagement_reference.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`, pdf_base64: (r.pdf as Buffer).toString('base64'), pdf_sha256: r.pdf_sha256 });
}
export async function linkFinding(c: Context, id: string, input: unknown) {
  const v = D.FindingLinkCreate.parse(input); const r = await importRow(c, id);
  if (r.kind !== 'FINDINGS') refuse(409, 'id', 'not_a_findings_import');
  const finding = (r.document.findings as { finding_id: string; requirement_id: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; title: string; due_date: string }[]).find(f => f.finding_id === v.finding_id);
  if (!finding) refuse(404, 'finding_id', 'not_in_this_findings_file');
  if ((await c.tx.query(`SELECT 1 FROM app.audit_finding_links WHERE ${predicate} AND finding_id=$4`, [...scope(c), v.finding_id])).rowCount) refuse(409, 'finding_id', 'already_linked');
  const issue = randomUUID();
  await guarded(() => c.tx.query(`INSERT INTO app.grc_issues (tenant_id, legal_entity_id, environment_id, id, source_kind, source_id, title, severity, owner_reference, due_at, control_id, risk_id, created_by)
    VALUES ($1,$2,$3,$4,'EXTERNAL_AUDIT_FINDING',$5,$6,$7,$8,$9,NULL,NULL,$10)`, [...scope(c), issue, v.finding_id, `${finding!.requirement_id}: ${finding!.title}`.slice(0, 300), finding!.severity, 'External DPDPA audit finding', `${finding!.due_date}T23:59:59.000Z`, c.actor.actor_id]));
  await guarded(() => c.tx.query(`INSERT INTO app.audit_finding_links (tenant_id, legal_entity_id, environment_id, import_id, finding_id, grc_issue_id, linked_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [...scope(c), id, v.finding_id, issue, c.actor.actor_id]));
  await audit(c, 'audit_import.finding_linked', issue);
  await issueView(c, issue);
  return importView(c, r);
}
