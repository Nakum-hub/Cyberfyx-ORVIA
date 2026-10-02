import type { PoolClient } from 'pg';

/**
 * Functions only the protected server commands may call, over the migration/operator connection: owner recovery
 * (revision 1.8, migration 0074) and admitting real people (revision 1.9, migration 0082); and the erasure-ledger upgrade
 * boundary (migration 0091), which only migration runs. The role set-up scripts grant
 * EXECUTE on every app function to the runtime roles, so each of them calls `revokeServerOnly` straight after that grant;
 * otherwise the web application could issue an owner recovery code or admit real people.
 */
export const SERVER_ONLY_FUNCTIONS = ['app.owner_recovery_issue(text,text)', 'app.admit_real_principals(text,text)', 'app.record_ledger_upgrade_boundary()'] as const;
export const RUNTIME_ROLES = ['orvia_app', 'orvia_worker', 'orvia_agent_control', 'orvia_machine_auth', 'orvia_sender'] as const;
/**
 * Functions that only some runtime roles may call. The canary marketing hold (revision 1.10, migration 0088) tells its caller
 * whether a principal is an active decoy, so only send admission (sender) and its staff preview (app) may ask.
 */
export const ROLE_RESTRICTED_FUNCTIONS: Record<string, readonly (typeof RUNTIME_ROLES)[number][]> = {
  'app.canary_marketing_hold(uuid)': ['orvia_app', 'orvia_sender'],
  // Real-person decoys (revision 1.10, migration 0089): only the delivery runner withholds; nobody may ask who they are.
  'app.withhold_real_decoy_message(uuid)': ['orvia_worker'],
  'app.real_decoy_recipient(uuid,uuid,uuid,text)': [],
};

export async function revokeServerOnly(tx: Pick<PoolClient, 'query'>) {
  for (const fn of SERVER_ONLY_FUNCTIONS) {
    if (!(await tx.query('SELECT to_regprocedure($1) IS NOT NULL AS present', [fn])).rows[0].present) continue;
    const roles = (await tx.query('SELECT rolname FROM pg_roles WHERE rolname = ANY($1)', [RUNTIME_ROLES])).rows.map(r => r.rolname as string);
    if (roles.length) await tx.query(`REVOKE ALL ON FUNCTION ${fn} FROM ${roles.join(',')}`);
  }
  for (const [fn, allowed] of Object.entries(ROLE_RESTRICTED_FUNCTIONS)) {
    if (!(await tx.query('SELECT to_regprocedure($1) IS NOT NULL AS present', [fn])).rows[0].present) continue;
    const others = RUNTIME_ROLES.filter(r => !allowed.includes(r));
    const roles = (await tx.query('SELECT rolname FROM pg_roles WHERE rolname = ANY($1)', [others])).rows.map(r => r.rolname as string);
    if (roles.length) await tx.query(`REVOKE ALL ON FUNCTION ${fn} FROM ${roles.join(',')}`);
  }
}
