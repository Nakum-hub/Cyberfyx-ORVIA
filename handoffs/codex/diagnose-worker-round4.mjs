// One real worker polling cycle; raw diagnostics stay inside the synthetic host.
import { inspect } from 'node:util';
import { createRequire } from 'node:module';
import { createWithdrawalWorker, dispatchOutbox } from '../../services/worker/src/withdrawal-worker.ts';
import { sweepAiGovernance } from '../../services/worker/src/ai-governance-monitor.ts';
import { sweepCatalogDiscovery } from '../../services/worker/src/catalog-discovery.ts';
import { sweepClassification } from '../../services/worker/src/classification.ts';
import { sweepCmpScans } from '../../services/worker/src/cmp-scanner.ts';
import { observerEnrollment } from '../../backend/auth/src/machine-profile.ts';
if (process.env.ORVIA_PROFILE !== 'rehearsal') throw new Error('Isolated rehearsal only');
const { Runtime } = createRequire(new URL('../../services/worker/package.json', import.meta.url))('@temporalio/worker');
Runtime.install({ shutdownSignals: [] });
const runtime = await createWithdrawalWorker();
const ids = runtime.enrollment.identities.map(identity => identity.id);
async function stage(name, operation) { console.log('BEGIN ' + name); await operation(); console.log('PASS ' + name); }
try {
  await runtime.worker.runUntil(async () => {
    await stage('outbox', () => dispatchOutbox(runtime));
    await stage('AI governance', () => sweepAiGovernance(runtime.scoped, ids));
    await stage('catalog discovery', () => sweepCatalogDiscovery(runtime.scoped, ids, observerEnrollment(runtime.config).identities, runtime.observer));
    await stage('classification', () => sweepClassification(runtime.scoped, ids, observerEnrollment(runtime.config).identities, runtime.observer));
    await stage('CMP scans', () => sweepCmpScans(runtime.scoped, ids));
  });
} catch (error) { console.error(inspect(error, { depth: 8 })); process.exitCode = 1; }
finally { await runtime.connection.close(); await runtime.close(); }
