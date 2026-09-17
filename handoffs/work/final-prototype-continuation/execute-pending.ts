// Drain the exact NOT_RUN record retained by the pause closeout, using the
// existing protected operator unchanged. Pinned to one run id and refuses any
// other pending work. No reset, no manual result rewrite, no fabricated state.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import { waitForAuthWindow } from '../../../packages/testing/src/auth-window.ts';

const profile = loadProfile();
if (profile.profile !== 'rehearsal') throw new Error('Only the named rehearsal is authorized');
const db = connectDatabase(profile).pool;
const h = new HttpFixture();
const id = '09c0701c-bf82-4c69-9198-dd98b8208834';
const started_at = new Date().toISOString();
let exit_code: number | null = null;
try {
  const before = (await db.query("SELECT id,state,document FROM app.test_runs WHERE state IN ('NOT_RUN','RUNNING') ORDER BY id")).rows;
  if (before.length !== 1 || before[0].id !== id || before[0].state !== 'NOT_RUN') throw new Error('Unexpected pending work; execution refused');
  if ((await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name IN ('orvia_worker','orvia_agent_control') LIMIT 1")).rowCount) throw new Error('Active runtime owner; execution refused');
  await h.start();
  await waitForAuthWindow(db);
  let stdout = '';
  let stderr = '';
  try {
    const run = await promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/regression-runner.ts', 'confirm:rehearsal'], { windowsHide: true, timeout: 300000, maxBuffer: 4 * 1024 * 1024 });
    exit_code = 0; stdout = run.stdout; stderr = run.stderr;
  } catch (error) {
    // Retain a failed operator execution exactly as it happened.
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    exit_code = typeof failure.code === 'number' ? failure.code : 1;
    stdout = failure.stdout ?? ''; stderr = failure.stderr ?? '';
  }
  const after = (await db.query('SELECT id,state,document FROM app.test_runs WHERE id=$1', [id])).rows[0];
  const remaining = (await db.query("SELECT count(*)::int n FROM app.test_runs WHERE state IN ('NOT_RUN','RUNNING')")).rows[0].n;
  const record = {
    kind: 'EXECUTION_OF_PAUSE_QUEUED_RUN',
    started_at, finished_at: new Date().toISOString(),
    profile: profile.profile, fixture_id: 'aster-birch-v1', run_id: id,
    command: 'node --import tsx scripts/regression-runner.ts confirm:rehearsal',
    exit_code, before, after, remaining_pending_or_running: remaining, stdout, stderr,
    limitations: ['Existing protected operator executed the retained queued record. Whatever terminal state it reached is recorded as-is; nothing was reset, deleted or marked passed. This is engineering execution, not Work acceptance or a human rehearsal.'],
  };
  writeFileSync(`handoffs/work/final-prototype-continuation/pending-execution-${Date.now()}.json`, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  console.log(`Queued run ${id} reached ${after.state}; operator exit ${exit_code}; remaining pending/running ${remaining}.`);
} finally { await h.stop(); await db.end(); }
