// Protected synthetic operator helper for the records test adapter. Never
// imported by application routes. It seeds fictional records into the isolated
// _targets database and sets fixture behaviour, using the local operator
// credential; the application itself reaches the target only through the
// adapter's agent and observer roles.
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from './config.ts';

type Scope = { tenant_id: string; legal_entity_id: string; environment_id: string };
export function recordsTarget() {
  const profile = loadProfile();
  const pool = connectDatabase({ ...profile, database: profile.database + '_targets' }).pool;
  return {
    pool,
    async seed(scope: Scope, systemId: string, records: { reference: string; fields: Record<string, string> }[]) {
      for (let i = 0; i < records.length; i += 500) {
        const chunk = records.slice(i, i + 500);
        const values = chunk.map((_, j) => `($1,$2,$3,$4,$${5 + j * 2},$${6 + j * 2})`).join(',');
        await pool.query(`INSERT INTO subject_records(tenant_id,legal_entity_id,environment_id,system_id,subject_reference,fields) VALUES ${values} ON CONFLICT(system_id,subject_reference) DO NOTHING`,
          [scope.tenant_id, scope.legal_entity_id, scope.environment_id, systemId, ...chunk.flatMap(r => [r.reference, JSON.stringify(r.fields)])]);
      }
    },
    async mode(scope: Scope, systemId: string, mode: 'HEALTHY' | 'UNAVAILABLE' | 'ACK_WITHOUT_EFFECT' | 'APPLY_THEN_TIMEOUT', readMode: 'AVAILABLE' | 'UNAVAILABLE' = 'AVAILABLE') {
      await pool.query(`INSERT INTO subject_controls(tenant_id,legal_entity_id,environment_id,system_id,mode,read_mode) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(system_id) DO UPDATE SET mode=EXCLUDED.mode,read_mode=EXCLUDED.read_mode`, [scope.tenant_id, scope.legal_entity_id, scope.environment_id, systemId, mode, readMode]);
    },
    async record(systemId: string, reference: string) {
      return (await pool.query('SELECT fields,suppressed,erased_at,anonymised_at,version FROM subject_records WHERE system_id=$1 AND subject_reference=$2', [systemId, reference])).rows[0];
    },
    async operations(systemId: string, reference: string) {
      return (await pool.query('SELECT idempotency_key,operation,applied,outcome FROM subject_operations WHERE system_id=$1 AND subject_reference=$2 ORDER BY recorded_at', [systemId, reference])).rows;
    },
    end: () => pool.end(),
  };
}
