import {spawn,spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {appendFileSync,createWriteStream,existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {vendorSigningEnvironment} from '../../scripts/credentials.ts';
const run=process.argv[2];if(!['1','2','3'].includes(run))throw new Error('Run 1, 2 or 3 required');
const prefix=`handoffs/codex/artifacts/R10-run${run}`;
if(existsSync(`${prefix}.jsonl`))throw new Error('Never overwrite or repeat a run');
const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).stdout.trim();
const env={...process.env,ORVIA_PROFILE:'codex-a00',ORVIA_WORKSPACE_ROOT:process.cwd(),ORVIA_TASK_ID:'DPDP',NEXT_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1',BETTER_AUTH_TELEMETRY:'0',ORVIA_TEST_OPA_CONTAINER:'orvia-round10-customer-opa-1',ORVIA_TEST_POSTGRES_CONTAINER:'orvia-round10-customer-postgres-1',PLAYWRIGHT_BROWSERS_PATH:resolve('.local/tools/playwright')};
for(const kind of ['release','licence','audit'])Object.assign(env,vendorSigningEnvironment(kind));
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const all=[...files('tests/integration').filter(x=>x.endsWith('.test.ts')),...files('tests/security').filter(x=>x.endsWith('.ts')),...files('tests/e2e').filter(x=>/(?:-local|-preflight|\.spec)\.ts$/.test(x))].sort();
const suites=run==='1'?all:JSON.parse(readFileSync(`handoffs/codex/round10-run${run}-suites.json`,'utf8'));
writeFileSync(`${prefix}.jsonl`,'',{flag:'wx'});writeFileSync(`${prefix}-manifest.json`,JSON.stringify({head,run,suites},null,2));
let index=0;const results=[];
async function execute(label,args,profile='codex-a00',kind='suite'){
  const log=`${prefix}-${String(++index).padStart(3,'0')}-${label.replaceAll(/[^A-Za-z0-9-]/g,'-')}.log`;
  const id=randomUUID(),started_at=new Date().toISOString();const output=createWriteStream(log,{flags:'wx'});
  const child=spawn(process.execPath,args,{windowsHide:true,env:{...env,ORVIA_PROFILE:profile,ORVIA_EVIDENCE_RUN:id,...(profile==='rehearsal'?{NODE_EXTRA_CA_CERTS:resolve('.local/profiles/rehearsal/tls/ca-cert.pem'),ORVIA_TEST_OPA_CONTAINER:'orvia-round10-rehearsal-opa-1',ORVIA_TEST_POSTGRES_CONTAINER:'orvia-round10-rehearsal-postgres-1'}:{})},stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});console.log(JSON.stringify({event:'START',label,profile,started_at}));
  const outcome=await new Promise(done=>{child.once('error',e=>done({exit_code:null,error:e.message}));child.once('close',(exit_code,signal)=>done({exit_code,signal}));});await new Promise(done=>output.end(done));
  const text=readFileSync(log,'utf8');const record={label,kind,command:[process.execPath,...args],profile,head,run,run_id:id,started_at,ended_at:new Date().toISOString(),...outcome,status:outcome.exit_code===0?'PASS':'FAILED',first_error:text.split(/\r?\n/).find(x=>/FAIL|Error:|error TS|code:/.test(x))??null,log};
  results.push(record);appendFileSync(`${prefix}.jsonl`,JSON.stringify(record)+'\n');console.log(JSON.stringify(record));return record;
}
if(run==='1')for(const name of ['test','contracts:check','typecheck','lint'])await execute(name,[resolve('.local/tools/package-manager/node_modules/pnpm/bin/pnpm.mjs'),'run',name],'codex-a00','check');
for(const profile of ['codex-a00','rehearsal'])for(const script of ['auth-init','machine-init'])await execute(`${profile}-${script}`,['--import','tsx',`scripts/${script}.ts`,`confirm:${profile}`],profile,'prerequisite');
await execute('build',['--import','tsx','scripts/web.ts','build'],'codex-a00','prerequisite');
const image=await execute('runtime-image',['--import','tsx','scripts/runtime-image.ts'],'codex-a00','prerequisite');
for(const suite of suites){
  if(suite==='tests/security/network-core.ts'){
    if(image.exit_code!==0){const record={label:suite,kind:'suite',head,run,status:'NOT_RUN',reason:'Packaged runtime image failed to build; see runtime-image prerequisite log.'};results.push(record);appendFileSync(`${prefix}.jsonl`,JSON.stringify(record)+'\n');continue;}
    await execute(suite,['--import','tsx','scripts/network-qualification.ts','confirm:codex-a00'],'codex-a00');continue;
  }
  const profile=/\.spec\.ts$|transport-preflight|integration\/lifecycle|security\/tls/.test(suite)?'rehearsal':'codex-a00';
  if(/evidence\/evidence|regression\/regression|workflows\/workflow|enforcement\/withdrawal-timing|security\/fixture-isolation|\.spec\.ts$/.test(suite))await execute(`enrollment-${index}`,['--import','tsx','scripts/machine-init.ts',`confirm:${profile}`],profile,'prerequisite');
  const args=suite.endsWith('.spec.ts')?[resolve('node_modules/@playwright/test/cli.js'),'test','--config','tests/e2e/playwright.config.ts',suite]:['--import','tsx',suite];
  await execute(suite,args,profile);
}
writeFileSync(`${prefix}-results.json`,JSON.stringify({head,run,results},null,2));process.exitCode=results.some(x=>x.status==='FAILED')?1:0;
