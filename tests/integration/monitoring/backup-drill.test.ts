// Customer-local backup and restore drill (EX14), with negative controls.
import assert from 'node:assert/strict';
import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { runDrill, fileMatches } from '../../../scripts/backup-drill.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { writeEvidence } from '../../../shared/testing/src/evidence.ts';

const results: { name: string; result: 'PASS' | 'FAIL' }[] = [];
const check = (name: string, actual: unknown, expected: unknown) => { try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); } catch { results.push({ name, result: 'FAIL' }); console.log(`FAIL ${name} ${JSON.stringify({ expected, actual })}`); process.exitCode = 1; } };
const profile = loadProfile();
const drill = await runDrill(profile.profile);
check('the drill restores a copy with identical migrations, counts, withdrawals and forced row security', [drill.result, drill.checks.migrations_identical, drill.checks.counts_identical, drill.checks.withdrawals_preserved, drill.checks.row_security_forced], ['PASS', true, [], true, true]);
check('the backup is on disk and matches its manifest', fileMatches(drill.backup_path, drill.sha256), true);
const tampered = `${drill.backup_path}.tampered`;
copyFileSync(drill.backup_path, tampered);
const bytes = readFileSync(tampered); const at = Math.floor(bytes.length / 2); bytes[at] = (bytes[at] ?? 0) ^ 0xff; writeFileSync(tampered, bytes);
check('a single changed byte no longer matches the manifest, so it would not be restored', fileMatches(tampered, drill.sha256), false);
rmSync(tampered);
const pool = connectDatabase({ ...profile, database: 'postgres' }).pool;
const left = (await pool.query("SELECT datname FROM pg_database WHERE datname LIKE 'orvia_restore_drill_%'")).rows.length;
await pool.end();
check('the scratch database was removed', left, 0);
check('the manifest records the withdrawal count it verified', typeof drill.withdrawn_consents === 'number' && drill.withdrawn_consents >= 0, true);
writeEvidence('backup-drill-test', { suite: 'backup-drill-test', results, bytes: drill.bytes, backup_ms: drill.backup_ms, restore_ms: drill.restore_ms });
console.log(`\n${results.length} assertions, ${results.filter(r => r.result === 'FAIL').length} failures.`);
