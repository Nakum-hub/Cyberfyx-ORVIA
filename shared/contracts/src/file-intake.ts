import { z } from 'zod';

/**
 * File intake (owner decisions 2026-10-02, revision 1.12). Every kind of file ORVIA uses arrives one of two ways, on every
 * plan: automatically, from a local inbox folder on the installation server, or by manual upload in the workspace. Either
 * way it is staged, and nothing it contains is applied until a staff member approves it. On approval it is routed into the
 * existing path for its kind, where that path's own review still applies (a data-inventory batch still waits in quarantine,
 * existing-data rows still wait for processing), or it is kept as a document, optionally linked to a record.
 * Registered in the canonical customer contract by index.ts.
 */
const Id = z.uuid();
const Time = z.iso.datetime();
const SafeText = z.string().min(1).max(500);
type Route = { maximum_body_bytes?: number; id: string; method: 'get' | 'post'; path: string; authority: 'STAFF'; request?: string; response: string; status: 200 | 201; params?: string; idempotency?: boolean; capability: string };
const A = '/api/v1/admin';

/** 10 MiB per file. A larger export is split before it is dropped or uploaded. */
export const FILE_INTAKE_MAX_BYTES = 10_485_760;
/** CONSENT_EXPORT and PRIVACY_REQUESTS (contract 0.61.0): CSV exports from the organisation's own systems, recognised by header. */
export const FileIntakeKind = z.enum(['LICENCE', 'RELEASE', 'REGULATORY_PACKAGE', 'DATA_ASSET_INVENTORY', 'ESTATE_ROWS', 'CONSENT_EXPORT', 'PRIVACY_REQUESTS', 'DOCUMENT', 'UNRECOGNISED']);
export const FileIntakeSource = z.enum(['MANUAL_UPLOAD', 'INBOX_FOLDER']);
export const FileIntakeState = z.enum(['STAGED', 'ROUTED', 'KEPT', 'REJECTED']);
export const FileIntakeSubjectKind = z.enum(['PROCESSOR', 'SYSTEM', 'INCIDENT', 'BREACH', 'RIGHTS_REQUEST', 'PURPOSE', 'NOTICE']);
/** Extensions ORVIA reads. Anything else is staged as UNRECOGNISED and can only be rejected. */
export const FILE_INTAKE_TYPES: Record<string, string> = {
  json: 'application/json', jsonl: 'application/x-ndjson', csv: 'text/csv', txt: 'text/plain', pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
};
const FileName = z.string().regex(/^[^/\\\p{Cc}]{1,200}$/u);

export const FileIntakeUpload = z.strictObject({
  file_name: FileName,
  content_base64: z.string().min(4).max(Math.ceil(FILE_INTAKE_MAX_BYTES / 3) * 4 + 4),
});
export const FileIntakeItem = z.strictObject({
  id: Id, source: FileIntakeSource, original_name: z.string().max(200), content_type: z.string().max(100), size_bytes: z.number().int().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/), detected_kind: FileIntakeKind, detail: SafeText, state: FileIntakeState,
  received_at: Time, received_by: Id,
  decided_at: Time.nullable(), decided_by: Id.nullable(), decision_reason: SafeText.nullable(),
  routed_resource_id: Id.nullable(), subject_kind: FileIntakeSubjectKind.nullable(), subject_id: Id.nullable(),
  /** Where approval sends it, in words, so the approver knows what happens next. */
  on_approval: SafeText,
  /** The capability approval needs for this kind (e.g. licence.manage for a licence). */
  approval_capability: z.string().max(80).nullable(),
});
export const FileIntakeList = z.strictObject({
  items: z.array(FileIntakeItem).max(200),
  inbox: z.strictObject({
    configured: z.boolean(),
    /** The folder this scope's files are dropped into, on the installation server. */
    folder: z.string().max(400).nullable(),
    accepted_extensions: z.array(z.string().max(10)).max(20),
    max_bytes: z.number().int(),
  }),
  limits: z.array(SafeText).max(8),
});
export const FileIntakeDecision = z.strictObject({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().min(3).max(500),
  /** Documents only: the record the document belongs to. */
  subject_kind: FileIntakeSubjectKind.nullable().default(null),
  subject_id: Id.nullable().default(null),
}).superRefine((d, c) => {
  if ((d.subject_kind === null) !== (d.subject_id === null)) c.addIssue({ code: 'custom', message: 'A subject names both its kind and its id' });
  if (d.decision === 'REJECT' && d.subject_kind !== null) c.addIssue({ code: 'custom', message: 'A rejected file is not linked to a record' });
});
export const FileIntakeContent = z.strictObject({ id: Id, original_name: z.string().max(200), content_type: z.string().max(100), content_base64: z.string() });

export const fileIntakeSchemas = { FileIntakeUpload, FileIntakeItem, FileIntakeList, FileIntakeDecision, FileIntakeContent };
export const fileIntakeRoutes: Route[] = [
  { id: 'list_file_intake', method: 'get', path: `${A}/file-intake`, authority: 'STAFF', response: 'FileIntakeList', status: 200, capability: 'registry.read' },
  { id: 'upload_file', method: 'post', path: `${A}/file-intake`, authority: 'STAFF', request: 'FileIntakeUpload', response: 'FileIntakeItem', status: 201, capability: 'registry.write', idempotency: true, maximum_body_bytes: Math.ceil(FILE_INTAKE_MAX_BYTES / 3) * 4 + 4096 },
  { id: 'file_intake_item', method: 'get', path: `${A}/file-intake/{id}`, authority: 'STAFF', params: 'IdPath', response: 'FileIntakeItem', status: 200, capability: 'registry.read' },
  { id: 'file_intake_content', method: 'get', path: `${A}/file-intake/{id}/content`, authority: 'STAFF', params: 'IdPath', response: 'FileIntakeContent', status: 200, capability: 'registry.read' },
  { id: 'decide_file_intake', method: 'post', path: `${A}/file-intake/{id}/decision`, authority: 'STAFF', params: 'IdPath', request: 'FileIntakeDecision', response: 'FileIntakeItem', status: 200, capability: 'registry.write', idempotency: true },
];
