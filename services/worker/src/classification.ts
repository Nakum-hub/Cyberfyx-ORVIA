import type pg from 'pg';
import { machineAuthority, type MachineIdentity } from '../../../backend/auth/src/machine.ts';
import { classifyPostgresRelation } from '../../../connectors/src/discovery/postgres-classify.ts';
import { audit, predicate, scopeValues, type Context } from '../../../backend/domain/src/shared/transaction.ts';

/**
 * Carries out queued classification runs (EX04) for approved catalog targets
 * through the observer role. Each run is its own savepoint; a failure is retried
 * up to three times and then recorded as failed, never as an empty result.
 */
export async function sweepClassification(
  scoped: <T>(id: string, work: (c: Context) => Promise<T>) => Promise<T>,
  workerIds: readonly string[], observerIdentities: readonly MachineIdentity[], observerPool: pg.Pool,
) {
  let processed = 0;
  for (const id of workerIds) await scoped(id, async c => {
    const scope = scopeValues(c.actor);
    const observer = observerIdentities.find(o => o.scope.tenant_id === scope[0] && o.scope.legal_entity_id === scope[1] && o.scope.environment_id === scope[2]);
    const runs = (await c.tx.query(`SELECT r.id, r.sample_limit, r.attempts, t.schema_name, t.relation_name, t.state AS target_state FROM app.classification_runs r
      JOIN app.catalog_discovery_targets t ON t.tenant_id=r.tenant_id AND t.legal_entity_id=r.legal_entity_id AND t.environment_id=r.environment_id AND t.id=r.target_id
      WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.state='QUEUED' ORDER BY r.requested_at LIMIT 10 FOR UPDATE OF r SKIP LOCKED`, scope)).rows;
    for (const run of runs) {
      await c.tx.query('SAVEPOINT classification_item');
      try {
        if (run.target_state !== 'APPROVED') {
          await c.tx.query(`UPDATE app.classification_runs SET state='FAILED', failure_code='TARGET_NOT_APPROVED' WHERE ${predicate} AND id=$4`, [...scope, run.id]);
        } else {
          if (!observer) throw new Error('Observer identity unavailable');
          const result = await classifyPostgresRelation(observerPool, machineAuthority(observer), { schema: run.schema_name, relation: run.relation_name }, run.sample_limit);
          if (result.scope.tenant_id !== scope[0] || result.scope.legal_entity_id !== scope[1] || result.scope.environment_id !== scope[2]) throw new Error('Observer scope mismatch');
          await c.tx.query(`UPDATE app.classification_runs SET state='COMPLETED', ruleset=$5, observed_at=$6, relation_state=$7, rows_sampled=$8, columns=$9, grants=$10, owner=$11, limits=$12, recorded_by=$13
            WHERE ${predicate} AND id=$4`, [...scope, run.id, result.ruleset, result.observed_at, result.state, result.rows_sampled, JSON.stringify(result.columns), JSON.stringify(result.grants), result.owner, JSON.stringify(result.limits), observer.id]);
          await audit(c, 'classification.completed', run.id);
        }
        await c.tx.query('RELEASE SAVEPOINT classification_item');
      } catch {
        await c.tx.query('ROLLBACK TO SAVEPOINT classification_item');
        const attempts = Math.min(3, Number(run.attempts) + 1);
        if (attempts >= 3) await c.tx.query(`UPDATE app.classification_runs SET state='FAILED', failure_code='CLASSIFICATION_READ_FAILED', attempts=$5 WHERE ${predicate} AND id=$4`, [...scope, run.id, attempts]);
        else await c.tx.query(`UPDATE app.classification_runs SET attempts=$5 WHERE ${predicate} AND id=$4`, [...scope, run.id, attempts]);
        await audit(c, 'classification.read_failed', run.id);
      }
      processed++;
    }
  });
  return processed;
}
