import { existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProfile } from '../packages/testing/src/config.ts';
import { Id } from '../packages/contracts/src/index.ts';
import { writePrivateJson } from './local-private.ts';
const p=loadProfile();if(p.profile!=='rehearsal'||process.argv[2]!=='confirm:rehearsal')throw new Error('Named rehearsal stop confirmation required');
const journal=resolve(p.directory,'supervisor/run.json');const value=JSON.parse(readFileSync(journal,'utf8'));
if(value.installation_id!==p.installation_id||value.profile!==p.profile)throw new Error('Supervisor identity mismatch');
Id.parse(value.run_id);writePrivateJson(resolve(p.directory,'supervisor/stop.json'),{run_id:value.run_id,installation_id:p.installation_id});
for(let i=0;i<80;i++){if(!existsSync(journal)){console.log('Owned application supervisor stopped; persisted stores retained.');process.exit(0);}await new Promise(r=>setTimeout(r,500));}
throw new Error('Supervisor did not acknowledge stop; inspect local processes, no arbitrary PID termination attempted');
