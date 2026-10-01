import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { runtimeConfig } from '../../backend/auth/src/config.ts';
import { runtimePool } from '../../database/customer/src/runtime.ts';
const config = runtimeConfig();
if (config.profile !== 'codex-a00') throw new Error('Named synthetic profile only');
const pool = runtimePool(config, 'orvia_app');
const changes = JSON.parse(readFileSync('handoffs/codex/artifacts/R7V-list-changes.json', 'utf8')) as {file:string;function:string;table:string}[];
const scope = ['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
const results: {name:string;result:string}[] = [];
let siteSql = '';
const tx = await pool.connect();
try {
  await tx.query('BEGIN');
  for (const change of changes) {
    const source = readFileSync(change.file, 'utf8');
    const ast = ts.createSourceFile(change.file, source, ts.ScriptTarget.Latest, true);
    let sql = '';
    const visit = (node:ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === change.function) {
        const find = (part:ts.Node) => {
          if (ts.isTemplateExpression(part) && part.getText(ast).includes(' DESC LIMIT ')) sql = part.getText(ast).slice(1,-1);
          ts.forEachChild(part, find);
        }; find(node);
      }
      ts.forEachChild(node, visit);
    }; visit(ast);
    assert.ok(sql, change.function);
    sql = sql.replaceAll('${predicate}', 'tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3');
    if (sql.includes('${FILE_COLUMNS}')) sql = sql.replaceAll('${FILE_COLUMNS}', /const FILE_COLUMNS = '([^']+)'/.exec(source)![1]!);
    assert.ok(!sql.includes('${'), `Unexpanded SQL: ${change.function}`);
    const limit = Number(/LIMIT \$(\d+)/.exec(sql)![1]);
    const count = Math.max(...[...sql.matchAll(/\$(\d+)/g)].map(m=>Number(m[1])));
    const values:unknown[] = Array.from({length:count}, (_,i)=>i<3?scope[i]:i===limit-1?3:null);
    await tx.query('EXPLAIN '+sql, values);
    results.push({name:`${change.table}: PostgreSQL validates scoped cursor query`,result:'PASS'});
    if (change.function === 'siteList') siteSql = sql;
  }
  // Execute the actual site's keyset SQL against isolated, transaction-local rows.
  // UUID ordering deliberately disagrees with creation order; two timestamps tie.
  await tx.query('CREATE TEMP TABLE round7_pagination AS SELECT * FROM app.cmp_sites WITH NO DATA');
  const ids = [9,2,1,8].map(n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
  for (let i=0;i<ids.length;i++) await tx.query('INSERT INTO round7_pagination(tenant_id,legal_entity_id,environment_id,id,created_at) VALUES($1,$2,$3,$4,$5)',[...scope,ids[i],i===0?'2026-01-01T00:00:00Z':i===3?'2026-01-03T00:00:00Z':'2026-01-02T00:00:00Z']);
  const foreign='00000000-0000-4000-8000-000000000099';
  await tx.query('INSERT INTO round7_pagination(tenant_id,legal_entity_id,environment_id,id,created_at) VALUES($1,$2,$3,$4,$5)',[foreign,...scope.slice(1),foreign,'2026-01-04T00:00:00Z']);
  siteSql=siteSql.replaceAll('app.cmp_sites','pg_temp.round7_pagination');
  const first=await tx.query(siteSql,[...scope,null,2]);
  const second=await tx.query(siteSql,[...scope,first.rows.at(-1).id,2]);
  assert.deepEqual([...first.rows,...second.rows].map(r=>r.id),[ids[3],ids[1],ids[2],ids[0]]);
  assert.equal((await tx.query(siteSql,[...scope,second.rows.at(-1).id,2])).rowCount,0);
  assert.equal((await tx.query(siteSql,[...scope,foreign,2])).rowCount,0);
  results.push({name:'Reverse UUIDs, equal timestamps, two pages, terminal page, foreign-scope cursor',result:'PASS'});
  console.log(`${results.length} PostgreSQL pagination checks passed; temporary fixtures rolled back.`);
} finally {
  await tx.query('ROLLBACK'); tx.release(); await pool.end();
  writeFileSync('handoffs/codex/artifacts/R7V-pagination-checks.json',JSON.stringify(results,null,2));
}
