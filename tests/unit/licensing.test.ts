// WP25 / M27 + M28 contract invariants. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EntitlementCode, FeatureAvailability, LicenceClaims, NEVER_LICENSABLE, routes, schemas } from '../../shared/contracts/src/index.ts';
import { uuid, sampleTime } from '../../shared/contracts/src/examples.ts';

const claims = {
  licence_id: uuid(900), edition: 'CONTROL' as const, entitlements: ['PRIVACY_GRAPH' as const],
  installation_id: uuid(901), audience: 'ORVIA_CUSTOMER_INSTALLATION' as const,
  valid_from: sampleTime, valid_to: '2027-09-16T10:00:00.000Z',
  licensed_limits: { environments: 3, staff_members: 25 },
};
const gates = (overrides: Record<string, boolean> = {}) => ([
  { gate: 'RELEASE_AVAILABILITY' as const, satisfied: overrides.RELEASE_AVAILABILITY ?? true, reason: 'Shipped.' },
  { gate: 'DEPLOYMENT_SUPPORT' as const, satisfied: overrides.DEPLOYMENT_SUPPORT ?? true, reason: 'Supported.' },
  { gate: 'CONTROLLED_ROLLOUT' as const, satisfied: overrides.CONTROLLED_ROLLOUT ?? true, reason: 'Not held back.' },
  { gate: 'LICENCE_ENTITLEMENT' as const, satisfied: overrides.LICENCE_ENTITLEMENT ?? true, reason: 'Licensed.' },
  { gate: 'ACTOR_AUTHORISATION' as const, satisfied: overrides.ACTOR_AUTHORISATION ?? true, reason: 'Permitted.' },
]);

test('a licence carries no commands, endpoints or authority grants', () => {
  assert.equal(LicenceClaims.parse(claims).edition, 'CONTROL');
  // The claims schema is closed, so a licence cannot smuggle in anything that
  // would change what this product does.
  for (const smuggled of [
    { command: 'GRANT_ALL' }, { endpoints: ['/api/v1/admin/everything'] },
    { capabilities: ['graph.write'] }, { grants: { role: 'ORG_SUPER_ADMIN' } },
    { script: 'console.log(1)' }, { webhook: 'https://vendor.example/callback' },
  ]) {
    assert.throws(() => LicenceClaims.parse({ ...claims, ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a licence`);
  }
});

test('the entitlement vocabulary cannot express a capability this product will not sell', () => {
  // The closed enum is the enforcement: no signing key can authorise these,
  // because there is no way to write them down.
  for (const forbidden of NEVER_LICENSABLE) {
    assert.ok(!(EntitlementCode.options as string[]).includes(forbidden), `${forbidden} is licensable`);
    assert.throws(() => LicenceClaims.parse({ ...claims, entitlements: [forbidden] }), new RegExp('.'), `${forbidden} was accepted`);
  }
  assert.ok(NEVER_LICENSABLE.includes('AI_COPILOT'));
  assert.ok(NEVER_LICENSABLE.includes('VENDOR_REMOTE_ACCESS'));
  assert.ok(NEVER_LICENSABLE.includes('STAFF_DIRECTORY_SYNC'));
  assert.ok(NEVER_LICENSABLE.includes('PROACTIVE_DIAGNOSTICS'));
});

test('a licence states a positive validity window and no duplicate entitlements', () => {
  assert.throws(() => LicenceClaims.parse({ ...claims, valid_to: sampleTime }));
  assert.throws(() => LicenceClaims.parse({ ...claims, valid_from: '2027-01-01T00:00:00.000Z', valid_to: sampleTime }));
  assert.throws(() => LicenceClaims.parse({ ...claims, entitlements: ['PRIVACY_GRAPH', 'PRIVACY_GRAPH'] }));
  assert.throws(() => LicenceClaims.parse({ ...claims, entitlements: [] }));
  // Audience is a literal, so a licence for anything else cannot be expressed.
  assert.throws(() => LicenceClaims.parse({ ...claims, audience: 'ORVIA_VENDOR_CONSOLE' }));
});

test('a feature is usable exactly when all five gates pass', () => {
  assert.equal(FeatureAvailability.parse({ feature: 'PRIVACY_GRAPH', usable: true, gates: gates(), limits: [] }).usable, true);
  // Each gate alone is sufficient to block, and none alone is sufficient to open.
  for (const gate of ['RELEASE_AVAILABILITY', 'DEPLOYMENT_SUPPORT', 'CONTROLLED_ROLLOUT', 'LICENCE_ENTITLEMENT', 'ACTOR_AUTHORISATION']) {
    const blocked = gates({ [gate]: false });
    assert.equal(FeatureAvailability.parse({ feature: 'PRIVACY_GRAPH', usable: false, gates: blocked, limits: [] }).usable, false);
    // Claiming usable while that gate fails is the exact lie this prevents.
    assert.throws(() => FeatureAvailability.parse({ feature: 'PRIVACY_GRAPH', usable: true, gates: blocked, limits: [] }),
      new RegExp('.'), `usable was accepted with ${gate} failing`);
  }
  // Nor can a feature be reported unusable when everything passes.
  assert.throws(() => FeatureAvailability.parse({ feature: 'PRIVACY_GRAPH', usable: false, gates: gates(), limits: [] }));
});

test('every gate must be reported exactly once', () => {
  const duplicated = [...gates().slice(0, 4), { gate: 'RELEASE_AVAILABILITY' as const, satisfied: true, reason: 'Again.' }];
  assert.throws(() => FeatureAvailability.parse({ feature: 'PRIVACY_GRAPH', usable: true, gates: duplicated, limits: [] }));
  // Fewer than five gates is not a shorter answer, it is a missing check.
  assert.throws(() => FeatureAvailability.parse({ feature: 'PRIVACY_GRAPH', usable: true, gates: gates().slice(0, 4), limits: [] }));
});

test('licence routes are staff-only and importing is separated from reading', () => {
  const licenceRoutes = routes.filter(route => route.capability?.startsWith('licence.'));
  assert.equal(licenceRoutes.length, 2);
  assert.deepEqual(licenceRoutes.filter(r => r.capability === 'licence.manage').map(r => r.id), ['import_licence']);
  for (const route of licenceRoutes) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // There is no endpoint that issues or modifies a licence locally: a licence is
  // imported, never minted by the installation that uses it.
  assert.ok(!licenceRoutes.some(route => route.id.includes('issue') || route.id.includes('renew')));
});
