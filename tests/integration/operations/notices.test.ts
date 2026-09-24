// DPDP operations: notice history (quality s4 "Notice history").
// Under test: v1 is published and presented, v2 supersedes it, and the question
// "which notice applied at time T" resolves to the right version; delivery
// evidence is refused where the version was not in effect; published content is
// immutable; and the Privacy Centre shows the current published version.
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('notices');
const { h, check, ok, codes, db } = t;
const channels = { withdrawal: 'Withdraw in the synthetic privacy portal.', rights: 'Exercise rights in the synthetic privacy portal.', grievance: 'Raise a grievance with the synthetic privacy desk.', board_complaint: 'Complain to the Data Protection Board through its published channel.' };

await t.run(async () => {
  await t.ensurePackage();
  const admin = await h.login('admin'); const alice = await h.login('alice');
  const system = await t.boundSystem('Notice system');
  const { category, dataCategory, purpose } = await t.activity({ condition: 'CONSENT', systems: [system.id] });
  const subject = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: system.id, target_reference: `ntc_${Date.now()}`, source_key: null }] }, key()), S.schemas.Subject);
  const notice = await ok(admin.call('/api/v1/admin/registry-notices', { name: unique('Service notice'), audience_category_ids: [category.id] }, key()), S.schemas.RegistryNotice);
  const version = (title: string, content: string) => admin.call(`/api/v1/admin/registry-notices/${notice.id}/versions`, { locale: 'en', title, content, purpose_version_ids: [purpose.versions[0]!.id], data_category_ids: [dataCategory.id], channels, template_reference: null, v1_notice_version_id: null }, key());
  const v1 = (await ok(version('Service notice v1', 'First synthetic notice text.'), S.schemas.RegistryNotice)).versions.at(-1)!;
  check('a new version is a draft until published', [v1.status, v1.effective_from], ['DRAFT', null]);
  check('a draft was never presented, so delivery evidence for it is refused', (await codes(admin.call('/api/v1/admin/notice-delivery-evidence', { notice_version_id: v1.id, subject_id: subject.id, relationship_id: null, population_reference: null, channel: 'EMAIL', presented_at: hoursFromNow(-1), source_system_id: null, source_reference: 'Mail log 1', evidence_reference: null, result: 'DELIVERED' }, key()))).codes, ['draft_was_never_presented']);
  await ok(admin.call(`/api/v1/admin/registry-notice-versions/${v1.id}/publication`, { effective_from: hoursFromNow(-240) }, key()), S.schemas.RegistryNotice);
  const delivery = await ok(admin.call('/api/v1/admin/notice-delivery-evidence', { notice_version_id: v1.id, subject_id: subject.id, relationship_id: null, population_reference: null, channel: 'EMAIL', presented_at: hoursFromNow(-120), source_system_id: system.id, source_reference: 'Mail log entry 44', evidence_reference: 'mail-log:44', result: 'DELIVERED' }, key()), S.schemas.NoticeDelivery);
  check('presentation of v1 is recorded with its source', [delivery.notice_version_id, delivery.source_reference], [v1.id, 'Mail log entry 44']);
  const v2 = (await ok(version('Service notice v2', 'Second synthetic notice text with a changed purpose description.'), S.schemas.RegistryNotice)).versions.at(-1)!;
  check('a successor cannot take effect before the version it supersedes', (await codes(admin.call(`/api/v1/admin/registry-notice-versions/${v2.id}/publication`, { effective_from: hoursFromNow(-300) }, key()))).codes, ['must_follow_the_version_it_supersedes']);
  const after = await ok(admin.call(`/api/v1/admin/registry-notice-versions/${v2.id}/publication`, { effective_from: hoursFromNow(-24) }, key()), S.schemas.RegistryNotice);
  const old = after.versions.find(v => v.id === v1.id)!; const current = after.versions.find(v => v.id === v2.id)!;
  check('publishing v2 supersedes v1 and closes its period at the same instant', [old.status, old.superseded_by, old.effective_to, current.status, current.effective_from], ['SUPERSEDED', v2.id, current.effective_from, 'PUBLISHED', current.effective_from]);
  const at = async (hours: number) => ok(admin.call(`/api/v1/admin/registry-notices/${notice.id}/at?as_of=${encodeURIComponent(hoursFromNow(hours))}&locale=en`), S.schemas.NoticeAt);
  check('the moment of the recorded presentation resolves to v1', (await at(-120)).version?.id, v1.id);
  check('now resolves to v2', (await at(0)).version?.id, v2.id);
  check('before the first version there was no notice, and that is said', [(await at(-400)).version, (await at(-400)).reason.startsWith('No published version')], [null, true]);
  check('another locale with no version resolves to none rather than borrowing English', (await ok(admin.call(`/api/v1/admin/registry-notices/${notice.id}/at?as_of=${encodeURIComponent(hoursFromNow(0))}&locale=hi`), S.schemas.NoticeAt)).version, null);
  check('a presentation of v2 dated before v2 took effect is refused', (await codes(admin.call('/api/v1/admin/notice-delivery-evidence', { notice_version_id: v2.id, subject_id: subject.id, relationship_id: null, population_reference: null, channel: 'EMAIL', presented_at: hoursFromNow(-120), source_system_id: null, source_reference: 'Mail log 45', evidence_reference: null, result: 'DELIVERED' }, key()))).codes, ['version_not_in_effect_at_that_time']);
  check('published notice content cannot be rewritten in place', await db.query(`UPDATE app.registry_notice_versions SET content='Rewritten' WHERE id=$1`, [v1.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED'), 'REJECTED');
  check('delivery evidence is append-only', await db.query(`UPDATE app.notice_delivery_evidence SET result='FAILED' WHERE id=$1`, [delivery.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED'), 'REJECTED');
  const portal = await ok(alice.call('/api/v1/portal/notices?locale=en&limit=100'), S.schemas.PortalNoticeList);
  check('the Privacy Centre shows the current version and not the superseded one', [portal.items.some(n => n.version_id === v2.id), portal.items.some(n => n.version_id === v1.id)], [true, false]);
  check('the Privacy Centre notice carries withdrawal, rights, grievance and Board channels', portal.items.find(n => n.version_id === v2.id)?.channels, channels);
  check('a Data Principal cannot reach the staff notice registry', (await alice.call(`/api/v1/admin/registry-notices/${notice.id}/at?as_of=${encodeURIComponent(hoursFromNow(0))}&locale=en`)).status, 403);
});
