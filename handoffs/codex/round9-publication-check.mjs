// Compare prospective evidence with local synthetic credential material without
// printing any credential. This is a publication check, not a runtime suite.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const secrets = new Set();
function collect(value, key = '') {
  if (typeof value === 'string' && value.length >= 12 && /password|private.?key|(^|_)secret$|(^|_)token$|totp|enrollment/i.test(key)) secrets.add(value);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) collect(v, k);
}
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) { if (!['backups', 'supervisor', 'traces'].includes(entry.name)) walk(file); continue; }
    if ((!/\.(json|pem|key|txt)$/.test(entry.name) && !/password|private|secret|token/i.test(entry.name)) || statSync(file).size > 2_000_000) continue;
    const text = readFileSync(file, 'utf8');
    if (entry.name.endsWith('.json')) { try { collect(JSON.parse(text)); } catch { /* not a credential JSON document */ } }
    else if (/PRIVATE KEY|private|password|secret|token/i.test(entry.name + text.slice(0, 40)) && text.trim().length >= 12) secrets.add(text.trim());
  }
}
walk('.local/profiles'); walk('.local/vendor');
const prospective = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', 'handoffs/codex', 'handoffs/code/artifacts'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const failures = [];
let bytes = 0;
for (const file of prospective) {
  const text = readFileSync(file, 'utf8'); bytes += Buffer.byteLength(text);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) failures.push({ file, reason: 'private-key material marker' });
  if ([...secrets].some(secret => text.includes(secret))) failures.push({ file, reason: 'matches protected local credential material' });
}
const record = { files: prospective.length, bytes, protected_values_compared: secrets.size, failures,
  scope: 'New Round 9 handoff/evidence files; known local synthetic credentials compared in memory. No secret value is printed or written.' };
writeFileSync('handoffs/codex/artifacts/R9-publication-check.json', JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record));
process.exitCode = failures.length ? 1 : 0;
