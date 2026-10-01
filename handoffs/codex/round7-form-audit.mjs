import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const walk = path => readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(path,e.name)):e.name.endsWith('.tsx')?[join(path,e.name)]:[]);
const findings=[];
for(const file of walk('frontend/src')) {
  const source=readFileSync(file,'utf8'), ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node) {
    if(ts.isVariableDeclaration(node)&&node.initializer&&ts.isCallExpression(node.initializer)&&['usePagedQuery','useCollection','useQuery'].includes(node.initializer.expression.getText(ast))) {
      const name=node.name.getText(ast),hook=node.initializer.expression.getText(ast),operation=node.initializer.arguments[0]?.getText(ast);
      let owner=node.parent; while(owner&&!ts.isFunctionDeclaration(owner)&&!ts.isArrowFunction(owner))owner=owner.parent;
      const refs=[];
      function scan(n) {
        if(ts.isPropertyAccessExpression(n)&&n.expression.getText(ast)===name&&n.name.text==='data') {
          let context=n.parent;while(context.parent&&!ts.isJsxAttribute(context)&&!ts.isVariableDeclaration(context)&&!ts.isReturnStatement(context)&&!ts.isJsxExpression(context))context=context.parent;
          refs.push({line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,context:context.getText(ast).slice(0,650)});
        }ts.forEachChild(n,scan);
      }if(owner)scan(owner);
      findings.push({file:file.replaceAll('\\','/'),function:owner?.name?.text,hook,operation,name,references:refs});
    }ts.forEachChild(node,visit);
  }visit(ast);
}
writeFileSync('handoffs/codex/artifacts/R7V-form-query-inventory.json',JSON.stringify(findings,null,2));
console.log(JSON.stringify(findings.filter(f=>f.hook==='usePagedQuery'&&f.references.length),null,2));
