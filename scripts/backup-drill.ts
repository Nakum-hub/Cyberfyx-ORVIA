/**
 * Customer-local backup and restore drill (EX14).
 *
 * Takes a full logical backup of the profile's customer database with the
 * server's own pg_dump (run inside the profile's database container so the
 * tool matches the server), stores it under the profile's private directory
 * with a SHA-256 manifest, restores it into a scratch database, and verifies
 * the restored copy: the same migrations, the same row counts for the tables
 * that carry obligations, every application table still forcing row security,
 * and every withdrawn consent still withdrawn. The scratch database is then
 * dropped. The backup file stays with the customer; nothing leaves the host.
 *
 * Usage: pnpm run backup:drill confirm:<profile>
 */
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connectDatabase } from '../database/customer/src/index.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { writeEvidence } from '../shared/testing/src/evidence.ts';

const TABLES = ['consent_records', 'consent_record_events', 'workflow_runs', 'downstream_actions', 'registry_activities', 'rights_requests', 'audit_events', 'retention_rules', 'grc_issues', 'cmp_consents'];
type Facts = { migrations: string[]; counts: Record<string, number>; withdrawn_digest: string; withdrawn: number; unforced_tables: string[] };

/** Whether a backup file is byte-for-byte the one its manifest names. */
export function fileMatches(file: string, sha256: string) { return createHash('sha256').update(readFileSync(file)).digest('hex') === sha256; }

async function facts(profile: ReturnType<typeof loadProfile>, database: string): Promise<Facts> {
  const pool = connectDatabase({ ...profile, database }).pool;
  try {
    const migrations = (await pool.query(`SELECT id||':'||checksum AS id FROM bootstrap_migrations ORDER BY id`)).rows.map(r => String(r.id));
    const counts: Record<string, number> = {};
    for (const t of TABLES) counts[t] = Number((await pool.query(`SELECT count(*) n FROM app.${t}`)).rows[0].n);
    const withdrawn = (await pool.query(`SELECT id FROM app.consent_records WHERE current_status='WITHDRAWN' ORDER BY id`)).rows.map(r => String(r.id));
    const unforced = (await pool.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relkind='r' AND NOT (c.relrowsecurity AND c.relforcerowsecurity) ORDER BY 1`)).rows.map(r => String(r.relname));
    return { migrations, counts, withdrawn_digest: createHash('sha256').update(withdrawn.join('\n')).digest('hex'), withdrawn: withdrawn.length, unforced_tables: unforced };
  } finally { await pool.end(); }
}
function inContainer(container: string, password: string, args: string[], input?: Buffer) {
  const r = spawnSync('docker', ['exec', '-i', '-e', `PGPASSWORD=${password}`, container, ...args], { input, maxBuffer: 1024 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${args[0]} failed: ${String(r.stderr).slice(0, 300).replace(/PGPASSWORD=\S+/g, 'PGPASSWORD=***')}`);
  return r.stdout as Buffer;
}

export async function runDrill(profileName?: string) {
  const profile = loadProfile(profileName);
  const container = `${profile.compose_project}-postgres-1`;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const scratch = `orvia_restore_drill_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const directory = resolve(profile.directory, 'backups'); mkdirSync(directory, { recursive: true, mode: 0o700 });
  const before = await facts(profile, profile.database);
  const started = Date.now();
  const dump = inContainer(container, profile.password, ['pg_dump', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', profile.database, '-Fc', '--no-owner']);
  const backupMs = Date.now() - started;
  const file = resolve(directory, `${profile.database}-${stamp}.dump`);
  writeFileSync(file, dump, { mode: 0o600 });
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  const manifest = { database: profile.database, taken_at: new Date(started).toISOString(), bytes: statSync(file).size, sha256, tool: String(inContainer(container, profile.password, ['pg_dump', '--version'])).trim(), facts: before };
  writeFileSync(`${file}.manifest.json`, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  const bootstrap = connectDatabase({ ...profile, database: 'postgres' }).pool;
  let after: Facts | null = null; let restoreMs: number;
  try {
    await bootstrap.query(`CREATE DATABASE ${scratch}`);
    const restoreStarted = Date.now();
    // Verify the file on disk is the one the manifest names before restoring it.
    if (!fileMatches(file, sha256)) throw new Error('Backup file does not match its manifest');
    inContainer(container, profile.password, ['pg_restore', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', scratch, '--no-owner', '--exit-on-error'], readFileSync(file));
    restoreMs = Date.now() - restoreStarted;
    after = await facts(profile, scratch);
  } finally {
    await bootstrap.query(`DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`).catch(() => {});
    await bootstrap.end();
  }
  const checks = {
    migrations_identical: JSON.stringify(before.migrations) === JSON.stringify(after.migrations),
    counts_identical: TABLES.filter(t => before.counts[t] !== after!.counts[t]),
    withdrawals_preserved: before.withdrawn_digest === after.withdrawn_digest,
    row_security_forced: after.unforced_tables.length === 0,
  };
  const passed = checks.migrations_identical && checks.counts_identical.length === 0 && checks.withdrawals_preserved && checks.row_security_forced;
  const evidence = { profile: profile.profile, backup_file: file.replace(resolve(profile.directory), '<profile>'), backup_path: file, scratch_database: scratch, bytes: manifest.bytes, sha256, backup_ms: backupMs, restore_ms: restoreMs,
    withdrawn_consents: before.withdrawn, migrations: before.migrations.length, counts: before.counts, checks, result: passed ? 'PASS' : 'FAIL',
    limits: ['A logical backup of one database on this host, restored on the same host. Off-host copies, encryption at rest and the customer\'s retention schedule are the customer\'s to configure.',
      'Timings describe this host and data volume; they are not a recovery-time objective for other hardware.'] };
  // The recorded evidence names the file relative to the profile; the absolute path is returned to the caller only.
  writeEvidence('backup-drill', Object.fromEntries(Object.entries(evidence).filter(([k]) => k !== 'backup_path')));
  return evidence;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const confirm = process.argv[2];
  const profile = loadProfile();
  if (confirm !== `confirm:${profile.profile}`) throw new Error(`Run with confirm:${profile.profile}`);
  const result = await runDrill(profile.profile);
  console.log(JSON.stringify({ result: result.result, bytes: result.bytes, backup_ms: result.backup_ms, restore_ms: result.restore_ms, checks: result.checks }, null, 2));
  if (result.result !== 'PASS') process.exitCode = 1;
}
