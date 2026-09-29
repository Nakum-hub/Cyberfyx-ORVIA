import { createHash } from 'node:crypto';
import type { Authority } from '../../../database/customer/src/runtime.ts';

export interface Client {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  release(): void;
}
export interface Pool { connect(): Promise<Client> }
export type Mapping = {
  schema: string; table: string; writer_role: string; observer_role: string;
  tenant: string; legal_entity: string; environment: string; reference: string;
  generation: string; version: string; operation_id: string; operation_digest: string; suppressed: string;
  correction_columns: string[];
};
export type Action = {
  operation_id: string; reference: string; generation: string; expected_version: number;
  kind: 'CORRECT' | 'SUPPRESS'; values: Record<string, string | null>;
};
const identifier = /^[a-z][a-z0-9_]{0,62}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const q = (name: string) => `"${name}"`;
export class PostgresConnectorError extends Error {
  constructor(public readonly code: string) { super(code); }
}
const fail = (code: string): never => { throw new PostgresConnectorError(code); };
export const capabilities = Object.freeze({ name: 'POSTGRES_MAPPED_RECORDS', version: '1.0.0',
  correct: true, suppress: true, erase: false, anonymise: false, bulk: false,
  verify: true, verification_method: 'INDEPENDENT_READ_BACK', consistency: 'IMMEDIATE',
  idempotency: 'COMPARE_AND_SET_WITH_DURABLE_LAST_OPERATION',
  limitation: 'Requires an approved direct-table mapping, scope columns, generation, monotonic version and operation receipt columns. Does not prove backups or downstream copies are changed.' });

/** Customer-local PostgreSQL transport. Pools are provisioned by installation
 * configuration, never connection URLs supplied in an action. Caller must gate
 * dispatch on approved workflow/holds; this layer checks machine authority and
 * exact scoped generation/version again at the target. No synthetic fallback. */
export function postgresRecords(pools: { writer: Pool; observer: Pool }, input: Mapping) {
  const m = structuredClone(input);
  const names = [m.schema, m.table, m.writer_role, m.observer_role, m.tenant, m.legal_entity, m.environment,
    m.reference, m.generation, m.version, m.operation_id, m.operation_digest, m.suppressed, ...m.correction_columns];
  if (names.some(n => typeof n !== 'string' || !identifier.test(n)) || m.writer_role === m.observer_role || pools.writer === pools.observer)
    fail('INVALID_MAPPING');
  const columns = names.slice(4);
  if (new Set(columns).size !== columns.length || !m.correction_columns.length || m.correction_columns.length > 30) fail('INVALID_MAPPING');
  const table = `${q(m.schema)}.${q(m.table)}`;
  const where = `${q(m.tenant)}=$1 AND ${q(m.legal_entity)}=$2 AND ${q(m.environment)}=$3 AND ${q(m.reference)}=$4`;
  function validated(actor: Authority, action: Action, observer: boolean) {
    const expires = Date.parse(actor.expires_at);
    if (actor.actor_domain !== 'MACHINE' || actor.role !== (observer ? 'OBSERVER' : 'AGENT') ||
      !actor.capabilities.includes(observer ? 'target.observe' : 'target.execute') || !uuid.test(actor.actor_id) ||
      !Number.isFinite(expires) || expires <= Date.now() || Object.values(actor.scope).length !== 3 ||
      [actor.scope.tenant_id, actor.scope.legal_entity_id, actor.scope.environment_id].some(id => !uuid.test(id))) fail('AUTHORITY_REQUIRED');
    if (!uuid.test(action.operation_id) || !uuid.test(action.generation) || typeof action.reference !== 'string' ||
      action.reference.length < 1 || action.reference.length > 256 || !Number.isSafeInteger(action.expected_version) ||
      action.expected_version < 0 || action.expected_version >= Number.MAX_SAFE_INTEGER || !['CORRECT', 'SUPPRESS'].includes(action.kind) ||
      !action.values || typeof action.values !== 'object' || Array.isArray(action.values)) fail('INVALID_ACTION');
    const entries = Object.entries(action.values).sort(([a], [b]) => a.localeCompare(b));
    if (action.kind === 'SUPPRESS' ? entries.length !== 0 : entries.length === 0) fail('INVALID_ACTION');
    for (const [column, value] of entries) if (!m.correction_columns.includes(column) ||
      (value !== null && (typeof value !== 'string' || value.length > 4096))) fail('UNAPPROVED_COLUMN');
    const scope = [actor.scope.tenant_id, actor.scope.legal_entity_id, actor.scope.environment_id];
    const digest = createHash('sha256').update(JSON.stringify([scope, m.schema, m.table, action.reference,
      action.generation, action.expected_version, action.operation_id, action.kind, entries])).digest('hex');
    return { entries, digest, params: [...scope, action.reference] };
  }
  async function transaction<T>(observer: boolean, run: (tx: Client) => Promise<T>) {
    const tx = await (observer ? pools.observer : pools.writer).connect();
    try {
      await tx.query(observer ? 'BEGIN READ ONLY' : 'BEGIN');
      await tx.query("SET LOCAL statement_timeout='5s'");
      await tx.query("SET LOCAL lock_timeout='3s'");
      const role = (await tx.query(`SELECT current_user AS name,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole
        FROM pg_roles WHERE rolname=current_user`)).rows[0];
      if (!role || role.name !== (observer ? m.observer_role : m.writer_role) ||
        role.rolsuper || role.rolbypassrls || role.rolcreatedb || role.rolcreaterole) fail('UNSAFE_TARGET_ROLE');
      const relation = (await tx.query(`SELECT c.relkind,pg_has_role(current_user,c.relowner,'MEMBER') AS owned,
        has_table_privilege(c.oid,'SELECT') AS readable,
        has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
          has_any_column_privilege(c.oid,'INSERT,UPDATE,REFERENCES') AS writable
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2`, [m.schema, m.table])).rows[0];
      if (!relation || !['r', 'p'].includes(String(relation.relkind)) || relation.owned || !relation.readable ||
        (observer && relation.writable)) fail('UNSAFE_TARGET_PERMISSIONS');
      const result = await run(tx);
      await tx.query('COMMIT'); return result;
    } catch (error) { await tx.query('ROLLBACK').catch(() => {}); throw error; }
    finally { tx.release(); }
  }
  function sameReceipt(row: Record<string, unknown>, action: Action, digest: string) {
    return row[m.generation] === action.generation && Number(row[m.version]) === action.expected_version + 1 &&
      row[m.operation_id] === action.operation_id && row[m.operation_digest] === digest;
  }
  return {
    capabilities,
    async execute(actor: Authority, supplied: Action) {
      actor = structuredClone(actor);
      const action = structuredClone(supplied), { entries, digest, params } = validated(actor, action, false);
      try {
        return await transaction(false, async tx => {
          validated(actor, action, false);
          const rows = (await tx.query(`SELECT ${[m.generation, m.version, m.operation_id, m.operation_digest].map(q).join(',')}
            FROM ${table} WHERE ${where} LIMIT 2 FOR UPDATE`, params)).rows;
          // Pool acquisition and row locks may outlive the machine lease.
          // Recheck after the wait, including before acknowledging a replay.
          validated(actor, action, false);
          if (rows.length !== 1) fail(rows.length ? 'AMBIGUOUS_REFERENCE' : 'NOT_FOUND');
          const row = rows[0]!;
          if (sameReceipt(row, action, digest)) return { result: 'APPLIED_UNVERIFIED' as const, replayed: true };
          if (row[m.operation_id] === action.operation_id) fail('IDEMPOTENCY_CONFLICT');
          if (row[m.generation] !== action.generation || Number(row[m.version]) !== action.expected_version) fail('STALE_GENERATION_OR_VERSION');
          const values: unknown[] = [...params, action.generation, action.expected_version, action.operation_id, digest];
          const assignments = action.kind === 'SUPPRESS' ? [`${q(m.suppressed)}=true`] : entries.map(([column, value]) => {
            values.push(value); return `${q(column)}=$${values.length}`;
          });
          assignments.push(`${q(m.version)}=${q(m.version)}+1`, `${q(m.operation_id)}=$7`, `${q(m.operation_digest)}=$8`);
          const changed = await tx.query(`UPDATE ${table} SET ${assignments.join(',')} WHERE ${where}
            AND ${q(m.generation)}=$5 AND ${q(m.version)}=$6`, values);
          if (changed.rowCount !== 1) fail('TARGET_CHANGE_NOT_APPLIED');
          return { result: 'APPLIED_UNVERIFIED' as const, replayed: false };
        });
      } catch (error) {
        if (error instanceof PostgresConnectorError) throw error;
        // Includes lost COMMIT acknowledgements. No error payload/record escapes.
        return { result: 'EFFECT_UNKNOWN' as const, replayed: false };
      }
    },
    async verify(actor: Authority, supplied: Action) {
      actor = structuredClone(actor);
      const action = structuredClone(supplied), { entries, digest, params } = validated(actor, action, true);
      try {
        return await transaction(true, async tx => {
          validated(actor, action, true);
          const fields = [m.generation, m.version, m.operation_id, m.operation_digest, m.suppressed, ...entries.map(([column]) => column)];
          const rows = (await tx.query(`SELECT ${fields.map(q).join(',')} FROM ${table} WHERE ${where} LIMIT 2`, params)).rows;
          validated(actor, action, true);
          if (rows.length !== 1) return { result: 'INCONCLUSIVE' as const, method: 'INDEPENDENT_READ_BACK' as const };
          const row = rows[0]!;
          const matches = sameReceipt(row, action, digest) && (action.kind === 'SUPPRESS' ? row[m.suppressed] === true : entries.every(([column, value]) => row[column] === value));
          return { result: matches ? 'PASS' as const : 'INCONCLUSIVE' as const, method: 'INDEPENDENT_READ_BACK' as const };
        });
      } catch { return { result: 'INCONCLUSIVE' as const, method: 'INDEPENDENT_READ_BACK' as const }; }
    },
  };
}
