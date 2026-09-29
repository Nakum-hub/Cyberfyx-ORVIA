import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTest } from '../../scripts/qualification-inventory.ts';

test('qualification includes expansion, DPDP, standalone security and browser suites', () => {
  for (const path of ['tests/integration/expansion/preferences.test.ts', 'tests/integration/operations/rights.test.ts'])
    assert.equal(classifyTest(path), 'INTEGRATION');
  assert.equal(classifyTest('tests/security/graph-source-binding.ts'), 'SECURITY');
  assert.equal(classifyTest('tests/e2e/preferences-local.ts'), 'BROWSER_OR_TRANSPORT');
  assert.equal(classifyTest('tests/e2e/transport-preflight.ts'), 'BROWSER_OR_TRANSPORT');
  assert.equal(classifyTest('tests/e2e/consent.spec.ts'), 'PLAYWRIGHT');
});
test('test support is explicit and unknown naming cannot silently escape qualification', () => {
  assert.equal(classifyTest('tests/e2e/fixture.ts'), 'SUPPORT');
  assert.throws(() => classifyTest('tests/e2e/new-journey.ts'), /Unclassified/);
  assert.throws(() => classifyTest('tests/new-area/check.ts'), /Unclassified/);
});
