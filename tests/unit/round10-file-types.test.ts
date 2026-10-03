import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFile } from '../../backend/domain/src/onboarding/file-intake.ts';

for (const extension of ['docx', 'xlsx']) test(`an arbitrary ZIP prefix is not a ${extension} document`, () => {
  assert.equal(detectFile(`disguised.${extension}`, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0])).kind, 'UNRECOGNISED');
});
for (const extension of ['txt', 'csv']) test(`binary executable bytes are not a ${extension} document`, () => {
  assert.equal(detectFile(`disguised.${extension}`, Buffer.from([0x4d, 0x5a, 0, 0xff, 0x80])).kind, 'UNRECOGNISED');
});
