import pg from 'pg';
import type { RuntimeConfig, RuntimeRole } from '../../../backend/auth/src/config.ts';

/**
 * The server cancels a statement just before the client gives up on it, so a
 * query whose caller has gone cannot keep consuming the database; a
 * transaction left open by a stalled caller is ended the same way.
 */
export const SERVER_LIMITS = { statement_timeout: 9000, idle_in_transaction_session_timeout: 15000 } as const;
/** TCP keepalive so an idle connection is not silently dropped by the host network or the container proxy. */
export const CONNECTION_KEEPALIVE = { keepAlive: true, keepAliveInitialDelayMillis: 10_000 } as const;
/**
 * A connection the server or network closes while it sits idle in the pool is reported on the pool. Without a listener
 * Node treats that as an unhandled error and the whole process exits, taking the web, worker or agent down with it. The
 * pool has already discarded the broken connection and opens a new one on the next request, so log it and carry on.
 */
export function guardPool<T extends pg.Pool>(pool: T, label: string): T {
  pool.on('error', error => { console.error(JSON.stringify({ at: new Date().toISOString(), event: 'postgres_idle_connection_lost', pool: label, code: (error as { code?: string }).code ?? error.message.slice(0, 80) })); });
  return pool;
}
export function runtimePool(config: RuntimeConfig, role: RuntimeRole) {
  return guardPool(new pg.Pool({ host: '127.0.0.1', port: config.postgres_port, database: config.database,
    user: role, password: config.secret(`${role}-password`), max: 2,
    connectionTimeoutMillis: 5000, query_timeout: 10000, ...SERVER_LIMITS, ...CONNECTION_KEEPALIVE, application_name: `orvia-${role}` }), `orvia-${role}`);
}
export type Authority = {
  actor_id: string; actor_domain: 'STAFF' | 'PRINCIPAL' | 'MACHINE';
  scope: { tenant_id: string; legal_entity_id: string; environment_id: string };
  role: string; capabilities: string[]; principal_id?: string; mfa_verified?: boolean; expires_at: string;
};
export async function scopedTransaction<T>(pool: pg.Pool, authority: Authority, work: (tx: pg.PoolClient) => Promise<T>) {
  if (!authority.actor_id || !Number.isFinite(Date.parse(authority.expires_at)) || Date.parse(authority.expires_at) <= Date.now()) throw new Error('Expired authority');
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    const role = await tx.query(`SELECT current_user AS name,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole
      FROM pg_roles WHERE rolname=current_user`);
    const permitted=authority.actor_domain==='MACHINE'?['orvia_app','orvia_worker','orvia_agent_control','orvia_sender']:['orvia_app'];
    if (!permitted.includes(role.rows[0]?.name) || role.rows[0].rolsuper || role.rows[0].rolbypassrls || role.rows[0].rolcreatedb || role.rows[0].rolcreaterole) throw new Error('Unsafe application database role');
    await tx.query(`SELECT set_config('orvia.tenant_id',$1,true), set_config('orvia.legal_entity_id',$2,true),
      set_config('orvia.environment_id',$3,true), set_config('orvia.actor_id',$4,true),
      set_config('orvia.actor_domain',$5,true), set_config('orvia.principal_id',$6,true), set_config('orvia.capabilities',$7,true)`,
    [authority.scope.tenant_id, authority.scope.legal_entity_id, authority.scope.environment_id, authority.actor_id,
      authority.actor_domain, authority.principal_id ?? '', authority.capabilities.join(',')]);
    await tx.query("SELECT set_config('orvia.role',$1,true)",[authority.role]);
    if(authority.actor_domain==='MACHINE'&&role.rows[0].name!=='orvia_app') {
      const identity=await tx.query('SELECT kind FROM machine_auth.identities WHERE id=$1 AND active AND expires_at>now()',[authority.actor_id]);
      if(identity.rowCount!==1||identity.rows[0].kind!==authority.role)throw new Error('Inactive machine authority');
    }
    const result = await work(tx);
    await tx.query('COMMIT');
    return result;
  } catch (error) { await tx.query('ROLLBACK'); throw error; }
  finally { tx.release(); }
}
