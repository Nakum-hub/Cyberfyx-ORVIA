// Reuse the canonical package producer; add UI evidence and actual UI gates.
// This never turns packaging success into browser or Work acceptance.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { sourceState } from '../../scripts/source-state.ts';

if(process.env.ORVIA_PROFILE!=='rehearsal'||process.argv[2]!=='confirm:rehearsal')throw new Error('Named rehearsal UI candidate required');
const run=promisify(execFile);const source=sourceState();
await run(process.execPath,['--import','tsx','scripts/package-candidate.ts','confirm:rehearsal'],{windowsHide:true,maxBuffer:8*1024*1024,env:process.env});
const manifest=JSON.parse(readFileSync('artifacts/release-manifest.json','utf8'));
if(manifest.source_commit!==source.commit||manifest.source_tree_sha256!==source.sha256)throw new Error('Canonical package/source mismatch');
const directory=resolve('.local/releases',source.commit);
const collect=(path:string):string[]=>readdirSync(path,{withFileTypes:true}).flatMap(entry=>{
  if(entry.isSymbolicLink())throw new Error('No linked private material in browser evidence');
  const file=path+'/'+entry.name;return entry.isDirectory()?collect(file):/\.(json|txt|png)$/.test(file)?[file]:[];
});
const files=collect('handoffs/codex/browser').sort();
const listing=resolve(directory,'browser-evidence-files.txt');writeFileSync(listing,files.join('\n')+'\n');
const archive=resolve(directory,'orvia-browser-evidence.zip');await run('tar',['-a','-cf',archive,'-T',listing],{windowsHide:true});
const entries=(await run('tar',['-tf',archive],{windowsHide:true,maxBuffer:8*1024*1024})).stdout.trim().split(/\r?\n/).sort();
if(JSON.stringify(entries)!==JSON.stringify(files))throw new Error('Browser evidence archive inventory mismatch');
const sha=async(path:string)=>{const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');};
type Outcome={result:string;source_commit:string;source_tree_sha256:string;tests:{title:string[];status:string;location:{file:string};errors:{category:string}[]}[]};
const reports=files.filter(path=>path.endsWith('/results.json')).map(path=>({path,value:JSON.parse(readFileSync(path,'utf8')) as Outcome}));
const required=['auth.spec.ts','configuration.spec.ts','consent.spec.ts','workflow.spec.ts','test-lab.spec.ts','candidate.spec.ts','tls.spec.ts'];
const current=reports.filter(({value:v})=>v.source_commit===source.commit&&v.source_tree_sha256===source.sha256);
const complete=current.findLast(({value:v})=>v.tests.length>=16&&required.every(file=>v.tests.some(t=>t.location.file.replaceAll('\\','/').endsWith('/'+file)))&&v.tests.some(t=>t.title.at(-1)==='B03 manual task uses its read version, preserves replay and rejects a stale tab'));
const full=complete&&complete.value.result==='passed'&&complete.value.tests.every(t=>t.status==='passed')&&!current.slice(current.indexOf(complete)+1).some(({value:v})=>v.result!=='passed')?complete:undefined;
const latestTls=current.flatMap(({value:v})=>v.tests).findLast(t=>t.location.file.replaceAll('\\','/').endsWith('/tls.spec.ts'));
const certificateBlocked=latestTls?.errors.some(e=>e.category==='BROWSER_CERTIFICATE_NOT_TRUSTED')??false;
manifest.task_id='B06';manifest.candidate_kind='LOCAL_SYNTHETIC_UI_ENGINEERING_CANDIDATE_PENDING_REVIEW';
manifest.gates.browser_acceptance=full?'PASS_ENGINEERING':certificateBlocked?'BLOCKED_CERTIFICATE_TRUST':current.some(({value:v})=>v.result!=='passed')?'FAILED_ENGINEERING':'NOT_RUN';
manifest.gates.work_review='PENDING';manifest.gates.human_rehearsals='NOT_RUN';manifest.gates.release='NOT_APPROVED';
manifest.ui={base_backend_commit:'7f4f7010a908f77c036ab31951ed89fa200f722c',tickets:['B00','B01','B02','B03','B04','B06'],playwright_version:JSON.parse(readFileSync('node_modules/@playwright/test/package.json','utf8')).version,
  full_browser_evidence:full?.path??null,browser_runs:reports.map(({path,value:v})=>({path,result:v.result,source_commit:v.source_commit,current_source:v.source_tree_sha256===source.sha256,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),
  mandatory_browser_suites:required,raw_authenticated_artifacts:'Protected .local/browser-evidence only; excluded from all packages and Git.'};
manifest.package_artifacts.push({path:relative(process.cwd(),archive).replaceAll('\\','/'),sha256:await sha(archive)});
manifest.limitations=manifest.limitations.filter((l:string)=>!l.startsWith('Partial preserved UI:')&&!l.startsWith('Local CA is not installed'));
manifest.limitations.unshift(full?'Mandatory UI suites, including manual-task revision/replay, passed on this exact engineering source; Work and human acceptance remain separate.':'Complete matching-candidate browser qualification is not established; consult retained run outcomes for actual failures and unexecuted coverage.');
manifest.limitations.push(latestTls?.status==='passed'?'Normal Chromium HTTPS validation passed for this source; temporary user trust and its cleanup are recorded separately.':'Normal Chromium HTTPS qualification is not established for this exact source.');
manifest.created_at=new Date().toISOString();
const text=JSON.stringify(manifest,null,2)+'\n';writeFileSync('artifacts/release-manifest.json',text);writeFileSync(resolve(directory,'release-manifest.json'),text);
console.log(JSON.stringify({source_commit:source.commit,source_tree_sha256:source.sha256,manifest:'artifacts/release-manifest.json',manifest_sha256:await sha('artifacts/release-manifest.json'),browser_gate:manifest.gates.browser_acceptance,browser_archive_files:files.length,package_result:'PASS'},null,2));
