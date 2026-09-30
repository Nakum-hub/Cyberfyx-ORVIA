import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base = '425bf116fd712bedf2489ff442028a2548c882b9';
const path = 'frontend/src/components/shared/ui.tsx';
const old = execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
const current = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const formPart = text => text.slice(text.indexOf('type FieldProps ='), text.indexOf('export function DataTable'));
assert.equal(formPart(current), formPart(old), 'Hydration and form implementations must be byte-identical after newline normalization');
const protectedPaths = ['shared/contracts', 'backend', 'database', 'tests/e2e', 'frontend/src/app/vendor',
  'frontend/src/components/screens/privacy-operations', 'frontend/src/components/screens/expansion/dpdpa-audit.tsx', 'frontend/src/components/vendor'];
const changed = execFileSync('git', ['diff', '--name-only', base, '--', ...protectedPaths], { encoding: 'utf8' }).trim();
assert.equal(changed, '', 'Protected application and test source must remain unchanged');
const master = 'ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md';
const result = { base, hydration_and_forms: 'UNCHANGED', protected_paths: 'UNCHANGED', e2e_assertions: 'UNCHANGED',
  master_sha256: createHash('sha256').update(readFileSync(master)).digest('hex'),
  app_files: ['frontend/src/app/globals.css', 'frontend/src/components/shared/shell.tsx', path].map(file => ({ file, sha256: createHash('sha256').update(readFileSync(file)).digest('hex') })) };
writeFileSync('handoffs/codex/artifacts/R6-source-check.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
