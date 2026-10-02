// Read-only fixture metadata for discovery triage; no suite or business write.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { connectDatabase } from '../../database/customer/src/index.ts';
const profile = loadProfile('codex-a00');
const fixture = JSON.parse(readFileSync(resolve(profile.directory, 'auth/bootstrap.json'), 'utf8'));
const s = fixture.users.owner.scope;
const scope = [s.tenant_id, s.legal_entity_id, s.environment_id];
const db = connectDatabase(profile).pool;
const tx = await db.connect();
try {
  await tx.query('BEGIN READ ONLY');
  const tables = ['systems', 'registry_purposes', 'registry_notices', 'registry_activities', 'processing_conditions', 'principal_categories', 'personal_data_categories', 'processor_engagements', 'retention_rules', 'security_safeguards'];
  const counts = {};
  for (const table of tables) {
    if (!(await tx.query('SELECT to_regclass($1) present', [`app.${table}`])).rows[0].present) { counts[table] = null; continue; }
    counts[table] = Number((await tx.query(`SELECT count(*) n FROM app.${table} WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)).rows[0].n);
  }
  const transports = (await tx.query(`SELECT kind,state,created_at,host='127.0.0.1' AS loopback,port,
    name LIKE 'Relay %' AS canary_fixture_name, name LIKE 'Customer relay %' AS delivery_fixture_name
    FROM app.delivery_transports WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND state='ENABLED' ORDER BY created_at`, scope)).rows;
  await tx.query('COMMIT');
  const record = { recorded_at: new Date().toISOString(), mode: 'READ_ONLY_METADATA_NOT_A_TEST', counts, enabled_transports: transports };
  writeFileSync('handoffs/codex/artifacts/R9-profile-metadata.json', JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record, null, 2));
} finally { tx.release(); await db.end(); }
