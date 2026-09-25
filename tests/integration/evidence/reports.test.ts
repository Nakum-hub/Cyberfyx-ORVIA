// Reporting integration suite (§133).
// Under test: every section builds against the real schema, a period actually
// narrows what is reported, and a reader who may not see a section is told so
// on the cover rather than handed a report that quietly shrank to fit them.
import assert from 'node:assert/strict';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
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

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  await scenario.change('grant');
  await scenario.change('withdraw');
  const owner = await h.login('owner');
  const scope = [scenario.scope.tenant_id, scenario.scope.legal_entity_id, scenario.scope.environment_id];

  const build = async (as = owner, query = '') => {
    const response = await as.call(`/api/v1/admin/reports${query}`);
    if (response.status !== 200) throw new Error(`Report answered ${response.status}`);
    return S.Report.parse(await response.json());
  };
  const section = (r: S.ReportValue, kind: string) => r.sections.find(s => s.kind === kind);

  // --- every section this product claims it can produce actually builds --------
  phase = 'all sections';
  const all = await build(owner, `?sections=${S.ReportSectionKind.options.join(',')}&title=Full%20privacy%20record`);
  check('every declared section builds against the real schema',
    all.sections.map(s => s.kind).sort(), [...S.ReportSectionKind.options].sort());
  check('and nothing is left unaccounted for', all.omitted, []);
  check('every section says what it covers and what it counted',
    all.sections.filter(s => s.covers.length < 20 || s.counted.length < 10).map(s => s.kind), []);
  check('every row matches its column count',
    all.sections.filter(s => s.rows.some(row => row.length !== s.columns.length)).map(s => s.kind), []);

  // --- the sections carry real figures, not placeholders -----------------------
  phase = 'real figures';
  const consentRows = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.consent_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)).rows[0].n);
  check('the consent section is read from the recorded decisions',
    section(all, 'CONSENT_DECISIONS')!.rows.length, Math.min(consentRows, 2000));
  check('the purposes section names the itemised categories of the published notice',
    section(all, 'PURPOSES_AND_NOTICES')!.rows.some(row => row.join(' ').includes('CONTACT_DETAILS')), true);
  check('the retention section reports every purpose, configured or not',
    section(all, 'AUDIT_RETENTION')!.rows.length, S.AuditRetentionPurpose.options.length);

  // --- a period actually narrows the report -------------------------------------
  phase = 'period';
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const empty = await build(owner, `?sections=CONSENT_DECISIONS&from=${encodeURIComponent(future)}`);
  check('a period after everything on record produces an empty section, not a missing one',
    [section(empty, 'CONSENT_DECISIONS')!.rows.length, section(empty, 'CONSENT_DECISIONS') !== undefined], [0, true]);
  check('and the empty section still says what it counted',
    section(empty, 'CONSENT_DECISIONS')!.counted.includes('0 decision'), true);
  const reversed = await owner.call(
    `/api/v1/admin/reports?sections=CONSENT_DECISIONS&from=${encodeURIComponent(future)}&to=${encodeURIComponent(new Date(0).toISOString())}`);
  check('a period that ends before it starts is refused before any section is built', reversed.status, 400);

  // --- the refusal that protects the reader --------------------------------------
  phase = 'withheld';
  // An administrator may export evidence but deliberately does not hold
  // audit.export: FR-M33-03 separates taking the trail away from reading it.
  // So the audit section must be named as withheld, not quietly dropped.
  const admin = await h.login('admin');
  const partial = await build(admin, `?sections=${S.ReportSectionKind.options.join(',')}`);
  const withheld = partial.omitted.filter(o => o.reason === 'WITHHELD_FOR_AUTHORITY').map(o => o.kind);
  check('a reader without a section’s capability gets it named as withheld, never dropped',
    [withheld, partial.sections.some(s => withheld.includes(s.kind))], [['AUDIT_TRAIL'], false]);
  // An auditor, who does hold audit.export, gets the same section included.
  const auditor = await h.login('auditor');
  const full = await build(auditor, '?sections=AUDIT_TRAIL');
  check('and the same section is included for a reader who may take the trail away',
    [full.sections.map(s => s.kind), full.omitted.some(o => o.kind === 'AUDIT_TRAIL')], [['AUDIT_TRAIL'], false]);
  check('and every section is still accounted for exactly once',
    [...partial.sections.map(s => s.kind), ...partial.omitted.map(o => o.kind)].sort(),
    [...S.ReportSectionKind.options].sort());
  check('the report states structurally that omissions are named',
    [partial.every_section_left_out_is_named, partial.this_report_is_not_a_compliance_certificate], [true, true]);

  // --- selection, and what it discloses --------------------------------------------
  phase = 'selection';
  const chosen = await build(owner, '?sections=PURPOSES_AND_NOTICES,CONSENT_DECISIONS&title=Board%20pack');
  check('a chosen subset is built in the order it was asked for',
    chosen.sections.map(s => s.kind), ['PURPOSES_AND_NOTICES', 'CONSENT_DECISIONS']);
  check('and everything left out is named as not selected',
    chosen.omitted.filter(o => o.reason === 'NOT_SELECTED').length, S.ReportSectionKind.options.length - 2);
  check('the title and scope are carried so a report cannot be mistaken for another',
    [chosen.title, chosen.scope_label.length > 0], ['Board pack', true]);
  check('an unknown section is refused rather than ignored',
    (await owner.call('/api/v1/admin/reports?sections=EVERYTHING')).status, 400);
  check('a repeated section is refused rather than printed twice',
    (await owner.call('/api/v1/admin/reports?sections=CONSENT_DECISIONS,CONSENT_DECISIONS')).status, 400);

  // --- the export is itself audited -------------------------------------------------
  phase = 'audited';
  const audited = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.audit_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND operation='report'`, scope)).rows[0].n);
  check('generating a report is recorded in the audit trail, as §133 requires', audited > 0, true);

  // --- minimisation -------------------------------------------------------------------
  phase = 'minimisation';
  const body = JSON.stringify(all);
  check('the report does not print the identifier of any data principal',
    body.includes(h.users.alice!.principal_id!), false);
  check('nor a staff email address', body.includes(h.users.owner!.email), false);
  check('and it carries no field beyond the ones the schema declares',
    Object.keys(all).sort(),
    ['content_digest', 'every_section_left_out_is_named', 'generated_at', 'limits', 'omitted', 'period_from',
      'period_to', 'profile', 'scope_label', 'sections', 'this_report_is_not_a_compliance_certificate', 'title']);

  // --- authority ----------------------------------------------------------------------
  phase = 'authority';
  const member = await h.login('member');
  check('a member without export authority cannot generate a report',
    (await member.call('/api/v1/admin/reports')).status, 403);

  writeEvidence('reports-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('reports-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error({ ...safeError(error), phase,
    message: error instanceof Error && /^Report answered \d{3}$/.test(error.message) ? error.message : undefined,
    schema_issues: error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)
      ? error.issues.map((issue: { code?: string; path?: PropertyKey[] }) => ({ code: issue.code, path: issue.path?.map(String) })) : undefined,
    sites: error instanceof Error ? error.stack?.split('\n').slice(1, 5) : [] });
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
