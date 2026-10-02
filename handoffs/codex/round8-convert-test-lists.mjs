import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const changed=[];
function walk(directory) {return readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(directory,e.name)):[path.join(directory,e.name)]);}
for(const file of [...walk('tests/integration'),...walk('tests/e2e')].filter(f=>f.endsWith('.ts'))) {
 const source=readFileSync(file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const edits=[];
 function visit(n) {
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='ok'&&n.arguments.length===2) {
   const [request,schema]=n.arguments;
   if(ts.isCallExpression(request)&&ts.isPropertyAccessExpression(request.expression)&&request.expression.name.text==='call'&&request.arguments.length===1) {
    const route=request.arguments[0];const text=route.getText(ast);
    if((ts.isStringLiteral(route)||ts.isNoSubstitutionTemplateLiteral(route)||ts.isTemplateExpression(route))&&text.includes('limit=100')&&!text.includes('cursor')) {
     const owner=request.expression.expression.getText(ast);
     const replacement=`allPageList(p => ${owner}.call(p), ${text}, value => ${schema.getText(ast)}.parse(value))`;
     edits.push({start:n.getStart(ast),end:n.end,replacement});return;
    }
   }
  }
  ts.forEachChild(n,visit);
 }
 visit(ast);if(!edits.length)continue;
 let revised=source;for(const e of edits.sort((a,b)=>b.start-a.start))revised=revised.slice(0,e.start)+e.replacement+revised.slice(e.end);
 // Normalize only changed lines, preserving unrelated historical line endings.
 revised=revised.replace(/([^\r\n]*allPageList\([^\r\n]*)\r\n/g,'$1\n');
 const relative=path.relative(path.dirname(file),'shared/testing/src/all-pages.ts').replaceAll('\\','/');
 revised=`import { allPageList } from '${relative.startsWith('.')?relative:'./'+relative}';\n`+revised;
 writeFileSync(file,revised);changed.push({file:file.replaceAll('\\','/'),reads:edits.length});
}
writeFileSync('handoffs/codex/artifacts/R8-test-all-page-changes.json',JSON.stringify(changed,null,2));
console.log(JSON.stringify({files:changed.length,reads:changed.reduce((sum,c)=>sum+c.reads,0)}));
