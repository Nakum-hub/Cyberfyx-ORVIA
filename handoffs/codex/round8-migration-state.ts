import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { connectDatabase } from '../../database/customer/src/index.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { migrationIds } from '../../database/customer/src/migrations.ts';
const profile = loadProfile();
if (profile.profile !== 'codex-a00') throw new Error('Synthetic profile only');
const { pool } = connectDatabase(profile);
try {
  const rows = (await pool.query('SELECT id,checksum FROM bootstrap_migrations ORDER BY id')).rows as {id:string;checksum:string}[];
  const ids = migrationIds();
  const hash = (text:string) => createHash('sha256').update(text).digest('hex');
  const results = rows.map(row => {
    if (!ids.includes(row.id)) return { id:row.id,state:'NOT_IN_CANDIDATE' };
    const sql = readFileSync(`database/customer/migrations/${row.id}.sql`,'utf8');
    return {id:row.id,state:hash(sql)===row.checksum?'MATCH':'MISMATCH',lf_matches:hash(sql.replaceAll('\r\n','\n'))===row.checksum,crlf_matches:hash(sql.replaceAll('\r\n','\n').replaceAll('\n','\r\n'))===row.checksum};
  });
  writeFileSync('handoffs/codex/artifacts/R8-migration-state.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.filter(row=>row.state!=='MATCH')));
} finally { await pool.end(); }
