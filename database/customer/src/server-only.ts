import type { PoolClient } from 'pg';

/**
 * Functions only the protected server commands may call, over the migration/operator connection: owner recovery
 * (revision 1.8, migration 0074) and admitting real people (revision 1.9, migration 0082). The role set-up scripts grant
 * EXECUTE on every app function to the runtime roles, so each of them calls `revokeServerOnly` straight after that grant;
 * otherwise the web application could issue an owner recovery code or admit real people.
 */
export const SERVER_ONLY_FUNCTIONS = ['app.owner_recovery_issue(text,text)', 'app.admit_real_principals(text,text)'] as const;
export const RUNTIME_ROLES = ['orvia_app', 'orvia_worker', 'orvia_agent_control', 'orvia_machine_auth', 'orvia_sender'] as const;

export async function revokeServerOnly(tx: Pick<PoolClient, 'query'>) {
  for (const fn of SERVER_ONLY_FUNCTIONS) {
    if (!(await tx.query('SELECT to_regprocedure($1) IS NOT NULL AS present', [fn])).rows[0].present) continue;
    const roles = (await tx.query('SELECT rolname FROM pg_roles WHERE rolname = ANY($1)', [RUNTIME_ROLES])).rows.map(r => r.rolname as string);
    if (roles.length) await tx.query(`REVOKE ALL ON FUNCTION ${fn} FROM ${roles.join(',')}`);
  }
}
