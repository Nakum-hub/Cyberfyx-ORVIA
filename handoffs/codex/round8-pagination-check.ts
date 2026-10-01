import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { connectDatabase } from '../../database/customer/src/index.ts';
type Site={file:string;function:string;table:string;timestamp:string;before:string;after?:string};
const before=process.argv[2]==='before';
const label=process.env.R8_PAGE_CHECK_LABEL??(before?'before':'after');assert.match(label,/^[a-z0-9-]+$/);
const scalar:Site[]=JSON.parse(readFileSync('handoffs/codex/artifacts/R8-list-changes.json','utf8'));
const extra:Site[]=JSON.parse(readFileSync('handoffs/codex/artifacts/R8-timestamp-list-changes.json','utf8'));
const audit=JSON.parse(readFileSync('handoffs/codex/artifacts/R7V-endpoint-audit.json','utf8'));
for(const [name,table,timestamp] of [['consentManagerList','consent_managers','recorded_at'],['intakeClientList','intake_clients','created_at']]) {
 const s=audit.find((s:Site)=>s.function===name); scalar.push({...s,table,timestamp,before:s.sql});
}
const sites=[...scalar,...extra.flatMap(s=>s.table==='${table}'?['purpose_versions','notice_versions','policy_versions','systems'].map(table=>({...s,table})):s)];
const profile=loadProfile(); assert.equal(profile.profile,'codex-a00');
const {pool}=connectDatabase(profile); const tx=await pool.connect();
const scope=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const results:unknown[]=[]; let failures=0;
function sourceSql(s:Site) {
 const text=readFileSync(s.file,'utf8'); const ast=ts.createSourceFile(s.file,text,ts.ScriptTarget.Latest,true); let sql=''; const constants:Record<string,string>={};
 function constantsVisit(n:ts.Node) {if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&ts.isNoSubstitutionTemplateLiteral(n.initializer))constants[n.name.text]=n.initializer.text;ts.forEachChild(n,constantsVisit);}constantsVisit(ast);
 function find(n:ts.Node) {if((ts.isTemplateExpression(n)||ts.isNoSubstitutionTemplateLiteral(n))&&n.getText(ast).includes('ORDER BY')&&/LIMIT \$\d+`$/.test(n.getText(ast))&&(n.getText(ast).includes(`FROM app.${s.table}`)||n.getText(ast).includes('FROM app.${table}')||n.getText(ast).includes('${CM_SELECT}')||n.getText(ast).includes('${CLIENT}')))sql=n.getText(ast).slice(1,-1);ts.forEachChild(n,find);}
 function visit(n:ts.Node) {if(ts.isFunctionDeclaration(n)&&n.name?.text===s.function)find(n);else ts.forEachChild(n,visit);} if(s.function==='rows')find(ast);else visit(ast);
 return expand(sql,constants,s.table);
}
function expand(sql:string,constants:Record<string,string>,table:string) {
 sql=sql.replaceAll('${predicate}','tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3').replaceAll('${table}',table);
 for(const [name,value] of Object.entries(constants))sql=sql.replaceAll('${'+name+'}',value);
 assert.ok(!sql.includes('${'),sql); return sql;
}
try {
 await tx.query('BEGIN');
 for(let n=0;n<sites.length;n++) {
  const s=sites[n]!; const after=sourceSql(s);
  // Only compile the actual candidate SQL against the real schema; fixtures are temporary clones.
  const limit=Number(/LIMIT \$(\d+)\s*$/.exec(after)![1]);
  const count=Math.max(...[...after.matchAll(/\$(\d+)/g)].map(m=>Number(m[1])));
  const values:unknown[]=Array.from({length:count},(_,i)=>i<3?scope[i]:i===limit-1?3:null);
  if(s.function==='actionList')values[3]=id(77);
  await tx.query('EXPLAIN (FORMAT JSON) '+after,values).then(r=>results.push({site:s.function,table:s.table,plan:r.rows[0]['QUERY PLAN']}));
  const temp=`r8_page_${n}`;
  await tx.query(`CREATE TEMP TABLE ${temp} AS SELECT * FROM app.${s.table} WITH NO DATA`);
  const ids=[id(9),id(2),id(1),id(8)];
  for(let i=0;i<ids.length;i++) {
   const timestamp=i===0&&s.timestamp==='inserted_at'?null:i===0?'2026-01-01T00:00:00Z':i===3?'2026-01-03T00:00:00Z':'2026-01-02T00:00:00Z';
   const parent=s.function==='actionList'?',run_id':s.function==='controlMap'?',system_id':'';
   await tx.query(`INSERT INTO ${temp}(tenant_id,legal_entity_id,environment_id,id,${s.timestamp}${parent}) VALUES($1,$2,$3,$4,$5${parent?',$6':''})`,[...scope,ids[i],timestamp,...(parent?[id(77)]:[])]);
  }
  await tx.query(`INSERT INTO ${temp}(tenant_id,legal_entity_id,environment_id,id,${s.timestamp}) VALUES($1,$2,$3,$4,$5)`,[id(99),...scope.slice(1),id(99),'2026-01-04T00:00:00Z']);
  let sql=(before?expand(s.before,{CM_SELECT:sourceSqlConstant(s.file,'CM_SELECT'),CLIENT:sourceSqlConstant(s.file,'CLIENT')},s.table):after).replaceAll(`app.${s.table}`,`pg_temp.${temp}`);
  if(s.function==='controlMap') {
   await tx.query(`CREATE TEMP TABLE ${temp}_systems AS SELECT * FROM app.systems WITH NO DATA`);
   await tx.query(`INSERT INTO ${temp}_systems(tenant_id,legal_entity_id,environment_id,id,document) VALUES($1,$2,$3,$4,'{}')`,[...scope,id(77)]);
   sql=sql.replaceAll('app.systems',`pg_temp.${temp}_systems`);
  }
  const cursor=Number(/AND \(\$(\d+)::uuid IS NULL OR (?:\(|\w*\.?id>)/.exec(sql)![1]);
  values[limit-1]=2;
  const first=await tx.query(sql,values); values[cursor-1]=first.rows.at(-1).id??first.rows.at(-1).resource_id;
  const second=await tx.query(sql,values);
  const actual=[...first.rows,...second.rows].map(r=>r.id??r.resource_id);
  try {
   assert.deepEqual(actual,[id(8),id(2),id(1),id(9)]); values[cursor-1]=id(9); assert.equal((await tx.query(sql,values)).rowCount,0);values[cursor-1]=id(99);assert.equal((await tx.query(sql,values)).rowCount,0);
   if(!before&&s.function==='actionList') {
    await tx.query(`UPDATE ${temp} SET run_id=$1 WHERE id=$2`,[id(78),id(8)]);values[cursor-1]=id(8);
    assert.equal((await tx.query(sql,values)).rowCount,0,'A cursor from another run is not an anchor');
   }
   if(!before&&s.function==='subjectList') {
    await tx.query(`UPDATE ${temp} SET principal_id=$1 WHERE id=$2`,[id(55),id(9)]);values[8]=id(55);values[cursor-1]=id(8);
    assert.equal((await tx.query(sql,values)).rowCount,0,'A cursor outside the principal filter is not an anchor');
   }
   results.push({site:s.function,table:s.table,regression:'PASS'});
  }
  catch(e){failures++;results.push({site:s.function,table:s.table,regression:'FAIL',actual,reason:(e as Error).message});}
 }
 console.log(JSON.stringify({mode:before?'BEFORE_EXPECTED_REGRESSION':'AFTER',sites:sites.length,failures,temporary_fixtures:'ROLLBACK'}));
 process.exitCode=failures?1:0;
} finally {await tx.query('ROLLBACK');tx.release();await pool.end();writeFileSync(`handoffs/codex/artifacts/R8-pagination-${label}.json`,JSON.stringify(results,null,2));}
function sourceSqlConstant(file:string,name:string) {const text=readFileSync(file,'utf8');const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);let value='';function visit(n:ts.Node){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.name.text===name&&n.initializer&&ts.isNoSubstitutionTemplateLiteral(n.initializer))value=n.initializer.text;ts.forEachChild(n,visit);}visit(ast);return value;}
