// Revision 1.12 file intake: detection is decided by the contract schemas, and the feature is on every plan. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTITLEMENTS, classifyRoute, routes } from '../../shared/contracts/src/index.ts';
import { detectFile } from '../../backend/domain/src/onboarding/file-intake.ts';
import { parseCsv, resolvePrivacyRequests } from '../../backend/domain/src/onboarding/csv-import.ts';
import { example } from '../../shared/contracts/src/examples.ts';
import { officeFixture } from '../../shared/testing/src/office-fixture.ts';

const json = (v: unknown) => Buffer.from(JSON.stringify(v));

test('file intake and existing-data onboarding are on every plan', () => {
  for (const r of routes.filter(r => r.method === 'post' && (r.path.includes('/file-intake') || r.path.includes('/bulk-jobs')))) {
    const cls = classifyRoute(r)!;
    assert.ok(cls === 'PROTECTIVE' || cls === 'PLATFORM' || ENTITLEMENTS[cls as keyof typeof ENTITLEMENTS].tier === 'FOUNDATION', `${r.id} is ${cls}`);
  }
});

test('a file is a licence, inventory or onboarding rows only if the contract schema parses it', () => {
  const licence = example('LicenceImport') as { licence: unknown };
  assert.equal(detectFile('licence.json', json(licence)).kind, 'LICENCE');
  assert.equal(detectFile('licence.json', json(licence.licence)).kind, 'LICENCE', 'a bare signed licence is recognised too');
  assert.equal(detectFile('inventory.json', json(example('ImportSubmit'))).kind, 'DATA_ASSET_INVENTORY');
  const rows = (example('BulkJobAppend') as { rows: unknown[] }).rows;
  assert.equal(detectFile('estate.json', json(rows)).kind, 'ESTATE_ROWS');
  assert.equal(detectFile('estate.jsonl', Buffer.from(rows.map(r => JSON.stringify(r)).join('\n'))).kind, 'ESTATE_ROWS');
  assert.equal(detectFile('release.json', json(example('ReleaseImport'))).kind, 'RELEASE');
  assert.equal(detectFile('package.json', json(example('RegulatoryPackageImport'))).kind, 'REGULATORY_PACKAGE');
});

test('anything else is a document or unreadable, never silently something else', () => {
  assert.equal(detectFile('agreement.pdf', Buffer.from('%PDF-1.7\n...')).kind, 'DOCUMENT');
  assert.equal(detectFile('agreement.pdf', Buffer.from('MZ fake executable')).kind, 'UNRECOGNISED', 'content must match the extension');
  assert.equal(detectFile('policy.docx', officeFixture('docx')).kind, 'DOCUMENT');
  assert.equal(detectFile('sheet.xlsx', officeFixture('xlsx')).kind, 'DOCUMENT');
  assert.equal(detectFile('sheet.xlsx', officeFixture('docx')).kind, 'UNRECOGNISED');
  assert.equal(detectFile('notes.txt', Buffer.from('hello')).kind, 'DOCUMENT');
  assert.equal(detectFile('tool.exe', Buffer.from('MZ')).kind, 'UNRECOGNISED');
  assert.equal(detectFile('broken.json', Buffer.from('{ not json')).kind, 'UNRECOGNISED');
  const half = detectFile('inventory.json', json({ ...(example('ImportSubmit') as object), rows: [] }));
  assert.equal(half.kind, 'UNRECOGNISED');
  assert.match(half.detail, /Not a data inventory/, 'says what it was nearly, so it can be fixed');
  const badRow = detectFile('estate.jsonl', Buffer.from('{"row_key":"x"}'));
  assert.equal(badRow.kind, 'UNRECOGNISED');
  assert.match(badRow.detail, /Line 1/);
});

test('CSV exports from the organisation\'s own systems are recognised by header (contract 0.61.0)', () => {
  const consent = Buffer.from('Customer Reference,email,System,Activity,Decision,occurred_at\ncust_1,a@aster.example,Aster online store,Marketing,granted,2026-09-01\n');
  const requests = Buffer.from('email,name,right_type,description\na@aster.example,A Person,access,Please send me my data.\n');
  assert.equal(detectFile('consents.csv', consent).kind, 'CONSENT_EXPORT');
  assert.equal(detectFile('requests.csv', requests).kind, 'PRIVACY_REQUESTS');
  assert.equal(detectFile('notes.csv', Buffer.from('a,b\n1,2\n')).kind, 'DOCUMENT');
  assert.equal(detectFile('empty.csv', Buffer.from('customer_reference,system,activity,decision\n')).kind, 'UNRECOGNISED');
});
test('CSV parsing handles quotes, embedded commas, doubled quotes and CRLF', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n'), [['a', 'b'], ['x, y', 'say "hi"']]);
});
test('a privacy requests export is checked row by row; nothing is guessed', () => {
  const r = resolvePrivacyRequests([
    { line: 2, values: { email: 'p@aster.example', name: 'P', right_type: 'Erasure', description: 'Please erase my account data.' } },
    { line: 3, values: { email: 'not-an-email', name: 'Q', right_type: 'access', description: 'Please send my data.' } },
    { line: 4, values: { email: 'r@aster.example', name: 'R', right_type: 'refund', description: 'I want my money back.' } },
  ]);
  assert.equal(r.apply.length, 1); assert.equal(r.apply[0]!.right, 'ERASURE');
  assert.deepEqual(r.skipped.map(s => s.line), [3, 4]);
});
