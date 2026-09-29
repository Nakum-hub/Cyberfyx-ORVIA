// Vendor installation (VENDOR_SERVICE) integration: first-run setup, vendor
// identity with mandatory MFA, role separation, engagements, the evidence inbox
// (tampered / expired / wrong-engagement refusals, quarantine without a
// processing agreement, encryption at rest, access log), review, findings,
// report approval by a different reviewer, signing, retention purge, gating
// and upload rate limits. Isolated synthetic vendor database per run.
process.env.ORVIA_PROFILE = 'vendor-a00';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { vendorHarness } from './harness.ts';
import { packageFileBytes, sha256, verifyAuditDocument, type AuditPackageManifest } from '../../../shared/contracts/src/audit-exchange.ts';
import { engagementCodeDigest } from '../../../backend/vendor/audit/service.ts';
import { installationTrust } from '../../../scripts/credentials.ts';
import { onlyOn, configuredKind } from '../../../backend/api/src/installation.ts';
import { staffAuthRoute, businessRoute } from '../../../backend/api/src/index.ts';

const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { results.push({ name, result: 'FAIL', detail: `${JSON.stringify(actual)?.slice(0, 300)} != ${JSON.stringify(expected)?.slice(0, 300)}` }); console.log(`FAIL ${name}: ${JSON.stringify(actual)?.slice(0, 300)}`); }
}
const h = await vendorHarness();
const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n', 'latin1');
function makePackage(o: { code: string; scope: string[]; expires?: string; personal?: boolean; packageId?: string; revoked?: string[] }) {
  const items = [
    { item_id: randomUUID(), requirement_id: o.scope[0]!, kind: 'FILE' as const, title: 'Published notice (synthetic)', file_name: 'notice.pdf', media_type: 'application/pdf' as const, bytes: pdf, personal: false },
    { item_id: randomUUID(), requirement_id: o.scope[0]!, kind: 'INDICATOR' as const, title: 'Notice versions per activity', file_name: null, media_type: 'application/json' as const, bytes: Buffer.from('{"published_versions":3}'), personal: !!o.personal },
  ];
  const now = Date.now();
  const manifest: AuditPackageManifest = { format: 'orvia.dpdpa-audit-package', format_version: 1, package_id: o.packageId ?? randomUUID(), installation_id: randomUUID(), organisation_name: 'Aster Synthetic Ltd',
    engagement_code_digest: engagementCodeDigest(o.code), firm_name: 'ORVIA audit practice', engagement_reference: 'ENG-TEST', audit_period: { from: '2026-01-01', to: '2026-06-30' }, scope_requirement_ids: o.scope,
    regulatory_package: null, approval: { preparer_role: 'MEMBER', approver_role: 'ORG_ADMIN', distinct_people: true, approved_at: new Date(now - 60000).toISOString() },
    created_at: new Date(now - 120000).toISOString(), expires_at: o.expires ?? new Date(now + 7 * 86400000).toISOString(),
    items: items.map(i => ({ item_id: i.item_id, requirement_id: i.requirement_id, kind: i.kind, title: i.title, file_name: i.file_name, media_type: i.media_type, size_bytes: i.bytes.length, sha256: sha256(i.bytes),
      contains_personal_data: i.personal ? 'YES' as const : 'NO' as const, personal_data_exception: i.personal ? { justification: 'Synthetic exception approved for the test engagement only.', approved_by_role: 'ORG_ADMIN' as const } : null })),
    revoked_package_ids: o.revoked ?? [] };
  return { manifest, bytes: packageFileBytes(manifest, new Map(items.map(i => [i.item_id, i.bytes]))) };
}
try {
  const anon = h.session();
  // First-run setup
  check('setup: no code issued', (await anon.json('/api/v1/vendor/setup')).data.state, 'NO_CODE_ISSUED');
  const code = await h.issueSetupCode();
  const owner = { email: 'owner@vendor.example', password: `Owner-${randomUUID()}`, domain: 'vendor' as const } as { email: string; password: string; totp?: string; domain: 'vendor' };
  const admin = { email: 'admin@vendor.example', password: `Admin-${randomUUID()}`, domain: 'vendor' as const } as typeof owner;
  const wrong = await anon.json('/api/v1/vendor/setup', { setup_code: 'WRONG-WRONG-WRONG', owner: { name: 'Vendor Owner', email: owner.email, password: owner.password }, admin: { name: 'Vendor Admin', email: admin.email, password: admin.password } });
  check('setup: wrong code refused and counted', [wrong.status, (await h.operator.query('SELECT failed_attempts FROM vendor.installation_setup')).rows[0].failed_attempts], [403, 1]);
  const done = await anon.json('/api/v1/vendor/setup', { setup_code: code, owner: { name: 'Vendor Owner', email: owner.email, password: owner.password }, admin: { name: 'Vendor Admin', email: admin.email, password: admin.password } });
  check('setup: completes and creates super admin and admin', [done.status, (await h.operator.query("SELECT role FROM vendor_auth.authority ORDER BY role")).rows.map(r => r.role)], [201, ['VENDOR_ADMIN', 'VENDOR_SUPER_ADMIN']]);
  check('setup: closed afterwards', (await anon.json('/api/v1/vendor/setup')).data.state, 'COMPLETED');

  // MFA mandatory
  const noMfa = await h.login(owner, { enrol: false });
  check('vendor API refuses a session without MFA', (await noMfa.json('/api/v1/vendor/team')).status, 403);
  const own = await h.login(owner);
  check('super admin with MFA reads the team', (await own.json('/api/v1/vendor/team')).data.members.length, 2);
  check('unauthenticated vendor API is 401', (await anon.json('/api/v1/vendor/engagements')).status, 401);
  const adm = await h.login(admin);

  // Team and role separation
  const mk = async (s: typeof own, name: string, role: string) => { const r = await s.json('/api/v1/vendor/team', { name, email: `${name.toLowerCase().replace(/\W/g, '')}@vendor.example`, role }); return r; };
  check('admin cannot create another vendor admin', (await mk(adm, 'Second Admin', 'VENDOR_ADMIN')).status, 409);
  const leadR = await mk(adm, 'Lead Auditor', 'LEAD_AUDITOR'); const audR = await mk(adm, 'Field Auditor', 'AUDITOR'); const revR = await mk(adm, 'Audit Reviewer', 'AUDIT_REVIEWER');
  check('admin creates audit members', [leadR.status, audR.status, revR.status], [201, 201, 201]);
  const userOf = (r: typeof leadR) => ({ email: r.data.member.email, password: r.data.one_time_password, domain: 'vendor' as const, id: r.data.member.user_id as string }) as { email: string; password: string; totp?: string; domain: 'vendor'; id: string };
  const leadU = userOf(leadR), audU = userOf(audR), revU = userOf(revR);
  const lead = await h.login(leadU); const auditor = await h.login(audU); const reviewer = await h.login(revU);
  check('auditor cannot manage the team', (await mk(auditor, 'Sneaky', 'AUDITOR')).status, 403);
  check('auditor cannot read the team', (await auditor.json('/api/v1/vendor/team')).status, 403);
  const tmp = await mk(adm, 'Temp Auditor', 'AUDITOR');
  check('typed DELETE required', (await adm.json(`/api/v1/vendor/team/${tmp.data.member.user_id}/delete`, { confirmation: 'delete' })).status, 400);
  const del = await adm.json(`/api/v1/vendor/team/${tmp.data.member.user_id}/delete`, { confirmation: 'DELETE' });
  check('delete login is permanent', [del.status, del.data.deleted, del.data.active], [200, true, false]);
  check('admin cannot delete the super admin', (await adm.json(`/api/v1/vendor/team/${(await own.json('/api/v1/vendor/session')).data.actor_id}/delete`, { confirmation: 'DELETE' })).status, 403);

  // Organisation, client account, engagement
  const org = await adm.json('/api/v1/vendor/organisations', { name: 'Aster Synthetic Ltd', registered_address: null });
  check('organisation created', org.status, 201);
  const orgId = org.data.id as string;
  await adm.json(`/api/v1/vendor/organisations/${orgId}/contacts`, { name: 'Asha Liaison', email: 'liaison@aster.example', designation: 'AUDIT_LIAISON' });
  const acct = await adm.json(`/api/v1/vendor/organisations/${orgId}/accounts`, { name: 'Aster Uploader', email: 'uploader@aster.example' });
  check('client vendor-account created', acct.status, 200);
  const other = await adm.json('/api/v1/vendor/organisations', { name: 'Birch Synthetic Ltd', registered_address: null });
  const scope = ['DPDP-NOTICE-CONSENT-REQUEST', 'DPDP-CONSENT-VALIDITY'];
  check('engagement refuses an unknown requirement', (await adm.json('/api/v1/vendor/engagements', { organisation_id: orgId, reference: 'ENG-X', scope_requirement_ids: ['DPDP-NOT-A-REQUIREMENT'], period_from: '2026-01-01', period_to: '2026-06-30' })).status, 400);
  const eng = await adm.json('/api/v1/vendor/engagements', { organisation_id: orgId, reference: 'ENG-TEST', scope_requirement_ids: scope, period_from: '2026-01-01', period_to: '2026-06-30', retention_days: 30 });
  check('engagement created with a one-time code', [eng.status, /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/.test(eng.data.engagement_code)], [201, true]);
  const engId = eng.data.engagement_id as string; const engCode = eng.data.engagement_code as string;
  check('only the code digest is stored', (await h.operator.query('SELECT code_digest FROM vendor.engagements WHERE id=$1', [engId])).rows[0].code_digest, engagementCodeDigest(engCode));
  const otherEng = await adm.json('/api/v1/vendor/engagements', { organisation_id: other.data.id, reference: 'ENG-OTHER', scope_requirement_ids: scope, period_from: '2026-01-01', period_to: '2026-06-30' });
  check('lead cannot be the reviewer', [(await adm.json(`/api/v1/vendor/engagements/${engId}/team`, { user_id: leadU.id, engagement_role: 'LEAD' })).status,
    (await adm.json(`/api/v1/vendor/engagements/${engId}/team`, { user_id: leadU.id, engagement_role: 'REVIEWER' })).status], [200, 409]);
  check('reviewer role must fit', (await adm.json(`/api/v1/vendor/engagements/${engId}/team`, { user_id: audU.id, engagement_role: 'REVIEWER' })).status, 409);
  await adm.json(`/api/v1/vendor/engagements/${engId}/team`, { user_id: revU.id, engagement_role: 'REVIEWER' });
  await adm.json(`/api/v1/vendor/engagements/${engId}/team`, { user_id: audU.id, engagement_role: 'AUDITOR' });
  check('independence: auditor (not lead) cannot declare', (await auditor.json(`/api/v1/vendor/engagements/${engId}/independence`, { statement: 'We are independent of the client organisation.', conflict_check: 'NO_CONFLICT', conflict_note: null, empanelment_reference: null })).status, 403);
  check('independence: certification wording refused', (await lead.json(`/api/v1/vendor/engagements/${engId}/independence`, { statement: 'We are certified independent auditors of the client.', conflict_check: 'NO_CONFLICT', conflict_note: null, empanelment_reference: null })).status, 400);
  check('independence declared by lead', (await lead.json(`/api/v1/vendor/engagements/${engId}/independence`, { statement: 'The audit team is independent of the client organisation and holds no conflicting interest.', conflict_check: 'NO_CONFLICT', conflict_note: null, empanelment_reference: null })).data.independence.declared, true);

  // Client upload
  const uploaderU = { email: 'uploader@aster.example', password: acct.data.one_time_password, domain: 'account' as const } as { email: string; password: string; totp?: string; domain: 'account' };
  const uploader = await h.login(uploaderU);
  const resetAttempts = () => h.operator.query('DELETE FROM vendor.upload_attempts');
  const upload = (bytes: Buffer, c = engCode) => Promise.resolve().then(() => uploader.send('/api/v1/vendor/uploads', { method: 'POST', body: new Uint8Array(bytes), headers: { 'content-type': 'application/vnd.orvia.audit-package+json', 'x-orvia-engagement-code': c } })).then(async r => ({ status: r.status, data: await r.json() }));
  check('vendor staff cannot upload as a client', (await lead.send('/api/v1/vendor/uploads', { method: 'POST', body: new Uint8Array(makePackage({ code: engCode, scope }).bytes), headers: { 'content-type': 'application/vnd.orvia.audit-package+json', 'x-orvia-engagement-code': engCode } })).status, 403);
  check('client account cannot open the vendor area', (await uploader.json('/api/v1/vendor/engagements')).status, 403);
  const good = makePackage({ code: engCode, scope });
  const tampered = Buffer.from(good.bytes); const at = tampered.indexOf('Published notice'); tampered[at] = 'p'.charCodeAt(0);
  check('tampered manifest refused', (await upload(tampered)).data.reasons, ['FINGERPRINT_MISMATCH']);
  const flip = JSON.parse(good.bytes.toString()); const key = Object.keys(flip.contents)[0]!; const raw = Buffer.from(flip.contents[key], 'base64'); raw[raw.length - 2] = raw[raw.length - 2]! ^ 1; flip.contents[key] = raw.toString('base64');
  check('one changed content byte refused', (await upload(Buffer.from(JSON.stringify(flip)))).data.reasons.includes('ITEM_HASH_MISMATCH'), true);
  check('expired package refused', (await upload(makePackage({ code: engCode, scope, expires: new Date(Date.now() - 1000).toISOString() }).bytes)).data.reasons.includes('EXPIRED'), true);
  check('unknown engagement code refused', (await upload(good.bytes, 'AAAAA-BBBBB-CCCCC-DDDDD')).data.reasons, ['ENGAGEMENT_CODE_NOT_RECOGNISED']);
  check('another organisation\'s engagement code refused', (await upload(makePackage({ code: otherEng.data.engagement_code, scope }).bytes, otherEng.data.engagement_code)).data.reasons, ['ENGAGEMENT_CODE_NOT_RECOGNISED']);
  check('package for a different engagement refused', (await upload(makePackage({ code: otherEng.data.engagement_code, scope }).bytes)).data.reasons, ['WRONG_ENGAGEMENT']);
  await resetAttempts();
  const accepted = await upload(good.bytes);
  check('clean package accepted', [accepted.status, accepted.data.outcome], [201, 'ACCEPTED']);
  check('same package twice refused', (await upload(good.bytes)).data.reasons, ['PACKAGE_ALREADY_RECEIVED']);
  const personal = makePackage({ code: engCode, scope, personal: true });
  const quarantined = await upload(personal.bytes);
  check('personal data without processing agreement is quarantined', quarantined.data.outcome, 'QUARANTINED');
  const stored = (await h.operator.query('SELECT ciphertext FROM vendor.package_items WHERE package_id=$1', [accepted.data.package_id])).rows;
  check('evidence encrypted at rest', stored.every(r => !r.ciphertext.includes(pdf.subarray(0, 12))), true);
  const eicar = makePackage({ code: engCode, scope }); const ej = JSON.parse(eicar.bytes.toString());
  const bad = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'); const m = ej.manifest; const txt = { ...m.items[1], kind: 'STATEMENT', media_type: 'text/plain', size_bytes: bad.length, sha256: sha256(bad), contains_personal_data: 'NO', personal_data_exception: null };
  const eicarPkg = packageFileBytes({ ...m, package_id: randomUUID(), items: [m.items[0], txt] }, new Map([[m.items[0].item_id, pdf], [txt.item_id, bad]]));
  check('malware screen refuses the EICAR test file', (await upload(eicarPkg)).data.reasons, ['MALWARE_SCREEN_EICAR_TEST_SIGNATURE']);

  // Inbox, access, review
  check('admin (not on team) cannot open the inbox', (await adm.json(`/api/v1/vendor/engagements/${engId}/inbox`)).status, 403);
  const inbox = await auditor.json(`/api/v1/vendor/engagements/${engId}/inbox`);
  check('inbox lists received packages and refusals', [inbox.data.packages.length, inbox.data.refusals.length >= 5], [2, true]);
  const pkg = await auditor.json(`/api/v1/vendor/packages/${accepted.data.package_id}`);
  const fileItem = pkg.data.items.find((i: { kind: string }) => i.kind === 'FILE');
  const content = await auditor.json(`/api/v1/vendor/packages/${accepted.data.package_id}/content?item=${fileItem.item_id}`);
  check('decrypted content matches its hash', sha256(Buffer.from(content.data.content_base64, 'base64')), fileItem.sha256);
  const qItem = (await auditor.json(`/api/v1/vendor/packages/${quarantined.data.package_id}`)).data.items[0];
  check('quarantined content cannot be opened', (await auditor.json(`/api/v1/vendor/packages/${quarantined.data.package_id}/content?item=${qItem.item_id}`)).status, 409);
  check('processing agreement releases quarantine', [(await adm.json(`/api/v1/vendor/engagements/${engId}/processing-agreement`, { reference: 'DPA-2026-001 (synthetic)' })).status,
    (await auditor.json(`/api/v1/vendor/packages/${quarantined.data.package_id}`)).data.state], [200, 'ACCEPTED']);
  const log = await auditor.json(`/api/v1/vendor/engagements/${engId}/access-log`);
  check('access log records views and downloads', ['VIEW_MANIFEST', 'DOWNLOAD_ITEM'].every(a => log.data.items.some((i: { action: string }) => i.action === a)), true);
  check('item review recorded', (await auditor.json(`/api/v1/vendor/packages/${accepted.data.package_id}/reviews`, { item_id: fileItem.item_id, decision: 'ACCEPT', note: 'Notice version matches the activity.', sampling: '1 of 1 notices' })).data.items.find((i: { item_id: string }) => i.item_id === fileItem.item_id).reviews.length, 1);
  await auditor.json(`/api/v1/vendor/engagements/${engId}/results`, { requirement_id: scope[0], result: 'MEETS', rationale: 'Published notice versions were evidenced for the sampled activity.' });
  await auditor.json(`/api/v1/vendor/engagements/${engId}/results`, { requirement_id: scope[1], result: 'PARTIALLY_MEETS', rationale: 'Withdrawal channel shown on notice; propagation evidence incomplete.' });
  const list = await auditor.json(`/api/v1/vendor/engagements/${engId}/checklist`);
  check('checklist shows expected vs received and results', [list.data.rows[0].received_items >= 2, list.data.rows[0].accepted_items, list.data.rows[0].result, list.data.rows[0].expected_evidence.length > 0], [true, 1, 'MEETS', true]);
  const finding = await auditor.json(`/api/v1/vendor/engagements/${engId}/findings`, { requirement_id: scope[1], provision_ids: ['ACT-S6(4)'], severity: 'MEDIUM', title: 'Withdrawal propagation evidence incomplete', observation: 'Two of five systems had no read-back.', recommendation: 'Add read-back verification for the remaining systems.', due_date: '2026-12-31' });
  check('finding raised', finding.data.items.length, 1);
  check('finding must cite provisions of its requirement', (await auditor.json(`/api/v1/vendor/engagements/${engId}/findings`, { requirement_id: scope[1], provision_ids: ['RULES-R7'], severity: 'LOW', title: 't', observation: 'o', recommendation: 'r', due_date: '2026-12-31' })).status, 400);
  const findingsFile = await auditor.json(`/api/v1/vendor/engagements/${engId}/findings/export`, {});
  const trust = installationTrust('codex-a00')!;
  check('findings file verifies with the trusted audit key', verifyAuditDocument(findingsFile.data.signed, trust.audit!).kind, 'FINDINGS');
  const forged = structuredClone(findingsFile.data.signed); forged.document.findings[0].severity = 'LOW';
  check('altered findings file fails verification', (() => { try { verifyAuditDocument(forged, trust.audit!); return 'ACCEPTED'; } catch (e) { return (e as Error).message; } })(), 'SIGNATURE_INVALID');

  // Report
  const draftBody = { opinion_as_of: '2026-07-15', method: 'Inspection of client-approved evidence packages and ORVIA-derived indicators; sampling as recorded per item.', opinion: 'Based on the evidence examined, the organisation meets one requirement in scope and partially meets the other, subject to the finding raised.', limitations: ['Evidence was limited to what the client chose to share.'] };
  check('only the lead drafts', (await auditor.json(`/api/v1/vendor/engagements/${engId}/reports`, draftBody)).status, 403);
  check('report wording guard', (await lead.json(`/api/v1/vendor/engagements/${engId}/reports`, { ...draftBody, opinion: 'The organisation is certified DPDPA compliant.' })).status, 400);
  const draft = await lead.json(`/api/v1/vendor/engagements/${engId}/reports`, draftBody);
  check('lead drafts report', [draft.status, draft.data.state], [200, 'DRAFT']);
  check('sign before approval refused', (await lead.json(`/api/v1/vendor/reports/${draft.data.id}/sign`, {})).status, 409);
  check('lead cannot approve own report', (await lead.json(`/api/v1/vendor/reports/${draft.data.id}/approve`, {})).status, 403);
  check('auditor cannot approve', (await auditor.json(`/api/v1/vendor/reports/${draft.data.id}/approve`, {})).status, 403);
  const approved = await reviewer.json(`/api/v1/vendor/reports/${draft.data.id}/approve`, {});
  check('engagement reviewer approves', approved.data.state, 'APPROVED');
  const signed = await lead.json(`/api/v1/vendor/reports/${draft.data.id}/sign`, {});
  const doc = verifyAuditDocument(signed.data.signed, trust.audit!);
  const pdfOut = await lead.json(`/api/v1/vendor/reports/${draft.data.id}/pdf`);
  check('signed report verifies and binds its PDF hash', [doc.kind, doc.kind === 'REPORT' && doc.pdf_sha256 === sha256(Buffer.from(pdfOut.data.pdf_base64, 'base64')), Buffer.from(pdfOut.data.pdf_base64, 'base64').subarray(0, 5).toString()], ['REPORT', true, '%PDF-']);
  check('signed report is immutable', await h.operator.query("UPDATE vendor.reports SET opinion='x' WHERE id=$1", [draft.data.id]).then(() => 'UPDATED', e => e.message), 'report_immutable');

  // Retention purge
  await resetAttempts();
  await adm.json(`/api/v1/vendor/engagements/${engId}/close`, {});
  check('upload into a closed engagement refused', (await upload(makePackage({ code: engCode, scope }).bytes)).data.reasons, ['ENGAGEMENT_CLOSED']);
  check('nothing purged before the retention period', (await adm.json('/api/v1/vendor/retention/sweep', {})).data.purged.length, 0);
  await h.operator.query("ALTER TABLE vendor.engagements DISABLE TRIGGER USER"); await h.operator.query("UPDATE vendor.engagements SET closed_at = closed_at - interval '31 days' WHERE id=$1", [engId]); await h.operator.query("ALTER TABLE vendor.engagements ENABLE TRIGGER USER");
  const swept = await adm.json('/api/v1/vendor/retention/sweep', {});
  const left = (await h.operator.query('SELECT count(*)::int AS n FROM vendor.package_items i JOIN vendor.packages p ON p.id=i.package_id WHERE p.engagement_id=$1 AND i.ciphertext IS NOT NULL', [engId])).rows[0].n;
  check('retention purge destroys evidence, keeps reports and findings, and is recorded', [swept.data.purged.length, left, (await h.operator.query('SELECT count(*)::int AS n FROM vendor.reports WHERE engagement_id=$1', [engId])).rows[0].n > 0,
    (await h.operator.query('SELECT count(*)::int AS n FROM vendor.findings WHERE engagement_id=$1', [engId])).rows[0].n, (await h.operator.query('SELECT count(*)::int AS n FROM vendor.retention_purges WHERE engagement_id=$1', [engId])).rows[0].n], [1, 0, true, 1, 1]);

  // Installation kind and gating
  check('installation kind cannot be changed', await h.operator.query("UPDATE vendor.installation_identity SET kind='VENDOR_SERVICE'").then(() => 'UPDATED', e => e.message), 'immutable_vendor_record');
  check('configured kind is VENDOR_SERVICE', configuredKind(), 'VENDOR_SERVICE');
  const staffSignIn = await onlyOn('CUSTOMER_INSTALLATION', staffAuthRoute)(new Request(h.config.origin + '/api/auth/staff/sign-in/email', { method: 'POST' }));
  const workspaceApi = await onlyOn('CUSTOMER_INSTALLATION', businessRoute)(new Request(h.config.origin + '/api/v1/admin/grc/frameworks'));
  check('staff login and workspace API are 404 on the vendor installation', [staffSignIn.status, workspaceApi.status], [404, 404]);
  check('orvia_vendor_app cannot read identity tables directly', await h.runtime.pool.query('SELECT * FROM vendor_auth.account').then(() => 'READ', e => e.code), '42501');
  check('every vendor table forces row-level security', (await h.operator.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('vendor','vendor_auth','account_auth') AND c.relkind='r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)")).rows[0].n, 0);
  check('orvia_vendor_app cannot bypass RLS on packages', (await h.runtime.pool.query('SELECT count(*)::int AS n FROM vendor.packages')).rows[0].n, 0);

  // Upload rate limit: ten per ten minutes per account
  await resetAttempts();
  let limited = 0; for (let i = 0; i < 12; i++) { const r = await upload(Buffer.from('{}')); if (r.status === 429) limited++; }
  check('upload rate limit applies', limited > 0, true);
} catch (error) { results.push({ name: 'suite', result: 'FAIL', detail: String((error as Error).stack ?? error).slice(0, 800) }); console.error(error); }
finally {
  await h.close();
  const failed = results.filter(r => r.result === 'FAIL').length;
  mkdirSync('handoffs/code/artifacts', { recursive: true });
  writeFileSync(`handoffs/code/artifacts/vendor-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ suite: 'vendor-audit', database: h.database, passed: results.length - failed, failed, results }, null, 2));
  console.log(`\nvendor-audit: ${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
}
