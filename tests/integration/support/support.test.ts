// WP26 / M30 Support Bundle System integration suite.
// Under test: a diagnostic report carries no operational detail, an approval is
// bound to the exact payload that was previewed, a rejected submission leaves no
// body behind, and a vendor closing their case never verifies a local control.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../packages/testing/src/evidence.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import { canonicalJson } from '../../../packages/contracts/src/crypto.ts';
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
const fieldCodes = async (response: Response) =>
  ((await response.json()) as { error: { field_errors?: { code: string }[] } }).error.field_errors?.map(e => e.code) ?? [];
/** Parses a response the contract says should have succeeded. A failure here is
 *  reported with the status the product actually gave, because "ZodError" on its
 *  own says nothing about what went wrong. */
async function body<T>(schema: { parse: (value: unknown) => T }, response: Response, expected = 201) {
  const value: unknown = await response.json();
  if (response.status !== expected) {
    console.log(`FAIL unexpected ${response.status} where ${expected} was required:`, JSON.stringify(value).slice(0, 400));
    throw new Error('Unexpected response status');
  }
  return schema.parse(value);
}
/** A direct write as the migrator, which is superuser and bypasses RLS. If it is
 *  refused, the refusal came from a trigger rather than from a policy. */
const direct = (sql: string, values: unknown[] = []) =>
  db.query(sql, values).then(() => 'ACCEPTED').catch(() => 'REJECTED');

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;   // ORG_ADMIN: support.manage, no support.approve
  const owner = scenario.owner;    // ORG_SUPER_ADMIN: also support.approve
  const installation = (await db.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0].installation_id;

  // A real coverage gap, derived from a real row, so the local control this case
  // is about is something that actually has to be closed.
  phase = 'gap';
  const asset = await body(S.DataAsset, await staff.call('/api/v1/admin/data-assets', {
    system_id: scenario.system.id, kind: 'DATASET', parent_id: null, name: `support_${randomUUID().slice(0, 8)}`,
    description: 'Synthetic copy used to derive a coverage gap for a support case.', provenance: 'ASSERTED',
    valid_from: new Date().toISOString(), categories: [],
  }, key()));
  await staff.call('/api/v1/admin/gaps/derive', {}, key());
  const gap = (await db.query(`SELECT id FROM app.coverage_gaps WHERE subject_id=$1 AND source='NO_RETENTION_BASIS' AND state='OPEN'`, [asset.id])).rows[0];
  if (!gap) throw new Error('Synthetic gap derivation produced nothing to open a case about');

  // --- cases -----------------------------------------------------------------
  phase = 'cases';
  const openCase = async (gapId: string | null, as = staff) =>
    as.call('/api/v1/admin/support-cases', { subject: 'CONNECTOR_OBSERVATION_FAILURE', gap_id: gapId }, key());
  check('a case naming a gap that does not exist is refused rather than opened',
    (await openCase(randomUUID())).status, 404);
  const linked = await body(S.SupportCase, await openCase(gap.id));
  check('a new case is open and has been submitted nowhere', [linked.state, linked.vendor_case_reference], ['OPEN', null]);

  // --- FR-M30-01: what a diagnostic report is able to say ---------------------
  phase = 'canary registration';
  // Registered before anything is generated, so canaries_checked proves the scan
  // ran against real registrations rather than an empty list.
  const unusedToken = `synthetic-unused-canary-${randomUUID()}`;
  const registered = await body(S.Canary, await staff.call('/api/v1/admin/support-canaries',
    { token: unusedToken, note: 'A token that appears nowhere, to prove the scan runs.' }, key()));
  check('a registered canary is returned by its digest and never by its token',
    [registered.token_digest, JSON.stringify(registered).includes(unusedToken)],
    [createHash('sha256').update(canonicalJson(unusedToken), 'utf8').digest('hex'), false]);
  check('registering the same token twice is refused',
    (await staff.call('/api/v1/admin/support-canaries', { token: unusedToken, note: 'Duplicate.' }, key())).status, 409);

  phase = 'generation';
  const generate = (id: string, as = staff) => as.call(`/api/v1/admin/support-cases/${id}/diagnostics`, {}, key());
  const first = await body(S.DiagnosticDraft, await generate(linked.id));
  const report = first.report;
  check('the scan ran against every registered canary and found nothing',
    [first.forbidden_content_scan.ran, first.forbidden_content_scan.canaries_checked >= 1, first.forbidden_content_scan.findings],
    [true, true, 0]);
  check('the report names a correlatable reference rather than the installation',
    [report.installation_reference === installation, /^[a-f0-9]{64}$/.test(report.installation_reference)], [false, true]);
  check('the reference is derived from the installation, so two reports correlate',
    report.installation_reference,
    createHash('sha256').update(`orvia-support-reference:${installation}`, 'utf8').digest('hex'));
  const ledger = Number((await db.query('SELECT count(*)::int AS n FROM bootstrap_migrations')).rows[0].n);
  check('the report states the schema revision this installation is actually on', report.schema_revision, ledger);
  check('the report declares the versions this build declares of itself',
    [report.product_version, report.contract_version], [S.PRODUCT_VERSION, S.CONTRACT_VERSION]);

  // The bytes that would be carried, checked against the identifiers a support
  // bundle normally leaks. None of them can be in there, because none of them
  // has a field to be in.
  const bytes = canonicalJson(report);
  for (const [what, value] of [
    ['the installation id', installation], ['the tenant id', scenario.scope.tenant_id],
    ['the environment id', scenario.scope.environment_id], ['a data principal', h.users.alice!.principal_id!],
    ['a staff member', h.users.owner!.email], ['a configured system', scenario.system.id],
    ['a data asset', asset.id], ['the coverage gap', gap.id], ['the support case', linked.id],
  ] as const) check(`the transferred bytes do not contain ${what}`, bytes.includes(String(value)), false);
  check('the report is a fixed vocabulary, not prose', Object.keys(report).sort(),
    ['command_schema_version', 'contract_version', 'counts', 'deployment_profile', 'generated_at',
      'installation_reference', 'observations', 'product_version', 'report_id', 'schema_revision', 'subject']);

  // --- FR-M30-02: approval is bound to one payload ---------------------------
  phase = 'approval';
  const approve = (draftId: string, approvedDigest: string, as = owner) =>
    as.call(`/api/v1/admin/diagnostics/${draftId}/approval`,
      { approved_digest: approvedDigest, destination: 'MANUAL_OFFLINE_TRANSFER', purpose: 'DIAGNOSE_REPORTED_FAILURE', retention_days: 30 }, key());
  check('managing support does not carry the authority to approve a payload for release',
    (await approve(first.id, first.payload_digest, staff)).status, 403);
  const wrong = await approve(first.id, 'b'.repeat(64));
  check('an approval naming a payload this draft never had is refused, not reconciled',
    [wrong.status, await fieldCodes(wrong)], [409, ['payload_changed_since_preview']]);
  const approval = await body(S.DiagnosticApproval, await approve(first.id, first.payload_digest));
  check('an approval carries no authority to generate anything', approval.authorises_generation, false);
  check('approving the same draft again is refused', (await approve(first.id, first.payload_digest)).status, 409);

  phase = 'approval at the database';
  check('the database refuses an approval that names a payload the draft never had',
    await direct(`INSERT INTO app.diagnostic_approvals(tenant_id,legal_entity_id,environment_id,id,draft_id,approved_digest,destination,purpose,retention_days,approved_by)
      SELECT tenant_id,legal_entity_id,environment_id,$1,id,$2,'MANUAL_OFFLINE_TRANSFER','DIAGNOSE_REPORTED_FAILURE',30,generated_by FROM app.diagnostic_drafts WHERE id=$3`,
    [randomUUID(), 'c'.repeat(64), first.id]), 'REJECTED');
  check('an approval is recorded once and never edited',
    await direct(`UPDATE app.diagnostic_approvals SET retention_days=365 WHERE id=$1`, [approval.id]), 'REJECTED');
  check('an approval is never deleted', await direct('DELETE FROM app.diagnostic_approvals WHERE id=$1', [approval.id]), 'REJECTED');
  check('the payload an approver previewed cannot be edited afterwards',
    await direct(`UPDATE app.diagnostic_drafts SET payload=payload||'{"log_tail":"ERROR"}'::jsonb WHERE id=$1`, [first.id]), 'REJECTED');
  check('a diagnostic draft is never deleted', await direct('DELETE FROM app.diagnostic_drafts WHERE id=$1', [first.id]), 'REJECTED');

  // --- transfer ---------------------------------------------------------------
  phase = 'transfer';
  const transfer = await body(S.DiagnosticTransfer, await staff.call(`/api/v1/admin/diagnostic-approvals/${approval.id}/transfers`,
    { method: 'MANUAL_OFFLINE_TRANSFER', outcome: 'ACCEPTED', rejection_code: null,
      evidence_reference: 'Vendor portal receipt SYN-SUP-0001.', note: 'Carried by the named operator on a removable medium.' }, key()));
  check('the recorded transfer carries exactly the approved payload and claims no transport',
    [transfer.digest_at_transfer, transfer.transported_by_orvia], [approval.approved_digest, false]);
  check('the database refuses a transfer carrying anything other than the approved payload',
    await direct(`INSERT INTO app.diagnostic_transfers(tenant_id,legal_entity_id,environment_id,id,approval_id,digest_at_transfer,method,outcome,rejection_code,evidence_reference,note,recorded_by)
      SELECT tenant_id,legal_entity_id,environment_id,$1,id,$2,'MANUAL_OFFLINE_TRANSFER','ACCEPTED',NULL,'Forged receipt.','Forged.',approved_by FROM app.diagnostic_approvals WHERE id=$3`,
    [randomUUID(), 'd'.repeat(64), approval.id]), 'REJECTED');
  check('a transfer record is append-only',
    await direct(`UPDATE app.diagnostic_transfers SET outcome='REJECTED' WHERE id=$1`, [transfer.id]), 'REJECTED');

  // --- a newer payload needs a newer approval ----------------------------------
  phase = 'supersession';
  const second = await body(S.DiagnosticDraft, await generate(linked.id));
  const standing = await body(S.SupportCaseStanding, await staff.call(`/api/v1/admin/support-cases/${linked.id}`), 200);
  check('a second draft supersedes the first, and the case shows both',
    standing.drafts.map(d => [d.id === first.id, d.superseded]), [[true, true], [false, false]]);
  check('the approval that named the old payload cannot transfer the new one',
    await fieldCodes(await staff.call(`/api/v1/admin/diagnostic-approvals/${approval.id}/transfers`,
      { method: 'MANUAL_OFFLINE_TRANSFER', outcome: 'NOT_ATTEMPTED', rejection_code: null, evidence_reference: null, note: 'Retried after regeneration.' }, key())),
    ['superseded_draft']);
  check('a superseded draft cannot be approved', await fieldCodes(await approve(first.id, first.payload_digest)), ['superseded_draft']);
  check('a superseded draft does not become current again',
    await direct('UPDATE app.diagnostic_drafts SET superseded=false WHERE id=$1', [first.id]), 'REJECTED');
  check('the newest draft is the one that can still be approved',
    (await approve(second.id, second.payload_digest)).status, 201);

  // --- FR-M30-03: the ingress check, and the body it never keeps ---------------
  phase = 'ingress';
  const columns = (await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='support_ingress_validations' ORDER BY column_name`)).rows.map(r => r.column_name);
  check('there is no column in which a submitted body could be kept', columns,
    ['accepted', 'byte_length', 'environment_id', 'id', 'legal_entity_id', 'rejection_code', 'tenant_id', 'validated_at', 'validated_by']);
  const validate = (reference: string, body: Buffer) =>
    staff.call('/api/v1/admin/support-ingress/validation', { case_reference: reference, body_base64: body.toString('base64') }, key());
  const outcome = async (reference: string, payload: Buffer) => body(S.IngressValidation, await validate(reference, payload), 200);
  const payload = Buffer.from(JSON.stringify(report), 'utf8');
  const unknown = await outcome('SYN_CASE_UNKNOWN', payload);
  check('a submission against a case reference this installation never recorded is refused',
    [unknown.accepted, unknown.rejection_code, unknown.body_persisted], [false, 'UNKNOWN_CASE_REFERENCE', false]);
  check('the refusal recorded the size and nothing else',
    (await db.query('SELECT byte_length FROM app.support_ingress_validations ORDER BY validated_at DESC LIMIT 1')).rows[0].byte_length,
    payload.byteLength);

  // --- FR-M30-04: the vendor's case and the local control ----------------------
  phase = 'resolution';
  const reference = 'SYN_CASE_0001';
  const resolved = await body(S.SupportCaseStanding, await staff.call(`/api/v1/admin/support-cases/${linked.id}/resolution`,
    { kind: 'REVIEWED_INSTRUCTIONS', reference: 'Vendor advice SYN-ADV-0001 was reviewed and applied locally.',
      vendor_case_state: 'VENDOR_CLOSED', vendor_case_reference: reference }, key()), 200);
  // The acceptance criterion, stated as one assertion: the vendor is finished and
  // the local control is not.
  check('a vendor closing their case leaves the local control exactly where it was',
    [resolved.vendor_case_state, resolved.local_control_state, resolved.local_control_verified, resolved.vendor_resolution_closes_local_gaps],
    ['VENDOR_CLOSED', 'GAP_OPEN', false, false]);
  check('the standing says the two are separate facts', resolved.limits.some(l => l.includes('separate facts')), true);
  check('there is no column on a support case in which local verification could be written',
    (await db.query(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='app' AND table_name='support_cases'
      AND (column_name LIKE '%verified%' OR column_name LIKE '%closes%' OR column_name LIKE '%gap_state%')`)).rows[0].n, 0);

  phase = 'local verification';
  await staff.call(`/api/v1/admin/gaps/${gap.id}/assignment`, { severity: 'MEDIUM', owner_reference: 'Head of records', due_at: later(240) }, key());
  check('resolving the local gap without evidence is refused',
    (await staff.call(`/api/v1/admin/gaps/${gap.id}/closure`, { state: 'RESOLVED', note: 'Claiming this is fixed.', evidence_reference: null }, key())).status, 400);
  await staff.call(`/api/v1/admin/gaps/${gap.id}/closure`,
    { state: 'RESOLVED', note: 'Retention basis recorded against the synthetic copy.', evidence_reference: 'Retention register SYN-RET-0001.' }, key());
  const verified = await body(S.SupportCaseStanding, await staff.call(`/api/v1/admin/support-cases/${linked.id}`), 200);
  check('the local control becomes verified only when its own gap is resolved with evidence',
    [verified.local_control_state, verified.local_control_verified], ['GAP_RESOLVED', true]);
  check('a closed case generates nothing further',
    await fieldCodes(await generate(linked.id)), ['case_already_closed']);

  // Now that the case carries a vendor reference, the ingress check can run
  // against it and report what a vendor would do with each body.
  phase = 'ingress outcomes';
  const accepted = await outcome(reference, payload);
  check('a report that would be accepted is reported as accepted', [accepted.accepted, accepted.rejection_code], [true, null]);
  for (const [name, code, body] of [
    ['a body that is not JSON', 'MALFORMED_JSON', Buffer.from('not json at all', 'utf8')],
    ['a body carrying a field the schema does not have', 'UNKNOWN_FIELD', Buffer.from(JSON.stringify({ ...report, log_tail: 'ERROR pool timeout' }), 'utf8')],
    ['a body whose values are not the declared vocabulary', 'SCHEMA_MISMATCH', Buffer.from(JSON.stringify({ ...report, subject: 'The CRM keeps timing out' }), 'utf8')],
    ['a body larger than the ingress accepts', 'OVERSIZED', Buffer.alloc(9000, 0x41)],
  ] as const) {
    const result = await outcome(reference, body);
    check(`${name} is refused and the reason is named`, [result.accepted, result.rejection_code], [false, code]);
  }
  check('no validation ever recorded a body, because there is nowhere to record one',
    (await db.query('SELECT count(*)::int AS n FROM app.support_ingress_validations')).rows[0].n >= 5, true);

  // --- the scan is defence in depth, and it refuses rather than redacts --------
  phase = 'forbidden content';
  const other = await body(S.SupportCase, await openCase(null));
  const unlinked = await body(S.SupportCaseStanding, await staff.call(`/api/v1/admin/support-cases/${other.id}`), 200);
  check('a case with no linked gap says so, rather than reporting a verified control',
    [unlinked.local_control_state, unlinked.local_control_verified], ['NO_LINKED_GAP', false]);
  await staff.call('/api/v1/admin/support-canaries',
    { token: report.installation_reference, note: 'Installation reference registered as forbidden.' }, key());
  const refused = await generate(other.id);
  check('a report matching a registered canary is refused, and the refusal names which',
    [refused.status, (await fieldCodes(refused)).map(c => c.startsWith('forbidden_content:'))], [409, [true]]);
  check('nothing was stored for the refused generation',
    (await db.query('SELECT count(*)::int AS n FROM app.diagnostic_drafts WHERE case_id=$1', [other.id])).rows[0].n, 0);
  // Fixture teardown, reaching past the product deliberately. The token above
  // appears in every report this installation can produce, and the product has
  // no way to withdraw a canary, so leaving it registered would refuse every
  // generation on the next run and this suite would pass exactly once. The row
  // removed is the one the suite registered seconds earlier and nothing else.
  // That the teardown has to bypass the product is itself the finding: canary
  // withdrawal is a missing capability, recorded as such.
  await db.query('DELETE FROM app.support_canaries WHERE token=$1', [report.installation_reference]);

  // --- authority -----------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor holding support.read may read a case', (await auditor.call(`/api/v1/admin/support-cases/${linked.id}`)).status, 200);
  check('an auditor may not open one', (await openCase(null, auditor)).status, 403);
  const member = await h.login('member');
  check('a member holding neither capability is refused', (await member.call('/api/v1/admin/support-cases')).status, 403);

  writeEvidence('support-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('support-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
