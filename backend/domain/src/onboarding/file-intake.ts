import { createHash, randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import * as O from '../../../../shared/contracts/src/operations.ts';
import { RegulatoryPackageImport } from '../../../../shared/contracts/src/regulatory.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, type Context } from '../shared/transaction.ts';
import { importLicence, requireEntitlement } from '../licensing/licensing.ts';
import { importRelease } from '../updates/updates.ts';
import { submitImport } from './imports.ts';
import { importPackage } from '../regulatory/packages.ts';
import { createJob, appendRows } from '../operations/bulk-import.ts';
import { isText, isOffice } from './document-types.ts';

/**
 * File intake (revision 1.12, migration 0103). A file arrives from the local inbox folder (the worker) or by manual upload
 * (staff); either way it is staged and nothing in it is applied until a staff member approves it. Approval routes it into
 * the existing path for its kind, as the approver, with that path's capability and plan checks, so a file is never a way
 * around a check the equivalent screen would apply. The kind is decided by the contract schemas themselves: a file is a
 * licence only if it parses as a signed licence, and so on. A file that parses as nothing ORVIA reads is UNRECOGNISED and
 * can only be rejected.
 */
type Kind = typeof S.FileIntakeKind.options[number];
type Detection = { kind: Kind; content_type: string; detail: string; parsed?: unknown };
const ROUTE_FOR: Partial<Record<Kind, string>> = {
  LICENCE: 'import_licence', RELEASE: 'import_release', REGULATORY_PACKAGE: 'import_regulatory_package',
  DATA_ASSET_INVENTORY: 'submit_import', ESTATE_ROWS: 'create_bulk_job',
};
const ON_APPROVAL: Record<Kind, string> = {
  LICENCE: 'Imported as the installation licence; its signature, installation and sequence are checked on import.',
  RELEASE: 'Imported as a release; its signature is checked and it waits for an update plan.',
  REGULATORY_PACKAGE: 'Imported as a regulatory package; it waits for its own adoption decision.',
  DATA_ASSET_INVENTORY: 'Submitted as a data-inventory import; the batch waits in quarantine for row decisions and apply.',
  ESTATE_ROWS: 'Uploaded as an existing-data onboarding job; rows are applied when the job is processed.',
  DOCUMENT: 'Kept as a document, optionally linked to a record.',
  UNRECOGNISED: 'Cannot be approved: ORVIA does not read this file. Reject it, or fix and drop it again.',
};
const SUBJECT_TABLE: Record<string, string> = {
  PROCESSOR: 'processors', SYSTEM: 'systems', INCIDENT: 'incidents', BREACH: 'personal_data_breaches', RIGHTS_REQUEST: 'rights_requests',
  PURPOSE: 'registry_purposes', NOTICE: 'registry_notices',
};
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  pdf: b => b.subarray(0, 5).toString('latin1') === '%PDF-',
  png: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpg: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  docx: b => isOffice(b, 'docx'),
  xlsx: b => isOffice(b, 'xlsx'),
  txt: isText,
  csv: isText,
};
const extension = (name: string) => (/\.([A-Za-z0-9]{1,10})$/.exec(name)?.[1] ?? '').toLowerCase();
const firstIssue = (error: { issues: { path: PropertyKey[]; message: string }[] }) => { const i = error.issues[0]; return i ? `${i.path.join('.') || 'file'}: ${i.message}`.slice(0, 200) : 'not readable'; };

/** Decide what a file is from its name and content alone. Pure: used by upload, the inbox worker and the unit tests. */
export function detectFile(name: string, bytes: Buffer): Detection {
  const ext = extension(name);
  const content_type = S.FILE_INTAKE_TYPES[ext] ?? 'application/octet-stream';
  if (!S.FILE_INTAKE_TYPES[ext]) return { kind: 'UNRECOGNISED', content_type, detail: `ORVIA does not read .${ext || '(no extension)'} files. Accepted: ${Object.keys(S.FILE_INTAKE_TYPES).join(', ')}.` };
  if (MAGIC[ext] && !MAGIC[ext](bytes)) return { kind: 'UNRECOGNISED', content_type, detail: `The content is not a ${ext.toUpperCase()} file, whatever its name says.` };
  if (ext === 'jsonl') {
    const lines = bytes.toString('utf8').split(/\r?\n/).filter(l => l.trim());
    const rows: unknown[] = [];
    for (const [i, line] of lines.entries()) {
      let value: unknown; try { value = JSON.parse(line); } catch { return { kind: 'UNRECOGNISED', content_type, detail: `Line ${i + 1} is not JSON.` }; }
      const row = O.EstateRow.safeParse(value);
      if (!row.success) return { kind: 'UNRECOGNISED', content_type, detail: `Line ${i + 1} is not an existing-data row (${firstIssue(row.error)}).` };
      rows.push(row.data);
    }
    if (!rows.length) return { kind: 'UNRECOGNISED', content_type, detail: 'The file has no rows.' };
    return { kind: 'ESTATE_ROWS', content_type, detail: `Existing-data onboarding: ${rows.length} row(s).`, parsed: rows };
  }
  if (ext === 'json') {
    let value: unknown; try { value = JSON.parse(bytes.toString('utf8')); } catch { return { kind: 'UNRECOGNISED', content_type, detail: 'The file is not valid JSON.' }; }
    const object = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
    const licence = S.LicenceImport.safeParse(object && 'licence' in object ? object : { licence: value });
    if (licence.success) { const c = licence.data.licence.claims; return { kind: 'LICENCE', content_type, detail: `Signed licence: ${c.edition}, valid ${c.valid_from.slice(0, 10)} to ${c.valid_to.slice(0, 10)}. The signature is checked on approval.`, parsed: licence.data }; }
    const release = S.ReleaseImport.safeParse(object && 'release' in object ? object : { release: value });
    if (release.success) return { kind: 'RELEASE', content_type, detail: 'Signed release. The signature is checked on approval.', parsed: release.data };
    const pack = RegulatoryPackageImport.safeParse(object && 'package' in object ? object : { package: value });
    if (pack.success) return { kind: 'REGULATORY_PACKAGE', content_type, detail: 'Signed regulatory package. The signature is checked on approval.', parsed: pack.data };
    const inventory = S.ImportSubmit.safeParse(value);
    if (inventory.success) return { kind: 'DATA_ASSET_INVENTORY', content_type, detail: `Data inventory from ${inventory.data.source_reference}: ${inventory.data.rows.length} row(s) as at ${inventory.data.captured_at.slice(0, 10)}.`, parsed: inventory.data };
    if (Array.isArray(value)) {
      const rows = O.BulkJobAppend.shape.rows.safeParse(value.length > 500 ? value.slice(0, 500) : value);
      const all = value.every(v => O.EstateRow.safeParse(v).success);
      if (rows.success && all && value.length) return { kind: 'ESTATE_ROWS', content_type, detail: `Existing-data onboarding: ${value.length} row(s).`, parsed: value };
      const bad = value.findIndex(v => !O.EstateRow.safeParse(v).success);
      if (bad >= 0) return { kind: 'UNRECOGNISED', content_type, detail: `Item ${bad + 1} is not an existing-data row (${firstIssue(O.EstateRow.safeParse(value[bad]).error!)}).` };
    }
    // Closest match, so the person fixing the file knows what was wrong.
    const hint = object && 'rows' in object ? `Not a data inventory (${firstIssue(inventory.error!)}).`
      : object && ('licence' in object || 'claims' in object) ? `Not a valid signed licence (${firstIssue(licence.error!)}).`
      : 'JSON, but not a licence, release, regulatory package, data inventory or existing-data rows.';
    return { kind: 'UNRECOGNISED', content_type, detail: hint };
  }
  const label: Record<string, string> = { csv: 'CSV document (kept as a document; data imports use the JSON formats)', txt: 'Text document', pdf: 'PDF document', docx: 'Word document', xlsx: 'Spreadsheet', png: 'Image', jpg: 'Image', jpeg: 'Image' };
  return { kind: 'DOCUMENT', content_type, detail: `${label[ext]}.` };
}

const COLUMNS = 'id,source,original_name,content_type,size_bytes,sha256,detected_kind,detail,state,received_at,received_by,decided_at,decided_by,decision_reason,routed_resource_id,subject_kind,subject_id';
const iso = (v: Date | null) => v ? v.toISOString() : null;
type Row = { id: string; source: string; original_name: string; content_type: string; size_bytes: number; sha256: string; detected_kind: Kind; detail: string; state: string;
  received_at: Date; received_by: string; decided_at: Date | null; decided_by: string | null; decision_reason: string | null; routed_resource_id: string | null; subject_kind: string | null; subject_id: string | null };
function view(r: Row) {
  const route = ROUTE_FOR[r.detected_kind];
  return S.FileIntakeItem.parse({
    id: r.id, source: r.source, original_name: r.original_name, content_type: r.content_type, size_bytes: r.size_bytes, sha256: r.sha256,
    detected_kind: r.detected_kind, detail: r.detail, state: r.state, received_at: iso(r.received_at), received_by: r.received_by,
    decided_at: iso(r.decided_at), decided_by: r.decided_by, decision_reason: r.decision_reason, routed_resource_id: r.routed_resource_id,
    subject_kind: r.subject_kind, subject_id: r.subject_id, on_approval: ON_APPROVAL[r.detected_kind],
    approval_capability: r.detected_kind === 'UNRECOGNISED' ? null : route ? S.routes.find(x => x.id === route)!.capability ?? null : 'registry.write',
  });
}

/** Stage one file. The same content arriving again (dropped twice, or uploaded after it was dropped) is the same item. */
export async function stageFile(c: Context, source: 'MANUAL_UPLOAD' | 'INBOX_FOLDER', name: string, bytes: Buffer) {
  if (bytes.length < 1 || bytes.length > S.FILE_INTAKE_MAX_BYTES) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'file', code: 'size_out_of_range' }]);
  const safeName = name.replace(/[/\\\p{Cc}]/gu, '_').slice(0, 200) || 'file';
  const found = detectFile(safeName, bytes);
  const sha = createHash('sha256').update(bytes).digest('hex');
  const s = scopeValues(c.actor);
  const row = (await c.tx.query(`INSERT INTO app.file_intake_items(tenant_id,legal_entity_id,environment_id,id,source,original_name,content_type,size_bytes,sha256,detected_kind,detail,content,received_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (tenant_id,legal_entity_id,environment_id,sha256) DO NOTHING RETURNING ${COLUMNS}`,
  [...s, randomUUID(), source, safeName, found.content_type, bytes.length, sha, found.kind, found.detail.slice(0, 500), bytes, c.actor.actor_id])).rows[0];
  if (row) { await audit(c, 'file_intake.stage', row.id); return { item: view(row), duplicate: false }; }
  const existing = (await c.tx.query(`SELECT ${COLUMNS} FROM app.file_intake_items WHERE ${predicate} AND sha256=$4`, [...s, sha])).rows[0];
  return { item: view(existing), duplicate: true };
}

export async function uploadFile(c: Context, input: unknown) {
  const value = S.FileIntakeUpload.parse(input);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value.content_base64) || value.content_base64.length % 4 !== 0) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'content_base64', code: 'not_base64' }]);
  return (await stageFile(c, 'MANUAL_UPLOAD', value.file_name, Buffer.from(value.content_base64, 'base64'))).item;
}

export async function listFileIntake(c: Context, inboxFolder: string | null) {
  const rows = (await c.tx.query(`SELECT ${COLUMNS} FROM app.file_intake_items WHERE ${predicate} ORDER BY received_at DESC, id LIMIT 200`, scopeValues(c.actor))).rows;
  return S.FileIntakeList.parse({
    items: rows.map(view),
    inbox: { configured: inboxFolder !== null, folder: inboxFolder, accepted_extensions: Object.keys(S.FILE_INTAKE_TYPES), max_bytes: S.FILE_INTAKE_MAX_BYTES },
    limits: [
      'Nothing in a file is applied until a staff member approves it; approval runs the same checks as the equivalent screen.',
      'Files are matched by content: the same file dropped or uploaded twice is one item.',
      'A rejected file\'s content is removed; the record that it arrived, its digest, who rejected it and why are kept.',
      `At most ${S.FILE_INTAKE_MAX_BYTES / 1_048_576} MiB per file; split larger exports.`,
    ],
  });
}

async function locked(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT ${COLUMNS},content FROM app.file_intake_items WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scopeValues(c.actor), id])).rows[0];
  if (!row) throw new AccessError(404, 'NOT_FOUND');
  return row;
}
export async function readFileIntake(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT ${COLUMNS} FROM app.file_intake_items WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows[0];
  if (!row) throw new AccessError(404, 'NOT_FOUND');
  return view(row);
}
export async function readFileIntakeContent(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT id,original_name,content_type,detected_kind,content FROM app.file_intake_items WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows[0];
  if (!row) throw new AccessError(404, 'NOT_FOUND');
  if (!row.content) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'content', code: 'content_not_kept' }]);
  if (row.detected_kind === 'UNRECOGNISED') throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'content', code: 'unrecognised_files_can_only_be_rejected' }]);
  await audit(c, 'file_intake.read_content', id);
  return S.FileIntakeContent.parse({ id: row.id, original_name: row.original_name, content_type: row.content_type, content_base64: (row.content as Buffer).toString('base64') });
}

/** Approve or reject a staged file. Approval runs the target path as the approver; if that path refuses, nothing changes. */
export async function decideFileIntake(c: Context, id: string, input: unknown, installationId: string) {
  const value = S.FileIntakeDecision.parse(input);
  const row = await locked(c, id);
  if (row.state !== 'STAGED') throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'state', code: 'already_decided' }]);
  const s = scopeValues(c.actor);
  if (value.decision === 'REJECT') {
    const done = (await c.tx.query(`UPDATE app.file_intake_items SET state='REJECTED', content=NULL, decided_at=clock_timestamp(), decided_by=$5, decision_reason=$6
      WHERE ${predicate} AND id=$4 RETURNING ${COLUMNS}`, [...s, id, c.actor.actor_id, value.reason])).rows[0];
    await audit(c, 'file_intake.reject', id);
    return view(done);
  }
  const kind = row.detected_kind as Kind;
  if (kind === 'UNRECOGNISED') throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'decision', code: 'unrecognised_files_can_only_be_rejected' }]);
  if (kind !== 'DOCUMENT' && value.subject_kind) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'subject_kind', code: 'only_documents_are_linked' }]);
  if (kind === 'DOCUMENT') {
    if (value.subject_kind) {
      const exists = (await c.tx.query(`SELECT 1 FROM app.${SUBJECT_TABLE[value.subject_kind]} WHERE ${predicate} AND id=$4`, [...s, value.subject_id])).rowCount;
      if (!exists) throw new AccessError(404, 'NOT_FOUND', [{ field: 'subject_id', code: 'subject_not_found' }]);
    }
    const done = (await c.tx.query(`UPDATE app.file_intake_items SET state='KEPT', decided_at=clock_timestamp(), decided_by=$5, decision_reason=$6, subject_kind=$7, subject_id=$8
      WHERE ${predicate} AND id=$4 RETURNING ${COLUMNS}`, [...s, id, c.actor.actor_id, value.reason, value.subject_kind, value.subject_id])).rows[0];
    await audit(c, 'file_intake.keep', id);
    return view(done);
  }
  // Same authority and plan checks as the screen that imports this kind of file.
  const route = S.routes.find(r => r.id === ROUTE_FOR[kind])!;
  if (!c.actor.capabilities.includes(route.capability!)) throw new AccessError(403, 'FORBIDDEN', [{ field: 'capability', code: route.capability!.replace(/\./g, '_') }]);
  await requireEntitlement(c, route);
  const parsed = detectFile(row.original_name, row.content as Buffer).parsed;
  let resource: string;
  if (kind === 'LICENCE') resource = (await importLicence(c, parsed, installationId)).licence_id;
  else if (kind === 'RELEASE') resource = (await importRelease(c, parsed)).id;
  else if (kind === 'REGULATORY_PACKAGE') resource = (await importPackage(c, parsed)).id;
  else if (kind === 'DATA_ASSET_INVENTORY') resource = (await submitImport(c, parsed)).id;
  else {
    const rows = parsed as unknown[];
    const job = await createJob(c, { source_label: `File ${row.original_name}`.slice(0, 120), mapping_version: 'file-intake-1' });
    for (let first = 0; first < rows.length; first += 500) await appendRows(c, job.id, { first_ordinal: first, rows: rows.slice(first, first + 500) });
    resource = job.id;
  }
  // The data now lives where it was routed; the staged copy is not kept twice.
  const done = (await c.tx.query(`UPDATE app.file_intake_items SET state='ROUTED', content=NULL, decided_at=clock_timestamp(), decided_by=$5, decision_reason=$6, routed_resource_id=$7
    WHERE ${predicate} AND id=$4 RETURNING ${COLUMNS}`, [...s, id, c.actor.actor_id, value.reason, resource])).rows[0];
  await audit(c, 'file_intake.route', id);
  return view(done);
}

/** The installation's inbox root: ORVIA_FILE_INBOX_DIR, or file-inbox under the profile directory. */
export function fileInboxRoot(profileDirectory: string) {
  return (process.env.ORVIA_FILE_INBOX_DIR || `${profileDirectory.replace(/[\\/]+$/, '')}/file-inbox`);
}
/** The inbox folder of one scope on the installation server, or null when this installation has none. */
export function inboxFolderFor(root: string | null, environmentId: string) {
  return root ? `${root.replace(/[\\/]+$/, '')}/${environmentId}/incoming` : null;
}
