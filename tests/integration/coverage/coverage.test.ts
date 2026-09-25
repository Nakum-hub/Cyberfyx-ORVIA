// WP13 / M18 Coverage and Failure Center integration suite.
// Under test: a measure never hides its denominator, overlapping states are
// never summable, gaps come from real rows, and guidance closes nothing.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepCatalogDiscovery } from '../../../services/worker/src/catalog-discovery.ts';
import { observerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { waitForAuthWindow } from '../../../shared/testing/src/auth-window.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
const db = connectDatabase(profile).pool;
let runtime:ReturnType<typeof workflowActivities>|undefined;
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
const later = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

try {
  await h.start();
  await waitForAuthWindow(db);
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;
  const marker = randomUUID().slice(0, 8);
  const asset = async () =>
    S.DataAsset.parse(await (await staff.call('/api/v1/admin/data-assets', {
      system_id: scenario.system.id, kind: 'DATASET', parent_id: null, name: `coverage_${marker}_${randomUUID().slice(0, 6)}`,
      description: 'Synthetic copy for coverage measurement.', provenance:'ASSERTED',
      valid_from: new Date().toISOString(), categories: [],
    }, key())).json());

  const declared = await asset();
  const targetPath='/api/v1/admin/catalog-discovery-targets';
  const catalogTarget=S.CatalogDiscoveryTarget.parse(await (await staff.call(targetPath,{system_id:scenario.system.id,
    schema_name:'public',relation_name:'marketing_memberships'},key())).json());
  check('catalog source approved by separate owner',(await scenario.owner.call(`${targetPath}/${catalogTarget.id}/approve`,{},key())).status,200);
  runtime=workflowActivities();
  check('real catalog reader processed the source',await sweepCatalogDiscovery(runtime.scoped,
    runtime.enrollment.identities.map(x=>x.id),observerEnrollment(runtime.config).identities,runtime.observer)>=1,true);
  const source=S.CatalogDiscoveryDetail.parse(await (await staff.call(`${targetPath}/${catalogTarget.id}`)).json());
  const seen=S.DataAsset.parse(await (await staff.call('/api/v1/admin/data-assets/from-catalog',
    {observation_id:source.observations[0]!.id},key())).json());
  check('observed copy binds the independent read',seen.source_observation_id,source.observations[0]!.id);

  // --- FR-M18-01: a measure always shows what it counted --------------------
  phase = 'coverage';
  const coverage = S.CoverageReport.parse(await (await staff.call('/api/v1/admin/coverage')).json());
  check('every dimension is reported', coverage.measures.map(m => m.dimension).sort(),
    ['CONTROL_OBSERVATION', 'INVENTORY_OBSERVED', 'INVENTORY_REVIEWED', 'RETENTION_BASIS', 'RIGHTS_EXECUTION']);
  for (const measure of coverage.measures) {
    check(`${measure.dimension} states exactly what its denominator counts`, measure.counted.length > 10, true);
    check(`${measure.dimension} numerator never exceeds its denominator`, measure.numerator <= measure.denominator, true);
  }
  const inventory = coverage.measures.find(m => m.dimension === 'INVENTORY_OBSERVED')!;
  check('both new copies are inside the inventory denominator', inventory.denominator >= 2, true);
  check('coverage says it is not a measure of the estate', coverage.limits[0]!.includes('not a measure of the estate'), true);
  check('coverage says it is computed at read time, not stored', coverage.limits.some(l => l.includes('not a stored figure')), true);

  // --- FR-M18-02: overlapping states are never summable ---------------------
  phase = 'attention states';
  check('every attention state is reported', coverage.attention.map(a => a.state).sort(),
    ['EFFECT_UNKNOWN', 'FAILED', 'MANUAL_REQUIRED', 'PENDING', 'UNVERIFIED']);
  check('the report warns that these counts must not be added', coverage.limits.some(l => l.includes('never be added together')), true);
  const overlapping = coverage.attention.filter(a => a.overlaps_with.length > 0);
  check('states that can co-occur name what they overlap with', overlapping.length >= 3, true);
  check('no state claims to overlap with itself', coverage.attention.every(a => !a.overlaps_with.includes(a.state)), true);
  const unverified = coverage.attention.find(a => a.state === 'UNVERIFIED')!;
  check('a declared but unobserved copy counts as unverified', unverified.count >= 1, true);

  // --- FR-M18-03: gaps are derived from real rows ---------------------------
  phase = 'gap derivation';
  const derived = S.GapDerivation.parse(await (await staff.call('/api/v1/admin/gaps/derive', {}, key())).json());
  check('derivation examined real records', derived.examined > 0, true);
  check('derivation opened gaps for them', derived.opened > 0, true);
  check('derivation says an absent gap is not evidence of correctness', derived.limits.some(l => l.includes('not evidence of correctness')), true);

  const gapsFor = async (subject: string) => {
    const rows = await db.query('SELECT id,source,severity,state,detected_at FROM app.coverage_gaps WHERE subject_id=$1 ORDER BY source', [subject]);
    return rows.rows as { id: string; source: string; severity: string; state: string; detected_at: Date }[];
  };
  const declaredGaps = await gapsFor(declared.id);
  check('a copy with no retention basis raises that exact gap', declaredGaps.some(g => g.source === 'NO_RETENTION_BASIS'), true);
  check('a declared copy that was never read raises that exact gap', declaredGaps.some(g => g.source === 'NEVER_OBSERVED'), true);
  check('a missing retention basis is treated as a high-severity gap', declaredGaps.find(g => g.source === 'NO_RETENTION_BASIS')?.severity, 'HIGH');
  const observedGaps = await gapsFor(seen.id);
  check('a freshly observed copy raises no never-observed gap', observedGaps.some(g => g.source === 'NEVER_OBSERVED'), false);
  check('an independently seen dataset without an activity raises a mapping gap',
    observedGaps.some(g => g.source === 'NO_PROCESSING_MAP' && g.severity === 'MEDIUM'), true);

  phase = 're-derivation';
  const firstDetection = declaredGaps.find(g => g.source === 'NO_RETENTION_BASIS')!.detected_at.toISOString();
  const again = S.GapDerivation.parse(await (await staff.call('/api/v1/admin/gaps/derive', {}, key())).json());
  check('re-deriving refreshes instead of duplicating', again.opened, 0);
  check('re-deriving refreshed the findings it saw again', again.refreshed > 0, true);
  const afterRederive = await gapsFor(declared.id);
  check('a long-standing gap keeps its original detection date', afterRederive.find(g => g.source === 'NO_RETENTION_BASIS')!.detected_at.toISOString(), firstDetection);
  const duplicates = await db.query(`SELECT count(*)::int AS n FROM app.coverage_gaps WHERE subject_id=$1 AND source='NO_RETENTION_BASIS'`, [declared.id]);
  check('no duplicate gap was created for the same finding', duplicates.rows[0].n, 1);

  // --- FR-M18-03: owner, severity and deadline ------------------------------
  phase = 'assignment';
  const target = afterRederive.find(g => g.source === 'NO_RETENTION_BASIS')!;
  const assigned = S.Gap.parse(await (await staff.call(`/api/v1/admin/gaps/${target.id}/assignment`, {
    severity: 'CRITICAL', owner_reference: 'Records management', due_at: later(72),
  }, key())).json());
  check('assignment records severity, owner and deadline', [assigned.severity, assigned.owner_reference, assigned.due_at !== null], ['CRITICAL', 'Records management', true]);
  check('an assigned gap is in progress', assigned.state, 'IN_PROGRESS');

  // --- FR-M18-04: guidance is advisory only ---------------------------------
  phase = 'guidance';
  const guidance = S.Guidance.parse(await (await staff.call(`/api/v1/admin/gaps/${target.id}/guidance`)).json());
  check('guidance declares itself advisory only', guidance.authority, 'ADVISORY_ONLY');
  check('guidance matched a runbook rule for this source', guidance.matched_rule, 'RB-RETENTION-001');
  check('guidance says it does not establish a cause', guidance.caveats.some(c => c.includes('does not establish the cause')), true);
  check('guidance says it does not close the gap', guidance.caveats.some(c => c.includes('does not close this gap')), true);
  const stillOpen = await gapsFor(declared.id);
  check('reading guidance changed nothing about the gap', stillOpen.find(g => g.id === target.id)!.state, 'IN_PROGRESS');

  // --- closure --------------------------------------------------------------
  phase = 'closure';
  check('resolving without evidence is refused',
    (await staff.call(`/api/v1/admin/gaps/${target.id}/closure`, { state: 'RESOLVED', note: 'Claiming this is fixed.', evidence_reference: null }, key())).status, 400);
  const resolved = S.Gap.parse(await (await staff.call(`/api/v1/admin/gaps/${target.id}/closure`, {
    state: 'RESOLVED', note: 'A reviewed retention constraint was recorded for this copy.', evidence_reference: 'Constraint record SYN-RC-0001.',
  }, key())).json());
  check('a resolved gap names the evidence that resolved it', [resolved.state, resolved.evidence_reference !== null], ['RESOLVED', true]);
  check('a closed gap cannot be closed again', (await staff.call(`/api/v1/admin/gaps/${target.id}/closure`, { state: 'RESOLVED', note: 'Second closure attempt.', evidence_reference: 'Another record.' }, key())).status, 409);
  check('a closed gap cannot be reassigned', (await staff.call(`/api/v1/admin/gaps/${target.id}/assignment`, { severity: 'LOW', owner_reference: 'Someone else', due_at: later(24) }, key())).status, 409);
  const reopen = await db.query(`UPDATE app.coverage_gaps SET state='OPEN' WHERE id=$1`, [target.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database refuses to reopen a closed gap', reopen, 'REJECTED');
  const openGap = (await gapsFor(declared.id)).find(g => g.state === 'OPEN')!;
  check('an open gap exists to test the detection-date rule against', openGap !== undefined, true);
  const backdate = await db.query('UPDATE app.coverage_gaps SET detected_at=now() WHERE id=$1', [openGap.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database refuses to change a detection date', backdate, 'REJECTED');

  phase = 'recurrence';
  // The finding still holds, so re-deriving must open a NEW gap rather than
  // silently leaving the problem closed.
  const recurrence = S.GapDerivation.parse(await (await staff.call('/api/v1/admin/gaps/derive', {}, key())).json());
  check('a finding that recurs after closure opens a new gap', recurrence.opened > 0, true);
  const recurring = await db.query(`SELECT count(*)::int AS n FROM app.coverage_gaps WHERE subject_id=$1 AND source='NO_RETENTION_BASIS'`, [declared.id]);
  check('the closed gap and its recurrence are separate records', recurring.rows[0].n, 2);

  phase = 'accepted risk';
  const fresh = (await gapsFor(declared.id)).find(g => g.source === 'NO_RETENTION_BASIS' && g.state === 'OPEN')!;
  check('accepting a risk with no assigned owner is refused',
    (await staff.call(`/api/v1/admin/gaps/${fresh.id}/closure`, { state: 'ACCEPTED_RISK', note: 'Accepting without an owner.', evidence_reference: null }, key())).status, 409);
  await staff.call(`/api/v1/admin/gaps/${fresh.id}/assignment`, { severity: 'MEDIUM', owner_reference: 'Head of records', due_at: later(240) }, key());
  const accepted = S.Gap.parse(await (await staff.call(`/api/v1/admin/gaps/${fresh.id}/closure`, {
    state: 'ACCEPTED_RISK', note: 'Accepted for one quarter pending the records review programme.', evidence_reference: null,
  }, key())).json());
  check('accepted risk records an owner and a reason', [accepted.state, accepted.owner_reference !== null, accepted.resolution_note !== null], ['ACCEPTED_RISK', true, true]);

  // --- authority --------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read coverage', (await auditor.call('/api/v1/admin/coverage')).status, 200);
  check('an auditor may read gaps', (await auditor.call('/api/v1/admin/gaps')).status, 200);
  check('an auditor cannot derive gaps', (await auditor.call('/api/v1/admin/gaps/derive', {}, key())).status, 403);
  const member = await h.login('member');
  check('a member without the coverage capability is refused', (await member.call('/api/v1/admin/coverage')).status, 403);

  writeEvidence('coverage-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('coverage-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error),
    detail:error instanceof Error?error.message.slice(0,500):'Unknown failure',diagnostics:h.diagnostics.slice(-2000) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  if(runtime)await runtime.close();
  await h.stop();
  await db.end();
}
