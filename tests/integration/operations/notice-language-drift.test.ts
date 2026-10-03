// Eighth Schedule language drift (Act s5(3); migration 0078; contract 0.52.0) through the HTTP boundary.
// Scenario: an online shop publishes its notice in English, then Tamil (recorded as a translation) and Hindi (written as an
// original). English then adds a purpose (sharing with advertising partners). Under test: the report compares every current
// language on purposes and data categories against the latest original; publishing a scope change while other languages are
// current is refused unless acknowledged and names the languages left behind; Tamil and Hindi then show SCOPE_MISMATCH with the
// missing purpose and Operations attention names the notice; catching Tamil up needs no acknowledgement even though Hindi is
// still behind; an English editorial change (same scope) leaves the Tamil translation BEHIND_ITS_SOURCE; a later translation
// does not make the English original look stale; Hindi catching up clears attention; a translation must translate a published
// version of another language of the same notice (API and database); a read-only role reads the report; another tenant sees none
// of it; languages without a notice are listed for information only.
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('notice-language-drift');
const { h, check, ok, codes, db } = t;

await t.run(async () => {
  const admin = await h.login('admin'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const { category, dataCategory, purpose } = await t.activity({ condition: 'CONSENT', systems: [], categoryName: 'Shop customer' });
  const ads = await ok(admin.call('/api/v1/admin/registry-purposes', { name: unique('Advertising partners'), owner_reference: 'Synthetic owner', description: 'Sharing purchase history with advertising partners (synthetic).',
    effective_from: hoursFromNow(-24 * 30), change_reason: 'New purpose', evidence_reference: null, v1_purpose_id: null }, key()), S.schemas.RegistryPurpose);
  const P1 = purpose.versions[0]!.id; const P2 = ads.versions[0]!.id;
  const channels = { withdrawal: 'Use the withdrawal link in your account (synthetic).', rights: 'Open a request from your account (synthetic).', grievance: 'Write to the grievance officer (synthetic).', board_complaint: 'Complain to the Data Protection Board (synthetic).' };
  const notice = await ok(admin.call('/api/v1/admin/registry-notices', { name: unique('Shop privacy notice'), audience_category_ids: [category.id] }, key()), S.schemas.RegistryNotice);
  const draft = async (locale: string, purposes: string[], translates: string | null = null) => (await ok(admin.call(`/api/v1/admin/registry-notices/${notice.id}/versions`, { locale, title: `Notice (${locale})`,
    content: `Synthetic notice text in ${locale}.`, purpose_version_ids: purposes, data_category_ids: [dataCategory.id], channels, template_reference: null, v1_notice_version_id: null, translates_version_id: translates }, key()), S.schemas.RegistryNotice))
    .versions.filter(v => v.locale === locale).sort((a, b) => b.version - a.version)[0]!;
  let hour = -100;
  const publish = (id: string, acknowledge?: boolean) => admin.call(`/api/v1/admin/registry-notice-versions/${id}/publication`, { effective_from: hoursFromNow(hour += 1), ...acknowledge === undefined ? {} : { acknowledge_locale_drift: acknowledge } }, key());
  const report = async () => (await ok(admin.call('/api/v1/admin/registry-notices/language-drift'), S.schemas.NoticeDriftReport)).notices.find(n => n.notice_id === notice.id)!;
  const stateOf = async () => Object.fromEntries((await report()).locales.map(l => [l.locale, l.state]));
  const attention = async () => (await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention)).items.find(i => i.kind === 'NOTICE_LANGUAGE_DRIFT' && i.entity_id === notice.id);

  t.setPhase('three languages in step');
  const en1 = await draft('en', [P1]);
  await ok(publish(en1.id), S.schemas.RegistryNotice);
  const ta1 = await draft('ta', [P1], en1.id);
  await ok(publish(ta1.id), S.schemas.RegistryNotice);
  const hi1 = await draft('hi', [P1]);
  await ok(publish(hi1.id), S.schemas.RegistryNotice);
  const first = await report();
  check('with one scope everywhere, nothing is out of step; the latest original (Hindi) is the reference', [first.out_of_step, first.reference_locale, await stateOf()], [0, 'hi', { en: 'MAY_BE_BEHIND', ta: 'IN_STEP', hi: 'REFERENCE' }]);
  check('the twenty languages without a notice are listed, for information', [first.languages_without_notice.length, first.languages_without_notice.includes('bn')], [20, true]);
  check('no attention while the languages agree', await attention(), undefined);

  t.setPhase('English adds a purpose');
  const en2 = await draft('en', [P1, P2]);
  const refused = await codes(publish(en2.id));
  check('publishing a new scope while other languages are current is refused and names them', [refused.status, refused.codes], [409, ['other_locales_would_be_out_of_step', 'hi', 'ta']]);
  check('saying no is the same as not saying', (await codes(publish(en2.id, false))).status, 409);
  await ok(publish(en2.id, true), S.schemas.RegistryNotice);
  const after = await report();
  const ta = after.locales.find(l => l.locale === 'ta')!;
  check('Tamil and Hindi now state a different scope from the English reference', [after.reference_locale, after.out_of_step, await stateOf()], ['en', 2, { en: 'REFERENCE', ta: 'SCOPE_MISMATCH', hi: 'SCOPE_MISMATCH' }]);
  check('the report names the purpose Tamil is missing', [ta.missing_purpose_version_ids, ta.extra_purpose_version_ids], [[P2], []]);
  const item = await attention();
  check('Operations attention names the notice and both languages', [item?.count, item?.detail.includes('hi, ta') || item?.detail.includes('ta, hi')], [2, true]);
  const portal = (await db.query(`SELECT locale, purpose_version_ids FROM app.registry_notice_versions WHERE notice_id=$1 AND status='PUBLISHED' ORDER BY locale`, [notice.id])).rows;
  check('what each language currently states is kept as published (what Data Principals see is unchanged by the report)', portal.map(r => [r.locale, r.purpose_version_ids.length]), [['en', 2], ['hi', 1], ['ta', 1]]);

  t.setPhase('catching up');
  const ta2 = await draft('ta', [P1, P2], en2.id);
  await ok(publish(ta2.id), S.schemas.RegistryNotice);
  check('catching Tamil up needs no acknowledgement although Hindi is still behind', await stateOf(), { en: 'REFERENCE', ta: 'IN_STEP', hi: 'SCOPE_MISMATCH' });
  check('attention now counts one language', (await attention())?.count, 1);

  t.setPhase('editorial change in English');
  const en3 = await draft('en', [P1, P2]);
  await ok(publish(en3.id), S.schemas.RegistryNotice);
  check('an English rewording with the same scope needs no acknowledgement and leaves the Tamil translation behind its source', await stateOf(), { en: 'REFERENCE', ta: 'BEHIND_ITS_SOURCE', hi: 'SCOPE_MISMATCH' });
  const ta3 = await draft('ta', [P1, P2], en3.id);
  await ok(publish(ta3.id), S.schemas.RegistryNotice);
  check('a translation published after the original does not make the original look stale', [(await report()).reference_locale, (await stateOf()).en], ['en', 'REFERENCE']);

  t.setPhase('Hindi catches up');
  const hi2 = await draft('hi', [P1, P2]);
  await ok(publish(hi2.id), S.schemas.RegistryNotice);
  const done = await report();
  check('every language states the same scope again and attention clears', [done.out_of_step, await attention()], [0, undefined]);

  t.setPhase('translation basis');
  const draftBody = (translates: string) => ({ locale: 'gu', title: 'Notice (gu)', content: 'Synthetic notice text in gu.', purpose_version_ids: [P1, P2], data_category_ids: [dataCategory.id], channels, template_reference: null, v1_notice_version_id: null, translates_version_id: translates });
  const unpublished = await draft('mr', [P1, P2]);
  check('a translation of a draft is refused', (await codes(admin.call(`/api/v1/admin/registry-notices/${notice.id}/versions`, draftBody(unpublished.id), key()))).codes, ['translate_a_published_version']);
  check('a translation into the same language is refused', (await codes(admin.call(`/api/v1/admin/registry-notices/${notice.id}/versions`, { ...draftBody(en3.id), locale: 'en' }, key()))).codes, ['translation_shares_the_source_locale']);
  const other = await ok(admin.call('/api/v1/admin/registry-notices', { name: unique('Other notice'), audience_category_ids: [category.id] }, key()), S.schemas.RegistryNotice);
  check('a translation of another notice is refused', (await codes(admin.call(`/api/v1/admin/registry-notices/${other.id}/versions`, draftBody(en3.id), key()))).codes, ['translation_source_belongs_to_another_notice']);
  const raw = (await db.query(`SELECT * FROM app.registry_notice_versions WHERE id=$1`, [en3.id])).rows[0];
  const direct = await db.query(`INSERT INTO app.registry_notice_versions(tenant_id,legal_entity_id,environment_id,id,notice_id,version,locale,title,content,content_digest,purpose_version_ids,data_category_ids,channels,status,recorded_by,translates_version_id)
    VALUES($1,$2,$3,gen_random_uuid(),$4,99,'en','x','x',$5,$6,$7,$8,'DRAFT',$9,$10)`, [raw.tenant_id, raw.legal_entity_id, raw.environment_id, notice.id, 'a'.repeat(64), raw.purpose_version_ids, raw.data_category_ids, raw.channels, raw.recorded_by, en3.id]).then(() => 'inserted', (e: Error) => e.message);
  check('the database refuses a translation into its own source language', direct, 'a translation translates another locale of the same notice');

  t.setPhase('access');
  check('a read-only role reads the report', (await auditor.call('/api/v1/admin/registry-notices/language-drift')).status, 200);
  check('another tenant sees none of this notice', (await ok(birch.call('/api/v1/admin/registry-notices/language-drift'), S.schemas.NoticeDriftReport)).notices.some(n => n.notice_id === notice.id), false);
});
