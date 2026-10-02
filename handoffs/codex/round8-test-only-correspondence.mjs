// Root-reviewed, explicit read-only Git comparison; writes only fresh evidence.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const label = process.argv[2];
assert.equal(process.argv.length, 3);
assert.match(label ?? '', /^[a-z][a-z0-9-]{0,59}$/);
assert.equal(label, 'criteria-readiness', 'Only this approved test-only change may produce correspondence');
const oldCommit = 'd7a10d6a1e707f0e1d57378e5d0f58c9b3c02503';
const build = 'O3vGd-z4HGBxaLp-Fdqh3';
const allowed = ['tests/e2e/vendor-production-criteria-local.ts', 'tracking/qualification-inventory.json'].sort();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const newCommit = git(['rev-parse', 'HEAD']).trim();
assert.match(newCommit, /^[a-f0-9]{40}$/);
assert.notEqual(newCommit, oldCommit);
assert.equal(git(['diff', '--name-only', 'HEAD']).trim(), '', 'Tracked working tree differs from HEAD');
const changes = git(['diff', '--name-status', oldCommit, newCommit]).trim().split(/\r?\n/).map(line => line.split('\t'));
assert.deepEqual(changes.map(row => row[1]).sort(), allowed, 'Only the two exact test/metadata paths may change');
assert.ok(changes.every(row => row.length === 2 && row[0] === 'M'), 'Added/deleted/renamed files refused');
const inventory = commit => git(['ls-tree', '-r', commit]).trim().split(/\r?\n/).filter(line => !allowed.includes(line.split('\t')[1])).sort();
const oldInventory = inventory(oldCommit), newInventory = inventory(newCommit);
assert.deepEqual(newInventory, oldInventory, 'Remaining tracked modes/blobs differ');
assert.equal(readFileSync(resolve(root, 'frontend/.next/BUILD_ID'), 'utf8').trim(), build);
const ledgerPath = 'handoffs/codex/artifacts/R8-final-theta-matrix-exits.jsonl';
const ledgerBytes = readFileSync(resolve(root, ledgerPath));
const rows = ledgerBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
assert.ok(rows.every(row => row.commit === oldCommit && row.build === build));
const finish = rows.filter(row => row.kind === 'FINISH');
assert.equal(finish.length, 1);
assert.deepEqual([finish[0].completed, finish[0].remaining_not_run, finish[0].exit_code], [15, 0, 0]);
const commands = rows.filter(row => row.kind === 'COMMAND');
assert.ok(commands.every(row => row.exit_code === 0 && row.signal === null && row.spawn_error === null));
const suites = ['interface-crawl-local', 'expansion-screens-local', 'audit-mandate-local', 'operations-screens-local', 'sign-in-hydration-local'];
for (const engine of ['chromium', 'webkit', 'firefox']) for (const suite of suites)
  assert.equal(commands.filter(row => row.log === `handoffs/codex/artifacts/R8-final-theta-${engine}-${suite}.log`).length, 1);
const evidence = [{ path: ledgerPath, sha256: hash(ledgerBytes) }];
for (const engine of ['chromium', 'webkit', 'firefox']) {
  const path = `output/playwright/round8/matrix-final-theta/${engine}-screenshots.json`;
  const bytes = readFileSync(resolve(root, path));
  const manifest = JSON.parse(bytes);
  assert.equal(manifest.commit, oldCommit); assert.equal(manifest.build, build);
  assert.ok(manifest.screenshots.length > 0);
  evidence.push({ path, sha256: hash(bytes) });
}
const proof = { version: 1, old_commit: oldCommit, new_commit: newCommit, build,
  changed_paths: allowed, old_inventory: oldInventory, new_inventory: newInventory,
  inventory_sha256: hash(JSON.stringify(oldInventory)), evidence,
  web_marker: 'Known stale only because tracking/qualification-inventory.json changed; not rewritten; no new build or package qualification claimed.' };
const path = `handoffs/codex/artifacts/R8-${label}-test-only-correspondence.json`;
writeFileSync(resolve(root, path), JSON.stringify({ proof, proof_sha256: hash(JSON.stringify(proof)) }, null, 2) + '\n', { flag: 'wx' });
console.log(`Artifact: ${path}`);
