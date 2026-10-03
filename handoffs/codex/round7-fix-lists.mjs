// Reviewed one-off rewrite of the captured baseline inventory; not runtime code.
import { readFileSync, writeFileSync } from 'node:fs';
const findings = JSON.parse(readFileSync('handoffs/codex/artifacts/R7V-paginated-id-lists.json', 'utf8'));
const extra = { operational_events: 'occurred_at', regulatory_packages: 'imported_at', rights_response_packages: 'prepared_at', rights_requests: 'received_at', support_cases: 'opened_at', support_canaries: 'registered_at', release_manifests: 'imported_at', workflows: 'accepted_at' };
const changes = [];
for (const f of findings) {
  // Preserve both the current and earlier explicit Claude lane boundaries.
  if (f.protected || /\/registry\/|\/consent\/|\/operations\/runs\.ts$/.test(f.file)) continue;
  const time = f.timestamp ?? extra[f.table] ?? (f.table?.startsWith('grc_') ? "(document->>'recorded_at')::timestamptz" : null);
  if (!time || f.key.includes('.') || f.function === 'exposureList') continue;
  const match = /AND \((\$\d+)::uuid IS NULL OR (\w+)>\1\)/.exec(f.sql);
  if (!match) throw new Error(`Unexpected cursor: ${f.file}:${f.function}`);
  const from = /FROM (app\.\w+) WHERE ([\s\S]*?)\s+ORDER BY/.exec(f.sql);
  if (!from) throw new Error(`Unexpected source: ${f.file}:${f.function}`);
  const [, cursor, key] = match;
  const boundary = from[2].replace(match[0], `AND ${key}=${cursor}`);
  const sql = f.sql.replace(match[0], `AND (${cursor}::uuid IS NULL OR (${time},${key}) < (SELECT ${time},${key} FROM ${from[1]} WHERE ${boundary}))`).replace(`ORDER BY ${key} LIMIT`, `ORDER BY ${time} DESC, ${key} DESC LIMIT`);
  const source = readFileSync(f.file, 'utf8');
  if (!source.includes(f.sql)) throw new Error(`Baseline changed: ${f.file}:${f.function}`);
  writeFileSync(f.file, source.replace(f.sql, sql));
  changes.push({ file: f.file, function: f.function, table: f.table, timestamp: time });
}
writeFileSync('handoffs/codex/artifacts/R7V-list-changes.json', JSON.stringify(changes, null, 2));
console.log(`Changed ${changes.length} owned list queries; protected and unresolved queries left for review.`);
