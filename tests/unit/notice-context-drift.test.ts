// NoticeContextDrift: the CI guard over the Eighth Schedule language drift rules (Act s5(3); Rule 3; migration 0078).
// The publish refusal itself runs against the database (tests/integration/operations/notice-language-drift.test.ts); this
// guard runs on every push, without a database, and fails the build when the rules that decide whether a language version
// is out of step regress. It also proves it would notice: each deliberately broken rule below must fail the same checks.
// Legal equivalence of wording across languages is not checked here or anywhere in ORVIA: it is a reviewed human
// attestation. ORVIA compares the purposes and data categories each version lists, which is what a person consents on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compareLocales } from '../../backend/domain/src/registry/notice-drift.ts';

type V = Parameters<typeof compareLocales>[0][number];
const at = (day: number) => new Date(Date.UTC(2026, 8, day));
const v = (id: string, locale: string, day: number, extra: Partial<V> = {}): V => ({ id, locale, version: 1, published_at: at(day), effective_from: at(day), translates_version_id: null,
  purpose_version_ids: ['marketing', 'orders'], data_category_ids: ['email', 'name'], source_status: null, ...extra });
const states = (r: ReturnType<typeof compareLocales>) => Object.fromEntries(r.locales.map(l => [l.locale, l.state]));

/** Every scenario the guard must decide correctly. Each returns null when the rule holds, or what went wrong. */
const scenarios: [string, (compare: typeof compareLocales) => string | null][] = [
  ['the latest original is the reference, not a newer translation', compare => {
    const r = compare([v('en1', 'en', 1), v('hi1', 'hi', 5, { translates_version_id: 'en1', source_status: 'PUBLISHED' })]);
    return r.reference?.id === 'en1' ? null : `reference was ${r.reference?.id}`;
  }],
  ['an original in an Eighth Schedule language can be the reference (English is not assumed)', compare => {
    const r = compare([v('ta1', 'ta', 9), v('en1', 'en', 2)]);
    return r.reference?.id === 'ta1' && states(r).en === 'MAY_BE_BEHIND' ? null : JSON.stringify([r.reference?.id, states(r)]);
  }],
  ['a language listing different purposes is a scope mismatch, naming what is missing', compare => {
    const r = compare([v('en2', 'en', 9, { purpose_version_ids: ['marketing', 'orders', 'profiling'] }), v('hi1', 'hi', 3)]);
    const hi = r.locales.find(l => l.locale === 'hi');
    return hi?.state === 'SCOPE_MISMATCH' && hi.missing_purpose_version_ids.join() === 'profiling' ? null : JSON.stringify(hi);
  }],
  ['a language listing different data categories is a scope mismatch', compare => {
    const r = compare([v('en2', 'en', 9, { data_category_ids: ['email'] }), v('bn1', 'bn', 3)]);
    const bn = r.locales.find(l => l.locale === 'bn');
    return bn?.state === 'SCOPE_MISMATCH' && bn.extra_data_category_ids.join() === 'name' ? null : JSON.stringify(bn);
  }],
  ['a translation whose source was replaced is behind its source even with the same scope', compare => {
    const r = compare([v('en2', 'en', 9), v('mr1', 'mr', 4, { translates_version_id: 'en1', source_status: 'SUPERSEDED' })]);
    return states(r).mr === 'BEHIND_ITS_SOURCE' ? null : states(r).mr ?? 'missing';
  }],
  ['a translation of the current source with the same scope is in step', compare => {
    const r = compare([v('en2', 'en', 9), v('gu2', 'gu', 10, { translates_version_id: 'en2', source_status: 'PUBLISHED' })]);
    return states(r).gu === 'IN_STEP' ? null : states(r).gu ?? 'missing';
  }],
  ['an older original with the same scope may be behind and asks for a wording check', compare => {
    const r = compare([v('en2', 'en', 9), v('kn1', 'kn', 2)]);
    return states(r).kn === 'MAY_BE_BEHIND' ? null : states(r).kn ?? 'missing';
  }],
  ['when every version is a translation, the most recent one is the reference', compare => {
    const r = compare([v('hi1', 'hi', 3, { translates_version_id: 'x' }), v('ta1', 'ta', 6, { translates_version_id: 'x' })]);
    return r.reference?.id === 'ta1' ? null : `reference was ${r.reference?.id}`;
  }],
  ['a notice with no published version has no reference and no drift', compare => {
    const r = compare([]);
    return r.reference === null && r.locales.length === 0 ? null : JSON.stringify(r);
  }],
];

for (const [name, check] of scenarios) test(`NoticeContextDrift: ${name}`, () => assert.equal(check(compareLocales), null));

// Deliberately broken rules. The guard is only worth having if each of these fails at least one scenario above.
const mutants: [string, typeof compareLocales][] = [
  ['the oldest version is taken as the reference', current => {
    const sorted = [...current].sort((a, b) => a.published_at.getTime() - b.published_at.getTime());
    return compareLocales(sorted.length ? [{ ...sorted[0]!, published_at: at(99) }, ...sorted.slice(1)] : sorted);
  }],
  ['translations count as originals', current => compareLocales(current.map(x => ({ ...x, translates_version_id: null })))],
  ['data categories are ignored', current => compareLocales(current.map(x => ({ ...x, data_category_ids: [] })))],
  ['a replaced source is treated as current', current => compareLocales(current.map(x => ({ ...x, source_status: x.source_status === 'SUPERSEDED' ? 'PUBLISHED' : x.source_status })))],
  ['scope differences are ignored', current => compareLocales(current.map(x => ({ ...x, purpose_version_ids: [], data_category_ids: [] })))],
];

for (const [name, broken] of mutants) test(`NoticeContextDrift catches a regression: ${name}`, () => {
  const caught = scenarios.filter(([, check]) => check(broken) !== null).map(([n]) => n);
  assert.ok(caught.length > 0, `no scenario failed when ${name}`);
});
