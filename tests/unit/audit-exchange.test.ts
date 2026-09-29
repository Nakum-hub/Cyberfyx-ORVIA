import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { packageFileBytes, verifyPackageFile, manifestFingerprint, sha256, sniffMediaType, verifyAuditDocument, assertAttestationWording, wordingProblems, AuditPackageManifest, type AuditPackageManifest as Manifest } from '../../shared/contracts/src/audit-exchange.ts';
import { deriveGapStatus, deriveApplicability } from '../../shared/contracts/src/dpdpa-audit.ts';
import { signAuditDocument } from '../../backend/vendor/audit/signing.ts';
import { structuralScan } from '../../backend/vendor/audit/scanner.ts';
import { seal, open, newDataKey } from '../../backend/vendor/audit/vault.ts';
import { renderPdf } from '../../backend/vendor/audit/pdf.ts';
import { configuredKind } from '../../backend/api/src/installation.ts';
import { redactContactDetails } from '../../backend/domain/src/rights/response-packages.ts';

// DPDPA external audit exchange (revision 1.5 addendum): the file formats both
// installations verify, the gap derivation, the wording guard and kind gating.
const pdf = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n', 'latin1');
function manifest(items: { bytes: Buffer; personal?: boolean }[]): { m: Manifest; contents: Map<string, Buffer> } {
  const contents = new Map<string, Buffer>();
  const m = AuditPackageManifest.parse({ format: 'orvia.dpdpa-audit-package', format_version: 1, package_id: randomUUID(), installation_id: randomUUID(), organisation_name: 'Aster Synthetic Ltd',
    engagement_code_digest: 'a'.repeat(64), firm_name: 'Synthetic practice', engagement_reference: 'ENG-1', audit_period: { from: '2026-01-01', to: '2026-06-30' }, scope_requirement_ids: ['DPDP-NOTICE-CONSENT-REQUEST'],
    regulatory_package: null, approval: { preparer_role: 'ORG_ADMIN', approver_role: 'ORG_SUPER_ADMIN', distinct_people: true, approved_at: new Date().toISOString() },
    created_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(),
    items: items.map(i => { const id = randomUUID(); contents.set(id, i.bytes); return { item_id: id, requirement_id: 'DPDP-NOTICE-CONSENT-REQUEST', kind: 'FILE', title: 'Evidence', file_name: 'e.pdf', media_type: 'application/pdf',
      size_bytes: i.bytes.length, sha256: sha256(i.bytes), contains_personal_data: i.personal ? 'YES' : 'NO', personal_data_exception: i.personal ? { justification: 'Approved for this engagement only, as a synthetic test.', approved_by_role: 'ORG_ADMIN' } : null }; }),
    revoked_package_ids: [] });
  return { m, contents };
}

test('a package file is canonical: the same package always yields the same bytes and fingerprint', () => {
  const { m, contents } = manifest([{ bytes: pdf }]);
  assert.equal(packageFileBytes(m, contents).toString('base64'), packageFileBytes(structuredClone(m), new Map(contents)).toString('base64'));
  const v = verifyPackageFile(packageFileBytes(m, contents));
  assert.equal(v.ok, true);
  assert.equal(v.ok && manifestFingerprint(v.manifest), manifestFingerprint(m));
});
test('one changed byte anywhere is refused', () => {
  const { m, contents } = manifest([{ bytes: pdf }]);
  const bytes = packageFileBytes(m, contents);
  const file = JSON.parse(bytes.toString('utf8'));
  const id = Object.keys(file.contents)[0]!; const content = Buffer.from(file.contents[id], 'base64'); content[content.length - 3]! ^= 1; file.contents[id] = content.toString('base64');
  assert.deepEqual((verifyPackageFile(Buffer.from(JSON.stringify(file))) as { problems: string[] }).problems, ['ITEM_HASH_MISMATCH']);
  const renamed = JSON.parse(bytes.toString('utf8')); renamed.manifest.organisation_name = 'Aster Synthetic Lte';
  assert.deepEqual((verifyPackageFile(Buffer.from(JSON.stringify(renamed))) as { problems: string[] }).problems, ['FINGERPRINT_MISMATCH']);
  const extra = JSON.parse(bytes.toString('utf8')); extra.contents[randomUUID()] = 'AAAA';
  assert.deepEqual((verifyPackageFile(Buffer.from(JSON.stringify(extra))) as { problems: string[] }).problems, ['ITEM_UNEXPECTED']);
  assert.deepEqual((verifyPackageFile(Buffer.from('not json')) as { problems: string[] }).problems, ['NOT_A_PACKAGE']);
});
test('expired packages and mistyped files are refused', () => {
  const { m, contents } = manifest([{ bytes: pdf }]);
  assert.deepEqual((verifyPackageFile(packageFileBytes(m, contents), new Date(Date.now() + 2 * 86400000)) as { problems: string[] }).problems, ['EXPIRED']);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
  const wrong = manifest([{ bytes: png }]);
  assert.deepEqual((verifyPackageFile(packageFileBytes(wrong.m, wrong.contents)) as { problems: string[] }).problems, ['ITEM_TYPE_MISMATCH']);
});
test('personal data in a manifest needs an approved exception', () => {
  assert.throws(() => AuditPackageManifest.parse({ ...manifest([{ bytes: pdf }]).m, items: [{ ...manifest([{ bytes: pdf }]).m.items[0]!, contains_personal_data: 'YES', personal_data_exception: null }] }));
  assert.equal(manifest([{ bytes: pdf, personal: true }]).m.items[0]!.personal_data_exception !== null, true);
});
test('file types come from the bytes, never the name', () => {
  assert.equal(sniffMediaType(pdf, 'notice.pdf'), 'application/pdf');
  assert.equal(sniffMediaType(pdf, 'notice.png'), null);
  assert.equal(sniffMediaType(Buffer.from('MZ\x90\x00'), 'tool.exe'), null);
  assert.equal(sniffMediaType(Buffer.from('a,b\n1,2\n'), 'list.csv'), 'text/csv');
  assert.equal(sniffMediaType(Buffer.from('a\u0000b'), 'binary.txt'), null);
  assert.equal(sniffMediaType(Buffer.from('PK\x03\x04....word/document.xml', 'latin1'), 'letter.docx'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});
test('gap status derivation', () => {
  assert.equal(deriveGapStatus('NOT_APPLICABLE', ['MANUAL_REVIEW_ACCEPTED']), 'NOT_APPLICABLE');
  assert.equal(deriveGapStatus('UNRESOLVED', ['MANUAL_REVIEW_ACCEPTED']), 'UNRESOLVED_APPLICABILITY');
  assert.equal(deriveGapStatus('APPLICABLE', []), 'NO_EVIDENCE');
  assert.equal(deriveGapStatus('APPLICABLE', ['UNKNOWN']), 'NO_EVIDENCE');
  assert.equal(deriveGapStatus('APPLICABLE', ['STALE', 'REJECTED']), 'REJECTED');
  assert.equal(deriveGapStatus('APPLICABLE', ['STALE', 'PENDING_REVIEW']), 'PENDING_REVIEW');
  assert.equal(deriveGapStatus('APPLICABLE', ['REJECTED', 'MANUAL_REVIEW_ACCEPTED']), 'EVIDENCED');
  assert.equal(deriveGapStatus('APPLICABLE', ['STALE']), 'STALE');
  assert.equal(deriveApplicability([]), 'UNRESOLVED');
  assert.equal(deriveApplicability([{ scope_kind: 'ACTIVITY', result: 'NOT_APPLICABLE' }, { scope_kind: 'ACTIVITY', result: 'APPLICABLE' }]), 'APPLICABLE');
  assert.equal(deriveApplicability([{ scope_kind: 'ORGANISATION', result: 'UNRESOLVED' }, { scope_kind: 'ACTIVITY', result: 'APPLICABLE' }]), 'UNRESOLVED');
  assert.equal(deriveApplicability([{ scope_kind: 'ORGANISATION', result: 'EXEMPT_WITH_RECORDED_BASIS' }]), 'NOT_APPLICABLE');
});
test('signed audit documents verify with the trusted key and are refused otherwise', () => {
  const pair = generateKeyPairSync('ed25519'); const other = generateKeyPairSync('ed25519');
  const key = { key_id: 'audit-k1', private: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'), public: pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64') };
  const doc = { kind: 'FINDINGS', engagement_code_digest: 'a'.repeat(64), engagement_reference: 'ENG-1', firm_name: 'Synthetic practice', organisation_name: 'Aster', issued_at: new Date().toISOString(), findings: [] };
  const signed = signAuditDocument(doc, key);
  assert.equal(verifyAuditDocument(signed, key).kind, 'FINDINGS');
  assert.throws(() => verifyAuditDocument(signed, { key_id: 'audit-k1', public: other.publicKey.export({ format: 'der', type: 'spki' }).toString('base64') }), /SIGNATURE_INVALID/);
  assert.throws(() => verifyAuditDocument(signed, { ...key, key_id: 'audit-k2' }), /UNTRUSTED_SIGNING_KEY/);
  assert.throws(() => verifyAuditDocument({ ...signed, document: { ...doc, organisation_name: 'Birch' } }, key), /SIGNATURE_INVALID/);
});
test('wording guard: an audit opinion, never a certificate of compliance', () => {
  for (const bad of ['The organisation is DPDPA certified.', 'This certificate of compliance confirms', 'We certify that', 'fully compliant with the Act', 'Compliance certificate issued', 'guaranteed conformity', 'approved by the Data Protection Board'])
    assert.ok(wordingProblems(bad).length > 0, bad);
  assert.deepEqual(wordingProblems('Based on the evidence examined, the requirement in scope is partially met as of 15 July 2026.'), []);
  assert.throws(() => assertAttestationWording('ok text', 'We certify compliance.'), /WORDING_REFUSED/);
});
test('report template text passes the wording guard', async () => {
  const { reportLines } = await import('../../backend/vendor/audit/service.ts');
  const lines = reportLines({ organisation_name: 'Aster', reference: 'ENG-1', period_from: '2026-01-01', period_to: '2026-06-30', scope_requirement_ids: ['DPDP-NOTICE-CONSENT-REQUEST'], independence_statement: 'Independent of the client.', empanelment_reference: null },
    { opinion_as_of: '2026-07-15', version: 1, method: 'Inspection.', opinion: 'Partially met.', limitations: ['Only shared evidence was examined.'] }, [{ requirement_id: 'DPDP-NOTICE-CONSENT-REQUEST', result: 'PARTIALLY_MEETS', rationale: 'Channel missing.' }], []);
  assert.ok(lines.some(l => l.text.includes('not a determination of compliance')));
  assert.deepEqual(lines.flatMap(l => wordingProblems(l.text)), []);
  const bytes = renderPdf(lines, 'ENG-1'); assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.equal(sha256(renderPdf(lines, 'ENG-1')), sha256(bytes), 'the PDF is deterministic, so its hash can be signed');
});
test('malware screen and evidence vault', () => {
  assert.deepEqual(structuralScan(Buffer.from('MZ\x90\x00rest'), 'text/plain'), ['EXECUTABLE_PE']);
  assert.deepEqual(structuralScan(Buffer.from('%PDF-1.4 /JavaScript (app.alert(1))'), 'application/pdf'), ['PDF_ACTIVE_CONTENT']);
  assert.deepEqual(structuralScan(Buffer.from('PK\x03\x04 word/vbaProject.bin', 'latin1'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), ['OFFICE_MACRO_OR_EMBEDDED_OBJECT']);
  assert.deepEqual(structuralScan(pdf, 'application/pdf'), []);
  const key = newDataKey(); const sealed = seal(key, pdf, 'item:1');
  assert.equal(open(key, sealed, 'item:1').equals(pdf), true);
  assert.throws(() => open(key, sealed, 'item:2'), 'a sealed item cannot be moved to another item');
  assert.throws(() => open(newDataKey(), sealed, 'item:1'), 'another package key cannot open it');
});
test('statements are redacted of contact details and identifiers', () => {
  const r = redactContactDetails('Mail dpo@aster.example, call +91 98765 43210, PAN ABCDE1234F, notices published: 3.');
  assert.equal(r.redactions, 3);
  assert.equal(/@|98765|ABCDE1234F/.test(r.text), false);
  assert.ok(r.text.includes('notices published: 3'));
});
test('installation kind: the default is a customer installation; the record decides otherwise', () => {
  const dir = mkdtempSync(join(tmpdir(), 'orvia-kind-'));
  assert.equal(configuredKind(dir), 'CUSTOMER_INSTALLATION');
  writeFileSync(join(dir, 'installation.json'), JSON.stringify({ kind: 'VENDOR_SERVICE', installation_id: randomUUID(), recorded_at: new Date().toISOString() }));
  assert.equal(configuredKind(dir), 'VENDOR_SERVICE');
  writeFileSync(join(dir, 'installation.json'), JSON.stringify({ kind: 'SOMETHING_ELSE', installation_id: randomUUID(), recorded_at: new Date().toISOString() }));
  assert.throws(() => configuredKind(dir));
});
test('installation kind gating: a route of the other kind is a 404 and runs nothing', async () => {
  const { onlyOn } = await import('../../backend/api/src/installation.ts');
  let ran = false;
  // A fresh CI checkout has no ignored local profile. Own the entire fixture
  // instead of relying on the developer's installation or opening a database.
  const root = mkdtempSync(join(tmpdir(), 'orvia-kind-gating-'));
  const directory = join(root, '.local', 'profiles', 'codex-a00');
  const previous = process.env.ORVIA_PROFILE;
  const previousRoot = process.env.ORVIA_WORKSPACE_ROOT;
  process.env.ORVIA_PROFILE = 'codex-a00';
  process.env.ORVIA_WORKSPACE_ROOT = root;
  try {
    const handler = () => { ran = true; return new Response('x'); };
    const request = new Request('http://127.0.0.1/api/v1/vendor/session');
    const unavailable = await onlyOn('VENDOR_SERVICE', handler)(request);
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { error: { code: 'SERVICE_UNAVAILABLE' } });
    assert.equal(ran, false);

    mkdirSync(directory, { recursive: true });
    const installation_id = randomUUID();
    writeFileSync(join(directory, 'config.json'), JSON.stringify({ profile: 'codex-a00', fixture_id: 'bootstrap-probe-v1', installation_id }));
    const response = await onlyOn('VENDOR_SERVICE', handler)(request);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: { code: 'NOT_FOUND' } });
    assert.equal(ran, false);

    writeFileSync(join(directory, 'installation.json'), JSON.stringify({ kind: 'VENDOR_SERVICE', installation_id, recorded_at: new Date().toISOString() }));
    const customerResponse = await onlyOn('CUSTOMER_INSTALLATION', handler)(new Request('http://127.0.0.1/api/v1/session'));
    assert.equal(customerResponse.status, 404);
    assert.deepEqual(await customerResponse.json(), { error: { code: 'NOT_FOUND' } });
    assert.equal(ran, false);
  } finally {
    if (previous === undefined) delete process.env.ORVIA_PROFILE; else process.env.ORVIA_PROFILE = previous;
    if (previousRoot === undefined) delete process.env.ORVIA_WORKSPACE_ROOT; else process.env.ORVIA_WORKSPACE_ROOT = previousRoot;
    rmSync(root, { recursive: true, force: true });
  }
});
