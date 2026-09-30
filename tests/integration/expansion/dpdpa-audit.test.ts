// DPDPA external audit exchange, client side (revision 1.5 addendum), through the
// real HTTP boundary of the codex-a00 customer installation, then carried by file
// to an isolated vendor installation and back:
//   gap register over the TEST_FIXTURE package; evidence files (limits, magic
//   bytes, server-side hash, personal-data flag confirmed by a second person);
//   engagement; package preparation with screening (UNKNOWN/unconfirmed blocked,
//   exception only by a different approver), redaction of statements, approval by
//   someone other than the preparer, export of the exact approved bytes,
//   revocation; the vendor verifies the uploaded file; vendor-signed findings and
//   report imported and verified (a bad signature is refused), findings linked to
//   GRC issues; tenant isolation; orvia_app cannot bypass the definer functions;
//   /vendor/* is a 404 on a customer installation. Synthetic data only.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { verifyPackageFile, sha256 } from '../../../shared/contracts/src/audit-exchange.ts';
import { signAuditDocument } from '../../../backend/vendor/audit/signing.ts';
import { vendorSigningKey } from '../../../scripts/credentials.ts';
import { vendorHarness } from '../vendor/harness.ts';
import { setupPractice, acceptEngagement, planEngagement, evidenceFor, paper } from '../vendor/practice-flow.ts';

const t = operationsSuite('dpdpa-audit');
const { h, check, ok, codes, db } = t;
const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n', 'latin1');
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString();

let draftId: string = randomUUID();
await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  await t.ensurePackage();
  t.setPhase('gap register');
  const framework = await ok(admin.call('/api/v1/admin/grc/regulatory-framework', { name: unique('DPDP external audit') }, key()), S.schemas.GrcFramework);
  const reqA = 'DPDP-NOTICE-CONSENT-REQUEST';
  const gaps0 = await ok(auditor.call('/api/v1/admin/dpdpa-audit/gaps'), S.schemas.GapRegister);
  const rowA0 = gaps0.rows.find(r => r.requirement_id === reqA);
  check('gap register covers the package in force and labels a test fixture', [gaps0.package?.distribution, gaps0.rows.length > 0, gaps0.limits.some(l => l.includes('TEST FIXTURE')), rowA0 !== undefined], ['TEST_FIXTURE', true, true, true]);
  check('each row carries expectations and indicators, and a gap status', [rowA0!.evidence_expectations.length > 0, rowA0!.indicators.some(i => i.key === 'notices.published_versions'), S.schemas.GapRow.shape.gap_status.options.includes(rowA0!.gap_status)], [true, true, true]);
  check('unresolved applicability is a gap, never assumed not applicable', gaps0.rows.filter(r => r.applicability === 'UNRESOLVED').every(r => r.gap_status === 'UNRESOLVED_APPLICABILITY'), true);
  const procedureOnly = ['DPDP-BOARD-COMPLAINT-CHANNEL'];
  check('every requirement but the one tested only by auditor procedure has indicators', gaps0.rows.filter(r => !procedureOnly.includes(r.requirement_id) && r.indicators.length === 0).map(r => r.requirement_id), []);
  check('the procedure-only requirements carry no invented indicator', gaps0.rows.filter(r => procedureOnly.includes(r.requirement_id)).map(r => r.indicators.length), gaps0.rows.filter(r => procedureOnly.includes(r.requirement_id)).map(() => 0));
  check('indicator values are counts or dates only: an integer, a YYYY-MM-DD date, or none', gaps0.rows.flatMap(r => r.indicators).every(i => i.value === null || Number.isInteger(i.value) || (typeof i.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(i.value))), true);
  check('indicator keys are unique within each requirement', gaps0.rows.every(r => new Set(r.indicators.map(i => i.key)).size === r.indicators.length), true);
  check('summary by module adds up', gaps0.by_module.every(m => m.total >= m.gaps + m.evidenced + m.not_applicable), true);
  const csv = await ok(admin.call('/api/v1/admin/dpdpa-audit/gaps/export', {}, key()), S.schemas.GapRegisterExport);
  check('gap register exports as CSV', [csv.csv.startsWith('requirement_id,'), csv.rows], [true, gaps0.rows.length]);

  t.setPhase('evidence files');
  const control = await ok(admin.call('/api/v1/admin/grc/controls', { title: unique('Itemised notices published'), description: 'Each consent activity has a published itemised notice.', owner_reference: 'Privacy office', review_interval_days: 90,
    mappings: [{ framework_id: framework.id, requirement_code: reqA }] }, key()), S.schemas.GrcControl);
  const submit = (body: Record<string, unknown>, who = admin) => who.call(`/api/v1/admin/grc/controls/${control.id}/evidence-files`, { description: 'Published notice (synthetic)', file_name: 'notice.pdf', content_base64: pdf.toString('base64'),
    collected_at: day(-1), valid_until: day(60), contains_personal_data: 'NO', ...body }, key());
  check('a file whose bytes do not match its type is refused', await codes(submit({ file_name: 'notice.pdf', content_base64: png.toString('base64') })), { status: 400, codes: ['type_not_permitted_or_content_mismatch'] });
  check('a type outside the allowed list is refused', await codes(submit({ file_name: 'tool.exe', content_base64: Buffer.from('MZ\x90\x00').toString('base64') })), { status: 400, codes: ['type_not_permitted_or_content_mismatch'] });
  const big = await admin.call(`/api/v1/admin/grc/controls/${control.id}/evidence-files`, { description: 'Too big', file_name: 'big.txt', content_base64: Buffer.alloc(20 * 1024 * 1024 + 1, 65).toString('base64'), collected_at: day(-1), valid_until: day(60), contains_personal_data: 'NO' }, key());
  check('a file over 20 MB is refused', big.status, 400);
  const file = await ok(submit({}), S.schemas.EvidenceFile);
  check('stored file: server-side hash, sniffed type, unconfirmed flag blocks sharing', [file.sha256, file.media_type, file.shareable], [sha256(pdf), 'application/pdf', 'BLOCKED_UNCONFIRMED']);
  const content = await ok(auditor.call(`/api/v1/admin/evidence-files/${file.id}/content`), S.schemas.EvidenceFileContent);
  check('file content reads back byte for byte', Buffer.from(content.content_base64, 'base64').equals(pdf), true);
  check('the submitter cannot confirm their own flag', await codes(admin.call(`/api/v1/admin/evidence-files/${file.id}/personal-data-confirmation`, { personal_data: 'NO' }, key())), { status: 409, codes: ['confirmer_must_differ_from_submitter'] });
  const confirmed = await ok(reviewer.call(`/api/v1/admin/evidence-files/${file.id}/personal-data-confirmation`, { personal_data: 'NO' }, key()), S.schemas.EvidenceFile);
  check('a second person confirms: shareable', [confirmed.personal_data_confirmed, confirmed.shareable], ['NO', 'SHAREABLE']);
  const unknownFile = await ok(submit({ file_name: 'list.csv', content_base64: Buffer.from('category,count\nnotices,3\n').toString('base64'), contains_personal_data: 'UNKNOWN' }), S.schemas.EvidenceFile);
  const personalFile = await ok(submit({ file_name: 'sample.txt', content_base64: Buffer.from('Synthetic sample record\n').toString('base64'), contains_personal_data: 'YES' }), S.schemas.EvidenceFile);
  await ok(reviewer.call(`/api/v1/admin/evidence-files/${personalFile.id}/personal-data-confirmation`, { personal_data: 'YES' }, key()), S.schemas.EvidenceFile);
  const gaps1 = await ok(admin.call('/api/v1/admin/dpdpa-audit/gaps'), S.schemas.GapRegister);
  check('the control appears on the requirement with its files', (gaps1.rows.find(r => r.requirement_id === reqA)!.controls.find(x => x.control_id === control.id)?.files ?? 0) >= 3, true);

  t.setPhase('engagement and package');
  const vendor = await vendorHarness();
  try {
    // Vendor side: organisation, client account, audit team, engagement (the code is handed to the client).
    const vcode = await vendor.issueSetupCode(); const anon = vendor.session();
    const vo = { email: 'owner@vendor.example', password: `Owner-${randomUUID()}`, domain: 'vendor' as const } as { email: string; password: string; totp?: string; domain: 'vendor' };
    const va = { email: 'admin@vendor.example', password: `Admin-${randomUUID()}`, domain: 'vendor' as const } as typeof vo;
    await anon.json('/api/v1/vendor/setup', { setup_code: vcode, owner: { name: 'Vendor Owner', email: vo.email, password: vo.password }, admin: { name: 'Vendor Admin', email: va.email, password: va.password } });
    const vadm = await vendor.login(va);
    const lead = await vadm.json('/api/v1/vendor/team', { name: 'Lead Auditor', email: 'lead@vendor.example', role: 'LEAD_AUDITOR' });
    const rev = await vadm.json('/api/v1/vendor/team', { name: 'Audit Reviewer', email: 'rev@vendor.example', role: 'AUDIT_REVIEWER' });
    const leadU = { email: 'lead@vendor.example', password: lead.data.one_time_password, domain: 'vendor' as const } as typeof vo; const revU = { email: 'rev@vendor.example', password: rev.data.one_time_password, domain: 'vendor' as const } as typeof vo;
    const vlead = await vendor.login(leadU); const vrev = await vendor.login(revU);
    const org = await vadm.json('/api/v1/vendor/organisations', { name: 'Aster Synthetic Ltd', registered_address: null });
    const acct = await vadm.json(`/api/v1/vendor/organisations/${org.data.id}/accounts`, { name: 'Aster Uploader', email: 'uploader@aster.example' });
    const eng = await vadm.json('/api/v1/vendor/engagements', { organisation_id: org.data.id, reference: 'ENG-2026-01', scope_requirement_ids: [reqA], period_from: '2026-01-01', period_to: '2026-06-30' });
    await vadm.json(`/api/v1/vendor/engagements/${eng.data.engagement_id}/team`, { user_id: lead.data.member.user_id, engagement_role: 'LEAD' });
    await vadm.json(`/api/v1/vendor/engagements/${eng.data.engagement_id}/team`, { user_id: rev.data.member.user_id, engagement_role: 'REVIEWER' });
    const code = eng.data.engagement_code as string;

    // Client side: engagement from the code.
    check('an auditor (read-only) cannot create an engagement', (await auditor.call('/api/v1/admin/audit-engagements', { engagement_code: code, firm_name: 'ORVIA audit practice', engagement_reference: 'ENG-2026-01', scope_requirement_ids: [reqA], period_from: '2026-01-01', period_to: '2026-06-30', processing_agreement_reference: null, independence_statement: null, empanelment_reference: null }, key())).status, 403);
    const ce = await ok(admin.call('/api/v1/admin/audit-engagements', { engagement_code: code, firm_name: 'ORVIA audit practice', engagement_reference: 'ENG-2026-01', scope_requirement_ids: [reqA], period_from: '2026-01-01', period_to: '2026-06-30',
      processing_agreement_reference: null, independence_statement: 'The audit firm declared its independence in the engagement letter.', empanelment_reference: null }, key()), S.schemas.AuditEngagement);
    check('engagement recorded with processing-agreement status and declared independence', [ce.processing_agreement.status, ce.independence.declared, ce.empanelment_reference], ['NOT_RECORDED', true, null]);
    check('another organisation cannot see it', (await birch.call(`/api/v1/admin/audit-engagements/${ce.id}`)).status, 404);
    const pkg = await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/packages`, { expires_at: day(14) }, key()), S.schemas.AuditPackage);
    const add = (body: Record<string, unknown>, who = admin, path = 'items') => who.call(`/api/v1/admin/audit-packages/${pkg.id}/${path}`, { requirement_id: reqA, kind: 'FILE', title: 'Evidence', evidence_file_id: null, indicator_key: null, statement: null, ...body }, key());
    check('UNKNOWN / unconfirmed personal data is blocked', await codes(add({ evidence_file_id: unknownFile.id })), { status: 409, codes: ['personal_data_unconfirmed'] });
    check('confirmed personal data needs an approved exception', await codes(add({ evidence_file_id: personalFile.id })), { status: 409, codes: ['personal_data_requires_approved_exception'] });
    check('the preparer cannot approve an exception to their own package', await codes(add({ evidence_file_id: personalFile.id, justification: 'Needed to evidence the sampled notice delivery for the audit.' }, admin, 'exception-items')), { status: 409, codes: ['exception_approver_must_differ'] });
    check('an item outside the engagement scope is refused', await codes(add({ requirement_id: 'DPDP-CONSENT-VALIDITY', evidence_file_id: file.id })), { status: 400, codes: ['outside_engagement_scope'] });
    await ok(add({ evidence_file_id: file.id, title: 'Published itemised notice' }), S.schemas.AuditPackage);
    await ok(add({ kind: 'INDICATOR', indicator_key: 'notices.published_versions', title: 'Published notice versions' }), S.schemas.AuditPackage);
    const withStatement = await ok(add({ kind: 'STATEMENT', statement: 'Contact dpo@aster.example or +91 98765 43210 for the notice register.', title: 'Notice register statement' }), S.schemas.AuditPackage);
    const stmt = withStatement.items.find(i => i.kind === 'STATEMENT')!;
    check('statement text is redacted before it can leave', [stmt.statement!.includes('@'), stmt.statement!.includes('98765'), withStatement.redactions], [false, false, 2]);
    check('the preparer cannot approve', await codes(admin.call(`/api/v1/admin/audit-packages/${pkg.id}/approval`, {}, key())), { status: 409, codes: ['approver_must_differ_from_preparer'] });
    check('an auditor cannot approve', (await auditor.call(`/api/v1/admin/audit-packages/${pkg.id}/approval`, {}, key())).status, 403);
    check('export before approval is refused', await codes(reviewer.call(`/api/v1/admin/audit-packages/${pkg.id}/export`, {}, key())), { status: 409, codes: ['approval_required'] });
    const approved = await ok(reviewer.call(`/api/v1/admin/audit-packages/${pkg.id}/approval`, {}, key()), S.schemas.AuditPackage);
    check('a different owner approves and the package is sealed', [approved.state, approved.approved_by === h.users.reviewer!.id, approved.manifest_fingerprint !== null], ['APPROVED', true, true]);
    check('a sealed package cannot change', (await admin.call(`/api/v1/admin/audit-packages/${pkg.id}/items`, { requirement_id: reqA, kind: 'FILE', title: 'late', evidence_file_id: file.id, indicator_key: null, statement: null }, key())).status, 409);
    const exported = await ok(reviewer.call(`/api/v1/admin/audit-packages/${pkg.id}/export`, {}, key()), S.schemas.AuditPackageExport);
    const bytes = Buffer.from(exported.package_base64, 'base64'); const verified = verifyPackageFile(bytes);
    check('exported file verifies and is exactly the approved bytes', [verified.ok, sha256(bytes), verified.ok && verified.manifest.items.length], [true, approved.file_sha256, 3]);
    check('manifest names roles, never people', verified.ok && JSON.stringify(verified.manifest).includes(h.users.reviewer!.email), false);
    const again = await ok(reviewer.call(`/api/v1/admin/audit-packages/${pkg.id}/export`, {}, key()), S.schemas.AuditPackageExport);
    check('exporting again yields the same bytes', again.file_sha256, exported.file_sha256);
    const visibility = await ok(owner.call('/api/v1/admin/vendor-visibility'), S.schemas.VendorVisibility);
    const listed = visibility.audit_packages.find(p => p.package_id === pkg.id);
    check('vendor-visibility lists the package and both exports, carried by a person', [listed?.exports.length, listed?.transported_by_orvia, listed?.personal_data_items], [2, false, 0]);

    t.setPhase('vendor receives the file');
    const up = { email: 'uploader@aster.example', password: acct.data.one_time_password, domain: 'account' as const } as { email: string; password: string; totp?: string; domain: 'account' };
    const uploader = await vendor.login(up);
    const received = await uploader.send('/api/v1/vendor/uploads', { method: 'POST', body: new Uint8Array(bytes), headers: { 'content-type': 'application/vnd.orvia.audit-package+json', 'x-orvia-engagement-code': code } });
    const rbody = await received.json();
    check('the vendor installation verifies and accepts the client file', [received.status, rbody.outcome, rbody.manifest_fingerprint], [201, 'ACCEPTED', exported.manifest_fingerprint]);

    t.setPhase('signed files back to the client');
    await vlead.json(`/api/v1/vendor/engagements/${eng.data.engagement_id}/independence`, { statement: 'The audit team is independent of the client organisation.', conflict_check: 'NO_CONFLICT', conflict_note: null, empanelment_reference: null });
    // The audit practice (task AUDIT-PRACTICE-01): acceptance, an approved programme and a reviewed working paper before any finding or conclusion.
    const engId = eng.data.engagement_id as string;
    const practice = await setupPractice(vlead, vrev);
    await acceptEngagement({ admin: vadm, reviewer: vrev, lead: vlead, engagementId: engId, ...practice });
    const plan = await planEngagement({ lead: vlead, auditor: vlead, reviewer: vrev, engagementId: engId, requirements: [reqA], period: { from: '2026-01-01', to: '2026-06-30' }, leadId: lead.data.member.user_id });
    const firstItem = (await vlead.json(`/api/v1/vendor/packages/${rbody.package_id}`)).data.items[0];
    const ev = await evidenceFor({ auditor: vlead, engagementId: engId, procedureId: plan.procedures[reqA]!, register: { source: 'PACKAGE_ITEM', package_id: rbody.package_id, item_id: firstItem.item_id, evidence_type: null, valid_until: null, description: null } });
    const wp = await paper({ preparer: vlead, reviewer: vrev, procedureId: plan.procedures[reqA]!, conclusion: 'EXCEPTIONS_NOTED', evidence: [ev] });
    await vlead.json(`/api/v1/vendor/engagements/${engId}/findings`, { requirement_id: reqA, provision_ids: ['ACT-S5(1)'], criterion_type: 'STATUTORY', severity: 'HIGH', title: 'Notice lacks Board complaint channel', observation: 'The sampled notice omits the means to complain to the Board.',
      affected_scope: 'Published consent notice', cause: 'The notice template predates the complaint-channel requirement.', consequence: 'Data Principals are not told how to complain to the Board.', severity_rationale: 'Every consenting Data Principal receives the incomplete notice.',
      recommendation: 'Add the Board complaint channel to the notice.', orvia_guidance: null, due_date: '2026-12-31', working_paper_ids: [wp], evidence_ids: [ev] });
    await vlead.json(`/api/v1/vendor/engagements/${engId}/results`, { requirement_id: reqA, result: 'PARTIALLY_MEETS', rationale: 'Notice published; complaint channel missing.' });
    const findingsFile = (await vlead.json(`/api/v1/vendor/engagements/${engId}/findings/export`, {})).data.signed;
    const draft = await vlead.json(`/api/v1/vendor/engagements/${engId}/reports`, { opinion_as_of: '2026-07-15', executive_summary: 'Synthetic engagement: the notice requirement is partially met; one high finding.', supersedes_report_id: null, correction_reason: null,
      method: 'Inspection of the client-approved package.', opinion: 'The requirement in scope is partially met.', limitations: ['Only evidence the client chose to share was examined.'] });
    await vrev.json(`/api/v1/vendor/reports/${draft.data.id}/approve`, {});
    const reportFile = (await vlead.json(`/api/v1/vendor/reports/${draft.data.id}/sign`, {})).data.signed;
    const reportPdf = (await vlead.json(`/api/v1/vendor/reports/${draft.data.id}/pdf`)).data.pdf_base64 as string;

    const forged = structuredClone(findingsFile); forged.document.findings[0].severity = 'LOW';
    check('a findings file with a bad signature is refused', await codes(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/signed-documents`, { signed: forged, pdf_base64: null }, key())), { status: 400, codes: ['signature_invalid'] });
    const otherKey = { key_id: 'someone-else', private: vendorSigningKey('release').private, public: vendorSigningKey('release').public };
    check('a file signed by an untrusted key is refused', await codes(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/signed-documents`, { signed: signAuditDocument(findingsFile.document, otherKey), pdf_base64: null }, key())), { status: 400, codes: ['untrusted_signing_key'] });
    const fi = await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/signed-documents`, { signed: findingsFile, pdf_base64: null }, key()), S.schemas.AuditImport);
    check('the signed findings file imports', [fi.kind, fi.entries], ['FINDINGS', 1]);
    check('the same file twice is refused', (await admin.call(`/api/v1/admin/audit-engagements/${ce.id}/signed-documents`, { signed: findingsFile, pdf_base64: null }, key())).status, 409);
    const findingId = (findingsFile.document.findings[0] as { finding_id: string }).finding_id;
    const linked = await ok(admin.call(`/api/v1/admin/audit-imports/${fi.id}/finding-links`, { finding_id: findingId }, key()), S.schemas.AuditImport);
    const issue = await ok(admin.call(`/api/v1/admin/grc/issues/${linked.finding_links[0]!.grc_issue_id}`), S.schemas.Issue);
    check('the finding becomes a GRC issue for remediation', [issue.source_kind, issue.severity, issue.state], ['EXTERNAL_AUDIT_FINDING', 'HIGH', 'OPEN']);
    check('a report without its PDF is refused', await codes(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/signed-documents`, { signed: reportFile, pdf_base64: null }, key())), { status: 400, codes: ['report_pdf_required'] });
    check('a report with a different PDF is refused', await codes(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/signed-documents`, { signed: reportFile, pdf_base64: pdf.toString('base64') }, key())), { status: 400, codes: ['pdf_does_not_match_signed_report'] });
    const ri = await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/signed-documents`, { signed: reportFile, pdf_base64: reportPdf }, key()), S.schemas.AuditImport);
    const rp = await ok(auditor.call(`/api/v1/admin/audit-imports/${ri.id}/pdf`), S.schemas.AuditImportPdf);
    check('the signed report and its PDF are stored and read back', [ri.kind, rp.pdf_sha256 === sha256(Buffer.from(reportPdf, 'base64'))], ['REPORT', true]);
    check('imports are immutable', await db.query('UPDATE app.audit_imports SET kind=kind WHERE id=$1', [ri.id]).then(() => 'UPDATED', e => e.message), 'audit_exchange_history_is_append_only');

    t.setPhase('revocation');
    const revoked = await ok(reviewer.call(`/api/v1/admin/audit-packages/${pkg.id}/revocation`, { reason: 'Superseded by a corrected package.' }, key()), S.schemas.AuditPackage);
    check('client revokes the package; it can no longer be exported', [revoked.state, (await reviewer.call(`/api/v1/admin/audit-packages/${pkg.id}/export`, {}, key())).status], ['REVOKED', 409]);
    const pkg2 = await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/packages`, { expires_at: day(14) }, key()), S.schemas.AuditPackage);
    await ok(admin.call(`/api/v1/admin/audit-packages/${pkg2.id}/items`, { requirement_id: reqA, kind: 'FILE', title: 'Notice', evidence_file_id: file.id, indicator_key: null, statement: null }, key()), S.schemas.AuditPackage);
    await ok(reviewer.call(`/api/v1/admin/audit-packages/${pkg2.id}/exception-items`, { requirement_id: reqA, kind: 'FILE', title: 'Sampled record (exception)', evidence_file_id: personalFile.id, indicator_key: null, statement: null, justification: 'Needed to evidence the sampled notice delivery for the audit.' }, key()), S.schemas.AuditPackage);
    await ok(owner.call(`/api/v1/admin/audit-packages/${pkg2.id}/approval`, {}, key()), S.schemas.AuditPackage);
    const e2 = await ok(owner.call(`/api/v1/admin/audit-packages/${pkg2.id}/export`, {}, key()), S.schemas.AuditPackageExport);
    const v2 = verifyPackageFile(Buffer.from(e2.package_base64, 'base64'));
    check('the next package relays the revocation and carries the approved exception', [v2.ok && v2.manifest.revoked_package_ids.includes(pkg.id), v2.ok && v2.manifest.items.some(i => i.contains_personal_data === 'YES' && i.personal_data_exception !== null)], [true, true]);
    const r2 = await uploader.send('/api/v1/vendor/uploads', { method: 'POST', body: new Uint8Array(Buffer.from(e2.package_base64, 'base64')), headers: { 'content-type': 'application/vnd.orvia.audit-package+json', 'x-orvia-engagement-code': code } });
    const vinbox = await vlead.json(`/api/v1/vendor/engagements/${eng.data.engagement_id}/inbox`);
    draftId = (await ok(admin.call(`/api/v1/admin/audit-engagements/${ce.id}/packages`, { expires_at: day(14) }, key()), S.schemas.AuditPackage)).id;
    check('the vendor quarantines personal data without a processing agreement and withdraws the revoked package', [(await r2.json()).outcome, vinbox.data.packages.find((p: { client_package_id: string }) => p.client_package_id === pkg.id).state], ['QUARANTINED', 'REVOKED']);
  } finally { await vendor.close(); }

  t.setPhase('database boundary');
  const scope = t.scope();
  const asApp = async (sql: string, params: unknown[]) => {
    const { runtimePool } = await import('../../../database/customer/src/runtime.ts'); const { runtimeConfig } = await import('../../../backend/auth/src/config.ts');
    const pool = runtimePool(runtimeConfig(), 'orvia_app'); const c = await pool.connect();
    try { await c.query('BEGIN'); await c.query(`SELECT set_config('orvia.tenant_id',$1,true), set_config('orvia.legal_entity_id',$2,true), set_config('orvia.environment_id',$3,true), set_config('orvia.actor_id',$4,true), set_config('orvia.actor_domain','STAFF',true), set_config('orvia.capabilities','audit_exchange.read,audit_exchange.prepare,audit_exchange.approve',true), set_config('orvia.role','ORG_ADMIN',true)`,
      [scope.tenant_id, scope.legal_entity_id, scope.environment_id, h.users.admin!.id]); return await c.query(sql, params).then(() => 'ALLOWED', (e: { code?: string; message?: string }) => e.code === '42501' ? 'DENIED' : e.message ?? 'ERROR'); }
    finally { await c.query('ROLLBACK'); c.release(); await pool.end(); }
  };
  const draftRow = { id: draftId };
  check('orvia_app cannot approve by updating the row directly', await asApp("UPDATE app.audit_packages SET state='APPROVED' WHERE id=$1", [draftRow?.id ?? randomUUID()]), 'DENIED');
  check('orvia_app cannot confirm a flag directly', await asApp("UPDATE app.evidence_files SET personal_data_confirmed='NO' WHERE id=$1", [unknownFile.id]), 'DENIED');
  check('orvia_app cannot insert a personal-data item without the approval function', await asApp(`INSERT INTO app.audit_package_items (tenant_id, legal_entity_id, environment_id, package_id, item_id, requirement_id, kind, title, evidence_file_id, contains_personal_data, exception_justification, exception_approved_by, exception_approved_role, added_by)
    VALUES ($1,$2,$3,$4,$5,'${reqA}','FILE','x',$6,'YES','Justification long enough for the check.',$7,'ORG_ADMIN',$8)`, [scope.tenant_id, scope.legal_entity_id, scope.environment_id, draftRow?.id ?? randomUUID(), randomUUID(), personalFile.id, randomUUID(), h.users.admin!.id].slice(0, 8)), 'DENIED');

  t.setPhase('installation kind');
  check('the customer database records CUSTOMER_INSTALLATION immutably', await db.query("UPDATE app.installation_identity SET kind='CUSTOMER_INSTALLATION'").then(() => 'UPDATED', e => e.message), 'installation_kind_immutable');
  for (const path of ['/vendor/sign-in', '/vendor', '/api/v1/vendor/session', '/api/auth/vendor/get-session', '/api/auth/account/get-session']) {
    check(`${path} is a 404 on a customer installation`, (await fetch(h.config.origin + path)).status, 404);
  }
});
