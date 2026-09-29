import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2]);
const pw = await import(pathToFileURL(resolve(root, 'node_modules/@playwright/test/index.mjs')).href);
const rows = [];
for (const name of ['firefox', 'webkit']) {
  const executable = pw[name].executablePath();
  rows.push({ browser: name, executable, installed: existsSync(executable), suites: [
    'tests/e2e/expansion-screens-local.ts', 'tests/e2e/dpdpa-audit-local.ts', 'tests/e2e/audit-mandate-local.ts'
  ].map(suite => ({ suite, status: 'NOT_RUN', reason: existsSync(executable) ? 'Browser selector and local installation prerequisites require follow-up' : 'Playwright browser executable is not installed; installation forbidden by task' })) });
}
const output = resolve(process.argv[3]);
writeFileSync(output, JSON.stringify({ command: process.argv.slice(1), cwd: process.cwd(), rows }, null, 2) + '\n');
console.log(JSON.stringify(rows));
