// Read-only source/build correspondence. No runtime, tests or Git mutations.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync,realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
assert.equal(realpathSync(process.cwd()),root);
const [label]=process.argv.slice(2);assert.equal(process.argv.length,3);assert.match(label??'',/^[a-z0-9-]{1,40}$/);
const baseline='3caf3b7cba1703e42018e6ba43af80ab4206287e';
const build='O3vGd-z4HGBxaLp-Fdqh3';
function git(args){const r=spawnSync('git',args,{windowsHide:true,encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024});assert.ok(!r.error&&r.status===0,'Read-only Git check failed');return r.stdout;}
function sha(path){return createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex');}
assert.equal(git(['rev-parse','HEAD']).trim(),baseline);
const allowed=['backend/api/src/vendor/authority.ts','backend/api/src/vendor/dependency-errors.ts','infrastructure/loopback.mjs','tests/unit/vendor-dependency-diagnostics.test.ts','tracking/qualification-inventory.json'].sort();
const changed=git(['diff','--name-only',baseline,'--']).trim().split(/\r?\n/).filter(Boolean).sort();assert.deepEqual(changed,allowed);
assert.equal(git(['diff',baseline,'--','frontend']).trim(),'');
assert.equal(readFileSync(resolve(root,'frontend/.next/BUILD_ID'),'utf8').trim(),build);
const candidate='handoffs/codex/round8-relay-graceful-shutdown-candidate.mjs';
assert.equal(sha(candidate),sha('infrastructure/loopback.mjs'));
const oldRelay=git(['show',`${baseline}:infrastructure/loopback.mjs`]);
const newRelay=readFileSync(resolve(root,'infrastructure/loopback.mjs'),'utf8');
for(const invariant of ["[[5432,'postgres'],[8181,'opa'],[7233,'temporal']]",'upstream.setTimeout(300000,()=>upstream.destroy())','server.maxConnections=64',"server.listen(port,'0.0.0.0')",'socket.pipe(upstream).pipe(socket)'])assert.ok(oldRelay.includes(invariant)&&newRelay.includes(invariant),'Relay forwarding invariant changed');
const gamma='handoffs/codex/artifacts/R8-relay-stop-gamma-relay-stop-diagnostic.jsonl';
const events=readFileSync(resolve(root,gamma),'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
const summary=events.at(-1);assert.equal(summary.kind,'SUMMARY');assert.equal(summary.exit_code,0);assert.equal(summary.cleanup_failed,false);assert.equal(summary.results.length,4);
const expected=[['baseline','idle',20974,137],['baseline','held',21478,137],['candidate','idle',879,0],['candidate','held',4450,0]];
for(let i=0;i<4;i++){const r=summary.results[i],e=expected[i];assert.equal(r.variant,e[0]);assert.equal(r.state,e[1]);assert.equal(r.stop_elapsed_ms,e[2]);assert.equal(r.container_exit_code,e[3]);assert.equal(r.marker_forwarded,true);assert.equal(r.running,false);assert.equal(r.stop_cli_exit,0);assert.equal(r.stop_cli_signal,null);if(r.state==='held')assert.equal(r.held_socket_closed,true);}
const sourcePaths=[...allowed,candidate,'handoffs/codex/round8-relay-test-fixture.mjs','handoffs/codex/round8-relay-stop-diagnostic.mjs','handoffs/codex/round8-scoped-fixes-correspondence.mjs'];
const artifact={diagnostic_only:true,baseline,changed_paths:changed,frontend_source_unchanged:true,historical_build:build,new_build_qualification:false,candidate_equals_applied_relay:true,relay_fixed_targets_limits_forwarding_unchanged:true,source_sha256:sourcePaths.map(path=>({path,sha256:sha(path)})),gamma:{path:gamma,sha256:sha(gamma),exit_code:0,results:summary.results,cleanup_failed:false},limitations:['Source hashes were captured after gamma, not inside its execution; unchanged diagnostic inputs since gamma require the recorded one-writer custody correspondence.','Backend vendor source changed after the historical build. That build is not new source qualification.','The constant synthetic TCP marker proves controlled forwarding and shutdown, not application UNKNOWN-state recovery or production traffic qualification.']};
const output=resolve(root,`handoffs/codex/artifacts/R8-${label}-scoped-fixes-correspondence.json`);
writeFileSync(output,JSON.stringify(artifact,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({artifact:output,changed_paths:changed,diagnostic_only:true,exit_code:0})+'\n');
