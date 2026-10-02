// Run after staging reviewed evidence. Include this manifest itself explicitly.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const base = 'a14470c8d04048856694c520bbab69fcdbf77217';
const name = 'handoffs/codex/artifacts/R9-changed-files.json';
const git = args => execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean);
const committed = git(['diff', '--name-only', '-z', base, 'HEAD']);
const staged = git(['diff', '--cached', '--name-only', '-z']);
const files = [...new Set([...committed, ...staged, name])].sort();
if (files.some(p => p.startsWith('output/') || p.startsWith('.local/'))) throw new Error('Generated local output must not be published');
writeFileSync(name, JSON.stringify({ base, files, count: files.length,
  note: 'Exact paths changed from integrated base through the final evidence commit. Runtime/local screenshots and protected credentials are excluded.' }, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length }));
