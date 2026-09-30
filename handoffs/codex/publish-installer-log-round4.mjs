// Produce shareable log copies without exporting setup codes or generated credentials.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const phase = process.argv[2];
if (!['install', 'upgrade', 'runtime', 'setup', 'verify', 'worker'].includes(phase)) throw new Error('Unknown log phase');
const secrets = new Set();
function collect(value) {
  if (Array.isArray(value)) { value.forEach(collect); return; }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (/password|secret|private|token|totp|setup.?code/i.test(key) && typeof item === 'string' && item.length >= 6) secrets.add(item);
    collect(item);
  }
}
function walk(path) {
  if (!existsSync(path)) return;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === 'backups' || entry.name === 'round4-traces') continue;
    const file = join(path, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (statSync(file).size < 256 * 1024) {
      if (/password|secret|private|setup-code|server-key|vault-key/i.test(entry.name)) secrets.add(readFileSync(file, 'utf8').trim());
      else if (entry.name.endsWith('.json')) { try { collect(JSON.parse(readFileSync(file, 'utf8'))); } catch { /* not JSON */ } }
    }
  }
}
walk('.local/profiles'); walk('.local/qualification');
let text = readFileSync(`/qualification/private-${phase}.log`, 'utf8');
for (const secret of [...secrets].filter(Boolean).sort((a, b) => b.length - a.length)) text = text.split(secret).join('[REDACTED]');
text = text.replace(/\b[A-HJ-NP-Z2-9]{5}(?:-[A-HJ-NP-Z2-9]{5}){3}\b/g, '[REDACTED SETUP CODE]');
writeFileSync(`/qualification/public-${phase}.log`, text);
console.log(JSON.stringify({ phase, lines: text.split('\n').length, result: 'REDACTED_COPY_WRITTEN' }));
