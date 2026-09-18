import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { validateCapabilities, type CapabilityRegister } from '../../scripts/tracking.ts';

const load = () => JSON.parse(readFileSync('tracking/capabilities.json', 'utf8')) as CapabilityRegister;
const scripts = () => Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts as Record<string, string>);
const find = (register: CapabilityRegister, predicate: (c: CapabilityRegister['capabilities'][number]) => boolean) => {
  const match = register.capabilities.find(predicate);
  assert.ok(match, 'the register must contain a module matching this fixture');
  return match;
};

test('the published capability register is internally consistent and its evidence resolves', () => {
  validateCapabilities(load(), existsSync, scripts());
});

test('a module cannot claim it is built without evidence that actually resolves', () => {
  for (const mutate of [
    // Claiming delivery with nothing behind it.
    (r: CapabilityRegister) => { find(r, c => c.implementation_status === 'IMPLEMENTED_SANDBOX_SUBSET').evidence = []; },
    // Naming a suite that does not exist, which is how a register goes stale.
    (r: CapabilityRegister) => { find(r, c => c.implementation_status === 'IMPLEMENTED_SANDBOX_SUBSET').evidence = ['test:does-not-exist']; },
    // Naming a path that has since been deleted.
    (r: CapabilityRegister) => { find(r, c => c.implementation_status === 'PARTIAL_SANDBOX').evidence = ['tests/e2e/removed.spec.ts']; },
    // Built, but refusing to say which profile it was built for.
    (r: CapabilityRegister) => { find(r, c => c.implementation_status === 'IMPLEMENTED_SANDBOX_SUBSET').supported_profile = 'NOT_VERIFIED'; },
  ]) {
    const register = load(); mutate(register);
    assert.throws(() => validateCapabilities(register, existsSync, scripts()));
  }
});

test('an unbuilt or deferred module cannot borrow coverage it does not have', () => {
  for (const mutate of [
    (r: CapabilityRegister) => { find(r, c => c.implementation_status === 'NOT_IMPLEMENTED').evidence = ['test:auth']; },
    (r: CapabilityRegister) => { find(r, c => c.implementation_status === 'NOT_IMPLEMENTED').test_status = 'COVERED_AT_CANDIDATE'; },
    (r: CapabilityRegister) => { find(r, c => c.implementation_status === 'NOT_IMPLEMENTED').enabled_state = 'ENABLED_SYNTHETIC'; },
    (r: CapabilityRegister) => { find(r, c => c.target_product === 'V2').implementation_status = 'IMPLEMENTED_SANDBOX_SUBSET'; },
    (r: CapabilityRegister) => { find(r, c => c.target_product === 'V2').evidence = ['test:auth']; },
  ]) {
    const register = load(); mutate(register);
    assert.throws(() => validateCapabilities(register, existsSync, scripts()));
  }
});

test('the register cannot quietly lose a master module or invent a status', () => {
  for (const mutate of [
    (r: CapabilityRegister) => { r.capabilities.pop(); },
    (r: CapabilityRegister) => { r.capabilities[1]!.module_id = r.capabilities[0]!.module_id; },
    (r: CapabilityRegister) => { r.capabilities[0]!.implementation_status = 'DELIVERED'; },
    (r: CapabilityRegister) => { r.capabilities[0]!.test_status = 'PASS'; },
    (r: CapabilityRegister) => { r.note = ''; },
  ]) {
    const register = load(); mutate(register);
    assert.throws(() => validateCapabilities(register, existsSync, scripts()));
  }
});
