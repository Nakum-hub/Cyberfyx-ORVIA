import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const label = process.argv[2];
if (!/^[a-z0-9-]+$/.test(label ?? '')) throw new Error('Named check pass required');
const prefix = `handoffs/codex/artifacts/R9-checks-${label}`;
if (existsSync(`${prefix}.json`)) throw new Error('Check evidence already exists');
const commands = [
  ['inventory-write', ['--import', 'tsx', 'scripts/qualification-inventory.ts']],
  ...['test', 'contracts:check', 'typecheck', 'lint', 'tracking:check'].map(name => [name.replace(':', '-'), [resolve('.local/tools/package-manager/node_modules/pnpm/bin/pnpm.mjs'), 'run', name]]),
  ['inventory-check', ['--import', 'tsx', 'scripts/qualification-inventory.ts', '--check']],
  ['source-inventory', ['--import', 'tsx', 'scripts/v1-source-inventory.ts', '--check']],
];
const results = [];
for (const [name, args] of commands) {
  const log = `${prefix}-${name}.log`; const output = createWriteStream(log, { flags: 'wx' });
  const started_at = new Date().toISOString();
  const child = spawn(process.execPath, args, { windowsHide: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(output, { end: false }); child.stderr.pipe(output, { end: false });
  const exit_code = await new Promise(done => child.once('close', done));
  await new Promise(done => output.end(done));
  const result = { name, command: [process.execPath, ...args], exit_code, started_at, ended_at: new Date().toISOString(), log };
  results.push(result); console.log(JSON.stringify(result));
}
writeFileSync(`${prefix}.json`, JSON.stringify(results, null, 2) + '\n');
process.exitCode = results.some(r => r.exit_code !== 0) ? 1 : 0;
