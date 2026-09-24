// DPDP operations extension: pure invariants. Docker-free.
// The applicability evaluator is three-valued and never guesses a missing fact;
// requirements not yet in force are reported as such; package diffs name every
// change; package claims refuse unofficial or unhashed production sources; and
// a manual system never pretends to perform or verify an action.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression, decide } from '../../backend/domain/src/regulatory/applicability.ts';
import { diffRequirements } from '../../backend/domain/src/regulatory/packages.ts';
import { isOfficialSourceUrl, RegulatoryPackageClaims } from '../../shared/contracts/src/regulatory.ts';
import { adapterFor, manualAdapter } from '../../connectors/src/shared/connector-adapters.ts';
import { fixturePackage } from '../../shared/testing/src/regulatory-fixture.ts';

const unknownFacts = { 'organisation.sdf_status': null, 'organisation.third_schedule_class': null, 'activity.condition_code': null,
  'activity.processes_child_data': null, 'activity.has_processor': null, 'activity.has_active_relationships': null };
const claims = () => fixturePackage({ version: '1.0.0', previous_version: null, effective_from: '2026-01-01T00:00:00.000Z', requirement_effective_from: '2025-01-01' });

test('an unrecorded fact is unknown, never false', () => {
  const trace: string[] = [];
  assert.equal(evaluateExpression({ fact: 'organisation.sdf_status', equals: 'DESIGNATED' }, unknownFacts, trace), 'UNKNOWN');
  assert.equal(evaluateExpression({ not: { fact: 'organisation.sdf_status', equals: 'DESIGNATED' } }, unknownFacts, []), 'UNKNOWN');
  assert.equal(evaluateExpression({ fact: 'organisation.sdf_status', equals: 'DESIGNATED' }, { ...unknownFacts, 'organisation.sdf_status': 'NOT_DESIGNATED' }, []), 'FALSE');
  assert.equal(evaluateExpression({ always: true }, unknownFacts, []), 'TRUE');
});

test('three-valued all/any: a known answer wins only where it decides the result', () => {
  const facts = { ...unknownFacts, 'activity.has_processor': true };
  assert.equal(evaluateExpression({ any: [{ fact: 'activity.has_processor', equals: true }, { fact: 'activity.processes_child_data', equals: true }] }, facts, []), 'TRUE');
  assert.equal(evaluateExpression({ all: [{ fact: 'activity.has_processor', equals: true }, { fact: 'activity.processes_child_data', equals: true }] }, facts, []), 'UNKNOWN');
  assert.equal(evaluateExpression({ all: [{ fact: 'activity.has_processor', equals: false }, { fact: 'activity.processes_child_data', equals: true }] }, facts, []), 'FALSE');
});

test('decisions: unresolved for unknown facts, not yet in force before commencement', () => {
  const sdf = claims().requirements.find(r => r.requirement_id === 'DPDP-SDF-DPO')!;
  assert.equal(decide(sdf, unknownFacts, new Date('2026-06-01')).result, 'UNRESOLVED');
  assert.equal(decide(sdf, { ...unknownFacts, 'organisation.sdf_status': 'DESIGNATED' }, new Date('2026-06-01')).result, 'APPLICABLE');
  assert.equal(decide(sdf, { ...unknownFacts, 'organisation.sdf_status': 'NOT_DESIGNATED' }, new Date('2026-06-01')).result, 'NOT_APPLICABLE');
  assert.equal(decide({ ...sdf, effective_from: '2027-05-13' }, { ...unknownFacts, 'organisation.sdf_status': 'DESIGNATED' }, new Date('2026-06-01')).result, 'NOT_YET_IN_FORCE');
});

test('a package diff names added, changed and removed requirements', () => {
  const before = claims().requirements;
  const after = before.filter(r => r.requirement_id !== 'DPDP-CROSS-BORDER').map(r => r.requirement_id === 'DPDP-BREACH-BOARD-REPORT' ? { ...r, version: 2, statement: `${r.statement} Amended.` } : r);
  const diff = diffRequirements(before, after, '1.0.0');
  assert.deepEqual(diff.changed.map(c => c.requirement_id), ['DPDP-BREACH-BOARD-REPORT']);
  assert.deepEqual(diff.removed.map(c => c.requirement_id), ['DPDP-CROSS-BORDER']);
  assert.deepEqual(diff.added, []);
  assert.equal(diffRequirements(null, before, null).added.length, before.length);
});

test('only Government of India hosts count as official sources', () => {
  assert.equal(isOfficialSourceUrl('https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf'), true);
  assert.equal(isOfficialSourceUrl('https://egazette.gov.in/x.pdf'), true);
  assert.equal(isOfficialSourceUrl('https://meity.gov.in.example.com/x.pdf'), false);
  assert.equal(isOfficialSourceUrl('http://www.meity.gov.in/x.pdf'), false);
  assert.equal(isOfficialSourceUrl('https://fixture.invalid/rules'), false);
});

test('a production package must carry hashed official artifacts', () => {
  const fixture = claims();
  assert.throws(() => RegulatoryPackageClaims.parse({ ...fixture, distribution: 'PRODUCTION' }));
  const official = fixture.sources.map(s => ({ ...s, official_url: 'https://www.meity.gov.in/static/uploads/x.pdf', verification: 'ARTIFACT_HASHED' as const, artifact_digest: null, retrieved_at: null }));
  assert.throws(() => RegulatoryPackageClaims.parse({ ...fixture, distribution: 'PRODUCTION', sources: official }), 'a hashed source without its digest was accepted');
});

test('a manual system never performs or verifies anything', async () => {
  for (const action of ['SUPPRESS', 'ERASE', 'ANONYMISE', 'CORRECT', 'READ_REFERENCE'] as const) assert.equal(manualAdapter.supports(action), false);
  const pools = {} as never; const actor = {} as never;
  const action = { idempotency_key: 'k', action_type: 'ERASE' as const, system_id: 's', target_reference: 'r', payload: null };
  assert.equal((await manualAdapter.execute(pools, actor, action)).target_result, 'NOT_SUPPORTED');
  assert.equal((await manualAdapter.verify(pools, actor, action)).result, 'INCONCLUSIVE');
  assert.equal(adapterFor('UNKNOWN_ADAPTER'), null);
  assert.equal(adapterFor('__proto__'), null);
  assert.equal(adapterFor('SYNTHETIC_RECORDS_TEST_ADAPTER')?.capabilities.adapter_kind, 'TEST_ADAPTER');
});
