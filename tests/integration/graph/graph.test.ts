// WP04 / M03 Privacy Control Graph integration suite.
// Exercises the real HTTP boundary, the real scoped transaction and the real
// PostgreSQL constraints. Nothing here is simulated: every assertion reads back
// what the database actually stored.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
const db = connectDatabase(profile).pool;
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
let phase = 'setup';
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
  catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, { expected, actual }); throw new Error('Assertion failed: ' + name); }
}
const clients = new Map<string, ReturnType<HttpFixture['browser']>>();
const login = h.login.bind(h);
h.login = async name => { let browser = clients.get(name); if (!browser) { browser = await login(name); clients.set(name, browser); } return browser; };
const key = () => ({ 'idempotency-key': randomUUID() });

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  await scenario.change('grant');
  const withdrawal = await scenario.change('withdraw');
  const staff = scenario.author;
  const auditor = await h.login('auditor');

  // --- FR-M03-01: relational entities and typed relationships ----------------
  phase = 'inventory';
  const declared = S.DataAsset.parse(await (await staff.call('/api/v1/admin/data-assets', {
    system_id: scenario.system.id, kind: 'DATASET', parent_id: null, name: 'crm_contacts',
    description: 'Synthetic CRM contact dataset declared by the operator.', provenance: 'ASSERTED',
    valid_from: new Date().toISOString(),
    categories: [{ code: 'CONTACT_DETAILS', basis: 'Reviewed against the declared CRM schema.', review_state: 'ACCEPTED' }],
  }, key())).json());
  check('declared asset is stored with its reviewed category', declared.categories, [{ code: 'CONTACT_DETAILS', basis: 'Reviewed against the declared CRM schema.', review_state: 'ACCEPTED' }]);
  check('a declaration carries no observation time', [declared.last_seen_at, declared.fresh_until], [null, null]);
  check('a new record is not silently treated as reviewed', declared.review_state, 'UNREVIEWED');

  // FR-M03-02: asserted and observed provenance stay distinct.
  const observed = S.DataAsset.parse(await (await staff.call('/api/v1/admin/data-assets', {
    system_id: scenario.system.id, kind: 'FIELD', parent_id: declared.id, name: 'marketing_opt_in',
    description: 'Field seen by a scoped connector read.', provenance: 'OBSERVED',
    valid_from: new Date().toISOString(), categories: [],
  }, key())).json());
  check('an observation records when it was read and how long it is trusted', [observed.last_seen_at !== null, observed.fresh_until !== null], [true, true]);
  check('observation freshness ends after the reading', Date.parse(observed.fresh_until!) > Date.parse(observed.last_seen_at!), true);
  check('a field name alone assigns no category', observed.categories, []);

  phase = 'inventory rejections';
  const otherSystem = S.System.parse(await (await staff.call('/api/v1/admin/systems', { legal_entity_id: scenario.scope.legal_entity_id, environment_id: scenario.scope.environment_id, name: 'Second synthetic CRM', connector: 'SYNTHETIC_CRM' }, key())).json());
  const crossParent = await staff.call('/api/v1/admin/data-assets', {
    system_id: otherSystem.id, kind: 'FIELD', parent_id: declared.id, name: 'stray',
    description: 'Child claiming a parent in another system.', provenance: 'ASSERTED', valid_from: new Date().toISOString(), categories: [],
  }, key());
  check('a child asset cannot claim a parent in another system', crossParent.status, 400);
  const unknownSystem = await staff.call('/api/v1/admin/data-assets', {
    system_id: randomUUID(), kind: 'DATASET', parent_id: null, name: 'ghost',
    description: 'Asset in a system that does not exist.', provenance: 'ASSERTED', valid_from: new Date().toISOString(), categories: [],
  }, key());
  check('an asset cannot be recorded against an unknown system', unknownSystem.status, 404);

  // --- processing activities -------------------------------------------------
  phase = 'activities';
  const activity = S.ProcessingActivity.parse(await (await staff.call('/api/v1/admin/processing-activities', {
    purpose_id: scenario.purpose.id, name: 'Synthetic marketing send',
    description: 'Sends promotional messages to consenting synthetic principals.',
    lawful_condition: 'AFFIRMATIVE_MARKETING_CONSENT', owner_reference: 'Synthetic marketing operations',
  }, key())).json());
  check('activity records its owner and stays unreviewed', [activity.owner_actor_id !== null, activity.review_state], [true, 'UNREVIEWED']);
  const wrongCondition = await staff.call('/api/v1/admin/processing-activities', {
    purpose_id: scenario.purpose.id, name: 'Mislabelled activity', description: 'Claims a condition its purpose does not support.',
    lawful_condition: 'APPROVED_SYNTHETIC_ORDER_SERVICE', owner_reference: 'Synthetic operations',
  }, key());
  check('an activity cannot claim a condition its purpose does not support', wrongCondition.status, 400);

  // --- typed relationships ---------------------------------------------------
  phase = 'relationships';
  const stored = S.GraphRelationship.parse(await (await staff.call('/api/v1/admin/graph/relationships', {
    relationship_type: 'ASSET_STORED_IN_SYSTEM', from: { kind: 'DATA_ASSET', id: declared.id }, to: { kind: 'SYSTEM', id: scenario.system.id },
    provenance: 'ASSERTED', valid_from: new Date().toISOString(), confidence_basis: 'Declared during connector setup review.',
  }, key())).json());
  check('a stored-in edge resolves both typed endpoints', [stored.from.kind, stored.to.kind], ['DATA_ASSET', 'SYSTEM']);
  await staff.call('/api/v1/admin/graph/relationships', {
    relationship_type: 'ASSET_PROCESSED_BY_ACTIVITY', from: { kind: 'DATA_ASSET', id: declared.id }, to: { kind: 'PROCESSING_ACTIVITY', id: activity.id },
    provenance: 'ASSERTED', valid_from: new Date().toISOString(), confidence_basis: 'Declared during activity review.',
  }, key());
  await staff.call('/api/v1/admin/graph/relationships', {
    relationship_type: 'ACTIVITY_SERVES_PURPOSE', from: { kind: 'PROCESSING_ACTIVITY', id: activity.id }, to: { kind: 'PURPOSE', id: scenario.purpose.id },
    provenance: 'ASSERTED', valid_from: new Date().toISOString(), confidence_basis: 'Declared during activity review.',
  }, key());

  const mismatched = await staff.call('/api/v1/admin/graph/relationships', {
    relationship_type: 'ACTIVITY_SERVES_PURPOSE', from: { kind: 'DATA_ASSET', id: declared.id }, to: { kind: 'PURPOSE', id: scenario.purpose.id },
    provenance: 'ASSERTED', valid_from: new Date().toISOString(), confidence_basis: 'Endpoint kinds do not match the type.',
  }, key());
  check('an edge whose endpoints contradict its type is rejected', mismatched.status, 400);
  const danglingTarget = await staff.call('/api/v1/admin/graph/relationships', {
    relationship_type: 'ASSET_STORED_IN_SYSTEM', from: { kind: 'DATA_ASSET', id: declared.id }, to: { kind: 'SYSTEM', id: randomUUID() },
    provenance: 'ASSERTED', valid_from: new Date().toISOString(), confidence_basis: 'Target does not exist.',
  }, key());
  check('an edge cannot point at a node that does not exist in scope', danglingTarget.status, 404);
  const duplicate = await staff.call('/api/v1/admin/graph/relationships', {
    relationship_type: 'ASSET_STORED_IN_SYSTEM', from: { kind: 'DATA_ASSET', id: declared.id }, to: { kind: 'SYSTEM', id: scenario.system.id },
    provenance: 'ASSERTED', valid_from: new Date().toISOString(), confidence_basis: 'Same live edge again.',
  }, key());
  check('a second live edge of the same type between the same nodes is rejected', duplicate.status, 409);

  // --- FR-M03-03: bounded search and traversal -------------------------------
  phase = 'search';
  const found = S.GraphSearchResult.parse(await (await staff.call('/api/v1/admin/graph/search?q=crm_contacts')).json());
  check('search finds the declared asset', found.hits.filter(hit => hit.id === declared.id).length, 1);
  check('search states that it is not an estate discovery scan', found.limits[0]!.includes('not a discovery scan'), true);
  const undeclaredParameter = await staff.call('/api/v1/admin/graph/search?q=crm_contacts&unexpected=1');
  check('an undeclared query parameter is rejected, not ignored', undeclaredParameter.status, 400);
  const tooShort = await staff.call('/api/v1/admin/graph/search?q=a');
  check('a query below the declared minimum length is rejected', tooShort.status, 400);

  phase = 'traversal';
  const shallow = S.GraphNeighbourhood.parse(await (await staff.call(`/api/v1/admin/graph/nodes/${declared.id}/neighbourhood?depth=1`)).json());
  check('depth one reaches the directly related nodes only', [...new Set(shallow.nodes.map(n => n.kind))].sort(), ['DATA_ASSET', 'PROCESSING_ACTIVITY', 'SYSTEM']);
  const deep = S.GraphNeighbourhood.parse(await (await staff.call(`/api/v1/admin/graph/nodes/${declared.id}/neighbourhood?depth=2`)).json());
  check('depth two reaches the purpose the activity serves', deep.nodes.some(n => n.kind === 'PURPOSE' && n.id === scenario.purpose.id), true);
  check('traversal says absence of an edge is not proof of no flow', deep.limits[0]!.includes('not proof'), true);
  const badDepth = await staff.call(`/api/v1/admin/graph/nodes/${declared.id}/neighbourhood?depth=9`);
  check('a traversal depth outside the declared bound is rejected', badDepth.status, 400);

  // --- FR-M03-03: change impact ----------------------------------------------
  phase = 'impact';
  const systemImpact = S.ImpactAssessment.parse(await (await staff.call(`/api/v1/admin/graph/nodes/${scenario.system.id}/impact`)).json());
  check('the impact endpoint resolves the node kind from its identifier', systemImpact.node.kind, 'SYSTEM');
  check('changing a system identifies the policy version bound to it', systemImpact.affected.policy_version_ids.includes(scenario.policy.version_id), true);
  check('changing a system identifies the assets stored in it', systemImpact.affected.data_asset_ids.includes(declared.id), true);
  const purposeImpact = S.ImpactAssessment.parse(await (await staff.call(`/api/v1/admin/graph/nodes/${scenario.purpose.id}/impact`)).json());
  check('changing a purpose identifies the workflow it produced', purposeImpact.affected.workflow_ids.includes(withdrawal.receipt.workflow_id!), true);
  // WP15 and WP16 landed after WP04, so processor and retention impact are now
  // really computed. The field remains so a future dimension can be declared
  // unavailable rather than silently returned as empty.
  check('nothing is left silently unassessed', purposeImpact.unavailable_dimensions, []);
  check('processor impact is now a real dimension', Array.isArray(systemImpact.affected.processor_ids), true);
  check('retention impact is now a real dimension', Array.isArray(systemImpact.affected.retention_constraint_ids), true);
  check('an owner is attributed to the affected assets', systemImpact.affected.owner_actor_ids.length > 0, true);
  const unknownNode = await staff.call(`/api/v1/admin/graph/nodes/${randomUUID()}/impact`);
  check('impact for an identifier that is not a node in scope is not found', unknownNode.status, 404);

  phase = 'detail';
  const detail = S.DataAsset.parse(await (await staff.call(`/api/v1/admin/data-assets/${declared.id}`)).json());
  check('the detail endpoint returns the same record as the list', [detail.id, detail.name], [declared.id, declared.name]);
  const missingDetail = await staff.call(`/api/v1/admin/data-assets/${randomUUID()}`);
  check('an unknown asset identifier is not found', missingDetail.status, 404);

  // --- FR-M03-04: tombstones preserve history --------------------------------
  phase = 'tombstone';
  const edgesBefore = (await db.query('SELECT count(*)::int AS n FROM app.graph_relationships WHERE from_asset_id=$1 OR to_asset_id=$1', [declared.id])).rows[0].n;
  const tombstoned = S.DataAsset.parse(await (await staff.call(`/api/v1/admin/data-assets/${declared.id}/tombstone`, {
    reason: 'Personal payload erased after the retention period elapsed.', integrity_reference: 'EVIDENCE-ENVELOPE-0001',
  }, key())).json());
  check('the personal payload is gone', [tombstoned.name, tombstoned.description], ['[REDACTED]', '[REDACTED]']);
  check('the tombstone states its justification', tombstoned.tombstone_reason!.includes('EVIDENCE-ENVELOPE-0001'), true);
  check('category assignments are erased with the payload', tombstoned.categories, []);
  const edgesAfter = (await db.query('SELECT count(*)::int AS n FROM app.graph_relationships WHERE from_asset_id=$1 OR to_asset_id=$1', [declared.id])).rows[0].n;
  check('every relationship that referenced the asset still resolves', edgesAfter, edgesBefore);
  const stillTraversable = S.GraphNeighbourhood.parse(await (await staff.call(`/api/v1/admin/graph/nodes/${declared.id}/neighbourhood?depth=1`)).json());
  check('the tombstoned node is still reachable and is labelled as a tombstone', stillTraversable.nodes.find(n => n.id === declared.id)?.tombstoned, true);
  const afterSearch = S.GraphSearchResult.parse(await (await staff.call('/api/v1/admin/graph/search?q=crm_contacts')).json());
  check('the erased payload is no longer searchable', afterSearch.hits.some(hit => hit.id === declared.id), false);
  const repeated = await staff.call(`/api/v1/admin/data-assets/${declared.id}/tombstone`, { reason: 'Attempting to overwrite a recorded tombstone.', integrity_reference: 'EVIDENCE-ENVELOPE-0002' }, key());
  check('a recorded tombstone cannot be rewritten', repeated.status, 409);
  // The migration role is a superuser with BYPASSRLS, so row-level security does
  // not constrain it and the trigger is the only remaining defence. These checks
  // establish that the trigger holds against exactly that privileged path.
  const bypasses = (await db.query('SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0].rolbypassrls;
  check('the maintenance role does bypass row-level security, so the trigger is what is being tested', bypasses, true);
  const rewrite = await db.query(`UPDATE app.data_assets SET tombstone_reason='Silently changed' WHERE id=$1`, [declared.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the trigger refuses to rewrite a recorded tombstone even for a superuser', rewrite, 'REJECTED');
  const deletion = await db.query('DELETE FROM app.data_assets WHERE id=$1', [declared.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the trigger refuses to delete graph history even for a superuser', deletion, 'REJECTED');
  const edgeDeletion = await db.query('DELETE FROM app.graph_relationships WHERE from_asset_id=$1', [declared.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the trigger refuses to delete a relationship older evidence may reference', edgeDeletion, 'REJECTED');
  const survived = await db.query('SELECT tombstone_reason FROM app.data_assets WHERE id=$1', [declared.id]);
  check('the original tombstone justification is intact after every attempt', survived.rows[0].tombstone_reason.includes('EVIDENCE-ENVELOPE-0001'), true);

  // --- authority -------------------------------------------------------------
  phase = 'authority';
  const auditorRead = await auditor.call('/api/v1/admin/data-assets');
  check('an auditor may read the inventory', auditorRead.status, 200);
  const auditorWrite = await auditor.call('/api/v1/admin/data-assets', {
    system_id: scenario.system.id, kind: 'DATASET', parent_id: null, name: 'auditor_attempt',
    description: 'An auditor must not be able to write inventory.', provenance: 'ASSERTED', valid_from: new Date().toISOString(), categories: [],
  }, key());
  check('an auditor cannot write the inventory', auditorWrite.status, 403);
  const member = await h.login('member');
  const memberRead = await member.call('/api/v1/admin/data-assets');
  check('a member without the graph capability is refused', memberRead.status, 403);

  writeEvidence('graph-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('graph-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
