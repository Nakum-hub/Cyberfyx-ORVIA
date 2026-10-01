import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const audit=JSON.parse(readFileSync('handoffs/codex/artifacts/R7V-endpoint-audit.json','utf8'));
const changes=[];
for(const site of audit.filter(s=>String(s.result).includes('CLAUDE')&&s.table)) {
  const source=readFileSync(site.file,'utf8');
  const ast=ts.createSourceFile(site.file,source,ts.ScriptTarget.Latest,true);
  let node;
  function visit(n) {
    if(ts.isFunctionDeclaration(n)&&n.name?.text===site.function) {
      function find(p) { if((ts.isTemplateExpression(p)||ts.isNoSubstitutionTemplateLiteral(p))&&p.getText(ast).includes('ORDER BY')&&p.getText(ast).includes('LIMIT')) node=p; ts.forEachChild(p,find); }
      find(n);
    }
    ts.forEachChild(n,visit);
  }
  visit(ast); assert.ok(node,site.function);
  const original=site.sql;
  const match=/AND \(\$(\d+)::uuid IS NULL OR ((?:\w+\.)?)id>\$\1\)\s+ORDER BY \2id LIMIT/.exec(original);
  assert.ok(match,site.function);
  const [,position,alias]=match;
  const from=original.lastIndexOf(`FROM app.${site.table} `,match.index);
  assert.ok(from>=0,site.function);
  const eligible=original.slice(from,match.index).trim();
  const key=`${alias}${site.timestamp}`;
  const condition=`AND ($${position}::uuid IS NULL OR (${key},${alias}id) < (SELECT ${key},${alias}id ${eligible} AND ${alias}id=$${position})) ORDER BY ${key} DESC,${alias}id DESC LIMIT`;
  const revised=original.replace(match[0],condition);
  writeFileSync(site.file,source.slice(0,node.getStart(ast)+1)+revised+source.slice(node.end-1));
  changes.push({file:site.file,function:site.function,table:site.table,timestamp:site.timestamp,before:original,after:revised});
}
writeFileSync('handoffs/codex/artifacts/R8-list-changes.json',JSON.stringify(changes,null,2));
console.log(`${changes.length} scalar list queries converted; anchor retains original scope and filters.`);
