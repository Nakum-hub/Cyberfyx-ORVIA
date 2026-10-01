// DPDPA audit mandate (revision 1.6), end to end in a real browser (Chromium),
// across two installations started from the same build, with the client's
// background-worker code calling the vendor installation over real HTTP:
//   codex-a00  CUSTOMER_INSTALLATION  (started by the fixture; its trust file names the vendor audit address for this run)
//   vendor-a00 VENDOR_SERVICE         http://127.0.0.1:4340
// Vendor leadership overview → engagement → client records it, drafts a mandate,
// a second owner approves → the worker checks in and sends a signed snapshot →
// the lead sees the mandate, an intact chain and the evidence → the lead asks for
// a seeded sample and a document → the sample is answered automatically, the
// client's owner declines the document with a reason → the client's
// vendor-visibility page lists every delivery → closing the engagement ends the
// channel. Synthetic data only.
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite } from '../../shared/testing/src/operations-fixture.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import { webProcess } from '../../scripts/web-process.ts';
import { writePrivateJson } from '../../scripts/local-private.ts';
import { vendorSigningKey } from '../../scripts/credentials.ts';
import { runtimeConfig } from '../../backend/auth/src/config.ts';
import { waitForPageContent } from '../../shared/testing/src/browser-ready.ts';
import { workerEnrollment } from '../../backend/auth/src/machine-profile.ts';
import { servicePool, machineAuthority } from '../../backend/auth/src/machine.ts';
import { scopedTransaction } from '../../database/customer/src/runtime.ts';
import { channelSweep } from '../../backend/domain/src/dpdpa-audit/channel.ts';
import type { Context } from '../../backend/domain/src/shared/transaction.ts';
import { setupPractice, acceptEngagement, planEngagement, evidenceFor, paper } from '../integration/vendor/practice-flow.ts';

const VENDOR = `http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
/** Whether the element appears within 15 s: a screen re-renders after an action, so an immediate isVisible() races it. */
const seen = (l: { waitFor: (o: { timeout: number }) => Promise<void> }) => l.waitFor({ timeout: 15000 }).then(() => true, () => false);
// The vendor supplies an updated trust file naming its audit address; this run installs it and restores the original afterwards.
const trustPath = resolve('.local/profiles/codex-a00/trust/vendor-public-keys.json');
const originalTrust = readFileSync(trustPath, 'utf8');
writePrivateJson(trustPath, { ...JSON.parse(originalTrust), audit_service: { url: VENDOR } });

const t = operationsSuite('audit-mandate-browser');
const { h, check, db } = t;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const shots = resolve('output/playwright'); mkdirSync(shots, { recursive: true });
const journalPath = resolve('.local/profiles/vendor-a00/auth/e2e-users.json');
type User = { email: string; password: string; totp?: string };
const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { admin: User; lead: User; reviewer: User; organisation_id: string };
const persist = () => writePrivateJson(journalPath, journal);
const errors: string[] = []; const external: string[] = [];
const label = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\*)?$`);
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function context(browser: Browser, base: string) {
  const page = await (await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  page.on('request', r => { const o = new URL(r.url()).origin; if (o !== base) external.push(r.url()); });
  return page;
}
async function staffSignIn(browser: Browser, name: 'owner' | 'reviewer' | 'admin') {
  const page = await context(browser, h.config.origin); const user = h.users[name]!;
  await h.authWindow(); await page.goto('/workspace/sign-in');
  await page.getByLabel('Staff email').fill(user.email); await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  return page;
}
async function vendorSignIn(page: Page, user: User) {
  await page.goto('/vendor/sign-in');
  await page.getByLabel(label('Email')).fill(user.email); await page.getByLabel(label('Password')).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel(label('Authenticator code')).fill(authenticatorCode(user.totp!));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.waitForURL(/\/vendor\/(engagements|upload)/);
  await waitForPageContent(page); await page.waitForLoadState('networkidle');
  persist();
}
async function startVendor() {
  const command = webProcess({ profile: 'vendor-a00', app_port: PROFILES['vendor-a00'].app_port });
  const child: ChildProcess = spawn(process.execPath, command.args, { cwd: command.cwd, stdio: ['ignore', 'ignore', 'pipe'], env: { ...command.env, ORVIA_PROFILE: 'vendor-a00', NEXT_TELEMETRY_DISABLED: '1' } });
  let diagnostics = ''; child.stderr?.on('data', c => { diagnostics += c.toString(); });
  for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error(`Vendor web process exited: ${diagnostics.slice(-500)}`); try { if ((await fetch(`${VENDOR}/readyz`, { signal: AbortSignal.timeout(2000) })).ok) return child; } catch { /* starting */ } await new Promise(r => setTimeout(r, 500)); }
  throw new Error('Vendor installation readiness timeout');
}
const openEngagement = async (page: Page, reference: string) => {
  await page.goto('/workspace/dpdpa-audit'); await page.getByRole('heading', { name: 'DPDPA external audit' }).waitFor();
  await page.getByRole('table', { name: 'Engagements' }).getByRole('row').filter({ hasText: reference }).getByRole('button', { name: 'Open' }).click();
  await page.getByRole('heading', { name: 'Audit mandate' }).waitFor();
};

try {
  await t.run(async () => {
    const suffix = randomUUID().slice(0, 8); const reference = `ENG-MB-${suffix}`;
    const reqA = 'DPDP-NOTICE-CONSENT-REQUEST'; const reqB = 'DPDP-CONSENT-PROOF';
    const config = runtimeConfig(); const scopeIds = t.scope();
    const identity = workerEnrollment(config).identities.find(i => i.scope.environment_id === scopeIds.environment_id)!;
    const workerPool = servicePool(config, 'orvia_worker'); const actor = machineAuthority(identity);
    const audit = vendorSigningKey('audit');
    // The background worker's own code, as the enrolled WORKER, calling the vendor installation over HTTP.
    const sweep = () => channelSweep(<T>(work: (c: Context) => Promise<T>) => scopedTransaction(workerPool, actor, tx => work({ tx, actor, requestId: randomUUID() })),
      { address: VENDOR, auditKey: { key_id: audit.key_id, public: audit.public }, sealKey: createHash('sha256').update('orvia-evidence-key-seal:' + config.secret('principal-secret')).digest(), checkInSeconds: 60 });
    const vendorProcess = await startVendor();
    const browser = await chromium.launch({ headless: true, ...executablePath ? { executablePath } : {} });
    try {
      t.setPhase('vendor leadership and engagement');
      const vadmin = await context(browser, VENDOR); await vendorSignIn(vadmin, journal.admin);
      await vadmin.goto('/vendor'); await vadmin.getByRole('heading', { name: 'Practice' }).waitFor();
      check('leadership sees the practice overview from real records', [await seen(vadmin.getByRole('heading', { name: 'Needs attention' })), await seen(vadmin.getByText('Clients sending evidence under a mandate'))], [true, true]);
      await vadmin.screenshot({ path: resolve(shots, 'mandate-vendor-overview.png'), fullPage: true });
      await vadmin.goto('/vendor/engagements');
      const ef = vadmin.getByRole('form', { name: 'Create engagement' });
      await ef.getByLabel(label('Client organisation')).selectOption(journal.organisation_id);
      await ef.getByLabel(label('Engagement reference')).fill(reference); await ef.getByLabel(label('Requirements in scope')).fill(`${reqA} ${reqB}`);
      await ef.getByLabel(label('Audit period from (YYYY-MM-DD)')).fill(day(-150)); await ef.getByLabel(label('Audit period to (YYYY-MM-DD)')).fill(day(10));
      await ef.getByRole('button', { name: 'Create engagement' }).click();
      const code = (await vadmin.locator('.notice-warn code').first().textContent())!.trim();
      await vadmin.getByRole('link', { name: 'Open the engagement' }).click(); await vadmin.waitForURL(/\/vendor\/engagements\/[0-9a-f-]{36}$/);
      const engagementUrl = vadmin.url();
      const members = await fetch(`${VENDOR}/api/v1/vendor/team`, { headers: { cookie: (await vadmin.context().cookies()).map(c => `${c.name}=${c.value}`).join('; ') } }).then(r => r.json()) as { members: { user_id: string; email: string }[] };
      for (const [u, role] of [[journal.lead, 'LEAD'], [journal.reviewer, 'REVIEWER']] as const) {
        const tf = vadmin.getByRole('form', { name: 'Add team member' });
        await tf.getByLabel(label('Member')).selectOption(members.members.find(m => m.email === u.email)!.user_id); await tf.getByLabel(label('Engagement role')).selectOption(role);
        await tf.getByRole('button', { name: 'Add to team' }).click(); await vadmin.getByRole('cell', { name: role, exact: true }).waitFor();
      }

      // Acceptance and planning are the subject of the dpdpa-audit browser journey; here they are set up through the same
      // vendor API with the signed-in browser sessions, so the channel can be exercised on an accepted engagement.
      const lead = await context(browser, VENDOR); await vendorSignIn(lead, journal.lead);
      const vrev = await context(browser, VENDOR); await vendorSignIn(vrev, journal.reviewer);
      const pageApi = (page: Page) => ({ json: async (path: string, body?: unknown) => {
        const cookie = (await page.context().cookies()).map(c => `${c.name}=${c.value}`).join('; ');
        const r = await fetch(VENDOR + path, body === undefined ? { headers: { cookie } } : { method: 'POST', headers: { cookie, origin: VENDOR, 'content-type': 'application/json', 'idempotency-key': randomUUID().replaceAll('-', '') }, body: JSON.stringify(body) });
        const text = await r.text(); let data: unknown; try { data = JSON.parse(text); } catch { data = text; }
        return { status: r.status, data: data as any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses carry arbitrary fields
      } });
      const engagementId = engagementUrl.split('/').at(-1)!;
      const practice = await setupPractice(pageApi(lead), pageApi(vrev), reference.replace(/[^A-Za-z0-9]/g, '').slice(-12));
      await acceptEngagement({ admin: pageApi(vadmin), reviewer: pageApi(vrev), lead: pageApi(lead), engagementId, ...practice });
      const leadMember = members.members.find(m => m.email === journal.lead.email)!;
      const plan = await planEngagement({ lead: pageApi(lead), auditor: pageApi(lead), reviewer: pageApi(vrev), engagementId, requirements: [reqA, reqB], period: { from: day(-150), to: day(10) }, leadId: leadMember.user_id });

      t.setPhase('client mandate');
      const admin = await staffSignIn(browser, 'admin'); const reviewer = await staffSignIn(browser, 'reviewer'); const owner = await staffSignIn(browser, 'owner');
      await t.ensurePackage();
      await admin.goto('/workspace/dpdpa-audit'); await admin.getByRole('heading', { name: 'DPDPA external audit' }).waitFor();
      const cf = admin.getByRole('form', { name: 'Record engagement' });
      await cf.getByLabel(label('Engagement code')).fill(code); await cf.getByLabel(label('Audit firm')).fill('ORVIA audit practice');
      await cf.getByLabel(label('Engagement reference')).fill(reference); await cf.getByLabel(label('Requirements in scope')).fill(`${reqA} ${reqB}`);
      await cf.getByLabel(label('Audit period from (YYYY-MM-DD)')).fill(day(-150)); await cf.getByLabel(label('Audit period to (YYYY-MM-DD)')).fill(day(10));
      await cf.getByRole('button', { name: 'Record engagement' }).click(); await admin.getByText('Engagement recorded.').waitFor();
      await admin.getByRole('heading', { name: 'Audit mandate' }).waitFor();
      check('the client sees the audit address from its trust file', await seen(admin.getByText(VENDOR, { exact: true })), true);
      await admin.getByRole('form', { name: 'Draft mandate' }).getByRole('button', { name: 'Draft mandate' }).click();
      await admin.getByText('Mandate drafted; a different owner or administrator approves it.').waitFor();
      await openEngagement(reviewer, reference);
      await reviewer.getByRole('button', { name: 'Approve mandate' }).click(); await reviewer.getByText('Mandate approved. ORVIA begins sending evidence at its next check-in.').waitFor();
      check('a second owner approves the mandate in the browser', true, true);

      t.setPhase('worker sends the first snapshot');
      const r1 = await sweep();
      check('the worker checks in over HTTP and the signed snapshot is accepted', [r1.check_ins >= 1, r1.deliveries_accepted], [true, 1]);
      await openEngagement(admin, reference);
      const sent = admin.getByRole('table', { name: 'Evidence deliveries' });
      check('the client sees what ORVIA sent and that it was accepted', await sent.getByRole('row').filter({ hasText: 'scheduled snapshot' }).filter({ hasText: 'accepted' }).count(), 1);
      await admin.screenshot({ path: resolve(shots, 'mandate-client-channel.png'), fullPage: true });

      t.setPhase('vendor sees the evidence');
      await lead.goto(engagementUrl, { waitUntil: 'domcontentloaded' }); await waitForPageContent(lead); await lead.getByRole('tab', { name: /^Requests/ }).click(); await lead.getByRole('heading', { name: 'Client mandate and evidence' }).waitFor();
      check('the lead sees the signed mandate and an intact chain', [await seen(lead.getByText(/active \(open\)/).first()), await seen(lead.getByText('Intact through delivery 1'))], [true, true]);
      await lead.getByRole('table', { name: 'Deliveries from the client installation' }).getByRole('button', { name: 'View' }).first().click();
      await lead.getByRole('heading', { name: 'Delivery content' }).waitFor();
      check('the lead reads the evidence entries signed by the client installation', await lead.getByRole('table', { name: 'Evidence entries, signed by the client installation' }).getByRole('row').count() > 1, true);
      await lead.screenshot({ path: resolve(shots, 'mandate-vendor-channel.png'), fullPage: true });

      t.setPhase('auditor requests');
      const issue = async (kind: string, requirement: string, description: string, size?: string) => {
        const f = lead.getByRole('form', { name: 'Issue request' });
        await f.getByLabel(label('Request')).selectOption(kind); await f.getByLabel(label('Requirement')).selectOption(requirement);
        if (size) await f.getByLabel(label('Sample size')).fill(size);
        await f.getByLabel(label('What you need and why')).fill(description); await f.getByRole('button', { name: 'Issue request' }).click();
        await lead.getByRole('table', { name: 'Requests issued over the channel' }).getByText(description).waitFor();
      };
      await issue('SAMPLE_COUNT', reqB, 'Five consent events: is evidence available for each?', '5');
      await issue('EVIDENCE_FILE', reqA, 'Signed approval of the itemised notice.');
      await db.query("UPDATE app.audit_mandates SET last_check_in_at=last_check_in_at-interval '1 hour' WHERE engagement_id=(SELECT id FROM app.audit_engagements WHERE engagement_reference=$1)", [reference]);
      const r2 = await sweep();
      check('the worker receives both requests; the document waits for a client approver', [r2.requests_received, r2.requests_for_approval, r2.deliveries_accepted], [2, 1, 1]);
      await openEngagement(owner, reference);
      const row = owner.getByRole('table', { name: 'Requests from your auditor' }).getByRole('row').filter({ hasText: 'Signed approval of the itemised notice.' });
      check('the owner sees the document request waiting for them', await seen(row.getByText('awaiting client approval')), true);
      await row.getByLabel(label('Reason to decline')).fill('Not held by the organisation');
      await row.getByRole('button', { name: 'Decline' }).click(); await owner.getByText('Declined; the auditor sees your reason.').waitFor();
      await db.query("UPDATE app.audit_mandates SET last_check_in_at=last_check_in_at-interval '1 hour' WHERE engagement_id=(SELECT id FROM app.audit_engagements WHERE engagement_reference=$1)", [reference]);
      await sweep();
      await lead.reload(); await lead.getByRole('heading', { name: 'Client mandate and evidence' }).waitFor();
      const requests = lead.getByRole('table', { name: 'Requests issued over the channel' });
      check('the lead sees the sample answered and the document declined with the client\'s reason', [
        await seen(requests.getByRole('row').filter({ hasText: 'Five consent events' }).getByText('delivered')),
        await seen(requests.getByRole('row').filter({ hasText: 'Signed approval' }).getByText('not held by the organisation'))], [true, true]);
      await requests.getByRole('row').filter({ hasText: 'Five consent events' }).getByRole('button', { name: 'View answer' }).click();
      await lead.getByRole('heading', { name: 'Delivery content' }).waitFor();
      check('the sample answer is counts over the auditor\'s selection', await seen(lead.getByText(/records passing/).first()), true);
      await lead.screenshot({ path: resolve(shots, 'mandate-vendor-requests.png'), fullPage: true });

      t.setPhase('findings to the client and the response back');
      // The finding itself is raised through the vendor API (the practice screens are covered by the dpdpa-audit journey); the client side is driven in the browser.
      const vch = (await pageApi(lead).json(`/api/v1/vendor/engagements/${engagementId}/channel`)).data;
      const firstDelivery = vch.deliveries.find((d: { kind: string; outcome: string }) => d.kind === 'SNAPSHOT' && d.outcome === 'ACCEPTED');
      const entries = (await pageApi(lead).json(`/api/v1/vendor/channel-deliveries/${firstDelivery.delivery_id}`)).data.document.entries as { key: string; requirement_id: string | null; category: string }[];
      const entry = entries.find(x => x.requirement_id === reqA && x.category === 'INDICATORS')!;
      const ev = await evidenceFor({ auditor: pageApi(lead), engagementId, procedureId: plan.procedures[reqA]!, register: { source: 'CHANNEL_ENTRY', delivery_id: firstDelivery.delivery_id, entry_key: entry.key, valid_until: null, description: null } });
      const wp = await paper({ preparer: pageApi(lead), reviewer: pageApi(vrev), procedureId: plan.procedures[reqA]!, conclusion: 'EXCEPTIONS_NOTED', evidence: [ev] });
      await pageApi(lead).json(`/api/v1/vendor/engagements/${engagementId}/findings`, { requirement_id: reqA, provision_ids: ['ACT-S5(1)'], criterion_type: 'STATUTORY', severity: 'MEDIUM', title: 'Notice indicator gap (browser)',
        observation: 'One activity has no published notice version.', affected_scope: 'Consent notices', cause: 'The notice was never published for the activity.', consequence: 'Consent for that activity may not be informed.',
        severity_rationale: 'One activity; moderate number of Data Principals.', recommendation: 'Publish an itemised notice for the activity.', orvia_guidance: null, due_date: day(60), working_paper_ids: [wp], evidence_ids: [ev] });
      await pageApi(lead).json(`/api/v1/vendor/engagements/${engagementId}/findings/export`, {});
      await db.query("UPDATE app.audit_mandates SET last_check_in_at=last_check_in_at-interval '1 hour' WHERE engagement_id=(SELECT id FROM app.audit_engagements WHERE engagement_reference=$1)", [reference]);
      const r3 = await sweep();
      check('the worker collects the signed findings file at check-in and only stages it', r3.documents_received, 1);
      await openEngagement(admin, reference);
      const docs = admin.getByRole('table', { name: 'Signed documents received over the channel' });
      await docs.getByRole('row').filter({ hasText: 'findings' }).getByRole('button', { name: 'Verify and import' }).click(); await admin.getByText('Signed document verified and imported.').waitFor();
      check('a person imports the staged findings file in the browser', await seen(docs.getByRole('row').filter({ hasText: 'findings' }).getByText('imported')), true);
      const rf = admin.getByRole('form', { name: 'Prepare management response' });
      await rf.getByLabel(label('Finding')).selectOption({ index: 1 }); await rf.getByLabel(label('Agreement with the finding')).selectOption('PARTIALLY_AGREE');
      await rf.getByLabel(label('Response')).fill('We will publish the notice; write to privacy@aster.example for the draft.'); await rf.getByLabel(label('Owner (role)')).fill('Privacy office');
      await rf.getByRole('button', { name: 'Prepare response' }).click(); await admin.getByText('Response drafted; a different owner or administrator approves it.').waitFor();
      check('the drafted response shows its redaction', await seen(admin.getByRole('table', { name: 'Management responses' }).getByText(/1 redaction/)), true);
      await openEngagement(reviewer, reference);
      await reviewer.getByRole('table', { name: 'Management responses' }).getByLabel(/it contains no personal data/).check();
      await reviewer.getByRole('table', { name: 'Management responses' }).getByRole('button', { name: 'Approve response' }).click(); await reviewer.getByText('Response approved; it is sent at the next check-in.').waitFor();
      const r4 = await sweep();
      await reviewer.reload(); await openEngagement(reviewer, reference);
      check('the worker signs and sends the approved response and the client sees it accepted', [r4.responses_sent, await seen(reviewer.getByRole('table', { name: 'Management responses' }).getByText('accepted', { exact: true }))], [1, true]);
      await reviewer.screenshot({ path: resolve(shots, 'mandate-client-responses.png'), fullPage: true });
      await lead.goto(engagementUrl, { waitUntil: 'domcontentloaded' }); await waitForPageContent(lead); await lead.getByRole('tab', { name: /^Findings and actions/ }).click();
      const vf = lead.getByRole('table', { name: 'Findings' }).getByRole('row').filter({ hasText: 'Notice indicator gap (browser)' });
      check('the auditor sees the client\'s response on the finding, from the channel, without the contact detail', [await seen(vf.getByText(/partially agree/)), await seen(vf.getByText(/channel/)), await vf.getByText(/privacy@aster/).count()], [true, true, 0]);
      await lead.screenshot({ path: resolve(shots, 'mandate-vendor-response.png'), fullPage: true });
      await lead.getByRole('tab', { name: /^Requests/ }).click();

      t.setPhase('client visibility and closure');
      await owner.goto('/workspace/vendor-visibility'); await owner.getByRole('heading', { name: 'DPDPA audit evidence' }).waitFor();
      check('the client\'s vendor-visibility page lists every delivery ORVIA sent', await owner.getByRole('table', { name: 'Evidence deliveries sent by ORVIA (aggregates only, no personal data)' }).getByRole('row').filter({ hasText: reference }).count(), 2);
      await owner.screenshot({ path: resolve(shots, 'mandate-client-visibility.png'), fullPage: true });
      await openEngagement(owner, reference);
      await owner.getByLabel(label('Reason')).fill('Report received; engagement complete.');
      await owner.getByRole('button', { name: 'Close engagement (uses the reason above)' }).click(); await owner.getByText('Engagement closed; its mandate has ended and nothing more is sent.').waitFor();
      await sweep();
      await lead.reload(); await lead.getByRole('heading', { name: 'Client mandate and evidence' }).waitFor();
      check('closing the engagement ends the mandate, and the vendor sees it', await seen(lead.getByText(/^ended · engagement/).first()), true);

      check('no browser errors and no request left either installation', [errors, external], [[], []]);
    } finally {
      await browser.close(); await workerPool.end();
      if (vendorProcess.exitCode === null) { const closed = once(vendorProcess, 'close'); vendorProcess.kill(); await closed; }
    }
  });
} finally { writePrivateJson(trustPath, JSON.parse(originalTrust)); }
