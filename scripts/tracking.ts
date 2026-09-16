import { isAbsolute,resolve,relative } from 'node:path';
export type Task={id:string;owner:string;priority:string;title:string;start_dependencies:string[];acceptance_dependencies:string[];planned_paths:string[];deliverable:string;test_ids:string[];status:string;commit:string|null;evidence:string[]};
export type Acceptance={id:string;priority:string;title:string;expected:string;implementation_tasks:string[];source:string;status:string;evidence:string[]};
export type Tracking={schema_version:number;plan_version:string;tasks:Task[]};
export type AcceptanceTracking={schema_version:number;plan_version:string;tests:Acceptance[]};
export const taskStatuses=['NOT_STARTED','IN_PROGRESS','BLOCKED','IN_REVIEW','COMPLETED','OUT_OF_SPRINT'] as const;
export const testStatuses=['NOT_RUN','RUNNING','PASS','FAIL','ERROR','SKIPPED'] as const;
function fail(message:string):never{throw new Error(message);}
function unique(values:string[],label:string){if(new Set(values).size!==values.length)fail(`Duplicate ${label}`);}
export function validateTracking(tasks:Tracking,acceptance:AcceptanceTracking,exists:(path:string)=>boolean,readEvidence?:(path:string)=>unknown){
  if(tasks.schema_version!==1||acceptance.schema_version!==1||tasks.plan_version!==acceptance.plan_version)fail('Unsupported or inconsistent tracking versions');
  if(!Array.isArray(tasks.tasks)||!Array.isArray(acceptance.tests))fail('Missing tracking collections');
  unique(tasks.tasks.map(t=>t.id),'task');unique(acceptance.tests.map(t=>t.id),'test');
  const byId=new Map(tasks.tasks.map(t=>[t.id,t]));const testsById=new Map(acceptance.tests.map(t=>[t.id,t]));
  function evidence(paths:string[]){
    if(!Array.isArray(paths))fail('Evidence must be an array');
    unique(paths,'evidence');
    for(const path of paths){
      if(typeof path!=='string'||isAbsolute(path)||relative(process.cwd(),resolve(path)).startsWith('..')||!exists(path))fail('Missing or unsafe evidence path');
    }
  }
  for(const t of tasks.tasks){
    if(!/^[A-Z]\d{2}$/.test(t.id)||!['work','codex','code','cowork'].includes(t.owner)||!['P0','P1'].includes(t.priority)||!(taskStatuses as readonly string[]).includes(t.status))fail(`Invalid task metadata: ${t.id}`);
    if(t.priority==='P0'&&t.status==='OUT_OF_SPRINT')fail('Mandatory task cannot be removed');
    if(!t.title||!t.deliverable||!Array.isArray(t.planned_paths)||t.planned_paths.length===0)fail('Missing task definition');
    for(const deps of [t.start_dependencies,t.acceptance_dependencies]){unique(deps,'dependency');for(const d of deps){if(d===t.id||!byId.has(d))fail(`Invalid dependency ${t.id}/${d}`);}}
    unique(t.test_ids,'task test');for(const test of t.test_ids)if(!testsById.has(test))fail(`Unknown test ${test}`);
    evidence(t.evidence);
    if(t.commit!==null&&!/^[a-f0-9]{7,40}$/.test(t.commit))fail('Invalid commit');
    if(['IN_PROGRESS','IN_REVIEW','COMPLETED'].includes(t.status)&&t.start_dependencies.some(d=>byId.get(d)?.status!=='COMPLETED'))fail(`Unmet start dependency ${t.id}`);
    if(t.status==='COMPLETED'){
      if(!t.commit||t.evidence.length===0)fail(`Completion requires commit/evidence ${t.id}`);
      if(t.acceptance_dependencies.some(d=>byId.get(d)?.status!=='COMPLETED'))fail(`Unmet acceptance dependency ${t.id}`);
    }
  }
  const visiting=new Set<string>(),visited=new Set<string>();
  function visit(id:string){if(visiting.has(id))fail('Dependency cycle');if(visited.has(id))return;visiting.add(id);const t=byId.get(id)!;for(const d of [...t.start_dependencies,...t.acceptance_dependencies])visit(d);visiting.delete(id);visited.add(id);}
  tasks.tasks.forEach(t=>visit(t.id));
  for(const t of acceptance.tests){
    if(!/^T\d{2}$/.test(t.id)||!['P0','P1'].includes(t.priority)||!(testStatuses as readonly string[]).includes(t.status)||!t.title||!t.expected||!t.source)fail(`Invalid acceptance metadata ${t.id}`);
    unique(t.implementation_tasks,'implementation task');for(const id of t.implementation_tasks)if(!byId.has(id))fail(`Unknown implementation task ${id}`);
    evidence(t.evidence);
    if(['PASS','FAIL','ERROR'].includes(t.status)&&t.evidence.length===0)fail(`Measured result requires evidence ${t.id}`);
    if(t.status==='PASS'){
      const full=t.evidence.some(path=>{
        if(!readEvidence||!path.endsWith('.json'))return false;
        const r=readEvidence(path) as Record<string,unknown>;
        if(!r||r.kind!=='APPLICATION_ACCEPTANCE'||r.coverage!=='FULL_SCENARIO'||r.result!=='PASS'||r.exit_code!==0)return false;
        if(!Array.isArray(r.test_ids)||!r.test_ids.includes(t.id)||!Array.isArray(r.command)||r.command.length===0)return false;
        if(!/^[a-f0-9]{40}$/.test(String(r.source_commit))||typeof r.contract_version!=='string'||typeof r.fixture_id!=='string'||typeof r.profile!=='string')return false;
        if(!Number.isFinite(Date.parse(String(r.started_at)))||Date.parse(String(r.finished_at))<Date.parse(String(r.started_at))||!Number.isFinite(Date.parse(String(r.finished_at))))return false;
        if(!Array.isArray(r.assertions)||r.assertions.length===0||!r.assertions.every(a=>a&&typeof a==='object'&&a.result==='PASS'&&typeof a.id==='string'&&'expected'in a&&'actual'in a))return false;
        if(!Array.isArray(r.artifact_paths)||r.artifact_paths.length===0||!Array.isArray(r.limitations))return false;
        evidence(r.artifact_paths as string[]);return true;
      });
      if(!full)fail(`Application PASS requires full execution evidence ${t.id}`);
    }
  }
}
const safe=(s:string)=>s.replaceAll('|','\\|').replaceAll('\n',' ');
export const taskRows=(input:Tracking)=>input.tasks.map(t=>[t.id,t.owner,t.priority,t.status,t.title,t.start_dependencies.join(', ')||'Immediately',t.acceptance_dependencies.join(', ')||'Own evidence',t.test_ids.join(', ')||'Review deliverable']);
export const acceptanceRows=(input:AcceptanceTracking)=>input.tests.map(t=>[t.id,t.priority,t.title,t.expected,t.status]);
const markdown=(rows:string[][])=>rows.map(row=>`| ${row.map(safe).join(' | ')} |`).join('\n');
export function renderTasks(input:Tracking){
  const counts=Object.fromEntries([...new Set(input.tasks.map(t=>t.status))].sort().map(status=>[status,input.tasks.filter(t=>t.status===status).length]));
  return `# Task board — generated from tracking/tasks.json\n\nStatus counts: ${Object.entries(counts).map(([s,n])=>`${s}: ${n}`).join('; ')}.\n\n| ID | Owner | Priority | Status | Task | Start after | Accept after | Tests |\n|---|---|---|---|---|---|---|---|\n${markdown(taskRows(input))}\n\n`+input.tasks.map(t=>`## ${t.id} — ${t.title}\n\n**Owner:** ${t.owner} · **Status:** ${t.status} · **Accepted commit:** ${t.commit??'None recorded'}\n\n${t.deliverable}\n\n**Planned files:** ${t.planned_paths.map(p=>'`'+p+'`').join('; ')}\n\n**Evidence:** ${t.evidence.length?t.evidence.map(p=>'`'+p+'`').join('; '):'None recorded'}\n`).join('\n');
}
export function renderAcceptance(input:AcceptanceTracking){return `# Application acceptance — generated from tracking/acceptance.json\n\nDefinitions and recorded result states; evidence requires independent review.\n\n| ID | Priority | Scenario | Expected evidence | Result |\n|---|---|---|---|---|\n${markdown(acceptanceRows(input))}\n`;}
export function assertViewRows(actual:string,rows:string[][]){
  const observed=actual.split(/\r?\n/).filter(line=>/^\| [A-Z]\d{2} \|/.test(line));
  if(observed.join('\n')!==markdown(rows))fail('Generated Markdown table drift');
}
export function assertTaskDetails(actual:string,input:Tracking){
  for(const t of input.tasks){
    const section=actual.split(new RegExp(`^## ${t.id} `,'m'))[1]?.split(/^## /m)[0];
    if(!section)fail(`Missing task detail ${t.id}`);
    for(const text of [`**Owner:** ${t.owner}`,`**Status:** ${t.status}`,`**Accepted commit:** ${t.commit??'None recorded'}`,t.deliverable,`**Planned files:** ${t.planned_paths.map(p=>'`'+p+'`').join('; ')}`,`**Evidence:** ${t.evidence.length?t.evidence.map(p=>'`'+p+'`').join('; '):'None recorded'}`])if(!section.includes(text))fail(`Task detail drift ${t.id}`);
  }
  const countLine=actual.split(/\r?\n/).find(line=>line.includes('Status counts:'));
  if(!countLine)fail('Missing status counts');
  for(const status of new Set(input.tasks.map(t=>t.status)))if(!countLine.includes(`${status}: ${input.tasks.filter(t=>t.status===status).length}`))fail('Status count drift');
}
