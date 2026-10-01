// Preload observes only actual Node launches of these three customer machines.
// It never records environment values, full argv, child output or credentials.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const label = process.env.R8_CUSTODY_LABEL;
if (!label || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(label)) throw new Error('Fresh safe R8_CUSTODY_LABEL required');
const artifact = resolve(root, 'handoffs/codex/artifacts', `R8-${label}-child-custody-${process.pid}-${randomUUID()}.jsonl`);
mkdirSync(dirname(artifact), { recursive: true });
writeFileSync(artifact, '', { flag: 'wx' });
const record = value => appendFileSync(artifact, JSON.stringify({ at: new Date().toISOString(), observer_pid: process.pid, ...value }) + '\n');
const same = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
const targets = [
  ['WORKER', 'services/worker/src/main.ts'],
  ['OPERATIONS_RUNNER', 'services/worker/src/operations-runner.ts'],
  ['AGENT', 'services/agent/src/main.ts'],
].map(([kind, path]) => ({ kind, path: resolve(root, path) }));
const known = new Set(['ORVIA_RELEASE_PRIVATE_KEY', 'ORVIA_LICENCE_PRIVATE_KEY', 'ORVIA_AUDIT_PRIVATE_KEY']);
const original = childProcess.spawn;
childProcess.spawn = function (command, args, options) {
  if (!same(resolve(String(command)), resolve(process.execPath)) || !Array.isArray(args)) return original.apply(this, arguments);
  const cwd = resolve(options?.cwd ?? process.cwd());
  const target = targets.find(t => args.some(arg => typeof arg === 'string' && same(resolve(cwd, arg), t.path)));
  if (!target) return original.apply(this, arguments);
  const env = options?.env ?? process.env;
  const names = Object.entries(env).filter(([name, value]) => value !== undefined && known.has(name.toUpperCase())).map(([name]) => name.toUpperCase()).sort();
  const unsafe = names.length > 0;
  record({ target_kind: target.kind, environment_explicit: options?.env !== undefined,
    has_vendor_private_key_environment: unsafe,
    vendor_private_key_environment_names: names, result: unsafe ? 'REFUSED_BEFORE_LAUNCH' : 'SAFE_BEFORE_LAUNCH' });
  if (unsafe) throw Object.assign(new Error('Customer runtime child custody refused before launch'), { code: 'R8_CUSTODY_REFUSED' });
  if (process.env.R8_CUSTODY_DIAGNOSTIC_SUBSTITUTE === 'fixed-runtime-marker-probe') {
    const harness = resolve(root, 'handoffs/codex/round8-child-custody-differential.mjs');
    if (!process.argv[1] || !same(resolve(process.argv[1]), harness)) throw new Error('Runtime substitution is restricted to the named standalone diagnostic');
    record({ target_kind: target.kind, result: 'DIAGNOSTIC_INNOCUOUS_CHILD_SUBSTITUTION', production_qualification: false });
    const probe = `const known=new Set(['ORVIA_RELEASE_PRIVATE_KEY','ORVIA_LICENCE_PRIVATE_KEY','ORVIA_AUDIT_PRIVATE_KEY']);const report={has_vendor_private_key_environment:Object.keys(process.env).some(name=>known.has(name.toUpperCase())),benign_control_preserved:process.env.R8_BENIGN_CONTROL==='kept',profile_preserved:process.env.ORVIA_PROFILE==='codex-a00'};console.log(JSON.stringify(report));if(report.has_vendor_private_key_environment||!report.benign_control_preserved||!report.profile_preserved)process.exitCode=1;`;
    return original.call(this, process.execPath, ['--input-type=module', '-e', probe], { ...options, windowsHide: true });
  }
  return original.apply(this, arguments);
};
syncBuiltinESMExports();
record({ result: 'OBSERVER_READY', fixed_target_count: targets.length });
