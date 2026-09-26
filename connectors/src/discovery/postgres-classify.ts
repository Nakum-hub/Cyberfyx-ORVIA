import type pg from 'pg';
import type { Authority } from '../../../database/customer/src/runtime.ts';
import { countColumn, decide, RULESET, type ColumnResult } from './classifiers.ts';

export type Grant = Readonly<{ grantee: string; privileges: string[]; columns: string[] | null }>;
export type ClassificationResult = Readonly<{
  scope: Authority['scope']; schema: string; relation: string; state: 'CLASSIFIED' | 'MISSING' | 'EMPTY';
  ruleset: string; rows_sampled: number; sample_limit: number; columns: ColumnResult[]; grants: Grant[]; owner: string | null; observed_at: string; limits: string[];
}>;
const identifier = /^[a-z][a-z0-9_]{0,62}$/;
const TEXT_TYPES = new Set(['text', 'character varying', 'character', 'citext', 'varchar', 'bpchar', 'bigint', 'integer', 'numeric', 'inet']);
const MAX_COLUMNS = 60;
export const MAX_SAMPLE = 1000;

/**
 * Samples values from one explicitly approved relation through the read-only
 * observer role and returns counts per column and the relation's grants. The
 * values themselves never leave this function: each is tested and discarded.
 * The sample is the first rows the database returns, up to the limit, which is
 * stated as a limit rather than presented as representative.
 */
export async function classifyPostgresRelation(pool: pg.Pool, actor: Authority, relation: { schema: string; relation: string }, sampleLimit: number): Promise<ClassificationResult> {
  if (actor.actor_domain !== 'MACHINE' || actor.role !== 'OBSERVER' || !actor.capabilities.includes('target.observe') || Date.parse(actor.expires_at) <= Date.now())
    throw new Error('Current observer machine authority required');
  if (!identifier.test(relation.schema) || !identifier.test(relation.relation)) throw new Error('Invalid approved relation identifier');
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1 || sampleLimit > MAX_SAMPLE) throw new Error('Invalid sample limit');
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN READ ONLY');
    await tx.query("SET LOCAL statement_timeout = '10000ms'");
    const role = (await tx.query('SELECT current_user name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    if (!role || role.rolsuper || role.rolbypassrls || role.name !== 'orvia_target_observer') throw new Error('Least-privilege observer role required');
    await tx.query("SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true)",
      [actor.scope.tenant_id, actor.scope.legal_entity_id, actor.scope.environment_id, actor.actor_id]);
    const rel = (await tx.query(`SELECT c.oid, pg_catalog.pg_get_userbyid(c.relowner) AS owner, has_table_privilege(current_user,c.oid,'SELECT') AS can_read,
        has_table_privilege(current_user,c.oid,'INSERT') OR has_table_privilege(current_user,c.oid,'UPDATE') OR has_table_privilege(current_user,c.oid,'DELETE') AS can_mutate
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind IN ('r','p','v','m')`, [relation.schema, relation.relation])).rows[0];
    const observedAt = new Date().toISOString();
    const base = { scope: actor.scope, schema: relation.schema, relation: relation.relation, ruleset: RULESET, sample_limit: sampleLimit, observed_at: observedAt };
    if (!rel) { await tx.query('COMMIT'); return { ...base, state: 'MISSING', rows_sampled: 0, columns: [], grants: [], owner: null, limits: ['The approved relation does not exist.'] }; }
    if (!rel.can_read || rel.can_mutate) throw new Error('Observer target permission is not read-only');
    // Grants are read from the catalog ACLs, which every role may read, so the list is complete rather than limited to the observer's own grants.
    const grants: { grantee: string; privileges: string[]; columns: string[] | null }[] = (await tx.query(`SELECT CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(g.grantee) END AS grantee, array_agg(DISTINCT g.privilege_type ORDER BY g.privilege_type) AS privileges
      FROM pg_catalog.pg_class c, LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) g WHERE c.oid=$1 GROUP BY 1 ORDER BY 1`, [rel.oid])).rows.map(r => ({ grantee: String(r.grantee), privileges: r.privileges as string[], columns: null }));
    const columnGrants = (await tx.query(`SELECT CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(g.grantee) END AS grantee, a.attname, g.privilege_type
      FROM pg_catalog.pg_attribute a, LATERAL aclexplode(a.attacl) g WHERE a.attrelid=$1 AND a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL`, [rel.oid])).rows;
    for (const cg of columnGrants) grants.push({ grantee: String(cg.grantee), privileges: [String(cg.privilege_type)], columns: [String(cg.attname)] });
    const cols = (await tx.query(`SELECT a.attname AS name, pg_catalog.format_type(a.atttypid, NULL) AS type FROM pg_catalog.pg_attribute a WHERE a.attrelid=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`, [rel.oid])).rows
      .filter(r => TEXT_TYPES.has(String(r.type)) && identifier.test(String(r.name)) && !['tenant_id', 'legal_entity_id', 'environment_id'].includes(String(r.name))).slice(0, MAX_COLUMNS);
    if (!cols.length) { await tx.query('COMMIT'); return { ...base, state: 'EMPTY', rows_sampled: 0, columns: [], grants, owner: rel.owner, limits: ['No column of a classifiable type.'] }; }
    const list = cols.map(c => `"${c.name}"::text AS "${c.name}"`).join(', ');
    const rows = (await tx.query(`SELECT ${list} FROM "${relation.schema}"."${relation.relation}" LIMIT ${sampleLimit}`)).rows as Record<string, string | null>[];
    const columns = cols.map(c => decide(countColumn(String(c.name), rows.map(r => r[c.name] ?? null))));
    rows.length = 0; // values are not retained beyond counting
    await tx.query('COMMIT');
    return { ...base, state: 'CLASSIFIED', rows_sampled: columns[0]?.sampled ?? 0, columns, grants, owner: rel.owner, limits: [
      `Classified by ${RULESET} from the first ${sampleLimit} rows the database returned; this is a bounded sample, not the whole relation.`,
      'Only counts are kept. No sampled value is stored, logged or shown.',
      'Free-text names and addresses are not classified; a column without a matching shape is reported as unclassified, not as free of personal data.',
    ] };
  } catch (error) { await tx.query('ROLLBACK'); throw error; } finally { tx.release(); }
}
