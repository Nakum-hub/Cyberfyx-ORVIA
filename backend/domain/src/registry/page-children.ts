import type { Context } from '../shared/transaction.ts';
import { predicate, scope } from '../operations/shared.ts';

// Fixed server-owned identifiers only. Each parent's existing history limit
// applies independently, rather than accidentally limiting the whole page.
const children = {
  purpose: ['registry_purpose_versions', 'purpose_id', 'version', 100],
  notice: ['registry_notice_versions', 'notice_id', 'locale,version', 100],
  activityVersions: ['registry_activity_versions', 'activity_id', 'version', 100],
  activityLinks: ['registry_activity_links', 'activity_id', 'valid_from,id', 200],
  engagementLinks: ['processor_engagement_links', 'engagement_id', 'valid_from', 50],
  engagementRuns: ['workflow_runs', 'engagement_id', 'created_at DESC', 1],
} as const;

export async function pageChildren(c: Context, kind: keyof typeof children, ids: string[]) {
  if (!ids.length) return [];
  const [table, parent, order, limit] = children[kind];
  return (await c.tx.query(`SELECT * FROM (
    SELECT *,row_number() OVER (PARTITION BY ${parent} ORDER BY ${order}) AS page_child_rank
    FROM app.${table} WHERE ${predicate} AND ${parent}=ANY($4::uuid[])
  ) children WHERE page_child_rank<=$5 ORDER BY ${parent},page_child_rank`, [...scope(c), ids, limit])).rows;
}
