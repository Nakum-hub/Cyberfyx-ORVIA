import { randomUUID } from 'node:crypto';
import * as S from '../../../contracts/src/index.ts';
import { AccessError } from '../../../authz/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M12 Notice Management, FR-M12-03 and FR-M12-04.
 *
 * Act s5 lets a notice be made available in English or any Eighth Schedule
 * language, and the choice of which is the data principal's. This module holds
 * the two things that follow from that.
 *
 * The first is that a language asked for and a language served are never the
 * same field. An installation that has only an English notice can still serve
 * it -- what it cannot do is report that as having met a request for Tamil.
 * "English-first administration must not erase required principal language
 * choices" is the requirement, and erasure here would look exactly like a
 * single `language` field on the response.
 *
 * The second is that a change to a notice is classified by the person making
 * it. An editorial fix or a translation does not change what anybody agreed to.
 * A material change to scope does, so it cannot be recorded without deciding
 * what happens to the grants already given -- and the number of grants at stake
 * is counted from the consent records at that moment, never typed in.
 */

const LIMITS = [
  'The language a principal chose and the language they were shown are separate facts. Where they differ, this installation had no notice in the chosen language.',
  'This product does not translate. A notice in a language is one somebody authored and published in that language.',
  'A language is listed here only when a published notice exists in it. A draft translation is not an available notice.',
];

/**
 * FR-M12-04. Which languages a purpose actually has a published notice in, and
 * whether the one asked for is among them.
 *
 * The fallback rule is stated rather than hidden: English if it exists, because
 * it is the one language the Act always permits; otherwise nothing, which is a
 * real answer and not an error.
 */
export async function noticeAvailability(c: Context, purposeId: string, requested: string) {
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.purpose_versions WHERE ${predicate} AND id=$4`, [...scope, purposeId])).rows);
  const published = (await c.tx.query(
    `SELECT DISTINCT language FROM app.notice_versions WHERE ${predicate} AND purpose_id=$4 AND published_at IS NOT NULL ORDER BY language`,
    [...scope, purposeId])).rows.map(r => r.language as string);
  const served = published.includes(requested) ? requested : published.includes('en') ? 'en' : null;
  return S.NoticeAvailability.parse({
    purpose_id: purposeId, requested_language: requested, served_language: served,
    available_in_requested_language: served === requested,
    published_languages: published, limits: LIMITS,
  });
}

/** The same answer in the shape the portal carries beside each choice. */
export async function languageFor(c: Context, purposeId: string, requested: string) {
  const full = await noticeAvailability(c, purposeId, requested);
  return S.LanguageAvailability.parse({
    requested_language: full.requested_language, served_language: full.served_language,
    available_in_requested_language: full.available_in_requested_language,
    published_languages: full.published_languages,
  });
}

/** Act s5 is the principal's choice, so only the principal may record it. */
export async function setPreferredLanguage(c: Context, input: unknown) {
  const value = S.LanguageChoice.parse(input);
  const row = requireOne((await c.tx.query(
    `UPDATE app.principal_references SET preferred_language=$5 WHERE ${predicate} AND id=$4 RETURNING preferred_language`,
    [...scopeValues(c.actor), c.actor.principal_id, value.preferred_language])).rows);
  await audit(c, 'principal.language_choice', c.actor.principal_id!);
  return S.LanguageChoice.parse({ preferred_language: row.preferred_language });
}

const revision = (row: Record<string, unknown>) => S.NoticeRevision.parse({
  id: row.id, notice_id: row.notice_id, version_id: row.version_id,
  change_kind: row.change_kind, translates_version_id: row.translates_version_id,
  consent_decision: row.consent_decision, note: row.note,
  affected_grants: Number(row.affected_grants),
  counted_at: (row.counted_at as Date).toISOString(),
  recorded_at: (row.recorded_at as Date).toISOString(), recorded_by: row.recorded_by,
  affected_grants_were_counted: true,
  limits: [
    'The affected grant count was measured from the consent records when the decision was taken. It is not an estimate and nothing can assert it instead.',
    'This record is appended and never edited, so the decision reads later exactly as it was taken.',
    'Recording a decision is not carrying it out. Requiring fresh consent does not itself withdraw anything.',
  ],
});

/**
 * FR-M12-03. The classification, and for a material change the decision about
 * existing grants.
 *
 * Counting happens here rather than being supplied, which is the difference
 * between a record of how many people were affected and a record of how many
 * somebody believed were affected.
 */
export async function recordNoticeRevision(c: Context, noticeId: string, input: unknown) {
  const value = S.NoticeRevisionCreate.parse(input);
  const scope = scopeValues(c.actor);
  const version = requireOne((await c.tx.query(
    `SELECT version_id,purpose_id,language FROM app.notice_versions WHERE ${predicate} AND id=$4 AND version_id=$5`,
    [...scope, noticeId, value.version_id])).rows);
  if (value.translates_version_id) {
    const source = requireOne((await c.tx.query(
      `SELECT language,purpose_id FROM app.notice_versions WHERE ${predicate} AND version_id=$4`,
      [...scope, value.translates_version_id])).rows);
    // A translation into the language it came from is not a translation, and one
    // across purposes is not a translation of this notice.
    if (source.language === version.language) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'translates_version_id', code: 'translation_shares_the_source_language' }]);
    if (source.purpose_id !== version.purpose_id) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'translates_version_id', code: 'translation_source_belongs_to_another_purpose' }]);
  }
  // Counted, not supplied. A grant is affected if it is currently standing
  // against this notice's purpose.
  const countedAt = new Date().toISOString();
  const affected = Number((await c.tx.query(
    `SELECT count(*)::int AS n FROM app.consent_aggregates WHERE ${predicate} AND purpose_id=$4 AND state='GRANTED'`,
    [...scope, version.purpose_id])).rows[0].n);
  const id = randomUUID();
  let row;
  try {
    row = requireOne((await c.tx.query(
      `INSERT INTO app.notice_revisions(tenant_id,legal_entity_id,environment_id,id,notice_id,version_id,change_kind,translates_version_id,consent_decision,note,affected_grants,counted_at,recorded_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [...scope, id, noticeId, value.version_id, value.change_kind, value.translates_version_id,
        value.consent_decision, value.note, affected, countedAt, c.actor.actor_id])).rows);
  } catch {
    // One classification per version, enforced by a unique index. A second
    // attempt is a conflict rather than a silent overwrite of the first.
    throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'version_id', code: 'version_already_classified' }]);
  }
  await audit(c, 'notice_revision.record', id);
  return revision(row);
}

export async function noticeRevisionList(c: Context, noticeId: string, page: Page) {
  const rows = await c.tx.query(
    `SELECT * FROM app.notice_revisions WHERE ${predicate} AND notice_id=$4 AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`,
    [...scopeValues(c.actor), noticeId, page.cursor, page.limit + 1]);
  return paged(rows.rows.map(revision), page);
}
