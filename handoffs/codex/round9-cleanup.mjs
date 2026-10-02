// Stop only containers started/created for this round; never delete volumes.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
if (!existsSync('handoffs/codex/artifacts/R9-run3-results.json')) throw new Error('Final runtime pass is not complete');
const output = 'handoffs/codex/artifacts/R9-runtime-cleanup.json';
if (existsSync(output)) throw new Error('Cleanup already recorded');
const owned = ['orvia-qualification-20260930-postgres', 'orvia-qualification-20260930-loopback',
  'orvia-codex-a00-temporal-1', 'orvia-codex-a00-postgres-1', 'orvia-round9-opa', 'orvia-round9-temporal-loopback'];
const preserved = 'orvia-codex-a00-opa-1';
const state = name => {
  const r = spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', name], { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw new Error(`Cannot inspect ${name}`);
  return { name, running: r.stdout.trim() === 'true' };
};
const before = [...owned, preserved].map(state);
const stopped = spawnSync('docker', ['stop', '--time', '20', ...owned], { encoding: 'utf8', windowsHide: true });
const after = [...owned, preserved].map(state);
const record = { recorded_at: new Date().toISOString(), command: ['docker', 'stop', '--time', '20', ...owned],
  exit_code: stopped.status, before, after, volumes_deleted: false,
  original_opa_preserved: before.at(-1).running === after.at(-1).running,
  source: JSON.parse(readFileSync('handoffs/codex/artifacts/R9-run3-results.json', 'utf8')).head };
writeFileSync(output, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record));
process.exitCode = stopped.status === 0 && after.slice(0, -1).every(s => !s.running) && record.original_opa_preserved ? 0 : 1;
