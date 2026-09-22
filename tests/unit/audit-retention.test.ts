// M33 purpose-based audit retention invariants (FR-M33-04). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditCategory, AuditRetentionLine, AuditRetentionPurpose, AuditRetentionReport,
  AuditRetentionRuleCreate, routes, schemas,
} from '../../packages/contracts/src/index.ts';
import { example, sampleTime } from '../../packages/contracts/src/examples.ts';

const report = () => structuredClone(example('AuditRetentionReport')) as Record<string, unknown>;
const lines = () => report().lines as Record<string, unknown>[];
const configured = () => lines()[0];
const unconfigured = () => lines()[1];

test('every audited category is retained for exactly one stated purpose', () => {
  const parsed = AuditRetentionReport.parse(report());
  assert.equal(parsed.lines.length, 4);
  const covered = parsed.lines.flatMap(l => l.categories);
  // No category is retained for two reasons, and none is retained for none.
  // A category nobody claimed would be kept without anyone having said why.
  assert.deepEqual(covered.slice().sort(), [...AuditCategory.options].sort());
  assert.deepEqual(parsed.lines.map(l => l.purpose).sort(), [...AuditRetentionPurpose.options].sort());
  // Reporting a purpose twice, or dropping a category, is refused.
  assert.throws(() => AuditRetentionReport.parse({ ...report(), lines: [configured(), configured(), configured(), configured()] }));
  assert.throws(() => AuditRetentionReport.parse({
    ...report(), lines: [{ ...configured(), categories: ['ROLE_GRANTS', 'OWNER_CHANGES'] }, ...lines().slice(1)],
  }));
});

test('a purpose with no configured period says so, and is never read as unlimited', () => {
  const parsed = AuditRetentionReport.parse(report());
  const none = parsed.lines.find(l => l.purpose === 'REGULATORY_ACCOUNTABILITY')!;
  assert.deepEqual([none.rule, none.period_is_not_configured_here, none.beyond_period], [null, true, 0]);
  // The flag and the rule are the same fact and cannot disagree, so a build
  // cannot ship a silent default while still reporting "not configured".
  assert.throws(() => AuditRetentionLine.parse({ ...unconfigured(), period_is_not_configured_here: false }));
  assert.throws(() => AuditRetentionLine.parse({ ...configured(), period_is_not_configured_here: true }));
  // And nothing can be overdue against a period that was never set. Counting
  // events as overdue with no rule would manufacture pressure to delete.
  assert.throws(() => AuditRetentionLine.parse({ ...unconfigured(), beyond_period: 5 }));
});

test('a recorded period must say what it rests on', () => {
  const base = { purpose: 'SECURITY_INVESTIGATION' as const, days: 365,
    source_reference: 'Reviewed internal security incident investigation window.' };
  assert.equal(AuditRetentionRuleCreate.parse(base).days, 365);
  // OPEN-10 forbids universal statutory retention numbers, so there is no
  // default and no way to record a period without naming its basis.
  assert.throws(() => AuditRetentionRuleCreate.parse({ ...base, source_reference: '' }));
  assert.throws(() => AuditRetentionRuleCreate.parse({ ...base, source_reference: 'because' }));
  assert.throws(() => AuditRetentionRuleCreate.parse({ purpose: base.purpose, days: 365 }));
  // A period is bounded on both sides: zero days is not a retention policy, and
  // ten years is the outer edge of what this field will carry.
  assert.throws(() => AuditRetentionRuleCreate.parse({ ...base, days: 0 }));
  assert.throws(() => AuditRetentionRuleCreate.parse({ ...base, days: 3651 }));
  // There is no field through which a rule could authorise a deletion.
  for (const smuggled of [{ delete_after: true }, { purge: true }, { auto_delete: true }, { action: 'DELETE' }]) {
    assert.throws(() => AuditRetentionRuleCreate.parse({ ...base, ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto a retention rule`);
  }
});

test('the absence of a payload is measured, not promised', () => {
  const parsed = AuditRetentionReport.parse(report());
  assert.equal(parsed.payload_columns_found, 0);
  // The only permitted value is zero. If a payload column is ever added to the
  // audit table, this report stops rendering rather than continuing to describe
  // a trail that now carries content it says it does not.
  for (const found of [1, 2, 12]) {
    assert.throws(() => AuditRetentionReport.parse({ ...report(), payload_columns_found: found }), new RegExp('.'),
      `a report claiming ${found} payload columns was accepted`);
  }
  assert.equal(parsed.payload_is_not_recorded_so_none_can_be_deleted, true);
  assert.throws(() => AuditRetentionReport.parse({ ...report(), payload_is_not_recorded_so_none_can_be_deleted: false }));
});

test('retention is a schedule and never an authority to shorten the trail', () => {
  const parsed = AuditRetentionReport.parse(report());
  assert.equal(parsed.envelopes_are_never_deleted_by_this_product, true);
  assert.throws(() => AuditRetentionReport.parse({ ...report(), envelopes_are_never_deleted_by_this_product: false }));
  // Events past their period are reported, not acted on, and there is no field
  // in which this report could say it removed, purged or expired anything.
  assert.equal(parsed.lines.find(l => l.purpose === 'SECURITY_INVESTIGATION')!.beyond_period, 3);
  for (const smuggled of [{ deleted: 3 }, { purged: 3 }, { expired_and_removed: 3 }, { next_purge_at: sampleTime }]) {
    assert.throws(() => AuditRetentionReport.parse({ ...report(), ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto a retention report`);
  }
  // More records cannot be overdue than are held.
  assert.throws(() => AuditRetentionLine.parse({ ...configured(), beyond_period: 43 }));
  // A purpose holding events has an oldest one, and one holding none does not.
  assert.throws(() => AuditRetentionLine.parse({ ...configured(), events_held: 0, oldest_event_at: sampleTime, beyond_period: 0 }));
  assert.throws(() => AuditRetentionLine.parse({ ...configured(), oldest_event_at: null }));
});

test('an archive the customer holds is outside anything this report describes', () => {
  const parsed = AuditRetentionReport.parse(report());
  assert.equal(parsed.a_declared_snapshot_is_not_reached_by_anything_here, true);
  assert.throws(() => AuditRetentionReport.parse({ ...report(), a_declared_snapshot_is_not_reached_by_anything_here: false }));
  // The count comes from declared snapshots covering the trail, so the reader
  // is told how many copies exist that retention here does not reach.
  assert.equal(parsed.snapshots_covering_evidence, 1);
});

test('reading the schedule and setting it are different authorities', () => {
  const read = routes.find(r => r.id === 'audit_retention')!;
  const set = routes.find(r => r.id === 'set_audit_retention')!;
  assert.deepEqual([read.method, read.authority, read.capability], ['get', 'STAFF', 'audit.read']);
  assert.deepEqual([set.method, set.authority, set.capability], ['post', 'STAFF', 'audit.administer']);
  assert.equal(set.idempotency, true);
  assert.ok(schemas[read.response] && schemas[set.response]);
  // Nothing in this build deletes an audit record, under any route.
  assert.ok(!routes.some(r => /audit/.test(r.id) && /delete|purge|expire|remove/.test(r.id)));
});
