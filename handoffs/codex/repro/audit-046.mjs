import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
const root = resolve(process.argv[2]);
const C = await import(pathToFileURL(resolve(root, 'shared/contracts/src/audit-channel.ts')));
const key = { ...C.newEvidenceKey(), key_id: 'synthetic-review-key' };
const requests = Array.from({length: 200}, () => C.signByVendor(C.AuditorRequest.parse({
  request_id: randomUUID(), engagement_code_digest: 'a'.repeat(64), kind: 'COLLECT_NOW',
  requirement_id: null, categories: ['INDICATORS'], population: null, sample_size: null,
  seed: null, description: 'अ'.repeat(2000), due_date: '2026-10-30', issued_at: '2026-09-29T00:00:00Z'
}), key));
const answer = C.signByVendor(C.ChannelInstructions.parse({kind: 'CHANNEL_INSTRUCTIONS',
  engagement_code_digest: 'a'.repeat(64), issued_at: '2026-09-29T00:00:00Z',
  mandate: {mandate_id: randomUUID(), accepted: true, problem: null}, next_sequence: 1,
  last_digest: null, requests, documents: []}), key);
const bytes = Buffer.byteLength(JSON.stringify(answer));
assert(bytes > 1048576);
console.log(`EXPECTED DEFECT R2: 200 valid signed requests, no documents: ${bytes} bytes > 1048576.`);
const source = readFileSync(resolve(root, 'backend/domain/src/dpdpa-audit/channel.ts'), 'utf8');
assert(source.includes("if (!r.signed && r.personal_data_review !== 'NONE_CONFIRMED')"));
const legacy = {signed: {document: {approval: {distinct_people: true}}}, personal_data_review: null};
assert.equal(!legacy.signed && legacy.personal_data_review !== 'NONE_CONFIRMED', false);
console.log('EXPECTED DEFECT R1: previously signed UNKNOWN response with null personal-data review bypasses the send guard. Static predicate reproduction, not DB integration.');
