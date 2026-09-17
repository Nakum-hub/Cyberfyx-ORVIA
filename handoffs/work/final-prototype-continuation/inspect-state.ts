// Read-only continuation intake inspection. Prints no credential, key or trace
// material: only run identity/state, build/contract identity and runtime owners.
import { loadProfile } from '../../../packages/testing/src/config.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { buildId } from '../../../packages/domain/src/evidence.ts';
import { CONTRACT_VERSION, PROFILE } from '../../../packages/contracts/src/index.ts';

const profile = loadProfile();
if (profile.profile !== 'rehearsal') throw new Error('Rehearsal profile required for this inspection');
const db = connectDatabase(profile).pool;
try {
  const identity = (await db.query('SELECT installation_id,profile,fixture_id FROM bootstrap_profile WHERE singleton=1')).rows[0];
  const runs = (await db.query("SELECT id,state,created_at,document->>'build_id' build_id,document->>'contract_version' contract_version,document->'request'->>'scenario' scenario FROM app.test_runs ORDER BY created_at DESC LIMIT 10")).rows;
  const pending = (await db.query("SELECT count(*)::int n FROM app.test_runs WHERE state IN ('NOT_RUN','RUNNING')")).rows[0].n;
  const activity = (await db.query("SELECT application_name,count(*)::int n FROM pg_stat_activity WHERE datname=current_database() GROUP BY 1 ORDER BY 1")).rows;
  const locks = (await db.query('SELECT objid,count(*)::int n FROM pg_locks WHERE locktype=$1 GROUP BY 1', ['advisory'])).rows;
  console.log(JSON.stringify({
    at: new Date().toISOString(),
    installation: identity,
    build_id: buildId(),
    contract_version: CONTRACT_VERSION,
    product_profile: PROFILE,
    pending_or_running_runs: pending,
    recent_runs: runs,
    database_activity: activity,
    advisory_locks: locks,
  }, null, 2));
} finally {
  await db.end();
}
