import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';import ts from 'typescript';
const changed=[];
function walk(d){return readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
for(const file of [...walk('tests/integration'),...walk('tests/e2e')].filter(f=>f.endsWith('.ts'))) {
 const source=readFileSync(file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const edits=[];
 function visit(n){
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='parse'&&n.arguments.length===1&&n.getText(ast).includes('limit=100')) {
   let request;function find(p){if(ts.isCallExpression(p)&&ts.isPropertyAccessExpression(p.expression)&&p.expression.name.text==='call'&&p.arguments.length===1){const route=p.arguments[0];if((ts.isStringLiteral(route)||ts.isNoSubstitutionTemplateLiteral(route)||ts.isTemplateExpression(route))&&route.getText(ast).includes('limit=100')&&!route.getText(ast).includes('cursor'))request=p;}ts.forEachChild(p,find);}find(n.arguments[0]);
   if(request){const owner=request.expression.expression.getText(ast);const route=request.arguments[0].getText(ast).replace('&limit=100','').replace('?limit=100','');edits.push({start:n.getStart(ast),end:n.end,text:`(await allPageList(p => ${owner}.call(p), ${route}, value => ${n.expression.expression.getText(ast)}.parse(value)))`});return;}
  }
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='allPageList'&&n.arguments.length===3){const route=n.arguments[1];const text=route.getText(ast);if(text.includes('limit=100'))edits.push({start:route.getStart(ast),end:route.end,text:text.replace('&limit=100','').replace('?limit=100','')});}
  ts.forEachChild(n,visit);
 }
 visit(ast);if(!edits.length)continue;let revised=source;for(const e of edits.sort((a,b)=>b.start-a.start))revised=revised.slice(0,e.start)+e.text+revised.slice(e.end);
 revised=revised.replace(/([^\r\n]*allPageList\([^\r\n]*)\r\n/g,'$1\n');
 if(!source.includes('import { allPageList }')){const relative=path.relative(path.dirname(file),'shared/testing/src/all-pages.ts').replaceAll('\\','/');revised=`import { allPageList } from '${relative.startsWith('.')?relative:'./'+relative}';\n`+revised;}
 writeFileSync(file,revised);changed.push({file:file.replaceAll('\\','/'),edits:edits.length});
}
writeFileSync('handoffs/codex/artifacts/R8-parsed-test-all-page-changes.json',JSON.stringify(changed,null,2));console.log(JSON.stringify(changed));
