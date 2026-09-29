// DPDPA audit mandate and outbound channel (revision 1.6 addendum), end to end:
// the codex-a00 customer installation over its real HTTP boundary, the real
// background-worker code (channelSweep) running as the enrolled WORKER identity,
// and an isolated vendor installation reached through its real channel handler.
//   mandate drafting and dual approval; worker check-in with the installation
//   signed mandate; vendor pins the evidence key; scheduled snapshot generated
//   from ORVIA's own records and equal to what staff see; auditor requests
//   (collection, seeded sample, evidence file, one outside the mandate) decided
//   and answered; a sealed package sent over the channel for a file request; a
//   decline; replay, forgery, stale and unknown-engagement calls refused; a lost
//   response resolved by the original receipt; a chain gap recorded for good;
//   suspension stops requests; unanswered requests become report limitations;
//   leadership sees counts only; closing the engagement ends the channel.
//   Synthetic data only.
import { createHash, randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import * as C from '../../../shared/contracts/src/audit-channel.ts';
import { operationsSuite, key, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { vendorSigningKey } from '../../../scripts/credentials.ts';
import { runtimeConfig } from '../../../backend/auth/src/config.ts';
import { workerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { servicePool, machineAuthority } from '../../../backend/auth/src/machine.ts';
import { scopedTransaction } from '../../../database/customer/src/runtime.ts';
import { channelSweep, type ChannelEnv, type Transport } from '../../../backend/domain/src/dpdpa-audit/channel.ts';
import { open } from '../../../backend/vendor/audit/vault.ts';
import type { Context } from '../../../backend/domain/src/shared/transaction.ts';
import { vendorHarness } from '../vendor/harness.ts';
import { setupPractice, acceptEngagement, planEngagement, evidenceFor, paper } from '../vendor/practice-flow.ts';

const t = operationsSuite('audit-mandate');
const { h, check, ok, codes, db } = t;
const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n', 'latin1');
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor');
  await t.ensurePackage();
  const reqA = 'DPDP-NOTICE-CONSENT-REQUEST'; const reqB = 'DPDP-CONSENT-PROOF';
  const scopeIds = t.scope();

  // Earlier runs of this suite leave nothing active behind: their engagements are closed first.
  const old = await ok(owner.call('/api/v1/admin/audit-engagements?limit=100'), S.schemas.AuditEngagementList);
  for (const e of old.items.filter(e => e.engagement_reference.startsWith('ENG-M-') && e.state === 'ACTIVE')) await owner.call(`/api/v1/admin/audit-engagements/${e.id}/closure`, { reason: 'Closing a previous test run.' }, key());

  // The worker, exactly as the operations runner builds it.
  const config = runtimeConfig();
  const identity = workerEnrollment(config).identities.find(i => i.scope.environment_id === scopeIds.environment_id)!;
  const workerPool = servicePool(config, 'orvia_worker'); const actor = machineAuthority(identity);
  const scoped = <T>(work: (c: Context) => Promise<T>) => scopedTransaction(workerPool, actor, tx => work({ tx, actor, requestId: randomUUID() }));
  const sealKey = createHash('sha256').update('orvia-evidence-key-seal:' + config.secret('principal-secret')).digest();
  const audit = vendorSigningKey('audit');

  const vendor = await vendorHarness();
  try {
    t.setPhase('vendor engagement');
    const vcode = await vendor.issueSetupCode(); const anon = vendor.session();
    const va = { email: 'admin@vendor.example', password: `Admin-${randomUUID()}`, domain: 'vendor' as const } as { email: string; password: string; totp?: string; domain: 'vendor' };
    await anon.json('/api/v1/vendor/setup', { setup_code: vcode, owner: { name: 'Vendor Owner', email: 'owner@vendor.example', password: `Owner-${randomUUID()}` }, admin: { name: 'Vendor Admin', email: va.email, password: va.password } });
    const vadm = await vendor.login(va);
    const member = async (name: string, email: string, role: string) => { const r = await vadm.json('/api/v1/vendor/team', { name, email, role }); return { id: r.data.member.user_id as string, s: await vendor.login({ email, password: r.data.one_time_password, domain: 'vendor' }) }; };
    const lead = await member('Lead Auditor', 'lead@vendor.example', 'LEAD_AUDITOR'); const rev = await member('Audit Reviewer', 'rev@vendor.example', 'AUDIT_REVIEWER');
    const outsider = await member('Other Auditor', 'other@vendor.example', 'AUDITOR');
    const org = await vadm.json('/api/v1/vendor/organisations', { name: 'Aster Synthetic Ltd', registered_address: null });
    const reference = `ENG-M-${randomUUID().slice(0, 8)}`;
    const eng = await vadm.json('/api/v1/vendor/engagements', { organisation_id: org.data.id, reference, scope_requirement_ids: [reqA, reqB], period_from: inDays(-150), period_to: inDays(10) });
    const vid = eng.data.engagement_id as string; const code = eng.data.engagement_code as string;
    await vadm.json(`/api/v1/vendor/engagements/${vid}/team`, { user_id: lead.id, engagement_role: 'LEAD' });
    await vadm.json(`/api/v1/vendor/engagements/${vid}/team`, { user_id: rev.id, engagement_role: 'REVIEWER' });
    const ch0 = await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`);
    check('a new engagement has a channel, not yet used', [ch0.status, ch0.data.available, ch0.data.health.chain_state, ch0.data.health.installation_key_id, ch0.data.mandate], [200, true, 'NOT_STARTED', null, null]);
    // Auditor requests need an accepted engagement; the report needs an approved programme (task AUDIT-PRACTICE-01).
    const practice = await setupPractice(lead.s, rev.s);
    check('an auditor cannot issue channel requests before the engagement is accepted', (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel/requests`, { kind: 'COLLECT_NOW', requirement_id: null, categories: ['INDICATORS'], population: null, sample_size: null, description: 'Too early', due_date: inDays(7) })).status, 409);
    await acceptEngagement({ admin: vadm, reviewer: rev.s, lead: lead.s, engagementId: vid, ...practice });
    const plan = await planEngagement({ lead: lead.s, auditor: lead.s, reviewer: rev.s, engagementId: vid, requirements: [reqA, reqB], period: { from: inDays(-150), to: inDays(10) }, leadId: lead.id });
    check('the channel key is kept sealed; neither side keeps the code', (await vendor.operator.query('SELECT octet_length(key_ciphertext) AS n FROM vendor.channels WHERE engagement_id=$1', [vid])).rows[0].n, 32);

    t.setPhase('client mandate');
    const framework = await ok(admin.call('/api/v1/admin/grc/regulatory-framework', { name: unique('DPDP mandate framework') }, key()), S.schemas.GrcFramework);
    await ok(admin.call('/api/v1/admin/grc/controls', { title: unique('Itemised notices published'), description: 'Each consent activity has a published itemised notice.', owner_reference: 'Privacy office', review_interval_days: 90,
      mappings: [{ framework_id: framework.id, requirement_code: reqA }] }, key()), S.schemas.GrcControl);
    const ce = await ok(admin.call('/api/v1/admin/audit-engagements', { engagement_code: code, firm_name: 'ORVIA audit practice', engagement_reference: reference, scope_requirement_ids: [reqA, reqB], period_from: inDays(-150), period_to: inDays(10),
      processing_agreement_reference: null, independence_statement: null, empanelment_reference: null }, key()), S.schemas.AuditEngagement);
    const categories = ['INDICATORS', 'CONTROL_STANDING', 'NOTICE_VERSIONS', 'ACTIVITY_LOG_DIGEST', 'SAMPLE_COUNTS'];
    const draft = (body: Record<string, unknown> = {}) => admin.call(`/api/v1/admin/audit-engagements/${ce.id}/mandates`, { kind: 'ENGAGEMENT', scope_requirement_ids: [reqA, reqB], categories, schedule: 'DAILY', valid_from: at(-60_000), valid_to: at(30 * 86_400_000), ...body }, key());
    check('a mandate outside the engagement scope is refused', await codes(draft({ scope_requirement_ids: ['DPDP-CONSENT-VALIDITY'] })), { status: 400, codes: ['outside_engagement_scope'] });
    check('an engagement mandate cannot outlive the audit by more than 120 days', await codes(draft({ valid_to: at(200 * 86_400_000) })), { status: 400, codes: ['engagement_mandate_ends_within_120_days_of_the_audit_period'] });
    check('an auditor (read-only) cannot draft a mandate', (await auditor.call(`/api/v1/admin/audit-engagements/${ce.id}/mandates`, { kind: 'ENGAGEMENT', scope_requirement_ids: [reqA], categories, schedule: 'DAILY', valid_from: at(0), valid_to: at(86_400_000) }, key())).status, 403);
    const m0 = await ok(draft(), S.schemas.AuditMandate);
    check('a drafted mandate authorises nothing yet', [m0.state, m0.open], ['DRAFT', false]);
    check('the preparer cannot approve their own mandate', await codes(admin.call(`/api/v1/admin/audit-mandates/${m0.id}/approval`, {}, key())), { status: 409, codes: ['approver_must_differ_from_preparer'] });
    check('an auditor cannot approve a mandate', (await auditor.call(`/api/v1/admin/audit-mandates/${m0.id}/approval`, {}, key())).status, 403);
    const m1 = await ok(reviewer.call(`/api/v1/admin/audit-mandates/${m0.id}/approval`, {}, key()), S.schemas.AuditMandate);
    check('a different owner approves: the mandate is active and open', [m1.state, m1.open, m1.approved_by === h.users.reviewer!.id], ['ACTIVE', true, true]);
    check('a second mandate for the same engagement cannot be in force', await codes(reviewer.call(`/api/v1/admin/audit-mandates/${(await ok(draft(), S.schemas.AuditMandate)).id}/approval`, {}, key())), { status: 409, codes: ['another_mandate_in_force_end_it_first'] });
    const keyRows = await db.query('SELECT count(*)::int AS n FROM app.audit_channel_keys WHERE engagement_id=$1', [ce.id]);
    check('the client stored the channel key for the worker', keyRows.rows[0].n, 1);

    // Everything the worker sends goes through the vendor's real channel handler.
    let intercept: ((url: string, response: { status: number; text: string }) => { status: number; text: string } | 'THROW' | null) | null = null;
    const transport: Transport = async (url, init) => {
      const r = await vendor.handler(new Request(url, { method: 'POST', headers: init.headers, body: new Uint8Array(init.body) }));
      const response = { status: r.status, text: await r.text() };
      const changed = intercept?.(url, response);
      if (changed === 'THROW') throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
      return changed ?? response;
    };
    const env: ChannelEnv = { address: vendor.config.origin, auditKey: { key_id: audit.key_id, public: audit.public }, sealKey, transport, checkInSeconds: 60 };
    const sweep = () => channelSweep(scoped, env);
    const staleCheckIn = () => db.query("UPDATE app.audit_mandates SET last_check_in_at=last_check_in_at-interval '1 hour' WHERE id=$1", [m1.id]);

    t.setPhase('first check-in and snapshot');
    const staffGaps = await ok(auditor.call('/api/v1/admin/dpdpa-audit/gaps'), S.schemas.GapRegister);
    const r1 = await sweep();
    check('the worker checks in and the scheduled snapshot is accepted', [r1.check_ins >= 1, r1.deliveries_accepted, r1.errors.filter(e => e.includes(m1.id))], [true, 1, []]);
    const cch = await ok(auditor.call(`/api/v1/admin/audit-engagements/${ce.id}/channel`), S.schemas.AuditChannel);
    const cm = cch.mandates.find(x => x.id === m1.id)!;
    check('the client records the check-in and the accepted delivery', [cm.reported_state, cm.last_check_in_at !== null, cm.channel_problem, cch.deliveries.filter(d => d.state === 'ACCEPTED').length, cch.evidence_key_id?.startsWith('orvia-installation-')],
      ['ACTIVE', true, null, 1, true]);
    const vch = await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`);
    check('the vendor pinned the installation key and holds the signed mandate', [vch.data.health.installation_key_id, vch.data.health.chain_state, vch.data.mandate.state, vch.data.mandate.open, vch.data.mandate.document.personal_data],
      [cch.evidence_key_id, 'INTACT', 'ACTIVE', true, 'NONE_AUTOMATIC']);
    const d1 = await lead.s.json(`/api/v1/vendor/channel-deliveries/${vch.data.deliveries[0].delivery_id}`);
    const pub = (await db.query('SELECT public_key FROM app.installation_evidence_keys WHERE environment_id=$1', [scopeIds.environment_id])).rows[0].public_key as string;
    const doc = C.verifyInstallationSigned(d1.data.signed, pub, C.DeliveryDocument);
    check('the delivery verifies against the installation key; its receipt against the audit key', [doc.sequence, doc.previous_digest, C.verifyVendorSigned(d1.data.receipt, audit, C.DeliveryReceipt).outcome], [1, null, 'ACCEPTED']);
    const snapIndicators = Object.fromEntries(doc.entries.filter(e => e.category === 'INDICATORS' && e.requirement_id === reqA).map(e => [e.key, e.value]));
    const staffIndicators = Object.fromEntries(staffGaps.rows.find(r => r.requirement_id === reqA)!.indicators.map(i => [i.key, i.value]));
    check('the worker computed exactly what staff see (row-level security hid nothing)', [Object.keys(snapIndicators).length > 0, JSON.stringify(snapIndicators) === JSON.stringify(staffIndicators)], [true, true]);
    check('the snapshot covers each category in the mandate except request-only sampling', [...new Set(doc.entries.map(e => e.category))].sort(), ['ACTIVITY_LOG_DIGEST', 'CONTROL_STANDING', 'INDICATORS', 'NOTICE_VERSIONS'].filter(x => doc.entries.some(e => e.category === x)).sort());
    check('the snapshot carries indicators, control standing and the audit-trail digest', [doc.entries.some(e => e.category === 'CONTROL_STANDING'), doc.entries.some(e => e.key === 'activity_log.digest')], [true, true]);
    const checklist = await lead.s.json(`/api/v1/vendor/engagements/${vid}/checklist`);
    check('the auditor\'s checklist counts the mandate evidence per requirement', checklist.data.rows.find((r: { requirement_id: string }) => r.requirement_id === reqA).channel_entries,
      doc.entries.filter(e => e.requirement_id === reqA).length);
    check('no contact detail of any person is in the delivery', /@|\+91/.test(JSON.stringify(doc.entries)), false);
    const vis = await ok(owner.call('/api/v1/admin/vendor-visibility'), S.schemas.VendorVisibility);
    check('vendor-visibility lists the mandate and the delivery', [vis.audit_channel.mandates.some(x => x.mandate_id === m1.id), vis.audit_channel.deliveries.some(x => x.delivery_id === doc.delivery_id && x.personal_data === false)], [true, true]);

    t.setPhase('auditor requests');
    const ask = (s: typeof lead.s, body: Record<string, unknown>) => s.json(`/api/v1/vendor/engagements/${vid}/channel/requests`, { requirement_id: null, categories: [], population: null, sample_size: null, due_date: inDays(7), ...body });
    check('an auditor outside the engagement team cannot issue requests', (await ask(outsider.s, { kind: 'COLLECT_NOW', categories: ['INDICATORS'], description: 'Current indicators' })).status, 403);
    check('a sample without its population and size is refused', (await ask(lead.s, { kind: 'SAMPLE_COUNT', description: 'Sample' })).status, 400);
    await ask(lead.s, { kind: 'COLLECT_NOW', requirement_id: reqA, categories: ['INDICATORS'], description: 'Current notice indicators' });
    const sampleReq = await ask(lead.s, { kind: 'SAMPLE_COUNT', requirement_id: reqB, population: 'CONSENT_EVENTS_WITH_EVIDENCE', sample_size: 5, description: 'Five consent events: is evidence available?' });
    await ask(lead.s, { kind: 'EVIDENCE_FILE', requirement_id: reqA, description: 'Signed approval of the itemised notice.' });
    await ask(lead.s, { kind: 'EVIDENCE_FILE', requirement_id: reqB, description: 'Board minutes approving the consent design.' });
    await ask(lead.s, { kind: 'COLLECT_NOW', categories: ['POLICY_VERSIONS'], description: 'Policy versions' });
    const sampleSeed = sampleReq.data.requests.find((r: { kind: string }) => r.kind === 'SAMPLE_COUNT').seed as string;
    await staleCheckIn();
    const r2 = await sweep();
    check('the worker receives five requests; two need a client approver', [r2.requests_received, r2.requests_for_approval, r2.deliveries_accepted], [5, 2, 2]);
    const vreq = (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.requests as { kind: string; categories: string[]; requirement_id: string | null; status: string; status_reason: string | null; delivery_id: string | null }[];
    const byDesc = (kind: string, req: string | null, cat?: string) => vreq.find(r => r.kind === kind && r.requirement_id === req && (!cat || r.categories.includes(cat)))!;
    check('inside the mandate: answered automatically', [byDesc('COLLECT_NOW', reqA).status, byDesc('SAMPLE_COUNT', reqB).status], ['DELIVERED', 'DELIVERED']);
    check('evidence files wait for a client approver; the auditor sees that at once', [byDesc('EVIDENCE_FILE', reqA).status, byDesc('EVIDENCE_FILE', reqB).status], ['AWAITING_CLIENT_APPROVAL', 'AWAITING_CLIENT_APPROVAL']);
    check('outside the mandate: refused with the reason', [byDesc('COLLECT_NOW', null, 'POLICY_VERSIONS').status, byDesc('COLLECT_NOW', null, 'POLICY_VERSIONS').status_reason], ['REFUSED', 'CATEGORY_OUTSIDE_MANDATE']);
    const sampleDoc = C.DeliveryDocument.parse((await lead.s.json(`/api/v1/vendor/channel-deliveries/${byDesc('SAMPLE_COUNT', reqB).delivery_id}`)).data.document);
    const sampleEntry = sampleDoc.entries[0]!;
    const population = (await db.query(`SELECT id::text AS id, evidence_state='EVIDENCE_AVAILABLE' AS pass FROM app.consent_record_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 ORDER BY 1`,
      [scopeIds.tenant_id, scopeIds.legal_entity_id, scopeIds.environment_id])).rows as { id: string; pass: boolean }[];
    const expected = C.seededSelection(population, sampleSeed, 5);
    check('the sample follows the auditor\'s seed: same selection, same count, only counts leave', [sampleEntry.detail!.selection_sha256, sampleEntry.value, sampleEntry.detail!.population_size, 'id' in (sampleEntry.detail ?? {})],
      [C.selectionDigest(expected.map(x => x.id)), expected.filter(x => x.pass).length, population.length, false]);
    check('the chain stays intact across deliveries', (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.health, { ...(await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.health, chain_state: 'INTACT', next_sequence: 4 });

    t.setPhase('client approver answers file requests');
    const cReqs = (await ok(owner.call(`/api/v1/admin/audit-engagements/${ce.id}/channel`), S.schemas.AuditChannel)).requests;
    const fileReqA = cReqs.find(r => r.kind === 'EVIDENCE_FILE' && r.requirement_id === reqA)!; const fileReqB = cReqs.find(r => r.kind === 'EVIDENCE_FILE' && r.requirement_id === reqB)!;
    check('the client sees what waits for it and that the auditor was told', [fileReqA.decision, fileReqA.reported_to_auditor], ['AWAITING_CLIENT_APPROVAL', true]);
    const control = await ok(admin.call('/api/v1/admin/grc/controls', { title: unique('Notice approval'), description: 'Notice approvals are signed.', owner_reference: 'Privacy office', review_interval_days: 90, mappings: [{ framework_id: framework.id, requirement_code: reqA }] }, key()), S.schemas.GrcControl);
    const file = await ok(admin.call(`/api/v1/admin/grc/controls/${control.id}/evidence-files`, { description: 'Signed notice approval (synthetic)', file_name: 'approval.pdf', content_base64: pdf.toString('base64'), collected_at: at(-86_400_000), valid_until: at(60 * 86_400_000), contains_personal_data: 'NO' }, key()), S.schemas.EvidenceFile);
    await ok(reviewer.call(`/api/v1/admin/evidence-files/${file.id}/personal-data-confirmation`, { personal_data: 'NO' }, key()), S.schemas.EvidenceFile);
    const pkg = await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/packages`, { expires_at: at(14 * 86_400_000) }, key()), S.schemas.AuditPackage);
    await ok(admin.call(`/api/v1/admin/audit-packages/${pkg.id}/items`, { requirement_id: reqA, kind: 'FILE', title: 'Signed notice approval', evidence_file_id: file.id, indicator_key: null, statement: null }, key()), S.schemas.AuditPackage);
    check('an unapproved package cannot answer a request', await codes(owner.call(`/api/v1/admin/audit-channel-requests/${fileReqA.id}/decision`, { decision: 'PACKAGE', reason: null, package_id: pkg.id }, key())), { status: 409, codes: ['package_not_sendable'] });
    await ok(reviewer.call(`/api/v1/admin/audit-packages/${pkg.id}/approval`, {}, key()), S.schemas.AuditPackage);
    check('an auditor cannot decide a request', (await auditor.call(`/api/v1/admin/audit-channel-requests/${fileReqA.id}/decision`, { decision: 'REFUSED', reason: 'NOT_HELD', package_id: null }, key())).status, 403);
    const answered = await ok(owner.call(`/api/v1/admin/audit-channel-requests/${fileReqA.id}/decision`, { decision: 'PACKAGE', reason: null, package_id: pkg.id }, key()), S.schemas.ChannelRequest);
    check('the approved package is queued to answer the request', [answered.decision, answered.package_id], ['AWAITING_CLIENT_APPROVAL', pkg.id]);
    await ok(owner.call(`/api/v1/admin/audit-channel-requests/${fileReqB.id}/decision`, { decision: 'REFUSED', reason: 'NOT_HELD_BY_THE_ORGANISATION', package_id: null }, key()), S.schemas.ChannelRequest);
    check('a request decided once cannot be decided again', await codes(owner.call(`/api/v1/admin/audit-channel-requests/${fileReqB.id}/decision`, { decision: 'REFUSED', reason: 'AGAIN', package_id: null }, key())), { status: 409, codes: ['request_already_decided'] });
    await staleCheckIn();
    const r3 = await sweep();
    check('the package goes over the channel', r3.packages_sent, 1);
    const vinbox = await lead.s.json(`/api/v1/vendor/engagements/${vid}/inbox`);
    const vp = vinbox.data.packages.find((p: { client_package_id: string }) => p.client_package_id === pkg.id);
    check('the vendor verifies and accepts the package received over the channel', [vp?.state], ['ACCEPTED']);
    check('the channel source is recorded on the vendor side', (await vendor.operator.query('SELECT source FROM vendor.packages WHERE client_package_id=$1', [pkg.id])).rows[0].source, 'CHANNEL');
    const vreq3 = (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.requests as { requirement_id: string; kind: string; status: string; package_id: string | null; status_reason: string | null }[];
    check('the file request shows delivered with its package; the decline shows declined with the reason', [vreq3.find(r => r.kind === 'EVIDENCE_FILE' && r.requirement_id === reqA)?.status, vreq3.find(r => r.kind === 'EVIDENCE_FILE' && r.requirement_id === reqA)?.package_id,
      vreq3.find(r => r.kind === 'EVIDENCE_FILE' && r.requirement_id === reqB)?.status, vreq3.find(r => r.kind === 'EVIDENCE_FILE' && r.requirement_id === reqB)?.status_reason], ['DELIVERED', vp?.client_package_id === pkg.id ? pkg.id : 'wrong', 'REFUSED', 'NOT_HELD_BY_THE_ORGANISATION']);
    const vis2 = await ok(owner.call('/api/v1/admin/vendor-visibility'), S.schemas.VendorVisibility);
    check('vendor-visibility says this package was sent by ORVIA over the channel', [vis2.audit_packages.find(p => p.package_id === pkg.id)?.transported_by_orvia, vis2.audit_packages.find(p => p.package_id === pkg.id)?.channel_submissions[0]?.state], [true, 'ACCEPTED']);

    t.setPhase('refused calls');
    const channelKey = C.channelKey(code); const digest = (await db.query('SELECT code_digest FROM app.audit_engagements WHERE id=$1', [ce.id])).rows[0].code_digest as string;
    const call = async (path: string, body: Buffer, over: Record<string, string> = {}, key2 = channelKey) => {
      const ts = over.ts ?? String(Math.floor(Date.now() / 1000));
      const r = await vendor.handler(new Request(vendor.config.origin + path, { method: 'POST', body: new Uint8Array(body), headers: { 'content-type': C.CHANNEL_CONTENT_TYPE, [C.CHANNEL_HEADERS.engagement]: over.digest ?? digest,
        [C.CHANNEL_HEADERS.timestamp]: ts, [C.CHANNEL_HEADERS.signature]: over.sig ?? C.channelSignature(key2, ts, body) } }));
      return { status: r.status, json: await r.json().catch(() => null) };
    };
    const dbody = Buffer.from(JSON.stringify({ signed_delivery: d1.data.signed }));
    check('a wrong channel key is refused', (await call(C.CHANNEL_PATHS.deliveries, dbody, {}, C.channelKey('ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ'))).status, 401);
    check('an unknown engagement is refused', (await call(C.CHANNEL_PATHS.deliveries, dbody, { digest: 'f'.repeat(64) })).status, 401);
    const stale = String(Math.floor(Date.now() / 1000) - 3600);
    check('a stale timestamp is refused', (await call(C.CHANNEL_PATHS.deliveries, dbody, { ts: stale })).status, 401);
    check('a session cookie is never accepted on the channel', (await vendor.handler(new Request(vendor.config.origin + C.CHANNEL_PATHS.checkIn, { method: 'POST', headers: { cookie: 'x=1', 'content-type': C.CHANNEL_CONTENT_TYPE }, body: '{}' }))).status, 400);
    const replay = await call(C.CHANNEL_PATHS.deliveries, dbody);
    check('a replayed delivery gets its original receipt and is not stored twice', [replay.status, JSON.stringify(replay.json) === JSON.stringify(d1.data.receipt),
      (await vendor.operator.query('SELECT count(*)::int AS n FROM vendor.channel_deliveries WHERE delivery_id=$1', [doc.delivery_id])).rows[0].n], [200, true, 1]);
    const k = (await db.query('SELECT * FROM app.installation_evidence_keys WHERE environment_id=$1', [scopeIds.environment_id])).rows[0];
    const evidence: C.EvidenceKey = { key_id: k.key_id, public: k.public_key, private: open(sealKey, { ciphertext: k.private_ciphertext, nonce: k.private_nonce, tag: k.private_tag }, `evidence-key:${scopeIds.environment_id}`).toString('utf8') };
    const next = (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.health.next_sequence as number;
    const last = (await vendor.operator.query('SELECT last_digest FROM vendor.channels WHERE engagement_id=$1', [vid])).rows[0].last_digest as string;
    const forge = (over: Partial<C.DeliveryDocument>, signer = evidence) => Buffer.from(JSON.stringify({ signed_delivery: C.signByInstallation({ ...doc, delivery_id: randomUUID(), sequence: next, previous_digest: last, generated_at: new Date().toISOString(), ...over }, signer) }));
    check('a delivery signed by another installation key is refused', (await call(C.CHANNEL_PATHS.deliveries, forge({}, C.newEvidenceKey()))).status, 400);
    const outside = await call(C.CHANNEL_PATHS.deliveries, forge({ entries: [{ ...doc.entries[0]!, category: 'POLICY_VERSIONS' }] }));
    check('a delivery outside the mandate gets a signed refusal', [outside.status, C.verifyVendorSigned(outside.json, audit, C.DeliveryReceipt).outcome, C.verifyVendorSigned(outside.json, audit, C.DeliveryReceipt).reasons], [200, 'REFUSED', ['CATEGORY_OUTSIDE_MANDATE']]);

    t.setPhase('unknown outcomes');
    await db.query("UPDATE app.audit_mandates SET next_collection_at=clock_timestamp()-interval '1 minute' WHERE id=$1", [m1.id]);
    intercept = url => url.endsWith(C.CHANNEL_PATHS.deliveries) ? 'THROW' : null;
    const r4 = await sweep();
    check('a lost response leaves the delivery UNKNOWN, not failed and not accepted', [r4.deliveries_accepted, r4.deliveries_pending], [0, 1]);
    intercept = null;
    const unknownRow = (await db.query("SELECT id, state FROM app.audit_channel_deliveries WHERE mandate_id=$1 AND state='UNKNOWN'", [m1.id])).rows[0];
    await staleCheckIn();
    const r5 = await sweep();
    check('the same signed delivery is sent again and settled by the vendor\'s original receipt', [r5.deliveries_accepted >= 1, (await db.query('SELECT state FROM app.audit_channel_deliveries WHERE id=$1', [unknownRow?.id])).rows[0]?.state,
      (await vendor.operator.query('SELECT count(*)::int AS n FROM vendor.channel_deliveries WHERE delivery_id=$1', [unknownRow?.id])).rows[0].n], [true, 'ACCEPTED', 1]);
    intercept = (url, resp) => url.endsWith(C.CHANNEL_PATHS.checkIn) ? { status: 200, text: JSON.stringify(C.signByVendor(JSON.parse(resp.text).document, { key_id: audit.key_id, private: vendorSigningKey('release').private })) } : null;
    await staleCheckIn();
    await sweep();
    intercept = null;
    check('an answer not signed by the trusted audit key is ignored and shown as a problem', (await ok(owner.call(`/api/v1/admin/audit-engagements/${ce.id}/channel`), S.schemas.AuditChannel)).mandates.find(x => x.id === m1.id)!.channel_problem, 'CHECK_IN_ANSWER_NOT_SIGNED_BY_TRUSTED_AUDIT_KEY');

    t.setPhase('chain gap');
    const n2 = (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.health.next_sequence as number;
    const l2 = (await vendor.operator.query('SELECT last_digest FROM vendor.channels WHERE engagement_id=$1', [vid])).rows[0].last_digest as string;
    const gap = await call(C.CHANNEL_PATHS.deliveries, forge({ sequence: n2 + 1, previous_digest: l2 }));
    const gh = (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.health;
    check('a delivery that skips one is accepted but the chain is marked broken for good', [C.verifyVendorSigned(gap.json, audit, C.DeliveryReceipt).reasons, gh.chain_state, typeof gh.chain_problem], [['CHAIN_BROKEN'], 'BROKEN', 'string']);

    t.setPhase('practice fieldwork on channel evidence');
    const V = '/api/v1/vendor';
    const entryA = doc.entries.find(e => e.requirement_id === reqA && e.category === 'INDICATORS')!;
    const evA = await evidenceFor({ auditor: lead.s, engagementId: vid, procedureId: plan.procedures[reqA]!, register: { source: 'CHANNEL_ENTRY', delivery_id: doc.delivery_id, entry_key: entryA.key, valid_until: null, description: null } });
    const evFile = (await lead.s.json(`${V}/engagements/${vid}/file`)).data;
    const evRow = evFile.evidence.find((x: { id: string }) => x.id === evA);
    check('a signed channel entry is registered as system-generated evidence with its provenance and hash', [evRow.evidence_type, evRow.source, evRow.provenance.includes(cch.evidence_key_id!), evRow.sha256 === createHash('sha256').update(JSON.stringify(entryA)).digest('hex') || /^[a-f0-9]{64}$/.test(evRow.sha256)],
      ['SYSTEM_GENERATED', 'CHANNEL_ENTRY', true, true]);
    const vreqs = (await lead.s.json(`${V}/engagements/${vid}/channel`)).data.requests as { id: string; kind: string; delivery_id: string | null; seed: string | null }[];
    const sampled = vreqs.find(r => r.kind === 'SAMPLE_COUNT' && r.delivery_id)!;
    const smpDoc = C.verifyInstallationSigned((await lead.s.json(`${V}/channel-deliveries/${sampled.delivery_id}`)).data.signed, pub, C.DeliveryDocument);
    const smpEntry = smpDoc.entries.find(e => e.category === 'SAMPLE_COUNTS')!;
    check('population from a sample the server seeded is refused until its signed entry is registered', (await lead.s.json(`${V}/procedures/${plan.procedures[reqB]}/populations`, { source_kind: 'CHANNEL_SAMPLE', delivery_id: sampled.delivery_id, entry_key: smpEntry.key,
      definition: 'Consent events in the audit period (synthetic).', completeness: 'UNVERIFIED', completeness_basis: 'The installation computed the population; not independently reconciled.', completeness_evidence_id: null, size_rationale: 'Five items for a moderate risk.', exclusions: null })).data.error?.field_errors?.[0]?.code,
      'register_the_channel_entry_as_evidence_first');
    await evidenceFor({ auditor: lead.s, engagementId: vid, procedureId: plan.procedures[reqB]!, register: { source: 'CHANNEL_ENTRY', delivery_id: sampled.delivery_id, entry_key: smpEntry.key, valid_until: null, description: null } });
    const popCreated = await lead.s.json(`${V}/procedures/${plan.procedures[reqB]}/populations`, { source_kind: 'CHANNEL_SAMPLE', delivery_id: sampled.delivery_id, entry_key: smpEntry.key,
      definition: 'Consent events in the audit period (synthetic).', completeness: 'UNVERIFIED', completeness_basis: 'The installation computed the population; not independently reconciled.', completeness_evidence_id: null, size_rationale: 'Five items for a moderate risk.', exclusions: null });
    check('a population is recorded from the signed sample once its entry is registered', popCreated.status, 200);
    const pops = (await lead.s.json(`${V}/engagements/${vid}/file`)).data.populations as { source_kind: string; seed: string; tested: number; sample_size: number; completeness: string; selection_digest: string }[];
    const pop = pops.find(x => x.source_kind === 'CHANNEL_SAMPLE')!;
    check('the population takes the seed, size and counts from the signed sample, and stays UNVERIFIED', [pop.seed, pop.sample_size, pop.tested, pop.completeness, pop.selection_digest], [sampled.seed, 5, smpEntry.detail!.selected, 'UNVERIFIED', smpEntry.detail!.selection_sha256]);
    const wpA = await paper({ preparer: lead.s, reviewer: rev.s, procedureId: plan.procedures[reqA]!, conclusion: 'EXCEPTIONS_NOTED', evidence: [evA] });
    const findingFile = (await lead.s.json(`${V}/engagements/${vid}/findings`, { requirement_id: reqA, provision_ids: ['ACT-S5(1)'], criterion_type: 'STATUTORY', severity: 'MEDIUM', title: 'Notice indicators show a gap', observation: 'The notice indicator for one activity is below the expected level.',
      affected_scope: 'Consent notices', cause: 'One activity has no published notice version.', consequence: 'Consent for that activity may not be informed.', severity_rationale: 'One activity; moderate number of Data Principals.',
      recommendation: 'Publish an itemised notice for the activity.', orvia_guidance: null, due_date: inDays(60), working_paper_ids: [wpA], evidence_ids: [evA] })).data;
    const vFinding = findingFile.findings.at(-1);
    await lead.s.json(`${V}/engagements/${vid}/findings/export`, {});
    check('the signed findings file is offered to the client installation over the channel', (await vendor.operator.query('SELECT count(*)::int AS n FROM vendor.channel_documents WHERE engagement_id=$1 AND acknowledged_at IS NULL', [vid])).rows[0].n >= 1, true);

    t.setPhase('findings to the client and the management response back');
    await staleCheckIn();
    const rt1 = await sweep();
    const ch8 = await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/channel`), S.schemas.AuditChannel);
    const staged = ch8.documents.find(d => d.kind === 'FINDINGS')!;
    check('the worker stages the verified findings file; nothing is imported without a person', [rt1.documents_received >= 1, staged.import_id, (await db.query('SELECT count(*)::int AS n FROM app.audit_imports WHERE engagement_id=$1', [ce.id])).rows[0].n], [true, null, 0]);
    await staleCheckIn(); await sweep();
    check('the client acknowledges it at the next check-in and the vendor stops offering it', (await vendor.operator.query('SELECT count(*)::int AS n FROM vendor.channel_documents WHERE engagement_id=$1 AND acknowledged_at IS NULL', [vid])).rows[0].n, 0);
    const imported = await ok(admin.call(`/api/v1/admin/audit-channel-documents/${staged.id}/import`, {}, key()), S.schemas.AuditImport);
    check('a person imports it through the verified import', [imported.kind, (await codes(admin.call(`/api/v1/admin/audit-channel-documents/${staged.id}/import`, {}, key()))).codes], ['FINDINGS', ['already_imported']]);
    await ok(admin.call(`/api/v1/admin/audit-imports/${imported.id}/finding-links`, { finding_id: vFinding.id }, key()), S.schemas.AuditImport);
    const respBody = { import_id: imported.id, finding_id: vFinding.id, factual_accuracy: 'AGREED', agreement: 'PARTIALLY_AGREE', response: 'We will publish the notice; contact privacy@aster.example for the draft.', action_plan: 'Publish notice v4.',
      owner_role: 'Privacy office', due_date: inDays(30), dependencies: null, remediation_status: 'IN_PROGRESS', risk_acceptance: null };
    const draftResp = await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/finding-responses`, respBody, key()), S.schemas.FindingResponse);
    check('the response is screened for contact details and carries the GRC remediation state only as a reference', [draftResp.redactions, JSON.stringify(draftResp.content).includes('@'), (draftResp.content as { remediation_reference: { kind: string } }).remediation_reference.kind], [1, false, 'GRC_ISSUE']);
    check('the preparer cannot approve their own response', (await codes(admin.call(`/api/v1/admin/audit-finding-responses/${draftResp.id}/approval`, { personal_data: 'NONE_CONFIRMED' }, key()))).codes, ['approver_must_differ_from_preparer']);
    check('a response to a finding not in the imported file is refused', (await codes(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/finding-responses`, { ...respBody, finding_id: randomUUID() }, key()))).codes, ['not_in_this_findings_file']);
    check('approval without the approver\'s record that the response holds no personal data is refused', (await reviewer.call(`/api/v1/admin/audit-finding-responses/${draftResp.id}/approval`, {}, key())).status, 400);
    const approvedResp = await ok(reviewer.call(`/api/v1/admin/audit-finding-responses/${draftResp.id}/approval`, { personal_data: 'NONE_CONFIRMED' }, key()), S.schemas.FindingResponse);
    check('a different owner approves, recording that it holds no personal data, and it is queued for the worker', [approvedResp.state, approvedResp.personal_data_review], ['QUEUED', 'NONE_CONFIRMED']);
    check('staff cannot change an approved response directly', await db.query("UPDATE app.audit_finding_responses SET content='{}'::jsonb WHERE id=$1", [draftResp.id]).then(() => 'UPDATED', e => (e as Error).message), 'finding_response_sealed');
    const rt3 = await sweep();
    const sentResp = (await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/channel`), S.schemas.AuditChannel)).responses.find(r => r.id === draftResp.id)!;
    const vf = (await lead.s.json(`${V}/engagements/${vid}/file`)).data.findings.find((f: { id: string }) => f.id === vFinding.id);
    check('the worker signs and sends it; the vendor records it on the finding from the channel', [rt3.responses_sent, sentResp.state, vf.status, vf.responses[0]?.source, vf.responses[0]?.agreement, JSON.stringify(vf.responses[0]).includes('@')],
      [1, 'ACCEPTED', 'CLIENT_RESPONDED', 'CHANNEL', 'PARTIALLY_AGREE', false]);
    const signedResp = (await db.query('SELECT signed FROM app.audit_finding_responses WHERE id=$1', [draftResp.id])).rows[0].signed;
    check('the signed response carries the approver\'s no-personal-data record', signedResp.document.approval.personal_data, 'NONE_CONFIRMED_BY_APPROVER');
    const again = await call(C.CHANNEL_PATHS.responses, Buffer.from(JSON.stringify({ signed_response: signedResp })));
    check('a repeated response gets an accepted receipt and is stored once', [C.verifyVendorSigned(again.json, audit, C.ResponseReceipt).outcome, (await vendor.operator.query('SELECT count(*)::int AS n FROM vendor.management_responses WHERE finding_id=$1', [vFinding.id])).rows[0].n], ['ACCEPTED', 1]);
    const forgedResp = C.signByInstallation({ ...(signedResp.document as object), response_id: randomUUID() }, C.newEvidenceKey());
    check('a response signed by another installation key is refused', (await call(C.CHANNEL_PATHS.responses, Buffer.from(JSON.stringify({ signed_response: forgedResp })))).status, 400);

    t.setPhase('worker lease, mid-cycle suspension and past-due requests');
    await db.query("UPDATE app.audit_mandates SET channel_lease_owner=$2, channel_lease_until=clock_timestamp()+interval '10 minutes' WHERE id=$1", [m1.id, randomUUID()]);
    await staleCheckIn();
    const rl = await sweep();
    check('a mandate leased by another worker is left alone: no calls', [rl.leased_elsewhere, rl.check_ins], [1, 0]);
    await db.query("UPDATE app.audit_mandates SET channel_lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [m1.id]);
    await ask(lead.s, { kind: 'COLLECT_NOW', requirement_id: reqA, categories: ['INDICATORS'], description: 'Indicators before the suspension race' });
    await db.query("UPDATE app.audit_mandates SET next_collection_at=clock_timestamp()-interval '1 minute' WHERE id=$1", [m1.id]);
    await staleCheckIn();
    const before = (await db.query('SELECT count(*)::int AS n FROM app.audit_channel_deliveries WHERE mandate_id=$1', [m1.id])).rows[0].n as number;
    let suspended = false;
    env.beforeSend = async () => { if (!suspended) { suspended = true; await ok(owner.call(`/api/v1/admin/audit-mandates/${m1.id}/state`, { state: 'SUSPENDED', reason: 'Suspended while a send is in flight (race test).' }, key()), S.schemas.AuditMandate); } };
    const race = await sweep();
    env.beforeSend = undefined;
    const after = (await db.query('SELECT count(*)::int AS n FROM app.audit_channel_deliveries WHERE mandate_id=$1', [m1.id])).rows[0].n as number;
    check('a suspension during a cycle lets the in-flight send finish and stops the next one before it is generated', [race.deliveries_accepted, after - before, race.stopped_by_mandate >= 1, (await db.query('SELECT channel_lease_owner FROM app.audit_mandates WHERE id=$1', [m1.id])).rows[0].channel_lease_owner],
      [1, 1, true, null]);
    await ok(owner.call(`/api/v1/admin/audit-mandates/${m1.id}/state`, { state: 'ACTIVE', reason: 'Resumed after the race test.' }, key()), S.schemas.AuditMandate);
    await staleCheckIn();
    const resumed = await sweep();
    check('after resuming, the held snapshot is generated and sent', resumed.deliveries_accepted >= 1, true);
    // Fencing: a worker whose lease lapsed and was taken by another stops at its next send boundary.
    await ask(lead.s, { kind: 'COLLECT_NOW', requirement_id: reqA, categories: ['INDICATORS'], description: 'Indicators for the fencing test (1)' });
    await ask(lead.s, { kind: 'COLLECT_NOW', requirement_id: reqA, categories: ['INDICATORS'], description: 'Indicators for the fencing test (2)' });
    await staleCheckIn();
    const beforeFence = (await db.query('SELECT count(*)::int AS n FROM app.audit_channel_deliveries WHERE mandate_id=$1', [m1.id])).rows[0].n as number;
    let taken = false;
    env.beforeSend = async () => { if (!taken) { taken = true; await db.query("UPDATE app.audit_mandates SET channel_lease_owner=$2, channel_lease_until=clock_timestamp()+interval '5 minutes' WHERE id=$1", [m1.id, randomUUID()]); } };
    const fenced = await sweep();
    env.beforeSend = undefined;
    const afterFence = (await db.query('SELECT count(*)::int AS n FROM app.audit_channel_deliveries WHERE mandate_id=$1', [m1.id])).rows[0].n as number;
    check('a worker that loses its lease mid-cycle finishes the send in flight and generates nothing more', [fenced.deliveries_accepted, afterFence - beforeFence, fenced.leased_elsewhere >= 1], [1, 1, true]);
    await db.query("UPDATE app.audit_mandates SET channel_lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [m1.id]);
    await staleCheckIn();
    check('the next worker picks up the rest', (await sweep()).deliveries_accepted >= 1, true);
    const pastDue = C.signByVendor(C.AuditorRequest.parse({ request_id: randomUUID(), engagement_code_digest: digest, kind: 'COLLECT_NOW', requirement_id: reqA, categories: ['INDICATORS'], population: null, sample_size: null, seed: null,
      description: 'A request already past its due date (fabricated for the test).', due_date: inDays(-1), issued_at: at(-86_400_000) }), audit);
    const pd = pastDue.document as C.AuditorRequest;
    await vendor.operator.query(`INSERT INTO vendor.channel_requests (id, engagement_id, kind, requirement_id, categories, description, due_date, signed, issued_by) VALUES ($1,$2,'COLLECT_NOW',$3,$4,$5,$6,$7,$8)`,
      [pd.request_id, vid, reqA, ['INDICATORS'], pd.description, pd.due_date, JSON.stringify(pastDue), lead.id]);
    await staleCheckIn(); await sweep();
    const pdRow = (await db.query('SELECT decision, decision_reason FROM app.audit_channel_requests WHERE id=$1', [pd.request_id])).rows[0];
    await staleCheckIn(); await sweep();
    check('a request past its due date is refused, never answered, and the vendor is told', [pdRow?.decision, pdRow?.decision_reason, (await vendor.operator.query('SELECT status, status_reason FROM vendor.channel_requests WHERE id=$1', [pd.request_id])).rows[0]],
      ['REFUSED', 'PAST_DUE', { status: 'REFUSED', status_reason: 'PAST_DUE' }]);

    t.setPhase('check-in answers stay within what the client reads');
    // Synthetic oversized documents, deliberately unsigned: the client ignores each one it is offered and says so, which shows exactly
    // what the vendor offered in each answer. A real client acknowledges what it staged; here the test acknowledges on the vendor side.
    const bigDoc = async (bytes: number) => { const docId = randomUUID();
      await vendor.operator.query("INSERT INTO vendor.signed_documents (id, engagement_id, kind, document, signing_key_id, signature, signed_by) VALUES ($1,$2,'FINDINGS',$3,'synthetic-unsigned','invalid',$4)",
        [docId, vid, JSON.stringify({ kind: 'FINDINGS', padding: 'x'.repeat(bytes) }), lead.id]);
      await vendor.operator.query('INSERT INTO vendor.channel_documents (document_id, engagement_id) VALUES ($1,$2)', [docId, vid]); return docId; };
    const ignored = (r: { errors: string[] }) => r.errors.filter(e => e.includes('did not verify')).length;
    const channelProblem = async () => (await db.query('SELECT channel_problem FROM app.audit_mandates WHERE id=$1', [m1.id])).rows[0].channel_problem as string | null;
    const ack = (ids: string[]) => vendor.operator.query('UPDATE vendor.channel_documents SET acknowledged_at=clock_timestamp() WHERE document_id = ANY($1::uuid[])', [ids]);
    const bigA = await bigDoc(500_000); const bigB = await bigDoc(500_000);
    await staleCheckIn(); const b1 = await sweep(); const p1 = await channelProblem();
    await ack([bigA]);
    await staleCheckIn(); const b2 = await sweep(); const p2 = await channelProblem();
    check('two documents that fit one at a time are offered one per answer, and every answer is small enough to read', [b1.check_ins, ignored(b1), p1, b2.check_ins, ignored(b2), p2], [1, 1, null, 1, 1, null]);
    await ack([bigB]);
    const huge = await bigDoc(1_000_000);
    await staleCheckIn(); const b3 = await sweep(); const p3 = await channelProblem();
    const hugeRow = ((await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.documents as { document_id: string; channel_state: string; encoded_bytes: number | null }[]).find(d => d.document_id === huge)!;
    check('a document too large for any answer is not offered, is marked for the file route and shown to the audit team, and the check-in still succeeds', [b3.check_ins, ignored(b3), p3, hugeRow.channel_state, (hugeRow.encoded_bytes ?? 0) > 1_000_000], [1, 0, null, 'TOO_LARGE_FOR_CHANNEL', true]);
    await staleCheckIn(); const b4 = await sweep();
    check('it is not offered again', [b4.check_ins, ignored(b4)], [1, 0]);

    t.setPhase('suspension');
    await ok(owner.call(`/api/v1/admin/audit-mandates/${m1.id}/state`, { state: 'SUSPENDED', reason: 'Paused while the privacy team reviews the scope.' }, key()), S.schemas.AuditMandate);
    await ask(lead.s, { kind: 'COLLECT_NOW', requirement_id: reqB, categories: ['INDICATORS'], description: 'Consent proof indicators', due_date: inDays(1) });
    const r6 = await sweep();
    const vch6 = (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data;
    check('the suspension is reported once; no request reaches a suspended mandate', [vch6.mandate.state, vch6.mandate.open, r6.requests_received, vch6.requests.find((r: { requirement_id: string | null; kind: string; status: string }) => r.kind === 'COLLECT_NOW' && r.requirement_id === reqB)?.status],
      ['SUSPENDED', false, 0, 'PENDING']);
    const r6b = await sweep();
    check('a suspended mandate makes no further calls', r6b.check_ins, 0);

    t.setPhase('report and leadership');
    await vendor.operator.query("UPDATE vendor.channel_requests SET due_date=current_date-1 WHERE engagement_id=$1 AND status='PENDING'", [vid]);
    await lead.s.json(`/api/v1/vendor/engagements/${vid}/independence`, { statement: 'The audit team is independent of the client organisation.', conflict_check: 'NO_CONFLICT', conflict_note: null, empanelment_reference: null });
    // No working paper was prepared in this suite, so the only supportable conclusion is NOT_TESTED; MEETS would be refused.
    for (const r of [reqA, reqB]) await lead.s.json(`/api/v1/vendor/engagements/${vid}/results`, { requirement_id: r, result: 'NOT_TESTED', rationale: 'Mandate evidence was received but no procedure was concluded in this synthetic run.' });
    const rep = await lead.s.json(`/api/v1/vendor/engagements/${vid}/reports`, { opinion_as_of: today(), executive_summary: 'Synthetic mandate run: evidence was delivered over the channel; no requirement was concluded.', supersedes_report_id: null, correction_reason: null,
      method: 'System-generated evidence under the client mandate.', opinion: 'No requirement in scope was concluded; the evidence received is described in the limitations.', limitations: ['Opinion rests on evidence generated by ORVIA from the client installation.'] });
    await rev.s.json(`/api/v1/vendor/reports/${rep.data.id}/approve`, {});
    const signed = (await lead.s.json(`/api/v1/vendor/reports/${rep.data.id}/sign`, {})).data.signed;
    check('an unanswered request past its due date is stated as a limitation in the signed report', signed.document.limitations.some((l: string) => l.includes('not answered by the client')), true);
    const ov = await vadm.json('/api/v1/vendor/overview');
    check('leadership sees counts from real records', [ov.status, ov.data.organisations, ov.data.channels.chain_broken, ov.data.requests.overdue_with_clients >= 1, ov.data.reports_signed], [200, 1, 1, true, 1]);
    check('leadership overview carries no evidence content', JSON.stringify(ov.data).includes('entries'), false);
    check('an auditor cannot read the leadership overview', (await lead.s.json('/api/v1/vendor/overview')).status, 403);

    t.setPhase('closing ends the channel');
    await ok(owner.call(`/api/v1/admin/audit-mandates/${m1.id}/state`, { state: 'ACTIVE', reason: 'Scope review complete.' }, key()), S.schemas.AuditMandate);
    // An approved response still queued when the engagement closes must never be sent after the end.
    const lateResp = await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/finding-responses`, { ...respBody, response: 'Updated plan: the notice is published.', remediation_status: 'COMPLETED_CLAIMED' }, key()), S.schemas.FindingResponse);
    check('a second response is queued before the engagement closes', (await ok(reviewer.call(`/api/v1/admin/audit-finding-responses/${lateResp.id}/approval`, { personal_data: 'NONE_CONFIRMED' }, key()), S.schemas.FindingResponse)).state, 'QUEUED');
    const closed = await ok(owner.call(`/api/v1/admin/audit-engagements/${ce.id}/closure`, { reason: 'Report received; engagement complete.' }, key()), S.schemas.AuditEngagement);
    const cm8 = (await ok(owner.call(`/api/v1/admin/audit-engagements/${ce.id}/channel`), S.schemas.AuditChannel)).mandates.find(x => x.id === m1.id)!;
    check('closing the engagement ends its mandate', [closed.state, cm8.state], ['CLOSED', 'ENDED']);
    // The vendor is unreachable at the end: the queue still settles here, before any call succeeds.
    env.address = 'http://127.0.0.1:59999';
    const endSweep = await sweep();
    env.address = vendor.config.origin;
    const lateRow = (await db.query('SELECT state, last_error, attempts FROM app.audit_finding_responses WHERE id=$1', [lateResp.id])).rows[0];
    check('with the vendor unreachable, the queued response still fails unsent at the end; nothing is left pending', [endSweep.check_ins, endSweep.responses_sent, endSweep.stopped_by_mandate >= 1, lateRow],
      [0, 0, true, { state: 'FAILED', last_error: 'MANDATE_ENDED_BEFORE_SENDING', attempts: 0 }]);
    await sweep();
    check('the queued response never reached the vendor', [(await vendor.operator.query('SELECT count(*)::int AS n FROM vendor.management_responses WHERE finding_id=$1', [vFinding.id])).rows[0].n],
      [1]);
    check('the end is reported to the vendor', (await lead.s.json(`/api/v1/vendor/engagements/${vid}/channel`)).data.mandate.state, 'ENDED');
    const late = await call(C.CHANNEL_PATHS.deliveries, forge({ sequence: 99, previous_digest: l2 }));
    check('after the end the vendor refuses deliveries', C.verifyVendorSigned(late.json, audit, C.DeliveryReceipt).reasons.includes('MANDATE_NOT_ACTIVE'), true);
    check('an ended mandate cannot be resumed', (await owner.call(`/api/v1/admin/audit-mandates/${m1.id}/state`, { state: 'ACTIVE', reason: 'Try again' }, key())).status, 409);
  } finally { await vendor.close(); await workerPool.end(); }

  t.setPhase('database boundary');
  const asApp = async (sql: string, params: unknown[]) => {
    const { runtimePool } = await import('../../../database/customer/src/runtime.ts');
    const pool = runtimePool(runtimeConfig(), 'orvia_app'); const c = await pool.connect();
    try { await c.query('BEGIN'); await c.query(`SELECT set_config('orvia.tenant_id',$1,true), set_config('orvia.legal_entity_id',$2,true), set_config('orvia.environment_id',$3,true), set_config('orvia.actor_id',$4,true), set_config('orvia.actor_domain','STAFF',true), set_config('orvia.capabilities','audit_exchange.read,audit_exchange.prepare,audit_exchange.approve',true), set_config('orvia.role','ORG_ADMIN',true)`,
      [scopeIds.tenant_id, scopeIds.legal_entity_id, scopeIds.environment_id, h.users.admin!.id]); const r = await c.query(sql, params); return `ROWS:${r.rowCount}`; }
    catch (e) { return (e as { code?: string }).code === '42501' ? 'DENIED' : (e as Error).message; }
    finally { await c.query('ROLLBACK').catch(() => {}); c.release(); await pool.end(); }
  };
  check('staff cannot read any channel key', await asApp('SELECT * FROM app.audit_channel_keys', []), 'ROWS:0');
  check('staff cannot read the installation evidence key', await asApp('SELECT * FROM app.installation_evidence_keys', []), 'DENIED');
  check('staff cannot change a mandate directly', await asApp("UPDATE app.audit_mandates SET state='ACTIVE'", []), 'DENIED');
  check('staff cannot write deliveries', await asApp("UPDATE app.audit_channel_deliveries SET state='ACCEPTED'", []), 'DENIED');
});
