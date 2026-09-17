import { spawn,execFileSync } from 'node:child_process';
import { mkdtempSync,mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { sourceState } from './source-state.ts';
import { writeEvidence } from '../packages/testing/src/evidence.ts';
const source=sourceState();
const image='orvia-local:prototype';
// Only enumerated Git candidate source enters the local build context. Ignored
// credentials, stores, tool caches and operational journals cannot be copied.
mkdirSync('.local',{recursive:true});const context=mkdtempSync(resolve('.local/runtime-build-'));
for(const file of source.files){const bytes=readFileSync(file.path);if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Source changed during context capture');const destination=resolve(context,file.path);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,bytes);}
const child=spawn('docker',['build','--file',resolve(context,'infrastructure/runtime.Dockerfile'),'--tag',image,'--label','orvia.owner=codex','--label',`orvia.source-tree=${source.sha256}`,'--label',`org.opencontainers.image.revision=${source.commit}`,context],{windowsHide:true,stdio:'inherit'});
const code=await new Promise<number>(resolve=>{child.once('error',()=>resolve(1));child.once('close',code=>resolve(code??1));});
const imageId=code===0?execFileSync('docker',['image','inspect',image,'--format','{{.Id}}'],{encoding:'utf8',windowsHide:true}).trim():null;
writeEvidence('runtime-image',{source,image,image_id:imageId,exit_code:code,result:code===0?'PASS':'FAIL',limitations:['Authorized dependency/build network only; runtime network proof is separate. Local development image, no production release signature.']});process.exitCode=code;
