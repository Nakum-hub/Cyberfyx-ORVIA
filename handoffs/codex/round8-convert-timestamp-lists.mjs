import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const sites=[
 ['backend/domain/src/configuration/configuration.ts','configurationList','${table}'],
 ['backend/domain/src/configuration/configuration.ts','mappingList','target_mappings'],
 ['backend/domain/src/configuration/configuration.ts','controlMap','target_mappings'],
 ['backend/domain/src/evidence/evidence.ts','failures','obligations'],
 ['backend/domain/src/evidence/evidence.ts','capabilities','systems'],
 ['backend/domain/src/updates/updates.ts','updatePlanList','update_plans'],
 ['backend/api/src/admin-principals.ts',null,'principal_references'],
];
const changes=[];
for(const [file,name,table] of sites) {
 const source=readFileSync(file,'utf8'); const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true); let node;
 function find(n) {
   if((ts.isTemplateExpression(n)||ts.isNoSubstitutionTemplateLiteral(n))&&n.getText(ast).includes(`FROM app.${table}`)&&n.getText(ast).includes('ORDER BY')&&n.getText(ast).includes('LIMIT')) node=n;
   ts.forEachChild(n,find);
 }
 function visit(n) { if(ts.isFunctionDeclaration(n)&&n.name?.text===name)find(n); else ts.forEachChild(n,visit); }
 if(name)visit(ast);else find(ast); assert.ok(node,name??table);
 const original=node.getText(ast).slice(1,-1);
 const match=/AND \(\$(\d+)::uuid IS NULL OR ((?:\w+\.)?)id>\$\1\)\s+ORDER BY \2id LIMIT/.exec(original); assert.ok(match,name??table);
 const [,position,alias]=match; const from=original.lastIndexOf(`FROM app.${table} `,match.index); assert.ok(from>=0);
 const eligible=original.slice(from,match.index).trim(); const key=`COALESCE(${alias}inserted_at,'-infinity'::timestamptz)`;
 const condition=`AND ($${position}::uuid IS NULL OR (${key},${alias}id) < (SELECT ${key},${alias}id ${eligible} AND ${alias}id=$${position})) ORDER BY ${key} DESC,${alias}id DESC LIMIT`;
 const revised=original.replace(match[0],condition);
 writeFileSync(file,source.slice(0,node.getStart(ast)+1)+revised+source.slice(node.end-1));
 changes.push({file,function:name??'rows',table,timestamp:'inserted_at',before:original,after:revised});
}
writeFileSync('handoffs/codex/artifacts/R8-timestamp-list-changes.json',JSON.stringify(changes,null,2));
console.log(`${changes.length} implementations converted; legacy NULL timestamps remain unknown.`);
