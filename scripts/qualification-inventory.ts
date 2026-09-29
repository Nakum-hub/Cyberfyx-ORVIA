import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// This inventory is deliberately not an automatic runtime runner. Suites have
// different profile, signing, fixture, database and container prerequisites.
const supportFiles = new Set([
  'tests/fault-fixtures/stale-sender.ts', 'tests/integration/grc/browser-harness.ts',
  'tests/integration/vendor/harness.ts', 'tests/integration/vendor/practice-flow.ts',
  'tests/e2e/reporter.ts', 'tests/e2e/record.mjs', 'tests/e2e/playwright.config.ts',
  'tests/e2e/package.ts', 'tests/e2e/fixture.ts',
]);
export function classifyTest(path: string) {
  if (supportFiles.has(path)) return 'SUPPORT';
  if (/^tests\/unit\/.+\.test\.ts$/.test(path)) return 'UNIT';
  if (/^tests\/integration\/.+\.test\.ts$/.test(path)) return 'INTEGRATION';
  if (/^tests\/security\/.+\.ts$/.test(path)) return 'SECURITY';
  if (/^tests\/e2e\/.+\.spec\.ts$/.test(path)) return 'PLAYWRIGHT';
  if (/^tests\/e2e\/.+-(local|preflight)\.ts$/.test(path)) return 'BROWSER_OR_TRANSPORT';
  throw new Error(`Unclassified test file: ${path}. Review its prerequisites before adding it.`);
}
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
export function qualificationInventory() {
  const paths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'tests'],
    { encoding: 'utf8' }).split('\0').filter(Boolean))].sort();
  const entries = paths.map(path => ({ path, sha256: sha256(readFileSync(path)), kind: classifyTest(path) }));
  return { schema_version: 1,
    scope: 'Every nonignored file in tests, including uncommitted files. File presence is not execution or acceptance.',
    execution_rule: 'Runtime suites must run serially in an explicitly reserved isolated profile; bind evidence to a unique run and exact source inventory. Never reuse the newest historical PASS.',
    limitations: [
      'This is a test-file omission check, not proof that every product requirement has a test.',
      'Source freshness covers test files only; release qualification also requires the full candidate source and dependency digests.',
      'Independent security/legal review, actual provider conformance and human release approval remain separate gates.',
    ],
    test_file_digest: sha256(JSON.stringify(entries)),
    counts: Object.fromEntries(['UNIT', 'INTEGRATION', 'SECURITY', 'PLAYWRIGHT', 'BROWSER_OR_TRANSPORT', 'SUPPORT']
      .map(kind => [kind, entries.filter(entry => entry.kind === kind).length])),
    entries,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check'))
    throw new Error('Usage: tsx scripts/qualification-inventory.ts [--check]');
  const target = 'tracking/qualification-inventory.json';
  const result = qualificationInventory();
  const output = JSON.stringify(result, null, 2) + '\n';
  if (args[0] === '--check') {
    if (readFileSync(target, 'utf8') !== output) throw new Error('Qualification inventory is stale. Review new/changed test files and regenerate.');
  } else writeFileSync(target, output);
  console.log(JSON.stringify({ status: args[0] === '--check' ? 'MATCH' : 'WRITTEN', counts: result.counts,
    execution_status: 'NOT_RUN_BY_INVENTORY', release_qualified: false }));
}
