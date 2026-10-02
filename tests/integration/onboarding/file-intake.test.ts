// Revision 1.12 file intake, through the real HTTP boundary and the real worker sweep.
// Under test: a file arrives by upload or from the inbox folder, is staged, and nothing in it is used until a staff member
// approves it; approval routes it through the same checks as the screen for its kind; a document is kept and can be linked;
// an unreadable file can only be rejected and its content is then removed; the same content is one item; the inbox sweep
// reads only complete regular files and never deletes anything.
import { randomUUID, sign, createPrivateKey } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, utimes, readdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as S from '../../../shared/contracts/src/index.ts';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import { example } from '../../../shared/contracts/src/examples.ts';
import { operationsSuite, key } from '../../../shared/testing/src/operations-fixture.ts';
import { vendorSigningKey } from '../../../scripts/credentials.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepFileInbox } from '../../../services/worker/src/file-inbox.ts';

const t = operationsSuite('file-intake');
const { h, check, ok, codes, db } = t;
const b64 = (v: Buffer | string) => Buffer.from(v).toString('base64');
const upload = (who: Awaited<ReturnType<typeof h.login>>, name: string, content: Buffer | string) => who.call('/api/v1/admin/file-intake', { file_name: name, content_base64: b64(content) }, key());
const decide = (who: Awaited<ReturnType<typeof h.login>>, id: string, body: Record<string, unknown>) => who.call(`/api/v1/admin/file-intake/${id}/decision`, body, key());

await t.run(async () => {
  const owner = await h.login('owner'); const admin = await h.login('admin'); const auditor = await h.login('auditor');
  const scope = h.users.owner!.scope;
  const pdf = Buffer.from(`%PDF-1.7\nSynthetic processor agreement ${randomUUID()}\n%%EOF`);

  t.setPhase('manual upload');
  const doc = await ok(upload(admin, 'agreement.pdf', pdf), S.schemas.FileIntakeItem, [201]);
  check('an uploaded PDF is staged as a document and nothing is applied', [doc.detected_kind, doc.state, doc.source], ['DOCUMENT', 'STAGED', 'MANUAL_UPLOAD']);
  const again = await ok(upload(admin, 'agreement-copy.pdf', pdf), S.schemas.FileIntakeItem, [201]);
  check('the same content uploaded twice is one item', again.id, doc.id);
  check('a read-only login cannot upload', (await upload(auditor, 'x.pdf', pdf)).status, 403);
  check('a disguised file is not taken for what its name says', (await ok(upload(admin, 'invoice.pdf', `MZ ${randomUUID()}`), S.schemas.FileIntakeItem, [201])).detected_kind, 'UNRECOGNISED');

  t.setPhase('documents');
  check('a document cannot be linked to a record that does not exist', (await codes(decide(admin, doc.id, { decision: 'APPROVE', reason: 'Signed agreement.', subject_kind: 'PROCESSOR', subject_id: randomUUID() }))).codes, ['subject_not_found']);
  const kept = await ok(decide(admin, doc.id, { decision: 'APPROVE', reason: 'Signed agreement for the synthetic processor.' }), S.schemas.FileIntakeItem);
  check('an approved document is kept with who decided and why', [kept.state, kept.decided_by !== null, kept.decision_reason], ['KEPT', true, 'Signed agreement for the synthetic processor.']);
  const content = await ok(admin.call(`/api/v1/admin/file-intake/${doc.id}/content`), S.schemas.FileIntakeContent);
  check('a kept document can be opened, byte for byte', Buffer.from(content.content_base64, 'base64').equals(pdf), true);
  check('a decision is final', (await codes(decide(admin, doc.id, { decision: 'REJECT', reason: 'Changed my mind.' }))).codes, ['already_decided']);
  check('the database refuses to reopen or delete a decided file',
    [await db.query(`UPDATE app.file_intake_items SET state='STAGED', decided_at=NULL, decided_by=NULL WHERE id=$1`, [doc.id]).then(() => 'ACCEPTED', () => 'REFUSED'),
     await db.query('DELETE FROM app.file_intake_items WHERE id=$1', [doc.id]).then(() => 'ACCEPTED', () => 'REFUSED')], ['REFUSED', 'REFUSED']);

  t.setPhase('unreadable files');
  const exe = await ok(upload(admin, 'tool.exe', `MZ ${randomUUID()}`), S.schemas.FileIntakeItem, [201]);
  check('an unreadable file says why and cannot be approved', [exe.detected_kind, exe.approval_capability, (await codes(decide(admin, exe.id, { decision: 'APPROVE', reason: 'Try anyway.' }))).codes], ['UNRECOGNISED', null, ['unrecognised_files_can_only_be_rejected']]);
  await ok(decide(admin, exe.id, { decision: 'REJECT', reason: 'Not a file ORVIA uses.' }), S.schemas.FileIntakeItem);
  check('a rejected file\'s content is removed and its record kept', [(await codes(admin.call(`/api/v1/admin/file-intake/${exe.id}/content`))).codes, (await db.query('SELECT content IS NULL AS gone, sha256 FROM app.file_intake_items WHERE id=$1', [exe.id])).rows[0].gone], [['content_not_kept'], true]);

  t.setPhase('existing-data rows');
  const rows = (example('BulkJobAppend') as { rows: Record<string, unknown>[] }).rows.map(r => ({ ...r, row_key: `file-intake-${randomUUID()}` }));
  const estate = await ok(upload(admin, 'estate.jsonl', rows.map(r => JSON.stringify(r)).join('\n')), S.schemas.FileIntakeItem, [201]);
  check('existing-data rows are recognised by the contract schema', [estate.detected_kind, estate.detail], ['ESTATE_ROWS', `Existing-data onboarding: ${rows.length} row(s).`]);
  const routed = await ok(decide(admin, estate.id, { decision: 'APPROVE', reason: 'Monthly CRM export.' }), S.schemas.FileIntakeItem);
  const job = await ok(admin.call(`/api/v1/admin/bulk-jobs/${routed.routed_resource_id}`), S.schemas.BulkJob);
  check('approval creates an onboarding job holding the rows, still waiting to be processed', [routed.state, job.counts.received, job.counts.applied], ['ROUTED', rows.length, 0]);
  check('the routed file\'s staged copy is not kept twice', (await db.query('SELECT content IS NULL AS gone FROM app.file_intake_items WHERE id=$1', [estate.id])).rows[0].gone, true);

  t.setPhase('licence by file');
  const vendor = vendorSigningKey('licence');
  const installation = (await db.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0].installation_id as string;
  const top = Number((await db.query('SELECT coalesce(max(sequence),0) AS top FROM app.licences WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3', [scope.tenant_id, scope.legal_entity_id, scope.environment_id])).rows[0].top);
  const claims = { licence_id: randomUUID(), edition: 'CUSTOM', entitlements: S.EntitlementCode.options.filter(c => c !== 'SSO_IDENTITY'), installation_id: installation, audience: 'ORVIA_CUSTOMER_INSTALLATION',
    valid_from: new Date(Date.now() - 86_400_000).toISOString(), valid_to: new Date(Date.now() + 365 * 86_400_000).toISOString(), licensed_limits: { environments: 100, staff_members: 10000, member_seats: 1000 }, ...(top ? { sequence: top + 1, term: 'CONTRACT' } : {}) };
  const signed = { licence: { algorithm: 'Ed25519', claims, signing_key_id: vendor.key_id, signature: sign(null, Buffer.from(canonicalJson(claims)), createPrivateKey({ key: Buffer.from(vendor.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url') } };
  const lic = await ok(upload(admin, 'licence.json', JSON.stringify(signed)), S.schemas.FileIntakeItem, [201]);
  check('a signed licence file is recognised and names the permission approval needs', [lic.detected_kind, lic.approval_capability], ['LICENCE', 'licence.manage']);
  check('approving it needs the same permission as importing a licence', (await decide(admin, lic.id, { decision: 'APPROVE', reason: 'Renewal.' })).status, 403);
  const imported = await ok(decide(owner, lic.id, { decision: 'APPROVE', reason: 'Renewal licence from the vendor.' }), S.schemas.FileIntakeItem);
  check('the owner\'s approval imports it as the licence', [imported.state, imported.routed_resource_id], ['ROUTED', claims.licence_id]);

  t.setPhase('inbox folder');
  const root = await mkdtemp(join(tmpdir(), 'orvia-inbox-'));
  const runtime = workflowActivities();
  try {
    const workers = runtime.enrollment.identities.map(x => x.id);
    const incoming = join(root, scope.environment_id, 'incoming');
    await mkdir(incoming, { recursive: true });
    const old = new Date(Date.now() - 60_000);
    const policy = Buffer.from(`%PDF-1.7\nSynthetic retention policy ${randomUUID()}\n%%EOF`);
    await writeFile(join(incoming, 'retention-policy.pdf'), policy); await utimes(join(incoming, 'retention-policy.pdf'), old, old);
    await writeFile(join(incoming, 'export.json.part'), '{'); await utimes(join(incoming, 'export.json.part'), old, old);
    await writeFile(join(incoming, 'fresh.pdf'), `%PDF-1.7 ${randomUUID()}`);
    await writeFile(join(incoming, 'empty.txt'), ''); await utimes(join(incoming, 'empty.txt'), old, old);
    await symlink('/etc/hostname', join(incoming, 'link.txt'));
    await sweepFileInbox(runtime.scoped, workers, root);
    const left = (await readdir(incoming)).sort();
    check('only complete regular files are taken: partial, still-being-written and linked files are left alone', left, ['export.json.part', 'fresh.pdf', 'link.txt']);
    check('a picked-up file moves to accepted/, an empty one to rejected/ with a reason', [(await readdir(join(root, scope.environment_id, 'accepted'))).length, (await readdir(join(root, scope.environment_id, 'rejected'))).filter(n => n.endsWith('.reason.txt')).length], [1, 1]);
    const list = await ok(admin.call('/api/v1/admin/file-intake'), S.schemas.FileIntakeList);
    const fromInbox = list.items.find(i => i.original_name === 'retention-policy.pdf');
    check('a file from the inbox folder waits for approval like an upload', [fromInbox?.source, fromInbox?.state, fromInbox?.detected_kind], ['INBOX_FOLDER', 'STAGED', 'DOCUMENT']);
    await writeFile(join(incoming, 'retention-policy-again.pdf'), policy); await utimes(join(incoming, 'retention-policy-again.pdf'), old, old);
    await sweepFileInbox(runtime.scoped, workers, root);
    check('the same content dropped again is the same item', (await ok(admin.call('/api/v1/admin/file-intake'), S.schemas.FileIntakeList)).items.filter(i => i.sha256 === fromInbox!.sha256).length, 1);
    check('the screen reports whether this installation has an inbox folder', typeof list.inbox.configured, 'boolean');
  } finally { await runtime.close(); await rm(root, { recursive: true, force: true }); }
});
