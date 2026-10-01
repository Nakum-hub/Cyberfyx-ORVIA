import { writeFileSync } from 'node:fs';
import { runtimeConfig } from '../../backend/auth/src/config.ts';
import { runtimePool } from '../../database/customer/src/runtime.ts';
const config = runtimeConfig();
if (config.profile !== 'codex-a00') throw new Error('Named synthetic profile only');
const pool = runtimePool(config, 'orvia_app');
try {
  const columns = await pool.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='app' ORDER BY table_name,ordinal_position");
  writeFileSync('handoffs/codex/artifacts/R7V-schema-columns.json', JSON.stringify(columns.rows, null, 2));
  console.log(JSON.stringify({ tables: new Set(columns.rows.map(r => r.table_name)).size, columns: columns.rowCount }));
} finally { await pool.end(); }
