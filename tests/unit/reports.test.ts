// Reporting invariants (§133). Docker-free.
//
// A report is the one artefact in this product that leaves the building. It is
// handed to a board, an auditor or a regulator by somebody who did not assemble
// it and cannot see what was left out. Everything asserted here protects that
// reader rather than the person generating it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Report, ReportQuery, ReportSection, ReportSectionKind, routes, schemas } from '../../shared/contracts/src/index.ts';
import { example, sampleTime } from '../../shared/contracts/src/examples.ts';
import { requireCompleteSection } from '../../backend/domain/src/reporting/reports.ts';
import { toCsv } from '../../frontend/src/components/screens/governance/reports.tsx';

test('bounded reports refuse a section whose final row cannot be shown', () => {
  assert.equal(requireCompleteSection(Array(500).fill('row')).length, 500);
  assert.throws(() => requireCompleteSection(Array(501).fill('row')), /EPOCH_CONFLICT/);
});

test('CSV escapes formulas even when a spreadsheet reads quoted cells as expressions', () => {
  const csv = toCsv(['Name', 'Note'], [
    ['=HYPERLINK("https://example.invalid")', 'plain, text'],
    ['  +SUM(1,2)', '\t@command'],
    ['-1', 'normal'],
    ['＝1+2', '\0hidden'],
  ]);
  assert.equal(csv, [
    '"Name","Note"',
    '"\'=HYPERLINK(""https://example.invalid"")","plain, text"',
    '"\'  +SUM(1,2)","\'\t@command"',
    '"\'-1","normal"',
    '"\'＝1+2","\'\0hidden"',
  ].join('\r\n'));
});

const report = () => structuredClone(example('Report')) as Record<string, unknown>;
const sections = () => report().sections as Record<string, unknown>[];
const omitted = () => report().omitted as Record<string, unknown>[];

test('every section this product can produce is either included or named as omitted', () => {
  const parsed = Report.parse(report());
  const accounted = [...parsed.sections.map(s => s.kind), ...parsed.omitted.map(o => o.kind)];
  assert.deepEqual(accounted.slice().sort(), [...ReportSectionKind.options].sort());
  // This is the invariant that stops a report presenting a flattering subset in
  // silence. Dropping a section from both lists is refused.
  assert.throws(() => Report.parse({ ...report(), omitted: omitted().slice(1) }));
  // And a section cannot be both shown and disclosed as missing.
  assert.throws(() => Report.parse({
    ...report(), omitted: [...omitted(), { kind: sections()[0]!.kind, reason: 'NOT_SELECTED' }],
  }));
  assert.equal(parsed.every_section_left_out_is_named, true);
  assert.throws(() => Report.parse({ ...report(), every_section_left_out_is_named: false }));
});

test('a section withheld for authority is disclosed, not silently dropped', () => {
  const parsed = Report.parse(report());
  const withheld = parsed.omitted.filter(o => o.reason === 'WITHHELD_FOR_AUTHORITY');
  assert.deepEqual(withheld.map(o => o.kind), ['AUDIT_TRAIL']);
  // The distinction matters to the reader: "nobody chose this" and "the person
  // who made this could not see it" are different facts about the same gap.
  assert.ok(parsed.omitted.some(o => o.reason === 'NOT_SELECTED'));
  assert.throws(() => Report.parse({
    ...report(), omitted: omitted().map(o => ({ ...o, reason: 'BECAUSE' })),
  }));
});

test('a section carries its own caveats, so it cannot be lifted away from them', () => {
  for (const section of Report.parse(report()).sections) {
    assert.ok(section.covers.length > 20, `${section.kind} does not say what it covers`);
    assert.ok(section.counted.length > 10, `${section.kind} does not say what it counted`);
  }
  // A custom report is a selection of these same sections, so caveats travelling
  // with the section is what stops a curated report shedding them.
  const consent = sections().find(s => s.kind === 'CONSENT_DECISIONS')!;
  assert.ok((ReportSection.parse(consent).limits).length > 0);
});

test('a table cannot disagree with its own column headings', () => {
  const section = sections()[0]!;
  assert.equal(ReportSection.parse(section).rows[0]!.length, ReportSection.parse(section).columns.length);
  // A row with the wrong number of cells silently shifts every value one column
  // to the left when printed, which is how a report starts saying something else.
  assert.throws(() => ReportSection.parse({ ...section, rows: [['only one cell']] }));
  assert.throws(() => ReportSection.parse({ ...section, columns: [] }));
});

test('a report never states a conclusion about the law', () => {
  const parsed = Report.parse(report());
  assert.equal(parsed.this_report_is_not_a_compliance_certificate, true);
  assert.throws(() => Report.parse({ ...report(), this_report_is_not_a_compliance_certificate: false }));
  // There is no field through which a report could grade, score or certify.
  for (const smuggled of [
    { compliant: true }, { score: 87 }, { grade: 'A' }, { certified: true },
    { risk_rating: 'LOW' }, { overall: 'PASS' },
  ]) {
    assert.throws(() => Report.parse({ ...report(), ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto a report`);
  }
});

test('a report says what it is about, over what period, and can be compared', () => {
  const parsed = Report.parse(report());
  assert.ok(parsed.scope_label.length > 0, 'a report that does not name its scope could be about anything');
  assert.match(parsed.content_digest, /^[a-f0-9]{64}$/);
  // A period that ends before it starts would silently produce an empty report.
  assert.throws(() => Report.parse({ ...report(), period_from: sampleTime, period_to: '2020-01-01T00:00:00.000Z' }));
  // Both halves are optional: everything on record is a legitimate period.
  assert.equal(Report.parse({ ...report(), period_from: null, period_to: null }).period_from, null);
});

test('the report request is a read, and asks for nothing free-form', () => {
  const route = routes.find(r => r.id === 'report')!;
  assert.deepEqual([route.method, route.authority, route.capability], ['get', 'STAFF', 'evidence.export']);
  assert.ok(schemas[route.response]);
  assert.equal(route.query, 'ReportQuery');
  // Only the declared keys reach the server, so there is no predicate, template
  // or free text a caller could push into a report.
  assert.deepEqual(Object.keys(ReportQuery.shape).sort(), ['from', 'sections', 'title', 'to']);
  assert.throws(() => ReportQuery.parse({ template: '<script>' }));
  assert.throws(() => ReportQuery.parse({ where: "1=1" }));
  assert.throws(() => ReportQuery.parse({ from: 'last quarter' }));
  // Generating a report is a read; nothing about it writes.
  assert.ok(!routes.some(r => /report/.test(r.id) && r.method !== 'get'));
});
