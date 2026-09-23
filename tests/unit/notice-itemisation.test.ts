// DPDP Rules 3 and 9: itemised notice content and appropriate contact
// information (FR-M12). Docker-free.
//
// The master lists what the notice system must support, and "Data categories"
// is on that list; the source mapping adds "Rules 3, 9 — Itemised notice
// content and appropriate contact information." A notice that describes its
// scope only in prose satisfies neither, and nothing downstream can check it.
//
// None of this judges whether a notice is legally adequate. It makes the items
// the Act names into separate recorded facts so somebody who can judge that has
// something to look at.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DataCategoryCode, Notice, NoticeContact, NoticeCreate } from '../../shared/contracts/src/index.ts';
import { example, uuid, sampleTime } from '../../shared/contracts/src/examples.ts';

const create = () => structuredClone(example('NoticeCreate')) as Record<string, unknown>;
const notice = () => structuredClone(example('Notice')) as Record<string, unknown>;
const contact = () => structuredClone(example('NoticeContact')) as Record<string, unknown>;

test('a new notice must itemise the personal data it covers', () => {
  const parsed = NoticeCreate.parse(create());
  assert.deepEqual(parsed.data_categories, ['CONTACT_DETAILS', 'MARKETING_PREFERENCES']);
  // Itemised from the same closed vocabulary the inventory uses, so what a
  // notice claims and what the inventory records are comparable rather than two
  // independent descriptions in prose.
  for (const code of parsed.data_categories) assert.ok(DataCategoryCode.options.includes(code));
  // A notice that itemises nothing is not itemised, and prose is not an item.
  assert.throws(() => NoticeCreate.parse({ ...create(), data_categories: [] }));
  assert.throws(() => NoticeCreate.parse({ ...create(), data_categories: ['everything we hold'] }));
  // Nor can the same item be listed twice to look thorough.
  assert.throws(() => NoticeCreate.parse({ ...create(), data_categories: ['CONTACT_DETAILS', 'CONTACT_DETAILS'] }));
});

test('a notice carries the three channels the Act names, not one contact string', () => {
  // §5(1)(b) is how a person exercises their rights, including withdrawal;
  // §5(1)(c) is how they complain to the Board. They routinely have different
  // destinations, and a single "contact us" field would hide an omitted one.
  const parsed = NoticeContact.parse(contact());
  assert.deepEqual(Object.keys(parsed).sort(), ['board_complaint_channel', 'grievance_channel', 'rights_channel']);
  for (const value of Object.values(parsed)) assert.ok(value.length >= 10);
  for (const field of ['rights_channel', 'grievance_channel', 'board_complaint_channel']) {
    assert.throws(() => NoticeContact.parse({ ...contact(), [field]: '' }), new RegExp('.'), `${field} could be left empty`);
    assert.throws(() => NoticeContact.parse({ ...contact(), [field]: 'email us' }), new RegExp('.'), `${field} accepted a non-answer`);
  }
  // And a notice cannot be created without them at all.
  const withoutContact = create();
  delete withoutContact.contact;
  assert.throws(() => NoticeCreate.parse(withoutContact));
});

test('a notice published before itemisation was required says so rather than inventing items', () => {
  // 324 notices already existed when Rules 3 and 9 were represented here. Their
  // items were never recorded, and back-filling them would be inventing the
  // content of a notice somebody has already been shown and consented to.
  const legacy = { ...notice(), data_categories: null, contact: null, itemisation_was_not_recorded: true };
  const parsed = Notice.parse(legacy);
  assert.deepEqual([parsed.data_categories, parsed.contact, parsed.itemisation_was_not_recorded], [null, null, true]);
  // The flag and the absence are one fact and cannot disagree, so a notice that
  // itemises nothing is never read as one that itemises an empty list.
  assert.throws(() => Notice.parse({ ...legacy, itemisation_was_not_recorded: false }));
  assert.throws(() => Notice.parse({ ...notice(), itemisation_was_not_recorded: true }));
  // Items and contact information were introduced together and are recorded
  // together: half a notice is not a lesser notice, it is an incoherent one.
  assert.throws(() => Notice.parse({ ...legacy, data_categories: ['CONTACT_DETAILS'] }));
  assert.throws(() => Notice.parse({ ...notice(), contact: null }));
});

test('an itemised notice is the normal case and carries everything §5(1) names', () => {
  const parsed = Notice.parse(notice());
  assert.equal(parsed.itemisation_was_not_recorded, false);
  assert.ok(parsed.data_categories!.length >= 1, 'an itemised notice itemises something');
  assert.ok(parsed.contact!.board_complaint_channel.length >= 10, 'no route to the Board is stated');
  // (a) what is collected and why: the items plus the purpose the notice is for.
  assert.ok(parsed.purpose_id);
  // There is no field in which the notice could claim to be legally adequate.
  for (const smuggled of [
    { compliant: true }, { lawful: true }, { approved_by_regulator: true }, { dpdpa_certified: true },
  ]) {
    assert.throws(() => Notice.parse({ ...notice(), ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto a notice`);
  }
});

test('the notice stays a versioned, digested record whatever it now carries', () => {
  // Itemisation is part of the notice, so it is inside the digest and inside the
  // version. A notice whose items could change without a new version would let
  // the scope somebody consented to be edited after the fact.
  const parsed = Notice.parse(notice());
  assert.match(parsed.content_digest, /^[a-f0-9]{64}$/);
  assert.ok(parsed.version_id && parsed.id);
  assert.notEqual(parsed.version_id, parsed.id);
  assert.equal(Notice.parse({ ...notice(), published_at: null }).published_at, null);
  assert.throws(() => Notice.parse({ ...notice(), published_at: sampleTime.replace('Z', '') }));
  assert.throws(() => Notice.parse({ ...notice(), version_id: 'not-a-uuid' }));
  assert.ok(uuid(1).length === 36);
});
