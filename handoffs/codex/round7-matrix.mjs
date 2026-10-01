import { spawn } from 'node:child_process';
import { createWriteStream, readFileSync, appendFileSync, cpSync } from 'node:fs';
const root = 'handoffs/codex/artifacts';
if (process.env.ORVIA_PROFILE !== 'codex-a00') throw new Error('Named synthetic profile only');
const build = readFileSync('frontend/.next/BUILD_ID','utf8').trim();
const ledger = `${root}/R7V-matrix-exits.jsonl`;
const label=process.env.R7_RUN_LABEL??'final';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Invalid run label');
const allowedSuites=['interface-crawl-local','expansion-screens-local','audit-mandate-local','operations-screens-local','sign-in-hydration-local'];
const suites=process.env.R7_SUITES?.split(',')??allowedSuites;
if(suites.some(s=>!allowedSuites.includes(s)))throw new Error('Unknown suite');
const engines = process.argv.slice(2).length ? process.argv.slice(2) : ['chromium','webkit','firefox'];
if (engines.some(x=>!['chromium','webkit','firefox'].includes(x))) throw new Error('Unknown engine');
async function run(args,log) {
  const started_at = new Date().toISOString();
  const output = createWriteStream(log);
  const child = spawn(process.execPath,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,R7_RUN_LABEL:label}});
  child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});
  const code = await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
  await new Promise(resolve=>output.end(resolve));
  const result={started_at,ended_at:new Date().toISOString(),build,run_label:label,command:['node',...args].join(' '),exit_code:code,log};
  appendFileSync(ledger,JSON.stringify(result)+'\n');
  console.log(JSON.stringify(result)); return code;
}
let failed=false;
for (const engine of engines) {
  for (const suite of suites) {
    if(readFileSync('frontend/.next/BUILD_ID','utf8').trim()!==build)throw new Error('Frozen build changed');
    const auth = await run(['node_modules/tsx/dist/cli.mjs','scripts/machine-init.ts','confirm:codex-a00'],`${root}/R7V-${label}-${engine}-${suite}-enrollment.log`);
    if(auth!==0){failed=true;continue;}
    const code=await run(['node_modules/tsx/dist/cli.mjs','handoffs/codex/round7-browser.mjs',engine,suite],`${root}/R7V-${label}-${engine}-${suite}.log`);
    if(suite==='interface-crawl-local')cpSync('output/playwright/crawl',`.local/round7-verify/${label}-${engine}-crawl-screens`,{recursive:true});
    if(code!==0)failed=true;
  }
}
process.exitCode=failed?1:0;
