// Executes the actual app-run start factory extracted with TypeScript's AST,
// without importing app-run's database/bootstrap/supervisor lifecycle.
// The guarded observer substitutes an innocuous process for fixed machine
// targets. This diagnostic starts no actual worker, agent, DB or HTTP service.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { once } from 'node:events';
import ts from 'typescript';
import childProcess from 'node:child_process';
import { customerEnvironment } from '../../scripts/credentials.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(resolve(process.cwd()), root, 'Run from the Round 8 worktree');
const label = process.env.R8_CUSTODY_LABEL;
assert.match(label ?? '', /^[a-z0-9][a-z0-9-]{0,59}$/);
assert.equal(process.env.ORVIA_PROFILE, 'codex-a00', 'Named synthetic profile required');
process.env.R8_CUSTODY_DIAGNOSTIC_SUBSTITUTE = 'fixed-runtime-marker-probe';
await import('./round8-child-custody-observer.mjs');
const source = readFileSync(resolve(root, 'scripts/app-run.ts'), 'utf8');
const tree = ts.createSourceFile('app-run.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const candidates = tree.statements.filter(ts.isVariableStatement).filter(statement => statement.declarationList.declarations.some(
  declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'start'));
assert.equal(candidates.length, 1, 'Extract one real start factory');
const after = candidates[0].getText(tree);
const patch = readFileSync(resolve(root, 'handoffs/codex/round8-runtime-custody.patch'), 'utf8');
const before = patch.split(/\r?\n/).find(line => line.startsWith('-const start=(args:string[],name:string,'))?.slice(1);
assert.ok(before, 'The proposed patch retains the exact original factory');
const markers = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/PRIVATE_KEY/i.test(name)));
Object.assign(markers, { ORVIA_PROFILE: 'codex-a00', ORVIA_WORKSPACE_ROOT: root, R8_BENIGN_CONTROL: 'kept',
  ORVIA_RELEASE_PRIVATE_KEY: 'harmless-release-marker', ORVIA_LICENCE_PRIVATE_KEY: 'harmless-licence-marker',
  ORVIA_AUDIT_PRIVATE_KEY: 'harmless-audit-marker', r8_mixed_Private_Key: 'harmless-extra-marker' });
const make = text => {
  const children = []; const names = new Map();
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const factory = vm.runInNewContext(js + '\nstart;', { spawn: childProcess.spawn, process: {
    execPath: process.execPath, env: markers, cwd: () => root,
  }, p: { profile: 'codex-a00' }, customerEnvironment, children, names });
  return { factory, children };
};
const prior = make(before); let beforeCode;
try { prior.factory(['--import', 'tsx', 'services/worker/src/main.ts'], 'worker'); }
catch (error) { beforeCode = error.code; }
assert.equal(beforeCode, 'R8_CUSTODY_REFUSED', 'Broken original factory is refused before an actual launch');
assert.equal(prior.children.length, 0, 'No original unsafe child launched');
const current = make(after); const results = [];
for (const [kind, path] of [['WORKER', 'services/worker/src/main.ts'], ['OPERATIONS_RUNNER', 'services/worker/src/operations-runner.ts'], ['AGENT', 'services/agent/src/main.ts']]) {
  // app-run normally inherits its console. Override only diagnostic stdio at
  // the observer's original spawn boundary by letting this probe report there;
  // the observer artifact still records the exact env from the actual factory.
  const child = current.factory(['--import', 'tsx', path], kind.toLowerCase());
  const [exit] = await once(child, 'close');
  assert.equal(exit, 0, 'Innocuous diagnostic child exits successfully');
  results.push({ target_kind: kind, exit_code: exit, actual_factory_executed: true, actual_worker_started: false });
}
assert.equal(current.children.length, 3, 'Actual current factory registered all three owned probe children');
const report = { diagnostic_only: true, before_expected_refusal: beforeCode, before_children_launched: prior.children.length,
  after_probe_children: results, after_factory_source: 'CURRENT_APP_RUN_AST_EXTRACTED_UNCHANGED',
  policy_or_production_acceptance: 'NOT_ASSERTED',
  limitation: 'Actual factory and spawn env wiring exercised; fixed service launches replaced with innocuous marker processes. No runtime/DB effects.' };
writeFileSync(resolve(root, 'handoffs/codex/artifacts', `R8-${label}-child-custody-differential.json`), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));
