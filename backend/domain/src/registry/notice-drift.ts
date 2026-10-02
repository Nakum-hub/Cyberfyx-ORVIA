import * as R from '../../../../shared/contracts/src/registry.ts';
import { Locale } from '../../../../shared/contracts/src/primitives.ts';
import type { Context } from '../shared/transaction.ts';
import { scope } from '../operations/shared.ts';

/**
 * Eighth Schedule language drift (Act s5(3); Rule 3; migration 0078). A notice is published per locale, each with its own
 * version history. The facts a Data Principal consents on are the purposes and data categories a notice lists, so those are
 * compared across every currently published locale of a notice. The most recently published locale is the reference: it is
 * the latest statement the organisation made. No locale is assumed to be the original; the Act allows English or any Eighth
 * Schedule language. A translation that recorded the version it translates is behind its source once that source is replaced.
 */
export const NOTICE_DRIFT_LIMITS = [
  'Locales are compared on the purposes and data categories each notice lists, which is what a person consents on. Wording is not compared; ORVIA does not translate or judge a translation.',
  'The reference is the most recently published original (a version not recorded as a translation). A locale with the same scope may still word things differently.',
  'Languages without a notice are listed for information. The Act lets the organisation provide the notice in English or any Eighth Schedule language; it does not require all of them.',
];

type Current = { id: string; locale: string; version: number; published_at: Date; effective_from: Date; translates_version_id: string | null; purpose_version_ids: string[]; data_category_ids: string[]; source_status: string | null };
type LocaleDrift = ReturnType<typeof R.NoticeLocaleDrift.parse>;
const minus = (a: string[], b: string[]) => a.filter(x => !b.includes(x)).sort();

/** The latest statement: the most recently published original (not a translation); only if every locale is a translation, the most recent. */
function referenceOf(current: Current[]) {
  const newest = (xs: Current[]) => [...xs].sort((a, b) => b.published_at.getTime() - a.published_at.getTime() || b.version - a.version)[0];
  return newest(current.filter(v => !v.translates_version_id)) ?? newest(current);
}
const sameScope = (a: { purpose_version_ids: string[]; data_category_ids: string[] }, b: { purpose_version_ids: string[]; data_category_ids: string[] }) =>
  minus(a.purpose_version_ids, b.purpose_version_ids).length + minus(b.purpose_version_ids, a.purpose_version_ids).length + minus(a.data_category_ids, b.data_category_ids).length + minus(b.data_category_ids, a.data_category_ids).length === 0;

/** Pure: the state of each current locale of one notice. */
export function compareLocales(current: Current[]) {
  if (!current.length) return { reference: null as Current | null, locales: [] as LocaleDrift[] };
  const reference = referenceOf(current)!;
  const locales = current.map(v => {
    const missingP = minus(reference.purpose_version_ids, v.purpose_version_ids), extraP = minus(v.purpose_version_ids, reference.purpose_version_ids);
    const missingC = minus(reference.data_category_ids, v.data_category_ids), extraC = minus(v.data_category_ids, reference.data_category_ids);
    const scopeDiffers = missingP.length + extraP.length + missingC.length + extraC.length > 0;
    let state: LocaleDrift['state']; let detail: string;
    if (v.id === reference.id) { state = 'REFERENCE'; detail = 'The most recently published locale of this notice; the others are compared with it.'; }
    else if (scopeDiffers) { state = 'SCOPE_MISMATCH'; detail = `Lists different purposes or data categories from the ${reference.locale} notice published later: people reading ${v.locale} are told a different scope.`; }
    else if (v.translates_version_id && v.source_status === 'SUPERSEDED') { state = 'BEHIND_ITS_SOURCE'; detail = 'The version this translates has since been replaced; the scope still matches, but the wording may not.'; }
    else if (!v.translates_version_id && v.published_at < reference.published_at) { state = 'MAY_BE_BEHIND'; detail = `Same scope, but published before the latest ${reference.locale} version and not recorded as its translation; check the wording.`; }
    else { state = 'IN_STEP'; detail = 'Same purposes and data categories as the reference.'; }
    return { locale: v.locale as LocaleDrift['locale'], version_id: v.id, version: v.version, published_at: v.published_at.toISOString(), effective_from: v.effective_from.toISOString(),
      translates_version_id: v.translates_version_id, state, missing_purpose_version_ids: missingP, extra_purpose_version_ids: extraP, missing_data_category_ids: missingC, extra_data_category_ids: extraC, detail };
  });
  return { reference, locales };
}

async function currentVersions(c: Context, noticeId: string | null) {
  return (await c.tx.query(`SELECT v.id, v.notice_id, v.locale, v.version, v.published_at, v.effective_from, v.translates_version_id, v.purpose_version_ids, v.data_category_ids, src.status AS source_status
    FROM app.registry_notice_versions v
    LEFT JOIN app.registry_notice_versions src ON src.tenant_id=v.tenant_id AND src.legal_entity_id=v.legal_entity_id AND src.environment_id=v.environment_id AND src.id=v.translates_version_id
    WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND v.status='PUBLISHED' AND ($4::uuid IS NULL OR v.notice_id=$4)
    ORDER BY v.notice_id, v.locale LIMIT 5000`, [...scope(c), noticeId])).rows as (Current & { notice_id: string })[];
}

export async function noticeDriftReport(c: Context) {
  const rows = await currentVersions(c, null);
  const names = new Map((await c.tx.query(`SELECT id, name FROM app.registry_notices WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 LIMIT 500`, scope(c))).rows.map(r => [r.id as string, r.name as string]));
  const byNotice = new Map<string, Current[]>();
  for (const r of rows) byNotice.set(r.notice_id, [...byNotice.get(r.notice_id) ?? [], r]);
  const notices = [...byNotice.entries()].slice(0, 200).map(([id, versions]) => {
    const { reference, locales } = compareLocales(versions);
    const out = locales.filter(l => l.state === 'SCOPE_MISMATCH' || l.state === 'BEHIND_ITS_SOURCE').length;
    return R.NoticeDrift.parse({ notice_id: id, name: names.get(id) ?? 'Unnamed notice', reference_locale: reference?.locale ?? null, locales, out_of_step: out,
      languages_without_notice: Locale.options.filter(l => !versions.some(v => v.locale === l)) });
  });
  return R.NoticeDriftReport.parse({ notices, notices_out_of_step: notices.filter(n => n.out_of_step > 0).length, limits: NOTICE_DRIFT_LIMITS });
}

/**
 * For publication. The version about to be published changes the notice's statement when its scope differs from the current
 * reference; the other current locales whose scope would then differ are returned. Catching a language up to the reference
 * changes nothing and needs no acknowledgement, even while other languages are still behind.
 */
export async function publicationDrift(c: Context, noticeId: string, locale: string, purposes: string[], categories: string[]) {
  const current = await currentVersions(c, noticeId);
  const reference = referenceOf(current);
  const candidate = { purpose_version_ids: purposes, data_category_ids: categories };
  const changesStatement = reference !== undefined && !sameScope(reference, candidate);
  const outOfStep = current.filter(v => v.locale !== locale && !sameScope(v, candidate)).map(v => v.locale).sort();
  return { changes_statement: changesStatement, out_of_step: outOfStep };
}
