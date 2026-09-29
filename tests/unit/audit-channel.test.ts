import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, randomBytes } from 'node:crypto';
import * as C from '../../shared/contracts/src/audit-channel.ts';

// DPDPA audit mandate channel (revision 1.6 addendum): request authentication,
// installation and vendor signatures, the mandate and delivery formats, and
// the auditor-seeded sample selection.
const code = 'ABCDE-FGHJK-LMNPQ-RSTUV';
const vendorKey = (() => { const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return { key_id: 'vendor-audit-test', public: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'), private: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64') }; })();
const now = () => new Date().toISOString();
const mandate = (over: Partial<C.MandateDocument> = {}, key = C.newEvidenceKey()) => C.MandateDocument.parse({ format: 'orvia.dpdpa-audit-mandate', format_version: 1, mandate_id: randomUUID(), kind: 'ENGAGEMENT',
  installation_id: randomUUID(), organisation_name: 'Aster Synthetic Ltd', engagement_code_digest: 'a'.repeat(64), engagement_reference: 'ENG-1', firm_name: 'Synthetic practice',
  scope_requirement_ids: ['DPDP-CONSENT-PROOF'], categories: ['INDICATORS'], schedule: 'DAILY', valid_from: new Date(Date.now() - 1000).toISOString(), valid_to: new Date(Date.now() + 86_400_000).toISOString(),
  state: 'ACTIVE', state_changed_at: now(), approval: { preparer_role: 'ORG_ADMIN', approver_role: 'ORG_SUPER_ADMIN', distinct_people: true, approved_at: now() }, evidence_key_id: key.key_id, personal_data: 'NONE_AUTOMATIC', ...over });

test('channel key: same code on both sides gives the same key; normalisation ignores case and dashes; another code differs', () => {
  assert.deepEqual(C.channelKey(code), C.channelKey(code.toLowerCase().replaceAll('-', ' ')));
  assert.notDeepEqual(C.channelKey(code), C.channelKey('ABCDE-FGHJK-LMNPQ-RSTUW'));
});
test('channel signature: accepted in the window; refused for another body, another key, a stale or future timestamp and malformed input', () => {
  const key = C.channelKey(code); const body = '{"a":1}'; const ts = String(Math.floor(Date.now() / 1000));
  const sig = C.channelSignature(key, ts, body);
  assert.equal(C.channelSignatureValid(key, ts, body, sig), true);
  assert.equal(C.channelSignatureValid(key, ts, '{"a":2}', sig), false);
  assert.equal(C.channelSignatureValid(C.channelKey('ZZZZZ-FGHJK-LMNPQ-RSTUV'), ts, body, sig), false);
  const stale = String(Math.floor(Date.now() / 1000) - C.CHANNEL_CLOCK_SKEW_SECONDS - 5);
  assert.equal(C.channelSignatureValid(key, stale, body, C.channelSignature(key, stale, body)), false);
  const future = String(Math.floor(Date.now() / 1000) + C.CHANNEL_CLOCK_SKEW_SECONDS + 5);
  assert.equal(C.channelSignatureValid(key, future, body, C.channelSignature(key, future, body)), false);
  assert.equal(C.channelSignatureValid(key, 'soon', body, sig), false);
  assert.equal(C.channelSignatureValid(key, ts, body, 'deadbeef'), false);
});
test('installation signature: verifies against the pinned key; refuses another key, a tampered document and a forged key id', () => {
  const key = C.newEvidenceKey(); const other = C.newEvidenceKey(); const m = mandate({}, key);
  const signed = C.signByInstallation(m, key);
  assert.equal(C.verifyInstallationSigned(signed, key.public, C.MandateDocument).mandate_id, m.mandate_id);
  assert.throws(() => C.verifyInstallationSigned(signed, other.public, C.MandateDocument), /UNPINNED_INSTALLATION_KEY/);
  assert.throws(() => C.verifyInstallationSigned({ ...signed, document: { ...m, categories: ['INDICATORS', 'SAMPLE_COUNTS'] } }, key.public, C.MandateDocument), /SIGNATURE_INVALID/);
  assert.throws(() => C.verifyInstallationSigned({ ...C.signByInstallation(m, other), key_id: key.key_id }, key.public, C.MandateDocument), /SIGNATURE_INVALID/);
  assert.equal(C.signedDigest(signed), C.signedDigest(JSON.parse(JSON.stringify(signed))));
});
test('vendor signature: instructions and receipts verify with the trusted audit key only', () => {
  const receipt = C.DeliveryReceipt.parse({ kind: 'DELIVERY_RECEIPT', engagement_code_digest: 'a'.repeat(64), delivery_id: randomUUID(), delivery_digest: 'b'.repeat(64), sequence: 1, outcome: 'ACCEPTED', reasons: [], received_at: now() });
  const signed = C.signByVendor(receipt, vendorKey);
  assert.equal(C.verifyVendorSigned(signed, vendorKey, C.DeliveryReceipt).outcome, 'ACCEPTED');
  assert.throws(() => C.verifyVendorSigned(signed, { ...vendorKey, key_id: 'someone-else' }, C.DeliveryReceipt), /UNTRUSTED_SIGNING_KEY/);
  assert.throws(() => C.verifyVendorSigned({ ...signed, document: { ...receipt, outcome: 'REFUSED' } }, vendorKey, C.DeliveryReceipt), /SIGNATURE_INVALID/);
  // A receipt is not instructions: the schema is part of verification.
  assert.throws(() => C.verifyVendorSigned(signed, vendorKey, C.ChannelInstructions));
});
test('mandate: at most 400 days, ends after it starts, unique categories, never personal data, never a draft on the wire; open only while active and in date', () => {
  assert.throws(() => mandate({ valid_to: new Date(Date.now() + 401 * 86_400_000).toISOString() }));
  assert.throws(() => mandate({ valid_to: new Date(Date.now() - 5000).toISOString() }));
  assert.throws(() => mandate({ categories: ['INDICATORS', 'INDICATORS'] }));
  assert.throws(() => mandate({ personal_data: 'ALLOWED' as never }));
  assert.throws(() => mandate({ state: 'DRAFT' as never }));
  assert.equal(C.mandateOpen(mandate()), true);
  assert.equal(C.mandateOpen(mandate({ state: 'SUSPENDED' })), false);
  assert.equal(C.mandateOpen(mandate(), new Date(Date.now() + 2 * 86_400_000)), false);
});
test('delivery: responses and only responses name a request; the first delivery and only the first has no predecessor; entries carry scalars only', () => {
  const base = { format: 'orvia.dpdpa-audit-delivery', format_version: 1, delivery_id: randomUUID(), mandate_id: randomUUID(), engagement_code_digest: 'a'.repeat(64), installation_id: randomUUID(),
    sequence: 1, previous_digest: null, kind: 'SNAPSHOT', request_id: null, generated_at: now(), period: { from: now(), to: now() }, regulatory_package: null, limits: [],
    entries: [{ category: 'INDICATORS', requirement_id: 'DPDP-CONSENT-PROOF', key: 'consent.events_total', label: 'Consent events', value: 3, unit: 'count', basis: 'all consent record events', detail: null }] };
  assert.equal(C.DeliveryDocument.parse(base).sequence, 1);
  assert.throws(() => C.DeliveryDocument.parse({ ...base, kind: 'RESPONSE' }));
  assert.throws(() => C.DeliveryDocument.parse({ ...base, request_id: randomUUID() }));
  assert.throws(() => C.DeliveryDocument.parse({ ...base, sequence: 2 }));
  assert.throws(() => C.DeliveryDocument.parse({ ...base, previous_digest: 'c'.repeat(64) }));
  assert.throws(() => C.DeliveryDocument.parse({ ...base, entries: [{ ...base.entries[0], value: { name: 'x' } }] }));
});
test('auditor request: a sample names population, size and seed; a collection names categories; a file request names its requirement', () => {
  const r = { request_id: randomUUID(), engagement_code_digest: 'a'.repeat(64), requirement_id: null, categories: [], population: null, sample_size: null, seed: null, description: 'Please', due_date: '2026-12-31', issued_at: now() };
  assert.throws(() => C.AuditorRequest.parse({ ...r, kind: 'COLLECT_NOW' }));
  assert.equal(C.AuditorRequest.parse({ ...r, kind: 'COLLECT_NOW', categories: ['INDICATORS'] }).kind, 'COLLECT_NOW');
  assert.throws(() => C.AuditorRequest.parse({ ...r, kind: 'SAMPLE_COUNT', population: 'CONSENT_EVENTS_WITH_EVIDENCE', sample_size: 5 }));
  assert.equal(C.AuditorRequest.parse({ ...r, kind: 'SAMPLE_COUNT', population: 'CONSENT_EVENTS_WITH_EVIDENCE', sample_size: 5, seed: 'ab'.repeat(16) }).sample_size, 5);
  assert.throws(() => C.AuditorRequest.parse({ ...r, kind: 'EVIDENCE_FILE' }));
  assert.throws(() => C.AuditorRequest.parse({ ...r, kind: 'COLLECT_NOW', categories: ['INDICATORS'], seed: 'ab'.repeat(16) }));
});
test('seeded selection: deterministic for a seed, different for another seed, bounded by size and population, independent of input order', () => {
  const members = Array.from({ length: 50 }, () => ({ id: randomUUID() }));
  const seed = randomBytes(16).toString('hex');
  const a = C.seededSelection(members, seed, 10).map(m => m.id);
  assert.deepEqual(C.seededSelection([...members].reverse(), seed, 10).map(m => m.id), a);
  assert.notDeepEqual(C.seededSelection(members, randomBytes(16).toString('hex'), 10).map(m => m.id), a);
  assert.equal(a.length, 10); assert.equal(C.seededSelection(members.slice(0, 3), seed, 10).length, 3);
  assert.equal(C.selectionDigest(a), C.selectionDigest([...a]));
});
test('channel address: HTTPS, or plain HTTP only to loopback; no credentials, query or fragment', () => {
  assert.ok(C.ChannelAddress.safeParse('https://audit.example.in').success);
  assert.ok(C.ChannelAddress.safeParse('http://127.0.0.1:4340').success);
  for (const bad of ['http://audit.example.in', 'https://u:p@audit.example.in', 'https://audit.example.in/?x=1', 'https://audit.example.in/#f', 'ftp://audit.example.in']) assert.equal(C.ChannelAddress.safeParse(bad).success, false, bad);
});

// Transport hardening (task AUDIT-PRACTICE-01, revision 1.6): the real node transport against a loopback server.
// A redirect is never followed and never counts as delivered; an oversized answer is an unknown outcome, not a success;
// an unreachable address is a clear failure before anything left.
test('channel transport: redirects refused, oversized answers unknown, unreachable addresses failed', async () => {
  const { createServer } = await import('node:http');
  const { post } = await import('../../backend/domain/src/dpdpa-audit/channel.ts');
  const server = createServer((req, res) => {
    if (req.url?.includes('check-in')) { res.writeHead(302, { location: 'https://elsewhere.example/steal' }); res.end(); return; }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ padding: 'x'.repeat(1_100_000) }));
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as { port: number }).port;
  try {
    const env = { address: `http://127.0.0.1:${port}`, auditKey: null, sealKey: Buffer.alloc(32) };
    const key = Buffer.alloc(32, 1); const body = Buffer.from('{}');
    const redirected = await post(env, '/api/v1/vendor/channel/check-in', 'a'.repeat(64), key, body, 'application/json');
    assert.deepEqual([redirected.outcome, (redirected as { error: string }).error], ['FAILED', 'REDIRECT_NOT_FOLLOWED']);
    const large = await post(env, '/api/v1/vendor/channel/deliveries', 'a'.repeat(64), key, body, 'application/json');
    assert.deepEqual([large.outcome, (large as { error: string }).error], ['UNKNOWN', 'RESPONSE_TOO_LARGE']);
    const free = createServer(); await new Promise<void>(r => free.listen(0, '127.0.0.1', () => r())); const closedPort = (free.address() as { port: number }).port; await new Promise(r => free.close(r));
    const offline = await post({ ...env, address: `http://127.0.0.1:${closedPort}` }, '/api/v1/vendor/channel/deliveries', 'a'.repeat(64), key, body, 'application/json');
    assert.deepEqual([offline.outcome, (offline as { error: string }).error], ['FAILED', 'ECONNREFUSED']);
    const plain = await post({ ...env, address: 'http://audit.example.com' }, '/x', 'a'.repeat(64), key, body, 'application/json');
    assert.deepEqual([plain.outcome, (plain as { error: string }).error], ['FAILED', 'AUDIT_SERVICE_ADDRESS_INVALID']);
  } finally { await new Promise(r => server.close(r)); }
});
