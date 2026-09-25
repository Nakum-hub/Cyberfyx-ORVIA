// Regenerates tracker.csv from the markdown tables in test_cases/ and scenarios/.
// Run from repo root: node 500_test_cases/build_tracker.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const csv = (v) => `"${String(v).replace(/"/g, '""')}"`;
const header = ['ID', 'Kind', 'File', 'Title_or_Context', 'Priority', 'Type', 'References', 'Linked_TCs',
  'Status', 'Executed_By', 'Build_Commit', 'Rule_Pack_Version', 'Executed_At', 'Actual_Result', 'Evidence_Ref', 'Notes'];
const rows = [header.map(csv).join(',')];

for (const dir of ['test_cases', 'scenarios']) {
  for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith('.md')).sort()) {
    for (const line of readFileSync(join(root, dir, file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\| (TC|SC)-\d{3} /);
      if (!m) continue;
      const c = line.split('|').slice(1, -1).map((s) => s.trim());
      const rec = m[1] === 'TC'
        ? [c[0], 'TEST_CASE', `${dir}/${file}`, c[1], c[5], c[6], c[7], '']
        : [c[0], 'SCENARIO', `${dir}/${file}`, c[1], '', 'E2E', c[5], c[6]];
      rows.push([...rec, 'NOT_RUN', '', '', '', '', '', '', ''].map(csv).join(','));
    }
  }
}
writeFileSync(join(root, 'tracker.csv'), rows.join('\r\n') + '\r\n');
console.log(`tracker.csv written: ${rows.length - 1} rows`);
