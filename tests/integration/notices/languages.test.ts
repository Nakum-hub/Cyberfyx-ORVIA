// M12 Notice Management integration suite, FR-M12-03 and FR-M12-04.
// Under test: a principal's language choice is recorded and never erased by
// English-first administration, a notice change is classified before it can be
// published past existing consent, and the affected grant count is measured.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/rehearsal permitted');
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
const key = () => ({ 'idempotency-key': randomUUID() });
const fieldCodes = async (response: Response) =>
  ((await response.json()) as { error: { field_errors?: { code: string }[] } }).error.field_errors?.map(e => e.code) ?? [];
async function body<T>(schema: { parse: (value: unknown) => T }, response: Response, expected = 201) {
  const value: unknown = await response.json();
  if (response.status !== expected) {
    console.log(`FAIL unexpected ${response.status} where ${expected} was required:`, JSON.stringify(value).slice(0, 400));
    throw new Error('Unexpected response status');
  }
  return schema.parse(value);
}
const direct = (sql: string, values: unknown[] = []) =>
  db.query(sql, values).then(() => 'ACCEPTED').catch(() => 'REJECTED');

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;
  const alice = await h.login('alice');
  const scope = [scenario.scope.tenant_id, scenario.scope.legal_entity_id, scenario.scope.environment_id];
  const purpose = scenario.purpose.id;

  // --- FR-M12-04: the principal's choice --------------------------------------
  phase = 'language choice';
  const setLanguage = (preferred_language: string, as = alice) =>
    as.call('/api/v1/portal/me/language', { preferred_language }, key());
  check('a language the Act does not permit for a notice is refused',
    [(await setLanguage('fr')).status, (await setLanguage('de')).status], [400, 400]);
  check('an Eighth Schedule language is recorded as the principal’s own choice',
    (await body(S.LanguageChoice, await setLanguage('ta'), 200)).preferred_language, 'ta');
  check('staff cannot set a principal’s language choice',
    (await staff.call('/api/v1/portal/me/language', { preferred_language: 'hi' }, key())).status, 403);

  phase = 'availability';
  const availability = (language?: string) =>
    staff.call(`/api/v1/admin/purposes/${purpose}/notice-languages${language ? `?language=${language}` : ''}`);
  const english = await body(S.NoticeAvailability, await availability('en'), 200);
  check('the purpose has a published English notice, which is what the scenario made',
    [english.available_in_requested_language, english.served_language, english.published_languages], [true, 'en', ['en']]);
  const tamil = await body(S.NoticeAvailability, await availability('ta'), 200);
  // The requirement, stated as one assertion: English is served, and the request
  // is reported as unmet rather than quietly satisfied.
  check('a language with no notice is served English and reported as unmet, not as met',
    [tamil.requested_language, tamil.served_language, tamil.available_in_requested_language], ['ta', 'en', false]);

  phase = 'the portal does not erase the choice';
  // Paged, because this database has accumulated purposes from every previous
  // run and the one this suite made is not necessarily on the first page.
  const ownChoice = async () => {
    let cursor: string | null = null;
    do {
      const page = S.schemas.ConsentList.parse(await (await alice.call(`/api/v1/portal/me/consents?limit=100${cursor ? `&cursor=${cursor}` : ''}`)).json());
      const found = page.items.find(item => item.purpose_id === purpose);
      if (found) return found;
      cursor = page.next_cursor;
    } while (cursor);
    throw new Error('The scenario purpose is not visible in the portal');
  };
  const mine = await ownChoice();
  check('the portal carries the language asked for and the language served as two facts',
    [mine.language.requested_language, mine.language.served_language, mine.language.available_in_requested_language],
    ['ta', 'en', false]);
  check('the notice the principal is shown is the one that exists, and says which language it is in',
    mine.notice?.language, 'en');

  // --- a notice in another language, and the choice being met -----------------
  phase = 'a second language';
  const hindi = S.Notice.parse(await (await staff.call('/api/v1/admin/notices',
    { purpose_id: purpose, language: 'hi', title: 'वैकल्पिक विपणन सूचना',
      content: 'यह एक सिंथेटिक सूचना है। इसे कभी भी इस पोर्टल में वापस लिया जा सकता है।',
      data_categories: ['CONTACT_DETAILS', 'MARKETING_PREFERENCES'],
      contact: { rights_channel: 'इस पोर्टल में कभी भी सहमति वापस लें या अपने अधिकारों का प्रयोग करें।',
        grievance_channel: 'इस पोर्टल के माध्यम से सिंथेटिक गोपनीयता टीम के पास शिकायत दर्ज करें।',
        board_complaint_channel: 'डेटा संरक्षण बोर्ड द्वारा प्रकाशित माध्यम से शिकायत करें।' } }, key())).json());
  check('a draft translation is not yet an available notice',
    (await body(S.NoticeAvailability, await availability('hi'), 200)).published_languages, ['en']);
  // Publishing a notice happens through its policy, so the availability report
  // cannot be moved by anything short of a real publication.
  check('the database refuses a notice in a language the Act does not permit',
    await direct(`INSERT INTO app.notice_versions(tenant_id,legal_entity_id,environment_id,id,version_id,purpose_id,document,published_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,now())`,
    [...scope, randomUUID(), randomUUID(), purpose, JSON.stringify({ language: 'fr', title: 'x', content: 'y' })]), 'REJECTED');

  // --- FR-M12-03: classifying a change ----------------------------------------
  phase = 'classification';
  const classify = (noticeId: string, input: Record<string, unknown>) =>
    staff.call(`/api/v1/admin/notices/${noticeId}/revisions`, input, key());
  const editorial = {
    version_id: hindi.version_id, change_kind: 'EDITORIAL', translates_version_id: null,
    consent_decision: null, note: 'Corrected a typographical error in the contact line.',
  };
  check('an editorial change cannot carry a decision about consent, because nothing material changed',
    (await classify(hindi.id, { ...editorial, consent_decision: 'REQUIRE_FRESH_CONSENT' })).status, 400);
  check('a material change to scope cannot be recorded without deciding what happens to existing grants',
    (await classify(hindi.id, { ...editorial, change_kind: 'MATERIAL_SCOPE_CHANGE' })).status, 400);
  check('a translation must name the version it translates',
    (await classify(hindi.id, { ...editorial, change_kind: 'TRANSLATION' })).status, 400);
  check('a translation into the language it came from is refused',
    await fieldCodes(await classify(hindi.id, { ...editorial, change_kind: 'TRANSLATION', translates_version_id: hindi.version_id })),
    ['translation_shares_the_source_language']);

  phase = 'counted, not asserted';
  const granted = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.consent_aggregates WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND purpose_id=$4 AND state='GRANTED'`, [...scope, purpose])).rows[0].n);
  const recorded = await body(S.NoticeRevision, await classify(hindi.id, {
    version_id: hindi.version_id, change_kind: 'TRANSLATION', translates_version_id: scenario.notice.version_id,
    consent_decision: null, note: 'Hindi translation of the published English notice.',
  }));
  check('the revision counted the grants actually standing, and says the figure was measured',
    [recorded.affected_grants, recorded.affected_grants_were_counted, recorded.change_kind],
    [granted, true, 'TRANSLATION']);
  check('a version is classified once; a second attempt is a conflict, not an overwrite',
    await fieldCodes(await classify(hindi.id, { ...editorial })), ['version_already_classified']);
  check('a recorded decision is never edited or withdrawn',
    [await direct(`UPDATE app.notice_revisions SET affected_grants=0 WHERE id=$1`, [recorded.id]),
      await direct('DELETE FROM app.notice_revisions WHERE id=$1', [recorded.id])],
    ['REJECTED', 'REJECTED']);
  check('the database refuses a scope change that decided nothing, independently of the application',
    await direct(`INSERT INTO app.notice_revisions(tenant_id,legal_entity_id,environment_id,id,notice_id,version_id,change_kind,translates_version_id,consent_decision,note,affected_grants,counted_at,recorded_by)
      VALUES($1,$2,$3,$4,$5,$6,'MATERIAL_SCOPE_CHANGE',NULL,NULL,'Forged.',0,now(),$7)`,
    [...scope, randomUUID(), hindi.id, hindi.version_id, scenario.scope.legal_entity_id]), 'REJECTED');

  phase = 'history';
  const listed = S.schemas.NoticeRevisionList.parse(await (await staff.call(`/api/v1/admin/notices/${hindi.id}/revisions`)).json());
  check('the classification is readable against the notice it belongs to',
    [listed.items.length, listed.items[0]?.id], [1, recorded.id]);

  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read classifications but may not record one',
    [(await auditor.call(`/api/v1/admin/notices/${hindi.id}/revisions`)).status,
      (await auditor.call(`/api/v1/admin/notices/${hindi.id}/revisions`, editorial, key())).status],
    [200, 403]);

  // Left as the principal found it, so the suite is re-runnable and the next run
  // starts from the same English-only default rather than an inherited choice.
  await setLanguage('en');

  writeEvidence('notice-language-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('notice-language-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
