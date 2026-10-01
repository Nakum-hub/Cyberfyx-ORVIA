import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const walk = path => readdirSync(path, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(path, e.name)) : e.name.endsWith('.ts') ? [join(path, e.name)] : []);
const columns = JSON.parse(readFileSync('handoffs/codex/artifacts/R7V-schema-columns.json', 'utf8'));
const timestamps = ['created_at', 'recorded_at', 'authored_at', 'uploaded_at', 'requested_at', 'submitted_at', 'started_at', 'detected_at', 'taken_at', 'applied_at', 'evaluated_at'];
const findings = [];
for (const file of [...walk('backend/domain/src'), ...walk('backend/api/src')]) {
  const source = readFileSync(file, 'utf8'); const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = node => {
    if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const sql = node.getText(ast).slice(1, -1);
      const order = /ORDER\s+BY\s+((\w+\.)?(?:id|incident_id|rights_request_id|target_id|receipt_id))\s+LIMIT\s+\$\d+/i.exec(sql);
      if (order && /\$\d+::(?:uuid|text) IS NULL OR [\w.]+\s*>\s*\$\d+/.test(sql)) {
        let fn = node.parent;
        while (fn && !(ts.isFunctionDeclaration(fn) || ts.isVariableDeclaration(fn))) fn = fn.parent;
        let declaration = node.parent;
        while (declaration && !ts.isFunctionDeclaration(declaration)) declaration = declaration.parent;
        const key = order[1], alias = order[2] ?? '';
        const from = alias ? new RegExp(`(?:FROM|JOIN) app\\.(\\w+) ${alias.slice(0, -1)}\\b`).exec(sql) : /FROM app\.(\w+)\b/.exec(sql);
        const table = from?.[1] ?? null;
        const time = table ? timestamps.find(t => columns.some(c => c.table_name === table && c.column_name === t)) ?? null : null;
        const protectedFile = /(?:^|[\\/])intake\.ts$|[\\/]authorization[\\/]|[\\/]operations[\\/]bulk-import\.ts$|backend[\\/]api[\\/]src[\\/]cmp\.ts$/.test(file);
        findings.push({ file: file.replaceAll('\\', '/'), line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, function: declaration?.name?.text ?? fn?.name?.getText(ast) ?? null, table, key, timestamp: time, protected: protectedFile, audience: file.includes('/consent/') || file.includes('\\consent\\') ? 'principal' : 'staff-review', sql });
      }
    }
    ts.forEachChild(node, visit);
  }; visit(ast);
}
writeFileSync('handoffs/codex/artifacts/R7V-paginated-id-lists.json', JSON.stringify(findings, null, 2));
console.log(JSON.stringify({ queries: findings.length, tablesWithoutTimestamp: findings.filter(x => !x.timestamp).map(x => ({ file: x.file, function: x.function, table: x.table })), protected: findings.filter(x => x.protected).map(x => ({ file: x.file, function: x.function })) }, null, 2));
