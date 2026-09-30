import test from 'node:test';
import assert from 'node:assert/strict';
import { requirements } from '../../scripts/regulatory/dpdp-baseline.ts';
import { indicatorRequirements, indicatorKeys, PROCEDURE_ONLY_REQUIREMENTS } from '../../backend/domain/src/dpdpa-audit/indicators.ts';

// Every baseline requirement is either evidenced by ORVIA indicators or named as tested by auditor procedure only
// (docs/audit-practice/METHODOLOGY.md, section 7). A requirement added to the baseline without either fails here.
test('every DPDP baseline requirement has indicators or is procedure-only, never both and never neither', () => {
  const baseline = requirements.map(r => r.requirement_id).sort();
  const withIndicators = indicatorRequirements();
  const procedureOnly: readonly string[] = PROCEDURE_ONLY_REQUIREMENTS;
  assert.deepEqual(baseline.filter(r => !withIndicators.includes(r) && !procedureOnly.includes(r)), []);
  assert.deepEqual(withIndicators.filter(r => procedureOnly.includes(r)), []);
  assert.deepEqual(withIndicators.filter(r => !baseline.includes(r)), [], 'an indicator names a requirement the baseline does not have');
  assert.equal(withIndicators.length, 32);
});

test('each requirement has at most 10 indicators with unique, contract-valid keys', () => {
  for (const r of indicatorRequirements()) {
    const keys = indicatorKeys(r);
    assert.ok(keys.length >= 1 && keys.length <= 10, r);
    assert.equal(new Set(keys).size, keys.length, r);
    for (const k of keys) assert.match(k, /^[a-z0-9_.]{3,80}$/);
  }
});
