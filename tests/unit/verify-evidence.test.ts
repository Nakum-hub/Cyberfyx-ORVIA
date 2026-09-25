import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Evidence } from '../../shared/contracts/src/index.ts';
import { digest } from '../../shared/contracts/src/crypto.ts';
import { verifyEvidenceDocument } from '../../scripts/verify-evidence.ts';

const examples = JSON.parse(readFileSync('shared/contracts/generated/examples.json', 'utf8')) as {
  routes: { operation_id: string; response: unknown }[];
};
const example = examples.routes.find(route => route.operation_id === 'export')?.response;
if (!example) throw new Error('Missing canonical export example');

function artifact() {
  const { integrity_digest: _ignored, ...body } = Evidence.parse(example);
  void _ignored;
  return Evidence.parse({ ...body, integrity_digest: digest(body) });
}

test('offline verifier checks schema, embedded digest, and separate trusted reference', () => {
  const value = artifact();
  const checked = verifyEvidenceDocument(value, value.integrity_digest);
  assert.equal(checked.integrity_check_passed, true);
  assert.equal(checked.reference_check, 'MATCH');
  assert.equal(checked.embedded_digest_valid, true);
});

test('changed evidence fails even if the old digest remains', () => {
  const value = artifact();
  const changed = { ...value, coverage_limits: ['Synthetic evidence was changed'] };
  assert.equal(verifyEvidenceDocument(changed).embedded_digest_valid, false);
  assert.equal(verifyEvidenceDocument(changed).integrity_check_passed, false);
});

test('recomputed embedded digest still fails against an independently held reference', () => {
  const original = artifact();
  const { integrity_digest: _ignored, ...body } = original;
  void _ignored;
  const changedBody = { ...body, coverage_limits: ['Rewritten after export'] };
  const changed = { ...changedBody, integrity_digest: digest(changedBody) };
  assert.equal(verifyEvidenceDocument(changed).integrity_check_passed, true);
  const checked = verifyEvidenceDocument(changed, original.integrity_digest);
  assert.equal(checked.embedded_digest_valid, true);
  assert.equal(checked.reference_check, 'MISMATCH');
  assert.equal(checked.integrity_check_passed, false);
});

test('unknown fields or malformed trusted digest fail closed', () => {
  const value = artifact();
  assert.equal(verifyEvidenceDocument({ ...value, unexpected: 'field' }).schema_valid, false);
  assert.throws(() => verifyEvidenceDocument(value, 'not-a-sha256'));
});

test('operator CLI reports only verification metadata and rejects a wrong reference', () => {
  const directory = mkdtempSync(join(tmpdir(), 'orvia-evidence-verify-'));
  const path = join(directory, 'evidence.json');
  try {
    const value = artifact();
    writeFileSync(path, JSON.stringify(value));
    const run = (reference: string) => spawnSync(process.execPath,
      ['--import', 'tsx', 'scripts/verify-evidence.ts', path, '--expected-digest', reference],
      { cwd: process.cwd(), encoding: 'utf8' });
    const valid = run(value.integrity_digest);
    assert.equal(valid.status, 0);
    assert.equal(JSON.parse(valid.stdout).reference_check, 'MATCH');
    assert.equal(valid.stdout.includes(value.workflow.id), false);
    const wrong = run('0'.repeat(64));
    assert.equal(wrong.status, 1);
    assert.equal(JSON.parse(wrong.stdout).reference_check, 'MISMATCH');
  } finally {
    unlinkSync(path);
    rmdirSync(directory);
  }
});
