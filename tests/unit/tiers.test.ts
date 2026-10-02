// Revision 1.11 tier invariants. Docker-free. A route or entitlement added without a tier decision fails here, not in a
// customer's installation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENTITLEMENTS, EntitlementCode, LicenceClaims, ROUTE_CLASS_INPUTS, TIER_ORDER, classifyRoute, editionCeiling, routes,
} from '../../shared/contracts/src/index.ts';
import { uuid, sampleTime } from '../../shared/contracts/src/examples.ts';

const UNGATED = new Set(['READ', 'PLATFORM', 'PROTECTIVE']);
const byId = new Map(routes.map(route => [route.id, route]));

test('every route has a tier decision', () => {
  const missing = routes.filter(route => classifyRoute(route) === null).map(route => `${route.method} ${route.path}`);
  assert.deepEqual(missing, [], 'routes without a tier decision');
});

test('reading is never gated, so a downgrade or expiry never hides data', () => {
  for (const route of routes.filter(r => r.method === 'get')) assert.equal(classifyRoute(route), 'READ', route.id);
});

test('people, the organisation\'s website or app, suppliers and the agent never meet a plan wall', () => {
  for (const route of routes.filter(r => r.authority !== 'STAFF' && r.method !== 'get')) {
    assert.equal(classifyRoute(route), 'PROTECTIVE', `${route.id} (${route.authority}) is gated`);
  }
});

test('legal duties stay on the legal floor', () => {
  // Withdrawal, rights, breach and export are protective; the rest of the ordinary fiduciary's duties are FOUNDATION.
  const protective = ['withdraw', 'create_rights_request', 'transition_request', 'release_response', 'register_breach', 'create_incident',
    'transition_notification', 'create_data_export', 'intake_consent', 'intake_rights_request', 'record_cmp_consent', 'attest', 'reconcile',
    'record_system_restore', 'confirm_reerasure', 'send', 'restrict'];
  for (const id of protective) assert.equal(classifyRoute(byId.get(id)!), 'PROTECTIVE', id);
  const floor = ['create_systems', 'create_purposes', 'create_notices', 'create_intake_client', 'create_retention_rule', 'create_processor',
    'create_notification_task', 'create_cmp_site', 'create_principals'];
  for (const id of floor) {
    const cls = classifyRoute(byId.get(id)!)!;
    assert.ok(!UNGATED.has(cls) && ENTITLEMENTS[cls as keyof typeof ENTITLEMENTS].tier === 'FOUNDATION', `${id} is ${cls}, not on the legal floor`);
  }
});

test('switching off, revoking or terminating is never gated', () => {
  for (const id of ROUTE_CLASS_INPUTS.WIND_DOWN_IDS) {
    assert.ok(byId.has(id), `wind-down id ${id} names no route`);
    assert.equal(classifyRoute(byId.get(id)!), 'PROTECTIVE', id);
  }
  for (const id of [...ROUTE_CLASS_INPUTS.PROTECTIVE_IDS, ...Object.keys(ROUTE_CLASS_INPUTS.ID_ENTITLEMENT)]) assert.ok(byId.has(id), `${id} names no route`);
});

test('every sold higher-tier entitlement gates something, so a lower tier cannot get it for free', () => {
  const gated = new Set(routes.map(route => classifyRoute(route)));
  // DOWNSTREAM_VERIFICATION is carried out by the runner inside workflow runs; SSO_IDENTITY is not released yet.
  const runnerOrUnreleased = new Set(['DOWNSTREAM_VERIFICATION', 'SSO_IDENTITY']);
  for (const code of EntitlementCode.options) {
    if (ENTITLEMENTS[code].tier === 'FOUNDATION' || runnerOrUnreleased.has(code)) continue;
    assert.ok(gated.has(code), `${code} gates no route`);
  }
});

test('tiers are cumulative and an edition cannot carry a higher tier\'s features', () => {
  const sets = TIER_ORDER.map(editionCeiling);
  for (let i = 1; i < sets.length; i++) {
    for (const code of sets[i - 1]!) assert.ok(sets[i]!.has(code), `${TIER_ORDER[i]} lacks ${code}`);
    assert.ok(sets[i]!.size > sets[i - 1]!.size, `${TIER_ORDER[i]} adds nothing`);
  }
  assert.ok(!editionCeiling('FOUNDATION').has('REALTIME_ENFORCEMENT'));
  assert.ok(!editionCeiling('CONTROL').has('AUDIT_EXCHANGE'));
  assert.equal(editionCeiling('CUSTOM').size, EntitlementCode.options.length);
  // Significant Data Fiduciary duty tracking is on every tier (rev 1.11 section B).
  for (const edition of TIER_ORDER) assert.ok(editionCeiling(edition).has('SDF_OBLIGATIONS'), edition);
});

test('a trial is short, higher-tier and marked as a trial', () => {
  const base = {
    licence_id: uuid(900), edition: 'CONTROL' as const, entitlements: ['PRIVACY_GRAPH' as const], installation_id: uuid(901),
    audience: 'ORVIA_CUSTOMER_INSTALLATION' as const, valid_from: sampleTime, licensed_limits: { environments: 1, staff_members: 5 },
  };
  const plus = (days: number) => new Date(Date.parse(sampleTime) + days * 86400000).toISOString();
  assert.equal(LicenceClaims.parse({ ...base, valid_to: plus(30), term: 'TRIAL', trial: true, sequence: 2 }).trial, true);
  assert.throws(() => LicenceClaims.parse({ ...base, valid_to: plus(31), term: 'TRIAL', trial: true, sequence: 2 }), /30 days/);
  assert.throws(() => LicenceClaims.parse({ ...base, valid_to: plus(10), term: 'TRIAL', sequence: 2 }), /TRIAL/);
  assert.throws(() => LicenceClaims.parse({ ...base, valid_to: plus(10), term: 'MONTHLY', trial: true, sequence: 2 }), /TRIAL/);
  assert.throws(() => LicenceClaims.parse({ ...base, edition: 'FOUNDATION', valid_to: plus(10), term: 'TRIAL', trial: true, sequence: 2 }), /higher tiers/);
});
