// WP04 / M03 contract invariants. These run without Docker and protect the
// meanings the schema is responsible for, independently of any stored row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DataAsset, DataAssetCreate, GraphRelationship, GraphRelationshipCreate, GraphSearchQuery, ImpactAssessment, NeighbourhoodQuery, RELATIONSHIP_ENDPOINTS, queryKeys, routes, schemas } from '../../shared/contracts/src/index.ts';
import { example,exampleRelationship, uuid, sampleTime } from '../../shared/contracts/src/examples.ts';

const asset = {
  id: uuid(200), system_id: uuid(201), kind: 'DATASET' as const, parent_id: null,
  name: 'crm_contacts', description: 'Declared CRM contact dataset.', provenance: 'ASSERTED' as const,
  valid_from: sampleTime, categories: [], review_state: 'UNREVIEWED' as const, recorded_at: sampleTime,
  valid_to: null, last_seen_at: null, fresh_until: null, owner_actor_id: uuid(202),
  tombstoned_at: null, tombstone_reason: null,
};
const observedTimes = { last_seen_at: sampleTime, fresh_until: '2026-09-16T11:00:00.000Z' };

test('a declaration and an observation cannot be confused for one another', () => {
  const request={system_id:asset.system_id,kind:asset.kind,parent_id:asset.parent_id,name:asset.name,
    description:asset.description,provenance:'OBSERVED',valid_from:asset.valid_from,categories:asset.categories};
  assert.throws(()=>DataAssetCreate.parse(request));
  // A declaration has no reading time and no freshness bound.
  assert.equal(DataAsset.parse(asset).provenance, 'ASSERTED');
  // An observation must carry both, and a declaration must carry neither.
  assert.throws(() => DataAsset.parse({ ...asset, provenance: 'OBSERVED' }));
  assert.throws(() => DataAsset.parse({ ...asset, ...observedTimes }));
  assert.throws(() => DataAsset.parse({ ...asset, provenance: 'OBSERVED', last_seen_at: sampleTime, fresh_until: null }));
  assert.equal(DataAsset.parse({ ...asset, provenance: 'OBSERVED', ...observedTimes }).fresh_until, observedTimes.fresh_until);
});

test('an observation cannot claim it stays fresh before it was taken', () => {
  assert.throws(() => DataAsset.parse({ ...asset, provenance: 'OBSERVED', last_seen_at: sampleTime, fresh_until: sampleTime }));
  assert.throws(() => DataAsset.parse({ ...asset, provenance: 'OBSERVED', last_seen_at: '2026-09-16T12:00:00.000Z', fresh_until: sampleTime }));
});

test('a tombstone always states its justification and never stands alone', () => {
  assert.throws(() => DataAsset.parse({ ...asset, tombstoned_at: sampleTime }));
  assert.throws(() => DataAsset.parse({ ...asset, tombstone_reason: 'Erased.' }));
  const erased = DataAsset.parse({ ...asset, name: '[REDACTED]', description: '[REDACTED]', tombstoned_at: sampleTime, tombstone_reason: 'Retention period elapsed.' });
  assert.equal(erased.tombstone_reason, 'Retention period elapsed.');
});

test('validity intervals cannot end before they start', () => {
  assert.throws(() => DataAsset.parse({ ...asset, valid_from: '2026-09-16T12:00:00.000Z', valid_to: sampleTime }));
  assert.throws(() => GraphRelationship.parse({ ...exampleRelationship, valid_from: '2026-09-16T12:00:00.000Z', valid_to: sampleTime }));
});

test('every relationship type fixes the kind of both of its endpoints', () => {
  for (const [type, expected] of Object.entries(RELATIONSHIP_ENDPOINTS)) {
    const valid = { relationship_type: type, from: { kind: expected.from, id: uuid(210) }, to: { kind: expected.to, id: uuid(211) },
      provenance: 'ASSERTED' as const, valid_from: sampleTime, confidence_basis: 'Declared.' };
    assert.equal(GraphRelationshipCreate.parse(valid).relationship_type, type);
    // Any other endpoint kind on either side is rejected, so an edge cannot
    // connect two nodes its own type does not describe.
    for (const wrong of ['DATA_ASSET', 'PROCESSING_ACTIVITY', 'SYSTEM', 'PURPOSE'] as const) {
      if (wrong !== expected.from) assert.throws(() => GraphRelationshipCreate.parse({ ...valid, from: { kind: wrong, id: uuid(212) } }), new RegExp('.'), `${type} accepted a ${wrong} source`);
      if (wrong !== expected.to) assert.throws(() => GraphRelationshipCreate.parse({ ...valid, to: { kind: wrong, id: uuid(213) } }), new RegExp('.'), `${type} accepted a ${wrong} target`);
    }
  }
});

test('a node cannot relate to itself', () => {
  const id = uuid(220);
  assert.throws(() => GraphRelationshipCreate.parse({ relationship_type: 'ASSET_COPIED_TO', from: { kind: 'DATA_ASSET', id }, to: { kind: 'DATA_ASSET', id },
    provenance: 'ASSERTED', valid_from: sampleTime, confidence_basis: 'Self reference.' }));
});

test('only an observed relationship carries an observation time', () => {
  assert.throws(()=>GraphRelationshipCreate.parse({...example('GraphRelationshipCreate') as object,provenance:'OBSERVED'}));
  assert.throws(() => GraphRelationship.parse({ ...exampleRelationship, provenance: 'OBSERVED' }));
  assert.throws(() => GraphRelationship.parse({ ...exampleRelationship, last_seen_at: sampleTime }));
  assert.equal(GraphRelationship.parse({ ...exampleRelationship, provenance: 'OBSERVED', last_seen_at: sampleTime }).last_seen_at, sampleTime);
});

test('an impact assessment separates a truncated dimension from an unavailable one', () => {
  const base = {
    node: { kind: 'SYSTEM' as const, id: uuid(230) }, assessed_at: sampleTime,
    affected: { policy_version_ids: [], workflow_ids: [], test_run_ids: [], data_asset_ids: [], owner_actor_ids: [],
      processor_ids: [], retention_constraint_ids: [], incident_ids: [] },
    truncated_dimensions: [], unavailable_dimensions: [], limits: [],
  };
  const assessed = ImpactAssessment.parse(base);
  // An empty affected list is an answer. An unavailable dimension is not.
  assert.deepEqual(assessed.affected.policy_version_ids, []);
  // WP15 and WP16 made processor and retention impact real, so nothing is left
  // unassessed. The field survives so a future dimension can be declared
  // unavailable rather than silently returned as empty.
  assert.deepEqual(assessed.unavailable_dimensions, []);
  const partial = ImpactAssessment.parse({ ...base, truncated_dimensions: ['WORKFLOWS', 'PROCESSORS'], unavailable_dimensions: ['NOTIFICATION_OBLIGATIONS'] });
  assert.deepEqual(partial.truncated_dimensions, ['WORKFLOWS', 'PROCESSORS']);
  assert.deepEqual(partial.unavailable_dimensions, ['NOTIFICATION_OBLIGATIONS']);
  // A dimension that is not part of the vocabulary cannot be invented, and a
  // dimension that is now implemented cannot be declared unavailable again.
  assert.throws(() => ImpactAssessment.parse({ ...base, unavailable_dimensions: ['EVERYTHING_ELSE'] }));
  assert.throws(() => ImpactAssessment.parse({ ...base, unavailable_dimensions: ['INCIDENTS'] }));
  assert.throws(() => ImpactAssessment.parse({ ...base, truncated_dimensions: ['WORKFLOWS_MAYBE'] }));
});

test('declared query parameters are bounded and are the only ones a route accepts', () => {
  assert.deepEqual(queryKeys('GraphSearchQuery'), ['q']);
  assert.deepEqual(queryKeys('NeighbourhoodQuery'), ['depth']);
  assert.throws(() => GraphSearchQuery.parse({ q: 'a' }));
  assert.throws(() => GraphSearchQuery.parse({ q: 'crm', unexpected: '1' }));
  assert.equal(GraphSearchQuery.parse({ q: 'crm' }).q, 'crm');
  // Traversal depth is bounded by the contract, not only by the implementation.
  assert.equal(NeighbourhoodQuery.parse({}).depth, '1');
  for (const depth of ['1', '2', '3']) assert.equal(NeighbourhoodQuery.parse({ depth }).depth, depth);
  for (const depth of ['0', '4', '9', '-1', 'all']) assert.throws(() => NeighbourhoodQuery.parse({ depth }));
});

test('every graph route is declared, scoped to a graph capability and has a registered schema', () => {
  const graphRoutes = routes.filter(route => route.capability === 'graph.read' || route.capability === 'graph.write');
  // The typed import path and three catalog discovery read/registration routes
  // use graph authority. Separate catalog approval uses connection.enable.
  assert.equal(graphRoutes.length, 21);
  for (const route of graphRoutes) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    // A write must be idempotent; a read must never be.
    assert.equal(route.capability === 'graph.write', route.method === 'post', `${route.id} mixes read and write semantics`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
    if (route.request) assert.ok(schemas[route.request], `${route.id} has no registered request schema`);
    if (route.query) assert.ok(queryKeys(route.query).length > 0, `${route.id} declares an empty query schema`);
  }
});
