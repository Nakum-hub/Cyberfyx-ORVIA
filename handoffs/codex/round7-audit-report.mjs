import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { routes } from '../../shared/contracts/src/index.ts';
const findings=JSON.parse(readFileSync('handoffs/codex/artifacts/R7V-paginated-id-lists.json','utf8'));
const changes=JSON.parse(readFileSync('handoffs/codex/artifacts/R7V-list-changes.json','utf8'));
const mapping=new Map();
for(const entry of readdirSync('backend/api/src').filter(f=>f.endsWith('.ts'))) {
  const file=`backend/api/src/${entry}`,source=readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  const imports=new Map();
  for(const node of ast.statements) if(ts.isImportDeclaration(node)&&node.importClause?.namedBindings) {
    const path=resolve(dirname(file),node.moduleSpecifier.text);
    const bindings=node.importClause.namedBindings;
    if(ts.isNamedImports(bindings))for(const e of bindings.elements)imports.set(e.name.text,{path,name:e.propertyName?.text??e.name.text});
    else imports.set(bindings.name.text,{path});
  }
  function visit(node) {
    if(ts.isCaseClause(node)&&ts.isStringLiteral(node.expression)) {
      function calls(n) {
        if(ts.isCallExpression(n)) {
          const expr=n.expression;
          const binding=ts.isIdentifier(expr)?imports.get(expr.text):ts.isPropertyAccessExpression(expr)?imports.get(expr.expression.getText(ast)):null;
          if(binding) {
            const key=`${binding.path}:${binding.name??expr.name.text}`;
            const ids=mapping.get(key)??new Set();ids.add(node.expression.text);mapping.set(key,ids);
          }
        }ts.forEachChild(n,calls);
      }for(const statement of node.statements)calls(statement);
    }ts.forEachChild(node,visit);
  }visit(ast);
}
for(const f of findings) {
  f.endpoints=[...(mapping.get(`${resolve(f.file)}:${f.function}`)??[])];
  if(f.function==='configurationList')f.endpoints=['list_purposes','list_notices','list_policies','list_systems'];
  if(f.file==='backend/api/src/admin-principals.ts')f.endpoints=['list_principals'];
  f.protected=f.protected||/\/registry\/|\/consent\/|\/operations\/runs\.ts$/.test(f.file);
  const current=readFileSync(f.file,'utf8');
  f.result=!current.includes(f.sql)?'FIXED':f.protected?'CLAUDE':f.endpoints.length?'NEEDS_CREATION_TIMESTAMP':'INTERNAL_OR_PRINCIPAL';
  if(f.function==='portalNotices'||f.audience==='principal')f.result='PRINCIPAL_OUT_OF_SCOPE';
  if(f.function==='evaluateRun')f.result='INTERNAL_WORKER_CURSOR';
  f.routes=f.endpoints.map(id=>({id,path:routes.find(r=>r.id===id)?.path??'UNRESOLVED'}));
  f.timestamp=changes.find(c=>c.file===f.file&&c.function===f.function)?.timestamp??f.timestamp;
  if(f.function==='grcList')f.timestamp="(document->>'recorded_at')::timestamptz";
  if(f.function==='agreementList')f.timestamp='recorded_at';
}
writeFileSync('handoffs/codex/artifacts/R7V-endpoint-audit.json',JSON.stringify(findings,null,2));
const lines=['# Round 7 hidden-newest audit','','Baseline: a033035f5e126b9c39ffc591b78cf6ec4997119c. Query inventory includes staff endpoints, principal endpoints and one internal worker cursor; the latter two are explicitly excluded from staff corrections.','','| Endpoint | Source function | Result | Timestamp |','|---|---|---|---|'];
for(const f of findings)lines.push(`| ${f.routes.map(r=>r.id+' '+r.path).join('<br>')||'(no staff endpoint)'} | ${f.file}:${f.line} ${f.function} | ${f.result} | ${f.timestamp??'See schema/dependency notes'} |`);
lines.push(`| list_erasure_intimations_due ${routes.find(r=>r.id==='list_erasure_intimations_due')?.path} | backend/domain/src/registry/retention.ts:155 intimationsDue | CLAUDE — supplemental composite UUID cursor | subject_id:rule_id; review due-date ordering with owner |`);
lines.push('','## Schema dependencies','','No timestamp was invented or backfilled. Configuration lists (purpose_versions, notice_versions, policy_versions, systems), target_mappings, obligations, principal_references and update_plans need an immutable insertion timestamp and matching scope/time/id index from the migration owner. Existing published/approved/checked times are nullable or describe a later event, so they are not used as creation times.','',
'Existing immutable insertion/event times are used where available: recorded_at, authored_at, uploaded_at, submitted_at, started_at, detected_at, taken_at, applied_at, evaluated_at, occurred_at, imported_at, prepared_at, received_at, opened_at, registered_at, accepted_at. GRC documents carry immutable recorded_at. The cursor remains the last returned UUID and is resolved within scope (and within parent/filter where applicable). Exposure summaries order the latest completed run per target by requested_at with target_id ties. These are chronological records; no claim of a newly added created_at column is made.','',
'Claude-owned registry, consent, intake and operations/runs files remain unchanged under the current and earlier lane exclusions. Internal worker enumeration is not changed. Existing timestamp-keyset lists were reviewed separately and left unchanged. Bounded internal scans without pagination are not staff list endpoints.','',
'## Forms corrected','','- Impact assessments: published-template selection and “New version of” now read all template pages; refresh both display and choices after writes.','- Applicability: activity scope choices and exemption decision choices now read all pages; both decision readers refresh after evaluate/override.','- Breach registration: exclude incidents already registered on any breach page, not just the visible page.','- CMP site detail/banner form: resolve the selected site and published banner across all pages, so older published versions still supply the form default.','',
'The complete hook/reference inventory is R7V-form-query-inventory.json. After these fixes the only direct usePagedQuery.data reference is Classification’s latest-run display, whose endpoint already orders by requested_at descending. Other hook-based form selectors already use useCollection, including Claude’s processor-engagement fixes. Manual call/readOnce paths were audited separately: controls/attention.tsx follows workflow cursors; vendor lists do not expose cursor pagination.','',
'### Claude-owned manual reader still truncates choices','',
'`frontend/src/components/screens/expansion/dpdpa-audit.tsx:49` directly calls `list_evidence_files` and `list_audit_engagements` with limit 100, stores only `.items`, and never follows `next_cursor`. The evidence-file state feeds `EngagementDetail` and its “Evidence file” selector at line 161; files outside the first page cannot be selected. The engagement table/Open action likewise cannot reach engagements outside the first 100. This file remains explicitly assigned to Claude. Replace the manual list reads with useCollection (preserving independent error states) or complete canonical cursor iteration; retain a paginated display if desired. The backend list ordering is corrected in this branch, but that does not make these first-page-only readers complete.');
writeFileSync('handoffs/codex/2026-09-30-round7-hidden-newest.md',lines.join('\n')+'\n');
console.log(JSON.stringify(findings.reduce((counts,f)=>({...counts,[f.result]:(counts[f.result]??0)+1}),{})));
