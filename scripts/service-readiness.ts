/**
 * One definition of what "the backing services are ready" means.
 *
 * `scripts/preflight.ts` runs these checks and records an evidence artifact.
 * `scripts/start-orvia.ts` and `scripts/orvia-status.ts` run the same checks
 * without recording one, because an operator starting the application should
 * not silently produce a qualification artifact on every invocation. Keeping
 * the probes here means the recorded preflight and the operator-facing report
 * can never drift into asserting different things.
 *
 * Every probe is read-only. None of them creates, migrates or resets state.
 */
import { connectDatabase } from '../packages/db/src/index.ts';
import { connectTemporal } from '../apps/worker/src/probe-client.ts';
import { safeError } from '../packages/testing/src/evidence.ts';

export type ServiceProfile = {
  profile: string; database: string; password: string; installation_id: string;
  postgres_port: number; opa_port: number; temporal_port: number; temporal_namespace: string;
};
export type ServiceCheck = Record<string, unknown> & { result: 'PASS' | 'FAIL' };

export async function checkPostgres(profile: ServiceProfile): Promise<ServiceCheck> {
  const { pool } = connectDatabase(profile);
  try {
    const result = await pool.query('SELECT current_database() AS database, current_setting(\'server_version\') AS version, installation_id,profile FROM bootstrap_profile WHERE singleton=1');
    if (result.rows[0]?.database !== profile.database || result.rows[0]?.installation_id !== profile.installation_id || result.rows[0]?.profile !== profile.profile) throw new Error('Database identity mismatch');
    return { result: 'PASS', ...result.rows[0] };
  } catch (error) { return { result: 'FAIL', error: safeError(error) }; }
  finally { await pool.end(); }
}

export async function checkOpa(profile: ServiceProfile): Promise<ServiceCheck> {
  try {
    const decision = async (operation: string) => {
      const response = await fetch(`http://127.0.0.1:${profile.opa_port}/v1/data/orvia/bootstrap/ready`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: { profile: 'CUSTOMER_LOCAL_SYNTHETIC', operation } }), signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('OPA request failed');
      return (await response.json() as { result?: boolean }).result;
    };
    if (await decision('BOOTSTRAP_READINESS') !== true) throw new Error('OPA readiness decision failed');
    if (await decision('ARBITRARY_OPERATION') !== false) throw new Error('OPA deny control failed');
    return { result: 'PASS', readiness: true, arbitrary_operation: false, policy_scope: 'bootstrap readiness only' };
  } catch (error) { return { result: 'FAIL', error: safeError(error) }; }
}

export async function checkTemporal(profile: ServiceProfile): Promise<ServiceCheck> {
  try {
    const { connection } = await connectTemporal(profile);
    try {
      const description = await connection.workflowService.describeNamespace({ namespace: profile.temporal_namespace });
      return { result: 'PASS', namespace: description.namespaceInfo?.name, server: 'persistent single-node CLI development server' };
    } finally { await connection.close(); }
  } catch (error) { return { result: 'FAIL', error: safeError(error) }; }
}

/** All three backing services, in the order preflight has always reported them. */
export async function checkServices(profile: ServiceProfile) {
  return { postgres: await checkPostgres(profile), opa: await checkOpa(profile), temporal: await checkTemporal(profile) };
}
