// M12 Notice Management contract invariants (FR-M12-03, FR-M12-04). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ConsentChoice, LanguageAvailability, NoticeAvailability, NoticeChangeKind, NoticeLanguage, NoticeRevision, NoticeRevisionCreate, ProcessorRole, routes } from '../../packages/contracts/src/index.ts';
import { example, uuid, sampleTime } from '../../packages/contracts/src/examples.ts';

const availability = {
  purpose_id: uuid(800), requested_language: 'ta' as const, served_language: 'en' as const,
  available_in_requested_language: false, published_languages: ['en' as const, 'hi' as const],
  limits: ['This installation has no notice in the language that was asked for.'],
};

test('a notice may be in English or any Eighth Schedule language, and nothing else', () => {
  // Twenty-two Eighth Schedule languages plus English.
  assert.equal(NoticeLanguage.options.length, 23);
  for (const code of ['en', 'hi', 'ta', 'bn', 'ur', 'sat', 'brx', 'kok', 'mni', 'mai', 'doi']) {
    assert.equal(NoticeLanguage.parse(code), code);
  }
  // Languages the Act does not permit for a notice, however common.
  for (const code of ['fr', 'de', 'zh', 'ar', 'es', 'pt']) {
    assert.throws(() => NoticeLanguage.parse(code), new RegExp('.'), `${code} was accepted as a notice language`);
  }
});

test('the language asked for and the language served never collapse into one field', () => {
  const parsed = NoticeAvailability.parse(availability);
  assert.deepEqual([parsed.requested_language, parsed.served_language, parsed.available_in_requested_language], ['ta', 'en', false]);
  // The failure FR-M12-04 exists to prevent: serving English and reporting the
  // request as met. It cannot be expressed.
  assert.throws(() => NoticeAvailability.parse({ ...availability, available_in_requested_language: true }));
  // And the inverse: serving the requested language while reporting it unmet.
  assert.throws(() => NoticeAvailability.parse({ ...availability, served_language: 'ta', available_in_requested_language: false }));
  const met = NoticeAvailability.parse({ ...availability, served_language: 'hi', requested_language: 'hi', available_in_requested_language: true });
  assert.equal(met.available_in_requested_language, true);
});

test('a served language is one a notice actually exists in, and nothing is listed twice', () => {
  // Claiming to have served a language this purpose has no notice in.
  assert.throws(() => NoticeAvailability.parse({ ...availability, served_language: 'ml' }));
  assert.throws(() => NoticeAvailability.parse({ ...availability, published_languages: ['en', 'en'] }));
  // Having no notice at all is a real answer, not an error.
  const none = NoticeAvailability.parse({ ...availability, served_language: null, published_languages: [] });
  assert.deepEqual([none.served_language, none.available_in_requested_language], [null, false]);
});

test('a principal choice travels beside every consent choice in the portal', () => {
  const choice = example('ConsentChoice') as Record<string, unknown>;
  const parsed = ConsentChoice.parse(choice);
  assert.ok(parsed.language, 'a consent choice carries no language facts');
  // There is no single language field that could stand for both, which is the
  // shape that would erase the principal's choice.
  assert.throws(() => ConsentChoice.parse({ ...choice, language: undefined }));
  const { requested_language, served_language, available_in_requested_language } = parsed.language;
  assert.equal(available_in_requested_language, served_language === requested_language);
  assert.throws(() => LanguageAvailability.parse({ requested_language: 'ta', served_language: 'en', available_in_requested_language: true, published_languages: ['en'] }));
});

test('a notice change is classified, and the classification decides what consent needs', () => {
  assert.deepEqual([...NoticeChangeKind.options], ['EDITORIAL', 'TRANSLATION', 'MATERIAL_SCOPE_CHANGE']);
  const editorial = { version_id: uuid(801), change_kind: 'EDITORIAL' as const, translates_version_id: null, consent_decision: null, note: 'Corrected a spelling in the contact line.' };
  assert.equal(NoticeRevisionCreate.parse(editorial).change_kind, 'EDITORIAL');
  // An editorial fix cannot carry a consent decision: nothing material changed,
  // so there is nothing to re-consent to.
  assert.throws(() => NoticeRevisionCreate.parse({ ...editorial, consent_decision: 'REQUIRE_FRESH_CONSENT' }));
  // A material change to scope cannot be recorded without deciding.
  assert.throws(() => NoticeRevisionCreate.parse({ ...editorial, change_kind: 'MATERIAL_SCOPE_CHANGE' }));
  const material = NoticeRevisionCreate.parse({ ...editorial, change_kind: 'MATERIAL_SCOPE_CHANGE', consent_decision: 'REQUIRE_FRESH_CONSENT' });
  assert.equal(material.consent_decision, 'REQUIRE_FRESH_CONSENT');
});

test('a translation names the version it came from, and only a translation does', () => {
  const base = { version_id: uuid(801), change_kind: 'TRANSLATION' as const, translates_version_id: uuid(802), consent_decision: null, note: 'Tamil translation of the published English notice.' };
  assert.equal(NoticeRevisionCreate.parse(base).translates_version_id, uuid(802));
  // A translation of nothing cannot be told apart from fresh text later.
  assert.throws(() => NoticeRevisionCreate.parse({ ...base, translates_version_id: null }));
  // And an editorial change does not get to claim it translates something.
  assert.throws(() => NoticeRevisionCreate.parse({ ...base, change_kind: 'EDITORIAL' }));
});

test('the affected grant count is measured, and cannot be asserted instead', () => {
  const recorded = {
    id: uuid(803), notice_id: uuid(804), version_id: uuid(801), change_kind: 'MATERIAL_SCOPE_CHANGE' as const,
    translates_version_id: null, consent_decision: 'REQUIRE_FRESH_CONSENT' as const,
    note: 'The purpose now covers a further recipient class.', affected_grants: 12,
    counted_at: sampleTime, recorded_at: sampleTime, recorded_by: uuid(805),
    affected_grants_were_counted: true as const, limits: ['Counted from the consent records when the decision was taken.'],
  };
  assert.equal(NoticeRevision.parse(recorded).affected_grants, 12);
  assert.throws(() => NoticeRevision.parse({ ...recorded, affected_grants_were_counted: false }));
  // A count with no moment attached could be from any time, which makes it
  // useless for showing what was at stake when the decision was taken.
  assert.throws(() => NoticeRevision.parse({ ...recorded, counted_at: undefined }));
  for (const smuggled of [{ estimated: true }, { approximate_grants: 12 }, { affected_grants_estimate: 12 }]) {
    assert.throws(() => NoticeRevision.parse({ ...recorded, ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a revision`);
  }
});

test('processor roles are the Act’s own, not another regime’s', () => {
  // The DPDP Act has Data Fiduciaries and Data Processors. It has no
  // "controller", so neither does this contract.
  assert.deepEqual([...ProcessorRole.options], ['PROCESSOR', 'SUB_PROCESSOR', 'JOINT_FIDUCIARY', 'INDEPENDENT_FIDUCIARY']);
  for (const borrowed of ['JOINT_CONTROLLER', 'INDEPENDENT_CONTROLLER', 'CONTROLLER', 'DATA_SUBJECT']) {
    assert.throws(() => ProcessorRole.parse(borrowed), new RegExp('.'), `${borrowed} was accepted as a processor role`);
  }
});

test('recording a language choice is the principal’s own act', () => {
  const language = routes.filter(route => /language/.test(route.id));
  const set = language.find(route => route.id === 'set_language')!;
  assert.equal(set.authority, 'PRINCIPAL');
  assert.equal(set.capability, 'consent.own.write');
  // Staff may read which languages exist; they do not set anybody's choice.
  const staff = language.filter(route => route.authority === 'STAFF');
  assert.deepEqual(staff.map(route => route.method), ['get']);
});
