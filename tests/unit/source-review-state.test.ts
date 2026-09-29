import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveSourceReviews } from '../../scripts/source-review-state.ts';

const fresh = { source_sha256: 'a'.repeat(64), sections: [{ source_section: 1, title: 'Scope', start_line: 1, end_line: 10,
  normalized_content_sha256: 'b'.repeat(64), review_status: 'UNREVIEWED', requirement_mappings: [] as unknown[], acceptance_status: 'NOT_ASSESSED' }] };
test('regeneration preserves reviewed mappings and does not promote acceptance', () => {
  const reviewed = structuredClone(fresh);
  reviewed.sections[0]!.review_status = 'REVIEWED';
  reviewed.sections[0]!.requirement_mappings = [{ requirement: 'local processing', evidence: ['review.json'] }];
  const result = preserveSourceReviews(fresh, reviewed);
  assert.deepEqual(result, reviewed);
  assert.equal(result.sections[0]!.acceptance_status, 'NOT_ASSESSED');
  assert.notEqual(result.sections[0]!.requirement_mappings, reviewed.sections[0]!.requirement_mappings);
});
test('changed authority, source digest, missing and duplicated sections are rejected', () => {
  for (const mutate of [
    (v: typeof fresh) => { v.source_sha256 = 'c'.repeat(64); },
    (v: typeof fresh) => { v.sections[0]!.normalized_content_sha256 = 'c'.repeat(64); },
    (v: typeof fresh) => { v.sections = []; },
    (v: typeof fresh) => { v.sections.push(v.sections[0]!); },
  ]) { const changed = structuredClone(fresh); mutate(changed); assert.throws(() => preserveSourceReviews(fresh, changed), /changed|review required/); }
});
test('malformed review metadata fails closed', () => {
  const malformed = { ...fresh, sections: [{ ...fresh.sections[0], requirement_mappings: null }] };
  assert.throws(() => preserveSourceReviews(fresh, malformed), /Invalid review state/);
  assert.throws(() => preserveSourceReviews(fresh, null), /Invalid source inventory/);
});
