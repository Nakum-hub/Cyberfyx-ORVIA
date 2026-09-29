import { createHash, createPublicKey, verify } from 'node:crypto';
import { z } from 'zod';
import { canonicalJson } from './canonical.ts';

/**
 * DPDPA external audit exchange (revision 1.5 addendum). The only artefacts
 * that cross between a client's CUSTOMER_INSTALLATION and the vendor's
 * VENDOR_SERVICE installation, always as files carried by a person:
 *
 *   client -> vendor  an audit evidence package: a canonical JSON manifest,
 *                     a SHA-256 per item and a manifest fingerprint;
 *   vendor -> client  request lists, findings and the final report, each a
 *                     document signed with the vendor audit key (Ed25519).
 *
 * Both sides verify with the functions here, so a package the client sealed
 * and a document the vendor signed are checked byte for byte the same way.
 */
const Id = z.uuid();
const Digest = z.string().regex(/^[a-f0-9]{64}$/);
const Time = z.iso.datetime();
const Day = z.iso.date();
export const RequirementId = z.string().regex(/^DPDP-[A-Z0-9-]{2,60}$/);
export const ProvisionId = z.string().regex(/^[A-Z0-9()\-.]{2,40}$/);

export const PersonalDataFlag = z.enum(['YES', 'NO', 'UNKNOWN']);
export const MAX_EVIDENCE_FILE_BYTES = 20 * 1024 * 1024;
export const EvidenceMediaType = z.enum(['application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
export type EvidenceMediaType = z.infer<typeof EvidenceMediaType>;
const extensions: Record<EvidenceMediaType, string[]> = {
  'application/pdf': ['pdf'], 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'], 'text/plain': ['txt'], 'text/csv': ['csv'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
};

/**
 * The media type of a file from its own bytes. Returns null when the bytes are
 * not one of the permitted types, whatever the file name or declared type say.
 * Office documents are ZIP containers told apart by their main part.
 */
export function sniffMediaType(bytes: Uint8Array, fileName: string): EvidenceMediaType | null {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  const claimed = (Object.entries(extensions) as [EvidenceMediaType, string[]][]).find(([, list]) => list.includes(ext))?.[0] ?? null;
  if (!claimed || b.length === 0) return null;
  let actual: EvidenceMediaType | null = null;
  if (b.subarray(0, 5).toString('latin1') === '%PDF-') actual = 'application/pdf';
  else if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) actual = 'image/png';
  else if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) actual = 'image/jpeg';
  else if (b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    const names = b.toString('latin1');
    if (names.includes('word/document.xml')) actual = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (names.includes('xl/workbook.xml')) actual = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (claimed === 'text/plain' || claimed === 'text/csv') {
    // Text: valid UTF-8, no NUL or other control bytes except tab, CR, LF.
    const text = b.toString('utf8');
    if (Buffer.from(text, 'utf8').equals(b) && ![...text].some(ch => { const n = ch.charCodeAt(0); return (n < 32 && n !== 9 && n !== 10 && n !== 13) || n === 127; })) actual = claimed;
  }
  return actual === claimed ? actual : null;
}

export const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');

export const PersonalDataException = z.strictObject({ justification: z.string().trim().min(20).max(1000), approved_by_role: z.enum(['ORG_SUPER_ADMIN', 'ORG_ADMIN']) });
export const PackageItemKind = z.enum(['FILE', 'INDICATOR', 'STATEMENT']);
export const PackageItem = z.strictObject({
  item_id: Id, requirement_id: RequirementId, kind: PackageItemKind, title: z.string().trim().min(1).max(200),
  file_name: z.string().regex(/^[A-Za-z0-9 ._()-]{1,200}$/).nullable(),
  media_type: z.union([EvidenceMediaType, z.literal('application/json')]),
  size_bytes: z.number().int().min(1).max(MAX_EVIDENCE_FILE_BYTES), sha256: Digest,
  contains_personal_data: z.enum(['NO', 'YES']), personal_data_exception: PersonalDataException.nullable(),
}).superRefine((item, c) => {
  if ((item.contains_personal_data === 'YES') !== (item.personal_data_exception !== null)) c.addIssue({ code: 'custom', message: 'Personal data needs, and only personal data carries, an approved exception', path: ['personal_data_exception'] });
  if ((item.kind === 'FILE') !== (item.file_name !== null)) c.addIssue({ code: 'custom', message: 'Only file items carry a file name', path: ['file_name'] });
  if (item.kind === 'INDICATOR' && item.media_type !== 'application/json') c.addIssue({ code: 'custom', message: 'Indicators are JSON', path: ['media_type'] });
  if (item.kind === 'STATEMENT' && item.media_type !== 'text/plain') c.addIssue({ code: 'custom', message: 'Statements are plain text', path: ['media_type'] });
});
export type PackageItem = z.infer<typeof PackageItem>;
export const AUDIT_PACKAGE_FORMAT = 'orvia.dpdpa-audit-package';
export const AuditPackageManifest = z.strictObject({
  format: z.literal(AUDIT_PACKAGE_FORMAT), format_version: z.literal(1),
  package_id: Id, installation_id: Id, organisation_name: z.string().trim().min(2).max(160),
  engagement_code_digest: Digest, firm_name: z.string().trim().min(2).max(160), engagement_reference: z.string().trim().min(1).max(80),
  audit_period: z.strictObject({ from: Day, to: Day }), scope_requirement_ids: z.array(RequirementId).min(1).max(200),
  regulatory_package: z.strictObject({ package_id: z.string().max(120), version: z.string().max(40), kind: z.string().max(40) }).nullable(),
  approval: z.strictObject({ preparer_role: z.enum(['ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER']), approver_role: z.enum(['ORG_SUPER_ADMIN', 'ORG_ADMIN']), distinct_people: z.literal(true), approved_at: Time }),
  created_at: Time, expires_at: Time,
  items: z.array(PackageItem).min(1).max(500),
  revoked_package_ids: z.array(Id).max(500),
}).superRefine((m, c) => {
  if (m.audit_period.from > m.audit_period.to) c.addIssue({ code: 'custom', message: 'Audit period ends before it starts', path: ['audit_period'] });
  if (Date.parse(m.expires_at) <= Date.parse(m.created_at)) c.addIssue({ code: 'custom', message: 'Package expires before it was created', path: ['expires_at'] });
  if (new Set(m.items.map(i => i.item_id)).size !== m.items.length) c.addIssue({ code: 'custom', message: 'Item identifiers are unique', path: ['items'] });
  const scope = new Set(m.scope_requirement_ids);
  for (const item of m.items) if (!scope.has(item.requirement_id)) c.addIssue({ code: 'custom', message: 'Every item belongs to a requirement in scope', path: ['items'] });
});
export type AuditPackageManifest = z.infer<typeof AuditPackageManifest>;
export const AuditPackageFile = z.strictObject({
  manifest: z.unknown(), manifest_fingerprint: Digest,
  contents: z.record(z.string(), z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/)),
});
export const manifestFingerprint = (manifest: AuditPackageManifest) => sha256(canonicalJson(manifest));
/** The package file as written: canonical bytes, so the same package always produces the same file. */
export function packageFileBytes(manifest: AuditPackageManifest, contents: Map<string, Buffer>) {
  const parsed = AuditPackageManifest.parse(manifest);
  return Buffer.from(canonicalJson({ manifest: parsed, manifest_fingerprint: manifestFingerprint(parsed),
    contents: Object.fromEntries(parsed.items.map(i => [i.item_id, contents.get(i.item_id)!.toString('base64')])) }), 'utf8');
}

export type PackageProblem = 'NOT_A_PACKAGE' | 'MANIFEST_INVALID' | 'FINGERPRINT_MISMATCH' | 'ITEM_MISSING' | 'ITEM_UNEXPECTED' | 'ITEM_HASH_MISMATCH' | 'ITEM_SIZE_MISMATCH' | 'ITEM_TYPE_MISMATCH' | 'EXPIRED';
/**
 * Verifies a package file without trusting anything it says about itself: the
 * fingerprint is recomputed from the canonical manifest, every item's bytes are
 * hashed and sized, and every file's type is read from its own bytes.
 */
export function verifyPackageFile(bytes: Uint8Array, now = new Date()): { ok: true; manifest: AuditPackageManifest; contents: Map<string, Buffer> } | { ok: false; problems: PackageProblem[]; manifest: AuditPackageManifest | null } {
  let raw: unknown;
  try { raw = JSON.parse(Buffer.from(bytes).toString('utf8')); } catch { return { ok: false, problems: ['NOT_A_PACKAGE'], manifest: null }; }
  const file = AuditPackageFile.safeParse(raw);
  if (!file.success) return { ok: false, problems: ['NOT_A_PACKAGE'], manifest: null };
  const manifest = AuditPackageManifest.safeParse(file.data.manifest);
  if (!manifest.success) return { ok: false, problems: ['MANIFEST_INVALID'], manifest: null };
  const problems = new Set<PackageProblem>();
  // The fingerprint is over the manifest exactly as it appears in the file, so any change to it is seen.
  if (sha256(canonicalJson(file.data.manifest)) !== file.data.manifest_fingerprint) problems.add('FINGERPRINT_MISMATCH');
  const contents = new Map<string, Buffer>();
  const expected = new Set(manifest.data.items.map(i => i.item_id));
  for (const key of Object.keys(file.data.contents)) if (!expected.has(key)) problems.add('ITEM_UNEXPECTED');
  for (const item of manifest.data.items) {
    const encoded = file.data.contents[item.item_id];
    if (encoded === undefined) { problems.add('ITEM_MISSING'); continue; }
    const content = Buffer.from(encoded, 'base64');
    if (content.toString('base64') !== encoded) { problems.add('ITEM_HASH_MISMATCH'); continue; }
    if (content.length !== item.size_bytes) problems.add('ITEM_SIZE_MISMATCH');
    if (sha256(content) !== item.sha256) problems.add('ITEM_HASH_MISMATCH');
    if (item.kind === 'FILE' && sniffMediaType(content, item.file_name!) !== item.media_type) problems.add('ITEM_TYPE_MISMATCH');
    if (item.kind === 'INDICATOR') { try { JSON.parse(content.toString('utf8')); } catch { problems.add('ITEM_TYPE_MISMATCH'); } }
    contents.set(item.item_id, content);
  }
  if (Date.parse(manifest.data.expires_at) <= now.getTime()) problems.add('EXPIRED');
  return problems.size ? { ok: false, problems: [...problems], manifest: manifest.data } : { ok: true, manifest: manifest.data, contents };
}

// Signed documents returned by the vendor.
export const Severity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const RequirementResult = z.enum(['MEETS', 'PARTIALLY_MEETS', 'DOES_NOT_MEET', 'NOT_APPLICABLE', 'NOT_TESTED']);
const Engagement = { engagement_code_digest: Digest, engagement_reference: z.string().max(80), firm_name: z.string().max(160), organisation_name: z.string().max(160), issued_at: Time };
const Text = (max: number) => z.string().trim().min(1).max(max);
export const RequestListDocument = z.strictObject({ kind: z.literal('REQUEST_LIST'), ...Engagement,
  requests: z.array(z.strictObject({ request_id: Id, requirement_id: RequirementId, description: Text(2000), due_date: Day })).max(500) });
export const FindingEntry = z.strictObject({ finding_id: Id, requirement_id: RequirementId, provision_ids: z.array(ProvisionId).max(10), severity: Severity,
  title: Text(200), observation: Text(4000), recommendation: Text(4000), due_date: Day,
  status: z.enum(['OPEN', 'CLIENT_RESPONDED', 'RETEST_PASSED', 'RETEST_FAILED', 'CLOSED']),
  // Audit-practice fields (task AUDIT-PRACTICE-01); absent from documents signed before them.
  criterion_type: z.enum(['STATUTORY', 'CONTRACTUAL', 'ADVISORY']).optional(), affected_scope: Text(2000).optional(), cause: Text(4000).optional(), consequence: Text(4000).optional(),
  severity_rationale: Text(4000).optional(), orvia_guidance: Text(4000).optional(),
  closure_type: z.enum(['VERIFIED_REMEDIATION', 'RISK_ACCEPTED', 'ENGAGEMENT_WITHDRAWN', 'ADMINISTRATIVE']).optional() });
export const FindingsDocument = z.strictObject({ kind: z.literal('FINDINGS'), ...Engagement, findings: z.array(FindingEntry).max(500) });
export const ReportDocument = z.strictObject({ kind: z.literal('REPORT'), ...Engagement,
  report_id: Id, version: z.number().int().min(1).max(1000), opinion_as_of: Day,
  scope: z.strictObject({ requirement_ids: z.array(RequirementId).min(1).max(200), period: z.strictObject({ from: Day, to: Day }) }),
  method: Text(4000), results: z.array(z.strictObject({ requirement_id: RequirementId, result: RequirementResult, rationale: Text(2000) })).min(1).max(200),
  findings: z.array(FindingEntry.pick({ finding_id: true, requirement_id: true, severity: true, title: true, status: true, closure_type: true })).max(500),
  opinion: Text(4000), limitations: z.array(Text(1000)).min(1).max(20), independence_statement: Text(2000),
  empanelment_reference: z.string().trim().min(1).max(120).nullable(),
  drafted_by_role: z.literal('LEAD_AUDITOR'), approved_by_role: z.literal('AUDIT_REVIEWER'), pdf_sha256: Digest,
  // Audit-practice fields (task AUDIT-PRACTICE-01): the approved snapshot the signature is bound to, what the report may be relied on for, and visible marks.
  executive_summary: Text(8000).optional(), snapshot_digest: Digest.optional(), use_kind: z.enum(['SYNTHETIC', 'REAL']).optional(), watermarks: z.array(Text(300)).max(5).optional(),
  criteria: z.strictObject({ version: z.string().max(40), distribution: z.enum(['TEST_FIXTURE', 'PRODUCTION']), digest: Digest }).optional(),
  coverage: z.array(z.strictObject({ requirement_id: RequirementId, procedures: z.number().int().min(0), working_papers: z.number().int().min(0), evidence: z.number().int().min(0), conclusion: z.string().max(60) })).max(200).optional(),
  reliance: Text(1000).optional(), supersedes_report_id: Id.optional(), correction_reason: Text(2000).optional() });
export const AuditDocument = z.discriminatedUnion('kind', [RequestListDocument, FindingsDocument, ReportDocument]);
export type AuditDocument = z.infer<typeof AuditDocument>;
export const SignedAuditDocument = z.strictObject({ algorithm: z.literal('Ed25519'), signing_key_id: z.string().min(1).max(120), document: z.unknown(), signature: z.string().regex(/^[A-Za-z0-9_-]{40,200}$/) });
export type SignedAuditDocument = z.infer<typeof SignedAuditDocument>;

/** Verifies a signed audit document with the audit public key an installation trusts. Throws on any mismatch. */
export function verifyAuditDocument(signed: unknown, trusted: { key_id: string; public: string }): AuditDocument {
  const s = SignedAuditDocument.parse(signed);
  if (s.signing_key_id !== trusted.key_id) throw new Error('UNTRUSTED_SIGNING_KEY');
  const key = createPublicKey({ key: Buffer.from(trusted.public, 'base64'), format: 'der', type: 'spki' });
  if (!verify(null, Buffer.from(canonicalJson(s.document), 'utf8'), key, Buffer.from(s.signature, 'base64url'))) throw new Error('SIGNATURE_INVALID');
  return AuditDocument.parse(s.document);
}

/**
 * Wording guard for anything ORVIA presents as an audit output. The output is
 * an audit opinion as of a date for a stated scope; only the Data Protection
 * Board of India decides compliance, so certification language is refused.
 */
const forbidden: [RegExp, string][] = [
  [/\bcertif(y|ied|ies|ying|ication|icate)\b/i, 'certification wording'],
  [/\bcompliance\s+certificate\b/i, 'compliance certificate'],
  [/\b(fully|100%)\s+compliant\b/i, 'absolute compliance claim'],
  [/\bguarantee(d|s)?\b/i, 'guarantee'],
  [/\bapproved\s+by\s+the\s+(data\s+protection\s+)?board\b/i, 'Board approval claim'],
];
export function wordingProblems(text: string) { return forbidden.filter(([pattern]) => pattern.test(text)).map(([, name]) => name); }
export function assertAttestationWording(...texts: string[]) {
  const problems = [...new Set(texts.flatMap(wordingProblems))];
  if (problems.length) throw Object.assign(new Error('WORDING_REFUSED'), { problems });
}
