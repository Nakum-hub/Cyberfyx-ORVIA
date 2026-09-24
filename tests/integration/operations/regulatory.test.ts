// DPDP operations: Regulatory Core and regulatory update (quality s4 "Regulatory update").
// Under test: only a correctly signed package is accepted, a second person
// approves it, the package in force is decided by approval and effective date,
// an amended package produces a requirement diff and impact items, and a
// workflow pinned to the earlier package stays pinned after the change.
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { fixturePackage, signFixture } from '../../../shared/testing/src/regulatory-fixture.ts';

const t = operationsSuite('regulatory');
const { h, check, ok, codes } = t;
const keyId = process.env.ORVIA_RELEASE_KEY_ID; const privateKey = process.env.ORVIA_RELEASE_PRIVATE_KEY;
if (!keyId || !privateKey || !process.env.ORVIA_RELEASE_PUBLIC_KEY) throw new Error('Set ORVIA_RELEASE_KEY_ID, ORVIA_RELEASE_PRIVATE_KEY and ORVIA_RELEASE_PUBLIC_KEY from .local/release-fixture.json.');

await t.run(async () => {
  const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const admin = await h.login('admin'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const stamp = Date.now();
  const versionA = `2.${stamp}.0`; const versionB = `2.${stamp}.1`;
  t.setPhase('signature');
  const claimsA = fixturePackage({ version: versionA, previous_version: null, effective_from: new Date(Date.now() - 30_000).toISOString(), requirement_effective_from: '2025-01-01' });
  const signedA = signFixture(claimsA, keyId, privateKey);
  const tampered = structuredClone(signedA); tampered.package.claims.requirements[0]!.statement = 'A statement changed after signing, which the signature no longer covers.';
  check('a package whose claims changed after signing is rejected', await codes(owner.call('/api/v1/admin/regulatory/packages', tampered, key())), { status: 400, codes: ['invalid_signature'] });
  const stranger = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
  check('a package signed by an untrusted key is rejected', await codes(owner.call('/api/v1/admin/regulatory/packages', signFixture(claimsA, randomUUID(), stranger), key())), { status: 400, codes: ['untrusted_origin'] });
  const production = structuredClone(signedA.package) as unknown as { claims: Record<string, unknown> & { sources: Record<string, unknown>[] } };
  production.claims.distribution = 'PRODUCTION';
  production.claims.sources = production.claims.sources.map(s => ({ ...s, official_url: 'https://www.meity.gov.in/example.pdf', verification: 'NOT_RETRIEVED' }));
  check('a production package with an unhashed source is refused by the contract', (await owner.call('/api/v1/admin/regulatory/packages', { package: production }, key())).status, 400);
  check('an auditor cannot import a package', (await auditor.call('/api/v1/admin/regulatory/packages', signedA, key())).status, 403);
  check('an organisation admin cannot import a package', (await admin.call('/api/v1/admin/regulatory/packages', signedA, key())).status, 403);

  t.setPhase('import and approval');
  const imported = await ok(owner.call('/api/v1/admin/regulatory/packages', signedA, key()), S.schemas.RegulatoryPackage);
  check('an imported package is not yet in force', [imported.state, imported.active, imported.distribution], ['IMPORTED', false, 'TEST_FIXTURE']);
  check('a replayed package version is rejected', await codes(owner.call('/api/v1/admin/regulatory/packages', signedA, key())), { status: 400, codes: ['replayed'] });
  check('the importer cannot approve their own import', (await owner.call(`/api/v1/admin/regulatory/packages/${imported.id}/decision`, { decision: 'APPROVED', note: 'Self approval must be refused here.', acknowledged_open_verification_items: false }, key())).status, 403);
  const approved = await ok(reviewer.call(`/api/v1/admin/regulatory/packages/${imported.id}/decision`, { decision: 'APPROVED', note: 'Second reviewer approves the fixture package.', acknowledged_open_verification_items: false }, key()), S.schemas.RegulatoryPackage);
  check('a second super admin approves and the package is in force from its effective date', [approved.state, approved.active, approved.decided_by !== approved.imported_by], ['APPROVED', true, true]);
  check('a decision is recorded once', (await reviewer.call(`/api/v1/admin/regulatory/packages/${imported.id}/decision`, { decision: 'REJECTED', note: 'A second decision must be refused.', acknowledged_open_verification_items: false }, key())).status, 409);
  const detail = await ok(owner.call(`/api/v1/admin/regulatory/packages/${imported.id}`), S.schemas.RegulatoryPackageDetail);
  check('every requirement cites a provision the package carries', detail.requirements.every(r => r.provision_ids.every(p => detail.provisions.some(x => x.provision_id === p))), true);
  check('fixture requirements are shown in force from their fixture date', detail.requirements.every(r => r.legal_status_now === 'IN_FORCE'), true);
  check('the source verification is stated as a test fixture, never as a hashed official artifact', detail.sources.every(s => s.verification === 'TEST_FIXTURE'), true);
  check('another tenant cannot see this package', (await birch.call(`/api/v1/admin/regulatory/packages/${imported.id}`)).status, 404);

  t.setPhase('workflow pinned to A');
  const system = await t.boundSystem('Regulatory pin system');
  const setup = await t.activity({ condition: 'CONSENT', systems: [system.id] });
  const incident = await t.incident([system.id], 0);
  const breach = await ok(admin.call('/api/v1/admin/personal-data-breaches', { incident_id: incident.id, affected_count: null, affected_count_state: 'UNKNOWN', data_category_ids: [setup.dataCategory.id], activity_ids: [setup.activity.id], system_ids: [system.id], engagement_ids: [],
    facts: { nature: 'Synthetic nature', extent: 'Synthetic extent', timing: 'Synthetic timing', location: 'Synthetic location', likely_impact: 'Synthetic impact' }, mitigation: null }, key()), S.schemas.Breach);
  check('a breach is pinned to the package in force when the organisation became aware', breach.package.version, versionA);
  check('the 72-hour report deadline runs from awareness under package A', breach.tasks.find(x => x.kind === 'BOARD_DETAILED_REPORT')?.timer_rule.startsWith('Within 72 hours'), true);

  t.setPhase('package B');
  const claimsB = fixturePackage({ version: versionB, previous_version: versionA, effective_from: hoursFromNow(1), requirement_effective_from: '2025-01-01',
    amend: { 'DPDP-BREACH-BOARD-REPORT': { version: 2, timer: { kind: 'HOURS', runs_from: 'AWARENESS', hours: 48 }, title: 'Detailed breach information to the Board (fixture amendment)' } }, drop: ['DPDP-CROSS-BORDER'] });
  const importedB = await ok(owner.call('/api/v1/admin/regulatory/packages', signFixture(claimsB, keyId, privateKey), key()), S.schemas.RegulatoryPackage);
  check('the diff names the changed and the removed requirement against A', [importedB.diff.compared_with_version, importedB.diff.changed.map(c => c.requirement_id), importedB.diff.removed.map(c => c.requirement_id)],
    [versionA, ['DPDP-BREACH-BOARD-REPORT'], ['DPDP-CROSS-BORDER']]);
  const impacts = await ok(owner.call(`/api/v1/admin/regulatory/impacts?package_row_id=${importedB.id}&limit=100`), S.schemas.RegulatoryImpactList);
  check('impact items are created for the changed and removed requirements', ['DPDP-BREACH-BOARD-REPORT', 'DPDP-CROSS-BORDER'].every(id => impacts.items.some(i => i.requirement_id === id)), true);
  check('the open breach is named as affected by the changed breach requirement', impacts.items.some(i => i.requirement_id === 'DPDP-BREACH-BOARD-REPORT' && i.affected_kind === 'BREACH' && i.affected_id === incident.id), true);
  const reviewed = await ok(admin.call(`/api/v1/admin/regulatory/impacts/${impacts.items[0]!.id}/review`, { state: 'ACTIONED', note: 'Reviewed during fixture validation.' }, key()), S.schemas.RegulatoryImpact);
  check('an impact item is reviewed once', [reviewed.state, (await admin.call(`/api/v1/admin/regulatory/impacts/${impacts.items[0]!.id}/review`, { state: 'NOT_AFFECTED', note: 'A second review must be refused.' }, key())).status], ['ACTIONED', 409]);
  await ok(reviewer.call(`/api/v1/admin/regulatory/packages/${importedB.id}/decision`, { decision: 'APPROVED', note: 'Approve B with a future effective date.', acknowledged_open_verification_items: false }, key()), S.schemas.RegulatoryPackage);
  const now = await ok(owner.call('/api/v1/admin/regulatory/active-package'), S.schemas.ActivePackage);
  const later = await ok(owner.call(`/api/v1/admin/regulatory/active-package?as_of=${encodeURIComponent(hoursFromNow(2))}`), S.schemas.ActivePackage);
  check('an approved package with a future effective date does not govern now', now.package?.version, versionA);
  check('from its effective date the new package governs', later.package?.version, versionB);
  const pinned = await ok(admin.call(`/api/v1/admin/personal-data-breaches/${incident.id}`), S.schemas.Breach);
  check('the historical breach stays pinned to A with its original deadline rule', [pinned.package.version, pinned.tasks.find(x => x.kind === 'BOARD_DETAILED_REPORT')?.timer_rule.startsWith('Within 72 hours')], [versionA, true]);
  const future = await ok(admin.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ORGANISATION', scope_id: null, as_of: hoursFromNow(2) }, key()), S.schemas.ApplicabilityEvaluation);
  check('an evaluation at a later time uses the package in force then', [future.package_version, future.decisions.some(d => d.requirement_id === 'DPDP-CROSS-BORDER')], [versionB, false]);

  t.setPhase('applicability');
  const unknownChild = await t.activity({ condition: 'CONSENT', systems: [system.id], childData: 'UNKNOWN' });
  const evaluation = await ok(admin.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ACTIVITY', scope_id: unknownChild.activity.id, as_of: null }, key()), S.schemas.ApplicabilityEvaluation);
  const result = (id: string) => evaluation.decisions.find(d => d.requirement_id === id)?.result;
  check('a requirement that turns on an unrecorded fact is unresolved, not assumed', result('DPDP-CHILD-VERIFIABLE-CONSENT'), 'UNRESOLVED');
  check('the unrecorded fact is stored as unknown in the decision inputs', evaluation.decisions.find(d => d.requirement_id === 'DPDP-CHILD-VERIFIABLE-CONSENT')?.inputs['activity.processes_child_data'], null);
  check('a consent activity is subject to the consent notice requirement', result('DPDP-NOTICE-CONSENT-REQUEST'), 'APPLICABLE');
  check('a consent activity does not rest on a legitimate use', result('DPDP-LEGITIMATE-USES'), 'NOT_APPLICABLE');
  const decision = evaluation.decisions.find(d => d.requirement_id === 'DPDP-CHILD-VERIFIABLE-CONSENT')!;
  check('only regulatory.manage may record an exemption', (await admin.call('/api/v1/admin/regulatory/applicability/overrides', { decision_id: decision.id, basis: 'Synthetic exemption basis recorded by an admin.' }, key())).status, 403);
  const exemption = await ok(owner.call('/api/v1/admin/regulatory/applicability/overrides', { decision_id: decision.id, basis: 'Synthetic exemption with a recorded basis for validation.' }, key()), S.schemas.ApplicabilityDecision);
  check('an exemption is a new decision that keeps the original', [exemption.result, exemption.override_of], ['EXEMPT_WITH_RECORDED_BASIS', decision.id]);
  const rows = await t.db.query('SELECT count(*)::int n FROM app.applicability_decisions WHERE id=$1 AND result=$2', [decision.id, 'UNRESOLVED']);
  check('the original unresolved decision is unchanged', rows.rows[0].n, 1);
  check('a decision row cannot be rewritten even by the migrator', await t.db.query("UPDATE app.applicability_decisions SET result='APPLICABLE' WHERE id=$1", [decision.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED'), 'REJECTED');
});
