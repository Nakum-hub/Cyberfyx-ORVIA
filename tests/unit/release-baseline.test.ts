import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { releaseBaseline } from '../../scripts/release-baseline.ts';

test('release provenance binds the approved master and expansion to exact bytes', () => {
  const result = releaseBaseline();
  assert.equal(result.master.revision, '1.4');
  assert.equal(result.expansion.revision, 'E1');
  for (const item of [result.master, result.expansion, result.expansion.register]) {
    assert.equal(item.sha256, createHash('sha256').update(readFileSync(item.path)).digest('hex'));
  }
  assert.ok(!result.master.path.startsWith('docs/source/'));
});

test('a changed approved master cannot silently become release authority', () => {
  assert.throws(() => releaseBaseline(path => path.includes('Rev_1_4')
    ? Buffer.concat([readFileSync(path), Buffer.from('\nchanged')]) : readFileSync(path)), /master hash mismatch/);
});

test('an expansion register pointing at a historical baseline is refused', () => {
  assert.throws(() => releaseBaseline(path => path === 'tracking/v1-expansion.json'
    ? Buffer.from(JSON.stringify({ baseline: 'docs/source/historical.md', baseline_revision: 'E1' })) : readFileSync(path)), /baseline and register disagree/);
});

test('an unreviewed expansion revision or missing source cannot be packaged', () => {
  assert.throws(() => releaseBaseline(path => path.endsWith('V1_EXPANDED_BASELINE.md')
    ? Buffer.from('Revision E2 — unapproved scope') : readFileSync(path)), /baseline and register disagree/);
  assert.throws(() => releaseBaseline(() => { throw new Error('missing source'); }), /missing source/);
});
