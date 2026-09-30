import { createHash, createHmac, createPrivateKey, createPublicKey, generateKeyPairSync, sign, timingSafeEqual, verify } from 'node:crypto';
import { z } from 'zod';
import { canonicalJson } from './canonical.ts';
import { RequirementId, EvidenceCategory, SamplePopulation, MandateKind, MandateSchedule, MandateState } from './audit-primitives.ts';
export { EvidenceCategory, SamplePopulation, MandateKind, MandateSchedule, MandateState };

/**
 * DPDPA audit mandate channel (revision 1.6 addendum,
 * docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md).
 *
 * The only connection between a client's CUSTOMER_INSTALLATION and the
 * vendor's VENDOR_SERVICE installation. It is always opened by the client's
 * background worker, outbound, to the single audit address in the client's
 * trust file, and only while a dual-approved mandate is active. Requests are
 * authenticated with a key derived from the engagement code; what the client
 * sends is signed by the installation's evidence key; what the vendor answers
 * is signed by the vendor audit key. Both sides use the functions here.
 */
const Id = z.uuid();
const Digest = z.string().regex(/^[a-f0-9]{64}$/);
const Time = z.iso.datetime();
const Day = z.iso.date();
const Base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/);
const Label = z.string().trim().min(1).max(200);

// ---------------------------------------------------------------- channel key and request authentication
const normalise = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');
/** The channel key both sides derive from the one-time engagement code; neither keeps the code itself. */
export const channelKey = (engagementCode: string) => createHmac('sha256', normalise(engagementCode)).update('orvia-audit-channel-v1').digest();
export const CHANNEL_CLOCK_SKEW_SECONDS = 300;
export const channelSignature = (key: Buffer, timestamp: string, body: Uint8Array | string) =>
  createHmac('sha256', key).update(`${timestamp}.${createHash('sha256').update(body).digest('hex')}`).digest('hex');
/** True only for a well-formed signature by this key over this body, with a timestamp within the permitted clock skew. */
export function channelSignatureValid(key: Buffer, timestamp: string, body: Uint8Array | string, signature: string, now = Date.now()) {
  if (!/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > CHANNEL_CLOCK_SKEW_SECONDS) return false;
  return timingSafeEqual(Buffer.from(channelSignature(key, timestamp, body), 'hex'), Buffer.from(signature, 'hex'));
}
export const CHANNEL_HEADERS = { engagement: 'x-orvia-engagement', timestamp: 'x-orvia-timestamp', signature: 'x-orvia-channel-signature' } as const;
export const CHANNEL_CONTENT_TYPE = 'application/vnd.orvia.audit-channel+json';
export const MAX_CHANNEL_BODY_BYTES = 4 * 1024 * 1024;

// ---------------------------------------------------------------- evidence categories
export type EvidenceCategory = z.infer<typeof EvidenceCategory>;
/**
 * Populations an auditor may sample automatically. Each is a set of records in
 * the client's ORVIA with a yes/no test; only counts and a digest of the
 * selected identifiers ever leave, never the records.
 */
export type SamplePopulation = z.infer<typeof SamplePopulation>;
export const samplePopulationLabels: Record<SamplePopulation, { population: string; test: string }> = {
  CONSENT_EVENTS_WITH_EVIDENCE: { population: 'Consent record events', test: 'evidence of the event is available' },
  BREACH_TASKS_WITHIN_TIMER: { population: 'Completed breach intimation and reporting tasks with a due time', test: 'completed on or before the due time' },
  GRIEVANCES_RESOLVED_WITHIN_90_DAYS: { population: 'Grievances completed, rejected or closed', test: 'closed within 90 days of receipt' },
  WITHDRAWAL_RUNS_VERIFIED: { population: 'Finished consent-withdrawal propagation runs', test: 'completed with independent verification' },
};
/**
 * Deterministic selection by the auditor's seed: members are ordered by
 * HMAC-SHA256(seed, id) and the first n taken. The client cannot choose which
 * records are tested, and the vendor can recompute the selection digest if the
 * identifiers are later shown to it during fieldwork.
 */
export function seededSelection<T extends { id: string }>(members: T[], seedHex: string, size: number): T[] {
  const seed = Buffer.from(seedHex, 'hex');
  return members.map(m => ({ m, k: createHmac('sha256', seed).update(m.id).digest('hex') })).sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : 0).slice(0, size).map(x => x.m);
}
export const selectionDigest = (ids: string[]) => createHash('sha256').update(ids.join('\n')).digest('hex');

// ---------------------------------------------------------------- installation evidence key
export type EvidenceKey = { key_id: string; public: string; private: string };
export const evidenceKeyId = (publicDerBase64: string) => 'orvia-installation-' + createHash('sha256').update(Buffer.from(publicDerBase64, 'base64')).digest('hex').slice(0, 32);
export function newEvidenceKey(): EvidenceKey {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  return { key_id: evidenceKeyId(pub), public: pub, private: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64') };
}
export const SignedByInstallation = z.strictObject({ algorithm: z.literal('Ed25519'), key_id: z.string().regex(/^orvia-installation-[a-f0-9]{32}$/), document: z.unknown(), signature: z.string().regex(/^[A-Za-z0-9_-]{40,200}$/) });
export type SignedByInstallation = z.infer<typeof SignedByInstallation>;
export function signByInstallation(document: unknown, key: EvidenceKey): SignedByInstallation {
  const signature = sign(null, Buffer.from(canonicalJson(document), 'utf8'), createPrivateKey({ key: Buffer.from(key.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
  return { algorithm: 'Ed25519', key_id: key.key_id, document, signature };
}
/** Verifies a document signed by an installation's evidence key against the pinned public key. Throws on any mismatch. */
export function verifyInstallationSigned<T extends z.ZodType>(signed: unknown, publicDerBase64: string, schema: T): z.infer<T> {
  const s = SignedByInstallation.parse(signed);
  if (s.key_id !== evidenceKeyId(publicDerBase64)) throw new Error('UNPINNED_INSTALLATION_KEY');
  const key = createPublicKey({ key: Buffer.from(publicDerBase64, 'base64'), format: 'der', type: 'spki' });
  if (!verify(null, Buffer.from(canonicalJson(s.document), 'utf8'), key, Buffer.from(s.signature, 'base64url'))) throw new Error('SIGNATURE_INVALID');
  return schema.parse(s.document);
}
export const signedDigest = (signed: unknown) => createHash('sha256').update(canonicalJson(signed)).digest('hex');

// ---------------------------------------------------------------- mandate (signed by the client installation)
export const MAX_MANDATE_DAYS = 400;
export const scheduleSeconds = (s: z.infer<typeof MandateSchedule>) => s === 'DAILY' ? 86_400 : 7 * 86_400;
export const MandateDocument = z.strictObject({
  format: z.literal('orvia.dpdpa-audit-mandate'), format_version: z.literal(1),
  mandate_id: Id, kind: MandateKind, installation_id: Id, organisation_name: z.string().trim().min(2).max(160),
  engagement_code_digest: Digest, engagement_reference: z.string().max(80), firm_name: z.string().max(160),
  scope_requirement_ids: z.array(RequirementId).min(1).max(200), categories: z.array(EvidenceCategory).min(1).max(7),
  schedule: MandateSchedule, valid_from: Time, valid_to: Time,
  state: MandateState.exclude(['DRAFT']), state_changed_at: Time,
  approval: z.strictObject({ preparer_role: z.enum(['ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER']), approver_role: z.enum(['ORG_SUPER_ADMIN', 'ORG_ADMIN']), distinct_people: z.literal(true), approved_at: Time }),
  evidence_key_id: z.string().regex(/^orvia-installation-[a-f0-9]{32}$/),
  personal_data: z.literal('NONE_AUTOMATIC'),
}).superRefine((m, c) => {
  if (Date.parse(m.valid_to) <= Date.parse(m.valid_from)) c.addIssue({ code: 'custom', message: 'Mandate ends before it starts', path: ['valid_to'] });
  if (Date.parse(m.valid_to) - Date.parse(m.valid_from) > MAX_MANDATE_DAYS * 86_400_000) c.addIssue({ code: 'custom', message: `A mandate lasts at most ${MAX_MANDATE_DAYS} days`, path: ['valid_to'] });
  if (new Set(m.categories).size !== m.categories.length) c.addIssue({ code: 'custom', message: 'Categories are unique', path: ['categories'] });
});
export type MandateDocument = z.infer<typeof MandateDocument>;
/** Whether a mandate permits automatic collection at this moment. */
export const mandateOpen = (m: Pick<MandateDocument, 'state' | 'valid_from' | 'valid_to'>, now = new Date()) =>
  m.state === 'ACTIVE' && Date.parse(m.valid_from) <= now.getTime() && now.getTime() < Date.parse(m.valid_to);

// ---------------------------------------------------------------- evidence delivery (signed by the client installation)
const Scalar = z.union([z.number().int(), z.string().max(200), z.boolean(), z.null()]);
export const EvidenceEntry = z.strictObject({
  category: EvidenceCategory, requirement_id: RequirementId.nullable(), key: z.string().regex(/^[a-z0-9_.]{3,80}$/), label: Label,
  value: Scalar, unit: z.string().max(40), basis: z.string().max(400), detail: z.record(z.string().regex(/^[a-z0-9_]{1,40}$/), Scalar).nullable(),
});
export type EvidenceEntry = z.infer<typeof EvidenceEntry>;
export const DeliveryDocument = z.strictObject({
  format: z.literal('orvia.dpdpa-audit-delivery'), format_version: z.literal(1),
  delivery_id: Id, mandate_id: Id, engagement_code_digest: Digest, installation_id: Id,
  sequence: z.number().int().min(1), previous_digest: Digest.nullable(),
  kind: z.enum(['SNAPSHOT', 'RESPONSE']), request_id: Id.nullable(),
  generated_at: Time, period: z.strictObject({ from: Time, to: Time }),
  regulatory_package: z.strictObject({ version: z.string().max(40), kind: z.string().max(40) }).nullable(),
  entries: z.array(EvidenceEntry).max(5000), limits: z.array(z.string().max(300)).max(20),
}).superRefine((d, c) => {
  if ((d.kind === 'RESPONSE') !== (d.request_id !== null)) c.addIssue({ code: 'custom', message: 'Only responses name a request', path: ['request_id'] });
  if ((d.sequence === 1) !== (d.previous_digest === null)) c.addIssue({ code: 'custom', message: 'Only the first delivery has no predecessor', path: ['previous_digest'] });
  if (Date.parse(d.period.to) < Date.parse(d.period.from)) c.addIssue({ code: 'custom', message: 'Period ends before it starts', path: ['period'] });
});
export type DeliveryDocument = z.infer<typeof DeliveryDocument>;

// ---------------------------------------------------------------- vendor-signed documents on the channel
export const AuditorRequestKind = z.enum(['COLLECT_NOW', 'SAMPLE_COUNT', 'EVIDENCE_FILE']);
export const AuditorRequest = z.strictObject({
  request_id: Id, engagement_code_digest: Digest, kind: AuditorRequestKind, requirement_id: RequirementId.nullable(),
  categories: z.array(EvidenceCategory).max(7), population: SamplePopulation.nullable(), sample_size: z.number().int().min(1).max(500).nullable(),
  seed: z.string().regex(/^[a-f0-9]{32,64}$/).nullable(), description: z.string().trim().min(1).max(2000), due_date: Day, issued_at: Time,
}).superRefine((r, c) => {
  if (r.kind === 'COLLECT_NOW' && !r.categories.length) c.addIssue({ code: 'custom', message: 'A collection names its categories', path: ['categories'] });
  const sample = [r.population, r.sample_size, r.seed].map(x => x !== null);
  if (r.kind === 'SAMPLE_COUNT' ? sample.includes(false) : sample.includes(true)) c.addIssue({ code: 'custom', message: 'A sample names its population, size and seed, and only a sample does', path: ['population'] });
  if (r.kind === 'EVIDENCE_FILE' && !r.requirement_id) c.addIssue({ code: 'custom', message: 'A file request names its requirement', path: ['requirement_id'] });
});
export type AuditorRequest = z.infer<typeof AuditorRequest>;
export const VendorSigned = z.strictObject({ algorithm: z.literal('Ed25519'), signing_key_id: z.string().min(1).max(120), document: z.unknown(), signature: z.string().regex(/^[A-Za-z0-9_-]{40,200}$/) });
export type VendorSigned = z.infer<typeof VendorSigned>;
/** Pending requests travel each signed on its own, so the client can keep and later prove every request it was sent. */
/** The largest report PDF, base64-encoded, that travels inside a check-in answer; a larger one goes to the client as a file. */
export const CHANNEL_PDF_MAX = 900_000;
export const ChannelInstructions = z.strictObject({
  kind: z.literal('CHANNEL_INSTRUCTIONS'), engagement_code_digest: Digest, issued_at: Time,
  mandate: z.strictObject({ mandate_id: Id, accepted: z.boolean(), problem: z.string().max(80).nullable() }),
  next_sequence: z.number().int().min(1), last_digest: Digest.nullable(),
  requests: z.array(VendorSigned).max(200),
  // Signed audit documents (findings, request lists, reports) the client has not yet acknowledged (task AUDIT-PRACTICE-01).
  // A person on the client side still imports each one through the verified import; the worker only stages them.
  documents: z.array(z.strictObject({ document_id: Id, kind: z.enum(['REQUEST_LIST', 'FINDINGS', 'REPORT']), signed: z.unknown(), pdf_base64: Base64.max(CHANNEL_PDF_MAX).nullable() })).max(20).default([]),
});
export type ChannelInstructions = z.infer<typeof ChannelInstructions>;
export const DeliveryReceipt = z.strictObject({
  kind: z.literal('DELIVERY_RECEIPT'), engagement_code_digest: Digest, delivery_id: Id, delivery_digest: Digest, sequence: z.number().int().min(1),
  outcome: z.enum(['ACCEPTED', 'REFUSED']), reasons: z.array(z.string().max(80)).max(20), received_at: Time,
});
export type DeliveryReceipt = z.infer<typeof DeliveryReceipt>;
/** Receipt for a Rev 1.5 sealed package sent over the channel instead of carried as a file. */
export const PackageReceipt = z.strictObject({
  kind: z.literal('PACKAGE_RECEIPT'), engagement_code_digest: Digest, client_package_id: Id.nullable(), file_sha256: Digest,
  outcome: z.enum(['ACCEPTED', 'QUARANTINED', 'REFUSED']), reasons: z.array(z.string().max(80)).max(20), received_at: Time,
});
export type PackageReceipt = z.infer<typeof PackageReceipt>;
export function signByVendor(document: unknown, key: { key_id: string; private: string }): VendorSigned {
  const signature = sign(null, Buffer.from(canonicalJson(document), 'utf8'), createPrivateKey({ key: Buffer.from(key.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
  return { algorithm: 'Ed25519', signing_key_id: key.key_id, document, signature };
}
/** Verifies a channel document signed by the vendor audit key the installation trusts. Throws on any mismatch. */
export function verifyVendorSigned<T extends z.ZodType>(signed: unknown, trusted: { key_id: string; public: string }, schema: T): z.infer<T> {
  const s = VendorSigned.parse(signed);
  if (s.signing_key_id !== trusted.key_id) throw new Error('UNTRUSTED_SIGNING_KEY');
  const key = createPublicKey({ key: Buffer.from(trusted.public, 'base64'), format: 'der', type: 'spki' });
  if (!verify(null, Buffer.from(canonicalJson(s.document), 'utf8'), key, Buffer.from(s.signature, 'base64url'))) throw new Error('SIGNATURE_INVALID');
  return schema.parse(s.document);
}

// ---------------------------------------------------------------- request bodies
export const Acknowledgement = z.strictObject({ request_id: Id, outcome: z.enum(['DELIVERED', 'AWAITING_CLIENT_APPROVAL', 'REFUSED']), reason: z.string().max(80).nullable(), delivery_id: Id.nullable(), package_id: Id.nullable() });
export type Acknowledgement = z.infer<typeof Acknowledgement>;
export const CheckInBody = z.strictObject({
  installation_public_key: Base64.max(200), signed_mandate: SignedByInstallation,
  acknowledgements: z.array(Acknowledgement).max(200),
  documents_received: z.array(Id).max(20).default([]),
});
export type CheckInBody = z.infer<typeof CheckInBody>;
export const DeliveryBody = z.strictObject({ signed_delivery: SignedByInstallation });

// ---------------------------------------------------------------- management responses (task AUDIT-PRACTICE-01)
/**
 * A management response to an audit finding, approved by two people on the
 * client side and signed by the installation evidence key. Free text is
 * screened for contact details before it is signed; it carries no records.
 */
const Text = (max: number) => z.string().trim().min(1).max(max);
export const ResponseDocument = z.strictObject({
  format: z.literal('orvia.dpdpa-audit-finding-response'), format_version: z.literal(1),
  response_id: Id, engagement_code_digest: Digest, installation_id: Id, finding_id: Id,
  factual_accuracy: z.enum(['AGREED', 'DISPUTED']), agreement: z.enum(['AGREE', 'PARTIALLY_AGREE', 'DISAGREE']), response: Text(4000), action_plan: Text(4000).nullable(),
  owner_role: z.string().trim().min(2).max(120).nullable(), due_date: Day.nullable(), dependencies: Text(2000).nullable(),
  remediation_status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED_CLAIMED', 'RISK_ACCEPTANCE_PROPOSED']),
  risk_acceptance: z.strictObject({ accepting_authority: Text(300), justification: z.string().trim().min(20).max(4000), proposed_until: Day }).nullable(),
  remediation_reference: z.strictObject({ kind: z.literal('GRC_ISSUE'), state: z.string().max(40) }).nullable(),
  approval: z.strictObject({ preparer_role: z.string().max(40), approver_role: z.enum(['ORG_SUPER_ADMIN', 'ORG_ADMIN']), distinct_people: z.literal(true), approved_at: Time,
    // The approver read the text and recorded that it contains no personal data; anything else goes by the sealed package route.
    personal_data: z.literal('NONE_CONFIRMED_BY_APPROVER') }),
  generated_at: Time,
}).superRefine((d, c) => { if ((d.remediation_status === 'RISK_ACCEPTANCE_PROPOSED') !== (d.risk_acceptance !== null)) c.addIssue({ code: 'custom', message: 'A risk-acceptance proposal names its authority, and only a proposal does', path: ['risk_acceptance'] }); });
export type ResponseDocument = z.infer<typeof ResponseDocument>;
export const ResponseBody = z.strictObject({ signed_response: SignedByInstallation });
export const ResponseReceipt = z.strictObject({
  kind: z.literal('RESPONSE_RECEIPT'), engagement_code_digest: Digest, response_id: Id, response_digest: Digest,
  outcome: z.enum(['ACCEPTED', 'REFUSED']), reasons: z.array(z.string().max(80)).max(20), received_at: Time,
});
export type ResponseReceipt = z.infer<typeof ResponseReceipt>;
export const ChannelAddress = z.string().url().max(300).refine(u => { const x = new URL(u);
  return !x.username && !x.password && !x.search && !x.hash && (x.protocol === 'https:' || (x.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(x.hostname))); }, 'HTTPS required (plain HTTP only to loopback), with no credentials, query or fragment');
export const CHANNEL_PATHS = { checkIn: '/api/v1/vendor/channel/check-in', deliveries: '/api/v1/vendor/channel/deliveries', packages: '/api/v1/vendor/channel/packages', responses: '/api/v1/vendor/channel/responses' } as const;
