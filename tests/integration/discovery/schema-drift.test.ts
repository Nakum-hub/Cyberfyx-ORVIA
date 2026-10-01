// Metadata discovery when the source changes (EX04, M03/M18; worker services/worker/src/catalog-discovery.ts).
// Scenario: the organisation registers a customer table in its synthetic target for scheduled metadata discovery. Under test:
// the first read records the columns and a digest without reading values; an unchanged re-read keeps the digest and opens no
// gap; when a developer adds an `aadhaar_number` column the next read records a new digest and opens one HIGH
// CATALOG_SCHEMA_CHANGED coverage gap telling staff to review the mapping, which a further unchanged read does not duplicate;
// an observer that has been given write access is refused (no observation is fabricated, the job retries); a dropped table is
// reported MISSING rather than unchanged; an expired observer authority is refused before any read; another tenant sees none of it.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key } from '../../../shared/testing/src/operations-fixture.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepCatalogDiscovery } from '../../../services/worker/src/catalog-discovery.ts';
import { observerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { observePostgresCatalog } from '../../../connectors/src/discovery/postgres-catalog.ts';
import { machineAuthority } from '../../../backend/auth/src/machine.ts';

const t = operationsSuite('schema-drift');
const { h, check, ok, db } = t;
const profile = loadProfile();
const targetDb = connectDatabase({ ...profile, database: profile.database + '_targets' }).pool;
const relation = `drift_probe_${randomUUID().slice(0, 8)}`;

await t.run(async () => {
  const runtime = workflowActivities();
  try {
    const admin = await h.login('admin'); const owner = await h.login('owner'); const birch = await h.login('birch');
    await targetDb.query(`CREATE TABLE public.${relation} (id uuid PRIMARY KEY, email text, signup_date date)`);
    await targetDb.query(`GRANT SELECT ON public.${relation} TO orvia_target_observer`);
    const system = await t.boundSystem('Customer database (drift probe)');
    const path = '/api/v1/admin/catalog-discovery-targets';
    const target = await ok(admin.call(path, { system_id: system.id, schema_name: 'public', relation_name: relation }, key()), S.schemas.CatalogDiscoveryTarget);
    await ok(owner.call(`${path}/${target.id}/approve`, {}, key()), S.schemas.CatalogDiscoveryTarget);
    const sweep = async () => {
      await db.query(`UPDATE app.catalog_discovery_jobs SET next_run_at=now() - interval '1 second' WHERE target_id=$1`, [target.id]);
      return sweepCatalogDiscovery(runtime.scoped, runtime.enrollment.identities.map(x => x.id), observerEnrollment(runtime.config).identities, runtime.observer);
    };
    const detail = async () => S.CatalogDiscoveryDetail.parse(await (await admin.call(`${path}/${target.id}`)).json());
    const gaps = async () => (await db.query(`SELECT id, severity, state, description FROM app.coverage_gaps WHERE subject_kind='CATALOG_TARGET' AND subject_id=$1 AND source='CATALOG_SCHEMA_CHANGED'`, [target.id])).rows;
    const latest = async () => (await detail()).observations.sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0]!;

    t.setPhase('first read');
    await sweep();
    const first = await latest();
    check('the first read records the three columns and a digest, without values', [first.state, first.columns.map(c => c.name), /^[a-f0-9]{64}$/.test(first.digest ?? ''), first.limits[0]?.startsWith('Catalog metadata only')], ['OBSERVED_METADATA', ['id', 'email', 'signup_date'], true, true]);

    t.setPhase('unchanged');
    await sweep();
    check('an unchanged re-read keeps the digest and opens no gap', [(await latest()).digest, (await gaps()).length], [first.digest, 0]);

    t.setPhase('a column is added');
    await targetDb.query(`ALTER TABLE public.${relation} ADD COLUMN aadhaar_number text`);
    await sweep();
    const changed = await latest();
    const opened = await gaps();
    check('the next read records the new column and a new digest', [changed.columns.map(c => c.name).includes('aadhaar_number'), changed.digest !== first.digest], [true, true]);
    check('one HIGH schema-change gap tells staff to review the mapping', [opened.length, opened[0]?.severity, opened[0]?.state, opened[0]?.description.includes('Review data mapping')], [1, 'HIGH', 'OPEN', true]);
    let visible = false;
    for (let cursor: string | null = null, n = 0; n < 50 && !visible; n++) {
      const listed: { items: { id: string }[]; next_cursor: string | null } = await ok(admin.call(`/api/v1/admin/gaps?limit=100${cursor ? `&cursor=${cursor}` : ''}`), S.schemas.GapList);
      visible = listed.items.some(g => g.id === opened[0]!.id); cursor = listed.next_cursor; if (!cursor) break;
    }
    check('the gap is visible to staff in the coverage list', visible, true);
    await sweep();
    check('a further unchanged read does not duplicate the gap', (await gaps()).length, 1);

    t.setPhase('observer with write access');
    const before = (await detail()).observations.length;
    await targetDb.query(`GRANT INSERT ON public.${relation} TO orvia_target_observer`);
    try {
      await sweep();
      const job = (await db.query(`SELECT state, attempts FROM app.catalog_discovery_jobs WHERE target_id=$1`, [target.id])).rows[0];
      check('an observer that can write is refused: no observation is recorded and the job retries', [(await detail()).observations.length, job.state, job.attempts >= 1], [before, 'RETRY', true]);
    } finally { await targetDb.query(`REVOKE INSERT ON public.${relation} FROM orvia_target_observer`); }

    t.setPhase('table dropped');
    await db.query(`UPDATE app.catalog_discovery_jobs SET state='READY', attempts=0 WHERE target_id=$1`, [target.id]);
    await targetDb.query(`DROP TABLE public.${relation}`);
    await sweep();
    check('a dropped table is reported MISSING, not unchanged', (await latest()).state, 'MISSING');

    t.setPhase('expired observer');
    const identity = observerEnrollment(runtime.config).identities.find(i => i.scope.environment_id === t.scope().environment_id)!;
    const expired = { ...machineAuthority(identity), expires_at: new Date(Date.now() - 1000).toISOString() };
    const refused = await observePostgresCatalog(targetDb, expired, [{ schema: 'public', relation: 'marketing_memberships' }]).then(() => 'read', (e: Error) => e.message);
    check('an expired observer authority is refused before any read', refused, 'Current observer machine authority required');

    t.setPhase('tenancy');
    check('another tenant cannot see the target or its observations', (await birch.call(`${path}/${target.id}`)).status, 404);
  } finally { await runtime.close(); await targetDb.query(`DROP TABLE IF EXISTS public.${relation}`).catch(() => undefined); await targetDb.end(); }
});
