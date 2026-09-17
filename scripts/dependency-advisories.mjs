// Download the public ecosystem feed, then match locally. Never upload a
// manifest, package list, credential, operational identifier or customer data.
import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname,resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const cache=resolve('.local/npm-reviewed-advisories.json');
if(process.argv.length>3||process.argv[2]&&!['--refresh'].includes(process.argv[2]))throw new Error('Only --refresh is supported');
if(process.argv[2]==='--refresh'){
 const feed=execFileSync('gh',['api','--paginate','--slurp','/advisories?ecosystem=npm&type=reviewed&per_page=100'],{encoding:'utf8',windowsHide:true,maxBuffer:100*1024*1024});
 JSON.parse(feed);writeFileSync(cache,feed);
}
const npmPaths=[resolve(dirname(process.execPath),'node_modules/npm'),resolve(dirname(process.execPath),'../lib/node_modules/npm')];
const npm=npmPaths.find(p=>existsSync(resolve(p,'package.json')));if(!npm)throw new Error('Pinned Node bundled npm is required for local semver matching');
const require=createRequire(resolve(npm,'package.json'));const semver=require('semver');
const lockBytes=readFileSync('pnpm-lock.yaml');
const sections=lockBytes.toString().replaceAll('\r\n','\n').split('\npackages:\n').slice(1).map(s=>s.split('\nsnapshots:\n')[0]);
if(sections.length!==2)throw new Error('Review lockfile parser for changed pnpm format');
const packages=sections.join('\n').split('\n').filter(l=>/^ {2}\S.*:$/.test(l)).map(l=>{const key=l.trim().slice(0,-1).replace(/^'|'$/g,'');const at=key.lastIndexOf('@');const name=key.slice(0,at),version=key.slice(at+1);if(!name||!semver.valid(version))throw new Error('Unparsed locked dependency');return {name,version};});
const bytes=readFileSync(cache);const advisories=JSON.parse(bytes.toString().replace(/^\uFEFF/,'')).flat();
const findings=[],unparsed=[];
for(const a of advisories){if(a.withdrawn_at)continue;for(const v of a.vulnerabilities??[]){if(v.package?.ecosystem!=='npm')continue;for(const p of packages.filter(p=>p.name===v.package.name)){
 const range=v.vulnerable_version_range?.replaceAll(',',' ');if(!semver.validRange(range)){unparsed.push({package:p,advisory:a.ghsa_id,range});continue;}
 if(semver.satisfies(p.version,range,{includePrerelease:true}))findings.push({package:p.name,version:p.version,advisory:a.ghsa_id,severity:a.severity,url:a.html_url,range,first_patched_version:v.first_patched_version,summary:a.summary});
}}}
const sha=v=>createHash('sha256').update(v).digest('hex');
const result={task_id:process.env.ORVIA_TASK_ID??'A06',checked_at:new Date().toISOString(),source:'https://api.github.com/advisories?ecosystem=npm&type=reviewed&per_page=100',feed_sha256:sha(bytes),lock_sha256:sha(lockBytes),node:process.version,npm:JSON.parse(readFileSync(resolve(npm,'package.json'))).version,downloaded_advisories:advisories.length,lock_sections:sections.length,lock_packages:packages.length,findings,unparsed,result:findings.length||unparsed.length?'FINDING':'PASS',limitations:['Reviewed npm advisory snapshot only; excludes unreviewed advisories, malware and container OS advisories. No vulnerability-free claim. Feed may change; hash identifies the exact local snapshot.']};
const path=`handoffs/codex/artifacts/${result.task_id}-dependency-advisories-${Date.now()}.json`;writeFileSync(path,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));console.log('Artifact: '+path);process.exitCode=findings.length||unparsed.length?1:0;
