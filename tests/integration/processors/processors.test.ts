// WP16 / M16 Processor and Vendor Management integration suite.
// Under test: notification, acknowledgement and verification stay three separate
// facts, a processor statement is never verification, and a finding closes only
// with defined evidence or a retest.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../packages/testing/src/evidence.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import * as S from '../../../packages/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/rehearsal permitted');
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
const later = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const earlier = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;

  phase = 'processor';
  const processor = S.Processor.parse(await (await staff.call('/api/v1/admin/processors', {
    name: 'Synthetic email delivery vendor', role: 'PROCESSOR',
    authorised_purpose_ids: [scenario.purpose.id], authorised_categories: ['CONTACT_DETAILS'],
    region: 'Local synthetic region', contract_reference: 'Contract SYN-DPA-0001',
    owner_reference: 'Vendor management', incident_contact: 'incidents@vendor.example',
    subprocessors_permitted: false,
  }, key())).json());
  check('a processor records its role and authorised scope', [processor.role, processor.authorised_purpose_ids], ['PROCESSOR', [scenario.purpose.id]]);
  check('a processor must be authorised for a purpose that exists',
    (await staff.call('/api/v1/admin/processors', { name: 'Ghost vendor', role: 'PROCESSOR', authorised_purpose_ids: [randomUUID()], authorised_categories: ['CONTACT_DETAILS'], region: 'Unknown', contract_reference: 'None', owner_reference: 'None', incident_contact: 'none@example.test', subprocessors_permitted: false }, key())).status, 404);
  check('a sub-processor cannot be permitted to sub-contract further without its own review',
    (await staff.call('/api/v1/admin/processors', { name: 'Chained vendor', role: 'SUB_PROCESSOR', authorised_purpose_ids: [scenario.purpose.id], authorised_categories: ['CONTACT_DETAILS'], region: 'Local', contract_reference: 'C', owner_reference: 'O', incident_contact: 'i@example.test', subprocessors_permitted: true }, key())).status, 400);

  // --- FR-M16-02: three different facts --------------------------------------
  phase = 'coordination';
  const subject = 'Marketing withdrawal propagation';
  const coordinate = (body: Record<string, unknown>) =>
    staff.call(`/api/v1/admin/processors/${processor.id}/coordination`, { processor_id: processor.id, subject, ...body }, key());

  check('an acknowledgement cannot exist before anything was notified',
    (await coordinate({ fact: 'ACKNOWLEDGED', method: 'RECORDED_REPLY', evidence_reference: 'Reply SYN-R-1', note: 'Vendor replied.' })).status, 409);
  const notified = S.Coordination.parse(await (await coordinate({ fact: 'NOTIFIED', method: 'RECORDED_MESSAGE', evidence_reference: 'Message SYN-M-1', note: 'Sent to the designated contact.' })).json());
  check('notification records the message that was sent', [notified.fact, notified.method], ['NOTIFIED', 'RECORDED_MESSAGE']);
  check('notification cannot claim an independent check as its method',
    (await coordinate({ fact: 'NOTIFIED', method: 'INDEPENDENT_CHECK', evidence_reference: 'Check SYN-C-1', note: 'Wrong method.' })).status, 400);

  const acknowledged = S.Coordination.parse(await (await coordinate({ fact: 'ACKNOWLEDGED', method: 'ATTRIBUTED_STATEMENT', evidence_reference: null, note: 'Vendor stated the records were suppressed.' })).json());
  check('an acknowledgement is something the processor said', acknowledged.fact, 'ACKNOWLEDGED');

  // The central rule of this module.
  check('a processor statement can never be recorded as verification',
    (await coordinate({ fact: 'VERIFIED', method: 'ATTRIBUTED_STATEMENT', evidence_reference: 'Vendor letter.', note: 'Vendor says it is done.' })).status, 400);
  check('a processor reply can never be recorded as verification',
    (await coordinate({ fact: 'VERIFIED', method: 'RECORDED_REPLY', evidence_reference: 'Vendor email.', note: 'Vendor confirmed.' })).status, 400);
  check('verification must name its own evidence',
    (await coordinate({ fact: 'VERIFIED', method: 'INDEPENDENT_CHECK', evidence_reference: null, note: 'Checked but nothing recorded.' })).status, 400);

  phase = 'standing before verification';
  const beforeCheck = S.ProcessorStanding.parse(await (await staff.call(`/api/v1/admin/processors/${processor.id}/standing`)).json());
  check('being told and replying is not being checked', [beforeCheck.notified, beforeCheck.acknowledged, beforeCheck.verified], [true, true, false]);
  check('standing states that only verification is evidence a control was checked', beforeCheck.limits[0]!.includes('Only verification is evidence'), true);
  check('standing states nothing is collected from the processor automatically', beforeCheck.limits.some(l => l.includes('recorded locally by a person')), true);

  phase = 'verification';
  const verified = S.Coordination.parse(await (await coordinate({ fact: 'VERIFIED', method: 'INDEPENDENT_CHECK', evidence_reference: 'Scoped read SYN-OBS-9', note: 'Independently read the target and confirmed suppression.' })).json());
  check('only an independent check records verification', [verified.fact, verified.method], ['VERIFIED', 'INDEPENDENT_CHECK']);
  const afterCheck = S.ProcessorStanding.parse(await (await staff.call(`/api/v1/admin/processors/${processor.id}/standing`)).json());
  check('all three facts are now established and still reported separately', [afterCheck.notified, afterCheck.acknowledged, afterCheck.verified], [true, true, true]);
  const rewrite = await db.query(`UPDATE app.processor_coordination SET fact='VERIFIED' WHERE processor_id=$1 AND fact='ACKNOWLEDGED'`, [processor.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('coordination history cannot be rewritten to upgrade a claim', rewrite, 'REJECTED');

  // --- FR-M16-01: unauthorised scope is derived, not asserted -----------------
  phase = 'authorisation drift';
  const other = await createMarketingScenario(h, 'SYNTHETIC_CRM', 'order_service_demo', false);
  await staff.call(`/api/v1/admin/processors/${processor.id}/systems`, { system_id: other.system.id, basis: 'Vendor operates this system under the master agreement.' }, key());
  const drift = S.ProcessorStanding.parse(await (await staff.call(`/api/v1/admin/processors/${processor.id}/standing`)).json());
  check('a system serving an unauthorised purpose is surfaced', drift.unauthorised_system_links.includes(other.system.id), true);
  check('linking the same system twice is refused',
    (await staff.call(`/api/v1/admin/processors/${processor.id}/systems`, { system_id: other.system.id, basis: 'Again.' }, key())).status, 409);

  // --- FR-M16-03/04: assessments and findings ---------------------------------
  phase = 'assessment';
  const assessment = S.Assessment.parse(await (await staff.call('/api/v1/admin/assessments', {
    processor_id: processor.id, kind: 'VENDOR_DUE_DILIGENCE',
    applicability_basis: 'Reviewed as applicable because this vendor processes contact details on our behalf.',
    scope_system_ids: [scenario.system.id], reviewer_reference: 'Privacy office', due_at: later(240),
  }, key())).json());
  check('an assessment records the reviewed reason it applies', assessment.applicability_basis.length > 10, true);
  check('an assessment starts open with no conclusion', [assessment.state, assessment.conclusion], ['OPEN', null]);

  phase = 'findings';
  const finding = S.Finding.parse(await (await staff.call('/api/v1/admin/findings', {
    assessment_id: assessment.id, severity: 'HIGH', description: 'The sub-processor list is out of date.',
    affected_system_ids: [scenario.system.id], owner_reference: 'Vendor management', due_at: earlier(1),
  }, key())).json());
  check('a finding is linked to a real assessment and system', [finding.assessment_id, finding.affected_system_ids], [assessment.id, [scenario.system.id]]);
  const withFindings = S.ProcessorStanding.parse(await (await staff.call(`/api/v1/admin/processors/${processor.id}/standing`)).json());
  check('an open finding is counted against the processor', withFindings.open_findings, 1);
  check('a finding past its deadline is counted as overdue', withFindings.overdue_remediations, 1);

  check('an assessment cannot be completed while its findings are open',
    (await staff.call(`/api/v1/admin/assessments/${assessment.id}/completion`, { conclusion: 'Closing early.' }, key())).status, 409);
  check('remediation without evidence or a retest is refused',
    (await staff.call(`/api/v1/admin/findings/${finding.id}/closure`, { state: 'REMEDIATED', closure_evidence: null, retest_reference: null, note: 'Claiming it is fixed.' }, key())).status, 400);
  const remediated = S.Finding.parse(await (await staff.call(`/api/v1/admin/findings/${finding.id}/closure`, {
    state: 'REMEDIATED', closure_evidence: null, retest_reference: 'Retest SYN-RT-0007', note: 'Sub-processor list refreshed and re-tested.',
  }, key())).json());
  check('a remediated finding names its retest', [remediated.state, remediated.retest_reference], ['REMEDIATED', 'Retest SYN-RT-0007']);
  check('a closed finding cannot be closed again',
    (await staff.call(`/api/v1/admin/findings/${finding.id}/closure`, { state: 'REMEDIATED', closure_evidence: 'Other.', retest_reference: null, note: 'Second attempt.' }, key())).status, 409);
  const reopenFinding = await db.query(`UPDATE app.assessment_findings SET state='OPEN' WHERE id=$1`, [finding.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database refuses to reopen a closed finding', reopenFinding, 'REJECTED');

  phase = 'assessment completion';
  const completed = S.Assessment.parse(await (await staff.call(`/api/v1/admin/assessments/${assessment.id}/completion`, {
    conclusion: 'Vendor accepted with the sub-processor list remediated and re-tested.',
  }, key())).json());
  check('a completed assessment records when it completed and what it concluded', [completed.state, completed.conclusion !== null], ['COMPLETED', true]);
  check('a new finding cannot be added to a completed assessment',
    (await staff.call('/api/v1/admin/findings', { assessment_id: assessment.id, severity: 'LOW', description: 'Late finding.', affected_system_ids: [], owner_reference: 'Someone', due_at: later(24) }, key())).status, 409);
  check('a conclusion too short to say anything is refused',
    (await staff.call(`/api/v1/admin/assessments/${assessment.id}/completion`, { conclusion: 'Fine.' }, key())).status, 400);
  check('a completed assessment cannot be completed again',
    (await staff.call(`/api/v1/admin/assessments/${assessment.id}/completion`, { conclusion: 'A second conclusion recorded after completion.' }, key())).status, 409);

  // --- authority ---------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read processors', (await auditor.call('/api/v1/admin/processors')).status, 200);
  check('an auditor cannot record a processor',
    (await auditor.call('/api/v1/admin/processors', { name: 'Auditor attempt', role: 'PROCESSOR', authorised_purpose_ids: [scenario.purpose.id], authorised_categories: ['CONTACT_DETAILS'], region: 'Local', contract_reference: 'C', owner_reference: 'O', incident_contact: 'i@example.test', subprocessors_permitted: false }, key())).status, 403);
  const member = await h.login('member');
  check('a member without the processor capability is refused', (await member.call('/api/v1/admin/processors')).status, 403);

  writeEvidence('processors-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('processors-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
