// WP26 / M30 contract invariants. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONTRACT_VERSION, COMMAND_SCHEMA_VERSION, PRODUCT_VERSION, DiagnosticReport, DiagnosticApproval, DiagnosticTransfer,
  IngressValidation, SupportCaseStanding, SupportResolution, routes, schemas,
} from '../../packages/contracts/src/index.ts';
import { uuid, sampleTime } from '../../packages/contracts/src/examples.ts';
import { digest } from '../../packages/contracts/src/crypto.ts';
import { validateSubmission, scanForForbiddenContent } from '../../packages/domain/src/support/support.ts';

const report = {
  report_id: uuid(600), generated_at: sampleTime, installation_reference: 'a'.repeat(64),
  product_version: PRODUCT_VERSION, contract_version: CONTRACT_VERSION, command_schema_version: COMMAND_SCHEMA_VERSION,
  deployment_profile: 'CUSTOMER_LOCAL_SYNTHETIC' as const, schema_revision: 26,
  subject: 'CONNECTOR_OBSERVATION_FAILURE' as const,
  observations: [{ code: 'CONNECTOR_OBSERVATION_FAILED' as const, occurrences: 3, first_seen_at: sampleTime, last_seen_at: sampleTime }],
  counts: { systems_configured: 2, open_gaps: 4, workflows_needing_attention: 1, failed_notification_deliveries: 0 },
};
const standing = (overrides: Record<string, unknown> = {}) => ({
  support_case: {
    id: uuid(601), subject: 'CONNECTOR_OBSERVATION_FAILURE' as const, state: 'OPEN' as const,
    gap_id: uuid(602), vendor_case_reference: null, opened_at: sampleTime, opened_by: uuid(603),
  },
  vendor_case_state: 'NOT_SUBMITTED' as const, local_control_state: 'GAP_OPEN' as const,
  local_control_verified: false, drafts: [], vendor_resolution_closes_local_gaps: false as const,
  limits: ['The vendor case state and the local control state are separate facts.'],
  ...overrides,
});

test('the build declares one version of itself, and the contract agrees with the package', () => {
  const declared = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  assert.equal(PRODUCT_VERSION, declared, 'the contract and package.json disagree about what version this build is');
});

test('a diagnostic report has no field in which an operational detail could be written', () => {
  assert.equal(DiagnosticReport.parse(report).subject, 'CONNECTOR_OBSERVATION_FAILURE');
  // Every one of these is the kind of thing a support bundle usually carries.
  // None of them can be expressed here, which is the point of the module.
  for (const smuggled of [
    { log_tail: 'ERROR pool timeout for principal asha@aster.example' },
    { summary: 'Deletion failed for three data principals in the CRM.' },
    { directory: ['/var/lib/orvia/evidence'] }, { stack: 'at Object.<anonymous>' },
    { environment: { DATABASE_URL: 'postgres://user:pw@host/db' } }, { hostname: 'orvia-prod-01' },
    { principal_references: [uuid(604)] }, { query: 'SELECT * FROM app.consent_events' },
  ]) {
    assert.throws(() => DiagnosticReport.parse({ ...report, ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a diagnostic report`);
  }
  // And the declared fields cannot be talked into carrying prose either.
  assert.throws(() => DiagnosticReport.parse({ ...report, subject: 'The CRM connector keeps timing out' }));
  assert.throws(() => DiagnosticReport.parse({ ...report, observations: [{ code: 'Deletion failed', occurrences: 1, first_seen_at: sampleTime, last_seen_at: sampleTime }] }));
  assert.throws(() => DiagnosticReport.parse({ ...report, installation_reference: 'orvia-prod-01' }));
});

test('an observation cannot have been last seen before it was first seen', () => {
  assert.throws(() => DiagnosticReport.parse({ ...report,
    observations: [{ code: 'OPEN_CRITICAL_GAP' as const, occurrences: 1, first_seen_at: '2026-09-16T10:00:00.000Z', last_seen_at: '2026-09-15T10:00:00.000Z' }] }));
});

test('an approval carries no authority to generate, and a transfer claims no transport', () => {
  const approval = {
    id: uuid(605), draft_id: uuid(606), approved_digest: digest(report), destination: 'MANUAL_OFFLINE_TRANSFER' as const,
    purpose: 'DIAGNOSE_REPORTED_FAILURE' as const, retention_days: 30, approved_at: sampleTime, approved_by: uuid(607),
    authorises_generation: false as const, limits: ['This approval covers one payload that already exists.'],
  };
  assert.equal(DiagnosticApproval.parse(approval).authorises_generation, false);
  // There is no way to write down an approval that authorises generation, and no
  // way to write down a purpose other than the one this feature exists for.
  assert.throws(() => DiagnosticApproval.parse({ ...approval, authorises_generation: true }));
  assert.throws(() => DiagnosticApproval.parse({ ...approval, purpose: 'PRODUCT_IMPROVEMENT' }));
  assert.throws(() => DiagnosticApproval.parse({ ...approval, destination: 'VENDOR_TELEMETRY' }));

  const transfer = {
    id: uuid(608), approval_id: uuid(605), digest_at_transfer: digest(report), method: 'MANUAL_OFFLINE_TRANSFER' as const,
    outcome: 'ACCEPTED' as const, rejection_code: null, evidence_reference: 'Vendor receipt SYN-SUP-0001.',
    note: 'Carried to the vendor portal by the named operator.', recorded_at: sampleTime, recorded_by: uuid(607),
    transported_by_orvia: false as const,
  };
  assert.equal(DiagnosticTransfer.parse(transfer).transported_by_orvia, false);
  // The claim this product is not entitled to make.
  assert.throws(() => DiagnosticTransfer.parse({ ...transfer, transported_by_orvia: true }));
  assert.throws(() => DiagnosticTransfer.parse({ ...transfer, method: 'VENDOR_SUPPORT_INGRESS' }));
});

test('a submission is accepted exactly when nothing rejected it', () => {
  const accepted = { validated_at: sampleTime, accepted: true, rejection_code: null, byte_length: 400, body_persisted: false as const, limits: [] };
  assert.equal(IngressValidation.parse(accepted).accepted, true);
  // Accepting while naming a reason, or refusing without one, are both the same
  // lie in different directions.
  assert.throws(() => IngressValidation.parse({ ...accepted, rejection_code: 'OVERSIZED' }));
  assert.throws(() => IngressValidation.parse({ ...accepted, accepted: false }));
  assert.throws(() => IngressValidation.parse({ ...accepted, body_persisted: true }));
});

test('the ingress validator names why it refused, and never needs the body to do it', () => {
  const body = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8');
  assert.deepEqual(validateSubmission(body(report), []), { accepted: true, rejection_code: null });
  assert.equal(validateSubmission(Buffer.from('not json at all', 'utf8'), []).rejection_code, 'MALFORMED_JSON');
  assert.equal(validateSubmission(body({ ...report, log_tail: 'ERROR' }), []).rejection_code, 'UNKNOWN_FIELD');
  assert.equal(validateSubmission(body({ ...report, subject: 'ANYTHING' }), []).rejection_code, 'SCHEMA_MISMATCH');
  assert.equal(validateSubmission(Buffer.alloc(8193, 0x41), []).rejection_code, 'OVERSIZED');
  // An oversized body is refused before it is parsed, so a decompression-style
  // payload never reaches the schema at all.
  assert.equal(validateSubmission(Buffer.alloc(9000, 0x41), [{ token: 'AAAA' }]).rejection_code, 'OVERSIZED');
  assert.equal(validateSubmission(body(report), [{ token: report.installation_reference }]).rejection_code, 'FORBIDDEN_CONTENT');
});

test('the canary scan reaches every field of the payload, including nested ones', () => {
  assert.deepEqual(scanForForbiddenContent(report, []), []);
  assert.deepEqual(scanForForbiddenContent(report, [{ token: 'not-present-anywhere', note: 'Unused canary' }]), []);
  // Top level, nested object and nested array element in turn.
  assert.deepEqual(scanForForbiddenContent(report, [{ token: report.report_id, note: 'Top level' }]), ['Top level']);
  assert.deepEqual(scanForForbiddenContent(report, [{ token: 'CONNECTOR_OBSERVATION_FAILED', note: 'Inside an array' }]), ['Inside an array']);
  assert.deepEqual(scanForForbiddenContent({ a: { b: { c: 'deep-canary-token' } } }, [{ token: 'deep-canary-token', note: 'Three levels down' }]), ['Three levels down']);
});

test('a local control is verified by its gap, never by the vendor closing a case', () => {
  assert.equal(SupportCaseStanding.parse(standing()).local_control_verified, false);
  assert.equal(SupportCaseStanding.parse(standing({ local_control_state: 'GAP_RESOLVED', local_control_verified: true })).local_control_verified, true);
  // The exact acceptance criterion: a vendor can close their case while the
  // local gap is still open, and this must remain expressible.
  const stillOpen = SupportCaseStanding.parse(standing({ vendor_case_state: 'VENDOR_CLOSED', local_control_state: 'GAP_OPEN', local_control_verified: false }));
  assert.equal(stillOpen.vendor_case_state, 'VENDOR_CLOSED');
  assert.equal(stillOpen.local_control_verified, false);
  // Claiming verification on the strength of the vendor's answer is not.
  assert.throws(() => SupportCaseStanding.parse(standing({ vendor_case_state: 'VENDOR_CLOSED', local_control_verified: true })));
  // An accepted risk is a decision, not a verification.
  assert.throws(() => SupportCaseStanding.parse(standing({ local_control_state: 'GAP_RISK_ACCEPTED', local_control_verified: true })));
  // And the structural statement cannot be flipped by any caller.
  assert.throws(() => SupportCaseStanding.parse(standing({ vendor_resolution_closes_local_gaps: true })));
});

test('a recorded resolution has no field that could mark the local control verified', () => {
  const resolution = { kind: 'REVIEWED_INSTRUCTIONS' as const, reference: 'Vendor advice SYN-ADV-0001.', vendor_case_state: 'VENDOR_RESOLVED' as const, vendor_case_reference: 'SYN_CASE_0001' };
  assert.equal(SupportResolution.parse(resolution).kind, 'REVIEWED_INSTRUCTIONS');
  for (const smuggled of [{ local_control_verified: true }, { gap_state: 'RESOLVED' }, { closes_gap: true }, { evidence_reference: 'x' }]) {
    assert.throws(() => SupportResolution.parse({ ...resolution, ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a vendor resolution`);
  }
  // A live remote-access path is not one of the things a vendor may provide.
  assert.throws(() => SupportResolution.parse({ ...resolution, kind: 'VENDOR_REMOTE_SESSION' }));
  assert.throws(() => SupportResolution.parse({ ...resolution, kind: 'VENDOR_APPLIED_FIX' }));
});

test('approving a payload for release needs its own authority, separate from managing support', () => {
  const support = routes.filter(route => route.capability?.startsWith('support.'));
  assert.equal(support.length, 10);
  assert.deepEqual(support.filter(route => route.capability === 'support.approve').map(route => route.id), ['approve_diagnostic']);
  for (const route of support) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // There is no endpoint that transmits anything, because there is no transport.
  assert.ok(!support.some(route => ['send', 'upload', 'transmit', 'telemetry'].some(word => route.id.includes(word))));
});
