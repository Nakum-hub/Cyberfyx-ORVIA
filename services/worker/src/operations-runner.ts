import { createHash, createHmac, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { runtimeConfig } from '../../../backend/auth/src/config.ts';
import { workerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { servicePool, machineAuthority } from '../../../backend/auth/src/machine.ts';
import { scopedTransaction } from '../../../database/customer/src/runtime.ts';
import { predicate, type Context } from '../../../backend/domain/src/shared/transaction.ts';
import { processJob } from '../../../backend/domain/src/operations/bulk-import.ts';
import { evaluateRun } from '../../../backend/domain/src/operations/runs.ts';
import { executeRun } from '../../../backend/domain/src/operations/executor.ts';
import { notificationSweep } from '../../../backend/domain/src/operations/attention.ts';
import { propagatePendingWithdrawals } from '../../../backend/domain/src/registry/consent.ts';
import type { OperationsEnv } from '../../../backend/domain/src/operations/shared.ts';
import { safeError } from '../../../shared/testing/src/evidence.ts';

/**
 * Background runner for DPDP operations (implementation plan s7 "jobs and timers").
 *
 * It resumes work that staff started but did not drive to the end: estate
 * imports still processing, retention evaluations still evaluating, and runs a
 * second person has already approved. Each batch is its own transaction as the
 * enrolled WORKER identity of that scope, so an interrupted runner resumes from
 * the last committed checkpoint and never repeats an applied action (the domain
 * functions and the target ledger are idempotent). It never approves anything:
 * a run that needs approval stays waiting. Runs tied to a V1 rights request are
 * left to staff, because settling them writes the V1 request's outcomes under staff
 * authority. It then raises due notifications (DPDP alert tasks only). Before any
 * of that it creates the propagation run for any recorded withdrawal that has none
 * (one recorded while no regulatory package was in force).
 */
export type RunnerReport = { scope: string; withdrawals_propagated: number; jobs_processed: number; runs_evaluated: number; runs_executed: number; notifications_created: number; errors: string[] };
const BATCH = { job: 200, evaluate: 200, execute: 50 };
const MAX_BATCHES_PER_ITEM = 50;

export function operationsRunner() {
  const config = runtimeConfig();
  const enrollment = workerEnrollment(config);
  const control = servicePool(config, 'orvia_worker');
  const targets = { agent: servicePool(config, 'orvia_target_agent'), observer: servicePool(config, 'orvia_target_observer') };
  const key = createHash('sha256').update('orvia-registry-source-key:' + config.secret('principal-secret')).digest();
  const env: OperationsEnv = { sourceKeyDigest: value => createHmac('sha256', key).update(value, 'utf8').digest('hex'), targets };

  async function once(): Promise<RunnerReport[]> {
    const reports: RunnerReport[] = [];
    for (const identity of enrollment.identities) {
      const actor = machineAuthority(identity);
      const scoped = <T>(work: (c: Context) => Promise<T>) => scopedTransaction(control, actor, tx => work({ tx, actor, requestId: randomUUID() }));
      const report: RunnerReport = { scope: identity.scope.environment_id, withdrawals_propagated: 0, jobs_processed: 0, runs_evaluated: 0, runs_executed: 0, notifications_created: 0, errors: [] };
      const scopeValues = [identity.scope.tenant_id, identity.scope.legal_entity_id, identity.scope.environment_id];
      // Withdrawals first: a recorded withdrawal without a propagation run is the
      // one gap here that can leave marketing active. Its runs then enter the
      // evaluating list read below and are driven in this same cycle.
      try { report.withdrawals_propagated = (await scoped(c => propagatePendingWithdrawals(c))).created.length; }
      catch (error) { report.errors.push(`withdrawal propagation: ${safeError(error).code}`); }
      const pending = await scoped(async c => ({
        jobs: (await c.tx.query(`SELECT id FROM app.bulk_jobs WHERE ${predicate} AND status='PROCESSING' ORDER BY created_at LIMIT 20`, scopeValues)).rows.map(r => r.id as string),
        evaluating: (await c.tx.query(`SELECT id FROM app.workflow_runs WHERE ${predicate} AND status='EVALUATING' ORDER BY created_at LIMIT 20`, scopeValues)).rows.map(r => r.id as string),
        executable: (await c.tx.query(`SELECT id FROM app.workflow_runs WHERE ${predicate} AND status IN ('APPROVED','RUNNING') AND rights_request_id IS NULL ORDER BY created_at LIMIT 20`, scopeValues)).rows.map(r => r.id as string),
      }));
      const drive = async (ids: string[], step: (c: Context, id: string) => Promise<{ status: string }>, done: (status: string) => boolean, count: () => void) => {
        for (const id of ids) {
          try {
            for (let i = 0; i < MAX_BATCHES_PER_ITEM; i++) { const result = await scoped(c => step(c, id)); if (done(result.status)) break; }
            count();
          } catch (error) { report.errors.push(`${id}: ${safeError(error).code}`); }
        }
      };
      await drive(pending.jobs, (c, id) => processJob(c, env, id, { limit: BATCH.job }), s => s !== 'PROCESSING', () => report.jobs_processed++);
      await drive(pending.evaluating, (c, id) => evaluateRun(c, id, { limit: BATCH.evaluate }), s => s !== 'EVALUATING', () => report.runs_evaluated++);
      await drive(pending.executable, (c, id) => executeRun(c, env, id, { limit: BATCH.execute }), s => s !== 'RUNNING', () => report.runs_executed++);
      try { report.notifications_created = (await scoped(c => notificationSweep(c))).created; }
      catch (error) { report.errors.push(`notification sweep: ${safeError(error).code}`); }
      reports.push(report);
    }
    return reports;
  }
  return { once, close: () => Promise.all([control.end(), targets.agent.end(), targets.observer.end()]) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const runner = operationsRunner();
  let stopped = false;
  let wake: () => void = () => {};
  // The application supervisor stops its children with an IPC message and
  // force-kills after ten seconds, so a stop must also cut the idle wait short.
  const stop = () => { stopped = true; wake(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  process.on('message', message => { if (message === 'orvia-stop') stop(); });
  const loop = !process.argv.includes('--once');
  try {
    do {
      const reports = await runner.once();
      console.log(JSON.stringify({ at: new Date().toISOString(), reports }));
      // A single pass reports item errors through its exit code. A supervised
      // loop keeps running and reports them in each pass's output instead, so a
      // clean stop is not recorded as a failed child; a thrown error still ends it.
      if (!loop && reports.some(r => r.errors.length)) process.exitCode = 1;
      if (loop && !stopped) await new Promise<void>(resolve => { const timer = setTimeout(resolve, 30_000); wake = () => { clearTimeout(timer); resolve(); }; });
    } while (loop && !stopped);
  } finally { await runner.close(); }
  // An IPC channel keeps the event loop alive after the last pass.
  if (process.connected) process.disconnect();
}
