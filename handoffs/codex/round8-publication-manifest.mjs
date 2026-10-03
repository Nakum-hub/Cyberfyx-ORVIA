// Source-only publication selection. No Git mutations, runtime, staging or secret output.
// Run only after final qualification: node this-file publication-label final-theta feature-iota
//   handoffs/codex/artifacts/R8-criteria-readiness-test-only-correspondence.json
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = process.argv.slice(2);
const reviewFlags = cli.filter(value => value.startsWith('--review-only='));
assert.ok(reviewFlags.length <= 1);
const reviewHead = reviewFlags.length ? reviewFlags[0].slice('--review-only='.length) : null;
if (reviewHead) assert.match(reviewHead, /^[a-f0-9]{40}$/);
const args = cli.filter(value => !value.startsWith('--review-only='));
const [label, matrixLabel, featureLabel, correspondencePath] = args;
assert.ok([3, 4].includes(args.length), 'Supply labels, optional correspondence artifact, and explicit review-only HEAD if needed');
for (const value of [label, matrixLabel, featureLabel]) assert.match(value ?? '', /^[a-z][a-z0-9-]{0,59}$/);
const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
assert.equal(realpathSync(process.cwd()), root, 'Run from the frozen Round 8 worktree');
if (reviewHead) assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true, encoding: 'utf8' }).trim(), reviewHead, 'Review publication HEAD differs');
const records = new Map();
const queue = [];
const vendorWindows = [];
const safe = candidate => {
  const absolute = resolve(root, candidate);
  const local = relative(root, absolute).split(sep).join('/');
  assert.ok(local && !local.startsWith('../') && !local.startsWith('/') && !local.includes(':'), 'Path escapes worktree');
  assert.ok(local.startsWith('handoffs/') || local.startsWith('output/playwright/round8/'), 'Outside approved publication roots');
  assert.ok(!/(^|\/)(\.local|node_modules|\.next|build|dist|credentials|signing|profiles)(\/|$)/i.test(local), 'Private/dependency/build path refused');
  assert.ok(!/\.(pem|key|pfx|p12)$/i.test(local), 'Key file refused');
  assert.ok(existsSync(absolute), `Required publication file missing: ${local}`);
  assert.ok(lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink(), 'Only regular files');
  assert.equal(realpathSync(absolute), absolute, 'Resolved publication path differs');
  return { absolute, local };
};
function add(candidate, provenance, markdown = false) {
  let { absolute, local } = safe(candidate);
  if (local === 'handoffs/codex/artifacts/R8-body-trace-webkit-operations.log') {
    const original = readFileSync(absolute);
    assert.equal(original.length, 3366, 'Approved historical log byte count changed');
    assert.equal(createHash('sha256').update(original).digest('hex'), '731d21e71b759f860d155e381edf5ec01eb35269644958cff719388120ac2ffb', 'Approved historical log digest changed');
    const derived = safe('handoffs/codex/artifacts/R8-body-trace-webkit-operations-lossless.json');
    const metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(derived.absolute)));
    const expectedKeys = ['diagnostic_only', 'source_file', 'source_sha256', 'source_bytes', 'nul_count', 'encoding', 'publication_encoding', 'original_unchanged', 'text'];
    if ('decoded_nul_count' in metadata) expectedKeys.push('decoded_nul_count');
    assert.deepEqual(Object.keys(metadata).sort(), expectedKeys.sort(), 'Unexpected historical derivative schema');
    assert.equal(metadata.diagnostic_only, true); assert.equal(metadata.source_file, local);
    assert.equal(metadata.source_sha256, createHash('sha256').update(original).digest('hex'));
    assert.equal(metadata.source_bytes, original.length); assert.equal(metadata.original_unchanged, true);
    assert.equal(metadata.encoding, 'UTF16LE_BOM'); assert.equal(metadata.publication_encoding, 'UTF8_JSON_ESCAPED');
    assert.equal(metadata.nul_count, original.reduce((sum, byte) => sum + Number(byte === 0), 0));
    assert.deepEqual([...original.subarray(0, 2)], [255, 254]);
    const decoded = new TextDecoder('utf-16le', { fatal: true, ignoreBOM: true }).decode(original.subarray(2));
    assert.equal(metadata.text, decoded); assert.equal(decoded.includes('\u0000'), false);
    if ('decoded_nul_count' in metadata) assert.equal(metadata.decoded_nul_count, 0);
    const reconstructed = Buffer.concat([Buffer.from([255, 254]), Buffer.from(metadata.text, 'utf16le')]);
    assert.equal(reconstructed.equals(original), true, 'Historical derivative is not lossless');
    provenance += '; exact UTF16LE/BOM lossless JSON representation, original raw retained unchanged locally';
    absolute = derived.absolute; local = derived.local;
  }
  const existing = records.get(local);
  if (existing) { existing.provenance.add(provenance); return; }
  records.set(local, { path: local, bytes: lstatSync(absolute).size, provenance: new Set([provenance]), binary: extname(local).toLowerCase() === '.png' });
  if (markdown) queue.push(local);
}
const docs = [
  '2026-10-01-round8.md', 'round8-source-commit-manifest.md', 'round8-applied-fix-evidence-table.md',
  'round8-frozen-zeta-integration-review.md', 'round8-frozen-epsilon-integration-review.md',
  'round8-frozen-delta-integration-review.md', 'round8-integration-review.md', 'round8-command-evidence-review.md',
  'round8-final-source-publication-review.md', 'round8-pagination-review.md',
  'round8-uncertain-recovery-independent-review.md', 'round8-verification-guard-actual-gate-review.md',
  'round8-frozen-zeta-feature-review.md', 'round8-frozen-zeta-security-review.md',
  'round8-frozen-eta-integration-review.md', 'round8-worker-bundle-correspondence-review.md',
  'round8-workflow-bundle-build-review.md', 'round8-zeta-workflow-failure-review.md',
  'round8-frozen-eta-feature-review.md', 'round8-frozen-eta-security-review.md',
  'round8-frozen-iota-integration-review.md',
  'round8-original-browser-failures-review.md',
  'round8-unmerged-upstream-next-dependency.md', 'round8-upstream-rev110-feature-review.md',
  'round8-upstream-rev110-security-review.md',
  'round8-scoped-publication-proposal.md',
  'round8-scoped-fixes-review.md', 'round8-vendor-policy-observability-proposal.md',
];
for (const doc of docs) add(`handoffs/codex/${doc}`, 'explicit approved document', true);
add('handoffs/codex/round8-publication-manifest.mjs', 'exact publication selector source');
add('handoffs/codex/round8-test-only-correspondence.mjs', 'exact bounded correspondence producer source');
add('handoffs/codex/round8-grc-prerequisite-completion.mjs', 'exact narrow GRC prerequisite completion source');
add('handoffs/codex/round8-stage-publication.mjs', 'exact bounded staging helper source; not executed by selector');
add('handoffs/codex/round8-complete-grc.ps1', 'exact root completion and cleanup pipeline source');
for (const name of [
  'round8-grc-unexecuted-suite.mjs', 'round8-vendor-team-failure-diagnostic.mjs',
  'round8-vendor-policy-prerequisite.mjs', 'round8-relay-graceful-shutdown-candidate.mjs',
  'round8-relay-stop-diagnostic.mjs', 'round8-relay-test-fixture.mjs', 'round8-scoped-fixes-correspondence.mjs',
]) add(`handoffs/codex/${name}`, 'actual scoped diagnostic/correspondence source; bounded review evidence');
for (const name of [
  'R8-vendor-policy-observability-before.log', 'R8-vendor-policy-observability-after.log',
  'R8-relay-stop-alpha.log', 'R8-relay-stop-beta.log', 'R8-relay-stop-gamma.log',
  'R8-relay-stop-alpha-relay-stop-diagnostic.jsonl', 'R8-relay-stop-beta-relay-stop-diagnostic.jsonl',
  'R8-relay-stop-gamma-relay-stop-diagnostic.jsonl', 'R8-scoped-fixes-beta-scoped-fixes-correspondence.json',
  'R8-scoped-fixes-lint.log', 'R8-scoped-fixes-inventory-generate.log', 'R8-scoped-fixes-inventory-check.log',
  'R8-scoped-fixes-typecheck.log', 'R8-scoped-fixes-source-scan.txt', 'R8-scoped-fixes-source-scan.log',
  'R8-scoped-fixes-source-publication-private-material-scan.json',
  'R8-scoped-fixes-source-review-push.json',
]) add(`handoffs/codex/artifacts/${name}`, 'actual scoped BEFORE/AFTER/cleanup/static evidence; historical failures retained');
for (const name of ['round8-vendor-session-navigation-trace.mjs', 'round8-vendor-session-controlled-navigation.mjs'])
  add(`handoffs/codex/${name}`, 'exact session-navigation diagnostic helper source');
for (const name of [
  'R8-criteria-session-navigation-before.log', 'R8-criteria-session-navigation-controlled.log',
  'R8-criteria-trace-alpha-session-navigation.jsonl', 'R8-criteria-trace-alpha-webkit-vendor-production-criteria-local-diagnostic.jsonl',
  'R8-criteria-controlled-alpha-controlled-session-navigation.jsonl', 'R8-criteria-controlled-alpha-session-navigation.jsonl',
  'R8-criteria-controlled-alpha-webkit-vendor-production-criteria-local-diagnostic.jsonl',
]) add(`handoffs/codex/artifacts/${name}`, 'actual diagnostic navigation history, not original cause proof');
for (const name of [
  'R7V-journey-settled-webkit-operations-screens-local-diagnostic.jsonl',
  'R7V-journey-settled-chromium-audit-mandate-local-diagnostic.jsonl',
  'R8-body-trace-webkit-operations-screens-local-requests.jsonl',
  'R8-audit-baseline-chromium-audit-mandate-local-requests.jsonl',
  'R8-audit-renewed-chromium-audit-mandate-local-requests.jsonl',
  'R8-audit-scoped-chromium-audit-mandate-local-requests.jsonl',
  'R8-crawl-measured-interruption.json',
]) add(`handoffs/codex/artifacts/${name}`, 'exact original/later browser diagnostics, causation bounded');
const readJson = path => JSON.parse(readFileSync(safe(path).absolute, 'utf8'));
const readRows = path => readFileSync(safe(path).absolute, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let correspondence;
if (correspondencePath) {
  assert.equal(correspondencePath, 'handoffs/codex/artifacts/R8-criteria-readiness-test-only-correspondence.json');
  add(correspondencePath, 'strict test-only source correspondence');
  const wrapper = readJson(correspondencePath);
  assert.equal(hash(JSON.stringify(wrapper.proof)), wrapper.proof_sha256, 'Correspondence digest mismatch');
  correspondence = wrapper.proof;
  assert.equal(correspondence.version, 1);
  assert.equal(correspondence.old_commit, 'd7a10d6a1e707f0e1d57378e5d0f58c9b3c02503');
  assert.match(correspondence.new_commit, /^[a-f0-9]{40}$/);
  assert.notEqual(correspondence.new_commit, correspondence.old_commit);
  assert.equal(correspondence.build, 'O3vGd-z4HGBxaLp-Fdqh3');
  assert.deepEqual(correspondence.changed_paths, ['tests/e2e/vendor-production-criteria-local.ts', 'tracking/qualification-inventory.json']);
  assert.deepEqual(correspondence.old_inventory, correspondence.new_inventory);
  assert.ok(correspondence.old_inventory.length > 0);
  assert.equal(hash(JSON.stringify(correspondence.old_inventory)), correspondence.inventory_sha256);
  assert.equal(matrixLabel, 'final-theta', 'Correspondence is only for the preserved theta matrix');
  const expectedEvidence = ['handoffs/codex/artifacts/R8-final-theta-matrix-exits.jsonl', ...['chromium', 'webkit', 'firefox'].map(engine => `output/playwright/round8/matrix-final-theta/${engine}-screenshots.json`)];
  assert.deepEqual(correspondence.evidence.map(item => item.path), expectedEvidence);
  for (const item of correspondence.evidence) assert.equal(hash(readFileSync(safe(item.path).absolute)), item.sha256, 'Preserved evidence changed');
}
function log(path, provenance) {
  assert.ok(/^handoffs\/(codex|code)\/artifacts\/.+\.log$/.test(path), 'Log outside recognized artifacts');
  add(path, provenance);
  const content = readFileSync(safe(path).absolute, 'utf8');
  for (const match of content.matchAll(/(?:^|\n)(?:Artifact: |artifact: )(handoffs\/(?:codex|code)\/artifacts\/[^\r\n]+)/g)) {
    add(match[1].trim(), `artifact referenced by ${path}`);
  }
  // Structured helpers emit artifact metadata instead of an Artifact: line.
  for (const line of content.split(/\r?\n/)) {
    if (!line.startsWith('{')) continue;
    try {
      const value = JSON.parse(line);
      if (typeof value.artifact === 'string' && /^handoffs\/(codex|code)\/artifacts\//.test(value.artifact)) add(value.artifact, `structured artifact from ${path}`);
    } catch (error) { if (error instanceof SyntaxError) continue; throw error; }
  }
}
const commandLedger = 'handoffs/codex/artifacts/R8-command-ledger.jsonl';
add(commandLedger, 'actual command ledger');
for (const row of readRows(commandLedger)) {
  if (row.log) log(row.log, `command ledger: exit ${row.exit_code}`);
  if (row.log && /vendor.*practice|practice.*vendor/.test(row.log)) vendorWindows.push([row.started_at, row.ended_at]);
}
add('handoffs/codex/artifacts/R8-source-review-push.json', 'review-source push, not final acceptance');
add('handoffs/codex/artifacts/R8-worker-bundle-source-review-push.json', 'updated candidate source-review push, not final acceptance');
for (const name of [
  'R8-criteria-readiness-source-review-push.json', 'R8-criteria-readiness-source-scan.txt',
  'R8-criteria-readiness-source-publication-private-material-scan.json',
  'R8-criteria-readiness-source-corrected-publication-private-material-scan.json',
]) add(`handoffs/codex/artifacts/${name}`, 'source review publication/scanner history, not final qualification');
for (const name of ['R8-criteria-readiness-source-scan.log', 'R8-criteria-readiness-source-scan-corrected.log'])
  log(`handoffs/codex/artifacts/${name}`, 'scanner failure/correction retained');
log('handoffs/codex/artifacts/R8-final-eta-key-custody.log', 'executed final eta key custody');
add('handoffs/codex/artifacts/R8-key-custody-eta-final.json', 'exact final eta key custody result');
add('handoffs/codex/artifacts/R8-final-eta-interruption.json', 'preserved incomplete browser run, not acceptance');
add('handoffs/codex/artifacts/R8-final-eta-docker-memory-failure-observation.json', 'preserved fatal allocation observation, not cause proof');
add('handoffs/codex/artifacts/R8-frozen-eta-interruption.json', 'preserved interrupted integration run');
log('handoffs/codex/artifacts/R8-frozen-eta-integrations-03-operations-notice-language-drift.log', 'started third eta suite without normal completed exit');
add('handoffs/codex/round8-policy-prerequisite.mjs', 'exact bounded policy prerequisite source');
add('handoffs/codex/artifacts/R8-iota-before-battery-policy-prerequisite.json', 'actual iota policy dependency readiness, not business retry');
add('handoffs/codex/artifacts/R8-iota-relay-cleanup-completion.json', 'separate owned relay cleanup completion; original suite failure retained');
log('handoffs/codex/artifacts/R8-final-iota-policy-prerequisite.log', 'actual iota prerequisite command');
// Retain interrupted browser evidence without imposing final acceptance on it.
for (const [runLabel, suffix] of [['final-eta', 'matrix-exits'], ['feature-eta', 'feature-browser-exits'], ['feature-theta', 'feature-browser-exits']]) {
  const path = `handoffs/codex/artifacts/R8-${runLabel}-${suffix}.jsonl`;
  if (!existsSync(resolve(root, path))) continue;
  add(path, 'historical interrupted eta browser ledger');
  for (const row of readRows(path)) {
    if (row.log) {
      log(row.log, `historical ${runLabel} browser exit ${row.exit_code}`);
      const diagnostic = row.log.replace(/\.log$/, '-diagnostic.jsonl');
      if (existsSync(resolve(root, diagnostic))) add(diagnostic, `historical ${runLabel} child diagnostics`);
    }
    if (row.screenshot_manifest) add(row.screenshot_manifest, 'historical eta screenshot provenance');
  }
}
const preservation = 'handoffs/codex/artifacts/R8-tracked-post-theta-screenshot-preservation.json';
if (existsSync(resolve(root, preservation))) {
  add(preservation, 'optional unqualified tracked-output preservation metadata');
  const preserved = readJson(preservation);
  assert.equal(preserved.length, 9, 'Only the exact nine tracked-output archives are approved');
  for (const item of preserved) {
    assert.equal(item.qualification, false, 'Preservation cannot be qualification');
    assert.ok(item.archive.startsWith('output/playwright/round8/tracked-post-theta/'));
    const bytes = readFileSync(safe(item.archive).absolute);
    assert.equal(bytes.length, item.bytes); assert.equal(hash(bytes), item.sha256);
    add(item.archive, 'unqualified diagnostic preservation, exact bytes/digest');
  }
}
for (const engine of ['chromium', 'webkit', 'firefox']) {
  const path = `output/playwright/round8/matrix-final-eta/${engine}-screenshots.json`;
  if (!existsSync(resolve(root, path))) continue;
  add(path, 'historical interrupted eta screenshot manifest');
  const manifest = readJson(path);
  for (const shot of manifest.screenshots ?? []) {
    assert.ok(typeof shot.name === 'string' && !shot.name.includes('/') && !shot.name.includes('\\'), 'Invalid historical screenshot filename');
    const screenshot = resolve(manifest.destination, shot.name);
    const bytes = readFileSync(safe(screenshot).absolute);
    assert.equal(bytes.length, shot.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), shot.sha256);
    add(screenshot, 'historical eta screenshot; not current acceptance');
  }
}
let qualificationIdentity;
let supplementedCoverage = false;
for (const run of ['frozen-alpha', 'frozen-delta', 'frozen-epsilon', 'frozen-zeta', 'frozen-eta', 'frozen-iota']) {
  const path = `handoffs/codex/artifacts/R8-${run}-integrations.jsonl`;
  add(path, `preserved integration history ${run}`);
  const rows = readRows(path);
  for (const row of rows) {
    if (row.log) log(row.log, `${run}: ${row.suite} exit ${row.exit_code}`);
    if (row.suite === 'tests/integration/vendor/audit-practice.test.ts') vendorWindows.push([row.started_at, row.ended_at]);
  }
  const summary = path.replace(/\.jsonl$/, '.json');
  if (existsSync(resolve(root, summary))) add(summary, `${run} summary`);
  if (run === 'frozen-iota') {
    assert.equal(rows.length, 44, 'Final 44 suites incomplete');
    assert.equal(new Set(rows.map(row => row.suite)).size, 44, 'Duplicate final suites');
    assert.ok(existsSync(resolve(root, summary)), 'Final integration summary missing');
    const originalSummary = readJson(summary);
    assert.deepEqual(originalSummary.results, rows, 'Final integration summary/ledger differ');
    const candidates = new Set(rows.map(row => `${row.commit}/${row.build}`));
    assert.equal(candidates.size, 1, 'Final integrations mix candidates');
    qualificationIdentity = [...candidates][0];
    if (correspondence) assert.equal(qualificationIdentity, `${correspondence.new_commit}/${correspondence.build}`);
    const failures = rows.filter(row => row.status !== 'PASS' || row.exit_code !== 0);
    if (reviewHead) {
      const impact = readJson('handoffs/codex/artifacts/R8-scoped-fixes-beta-scoped-fixes-correspondence.json');
      assert.equal(impact.baseline, '3caf3b7cba1703e42018e6ba43af80ab4206287e');
      assert.equal(impact.new_build_qualification, false);
      assert.equal(impact.frontend_source_unchanged, true);
      const approvedChanges = ['backend/api/src/vendor/authority.ts', 'backend/api/src/vendor/dependency-errors.ts', 'infrastructure/loopback.mjs', 'tests/unit/vendor-dependency-diagnostics.test.ts', 'tracking/qualification-inventory.json'];
      assert.deepEqual(impact.changed_paths, approvedChanges);
      const actualChanges = execFileSync('git', ['diff', '--name-status', impact.baseline, reviewHead], { cwd: root, windowsHide: true, encoding: 'utf8' }).trim().split(/\r?\n/).map(line => line.split('\t'));
      assert.deepEqual(actualChanges.map(row => row[1]).sort(), approvedChanges);
      assert.ok(actualChanges.every(row => row[0] === 'M' && row.length === 2));
      for (const path of approvedChanges) {
        const item = impact.source_sha256.find(row => row.path === path);
        assert.ok(item); assert.equal(hash(readFileSync(resolve(root, path))), item.sha256, 'Review correction bytes differ from scoped proof');
      }
      assert.equal(rows.filter(row => row.status === 'PASS').length, 40);
      assert.equal(failures.length, 4, 'Review-only mode preserves exactly the actual four original failures');
      const expectedFailures = [
        ['tests/integration/grc/http.test.ts', null], ['tests/integration/operations/runner.test.ts', 1],
        ['tests/integration/regression/regression.test.ts', 0], ['tests/integration/vendor/audit-practice.test.ts', 1],
      ];
      for (const [suite, exit] of expectedFailures) {
        const row = failures.find(item => item.suite === suite);
        assert.ok(row); assert.equal(row.status, 'FAIL'); assert.equal(row.exit_code, exit); assert.equal(row.signal, null);
      }
      assert.equal(failures.find(row => row.suite === 'tests/integration/grc/http.test.ts').prerequisite_error, 'Set an independently owned ORVIA_GRC_OPA_PORT');
      assert.equal(failures.find(row => row.suite === 'tests/integration/regression/regression.test.ts').cleanup_error, 'Dependency command failed: docker stop (exit null)');
      assert.ok(rows.filter(row => row.status === 'PASS').every(row => row.exit_code === 0 && row.signal === null && !row.cleanup_error));
      const completionLedger = 'handoffs/codex/artifacts/R8-grc-unexecuted-lambda-integrations.jsonl';
      const completionSummary = completionLedger.replace(/\.jsonl$/, '.json');
      add(completionLedger, 'actual previously unexecuted GRC path, not original battery acceptance');
      add(completionSummary, 'actual targeted GRC summary');
      const completed = readRows(completionLedger), metadata = readJson(completionSummary);
      assert.equal(completed.length, 1); assert.deepEqual(metadata.results, completed);
      assert.equal(metadata.mode, 'grc-unexecuted-suite');
      const control = completed[0];
      assert.equal(control.suite, 'tests/integration/grc/http.test.ts'); assert.equal(control.status, 'PASS');
      assert.equal(control.exit_code, 0); assert.equal(control.signal, null); assert.equal(control.cleanup_error, undefined);
      assert.equal(`${control.commit}/${control.build}`, qualificationIdentity);
      log(control.log, 'actual targeted GRC command/owned cleanup');
      const content = readFileSync(safe(control.log).absolute, 'utf8');
      const match = /(?:^|\n)Artifact: (handoffs\/codex\/artifacts\/[^\r\n]+)/.exec(content);
      assert.ok(match);
      const result = readJson(match[1]);
      assert.equal(result.result, 'PASS'); assert.equal(result.opa_port, 58281);
      const expected = [...readFileSync(resolve(root, 'tests/integration/grc/http.test.ts'), 'utf8').matchAll(/\bcheck\('([^']+)'/g)].map(item => item[1]);
      assert.equal(expected.length, 57); assert.deepEqual(result.results.map(item => item.name), expected);
      assert.ok(result.results.every(item => item.result === 'PASS'));
      const runtimePath = 'handoffs/codex/artifacts/R8-lambda-grc-runtime-cleanup.json';
      add(runtimePath, 'actual targeted GRC and runtime cleanup');
      const runtime = readJson(runtimePath);
      assert.equal(`${runtime.source}/${runtime.build}`, qualificationIdentity);
      assert.equal(runtime.suite_exit_code, 0); assert.equal(runtime.metadata_exit_code, 0); assert.equal(runtime.runtime_off_exit_code, 0);
      assert.equal(runtime.original_battery_failures_retained, true);
      const commands = readRows(commandLedger);
      assert.ok(commands.some(row => row.log === 'handoffs/codex/artifacts/R8-frozen-integrations-iota.log' && row.exit_code === 1));
      assert.ok(commands.some(row => row.log === 'handoffs/codex/artifacts/R8-final-lambda-grc-unexecuted.log' && row.exit_code === 0));
      log('handoffs/codex/artifacts/R8-final-lambda-postinit-after-grc.log', 'actual targeted post-metadata');
      add('handoffs/codex/artifacts/R8-lambda-after-grc-postinit0087-metadata.json', 'actual targeted metadata');
    } else if (failures.length) {
      assert.equal(failures.length, 1, 'Only the sole pre-dispatch GRC prerequisite omission may be supplemented');
      const failure = failures[0];
      assert.equal(failure.suite, 'tests/integration/grc/http.test.ts');
      assert.equal(failure.status, 'FAIL'); assert.equal(failure.exit_code, null); assert.equal(failure.signal, null);
      assert.equal(failure.prerequisite_error, 'Set an independently owned ORVIA_GRC_OPA_PORT');
      assert.equal(failure.spawn_error, undefined); assert.equal(failure.cleanup_error, undefined);
      assert.ok(rows.filter(row => row !== failure).every(row => row.status === 'PASS' && row.exit_code === 0 && row.signal === null && !row.cleanup_error && !row.prerequisite_error));
      const refusal = readFileSync(safe(failure.log).absolute, 'utf8');
      assert.ok(refusal.includes('Dependency setup failed: Set an independently owned ORVIA_GRC_OPA_PORT'));
      assert.ok(!/^PASS |^FAIL |^Artifact:|assertions, /m.test(refusal), 'Original GRC business fixture dispatched');
      const completionLabel = 'grc-completion-kappa';
      const completionLedger = `handoffs/codex/artifacts/R8-${completionLabel}-integrations.jsonl`;
      const completionSummary = completionLedger.replace(/\.jsonl$/, '.json');
      add(completionLedger, 'same-candidate sole GRC completion; original failure retained');
      add(completionSummary, 'sole GRC completion summary');
      const completed = readRows(completionLedger), metadata = readJson(completionSummary);
      assert.equal(completed.length, 1); assert.deepEqual(metadata.results, completed);
      assert.equal(metadata.mode, 'grc-prerequisite-completion');
      const control = completed[0];
      assert.equal(control.suite, failure.suite); assert.equal(control.status, 'PASS');
      assert.equal(control.exit_code, 0); assert.equal(control.signal, null);
      assert.equal(control.cleanup_error, undefined); assert.equal(control.prerequisite_error, undefined); assert.equal(control.spawn_error, undefined);
      assert.equal(`${control.commit}/${control.build}`, qualificationIdentity);
      assert.equal(`${metadata.commit}/${metadata.build}`, qualificationIdentity);
      log(control.log, 'actual GRC completion command and owned cleanup');
      const content = readFileSync(safe(control.log).absolute, 'utf8');
      const markers = content.split(/\r?\n/).filter(line => line.startsWith('{')).flatMap(line => {
        try { return [JSON.parse(line)]; } catch { return []; }
      });
      assert.ok(markers.some(row => row.prerequisite === 'MACHINE_ENROLLMENT' && row.code === 0 && row.signal === null));
      const docker = markers.filter(row => row.prerequisite_command?.[0] === 'docker');
      assert.ok(docker.length && docker.every(row => row.exit_code === 0 && row.signal === null));
      const created = docker.filter(row => row.prerequisite_command[1] === 'create');
      assert.equal(created.length, 1);
      const args = created[0].prerequisite_command;
      const opa = args[args.indexOf('--name') + 1];
      assert.equal(opa, `orvia-round8-${completionLabel}-grc-opa`);
      assert.ok(args.includes('127.0.0.1:58281:8181'));
      assert.ok(args.includes(`orvia.round8.run=${completionLabel}`));
      for (const operation of ['start', 'stop', 'rm']) assert.ok(docker.some(row => row.prerequisite_command[1] === operation && row.prerequisite_command.includes(opa)), 'Owned GRC cleanup/start missing');
      assert.ok(content.includes('Dependency ready: independent GRC policy'));
      assert.ok(!content.includes('Dependency cleanup failed:'));
      const artifactMatch = /(?:^|\n)Artifact: (handoffs\/codex\/artifacts\/[^\r\n]+)/.exec(content);
      assert.ok(artifactMatch, 'Genuine GRC assertion artifact missing');
      const result = readJson(artifactMatch[1]);
      assert.equal(result.result, 'PASS'); assert.equal(result.opa_port, 58281);
      const source = readFileSync(resolve(root, 'tests/integration/grc/http.test.ts'), 'utf8');
      const expectedNames = [...source.matchAll(/\bcheck\('([^']+)'/g)].map(match => match[1]);
      assert.equal(expectedNames.length, 57, 'GRC declared static controls changed; review required');
      assert.deepEqual(result.results.map(item => item.name), expectedNames, 'GRC actual controls incomplete/different');
      assert.ok(result.results.every(item => item.result === 'PASS'));
      const commands = readRows(commandLedger);
      assert.ok(commands.some(row => row.log === 'handoffs/codex/artifacts/R8-frozen-integrations-iota.log' && row.exit_code === 1), 'Original outer exit 1 not retained');
      assert.ok(commands.some(row => row.log === 'handoffs/codex/artifacts/R8-final-kappa-grc-prerequisite-completion.log' && row.exit_code === 0), 'Completion wrapper exit 0 missing');
      log('handoffs/codex/artifacts/R8-final-kappa-postinit-after-grc.log', 'post-completion metadata check');
      add('handoffs/codex/artifacts/R8-kappa-after-grc-postinit0087-metadata.json', 'actual metadata after GRC completion');
      assert.ok(commands.some(row => row.log === 'handoffs/codex/artifacts/R8-final-kappa-postinit-after-grc.log' && row.exit_code === 0), 'Post-completion metadata command exit 0 missing');
      const runtimePath = 'handoffs/codex/artifacts/R8-kappa-runtime-completion.json';
      add(runtimePath, 'actual completion pipeline and final runtime shutdown');
      const runtime = readJson(runtimePath);
      assert.equal(runtime.exit_code, 0); assert.equal(runtime.failure, null);
      assert.equal(`${runtime.source}/${runtime.build}`, qualificationIdentity);
      assert.ok(runtime.commands.some(row => JSON.stringify(row.command) === JSON.stringify(['round7-runtime.ps1', 'off']) && row.exit_code === 0), 'Runtime off exit 0 missing');
      supplementedCoverage = true;
    } else assert.ok(rows.every(row => row.signal === null), 'Final integration signals invalid');
  }
}
// This one known suite writes no Artifact: line. Select its known filename shape
// only when its timestamp falls inside an actually executed command/suite window.
const vendorDirectory = 'handoffs/code/artifacts';
for (const name of readdirSync(resolve(root, vendorDirectory))) {
  const match = /^audit-practice-(\d{4}-\d{2}-\d{2}T)(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/.exec(name);
  if (!match) continue;
  const at = Date.parse(`${match[1]}${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`);
  if (vendorWindows.some(([start, end]) => at >= Date.parse(start) && at <= Date.parse(end))) add(`${vendorDirectory}/${name}`, 'actual vendor suite result timestamp within executed window');
}
for (const [kind, runLabel, suffix, expected] of [
  ['matrix', matrixLabel, 'matrix-exits', 15], ['feature', featureLabel, 'feature-browser-exits', 6],
]) {
  const path = `handoffs/codex/artifacts/R8-${runLabel}-${suffix}.jsonl`;
  add(path, `required final ${kind} ledger`);
  const rows = readRows(path);
  const finishes = rows.filter(row => row.kind === 'FINISH');
  const expectedIdentity = kind === 'matrix' && correspondence ? `${correspondence.old_commit}/${correspondence.build}` : qualificationIdentity;
  assert.ok(rows.every(row => `${row.commit}/${row.build}` === expectedIdentity), 'Final browser candidate differs without exact correspondence');
  assert.equal(finishes.length, 1, `Final ${kind} finish missing/duplicated`);
  assert.equal(finishes[0].completed, expected, `Final ${kind} incomplete`);
  assert.equal(finishes[0].remaining_not_run, 0);
  assert.equal(finishes[0].exit_code, 0, `Final ${kind} failed`);
  for (const row of rows) {
    if (row.log) log(row.log, `final ${kind} command exit ${row.exit_code}`);
    if (row.screenshot_manifest) add(row.screenshot_manifest, 'fresh matrix screenshot manifest');
  }
}
for (const engine of ['chromium', 'webkit', 'firefox']) {
  const path = `output/playwright/round8/matrix-${matrixLabel}/${engine}-screenshots.json`;
  add(path, 'required fresh screenshot provenance');
  const manifest = readJson(path);
  const expectedIdentity = correspondence ? `${correspondence.old_commit}/${correspondence.build}` : qualificationIdentity;
  assert.equal(`${manifest.commit}/${manifest.build}`, expectedIdentity, 'Screenshot candidate differs without exact correspondence');
  assert.ok(Array.isArray(manifest.screenshots) && manifest.screenshots.length, 'Fresh screenshots missing');
  for (const shot of manifest.screenshots) {
    assert.ok(typeof shot.name === 'string' && !shot.name.includes('/') && !shot.name.includes('\\'), 'Invalid screenshot filename');
    const screenshot = resolve(manifest.destination, shot.name);
    const bytes = readFileSync(safe(screenshot).absolute);
    assert.equal(bytes.length, shot.bytes, 'Screenshot size differs from manifest');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), shot.sha256, 'Screenshot digest differs from manifest');
    add(screenshot, `fresh ${engine} screenshot manifest`);
  }
}
// Link closure only follows selected documents, never walks repository directories.
for (let i = 0; i < queue.length; i++) {
  const doc = queue[i];
  const markdown = readFileSync(safe(doc).absolute, 'utf8');
  // Reports sometimes cite actual artifact basenames in prose/tables.
  for (const match of markdown.matchAll(/\b(?:A00|R8|V1)-[A-Za-z0-9_.-]+\.(?:jsonl?|log)\b/g)) {
    add(`handoffs/codex/artifacts/${match[0]}`, `artifact basename cited by ${doc}`);
  }
  for (const match of markdown.matchAll(/\[[^\]]*\]\((<?[^)]+>?)\)/g)) {
    const raw = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!raw || /^(https?:|app:|mailto:)/i.test(raw)) continue;
    assert.ok(!raw.includes('${'), 'Unresolved template link');
    const target = decodeURIComponent(raw).replace(/:\d+$/, '');
    // Application source links are source-manifest references, not document artifacts.
    const local = resolve(root, dirname(doc), target);
    const sourcePath = relative(root, local).split(sep).join('/');
    if (/^(backend|frontend|services|scripts|shared|database|tests|connectors|tracking|docs|packages|infrastructure)\//.test(sourcePath) || [
      'AGENTS.md', 'CURRENT_STATE.md', 'ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md',
    ].includes(sourcePath)) {
      assert.ok(!/(^|\/)(\.local|node_modules|\.next|build|dist|credentials|signing|profiles)(\/|$)/i.test(sourcePath), 'Private source link refused');
      assert.ok(existsSync(local) && lstatSync(local).isFile(), 'Missing source reference');
      assert.equal(realpathSync(local), local, 'Source reference resolves elsewhere');
      continue;
    }
    add(local, `local link from ${doc}`, extname(local).toLowerCase() === '.md');
  }
}
const sorted = [...records.values()].sort((a, b) => a.path.localeCompare(b.path));
const prefix = `handoffs/codex/artifacts/R8-${label}-publication`;
const outputs = ['.txt', '-text-scan.txt', '-png.txt', '.json'].map(suffix => resolve(root, prefix + suffix));
for (const path of outputs) assert.equal(existsSync(path), false, 'Publication manifest label already exists');
const lines = items => items.map(item => item.path).join('\n') + '\n';
writeFileSync(outputs[0], lines(sorted), { flag: 'wx' });
writeFileSync(outputs[1], lines(sorted.filter(item => !item.binary)), { flag: 'wx' });
writeFileSync(outputs[2], lines(sorted.filter(item => item.binary)), { flag: 'wx' });
writeFileSync(outputs[3], JSON.stringify({ diagnostic_only: true, stages_nothing: true, label, matrixLabel, featureLabel,
  publication_status: reviewHead ? 'REVIEW_ONLY' : 'VERIFIED_BOUNDED_EVIDENCE',
  qualification_status: reviewHead ? 'QUALIFICATION_INCOMPLETE' : 'BOUNDED_REQUIRED_RESULTS_COMPLETE',
  review_source_commit: reviewHead, original_qualification_identity: qualificationIdentity,
  review_limits: reviewHead ? ['Original 44 remains 40 PASS / 4 FAIL, outer 1.', 'GRC 57 targeted PASS covers a previously unexecuted path.', 'Later runner/vendor diagnostic passes do not establish original historical causes.', 'New review source is not claimed to have a new production build or all-green full battery.', 'No production acceptance, deployment or full-matrix rerun.'] : [],
  supplemented_coverage: supplementedCoverage,
  integration_outcome: reviewHead ? 'Original 40 PASS / 4 FAIL (outer 1), targeted GRC PASS; review-only publication, qualification incomplete.' : supplementedCoverage ? 'Original 43 PASS / sole pre-dispatch GRC prerequisite FAIL (outer 1), plus same-candidate genuine GRC completion PASS (outer 0); combined 44 coverage, original failure unchanged.' : 'Original 44 PASS',
  total_bytes: sorted.reduce((sum, item) => sum + item.bytes, 0), files: sorted.map(item => ({ ...item, provenance: [...item.provenance] })) }, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(`Publication manifest generated: ${sorted.length} paths; no staging performed.\n`);
